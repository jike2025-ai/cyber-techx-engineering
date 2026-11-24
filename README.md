# Cyber_Techx Engineering website

Static site (zero dependencies, Node 22) + one Vercel serverless function (`/api/contact`).

## Edit content
- `content/site.json` — phone, WhatsApp, email, socials (empty URL = hidden), assistant text, form options.
- `content/*.json` — services, products, projects, FAQs, blog, policies, testimonials.
- Replace placeholders only with real facts (prices, testimonials, projects, opening hours).

## Run locally
```
node scripts/build.mjs      # writes dist/
node scripts/check.mjs      # QA: links, anchors, titles, alts
MOCK_EMAIL=1 node scripts/serve.mjs   # http://localhost:4173 with a mock form endpoint
```

## Deploy (Vercel)
Import the repo; Vercel uses `vercel.json` (build `node scripts/build.mjs`, output `dist`).
Environment variables (see `.env.example`):
- `RESEND_API_KEY` — required for forms to email `cybertechxengineering@gmail.com` (resend.com)
- `MAIL_FROM` — verified sender (needs your own domain); default is Resend's test sender
- `MAIL_TO` — optional override
- `SITE_URL` — your domain once you have one (enables sitemap/canonical/robots)

Without `RESEND_API_KEY` the forms show a polite "use WhatsApp or email" message.
