(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');

  // year
  d.querySelectorAll('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

  // current nav link
  var path = location.pathname;
  d.querySelectorAll('[data-nav]').forEach(function (a) {
    var h = a.getAttribute('href');
    if (h === path || (h !== '/' && path.indexOf(h) === 0)) a.setAttribute('aria-current', 'page');
  });

  // mobile menu
  var btn = d.querySelector('[data-menu]'), nav = d.getElementById('primary-nav');
  function setMenu(open) { if (!btn) return; btn.setAttribute('aria-expanded', open); nav.classList.toggle('open', open); d.body.style.overflow = open && innerWidth < 1000 ? 'hidden' : ''; }
  if (btn) btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });

  // dropdowns
  var toggles = d.querySelectorAll('.sub-toggle');
  function closeSubs(except) { toggles.forEach(function (t) { if (t !== except) { t.setAttribute('aria-expanded', 'false'); d.getElementById(t.getAttribute('aria-controls')).classList.remove('open'); } }); }
  toggles.forEach(function (t) {
    t.addEventListener('click', function (e) { e.stopPropagation(); var o = t.getAttribute('aria-expanded') !== 'true'; closeSubs(t); t.setAttribute('aria-expanded', o); d.getElementById(t.getAttribute('aria-controls')).classList.toggle('open', o); });
  });
  d.addEventListener('click', function (e) { if (!e.target.closest('.has-sub')) closeSubs(); });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openSub = d.querySelector('.sub-toggle[aria-expanded=true]');
    if (openSub) { closeSubs(); openSub.focus(); return; }
    if (btn && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
  });
  addEventListener('resize', function () { if (innerWidth >= 1000) setMenu(false); });

  // reveal on scroll
  var rev = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rev.forEach(function (el) { io.observe(el); });
  } else rev.forEach(function (el) { el.classList.add('in'); });

  // testimonials rotation (only when more than one)
  var testi = d.querySelector('[data-testi]');
  if (testi && testi.children.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches && innerWidth < 900) {
    var i = 0, items = testi.children;
    Array.prototype.forEach.call(items, function (el, k) { el.hidden = k !== 0; });
    setInterval(function () { items[i].hidden = true; i = (i + 1) % items.length; items[i].hidden = false; }, 7000);
  }

  // product filtering
  var filters = d.querySelector('[data-filters]');
  if (filters) {
    var cards = Array.prototype.slice.call(d.querySelectorAll('.prod')), blocks = d.querySelectorAll('[data-block]');
    var search = filters.querySelector('[data-search]'), chips = filters.querySelectorAll('.chip'), count = filters.querySelector('[data-count]'), empty = d.querySelector('[data-empty]');
    var cat = 'all';
    function apply() {
      var q = search.value.trim().toLowerCase(), shown = 0;
      cards.forEach(function (c) { var ok = (cat === 'all' || c.dataset.cat === cat) && (!q || c.dataset.search.indexOf(q) > -1); c.hidden = !ok; if (ok) shown++; });
      blocks.forEach(function (b) { b.hidden = !b.querySelector('.prod:not([hidden])'); });
      if (empty) empty.hidden = shown !== 0;
      if (count) count.textContent = shown + (shown === 1 ? ' product shown' : ' products shown');
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { cat = c.dataset.cat; chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); }); apply(); }); });
    search.addEventListener('input', apply);
    var hash = location.hash.replace('#', ''); if (hash) { var m = Array.prototype.find.call(chips, function (c) { return c.dataset.cat === hash; }); if (m) m.click(); }
    apply();
  }

  // forms
  function msg(form, text, kind) {
    var s = form.querySelector('.form-status'); s.hidden = false; s.className = 'form-status ' + kind; s.textContent = text; s.focus();
  }
  function setErr(form, name, text) {
    var e = form.querySelector('[data-err-for="' + name + '"]'), f = form.elements[name];
    var el = f && f.length && !f.tagName ? f[0] : f;
    if (e) { e.hidden = !text; e.textContent = text || ''; e.id = e.id || 'err-' + name; }
    if (el && el.setAttribute) { if (text) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', e.id); } else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); } }
  }
  var SENSITIVE = /(\b\d{13,19}\b)|(\b(?:\d[ -]?){13,19}\b)|\b(password|passcode|otp|pin\s*(?:is|:)|cvv|bvn|card\s*number)\b/i;
  var rules = {
    fullName: function (v) { return v.trim().length < 2 ? 'Please enter your name.' : ''; },
    phone: function (v) { var n = v.replace(/[^\d+]/g, ''); return n.replace(/\D/g, '').length < 7 || n.replace(/\D/g, '').length > 15 ? 'Please enter a valid phone or WhatsApp number.' : ''; },
    email: function (v) { return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Please enter a valid email address.' : ''; },
    service: function (v) { return v ? '' : 'Please choose a service.'; },
    contactMethod: function (v) { return v ? '' : 'Please choose how we should contact you.'; },
    description: function (v) { return v.trim().length < 10 ? 'Please describe your project (at least a few words).' : ''; },
    subject: function (v) { return v.trim().length < 3 ? 'Please add a subject.' : ''; },
    message: function (v) { return v.trim().length < 10 ? 'Please write a short message.' : ''; }
  };
  d.querySelectorAll('form[data-form]').forEach(function (form) {
    var type = form.dataset.form;
    form.elements.startedAt.value = Date.now();
    var q = new URLSearchParams(location.search);
    if (q.get('service') && form.elements.service) { var sv = q.get('service'); Array.prototype.forEach.call(form.elements.service.options, function (o) { if (o.value === sv || o.text === sv) form.elements.service.value = o.value || o.text; }); }
    if (q.get('product')) { form.elements.product.value = q.get('product').slice(0, 120); if (form.elements.description && !form.elements.description.value) form.elements.description.value = 'I would like a quote for: ' + q.get('product').slice(0, 120) + '. '; }
    if (q.get('intent') === 'quote') { form.elements.intent.value = 'quote'; var h = d.querySelector('h1'); if (h && type === 'consultation') h.textContent = 'Request a quote'; var sb = form.querySelector('[data-label]'); if (sb) sb.textContent = 'Send quote request'; }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true, first = null;
      Object.keys(rules).forEach(function (n) { if (!form.elements[n]) return; var m = rules[n](form.elements[n].value || ''); setErr(form, n, m); if (m) { ok = false; first = first || form.elements[n]; } });
      if (form.elements.method) { var chosen = form.querySelector('input[name=method]:checked'); var m2 = chosen ? '' : 'Please choose a consultation method.'; setErr(form, 'method', m2); if (m2) { ok = false; first = first || form.querySelector('input[name=method]'); } }
      if (!form.elements.consent.checked) { setErr(form, 'consent', 'Please tick the box to continue.'); ok = false; first = first || form.elements.consent; } else setErr(form, 'consent', '');
      var all = Array.prototype.map.call(form.querySelectorAll('input[type=text],textarea'), function (e) { return e.value; }).join(' ');
      if (SENSITIVE.test(all)) { msg(form, 'For your safety, please remove passwords, PINs, OTPs or card/bank numbers from your message. We never need them.', 'bad'); return; }
      if (!ok) { if (first) first.focus(); return; }
      var submit = form.querySelector('button[type=submit]'), label = submit.querySelector('[data-label]'), old = label.textContent;
      submit.disabled = true; label.textContent = 'Sending…';
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cyber-techx-web' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset(); form.elements.startedAt.value = Date.now();
            msg(form, type === 'contact' ? 'Thank you. Your message has been received. Cyber_Techx Engineering will review it and contact you using the details provided.' : 'Thank you. Your consultation request has been received. Cyber_Techx Engineering will review your request and contact you using the details provided.', 'ok');
          } else throw new Error((res.j && res.j.error) || 'fail');
        })
        .catch(function () { msg(form, 'Sorry, we could not send that right now. Please try again, or contact us on WhatsApp or by phone on ' + (form.dataset.phone || '') + '.', 'bad'); })
        .then(function () { submit.disabled = false; label.textContent = old; });
    });
  });
})();
