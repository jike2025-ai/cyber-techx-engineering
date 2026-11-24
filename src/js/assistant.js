/* Guided enquiry assistant (UI shell). Not AI unless config.aiEnabled is true and a backend is connected. */
(function () {
  'use strict';
  var root = document.getElementById('assistant-root');
  if (!root) return;
  var cfg; try { cfg = JSON.parse(root.dataset.config); } catch (e) { return; }
  var d = document;

  function el(tag, cls, text) { var e = d.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var launch = el('button', 'as-launch'); launch.type = 'button'; launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-controls', 'as-panel');
  launch.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>'; launch.appendChild(el('span', '', 'Ask us'));
  var panel = el('section', 'as-panel'); panel.id = 'as-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', cfg.title);
  var head = el('div', 'as-head'); var h = el('h2', '', cfg.title); h.tabIndex = -1;
  var x = el('button', 'as-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close assistant'); head.appendChild(h); head.appendChild(x);
  var note = el('p', 'as-note', (cfg.aiEnabled ? '' : cfg.notAiNote + ' ') + cfg.privacyNote);
  var log = el('div', 'as-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
  var err = el('p', 'as-err'); err.hidden = true; err.setAttribute('role', 'alert');
  var form = el('form', 'as-form'); form.noValidate = true; form.hidden = true;
  panel.appendChild(head); panel.appendChild(note); panel.appendChild(log); panel.appendChild(err); panel.appendChild(form);
  root.appendChild(launch); root.appendChild(panel);

  var state = null, started = false, opened = Date.now();
  var SENSITIVE = /(\b(?:\d[ -]?){13,19}\b)|\b(password|passcode|otp|pin\s*(?:is|:)|cvv|bvn|card\s*number)\b/i;

  function bot(text) { var m = el('p', 'as-msg as-bot', text); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function me(text) { log.appendChild(el('p', 'as-msg as-me', text)); log.scrollTop = log.scrollHeight; }
  function opts(list, onPick, cls) {
    var w = el('div', 'as-opts'); w.setAttribute('role', 'group');
    list.forEach(function (o) { var b = el('button', 'as-opt', o.label || o); b.type = 'button'; b.addEventListener('click', function () { w.remove(); onPick(o); }); w.appendChild(b); });
    log.appendChild(w); log.scrollTop = log.scrollHeight; var f = w.querySelector('button'); if (f) f.focus(); return w;
  }
  function setErr(t) { err.hidden = !t; err.textContent = t || ''; }

  function open() { panel.classList.add('open'); launch.setAttribute('aria-expanded', 'true'); launch.hidden = true; if (!started) { started = true; start(); } else h.focus(); }
  function close() { panel.classList.remove('open'); launch.setAttribute('aria-expanded', 'false'); launch.hidden = false; launch.focus(); }
  launch.addEventListener('click', open); x.addEventListener('click', close);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function start() {
    log.textContent = ''; form.hidden = true; state = null; setErr('');
    bot(cfg.greeting); h.focus();
    opts(cfg.options, choose);
  }
  function links(items) {
    var w = el('div', 'as-links');
    items.forEach(function (i) { var a = el('a', 'btn btn-sm ' + (i.kind || 'btn-ghost'), i.label); a.href = i.href; if (/^https?:/.test(i.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } w.appendChild(a); });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
  }
  function restart() { opts(['Start over'], start); }

  function choose(o) {
    me(o.label);
    if (o.flow === 'contact') {
      bot('You can reach us any of these ways:');
      links([{ label: 'Call ' + cfg.phone, href: cfg.tel, kind: 'btn-primary' }, { label: 'WhatsApp', href: cfg.wa, kind: 'btn-wa' }, { label: 'Email us', href: 'mailto:' + cfg.email }, { label: 'Contact page', href: '/contact/' }]);
      return restart();
    }
    if (o.flow === 'product') {
      bot('You can browse our catalogue and ask for a price on anything. Or tell me what you need and the team will get back to you.');
      links([{ label: 'Browse products', href: '/products/', kind: 'btn-primary' }]);
      return begin(o, 'Which product are you interested in, and roughly how many?');
    }
    begin(o, o.intent === 'quote' ? 'Happy to help with a quote. What would you like quoted?' : 'Great. Tell us a little about what you need.');
  }

  var steps = [
    { k: 'description', type: 'textarea', req: true, q: null, label: 'Project description' },
    { k: 'propertyType', type: 'choice', list: cfg.propertyTypes, q: 'What type of property or site is it?', skip: true },
    { k: 'location', type: 'text', q: 'Where will the work take place (area or town)?', skip: true },
    { k: 'landmark', type: 'text', q: 'Is there a nearby landmark that helps us find you?', skip: true },
    { k: 'timeline', type: 'choice', list: cfg.timelines, q: 'When would you like this done?', skip: true },
    { k: 'budget', type: 'choice', list: cfg.budgetRanges, q: 'Do you have an approximate budget? (optional)', skip: true },
    { k: 'method', type: 'choice', list: ['In-store', 'On-site', 'Virtual'], q: 'How would you like to consult with us?', req: true },
    { k: 'date', type: 'date', q: 'Do you have a preferred date? (This is a request, not a confirmed booking.)', skip: true },
    { k: 'time', type: 'time', q: 'And a preferred time?', skip: true },
    { k: 'fullName', type: 'text', req: true, q: 'What is your name?', ac: 'name' },
    { k: 'phone', type: 'tel', req: true, q: 'What is your phone or WhatsApp number?', ac: 'tel' },
    { k: 'email', type: 'email', req: true, q: 'And your email address?', ac: 'email' }
  ];
  var labels = { description: 'Project', propertyType: 'Property', location: 'Location', landmark: 'Landmark', timeline: 'Timeline', budget: 'Budget', method: 'Consultation', date: 'Preferred date', time: 'Preferred time', fullName: 'Name', phone: 'Phone', email: 'Email' };

  function begin(o, firstQ) { state = { o: o, i: 0, data: { service: o.service, intent: o.intent || 'consultation' } }; steps[0].q = firstQ; ask(); }

  function ask() {
    setErr(''); form.hidden = true; form.textContent = '';
    if (state.i >= steps.length) return review();
    var s = steps[state.i]; bot(s.q);
    if (s.type === 'choice') {
      var list = s.list.map(function (v) { return { label: v }; }); if (s.skip) list.push({ label: 'Skip', skip: true });
      opts(list, function (o) { me(o.label); if (!o.skip) state.data[s.k] = o.label; state.i++; ask(); });
      return;
    }
    var inp = s.type === 'textarea' ? el('textarea') : el('input'); if (s.type !== 'textarea') inp.type = s.type; else inp.rows = 3;
    inp.name = s.k; inp.required = !!s.req; inp.maxLength = 1000; inp.setAttribute('aria-label', s.label || s.q); if (s.ac) inp.autocomplete = s.ac;
    if (s.type === 'tel') inp.inputMode = 'tel';
    var send = el('button', 'btn btn-primary btn-sm as-send', 'Send'); send.type = 'submit';
    form.appendChild(inp); form.appendChild(send);
    if (s.skip) { var sk = el('button', 'btn btn-ghost btn-sm as-send', 'Skip'); sk.type = 'button'; sk.addEventListener('click', function () { me('Skip'); state.i++; ask(); }); form.appendChild(sk); }
    form.hidden = false; inp.focus();
    form.onsubmit = function (e) {
      e.preventDefault(); var v = inp.value.trim(); var m = validate(s, v);
      if (m) { setErr(m); inp.focus(); return; }
      if (SENSITIVE.test(v)) { setErr('Please do not share passwords, PINs, OTPs or card/bank numbers here.'); inp.focus(); return; }
      if (!v && !s.req) { me('Skip'); } else { me(v); state.data[s.k] = v; }
      state.i++; ask();
    };
  }
  function validate(s, v) {
    if (s.req && !v) return 'This one is needed so we can help you.';
    if (s.k === 'fullName' && v.length < 2) return 'Please enter your name.';
    if (s.k === 'phone') { var n = v.replace(/\D/g, ''); if (n.length < 7 || n.length > 15) return 'Please enter a valid phone number.'; }
    if (s.k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
    if (s.k === 'description' && v.length < 5) return 'Please add a few more words.';
    return '';
  }
  function review() {
    form.hidden = true; form.textContent = '';
    bot('Thanks. Please check your details:');
    var m = el('p', 'as-msg as-bot'); var dd = state.data;
    var lines = ['Service: ' + dd.service]; Object.keys(labels).forEach(function (k) { if (dd[k]) lines.push(labels[k] + ': ' + dd[k]); });
    m.textContent = lines.join('\n'); m.style.whiteSpace = 'pre-line'; log.appendChild(m);
    bot('By sending, you agree that Cyber_Techx Engineering may use these details to respond to you (see our Privacy Policy). A booking is not confirmed until we contact you.');
    opts([{ label: 'I agree. Send to Cyber_Techx', go: 1 }, { label: 'Start over' }], function (o) { if (o.go) send(); else start(); });
  }
  function send() {
    var payload = {}; Object.keys(state.data).forEach(function (k) { payload[k] = state.data[k]; });
    payload.formType = 'assistant'; payload.consent = 'yes'; payload.startedAt = opened; payload.website = '';
    var wait = bot('Sending…');
    fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cyber-techx-web' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!(r.ok && j.ok)) throw new Error(); }); })
      .then(function () { wait.textContent = 'Thank you. Your enquiry has been received. Cyber_Techx Engineering will review it and contact you using the details provided.'; links([{ label: 'WhatsApp us', href: cfg.wa, kind: 'btn-wa' }]); restart(); })
      .catch(function () { wait.textContent = 'Sorry, we could not send that right now. Please try again, or contact us directly.'; links([{ label: 'Call ' + cfg.phone, href: cfg.tel, kind: 'btn-primary' }, { label: 'WhatsApp', href: cfg.wa, kind: 'btn-wa' }]); opts([{ label: 'Try sending again', go: 1 }], function () { send(); }); });
  }
})();
