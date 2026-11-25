/* Cyber_Techx Engineering — site behaviour. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  let cfg = {};
  try { cfg = JSON.parse($('#site-config').textContent); } catch { /* config missing */ }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- shared API for assistant ---------- */
  const luhn = (digits) => { let s = 0, alt = false; for (let i = digits.length - 1; i >= 0; i--) { let n = +digits[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; };
  const looksSensitive = (text) => {
    const t = String(text || '');
    if (/\b(password|passcode|otp|cvv|pin)\b\s*(is|:|=)/i.test(t)) return 'a password, PIN or code';
    for (const m of t.matchAll(/(?:\d[ -]?){13,19}/g)) { const d = m[0].replace(/\D/g, ''); if (d.length >= 13 && d.length <= 19 && luhn(d)) return 'a card number'; }
    return '';
  };
  async function send(payload) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(cfg.forms.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
      let data = {}; try { data = await res.json(); } catch { /* non-JSON error */ }
      return { ok: res.ok && data.ok !== false, status: res.status, data };
    } catch (e) { return { ok: false, status: 0, data: { code: e.name === 'AbortError' ? 'timeout' : 'network' } }; }
    finally { clearTimeout(timer); }
  }
  const waUrl = (text) => `https://wa.me/${cfg.contact.whatsapp}?text=${encodeURIComponent(text)}`;
  window.CyberTechx = { cfg, send, looksSensitive, waUrl };

  /* ---------- year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- navigation ---------- */
  const header = $('.site-header');
  const nav = $('#primary-nav');
  const toggle = $('.nav-toggle');
  const menus = $$('.menu-toggle');
  const closeMenus = (except) => menus.forEach((b) => { if (b !== except) { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).classList.remove('is-open'); } });
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a') && toggle.getAttribute('aria-expanded') === 'true') { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } });
  }
  menus.forEach((b) => {
    const panel = $('#' + b.getAttribute('aria-controls'));
    b.addEventListener('click', () => { const open = b.getAttribute('aria-expanded') !== 'true'; closeMenus(b); b.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.has-menu')) closeMenus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBtn = menus.find((b) => b.getAttribute('aria-expanded') === 'true');
    if (openBtn) { closeMenus(); openBtn.focus(); return; }
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.focus(); }
  });
  window.matchMedia('(min-width: 980px)').addEventListener('change', () => { closeMenus(); if (toggle) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } });

  /* ---------- reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- filters (projects, blog) ---------- */
  $$('[data-filter-grid]').forEach((grid) => {
    const bar = grid.parentElement.querySelector('.filter-bar'); const empty = grid.parentElement.querySelector('[data-empty]');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      $$('[data-filter]', bar).forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      const f = b.dataset.filter; let n = 0;
      $$('[data-category]', grid).forEach((c) => { const show = f === 'all' || c.dataset.category === f; c.hidden = !show; if (show) { n++; c.classList.add('in'); } });
      if (empty) empty.hidden = n > 0;
    });
  });

  /* ---------- product search ---------- */
  const search = $('[data-product-search]');
  if (search) {
    const cards = $$('.product-card'); const empty = $('[data-empty]'); const count = $('[data-result-count]'); const cats = $$('.product-cat');
    const run = () => {
      const q = search.value.trim().toLowerCase(); let n = 0;
      cards.forEach((c) => { const show = !q || c.dataset.search.includes(q); c.hidden = !show; if (show) { n++; c.classList.add('in'); } });
      cats.forEach((s) => { s.hidden = !$$('.product-card:not([hidden])', s).length; });
      if (empty) empty.hidden = n > 0;
      if (count) count.textContent = q ? `Showing ${n} of ${cards.length} products` : '';
    };
    search.addEventListener('input', run);
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  }

  /* ---------- testimonial carousel ---------- */
  $$('[data-carousel]').forEach((c) => {
    const items = $$('.testimonial', c); if (items.length < 2) return;
    let i = 0, timer;
    const show = (n) => { items[i].hidden = true; i = (n + items.length) % items.length; items[i].hidden = false; };
    $('[data-next]', c).addEventListener('click', () => show(i + 1));
    $('[data-prev]', c).addEventListener('click', () => show(i - 1));
    if (!reduced) { const start = () => { timer = setInterval(() => show(i + 1), 8000); }; const stop = () => clearInterval(timer); start(); c.addEventListener('mouseenter', stop); c.addEventListener('mouseleave', start); c.addEventListener('focusin', stop); }
  });

  /* ---------- quote summary calculator ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const fmt = (n) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });
    const val = (id) => Math.max(0, parseFloat($('#' + id).value) || 0);
    const promos = (cfg.promotions && cfg.promotions.items) || [];
    const promoWrap = $('[data-calc-promo]'); const note = $('[data-calc-promo-note]');
    if (!promos.length) { promoWrap.hidden = true; note.textContent = 'There are no active promotions at the moment.'; }
    const out = (k, t) => { $(`[data-out="${k}"]`).textContent = t; };
    const run = () => {
      const sub = val('calc-subtotal'), del = val('calc-delivery'), inst = val('calc-install');
      let disc = 0, label = ''; const code = ($('#calc-code').value || '').trim().toLowerCase();
      if (promos.length && code) {
        const p = promos.find((x) => x.code.toLowerCase() === code);
        if (!p) note.textContent = 'That code is not recognised.';
        else if (sub < p.minSubtotal) note.textContent = `This code needs a subtotal of at least ${fmt(p.minSubtotal)}.`;
        else { disc = Math.min(sub, p.type === 'percent' ? sub * p.value / 100 : p.value); label = `(${p.label})`; note.textContent = `Applied: ${p.label}${p.appliesTo ? ' · ' + p.appliesTo : ''}. Only one code can be used.`; }
      } else if (promos.length) note.textContent = '';
      out('subtotal', fmt(sub)); out('discount', '−' + fmt(disc)); out('discount-label', label); out('delivery', fmt(del)); out('install', fmt(inst)); out('total', fmt(sub - disc + del + inst));
    };
    calc.addEventListener('input', run); calc.addEventListener('submit', (e) => e.preventDefault()); run();
  }

  /* ---------- enquiry forms ---------- */
  const MESSAGES = {
    required: (l) => `${l} is required.`, email: 'Enter a valid email address, for example name@example.com.', phone: 'Enter a valid phone number, for example 0801 234 5678.',
    consent: 'Please tick the box to agree before sending.', pastDate: 'Please choose today or a future date.',
  };
  const labelOf = (el) => { const l = el.closest('.field')?.querySelector('label'); return l ? l.childNodes[0].textContent.trim() : el.name; };
  const setError = (el, msg) => {
    const err = document.getElementById(el.getAttribute('aria-describedby')?.split(' ').find((x) => x.endsWith('-err')));
    if (!err) return; err.textContent = msg; err.hidden = !msg; el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  function validate(form) {
    const errors = [];
    const fail = (el, msg) => { setError(el, msg); errors.push({ el, msg }); };
    $$('input, select, textarea', form).forEach((el) => {
      if (el.type === 'hidden' || el.closest('.hp-field') || el.type === 'radio') return;
      setError(el, ''); const v = (el.value || '').trim();
      if (el.type === 'checkbox') { if (el.required && !el.checked) fail(el, MESSAGES.consent); return; }
      if (el.required && !v) return fail(el, MESSAGES.required(labelOf(el)));
      if (!v) return;
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return fail(el, MESSAGES.email);
      if (el.type === 'tel' && !/^[+0-9][0-9 ()+\-]{6,19}$/.test(v)) return fail(el, MESSAGES.phone);
      if (el.type === 'date' && el.min && v < el.min) return fail(el, MESSAGES.pastDate);
      if (el.tagName === 'TEXTAREA' || el.id === 'budget' || el.id === 'landmark' || el.id === 'subject') {
        const bad = looksSensitive(v); if (bad) return fail(el, `This looks like ${bad}. Please remove it. We never need it.`);
      }
    });
    const cm = form.elements.contactMethod, email = form.elements.email;
    if (cm && email && cm.value === 'Email' && !email.value.trim() && !$('.field-error:not([hidden])', email.closest('.field'))) fail(email, 'Please enter your email address, since you prefer to be contacted by email.');
    return errors;
  }
  function collect(form) {
    const f = {}; new FormData(form).forEach((v, k) => { if (!['website', 'loadedAt', 'consent', 'formType'].includes(k)) { const s = String(v).trim(); if (s) f[k] = s; } });
    return f;
  }
  function fallbackText(form, fields) {
    const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
    return `Hello Cyber_Techx Engineering, I tried the website form. ${lines.join(' | ')}`.slice(0, 900);
  }
  $$('form[data-form]').forEach((form) => {
    const type = form.dataset.form;
    const summary = $('.form-error-summary', form); const status = $('.form-status', form); const fallback = $('.form-fallback', form);
    const submitBtn = $('button[type=submit]', form);
    form.elements.loadedAt.value = String(Date.now());
    const date = form.elements.preferredDate; if (date) { const d = new Date(); date.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    if (type === 'consultation') {
      const p = new URLSearchParams(location.search);
      const sv = p.get('service'); if (sv) { const o = Array.from(form.elements.service.options).find((x) => x.value.toLowerCase() === sv.toLowerCase()); if (o) form.elements.service.value = o.value; }
      if (p.get('type') === 'quote') { const r = form.querySelector('input[name=requestType][value=quote]'); if (r) r.checked = true; }
      if (p.get('product')) { form.elements.product.value = p.get('product').slice(0, 120); if (!form.elements.description.value) form.elements.description.value = `I would like a price and availability for: ${p.get('product').slice(0, 120)}.`; }
      if (p.get('method')) { const o = Array.from(form.elements.method.options).find((x) => x.value.toLowerCase() === p.get('method').toLowerCase()); if (o) form.elements.method.value = o.value; }
    }
    form.addEventListener('input', (e) => { if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (form.classList.contains('is-loading')) return;
      status.hidden = true; fallback.hidden = true; summary.hidden = true;
      const errors = validate(form);
      if (errors.length) {
        summary.innerHTML = `<strong>Please fix ${errors.length === 1 ? 'this' : 'these ' + errors.length} before sending:</strong><ul>${errors.map((x, i) => `<li><a href="#${x.el.id}" data-err="${i}"></a></li>`).join('')}</ul>`;
        errors.forEach((x, i) => { const a = summary.querySelector(`[data-err="${i}"]`); a.textContent = x.msg; a.addEventListener('click', (ev) => { ev.preventDefault(); x.el.focus(); }); });
        summary.hidden = false; summary.focus(); return;
      }
      const fields = collect(form);
      const payload = { formType: type, fields, consent: true, website: form.elements.website.value, loadedAt: Number(form.elements.loadedAt.value), page: location.pathname };
      form.classList.add('is-loading'); form.setAttribute('aria-busy', 'true'); submitBtn.disabled = true;
      const res = await send(payload);
      form.classList.remove('is-loading'); form.removeAttribute('aria-busy'); submitBtn.disabled = false;
      status.classList.toggle('is-error', !res.ok); status.hidden = false;
      if (res.ok) {
        status.innerHTML = `<p></p>`; status.firstChild.textContent = type === 'contact' ? cfg.forms.contactSuccessMessage : cfg.forms.successMessage;
        form.reset(); form.elements.loadedAt.value = String(Date.now());
      } else {
        const msg = res.status === 429 ? 'You have sent several requests in a short time. Please wait a few minutes and try again, or message us on WhatsApp.' : (res.data && res.data.message) || cfg.forms.errorMessage;
        status.innerHTML = `<p></p>`; status.firstChild.textContent = msg;
        const wa = fallback.querySelector('a[href^="https://wa.me"]'); if (wa) wa.href = waUrl(fallbackText(form, fields));
        fallback.hidden = false;
      }
      status.setAttribute('tabindex', '-1'); status.focus();
    });
  });

  /* ---------- assistant (lazy-loaded) ---------- */
  let assistantLoading = null;
  const loadAssistant = () => assistantLoading || (assistantLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = cfg.assistantScript; s.onload = resolve; s.onerror = () => { assistantLoading = null; reject(); }; document.head.appendChild(s);
  }));
  $$('[data-assistant-open]').forEach((b) => b.addEventListener('click', async () => {
    try { await loadAssistant(); window.CyberTechx.openAssistant(b); }
    catch { location.href = '/contact/'; }
  }));
})();
