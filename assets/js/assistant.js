/* Cyber_Techx guided enquiry assistant (UI shell).
 * This is NOT an AI. It walks the visitor through a short question flow and sends the answers
 * to the same /api/contact endpoint as the forms. To connect a real AI later, set
 * assistant.mode = "ai" and assistant.aiEndpoint in content/site.json, then implement
 * `askAI()` below. Never send passwords, PINs, OTPs or card/bank details to any backend. */
(() => {
  'use strict';
  const T = window.CyberTechx; if (!T) return;
  const { cfg, send, looksSensitive, waUrl } = T;
  const A = cfg.assistant;
  const O = cfg.forms.options;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INSTALL = ['CCTV & Security', 'Networking & Wi-Fi', 'Smart Automation'];

  let root, log, inputArea, errorEl, opener, openedAt, data, queue, current;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  function build() {
    root = el('div', 'assistant'); root.id = 'assistant'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'assistant-title');
    const head = el('div', 'assistant-head');
    const hw = el('div'); const h = el('h2', null, A.title); h.id = 'assistant-title'; hw.append(h, el('p', null, 'Guided enquiry · replies from our team'));
    const close = el('button', 'assistant-close'); close.type = 'button'; close.setAttribute('aria-label', 'Close assistant'); close.textContent = '✕';
    close.addEventListener('click', closeAssistant); head.append(hw, close);
    const notice = el('p', 'assistant-notice', A.notice);
    log = el('div', 'assistant-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Conversation');
    errorEl = el('p', 'assistant-form-error'); errorEl.setAttribute('role', 'alert');
    inputArea = el('div');
    root.append(head, notice, log, errorEl, inputArea);
    document.body.appendChild(root);
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeAssistant(); return; }
      if (e.key !== 'Tab') return;
      const f = Array.from(root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])')).filter((n) => n.offsetParent !== null);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  const scroll = () => { log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }); };
  const bot = (text, cls = '') => { const m = el('div', 'msg bot ' + cls, text); log.appendChild(m); scroll(); return m; };
  const user = (text) => { log.appendChild(el('div', 'msg user', text)); scroll(); };
  const clearInput = () => { inputArea.replaceChildren(); errorEl.textContent = ''; };
  const focusFirst = () => { const f = inputArea.querySelector('input, select, button, a') || root.querySelector('.assistant-close'); if (f) f.focus(); };

  function optionButtons(items, onPick, extra) {
    clearInput();
    const wrap = el('div', 'assistant-options'); wrap.style.cssText = '';
    wrap.className = 'assistant-options'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Choose an option');
    items.forEach((it) => {
      const label = typeof it === 'string' ? it : it.label;
      if (it.href) { const a = el('a', null, label); a.href = it.href; if (/^https?:/.test(it.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } wrap.appendChild(a); return; }
      const b = el('button', null, label); b.type = 'button'; b.addEventListener('click', () => onPick(it)); wrap.appendChild(b);
    });
    const holder = el('div', 'assistant-form'); holder.style.display = 'block'; holder.className = 'assistant-form assistant-form-block'; holder.append(wrap);
    if (extra) holder.append(extra);
    inputArea.appendChild(holder); focusFirst();
  }

  function startOver() { data = { fields: {} }; queue = []; log.replaceChildren(); showMenu(true); }

  function showMenu(first) {
    if (first) bot(A.welcome);
    else bot('What else can we help with?');
    optionButtons(A.options, pickService);
  }

  function pickService(opt) {
    user(opt.label);
    if (opt.kind === 'contact') {
      bot('You can reach Cyber_Techx Engineering any of these ways:');
      optionButtons([
        { label: `Call ${cfg.contact.phoneDisplay}`, href: `tel:${cfg.contact.phone}` },
        { label: 'WhatsApp', href: waUrl(cfg.whatsappDefaultMessage) },
        { label: 'Email', href: `mailto:${cfg.contact.email}` },
        { label: 'Book a consultation', href: '/consultation/' },
        { label: 'Back to menu', onlyBack: true },
      ].map((x) => x.onlyBack ? { label: x.label } : x), () => { showMenu(false); });
      return;
    }
    data = { fields: { service: opt.service }, request: opt.request || 'enquiry', optLabel: opt.label };
    if (opt.note) bot(opt.note);
    buildQueue(opt.service);
    bot("Great. I'll ask a few quick questions so the team can help properly. You can skip anything optional.");
    next();
  }

  function buildQueue(service) {
    const product = service === 'Product Purchase';
    const q = [
      { key: 'fullName', ask: 'What is your name?', type: 'text', required: true, ac: 'name', min: 2 },
      { key: 'phone', ask: 'What phone or WhatsApp number can we reach you on?', type: 'tel', required: true, ac: 'tel' },
      { key: 'email', ask: 'What is your email address? (optional)', type: 'email', ac: 'email' },
      { key: 'description', ask: product ? 'Which product or products are you interested in?' : 'Briefly, what do you need or what problem are you trying to solve?', type: 'text', required: true, min: 5 },
    ];
    if (INSTALL.includes(service)) q.push({ key: 'propertyType', ask: 'What type of property or site is it?', type: 'choice', choices: O.propertyTypes });
    if (service !== 'IT & AI Training') q.push({ key: 'location', ask: INSTALL.includes(service) ? 'Where will the installation be? (area or town)' : 'Which area or town are you in?', type: 'text', ac: 'address-level2' });
    if (INSTALL.includes(service)) q.push({ key: 'landmark', ask: 'Is there a nearby landmark that helps us find you?', type: 'text' });
    q.push({ key: 'timeline', ask: 'When would you like this done?', type: 'choice', choices: O.timelines });
    q.push({ key: 'budget', ask: 'Do you have an approximate budget? (optional)', type: 'text' });
    q.push({ key: 'method', ask: 'How would you like to have your consultation?', type: 'choice', choices: ['In-store', 'On-site', 'Virtual'] });
    q.push({ key: 'preferredDate', ask: 'Do you have a preferred date? (optional)', type: 'date' });
    q.push({ key: 'preferredTime', ask: 'And a preferred time of day? (optional)', type: 'choice', choices: O.times });
    q.push({ key: 'contactMethod', ask: 'How would you prefer us to contact you?', type: 'choice', choices: O.contactMethods });
    queue = q;
  }

  function next() {
    current = queue.shift();
    if (!current) return summary();
    bot(current.ask);
    if (current.type === 'choice') {
      const skip = el('button', 'assistant-skip', 'Skip'); skip.type = 'button'; skip.addEventListener('click', () => { user('Skipped'); next(); });
      optionButtons(current.choices, (c) => { user(c); data.fields[current.key] = c; next(); }, skip);
      return;
    }
    clearInput();
    const form = el('form', 'assistant-form'); form.noValidate = true;
    const input = el('input'); input.type = current.type; input.name = current.key; input.maxLength = 400; input.setAttribute('aria-label', current.ask);
    if (current.ac) input.autocomplete = current.ac; if (current.type === 'tel') input.inputMode = 'tel';
    if (current.type === 'date') { const d = new Date(); input.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    const go = el('button'); go.type = 'submit'; go.setAttribute('aria-label', 'Send answer'); go.textContent = '➤';
    form.append(input, go);
    if (!current.required) { const skip = el('button', 'assistant-skip', 'Skip'); skip.type = 'button'; skip.addEventListener('click', () => { user('Skipped'); next(); }); form.append(skip); }
    form.addEventListener('submit', (e) => {
      e.preventDefault(); const v = input.value.trim(); errorEl.textContent = '';
      if (!v) { if (current.required) { errorEl.textContent = 'This one is needed so we can help you.'; input.focus(); return; } user('Skipped'); return next(); }
      const bad = looksSensitive(v); if (bad) { errorEl.textContent = `That looks like ${bad}. Please do not share it here. We never need it.`; input.focus(); return; }
      if (current.min && v.length < current.min) { errorEl.textContent = 'Please add a little more detail.'; input.focus(); return; }
      if (current.type === 'tel' && !/^[+0-9][0-9 ()+\-]{6,19}$/.test(v)) { errorEl.textContent = 'Please enter a valid phone number, for example 0813 530 3131.'; input.focus(); return; }
      if (current.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { errorEl.textContent = 'Please enter a valid email address.'; input.focus(); return; }
      user(v); data.fields[current.key] = v; next();
    });
    inputArea.appendChild(form); input.focus();
  }

  const LABELS = { service: 'Service', fullName: 'Name', phone: 'Phone / WhatsApp', email: 'Email', description: 'Need', propertyType: 'Property type', location: 'Location', landmark: 'Landmark', timeline: 'Timeline', budget: 'Budget', method: 'Consultation method', preferredDate: 'Preferred date', preferredTime: 'Preferred time', contactMethod: 'Contact by' };

  function summary() {
    bot('Thank you. Here is what we have:');
    const box = el('div', 'msg bot'); const ul = el('ul');
    Object.entries(data.fields).forEach(([k, v]) => { const li = el('li'); const b = el('strong', null, (LABELS[k] || k) + ': '); li.append(b, document.createTextNode(v)); ul.appendChild(li); });
    box.appendChild(ul); log.appendChild(box); scroll();
    bot(cfg.forms.consentText);
    optionButtons([{ label: 'I agree: send to Cyber_Techx', v: 'send' }, { label: 'Start over', v: 'again' }], (c) => (c.v === 'send' ? submit() : startOver()));
  }

  async function submit() {
    user('I agree: send to Cyber_Techx'); clearInput();
    const t = bot(''); const dots = el('span', 'typing'); dots.append(el('i'), el('i'), el('i')); t.append(dots); t.setAttribute('aria-label', 'Sending');
    const fields = { ...data.fields, requestType: data.request === 'quote' ? 'quote' : 'consultation', source: 'Enquiry assistant (' + data.optLabel + ')' };
    const res = await send({ formType: 'assistant', fields, consent: true, website: '', loadedAt: openedAt, page: location.pathname });
    t.remove();
    if (res.ok) {
      bot(data.request === 'consultation' || data.request === 'enquiry' ? cfg.forms.successMessage.replace('consultation request', 'request') : 'Thank you. Your request has been received. Cyber_Techx Engineering will review it and contact you using the details provided.');
      optionButtons([{ label: 'Ask something else' }, { label: 'Close' }], (c) => (c.label === 'Close' ? closeAssistant() : (data = { fields: {} }, showMenu(false))));
    } else {
      bot(res.status === 429 ? 'You have sent several requests in a short time. Please try again in a few minutes, or message us directly:' : cfg.forms.errorMessage, 'error');
      const text = 'Hello Cyber_Techx Engineering, I tried the website assistant. ' + Object.entries(data.fields).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join(' | ');
      optionButtons([{ label: 'Send on WhatsApp', href: waUrl(text.slice(0, 900)) }, { label: 'Email us', href: `mailto:${cfg.contact.email}` }, { label: 'Try again', v: 'retry' }], () => summary());
    }
  }

  function openAssistant(trigger) {
    if (!root) { build(); startOver(); }
    opener = trigger; openedAt = Date.now(); root.hidden = false; document.body.classList.add('assistant-open');
    const btn = document.querySelector('[data-assistant-open]'); if (btn) btn.setAttribute('aria-expanded', 'true');
    focusFirst();
  }
  function closeAssistant() {
    root.hidden = true; document.body.classList.remove('assistant-open');
    const btn = document.querySelector('[data-assistant-open]'); if (btn) btn.setAttribute('aria-expanded', 'false');
    if (opener && opener.focus) opener.focus();
  }
  T.openAssistant = openAssistant;
  // Hook for a future AI backend (see header comment). Intentionally not implemented.
  // async function askAI(message) { /* POST to A.aiEndpoint, never include secrets client-side */ }
})();
