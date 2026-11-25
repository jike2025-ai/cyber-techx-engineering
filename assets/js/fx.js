/* Cyber_Techx Engineering — motion & interaction layer (progressive enhancement).
   Network-grid background with data packets, cursor glow, card tilt/spotlight, magnetic buttons,
   click ripple + spark bursts, text "decrypt" on eyebrows, scroll progress. No dependencies. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  root.classList.add('fx-on');

  var $ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isSmall = window.matchMedia('(max-width: 700px)').matches;
  var COLORS = ['0,255,255', '0,191,255', '138,43,226', '193,155,255'];
  var pointer = { x: -9999, y: -9999, on: false };
  var raf = window.requestAnimationFrame.bind(window);

  function mk(tag, cls) { var n = document.createElement(tag); n.className = cls; n.setAttribute('aria-hidden', 'true'); return n; }

  /* ---------- scroll progress + header state ---------- */
  var bar = mk('div', 'fx-progress'); document.body.appendChild(bar);
  var header = document.querySelector('.site-header');
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    raf(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- network background: drifting nodes, links, travelling data packets ---------- */
  var bg = mk('canvas', 'fx-canvas'); document.body.insertBefore(bg, document.body.firstChild);
  var bctx = bg.getContext('2d');
  var W = 0, H = 0, dpr = 1, nodes = [], packets = [], running = true, lastT = 0, slow = 0;
  function sizeBg() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    bg.width = W * dpr; bg.height = H * dpr; bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.max(22, Math.min(isSmall ? 30 : 70, (W * H) / 24000)));
    while (nodes.length < n) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: 1 + Math.random() * 1.6, c: COLORS[(Math.random() * COLORS.length) | 0] });
    if (nodes.length > n) nodes.length = n;
  }
  sizeBg();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(sizeBg, 150); });
  var LINK = isSmall ? 110 : 150;

  function frame(t) {
    if (!running) return;
    var dt = t - lastT; lastT = t;
    if (dt > 34) { slow++; if (slow > 40 && nodes.length > 18) { nodes.length -= 6; slow = 0; } } else if (slow > 0) slow--;
    bctx.clearRect(0, 0, W, H);
    var i, j, a, b, dx, dy, d;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
      if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
      if (pointer.on) { dx = a.x - pointer.x; dy = a.y - pointer.y; d = dx * dx + dy * dy; if (d < 14400 && d > 1) { var f = (1 - d / 14400) * .9; a.x += dx / Math.sqrt(d) * f; a.y += dy / Math.sqrt(d) * f; } }
      bctx.beginPath(); bctx.fillStyle = 'rgba(' + a.c + ',.85)'; bctx.arc(a.x, a.y, a.r, 0, 6.2832); bctx.fill();
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
        if (d < LINK * LINK) {
          bctx.strokeStyle = 'rgba(0,191,255,' + ((1 - Math.sqrt(d) / LINK) * .28).toFixed(3) + ')'; bctx.lineWidth = 1;
          bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(b.x, b.y); bctx.stroke();
          if (packets.length < 9 && Math.random() < .0009) packets.push({ a: a, b: b, p: 0, s: .012 + Math.random() * .014 });
        }
      }
      if (pointer.on) { dx = a.x - pointer.x; dy = a.y - pointer.y; d = Math.sqrt(dx * dx + dy * dy); if (d < 170) { bctx.strokeStyle = 'rgba(0,255,255,' + ((1 - d / 170) * .55).toFixed(3) + ')'; bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(pointer.x, pointer.y); bctx.stroke(); } }
    }
    for (i = packets.length - 1; i >= 0; i--) {
      var k = packets[i]; k.p += k.s;
      if (k.p >= 1) { packets.splice(i, 1); continue; }
      var px = k.a.x + (k.b.x - k.a.x) * k.p, py = k.a.y + (k.b.y - k.a.y) * k.p;
      bctx.beginPath(); bctx.fillStyle = 'rgba(0,255,255,.95)'; bctx.shadowColor = '#0ff'; bctx.shadowBlur = 10; bctx.arc(px, py, 2.2, 0, 6.2832); bctx.fill(); bctx.shadowBlur = 0;
    }
    raf(frame);
  }
  raf(frame);
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) { lastT = performance.now(); raf(frame); } });

  /* ---------- cursor glow (mouse only) ---------- */
  var glow = null, gx = 0, gy = 0, gpending = false;
  if (finePointer) {
    glow = mk('div', 'fx-glow'); document.body.appendChild(glow);
  }
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch';
    if (glow && !gpending) {
      gpending = true; gx = e.clientX; gy = e.clientY;
      raf(function () { glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; glow.classList.add('on'); gpending = false; });
    }
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.on = false; if (glow) glow.classList.remove('on'); });

  /* ---------- card spotlight + tilt, hero parallax, magnetic buttons ---------- */
  var tiltSel = '.service-card, .product-card, .project-card, .post-card, a.card';
  $(tiltSel).forEach(function (c) { c.classList.add('fx-tilt'); });
  document.addEventListener('pointermove', function (e) {
    var card = e.target.closest && e.target.closest('.card');
    if (card) {
      var r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      if (e.pointerType === 'mouse' && card.classList.contains('fx-tilt')) {
        card.classList.add('fx-hot');
        card.style.setProperty('--ry', ((x / r.width - .5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y / r.height) * 9).toFixed(2) + 'deg');
      }
    }
    var hv = document.querySelector('.hero-visual');
    if (hv && e.pointerType === 'mouse') {
      hv.style.setProperty('--px', (e.clientX / window.innerWidth - .5).toFixed(3));
      hv.style.setProperty('--py', (e.clientY / window.innerHeight - .5).toFixed(3));
    }
    var btn = e.target.closest && e.target.closest('.btn');
    if (btn && e.pointerType === 'mouse') {
      var br = btn.getBoundingClientRect();
      btn.style.setProperty('--tx', ((e.clientX - br.left - br.width / 2) * .12).toFixed(1) + 'px');
      btn.style.setProperty('--ty', ((e.clientY - br.top - br.height / 2) * .18).toFixed(1) + 'px');
    }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var t = e.target.closest && e.target.closest('.fx-tilt, .btn');
    if (t && !t.contains(e.relatedTarget)) {
      t.classList.remove('fx-hot');
      ['--rx', '--ry', '--tx', '--ty'].forEach(function (p) { t.style.removeProperty(p); });
    }
  });

  /* ---------- click: ripple on buttons/cards + spark burst anywhere ---------- */
  var burst = mk('canvas', 'fx-burst'); document.body.appendChild(burst);
  var xctx = burst.getContext('2d'), sparks = [], sparkRun = false;
  function sizeBurst() { burst.width = window.innerWidth; burst.height = window.innerHeight; }
  sizeBurst(); window.addEventListener('resize', sizeBurst);
  function sparkFrame() {
    xctx.clearRect(0, 0, burst.width, burst.height);
    xctx.globalCompositeOperation = 'lighter';
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i]; s.life -= .022; if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vx *= .96; s.vy = s.vy * .96 + .05; s.x += s.vx; s.y += s.vy;
      xctx.fillStyle = 'rgba(' + s.c + ',' + s.life.toFixed(2) + ')';
      xctx.fillRect(s.x - s.sz / 2, s.y - s.sz / 2, s.sz, s.sz);
    }
    if (sparks.length) raf(sparkFrame); else { sparkRun = false; xctx.clearRect(0, 0, burst.width, burst.height); }
  }
  function boom(x, y) {
    for (var i = 0; i < 16; i++) {
      var ang = Math.random() * 6.2832, sp = 1.5 + Math.random() * 4.5;
      sparks.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, life: 1, sz: 2 + Math.random() * 3, c: COLORS[(Math.random() * COLORS.length) | 0] });
    }
    if (!sparkRun) { sparkRun = true; raf(sparkFrame); }
  }
  document.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var el = e.target.closest && e.target.closest('input, textarea, select, label');
    if (el) return;
    boom(e.clientX, e.clientY);
    var host = e.target.closest && e.target.closest('.btn, .chip-nav a');
    if (host) {
      var r = host.getBoundingClientRect(), rp = mk('span', 'fx-ripple');
      rp.style.left = (e.clientX - r.left) + 'px'; rp.style.top = (e.clientY - r.top) + 'px';
      rp.style.setProperty('--s', Math.ceil(Math.max(r.width, r.height) / 6));
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(rp); setTimeout(function () { rp.remove(); }, 700);
    }
  }, { passive: true });

  /* ---------- reveal stagger ---------- */
  var seen = new Set();
  $('.reveal').forEach(function (el) {
    var p = el.parentElement; if (!p || seen.has(p)) return; seen.add(p);
    $(':scope > .reveal', p).forEach(function (c, i) { c.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms'); });
  });

  /* ---------- "decrypt" effect on eyebrow labels as they scroll in ---------- */
  var GL = '01<>/\\[]{}#$%&*+=?', labels = $('.eyebrow');
  function scramble(el) {
    var txt = el.getAttribute('data-orig') || el.textContent; el.setAttribute('data-orig', txt);
    var n = 0, steps = 16;
    var iv = setInterval(function () {
      n++;
      var out = '';
      for (var i = 0; i < txt.length; i++) out += (txt[i] === ' ' || i < (n / steps) * txt.length) ? txt[i] : GL[(Math.random() * GL.length) | 0];
      el.textContent = out;
      if (n >= steps) { clearInterval(iv); el.textContent = txt; }
    }, 36);
  }
  if ('IntersectionObserver' in window && labels.length) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { lio.unobserve(en.target); scramble(en.target); } });
    }, { threshold: .6 });
    labels.forEach(function (l) { lio.observe(l); });
  }
})();
