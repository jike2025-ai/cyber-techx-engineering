import { esc, site, siteUrl, asset, waLink, telLink, liveSocials, consultLink } from './util.mjs';
import { icon } from './icons.mjs';

export const assetsRef = { css: '', js: '', assistant: '' };

function navHtml() {
  return site.nav.primary.map((n, i) => {
    if (!n.children) return `<li><a href="${n.href}" data-nav>${esc(n.label)}</a></li>`;
    return `<li class="has-sub"><button class="sub-toggle" type="button" aria-expanded="false" aria-controls="sub-${i}">${esc(n.label)} ${icon('chev', 'ic ic-sm')}</button>
      <ul class="sub" id="sub-${i}">${n.children.map((c) => `<li><a href="${c.href}" data-nav>${esc(c.label)}</a></li>`).join('')}</ul></li>`;
  }).join('');
}

function promoBar() {
  const p = (site.promotions || []).find((x) => x.active);
  if (!p) return '';
  return `<div class="promo" role="region" aria-label="Current offer"><p><strong>${esc(p.label)}:</strong> ${esc(p.text)}${p.code ? ` Code: <code>${esc(p.code)}</code>.` : ''}${p.stackable ? '' : ' Cannot be combined with other offers.'} ${p.link ? `<a href="${esc(p.link)}">Learn more</a>` : ''}</p></div>`;
}

function footer() {
  const socials = liveSocials();
  const c = site.contact;
  return `<footer class="footer">
  <div class="wrap footer-grid">
    <div class="f-brand">
      <a href="/" class="f-logo" aria-label="${esc(site.name)} home"><img src="${asset('/assets/img/logo.webp')}" width="140" height="91" alt="${esc(site.name)} logo" loading="lazy"></a>
      <p class="tagline">${esc(site.tagline)}</p>
      <p class="muted">Technology products, installation, support and training under one trusted brand.</p>
      ${socials.length ? `<ul class="social" aria-label="Social media">${socials.map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer" target="_blank" aria-label="${esc(s.label)}: ${esc(site.handle)}">${icon(s.id)}</a></li>`).join('')}</ul>` : ''}
      <p class="handle">${esc(site.handle)}</p>
    </div>
    <nav aria-label="Company"><h2 class="f-h">Company</h2><ul>${site.nav.footerCompany.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul></nav>
    <nav aria-label="Legal"><h2 class="f-h">Legal</h2><ul>${site.nav.footerLegal.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul></nav>
    <div><h2 class="f-h">Contact</h2><ul class="f-contact">
      <li>${icon('phone', 'ic ic-sm')}<a href="${telLink()}">${esc(c.phoneDisplay)}</a></li>
      <li>${icon('whatsapp', 'ic ic-sm')}<a href="${waLink()}" target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
      <li>${icon('mail', 'ic ic-sm')}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
      <li>${icon('pin', 'ic ic-sm')}<span>${esc(c.addressLine)}</span></li></ul></div>
  </div>
  <div class="wrap footer-bottom"><p>&copy; <span data-year>${new Date().getFullYear()}</span> ${esc(site.name)}. All rights reserved.</p><p class="muted">${esc(site.tagline)}</p></div>
</footer>`;
}

function floating() {
  return `<a class="fab fab-wa" href="${waLink()}" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">${icon('whatsapp')}<span class="fab-text">WhatsApp</span></a>
${site.features.showAssistant ? `<div id="assistant-root" data-config="${esc(JSON.stringify({
    aiEnabled: site.assistant.aiEnabled, title: site.assistant.title, greeting: site.assistant.greeting, notAiNote: site.assistant.notAiNote,
    privacyNote: site.assistant.privacyNote, options: site.assistant.options, propertyTypes: site.propertyTypes, budgetRanges: site.budgetRanges,
    timelines: site.timelines, contactMethods: site.contactMethods, wa: waLink(), phone: site.contact.phoneDisplay, tel: telLink(), email: site.contact.email,
    waNumber: site.contact.phoneDisplay }))}"></div>` : ''}`;
}

export function shell({ path, title, desc, body, schema = [], noindex = false, ogImage = '/assets/img/og.png', bodyClass = '', crumbs = [] }) {
  const base = siteUrl();
  const url = base + path;
  const fullTitle = path === '/' ? title : `${title} | ${site.shortName}`;
  const og = ogImage.startsWith('http') ? ogImage : base + asset(ogImage);
  const ld = [...schema];
  if (crumbs.length) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: base + c.path })) });
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta name="theme-color" content="#0A0A0A">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_NG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" type="image/png" sizes="32x32" href="${asset('/assets/img/icon-32.png')}">
<link rel="apple-touch-icon" href="${asset('/assets/img/apple-touch-icon.png')}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@500;700;800&display=swap">
<link rel="stylesheet" href="${assetsRef.css}">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to main content</a>
${promoBar()}
<header class="header" data-header>
  <div class="wrap header-in">
    <a class="logo" href="/" aria-label="${esc(site.name)} home"><img src="${asset('/assets/img/logo.webp')}" width="72" height="47" alt="${esc(site.name)}"></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="primary-nav" data-menu><span class="sr">Menu</span>${icon('menu', 'ic ic-open')}${icon('close', 'ic ic-close')}</button>
    <nav class="nav" id="primary-nav" aria-label="Primary"><ul>${navHtml()}</ul>
      <a class="btn btn-primary btn-sm nav-cta" href="${consultLink()}">Book a Consultation</a></nav>
  </div>
</header>
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
${floating()}
<script src="${assetsRef.js}" defer></script>
${site.features.showAssistant ? `<script src="${assetsRef.assistant}" defer></script>` : ''}
</body>
</html>`;
}

export const localBusinessSchema = () => {
  const c = site.contact, base = siteUrl();
  return { '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ProfessionalService'], '@id': `${base}/#business`, name: site.name, url: base, telephone: c.phoneIntl, email: c.email,
    description: site.description, image: base + asset('/assets/img/og.png'), logo: base + asset('/assets/img/logo.png'), slogan: site.tagline,
    address: { '@type': 'PostalAddress', streetAddress: 'Ifite', addressLocality: c.locality, addressRegion: c.region, addressCountry: c.country },
    areaServed: [{ '@type': 'City', name: 'Awka' }, { '@type': 'AdministrativeArea', name: 'Anambra State' }],
    sameAs: liveSocials().map((s) => s.url) };
};
