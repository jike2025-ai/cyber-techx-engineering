#!/usr/bin/env node
// Post-build QA: internal links/anchors/assets exist, one <h1>, unique titles, meta description, img alt.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/util.mjs';
const DIST = join(ROOT, 'dist');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const htmls = walk(DIST).filter((f) => f.endsWith('.html'));
const errs = []; const titles = new Map();
const ids = {};
for (const f of htmls) ids[f] = new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const resolve = (p) => { const x = join(DIST, p); if (existsSync(x) && statSync(x).isFile()) return x; const i = join(x, 'index.html'); return existsSync(i) ? i : null; };
for (const f of htmls) {
  const h = readFileSync(f, 'utf8'); const rel = f.replace(DIST, '');
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1]; if (!t) errs.push(`${rel}: no title`); else { if (titles.has(t)) errs.push(`${rel}: duplicate title with ${titles.get(t)}`); titles.set(t, rel); }
  if (!/<meta name="description" content="[^"]{40,}/.test(h)) errs.push(`${rel}: description missing/short`);
  const h1 = (h.match(/<h1[\s>]/g) || []).length; if (h1 !== 1) errs.push(`${rel}: ${h1} h1`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) errs.push(`${rel}: img without alt`);
  if (/\sstyle="/.test(h)) errs.push(`${rel}: inline style attribute (blocked by CSP)`);
  if (/<script(?![^>]*(src=|type="application\/(ld\+)?json"))[^>]*>/.test(h)) errs.push(`${rel}: inline script (blocked by CSP)`);
  for (const m of h.matchAll(/(?:href|src)="([^"#?]*)(?:\?[^"#]*)?(#[^"]*)?"/g)) {
    const [, p, hash] = m; if (!p || /^(https?:|mailto:|tel:|data:)/.test(p)) continue;
    const target = p.startsWith('/') ? resolve(p) : null;
    if (!target) { errs.push(`${rel}: broken link ${p}`); continue; }
    if (hash && hash.length > 1 && target.endsWith('.html') && !ids[target]?.has(hash.slice(1))) errs.push(`${rel}: missing anchor ${p}${hash}`);
  }
  for (const m of h.matchAll(/(?:srcset)="([^"]+)"/g)) for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith('/') && !resolve(u)) errs.push(`${rel}: missing srcset file ${u}`); }
}
console.log(`${htmls.length} pages checked.`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); } else console.log('All checks passed.');
