import { Resend } from 'resend';
import { config } from '../config/env';

interface SendEmailOptions {
  email: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // If Resend API key is not set, fall back to console logging
  if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_your_resend_api_key') {
    console.warn('⚠️ RESEND_API_KEY is not configured. Printing email to console:');
    console.log(`
======================================================
📧 [SIMULATED EMAIL - RESEND NOT CONFIGURED]
To: ${options.email}
Subject: ${options.subject}
------------------------------------------------------
${options.text}
======================================================
`);
    return;
  }

  const resend = new Resend(config.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: config.EMAIL_FROM,
      to: [options.email],
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      console.error('❌ Resend API returned an error:', error);
      console.warn('⚠️ Falling back to console simulation:');
      console.log(`
======================================================
📧 [SIMULATED EMAIL - RESEND API ERROR]
To: ${options.email}
Subject: ${options.subject}
------------------------------------------------------
${options.text}
======================================================
`);
      return;
    }

    console.log(`📧 Email sent successfully via Resend: ${data?.id}`);
  } catch (error) {
    console.error('❌ Failed to send email via Resend:', error);
    console.warn('⚠️ Falling back to console simulation:');
    console.log(`
======================================================
📧 [SIMULATED EMAIL - RESEND FAILED]
To: ${options.email}
Subject: ${options.subject}
------------------------------------------------------
${options.text}
======================================================
`);
  }
};
