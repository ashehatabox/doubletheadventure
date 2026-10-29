// Emails a copy of each enquiry to STORE_EMAIL, through Resend or SMTP.
// With neither set, the message is only written to the app log (the enquiry is still saved in Supabase).
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, '') },
    connectionTimeout: 10000,
    socketTimeout: 15000
  });
}

async function notify({ subject, text, replyTo }) {
  const to = process.env.STORE_EMAIL;
  const from = process.env.MAIL_FROM || 'A² Publishing <hello@doubleadventure.ca>';
  if (!to) return console.log('[mail not set up]', subject, '\n' + text);
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, reply_to: replyTo })
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  if (transporter) return transporter.sendMail({ from, to, replyTo, subject, text });
  console.log('[mail not set up]', subject, '\n' + text);
}

module.exports = { notify };
