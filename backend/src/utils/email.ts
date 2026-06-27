import nodemailer from 'nodemailer';
import { config } from '../config/env';

interface SendEmailOptions {
  email: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const isPlaceholder = 
    !config.SMTP_HOST || 
    !config.SMTP_USER || 
    !config.SMTP_PASS || 
    config.SMTP_USER === 'your-email@gmail.com' || 
    config.SMTP_PASS === 'your-app-password';

  // If SMTP configurations are not set or are placeholders, fall back to console logging
  if (isPlaceholder) {
    console.warn('⚠️ SMTP settings are incomplete or using placeholders. Printing email to console:');
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
    secure: config.SMTP_PORT === 465, // true for 465, false for 587 or other ports
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: config.SMTP_FROM,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully via SMTP: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Failed to send email via SMTP:', error);
    throw new Error('Email delivery failed. Please try again later.');
  }
};
