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

  // Check if we can use the Brevo HTTP API (requires the master api-key starting with xkeysib-)
  const isBrevoApiKey = config.SMTP_PASS.startsWith('xkeysib-');
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

  // Determine SMTP Port - auto-switch 587 to 2525 for Brevo to bypass Render/ISP blocks
  let smtpPort = config.SMTP_PORT;
  if (config.SMTP_HOST === 'smtp-relay.brevo.com' && smtpPort === 587) {
    console.log('ℹ️ Auto-switching Brevo SMTP port from 587 to 2525 to bypass Render/ISP outbound port blocks.');
    smtpPort = 2525;
  }

  // Create SMTP transporter fallback
  console.log(`🔌 Attempting to send email via Brevo SMTP (Port: ${smtpPort}) to: ${options.email}`);
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
    connectionTimeout: 8000, // 8 seconds timeout
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
  } catch (error: any) {
    console.error('❌ Failed to send email via Brevo SMTP:', error.message || error);
    
    // If we tried port 587 (or another port) and it failed, and we haven't tried 2525 yet, try 2525 as a secondary fallback
    if (config.SMTP_HOST === 'smtp-relay.brevo.com' && smtpPort !== 2525) {
      try {
        console.log(`🔄 Retrying email delivery via Brevo SMTP on fallback Port: 2525...`);
        const fallbackTransporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: 2525,
          secure: false,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
          },
          connectionTimeout: 8000,
        });
        await fallbackTransporter.sendMail({
          from: config.EMAIL_FROM,
          to: options.email,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log(`📧 Email sent successfully via fallback Brevo SMTP (Port: 2525) to: ${options.email}`);
        return;
      } catch (fallbackError: any) {
        console.error('❌ Failed to send email via fallback Brevo SMTP (Port: 2525):', fallbackError.message || fallbackError);
      }
    }

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
