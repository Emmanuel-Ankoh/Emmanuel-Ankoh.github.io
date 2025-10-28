const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Boolean(process.env.SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465),
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn('SMTP not configured; skipping email send.');
    return { skipped: true };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return t.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
