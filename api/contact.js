// Vercel serverless function: POST /api/contact
// Validates an enquiry and emails it to the business via Resend (https://resend.com).
// Env vars: RESEND_API_KEY (required), MAIL_FROM, MAIL_TO (optional, defaults to content/site.json email).
import { readFileSync } from 'node:fs';

let SITE = {};
try { SITE = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8')); } catch { /* optional */ }

const FORM_TYPES = new Set(['consultation', 'contact', 'assistant']);
const LIMITS = { default: 200, description: 2000, message: 2000 };
const REQUIRED = { consultation: ['fullName', 'phone', 'service', 'description'], contact: ['fullName', 'phone', 'subject', 'message'], assistant: ['fullName', 'phone', 'description'] };
const ALLOWED = ['fullName', 'phone', 'email', 'service', 'product', 'description', 'propertyType', 'location', 'landmark', 'method', 'preferredDate', 'preferredTime', 'timeline', 'budget', 'contactMethod', 'subject', 'message', 'requestType', 'source'];
const LABELS = { fullName: 'Name', phone: 'Phone / WhatsApp', email: 'Email', service: 'Service', product: 'Product', description: 'Description', propertyType: 'Property type', location: 'Location', landmark: 'Landmark', method: 'Consultation method', preferredDate: 'Preferred date', preferredTime: 'Preferred time', timeline: 'Timeline', budget: 'Budget', contactMethod: 'Preferred contact', subject: 'Subject', message: 'Message', requestType: 'Request type', source: 'Source' };

// Best-effort in-memory rate limit (per warm instance). For stricter limits add Vercel Firewall / Upstash.
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now(), win = 10 * 60 * 1000, max = 5;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((t) => now - t < win)) hits.delete(k);
  return arr.length > max;
};

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const luhn = (d) => { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; };
const sensitive = (t) => /\b(password|passcode|otp|cvv|pin)\b\s*(is|:|=)/i.test(t) || [...t.matchAll(/(?:\d[ -]?){13,19}/g)].some((m) => { const d = m[0].replace(/\D/g, ''); return d.length >= 13 && d.length <= 19 && luhn(d); });

const fail = (res, status, code, message) => res.status(status).json({ ok: false, code, message });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(res, 405, 'method', 'Method not allowed.'); }

  // Same-origin check (CSRF defence for a JSON endpoint)
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return fail(res, 403, 'origin', 'Request not allowed.'); } catch { return fail(res, 403, 'origin', 'Request not allowed.'); } }
  if (!String(req.headers['content-type'] || '').includes('application/json')) return fail(res, 415, 'type', 'Unsupported request.');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return fail(res, 400, 'invalid', 'Invalid request.');

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return fail(res, 429, 'rate', 'Too many requests. Please wait a few minutes.');

  // Spam traps: honeypot + minimum fill time
  if (body.website) return res.status(200).json({ ok: true }); // pretend success to bots
  const minMs = (SITE.forms?.minFillSeconds ?? 3) * 1000;
  if (!Number.isFinite(body.loadedAt) || Date.now() - body.loadedAt < minMs) return fail(res, 400, 'too_fast', 'Please take a moment to review the form and try again.');

  const type = body.formType;
  if (!FORM_TYPES.has(type) || body.consent !== true) return fail(res, 400, 'invalid', 'Please complete the form and agree to the consent box.');

  const f = {};
  for (const k of ALLOWED) { const v = clean(body.fields?.[k], LIMITS[k] ?? LIMITS.default); if (v) f[k] = v; }
  for (const k of REQUIRED[type]) if (!f[k]) return fail(res, 400, 'missing', 'Please fill in all required fields.');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return fail(res, 400, 'email', 'Please enter a valid email address.');
  if (!/^[+0-9][0-9 ()+\-]{6,19}$/.test(f.phone)) return fail(res, 400, 'phone', 'Please enter a valid phone number.');
  if (Object.entries(f).some(([k, v]) => k !== 'phone' && sensitive(v))) return fail(res, 400, 'sensitive', 'Please remove passwords, PINs, codes or card numbers. We never need them.');

  const key = process.env.RESEND_API_KEY;
  const to = (process.env.MAIL_TO || SITE.contact?.email || '').split(',').map((s) => s.trim()).filter(Boolean);
  const subjectLine = type === 'contact' ? `Website message: ${f.subject}` : `${f.requestType === 'quote' ? 'Quote request' : 'Consultation request'}: ${f.service || 'Enquiry'} (${f.fullName})`;
  const rows = Object.entries(f).map(([k, v]) => [LABELS[k] || k, v]);

  if (!key) {
    if (process.env.MOCK_EMAIL === '1') { console.log('[MOCK EMAIL]', subjectLine, JSON.stringify(f)); return res.status(200).json({ ok: true, mock: true }); }
    console.error('RESEND_API_KEY is not set; enquiry not delivered.');
    return fail(res, 503, 'not_configured', 'Our online form is not switched on yet. Please message us on WhatsApp or by email instead.');
  }
  if (!to.length) return fail(res, 503, 'not_configured', 'Our online form is not switched on yet. Please message us on WhatsApp or by email instead.');

  const html = `<h2>${esc(subjectLine)}</h2><table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">${rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd"><b>${esc(k)}</b></td><td style="border:1px solid #ddd">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table><p style="color:#666;font-family:Arial">Sent from ${esc(String(body.page || '').slice(0, 100))} via cyber-techx website (${esc(type)}). Consent given by the sender.</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'Cyber_Techx Website <onboarding@resend.dev>', to, subject: subjectLine.slice(0, 200), html, text, ...(f.email ? { reply_to: f.email } : {}) }),
    });
    if (!r.ok) { console.error('Resend error', r.status, (await r.text()).slice(0, 300)); return fail(res, 502, 'send_failed', 'We could not send your request right now.'); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Send exception', e?.message);
    return fail(res, 502, 'send_failed', 'We could not send your request right now.');
  }
}
