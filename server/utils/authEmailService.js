const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
};

const getFromAddress = () =>
  process.env.EMAIL_FROM
    ? `"RIPOMA GLOBAL" <${process.env.EMAIL_FROM}>`
    : '"RIPOMA GLOBAL" <noreply@ripomaglobal.com>';

/**
 * Sends auth-related email (verification, password reset).
 * Uses SMTP when SMTP_HOST is set; otherwise logs to console (development).
 */
const sendAuthEmail = async ({ to, subject, text, html }) => {
  const usingSmtp = Boolean(process.env.SMTP_HOST);

  if (!usingSmtp) {
    console.log('\n========================================================');
    console.log(`[EMAIL TO: ${to}] Subject: ${subject}`);
    console.log(text);
    console.log('========================================================\n');
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html
    });
  } catch (err) {
    console.error('[AUTH EMAIL] Failed to send:', err.message);
    if (usingSmtp) {
      throw err;
    }
  }
};

module.exports = { sendAuthEmail };
