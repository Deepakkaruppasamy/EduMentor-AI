import { Request, Response, NextFunction } from 'express';
import dns from 'dns';
import User from '../models/User';

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Auth & Live Email Validation Middleware
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Known disposable email provider domain list
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'tempmail.net', 'tempmailo.com', '10minutemail.com',
  'throwawaymail.com', 'trashmail.com', 'trashmail.net', 'yopmail.com', 'yopmail.net',
  'sharklasers.com', 'getairmail.com', 'dispostable.com', 'fakeinbox.com', 'maildrop.cc',
  'crazymailing.com', 'nada.ltd', 'getnada.com', 'mohmal.com', 'mytemp.email',
  'inboxkitten.com', 'burnermail.io', 'dropmail.me', 'pokemail.net', 'spamgourmet.com',
  'byom.de', 'disposablemail.com', 'disposable.com', 'tempr.email', 'dispostable.com',
  'mailnesia.com', 'mailcatch.com', 'anonbox.net', 'spambox.us', 'binkmail.com',
  'safetymail.info', 'zippymail.info', 'trashymail.com', 'klzlk.com'
]);

// Known fake/test placeholder domains
const FAKE_TEST_DOMAINS = new Set([
  'test.com', 'test.org', 'test.net', 'example.com', 'example.org', 'example.net',
  'testing.com', 'invalid.com', 'localhost.com', 'sample.com', 'foo.bar', 'domain.com',
  'fake.com', 'dummy.com', 'mysite.com', 'nospam.com', 'noemail.com'
]);

/**
 * Perform DNS MX record lookup to check if a domain has active mail servers.
 */
export const checkDomainMx = (domain: string, timeoutMs: number = 3500): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(true); // Fallback to true on timeout so network slowness doesn't block valid users
      }
    }, timeoutMs);

    dns.resolveMx(domain, (err, addresses) => {
      if (settled) return;
      if (!err && Array.isArray(addresses) && addresses.length > 0) {
        settled = true;
        clearTimeout(timer);
        return resolve(true);
      }
      // Fallback: check A record if MX record is omitted
      dns.resolve4(domain, (err4, addrs4) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!err4 && Array.isArray(addrs4) && addrs4.length > 0) {
          return resolve(true);
        }
        return resolve(false);
      });
    });
  });
};

/**
 * 3-Layer Live Email Verification:
 * 1. Syntax / Format Regex
 * 2. Disposable & Fake Test Domain Blocklist
 * 3. DNS MX Record Lookup (checks if recipient domain has live mail servers)
 * 4. Optional Database existence/uniqueness check
 */
export async function validateLiveEmail(
  email: string,
  options: { checkAlreadyExists?: boolean; mustExistInDb?: boolean } = {}
): Promise<string | null> {
  if (!email || !email.trim()) return 'Email is required.';

  const trimmed = email.trim().toLowerCase();

  // Layer 1: Syntax / Format
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g. user@domain.com).';
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Please enter a valid email address.';

  const [localPart, domain] = parts;

  // Layer 2: Test / Fake local part patterns
  if (['test', 'abc', 'asdf', 'qwerty', '1234', 'admin', 'user', 'fake'].includes(localPart)) {
    return 'Generic or test email addresses are not permitted. Please use your real email address.';
  }

  // Layer 2: Disposable domain check
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Temporary/disposable email addresses are not allowed. Please use a live email address.';
  }

  // Layer 2: Fake test domain check
  if (FAKE_TEST_DOMAINS.has(domain)) {
    return 'Test or example email domains are not allowed. Please enter your actual live email.';
  }

  // Layer 3: DNS MX resolution (verify domain mail servers)
  const isLive = await checkDomainMx(domain);
  if (!isLive) {
    return `The email domain (@${domain}) does not have an active mail server. Please check for typos or enter a live email.`;
  }

  // Layer 4: Database Uniqueness check (for Registration)
  if (options.checkAlreadyExists) {
    try {
      const existing = await User.findOne({ email: trimmed });
      if (existing) {
        return 'This email address is already registered. Please sign in or use another email.';
      }
    } catch (err) {
      // DB error shouldn't crash validation, will be caught by controller
    }
  }

  // Layer 4: Database Existence check (for Password Reset)
  if (options.mustExistInDb) {
    try {
      const existing = await User.findOne({ email: trimmed });
      if (!existing) {
        return 'No account was found with this email address.';
      }
    } catch (err) {
      // DB error fallback
    }
  }

  return null;
}

/**
 * Sync email format validator for basic inline checks.
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

/**
 * Password strength validator.
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*()_+~`|}{[\]:;?><,./-]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
}

/**
 * Name validator — only letters, spaces, hyphens, apostrophes.
 */
export function validateName(name: string): string | null {
  if (!name || !name.trim()) return 'Full name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (name.trim().length > 80) return 'Name must be 80 characters or fewer.';
  if (!/^[a-zA-Z\s'\-]+$/.test(name.trim())) return 'Name may only contain letters, spaces, hyphens, and apostrophes.';
  return null;
}

/**
 * Phone validator — E.164 format or common patterns.
 */
export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) return null; // Optional field
  const cleaned = phone.replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(cleaned)) return 'Please enter a valid phone number (7–15 digits).';
  return null;
}

/**
 * Semester validator — integer 1-8.
 */
export function validateSemester(semester: string | number): string | null {
  if (!semester && semester !== 0) return null; // Optional field
  const n = Number(semester);
  if (!Number.isInteger(n) || n < 1 || n > 8) return 'Semester must be a whole number between 1 and 8.';
  return null;
}

/**
 * Department validator.
 */
export function validateDepartment(department: string): string | null {
  if (!department || !department.trim()) return 'Department is required.';
  if (department.trim().length < 2) return 'Department must be at least 2 characters.';
  if (department.trim().length > 100) return 'Department must be 100 characters or fewer.';
  return null;
}

// ── Express Middleware Functions ─────────────────────────────────────────────

/**
 * Validates login request body with live email check.
 */
export const validateLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;
  const errors: FieldError[] = [];

  const emailErr = await validateLiveEmail(email);
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (!password) errors.push({ field: 'password', message: 'Password is required.' });
  else if (password.length < 6) errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};

/**
 * Validates registration request body with 3-layer live email & duplicate email checks.
 */
export const validateRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, email, role, department, phone, semester } = req.body;
  const errors: FieldError[] = [];

  const nameErr = validateName(name);
  if (nameErr) errors.push({ field: 'name', message: nameErr });

  // Live email validation + check if already registered in DB
  const emailErr = await validateLiveEmail(email, { checkAlreadyExists: true });
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (!role || !['student', 'faculty', 'admin'].includes(role)) {
    errors.push({ field: 'role', message: 'Role must be one of: student, faculty, or admin.' });
  }

  const deptErr = validateDepartment(department);
  if (deptErr) errors.push({ field: 'department', message: deptErr });

  if (phone) {
    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.push({ field: 'phone', message: phoneErr });
  }

  if (semester !== undefined && semester !== '') {
    const semErr = validateSemester(semester);
    if (semErr) errors.push({ field: 'semester', message: semErr });
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};

/**
 * Validates change-password request body.
 */
export const validateChangePassword = (req: Request, res: Response, next: NextFunction): void => {
  const { currentPassword, newPassword } = req.body;
  const errors: FieldError[] = [];

  if (!currentPassword) errors.push({ field: 'currentPassword', message: 'Current password is required.' });

  const newPwErr = validatePassword(newPassword);
  if (newPwErr) errors.push({ field: 'newPassword', message: newPwErr });

  if (newPassword && currentPassword && newPassword === currentPassword) {
    errors.push({ field: 'newPassword', message: 'New password must be different from your current password.' });
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};

/**
 * Validates first-login change-password request body.
 */
export const validateFirstLoginChangePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, currentPassword, newPassword } = req.body;
  const errors: FieldError[] = [];

  const emailErr = await validateLiveEmail(email);
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (!currentPassword) errors.push({ field: 'currentPassword', message: 'Temporary password is required.' });

  const newPwErr = validatePassword(newPassword);
  if (newPwErr) errors.push({ field: 'newPassword', message: newPwErr });

  if (newPassword && currentPassword && newPassword === currentPassword) {
    errors.push({ field: 'newPassword', message: 'New password must be different from your temporary password.' });
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};

/**
 * Validates reset-password request body.
 */
export const validateResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, otpCode, newPassword, confirmPassword } = req.body;
  const errors: FieldError[] = [];

  const emailErr = await validateLiveEmail(email);
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (!otpCode || String(otpCode).trim().length !== 6 || !/^\d{6}$/.test(String(otpCode).trim())) {
    errors.push({ field: 'otpCode', message: 'OTP must be a 6-digit number.' });
  }

  const newPwErr = validatePassword(newPassword);
  if (newPwErr) errors.push({ field: 'newPassword', message: newPwErr });

  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};

/**
 * Validates forgot-password request body.
 */
export const validateForgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.body;
  const errors: FieldError[] = [];

  const emailErr = await validateLiveEmail(email, { mustExistInDb: true });
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};
