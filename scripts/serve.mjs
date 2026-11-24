#!/usr/bin/env node
// Tiny local static server for /dist (with the real /api/contact handler in mock-email mode).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { ROOT } from './lib/util.mjs';

const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4173);
process.env.MOCK_EMAIL = process.env.MOCK_EMAIL ?? '1';
const { default: contact } = await import('../api/contact.js');
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/contact')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    req.body = Buffer.concat(chunks).toString();
    try { req.body = JSON.parse(req.body); } catch { /* handler validates */ }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return contact(req, res);
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, p);
  try { const s = await stat(file); if (s.isDirectory()) { if (!p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); return res.end(); } file = join(file, 'index.html'); } } catch { /* 404 below */ }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': T[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(DIST, '404.html')));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
