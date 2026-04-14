'use strict';

const { Resend } = require('resend');

// ── Rate limiting (in-memory, best-effort per warm serverless instance) ────────
// Limits each IP to RATE_LIMIT_MAX submissions per RATE_LIMIT_WINDOW ms.
// Note: Vercel may run multiple instances; this prevents rapid bursts within
// a single instance. For persistent cross-instance limiting add Vercel KV.
const RATE_LIMIT_MAX    = 3;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const ipStore = new Map();

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// Prevent unbounded memory growth in long-lived instances
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipStore) {
    if (now > val.resetAt) ipStore.delete(key);
  }
}, 60 * 60 * 1000);

// ── HTML escaping — prevents XSS if user input reaches email HTML body ────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Allowed treatment values (whitelist — rejects unexpected values) ──────────
const ALLOWED_TREATMENTS = new Set([
  '',
  'HIFU - Skin Tightening',
  'EMS Body Sculpting',
  'Fat Cavitation',
  'Ladies Massage',
  'Free Consultation (not sure yet)',
]);

// ── Strict server-side input validation ──────────────────────────────────────
function validate({ name, email, phone, treatment, message }) {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)
    errors.push('name: required, 1–100 characters');

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || typeof email !== 'string' || email.length > 254 || !emailRe.test(email.trim()))
    errors.push('email: invalid format');

  if (phone) {
    const digits = phone.replace(/[\s\-()+]/g, '');
    if (!/^\d{8,15}$/.test(digits))
      errors.push('phone: must be 8–15 digits');
  }

  if (treatment !== undefined && !ALLOWED_TREATMENTS.has(treatment))
    errors.push('treatment: unrecognised value');

  if (!message || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 2000)
    errors.push('message: required, 1–2000 characters');

  return errors;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Short request ID for log correlation
  const reqId    = Math.random().toString(36).slice(2, 9);
  const clientIp = ((req.headers['x-forwarded-for'] || '') + ',' + (req.socket?.remoteAddress || 'unknown'))
                     .split(',')[0].trim();
  const origin   = req.headers['origin'] || '';

  const log = (level, event, extra = {}) =>
    console[level](JSON.stringify({ reqId, event, ip: clientIp, ts: new Date().toISOString(), ...extra }));

  // ── Method guard ─────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    log('warn', 'method_not_allowed', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Origin check — block cross-origin requests not from the site ──────────
  // Allows: production domain, Vercel preview URLs, and empty origin (server-side tools)
  const allowedOrigins = [
    'https://www.numeeclinic.com.au',
    'https://numeeclinic.com.au',
  ];
  if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);

  if (origin && !allowedOrigins.includes(origin) && !origin.endsWith('.vercel.app')) {
    log('warn', 'origin_rejected', { origin });
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (isRateLimited(clientIp)) {
    log('warn', 'rate_limited');
    return res.status(429).json({ error: 'Too many requests — please try again later.' });
  }

  const { name, email, phone, treatment, message, website } = req.body || {};

  // ── Honeypot — bots fill hidden fields; real users never see it ───────────
  if (website) {
    log('warn', 'honeypot_triggered');
    return res.status(200).json({ success: true }); // silent success — don't reveal trap
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const errors = validate({ name, email, phone, treatment, message });
  if (errors.length > 0) {
    log('warn', 'validation_failed', { errors });
    return res.status(400).json({ error: 'Invalid input' });
  }

  // ── Environment variable guards ───────────────────────────────────────────
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_TO_EMAIL) {
    log('error', 'missing_env_vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── Escape all user content before embedding in HTML ─────────────────────
  const safeName      = esc(name.trim());
  const safeEmail     = esc(email.trim());
  const safePhone     = phone ? esc(phone.trim()) : 'Not provided';
  const safeTreatment = treatment ? esc(treatment) : 'Not specified';
  const safeMessage   = esc(message.trim()).replace(/\n/g, '<br>');

  log('info', 'submission_received', { treatment: safeTreatment });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Nu-Mee Clinic <noreply@numeeclinic.com.au>',
      to: process.env.RESEND_TO_EMAIL,
      reply_to: email.trim(),
      subject: `New Enquiry - Nu-Mee Clinic${treatment ? ` (${treatment})` : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#E8196A;">New Enquiry — Nu-Mee Clinic</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;width:160px;">Name</td>     <td style="padding:10px;border-bottom:1px solid #eee;">${safeName}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Email</td>    <td style="padding:10px;border-bottom:1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Phone</td>    <td style="padding:10px;border-bottom:1px solid #eee;">${safePhone}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Treatment</td><td style="padding:10px;border-bottom:1px solid #eee;">${safeTreatment}</td></tr>
            <tr><td style="padding:10px;color:#888;vertical-align:top;">Message</td>  <td style="padding:10px;">${safeMessage}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#bbb;">Ref: ${reqId} &middot; numeeclinic.com.au</p>
        </div>
      `,
    });

    log('info', 'email_sent');
    return res.status(200).json({ success: true });
  } catch (error) {
    log('error', 'resend_error', { message: error.message });
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
