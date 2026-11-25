#!/usr/bin/env node
// Zero-dependency static site generator for Cyber_Techx Engineering.
// Reads /content/*.json + /assets, writes a deployable site to /dist.
import { mkdirSync, rmSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, readJson, esc } from './lib/util.mjs';
import { ctx } from './lib/components.mjs';
import { buildPages } from './lib/pages.mjs';

const DIST = join(ROOT, 'dist');
const site = readJson('content/site.json');
const data = {
  site,
  services: readJson('content/services.json'),
  products: readJson('content/products.json'),
  projects: readJson('content/projects.json'),
  faqs: readJson('content/faqs.json'),
  misc: readJson('content/misc.json'),
  policies: readJson('content/policies.json'),
};

// ---- site URL: SITE_URL > Vercel production domain > '' (relative; no canonical/sitemap)
let siteUrl = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
if (!siteUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) siteUrl = 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
if (!siteUrl && process.env.LOCAL_URL) siteUrl = process.env.LOCAL_URL;
ctx.siteUrl = siteUrl;
ctx.site = site;

// ---- cache-busting hashes for CSS/JS
const hashFile = (p) => createHash('sha1').update(readFileSync(join(ROOT, p))).digest('hex').slice(0, 8);
for (const p of ['assets/css/main.css', 'assets/css/fx.css', 'assets/js/main.js', 'assets/js/fx.js', 'assets/js/boot.js', 'assets/js/assistant.js']) {
  if (existsSync(join(ROOT, p))) ctx.assetV['/' + p] = hashFile(p);
}

// ---- config exposed to the browser (nothing secret lives here)
const activePromos = (data.misc.promotions.items || []).filter((p) => p.active && (!p.expires || new Date(p.expires) >= new Date()));
ctx.publicConfig = {
  siteName: site.name, handle: site.handle,
  contact: { phone: site.contact.phoneTel, phoneDisplay: site.contact.phoneDisplay, whatsapp: site.contact.whatsappNumber, email: site.contact.email },
  whatsappDefaultMessage: site.whatsappDefaultMessage,
  forms: { endpoint: site.forms.endpoint, minFillSeconds: site.forms.minFillSeconds, successMessage: site.forms.successMessage, contactSuccessMessage: site.forms.contactSuccessMessage, errorMessage: site.forms.errorMessage, options: { methods: site.forms.methods, propertyTypes: site.forms.propertyTypes, timelines: site.forms.timelines, times: site.forms.times, contactMethods: site.forms.contactMethods } },
  assistant: site.assistant,
  assistantScript: ctx.assetV['/assets/js/assistant.js'] ? `/assets/js/assistant.js?v=${ctx.assetV['/assets/js/assistant.js']}` : '/assets/js/assistant.js',
  promotions: { allowStacking: !!data.misc.promotions.allowStacking, items: activePromos.map(({ code, label, type, value, minSubtotal, appliesTo }) => ({ code, label, type, value, minSubtotal: minSubtotal || 0, appliesTo })) },
};

// ---- fresh dist
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

// ---- pages
const pages = buildPages(data);
for (const p of pages) {
  const rel = p.file || (p.path === '/' ? 'index.html' : join(p.path.replace(/^\//, ''), 'index.html'));
  const out = join(DIST, rel);
  mkdirSync(join(out, '..'), { recursive: true });
  writeFileSync(out, p.html);
}

// ---- sitemap / robots / manifest
const today = new Date().toISOString().slice(0, 10);
if (siteUrl) {
  const urls = pages.filter((p) => !p.skipSitemap && !p.noindex);
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((p) => `  <url><loc>${esc(siteUrl + p.path)}</loc><lastmod>${today}</lastmod><priority>${p.priority ?? (p.path.split('/').filter(Boolean).length > 1 ? 0.5 : 0.8)}</priority></url>`).join('\n')}\n</urlset>\n`);
}
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
writeFileSync(join(DIST, 'assets', 'site.webmanifest'), JSON.stringify({
  name: site.name, short_name: site.shortName, description: site.description, start_url: '/', display: 'browser',
  background_color: '#0A0A0A', theme_color: '#0A0A0A',
  icons: [{ src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));

console.log(`Built ${pages.length} pages → dist/  (siteUrl: ${siteUrl || 'not set'})`);
