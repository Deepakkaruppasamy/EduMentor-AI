import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Middleware
//
// Provides field-level validation for all auth endpoints.
// Returns a structured array of field errors so the frontend can
// highlight specific inputs rather than showing a generic message.
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

// ── Reusable Validators ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Returns an error message if the email is invalid, otherwise null.
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

/**
 * Password strength validator.
 * Rules:
 *   - At least 8 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 digit
 *   - At least 1 special character
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

// ── Middleware Functions ─────────────────────────────────────────────────────

/**
 * Validates the login request body.
 * Checks: email format, password presence.
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;
  const errors: FieldError[] = [];

  const emailErr = validateEmail(email);
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
 * Validates the registration request body.
 * Checks: name, email format, role, department, phone (if provided), semester (if provided).
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { name, email, role, department, phone, semester } = req.body;
  const errors: FieldError[] = [];

  const nameErr = validateName(name);
  if (nameErr) errors.push({ field: 'name', message: nameErr });

  const emailErr = validateEmail(email);
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
 * Validates the change-password request body.
 * Checks: currentPassword presence, newPassword strength.
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
 * Validates the first-login change-password request body.
 */
export const validateFirstLoginChangePassword = (req: Request, res: Response, next: NextFunction): void => {
  const { email, currentPassword, newPassword } = req.body;
  const errors: FieldError[] = [];

  const emailErr = validateEmail(email);
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
 * Validates the reset-password request body.
 * Checks: email format, OTP presence, newPassword strength, confirmPassword match.
 */
export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
  const { email, otpCode, newPassword, confirmPassword } = req.body;
  const errors: FieldError[] = [];

  const emailErr = validateEmail(email);
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
 * Validates the forgot-password request body.
 * Checks: email format.
 */
export const validateForgotPassword = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.body;
  const errors: FieldError[] = [];

  const emailErr = validateEmail(email);
  if (emailErr) errors.push({ field: 'email', message: emailErr });

  if (errors.length > 0) {
    res.status(422).json({ success: false, message: 'Validation failed.', errors });
    return;
  }
  next();
};
