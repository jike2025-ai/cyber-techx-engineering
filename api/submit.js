// Vercel serverless function: receives enquiry/consultation/contact/assistant submissions and emails them to the business.
// Secrets come from environment variables only. See .env.example and README.md.
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));

const TO = process.env.FORM_TO_EMAIL || site.contact.email;
const FROM = process.env.FORM_FROM_EMAIL || 'Cyber_Techx Website <onboarding@resend.dev>';
const MAX = { fullName: 120, phone: 40, email: 160, service: 80, contactMethod: 40, description: 3000, message: 3000, subject: 160, propertyType: 80, location: 200, landmark: 200, timeline: 80, budget: 80, method: 40, date: 20, time: 10, product: 160, intent: 20 };
const FIELDS = Object.keys(MAX);
const hits = new Map(); // best-effort in-memory rate limit (per warm instance). Use a shared store (e.g. Upstash/Vercel KV) for strict limits.
const LIMIT = 5, WINDOW = 10 * 60 * 1000;
const SENSITIVE = /(\b(?:\d[ -]?){13,19}\b)|\b(password|passcode|otp|cvv|bvn|card\s*number|pin\s*(?:is|:))\b/i;

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };

function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true; // non-browser or same-origin form post without Origin
  try { const h = new URL(o).host; return h === req.headers.host || (process.env.SITE_URL && h === new URL(process.env.SITE_URL).host); } catch { return false; }
}

function validate(b) {
  const e = {};
  const type = clean(b.formType, 20);
  if (!['consultation', 'contact', 'assistant'].includes(type)) e.formType = 'bad';
  if (clean(b.fullName, 120).length < 2) e.fullName = 'required';
  const digits = clean(b.phone, 40).replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) e.phone = 'invalid';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(b.email, 160))) e.email = 'invalid';
  if (type === 'contact') {
    if (clean(b.subject, 160).length < 3) e.subject = 'required';
    if (clean(b.message, 3000).length < 10) e.message = 'required';
  } else {
    if (clean(b.description, 3000).length < 5) e.description = 'required';
    if (!clean(b.service, 80)) e.service = 'required';
  }
  if (b.consent !== 'yes' && b.consent !== true && b.consent !== 'on') e.consent = 'required';
  return { e, type };
}

async function send({ subject, text, html, replyTo }) {
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: replyTo, subject, text, html }) });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    return;
  }
  if (process.env.FORM_PROVIDER === 'formsubmit' || !process.env.FORM_PROVIDER) {
    // Zero-config fallback: FormSubmit (needs a one-time email activation click the first time). Replace with Resend for production.
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(TO)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: process.env.SITE_URL || 'https://cyber-techx.vercel.app', Referer: (process.env.SITE_URL || 'https://cyber-techx.vercel.app') + '/' },
      body: JSON.stringify({ _subject: subject, _replyto: replyTo, _captcha: 'false', _template: 'box', message: text }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) === 'false') throw new Error(`formsubmit ${r.status}`);
    return;
  }
  throw new Error('no provider');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false, error: 'method' }); }
  if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'origin' });
  const ct = String(req.headers['content-type'] || '');
  const isJson = ct.includes('application/json');
  const isForm = ct.includes('application/x-www-form-urlencoded');
  if (!isJson && !isForm) return json(res, 415, { ok: false, error: 'type' });
  if (isJson && req.headers['x-requested-with'] !== 'cyber-techx-web') return json(res, 403, { ok: false, error: 'csrf' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const done = (code, o) => isForm ? (res.statusCode = code === 200 ? 303 : code, code === 200 ? (res.setHeader('Location', '/thanks/'), res.end()) : json(res, code, o)) : json(res, code, o);

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return json(res, 429, { ok: false, error: 'rate' });
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  // spam traps: honeypot filled, or submitted impossibly fast. Pretend success so bots learn nothing.
  if (clean(body.website, 200)) return done(200, { ok: true });
  const started = Number(body.startedAt);
  if (Number.isFinite(started) && started > 0 && now - started < 2500) return done(200, { ok: true });

  const { e, type } = validate(body);
  if (Object.keys(e).length) return done(400, { ok: false, error: 'validation', fields: e });
  const v = {}; for (const k of FIELDS) v[k] = clean(body[k], MAX[k]);
  if (SENSITIVE.test(Object.values(v).join(' '))) return done(400, { ok: false, error: 'sensitive' });

  const label = type === 'contact' ? 'Contact message' : v.intent === 'quote' ? 'Quote request' : 'Consultation request';
  const rows = [['Type', `${label} (${type})`], ['Name', v.fullName], ['Phone / WhatsApp', v.phone], ['Email', v.email], ['Preferred contact method', v.contactMethod], ['Service', v.service], ['Product', v.product], ['Subject', v.subject], ['Message', v.message], ['Project description', v.description], ['Property / site type', v.propertyType], ['Location', v.location], ['Landmark', v.landmark], ['Timeline', v.timeline], ['Budget', v.budget], ['Consultation method', v.method], ['Preferred date', v.date], ['Preferred time', v.time], ['Consent given', 'Yes']].filter(([, x]) => x);
  const text = rows.map(([k, x]) => `${k}: ${x}`).join('\n') + `\n\nSent from the ${site.name} website. Preferred date/time is a request only and not a confirmed appointment.`;
  const html = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows.map(([k, x]) => `<tr><td><b>${escHtml(k)}</b></td><td>${escHtml(x).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
  try {
    await send({ subject: `[Website] ${label}: ${v.service || v.subject} - ${v.fullName}`, text, html, replyTo: v.email });
    return done(200, { ok: true });
  } catch (err) {
    console.error('submit failed:', err.message); // never echo internals to the client
    return json(res, 502, { ok: false, error: 'delivery' });
  }
}
