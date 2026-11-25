import { esc, safeJson, waLink, enc } from './util.mjs';
import { icon } from './icons.mjs';

/** Build context is set once by build.mjs */
export const ctx = { site: null, siteUrl: '', assetV: {}, year: new Date().getFullYear(), publicConfig: null };

export const abs = (p) => (ctx.siteUrl ? ctx.siteUrl + p : p);
export const asset = (p) => (ctx.assetV[p] ? `${p}?v=${ctx.assetV[p]}` : p);

/* ---------- small building blocks ---------- */
export function img({ base, sizes = [480, 960], w, h, alt = '', sizesAttr = '(min-width: 900px) 50vw, 100vw', lazy = true, cls = '' }) {
  const [s, l] = sizes;
  return `<img class="${cls}" src="/assets/img/${base}-${l}.webp" srcset="/assets/img/${base}-${s}.webp ${s}w, /assets/img/${base}-${l}.webp ${l}w" sizes="${sizesAttr}" width="${w}" height="${h}" alt="${esc(alt)}" ${lazy ? 'loading="lazy" decoding="async"' : 'fetchpriority="high" decoding="async"'}>`;
}

export const btn = (label, href, variant = 'primary', extra = '') =>
  `<a class="btn btn-${variant}" href="${esc(href)}"${extra}>${label}</a>`;

export const btnIcon = (label, href, variant, ic, extra = '') =>
  `<a class="btn btn-${variant}" href="${esc(href)}"${extra}>${icon(ic)}<span>${label}</span></a>`;

export function sectionHead({ eyebrow, title, lead, center = false, id }) {
  return `<header class="section-head${center ? ' is-center' : ''}">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h2${id ? ` id="${id}"` : ''}>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}</header>`;
}

export const section = (inner, { id, cls = '', labelledby } = {}) =>
  `<section class="section ${cls}"${id ? ` id="${id}"` : ''}${labelledby ? ` aria-labelledby="${labelledby}"` : ''}><div class="container">${inner}</div></section>`;

export const ticks = (items) => `<ul class="ticks">${items.map((i) => `<li>${icon('check')}<span>${esc(i)}</span></li>`).join('')}</ul>`;
export const chips = (items) => `<ul class="chip-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

export const iconTile = (name, label = '') =>
  `<div class="icon-tile" role="img" aria-label="${esc(label || name)}"><span class="icon-tile-inner">${icon(name)}</span></div>`;

export function social(site, cls = 'social') {
  const links = site.social.filter((s) => s.url && /^https:\/\//.test(s.url));
  if (!links.length) return '';
  return `<ul class="${cls}">${links.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label)} (${esc(site.handle)}), opens in a new tab">${icon(s.id)}</a></li>`).join('')}</ul>`;
}

export function breadcrumbs(trail) {
  if (!trail?.length) return '';
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${trail
    .map((t, i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(t.label)}</li>` : `<li><a href="${esc(t.href)}">${esc(t.label)}</a></li>`))
    .join('')}</ol></nav>`;
}

export function pageHero({ eyebrow, title, lead, trail, actions = '', media = '' }) {
  return `<section class="page-hero"><div class="container page-hero-grid${media ? ' has-media' : ''}"><div class="page-hero-copy">${breadcrumbs(trail)}${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${actions ? `<div class="btn-row">${actions}</div>` : ''}</div>${media ? `<div class="page-hero-media">${media}</div>` : ''}</div></section>`;
}

export function ctaBand({ title, text, actions }) {
  return `<section class="section cta-band-wrap"><div class="container"><div class="cta-band"><div><h2>${title}</h2><p>${text}</p></div><div class="btn-row">${actions}</div></div></div></section>`;
}

export function processSteps(steps) {
  return `<ol class="steps">${steps.map((s, i) => `<li class="step reveal"><span class="step-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>`;
}

export function faqList(items) {
  return `<div class="faq-list">${items.map((f) => `<details class="faq"><summary><span>${esc(f.q)}</span>${icon('chevron')}</summary><div class="faq-a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`;
}

export function featureGrid(items, cols = 3) {
  return `<div class="grid cols-${cols}">${items.map((f) => `<article class="card reveal"><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join('')}</div>`;
}

export function productCard(p, catName) {
  const site = ctx.site;
  const priceBlock = p.price
    ? `<span class="price">${esc(p.price)}</span>`
    : `<span class="price price-ask">Price on request</span>`;
  const askMsg = `Hello Cyber_Techx Engineering, please tell me the price and availability of: ${p.name}.`;
  const media = p.image
    ? img({ base: p.image, sizes: [480, 960], w: 540, h: 830, alt: p.imageAlt || p.name, sizesAttr: '(min-width: 900px) 25vw, 90vw', cls: 'product-photo' })
    : iconTile(p.icon, p.name);
  const quote = `/consultation/?type=quote&service=Product+Purchase&product=${enc(p.name)}`;
  const actions = p.price
    ? `${btn('Request Quote', quote, 'outline')}${btnIcon('WhatsApp Us', waLink(site, askMsg), 'ghost', 'whatsapp', ' target="_blank" rel="noopener noreferrer"')}`
    : `${btnIcon('Ask for Price', waLink(site, askMsg), 'primary', 'whatsapp', ' target="_blank" rel="noopener noreferrer"')}${btn('Request Quote', quote, 'outline')}`;
  return `<article class="card product-card reveal" data-search="${esc((p.name + ' ' + p.description + ' ' + catName).toLowerCase())}">
<div class="product-media${p.image ? ' has-photo' : ''}">${media}</div>
<div class="product-body"><p class="eyebrow">${esc(catName)}</p><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${ticks(p.features)}
<p class="product-meta"><span class="badge">${esc(p.availability)}</span>${priceBlock}</p>
<div class="card-actions">${actions}</div></div></article>`;
}

/* ---------- forms ---------- */
export function field({ id, label, type = 'text', required = false, hint = '', attrs = '', autocomplete = '', options = null, rows = 4, full = false, placeholder = '' }) {
  const hintId = hint ? `${id}-hint` : '';
  const errId = `${id}-err`;
  const describedby = [hintId, errId].filter(Boolean).join(' ');
  const common = `id="${id}" name="${id}"${required ? ' required' : ''} aria-describedby="${describedby}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} ${attrs}`;
  let control;
  if (options) control = `<select ${common}><option value="">Select…</option>${options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  else if (type === 'textarea') control = `<textarea ${common} rows="${rows}"></textarea>`;
  else control = `<input type="${type}" ${common}>`;
  return `<div class="field${full ? ' is-full' : ''}"><label for="${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span><span class="visually-hidden">(required)</span>' : ' <span class="opt">(optional)</span>'}</label>${control}${hint ? `<p class="hint" id="${hintId}">${esc(hint)}</p>` : ''}<p class="field-error" id="${errId}" hidden></p></div>`;
}

export function formShell({ formType, intro = '', fields, submitLabel, extraTop = '' }) {
  const site = ctx.site;
  return `<form class="form card" data-form="${formType}" novalidate>
${extraTop}${intro ? `<p class="form-intro">${intro}</p>` : ''}
<div class="form-error-summary" role="alert" tabindex="-1" hidden></div>
<div class="form-grid">${fields}</div>
<div class="hp-field" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="formType" value="${formType}"><input type="hidden" name="loadedAt" value="">
<div class="field is-full consent"><label class="check"><input type="checkbox" id="${formType}-consent" name="consent" required aria-describedby="${formType}-consent-err"><span>${esc(site.forms.consentText.replace('Privacy Policy', 'Privacy Policy'))} <a href="/privacy-policy/">Read the Privacy Policy</a>.</span></label><p class="field-error" id="${formType}-consent-err" hidden></p></div>
<p class="safety-note">${icon('lock')}<span>Please do not share passwords, PINs, one-time codes or card or bank details in this form.</span></p>
<div class="form-actions"><button class="btn btn-primary" type="submit"><span class="btn-label">${submitLabel}</span><span class="spinner" aria-hidden="true"></span></button></div>
<div class="form-status" role="status" aria-live="polite" hidden></div>
<div class="form-fallback" hidden><p>You can also reach us directly:</p><div class="btn-row">${btnIcon('WhatsApp', waLink(site, site.whatsappDefaultMessage), 'outline', 'whatsapp', ' target="_blank" rel="noopener noreferrer"')}${btnIcon('Email', 'mailto:' + site.contact.email, 'outline', 'mail')}</div></div>
<noscript><p class="noscript-note">This form needs JavaScript. Please contact us on <a href="${esc(waLink(site, site.whatsappDefaultMessage))}">WhatsApp</a> or by <a href="mailto:${esc(site.contact.email)}">email</a>.</p></noscript>
</form>`;
}

/* ---------- layout ---------- */
function head({ title, description, path, ogImage, ogAlt, noindex, schema = [] }) {
  const site = ctx.site;
  const full = title === site.name ? `${site.name} | Security, Networking & Smart Tech in Awka` : `${title} | ${site.name}`;
  const canonical = ctx.siteUrl ? `<link rel="canonical" href="${esc(ctx.siteUrl + path)}">` : '';
  const ogUrl = ctx.siteUrl ? `<meta property="og:url" content="${esc(ctx.siteUrl + path)}">` : '';
  const image = abs(ogImage || site.seo.defaultImage);
  const ld = schema.map((s) => `<script type="application/ld+json">${safeJson(s)}</script>`).join('\n');
  return `<!doctype html>
<html lang="en-NG" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0A0A0A">
<meta name="color-scheme" content="dark">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${canonical}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.name)}"><meta property="og:locale" content="en_NG">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(description)}">${ogUrl}
<meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(ogAlt || site.seo.defaultImageAlt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}">${site.seo.twitterHandle ? `<meta name="twitter:site" content="${esc(site.seo.twitterHandle)}">` : ''}
<link rel="icon" href="/assets/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png"><link rel="manifest" href="/assets/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@500;700;800&display=swap">
<link rel="stylesheet" href="${asset('/assets/css/main.css')}">
<link rel="stylesheet" href="${asset('/assets/css/fx.css')}">
<script src="${asset('/assets/js/boot.js')}"></script>
${ld}
</head>`;
}

function header(path) {
  const { site } = ctx;
  const cur = (href) => (href === path ? ' aria-current="page"' : '');
  const solutionsActive = site.nav.solutions.some((s) => s.href === path);
  return `<header class="site-header" id="top">
<div class="container header-inner">
<a class="brand" href="/" aria-label="${esc(site.name)} home"><img src="/assets/img/icon-192.png" width="40" height="40" alt=""><span class="brand-text"><strong>CYBER_TECHX</strong><small>ENGINEERING</small></span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav"><span class="visually-hidden">Menu</span>${icon('menu')}${icon('close')}</button>
<nav class="nav" id="primary-nav" aria-label="Primary">
<ul class="nav-list">
<li class="has-menu"><button class="nav-link menu-toggle${solutionsActive ? ' is-active' : ''}" type="button" aria-expanded="false" aria-controls="menu-solutions">Solutions ${icon('chevron')}</button>
<ul class="submenu" id="menu-solutions">${site.nav.solutions.map((s) => `<li><a href="${s.href}"${cur(s.href)}>${esc(s.label)}</a></li>`).join('')}</ul></li>
${site.nav.primary.map((n) => `<li><a class="nav-link${n.href === path ? ' is-active' : ''}" href="${n.href}"${cur(n.href)}>${esc(n.label)}</a></li>`).join('')}
</ul>
<a class="btn btn-primary nav-cta" href="${site.nav.cta.href}">${esc(site.nav.cta.label)}</a>
</nav>
</div></header>`;
}

function footer() {
  const { site } = ctx;
  const c = site.contact;
  return `<footer class="site-footer"><div class="container footer-grid">
<div class="footer-brand"><a href="/" aria-label="${esc(site.name)} home"><img src="/assets/img/logo-${'320'}.png" width="160" height="104" alt="${esc(site.name)} logo" loading="lazy"></a><p class="footer-tag">${esc(site.tagline)}</p><p class="footer-handle">${esc(site.handle)}</p>${social(site)}</div>
<nav aria-label="Footer"><h2 class="footer-h">Explore</h2><ul>${site.footer.navigation.map((n) => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></nav>
<nav aria-label="Legal"><h2 class="footer-h">Legal</h2><ul>${site.footer.legal.map((n) => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></nav>
<div><h2 class="footer-h">Contact</h2><ul class="contact-list">
<li>${icon('phone')}<a href="tel:${esc(c.phoneTel)}">${esc(c.phoneDisplay)}</a></li>
<li>${icon('whatsapp')}<a href="${esc(waLink(site))}" target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
<li>${icon('mail')}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
<li>${icon('pin')}<span>${esc(c.addressLine)}</span></li></ul></div>
</div>
<div class="container footer-bottom"><p>© <span data-year>${ctx.year}</span> ${esc(site.name)}. All rights reserved.</p><p>${esc(site.tagline)}</p></div></footer>`;
}

function floating() {
  const { site } = ctx;
  const a = site.assistant;
  return `<div class="floating">
<a class="fab fab-wa" href="${esc(waLink(site))}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp, opens in a new tab">${icon('whatsapp')}</a>
${a.enabled ? `<button class="fab fab-chat" type="button" data-assistant-open aria-haspopup="dialog" aria-controls="assistant">${icon('chat')}<span>${esc(a.launcherLabel)}</span></button>` : ''}
</div>`;
}

export function layout({ path, title, description, body, schema = [], ogImage, ogAlt, noindex = false }) {
  return `${head({ title, description, path, ogImage, ogAlt, noindex, schema })}
<body>
<a class="skip-link" href="#main">Skip to main content</a>
${header(path)}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
${floating()}
<script type="application/json" id="site-config">${safeJson(ctx.publicConfig)}</script>
<script src="${asset('/assets/js/main.js')}" defer></script>
<script src="${asset('/assets/js/fx.js')}" defer></script>
</body>
</html>
`;
}
