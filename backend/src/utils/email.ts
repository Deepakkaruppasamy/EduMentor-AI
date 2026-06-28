import nodemailer from 'nodemailer';
import axios from 'axios';
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

  // Parse EMAIL_FROM (e.g. "EduMentorAI <deepakkaruppasamy45@gmail.com>")
  let senderName = 'EduMentorAI';
  let senderEmail = 'deepakkaruppasamy45@gmail.com';
  if (config.EMAIL_FROM) {
    const match = config.EMAIL_FROM.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
      senderName = match[1].trim();
      senderEmail = match[2].trim();
    } else {
      senderEmail = config.EMAIL_FROM;
    }
  }

  // Check if we can use the Brevo HTTP API (which bypasses blocked SMTP ports on Render/hosting providers)
  const isBrevoApiKey = config.SMTP_PASS.startsWith('xsmtpsib-');
  if (isBrevoApiKey) {
    try {
      console.log(`📡 Attempting to send email via Brevo Web API to: ${options.email}`);
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: options.email }],
          subject: options.subject,
          textContent: options.text,
          htmlContent: options.html,
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': config.SMTP_PASS,
            'content-type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.status === 201 || response.status === 200) {
        console.log(`📧 Email sent successfully via Brevo Web API to: ${options.email}`);
        return;
      }
    } catch (apiError: any) {
      console.error(
        '❌ Failed to send email via Brevo Web API:',
        apiError.response?.data || apiError.message
      );
      console.log('🔄 Falling back to standard SMTP Nodemailer transporter...');
    }
  }

  // Create SMTP transporter fallback
  console.log(`🔌 Attempting to send email via Brevo SMTP to: ${options.email}`);
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
