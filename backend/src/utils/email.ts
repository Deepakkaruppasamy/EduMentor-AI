import nodemailer from 'nodemailer';
import { config } from '../config/env';

interface SendEmailOptions {
  email: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const isDummyPass = !config.SMTP_PASS || config.SMTP_PASS.includes('xxxx') || config.SMTP_PASS === 'your_brevo_smtp_password';
  const isDummyUser = !config.SMTP_USER || config.SMTP_USER.includes('your_brevo') || config.SMTP_USER === 'deepak.brevo@domain.com';

  // If SMTP config is missing or placeholder, fall back to console logging
  if (isDummyPass || isDummyUser) {
    console.warn('⚠️ Brevo SMTP credentials are not configured. Printing email to console:');
    console.log(`
======================================================
📧 [SIMULATED EMAIL - SMTP NOT CONFIGURED]
To: ${options.email}
Subject: ${options.subject}
------------------------------------------------------
${options.text}
======================================================
`);
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`📧 Email sent successfully via Brevo SMTP to: ${options.email}`);
  } catch (error) {
    console.error('❌ Failed to send email via Brevo SMTP:', error);
    console.warn('⚠️ Falling back to console simulation:');
    console.log(`
======================================================
📧 [SIMULATED EMAIL - SMTP SEND FAILURE]
To: ${options.email}
Subject: ${options.subject}
------------------------------------------------------
${options.text}
======================================================
`);
  }
};
