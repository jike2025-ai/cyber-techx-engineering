import { esc, waLink, enc, slugify } from './util.mjs';
import { icon } from './icons.mjs';
import {
  ctx, abs, img, btn, btnIcon, sectionHead, section, ticks, chips, iconTile, social, breadcrumbs, pageHero,
  ctaBand, processSteps, faqList, featureGrid, productCard, field, formShell, layout,
} from './components.mjs';

const wa = (text) => waLink(ctx.site, text);
const WA_ATTR = ' target="_blank" rel="noopener noreferrer"';
const consultUrl = (service, type) => `/consultation/?${type ? `type=${type}&` : ''}service=${enc(service)}`;

/* ---------- structured data ---------- */
const business = () => {
  const { site } = ctx; const c = site.contact;
  const same = site.social.filter((s) => s.url).map((s) => s.url);
  return {
    '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ProfessionalService'], name: site.name,
    ...(ctx.siteUrl ? { url: ctx.siteUrl, '@id': ctx.siteUrl + '/#business' } : {}),
    description: site.description, slogan: site.tagline, telephone: c.phoneTel, email: c.email,
    image: abs('/assets/img/logo.png'), logo: abs('/assets/img/logo.png'),
    address: { '@type': 'PostalAddress', streetAddress: 'Ifite', addressLocality: 'Awka', addressRegion: c.region, addressCountry: c.countryCode },
    ...(same.length ? { sameAs: same } : {}),
  };
};
const crumbsLd = (trail) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.label, ...(ctx.siteUrl ? { item: ctx.siteUrl + t.href } : {}) })),
});
const trailFor = (label, href) => [{ label: 'Home', href: '/' }, { label, href }];

/* ---------- shared sections ---------- */
function testimonialsBlock(site, data, { heading = true } = {}) {
  const items = data.testimonials || [];
  const head = heading ? sectionHead({ eyebrow: 'Testimonials', title: 'What customers say', center: true, id: 'testimonials-h' }) : '';
  if (!items.length) {
    return `${head}<div class="empty-state card"><span class="empty-icon">${icon('users')}</span><h3>Customer testimonials are coming soon</h3><p>We only publish feedback from real customers who have given permission. When we have it, it will appear here.</p>${btn('Talk to Cyber_Techx', '/contact/', 'outline')}</div>`;
  }
  return `${head}<div class="testimonials" data-carousel>${items.map((t, i) => `<figure class="card testimonial${i === 0 ? ' is-active' : ''}" ${i ? 'hidden' : ''}><blockquote><p>${esc(t.quote)}</p></blockquote><figcaption><strong>${esc(t.name)}</strong>${t.role ? `<span>${esc(t.role)}</span>` : ''}</figcaption></figure>`).join('')}${items.length > 1 ? `<div class="carousel-controls"><button type="button" data-prev aria-label="Previous testimonial">${icon('arrow')}</button><button type="button" data-next aria-label="Next testimonial">${icon('arrow')}</button></div>` : ''}</div>`;
}

function faqPreview(faqs) {
  const items = faqs.faqs.filter((f) => f.preview);
  return section(`${sectionHead({ eyebrow: 'FAQ', title: 'Quick answers', lead: 'The questions we hear most. More on the FAQ page.', id: 'faq-prev-h' })}${faqList(items)}<p class="center-link">${btn('See all FAQs', '/faq/', 'outline')}</p>`, { labelledby: 'faq-prev-h' });
}

function postCard(p) {
  return `<article class="card post-card reveal" data-category="${esc(p.category)}"><p class="eyebrow">${esc(p.category)}</p><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p>${p.status === 'coming-soon' ? '<p><span class="badge">Coming soon</span></p>' : `<p><a class="text-link" href="/blog/${p.slug}/">Read article ${icon('arrow')}</a></p>`}</article>`;
}

function projectCard(p, site) {
  if (p.placeholder) {
    return `<article class="card project-card is-placeholder reveal" data-category="${esc(p.category)}"><div class="project-media">${iconTile('box', p.title)}</div><div class="project-body"><p class="eyebrow">${esc(p.category)}</p><h3>${esc(p.title)}</h3><p><span class="badge">Coming soon</span></p><p>Photos and details for this category will be added soon.</p></div></article>`;
  }
  const im = p.images[0];
  const media = img({ base: im.base, sizes: im.sizes, w: im.w, h: im.h, alt: im.alt, sizesAttr: '(min-width: 900px) 33vw, 100vw' });
  const rows = [['Challenge', p.challenge], ['Solution', p.solution], ['Outcome', p.outcome]].filter(([, v]) => v);
  const dl = rows.length ? `<dl class="project-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
  return `<article class="card project-card reveal" data-category="${esc(p.category)}"><div class="project-media">${media}</div><div class="project-body"><p class="eyebrow">${esc(p.category)}</p><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${p.location ? `<p class="muted">Location: ${esc(p.location)}</p>` : ''}${dl}</div></article>`;
}

const pill = (t) => `<span class="badge">${esc(t)}</span>`;

/* ---------- pages ---------- */
export function buildPages(data) {
  const { site, services, products, projects, faqs, misc, policies, founder } = data;
  const fImg = (cls = '') => `<div class="portrait ${cls}"><img src="${founder.photo.src480}" srcset="${founder.photo.src480} 480w, ${founder.photo.src800} 800w" sizes="(min-width: 900px) 380px, 80vw" width="480" height="600" alt="${esc(founder.photo.alt)}" loading="lazy"></div>`;
  const founderTeaser = () => `<section class="section" aria-labelledby="fnd-h"><div class="container"><div class="founder-teaser card reveal">${fImg('sm')}<div><p class="eyebrow">Meet the founder</p><h2 id="fnd-h">${esc(founder.name)}, aka “${esc(founder.alias)}”</h2><p class="lead">${esc(founder.intro)}</p><div class="btn-row">${btn('Read the full story', '/founder/', 'primary')}${btn('Book a Consultation', '/consultation/', 'outline')}</div></div></div></div></section>`;
  const svc = (id) => services.services.find((s) => s.id === id);
  const pages = [];
  const add = (p) => pages.push(p);
  const allProducts = products.categories.flatMap((c) => c.items.map((i) => ({ ...i, icon: c.icon, _cat: c.name })));
  const pcard = (p) => productCard(p, p._cat);

  /* HOME */
  {
    const featured = ['solar-ptz', 'ai-cameras', 'mesh', 'wifi6-routers', 'smart-locks', 'gaming-pcs'].map((id) => allProducts.find((p) => p.id === id)).filter(Boolean);
    const solutionRows = ['cctv', 'network', 'smart', 'gaming', 'training'].map((id, i) => {
      const s = svc(id);
      const media = s.image
        ? img({ base: s.image, sizes: s.image.includes('cctv') ? [640, 1200] : [480, 960], w: s.image.includes('cctv') ? 1000 : 750, h: s.image.includes('cctv') ? 750 : 1000, alt: s.imageAlt, sizesAttr: '(min-width: 900px) 40vw, 90vw' })
        : iconTile(s.icon, s.name);
      return `<article class="feature-row reveal${i % 2 ? ' is-flip' : ''}"><div class="feature-media${s.image ? ' has-photo' : ''}">${media}</div><div class="feature-copy"><p class="eyebrow">${esc(s.name)}</p><h3>${esc(s.summary)}</h3><p>${esc(s.description)}</p>${ticks(s.benefits.slice(0, 3))}<div class="btn-row">${btn(esc(s.cta), '/' + s.page + '/', 'primary')}${btn('Request a Quote', consultUrl(s.formService, 'quote'), 'outline')}</div></div></article>`;
    }).join('');
    const body = `
<section class="hero"><div class="container hero-grid">
<div class="hero-copy">
<p class="eyebrow">Awka, Anambra · Nigeria</p>
<h1><span class="h1-line">Smarter Technology.</span> <span class="h1-line">Safer Spaces.</span> <span class="h1-line grad">Better Connections.</span></h1>
<p class="lead">Cyber_Techx Engineering delivers professional security, networking, smart automation, gaming, IT, and AI solutions designed for homes and businesses.</p>
<div class="btn-row">${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Explore Our Services', '/services/', 'outline')}</div>
<div class="btn-row btn-row-sub">${btn('View Products', '/products/', 'link')}${btnIcon('Chat on WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}</div>
<p class="trust-line" aria-label="${esc(site.tagline)}"><span>Reliable</span><i aria-hidden="true">|</i><span>Innovative</span><i aria-hidden="true">|</i><span>Secure</span></p>
</div>
<div class="hero-visual" aria-hidden="false">
<figure class="hero-photo hero-photo-main">${img({ base: 'project-wireless-link', w: 750, h: 1000, alt: 'Outdoor dish antenna on a mast beside a water-tank stand, with palm trees behind', sizesAttr: '(min-width: 900px) 30vw, 70vw', lazy: false })}</figure>
<figure class="hero-photo hero-photo-alt">${img({ base: 'project-cctv-wall', sizes: [640, 1200], w: 1000, h: 750, alt: 'Wall-mounted monitor showing a multi-camera CCTV live view', sizesAttr: '(min-width: 900px) 24vw, 55vw', lazy: false })}</figure>
<ul class="hero-badges" aria-label="What we cover"><li>${icon('camera')}CCTV</li><li>${icon('wifi')}Wi-Fi</li><li>${icon('chip')}Smart</li><li>${icon('gamepad')}Gaming</li><li>${icon('book')}Training</li></ul>
</div></div></section>

${section(`<div class="values-grid">
<article class="value reveal">${icon('shield')}<h3>Reliable</h3><p>Technology and support customers can depend on.</p></article>
<article class="value reveal">${icon('bolt')}<h3>Innovative</h3><p>Modern solutions designed for today's connected environments.</p></article>
<article class="value reveal">${icon('lock')}<h3>Secure</h3><p>Security and responsible technology are integrated into our approach.</p></article></div>`, { cls: 'section-tight' })}

${section(`<div class="intro-grid"><div>${sectionHead({ eyebrow: 'Who we are', title: 'We do more than sell technology.', id: 'intro-h' })}<p class="lead">We help customers select, install, configure, understand, maintain, and improve technology that makes their environments safer, smarter, faster, and more connected.</p></div>
<blockquote class="value-prop reveal"><p>Cyber_Techx Engineering brings products, installation, consultation, technical support, and technology education together under one trusted brand.</p><p>We help customers move from simply buying technology to actually understanding, implementing, and benefiting from it.</p></blockquote></div>`, { labelledby: 'intro-h' })}

${section(`${sectionHead({ eyebrow: 'Sound familiar?', title: 'Problems we help solve', center: true, id: 'problems-h' })}<ul class="problem-grid">${services.problems.map((p) => `<li class="reveal">${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul><p class="center-text">Cyber_Techx helps customers find suitable solutions through consultation, supply, installation, configuration, and support.</p>`, { cls: 'section-alt', labelledby: 'problems-h' })}

${section(`${sectionHead({ eyebrow: 'Services', title: 'Everything technology, in one place', lead: 'Security, networking, automation, gaming, support and training from one trusted team.', id: 'services-h' })}<div class="grid cols-3">${services.services.map((s) => `<article class="card service-card reveal"><span class="card-icon">${icon(s.icon)}</span><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p><p><a class="text-link" href="${s.page ? '/' + s.page + '/' : '/services/#' + s.id}">Learn more ${icon('arrow')}</a></p></article>`).join('')}</div>`, { labelledby: 'services-h' })}

${section(`${sectionHead({ eyebrow: 'Products', title: 'Featured products', lead: 'A small selection. Prices and availability are confirmed when you ask.', id: 'featured-h' })}<div class="grid cols-3">${featured.map(pcard).join('')}</div><p class="center-link">${btn('Explore the full catalogue', '/products/', 'outline')}</p>`, { cls: 'section-alt', labelledby: 'featured-h' })}

${section(`${sectionHead({ eyebrow: 'Solutions', title: 'Security, smart living, networking, gaming and training', id: 'solutions-h' })}<div class="feature-rows">${solutionRows}</div>`, { labelledby: 'solutions-h' })}

${section(`${sectionHead({ eyebrow: 'Why choose us', title: 'Why choose Cyber_Techx', center: true, id: 'why-h' })}<div class="grid cols-3">${[
      ['One team, start to finish', 'Advice, supply, installation, configuration and support from the same people.'],
      ['Plain language', 'We explain technology so you can make good decisions, without needless jargon.'],
      ['Clear quotes', 'Separate, itemised costs. No hidden fees.'],
      ['Security-minded', 'Sensible passwords, tidy access control and responsible use of surveillance equipment.'],
      ['Built to grow', 'Start small and expand cameras, access points or devices later.'],
      ['Support afterwards', 'Maintenance, upgrades and help when something stops working.'],
    ].map(([t, x]) => `<article class="card reveal"><h3>${t}</h3><p>${x}</p></article>`).join('')}</div>`, { cls: 'section-alt', labelledby: 'why-h' })}

${section(`${sectionHead({ eyebrow: 'How we work', title: 'From first message to handover', lead: 'A clear process, so you always know what happens next.', id: 'how-h' })}${processSteps(services.process)}`, { labelledby: 'how-h' })}

${section(`${sectionHead({ eyebrow: 'Projects', title: 'From our installations', lead: 'Photos of installation work. More projects will be added as they are documented.', id: 'proj-h' })}<div class="grid cols-3">${projects.projects.filter((p) => !p.placeholder).slice(0, 3).map((p) => projectCard(p, site)).join('')}</div><p class="center-link">${btn('See all projects', '/projects/', 'outline')}</p>`, { cls: 'section-alt', labelledby: 'proj-h' })}

${section(testimonialsBlock(site, misc), { labelledby: 'testimonials-h' })}

${founderTeaser()}
${ctaBand({ title: 'Ready to upgrade your technology?', text: 'Tell us what you need. We will review your request and get back to you.', actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Request a Quote', '/consultation/?type=quote', 'outline')}` })}

${faqPreview(faqs)}

${section(`${sectionHead({ eyebrow: 'Resources', title: 'Latest resources', lead: 'Practical guides are on the way.', id: 'res-h' })}<div class="grid cols-3">${misc.posts.slice(0, 3).map(postCard).join('')}</div><p class="center-link">${btn('Visit the resource centre', '/blog/', 'outline')}</p>`, { cls: 'section-alt', labelledby: 'res-h' })}

${section(`<div class="contact-cta"><div>${sectionHead({ eyebrow: 'Contact', title: 'Talk to Cyber_Techx', id: 'cc-h' })}<p class="lead">${esc(site.contact.addressLine)} · ${esc(site.contact.phoneDisplay)}</p></div><div class="btn-row">${btnIcon('Call ' + esc(site.contact.phoneDisplay), 'tel:' + site.contact.phoneTel, 'primary', 'phone')}${btnIcon('WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}${btn('Contact page', '/contact/', 'outline')}</div></div>`, { labelledby: 'cc-h' })}`;
    add({
      path: '/', title: site.name, description: 'Professional CCTV, networking and Wi-Fi, smart automation, gaming technology, tech support and IT/AI training for homes and businesses in Awka, Anambra, Nigeria.',
      body, schema: [business()], ogImage: site.seo.defaultImage, priority: 1,
    });
  }

  /* SERVICES INDEX */
  {
    const rows = services.services.map((s, i) => {
      const media = s.image
        ? img({ base: s.image, sizes: s.image.includes('cctv') ? [640, 1200] : [480, 960], w: s.image.includes('cctv') ? 1000 : 750, h: s.image.includes('cctv') ? 750 : 1000, alt: s.imageAlt, sizesAttr: '(min-width: 900px) 40vw, 90vw' })
        : iconTile(s.icon, s.name);
      return `<article class="service-row reveal${i % 2 ? ' is-flip' : ''}" id="${s.id}"><div class="feature-media${s.image ? ' has-photo' : ''}">${media}</div><div class="feature-copy"><p class="eyebrow">${esc(s.name)}</p><h2>${esc(s.summary)}</h2><p>${esc(s.description)}</p>
<div class="two-col"><div><h3>What we offer</h3>${ticks(s.offerings)}</div><div><h3>Benefits</h3>${ticks(s.benefits)}<h3>Typical use cases</h3>${chips(s.useCases)}</div></div>
<div class="btn-row">${btn('Book a Consultation', consultUrl(s.formService), 'primary')}${btn('Request a Quote', consultUrl(s.formService, 'quote'), 'outline')}${s.page ? btn('Learn more', '/' + s.page + '/', 'link') : ''}</div></div></article>`;
    }).join('');
    add({
      path: '/services/', title: 'Services', description: 'CCTV and security, networking and Wi-Fi, smart automation, gaming, tech support, internet café access and IT/AI training from Cyber_Techx Engineering in Awka.',
      body: `${pageHero({ eyebrow: 'Services', title: 'Technology services for homes and businesses', lead: 'Consultation, supply, installation, configuration, support and training, all in one place.', trail: trailFor('Services', '/services/') })}<div class="container service-rows">${rows}</div>${ctaBand({ title: 'Not sure which service you need?', text: 'Describe the problem and we will point you in the right direction.', actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btnIcon('Ask on WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}` })}`,
      schema: [crumbsLd(trailFor('Services', '/services/'))],
    });
  }

  /* PRODUCTS */
  {
    const nav = products.categories.map((c) => `<li><a href="#cat-${c.id}">${icon(c.icon)}${esc(c.name)}</a></li>`).join('');
    const cats = products.categories.map((c) => `<section class="product-cat" id="cat-${c.id}" aria-labelledby="cat-${c.id}-h"><header class="section-head"><h2 id="cat-${c.id}-h">${esc(c.name)}</h2><p class="lead">${esc(c.intro)}</p></header><div class="grid cols-3">${c.items.map((i) => productCard({ ...i, icon: c.icon }, c.name)).join('')}</div></section>`).join('');
    add({
      path: '/products/', title: 'Products & Catalogue', description: 'Browse CCTV cameras, DVRs and NVRs, Wi-Fi and 4G LTE routers, mesh systems, smart devices, gaming gear and computer accessories. Ask for a price or request a quote.',
      body: `${pageHero({ eyebrow: 'Catalogue', title: 'Products & Catalogue', lead: 'Browse by category. We do not list prices here unless confirmed. Ask for a price or request a quote and we will confirm availability.', trail: trailFor('Products', '/products/') })}
<div class="container catalogue"><div class="catalogue-tools"><nav aria-label="Product categories"><ul class="chip-nav">${nav}</ul></nav>
<div class="searchbox"><label class="visually-hidden" for="product-search">Search products</label>${icon('search')}<input id="product-search" type="search" placeholder="Search products" autocomplete="off" data-product-search></div></div>
<p class="muted result-count" data-result-count aria-live="polite"></p>
<div class="empty-state card" data-empty hidden><h3>No products match your search</h3><p>Try a different word, or ask us. We may be able to source it.</p>${btnIcon('Ask on WhatsApp', wa('Hello Cyber_Techx Engineering, I am looking for a product that is not on your website.'), 'wa', 'whatsapp', WA_ATTR)}</div>
${cats}</div>
${ctaBand({ title: "Can't find what you need?", text: 'Tell us what you are looking for and we will check availability.', actions: `${btn('Request a Quote', '/consultation/?type=quote&service=Product+Purchase', 'primary')}${btnIcon('WhatsApp us', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}` })}`,
      schema: [crumbsLd(trailFor('Products', '/products/'))],
    });
  }

  /* SERVICE LANDING PAGES */
  const landing = {
    cctv: {
      title: 'CCTV & Security Installation in Awka and Anambra', h1: 'Protect What Matters Most.', eyebrow: 'CCTV & Security',
      desc: 'Professional CCTV planning, installation, configuration and maintenance for homes, offices, shops, schools, estates, warehouses and farms in Awka and Anambra.',
      lead: 'Cyber_Techx provides professional security solutions for homes, offices, shops, schools, estates, warehouses, farms and businesses: from choosing the right cameras to installing, configuring and maintaining them.',
      primary: 'Book a Security Consultation', audiences: ['Homes', 'Offices', 'Shops', 'Schools', 'Estates', 'Warehouses', 'Farms', 'Businesses'],
      stagesTitle: 'From the first visit to ongoing care', stages: services.cctvStages, relatedCat: 'cctv',
      extra: `<div class="notice card"><h3>A note on compact cameras</h3><p>Compact or discreet cameras are supplied strictly as lawful security products. You are responsible for complying with privacy and recording laws, including informing people and obtaining consent where required. They must never be placed in private areas such as bathrooms, changing rooms or bedrooms of others.</p></div>`,
    },
    network: {
      title: 'Networking & Wi-Fi Installation in Awka and Anambra', h1: 'Stay Connected. Stay Productive.', eyebrow: 'Networking & Wi-Fi',
      desc: 'Router setup, Wi-Fi coverage improvement, mesh systems, structured cabling and network troubleshooting for homes and businesses in Awka and Anambra.',
      lead: 'Networking solutions for homes, offices, businesses and smart environments: reliable connections, better coverage and a setup that can grow with you.',
      primary: 'Improve My Wi-Fi', audiences: ['Homes', 'Offices', 'Businesses', 'Smart environments'],
      stagesTitle: 'What you get', stages: services.networkHighlights, relatedCat: 'networking', extra: '',
    },
    smart: {
      title: 'Smart Home & Automation Installation', h1: 'Make Your Space Smarter.', eyebrow: 'Smart Automation & IoT',
      desc: 'Smart lighting, switches, plugs, locks and sensors, set up on a reliable network for homes and workplaces in Awka and Anambra.',
      lead: 'Cyber_Techx delivers smart automation, network solutions, and IoT systems for modern living and working environments. We help homes and businesses become safer, smarter, and more connected.',
      primary: 'Plan My Smart Space', audiences: ['Smart homes', 'Offices', 'Shops', 'Rental properties'],
      stagesTitle: 'What smart technology gives you', stages: services.smartFocus, relatedCat: 'smart', extra: '',
    },
    gaming: {
      title: 'Gaming PCs, Accessories & Setups', h1: 'Built Around How You Play.', eyebrow: 'Gaming & Gadgets',
      desc: 'Gaming PCs, controllers, keyboards, mice, headsets, monitors, RGB setups and complete gaming environments from Cyber_Techx Engineering in Awka.',
      lead: 'From a single controller to a full gaming room or lounge, we help you choose, build and set up gaming technology that fits your space and budget.',
      primary: 'Explore Gaming Products', audiences: ['Home gamers', 'Students', 'Content creators', 'Gaming lounges'],
      stagesTitle: 'How we help', stages: [
        { title: 'Advice', text: 'Recommendations matched to the games you play and what you want to spend.' },
        { title: 'Custom builds', text: 'Gaming PCs built, tested and upgraded to suit you.' },
        { title: 'Setup', text: 'Monitors, accessories, lighting and cabling arranged neatly.' },
        { title: 'Network', text: 'A solid connection for smoother online play.' },
        { title: 'Support', text: 'Troubleshooting and upgrades when you need them.' },
        { title: 'Lounges', text: 'Planning for shared or commercial gaming spaces.' },
      ], relatedCat: 'gaming', extra: '',
    },
    training: {
      title: 'IT & AI Training in Awka and Anambra', h1: 'Learn Technology by Using It.', eyebrow: 'IT & AI Training',
      desc: 'Practical IT and AI training in Awka and Anambra: digital literacy, networking, cybersecurity awareness, Python, AI fundamentals and robotics. Individual and group sessions.',
      lead: 'Hands-on learning that moves you from using technology to understanding it, for beginners, students, professionals and teams.',
      primary: 'Ask About Training', audiences: ['Students', 'Professionals', 'Small businesses', 'Schools and organisations'],
      stagesTitle: 'Training formats', stages: [
        { title: 'Individual training', text: 'One-to-one sessions that move at your pace.' },
        { title: 'Group training', text: 'Small groups learning the same skills together.' },
        { title: 'Workshops', text: 'Focused sessions for teams, schools and organisations.' },
      ], relatedCat: null,
      extra: `<div class="notice card"><h3>Schedules and fees</h3><p>Course dates, class sizes and fees are shared on enquiry. We will not publish a schedule until it is confirmed. Contact us and tell us what you want to learn.</p></div>`,
    },
  };
  for (const id of Object.keys(landing)) {
    const s = svc(id); const L = landing[id]; const path = `/${s.page}/`;
    const trail = trailFor(s.name, path);
    const related = L.relatedCat ? products.categories.find((c) => c.id === L.relatedCat) : null;
    const media = s.image
      ? img({ base: s.image, sizes: s.image.includes('cctv') ? [640, 1200] : [480, 960], w: s.image.includes('cctv') ? 1000 : 750, h: s.image.includes('cctv') ? 750 : 1000, alt: s.imageAlt, sizesAttr: '(min-width: 900px) 45vw, 100vw', lazy: false })
      : iconTile(s.icon, s.name);
    const body = `${pageHero({ eyebrow: L.eyebrow, title: esc(L.h1), lead: esc(L.lead), trail, media: `<div class="feature-media${s.image ? ' has-photo' : ''}">${media}</div>`, actions: `${btn(L.primary, consultUrl(s.formService), 'primary')}${btn('Request a Quote', consultUrl(s.formService, 'quote'), 'outline')}${btnIcon('WhatsApp', wa(`Hello Cyber_Techx Engineering, I would like to ask about ${s.name}.`), 'wa', 'whatsapp', WA_ATTR)}` })}
${section(`${sectionHead({ eyebrow: 'Who it is for', title: 'Built for your space', id: 'who-h' })}${chips(L.audiences)}`, { cls: 'section-tight', labelledby: 'who-h' })}
${section(`${sectionHead({ eyebrow: 'What we offer', title: `${s.name} services`, lead: esc(s.description), id: 'offer-h' })}${ticks(s.offerings).replace('class="ticks"', 'class="ticks ticks-grid"')}`, { cls: 'section-alt', labelledby: 'offer-h' })}
${section(`${sectionHead({ eyebrow: id === 'cctv' ? 'Our approach' : 'Overview', title: L.stagesTitle, id: 'stages-h' })}${id === 'cctv' ? processSteps(L.stages) : featureGrid(L.stages, L.stages.length === 3 ? 3 : 3)}${L.extra ? `<div class="spaced">${L.extra}</div>` : ''}`, { labelledby: 'stages-h' })}
${section(`<div class="two-col"><div><h2>Benefits</h2>${ticks(s.benefits)}</div><div><h2>Typical use cases</h2>${chips(s.useCases)}</div></div>`, { cls: 'section-alt' })}
${related ? section(`${sectionHead({ eyebrow: 'Products', title: `${related.name} products`, lead: 'A few examples from the catalogue.', id: 'rel-h' })}<div class="grid cols-3">${related.items.slice(0, 3).map((i) => productCard({ ...i, icon: related.icon }, related.name)).join('')}</div><p class="center-link">${btn('See all ' + related.name + ' products', '/products/#cat-' + related.id, 'outline')}</p>`, { labelledby: 'rel-h' }) : ''}
${section(`${sectionHead({ eyebrow: 'How we work', title: 'A clear process', id: 'proc-h' })}${processSteps(services.process)}`, { cls: related ? 'section-alt' : '', labelledby: 'proc-h' })}
${ctaBand({ title: L.primary + '?', text: 'Send us your details. We review each request and contact you using the details you give.', actions: `${btn(L.primary, consultUrl(s.formService), 'primary')}${btnIcon('WhatsApp', wa(`Hello Cyber_Techx Engineering, I would like to ask about ${s.name}.`), 'wa', 'whatsapp', WA_ATTR)}` })}`;
    add({
      path, title: L.title, description: L.desc, body,
      schema: [crumbsLd(trail), { '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: L.desc, provider: { '@type': 'LocalBusiness', name: site.name, telephone: site.contact.phoneTel } }],
      ogImage: s.image ? `/assets/img/${s.image}-${s.image.includes('cctv') ? 1200 : 960}.webp` : undefined,
    });
  }

  /* CONSULTATION */
  {
    const f = site.forms;
    const fields = [
      `<div class="field is-full"><fieldset class="segmented"><legend>What would you like to do?</legend><label><input type="radio" name="requestType" value="consultation" checked><span>Book a consultation</span></label><label><input type="radio" name="requestType" value="quote"><span>Request a quote</span></label></fieldset></div>`,
      field({ id: 'fullName', label: 'Full name', required: true, autocomplete: 'name' }),
      field({ id: 'phone', label: 'Phone / WhatsApp', type: 'tel', required: true, autocomplete: 'tel', attrs: 'inputmode="tel" pattern="[+0-9][0-9 ()+\\-]{6,19}"', hint: 'For example 0801 234 5678' }),
      field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' }),
      field({ id: 'service', label: 'Service needed', required: true, options: f.serviceOptions }),
      field({ id: 'product', label: 'Product (if asking about a product)', hint: 'Filled automatically when you come from a product card.' }),
      field({ id: 'description', label: 'Project description', type: 'textarea', required: true, full: true, rows: 5, hint: 'What do you need and what is the problem you want to solve?' }),
      field({ id: 'propertyType', label: 'Property / site type', options: f.propertyTypes }),
      field({ id: 'location', label: 'Installation location', autocomplete: 'address-level2', hint: 'Area or town' }),
      field({ id: 'landmark', label: 'Nearby landmark' }),
      field({ id: 'method', label: 'Consultation method', options: f.methods }),
      field({ id: 'preferredDate', label: 'Preferred date', type: 'date' }),
      field({ id: 'preferredTime', label: 'Preferred time', options: f.times }),
      field({ id: 'timeline', label: 'Desired project timeline', options: f.timelines }),
      field({ id: 'budget', label: 'Customer budget range', hint: 'Optional. A rough figure or range helps us suggest suitable options.' }),
      field({ id: 'contactMethod', label: 'Preferred contact method', options: f.contactMethods }),
    ].join('');
    add({
      path: '/consultation/', title: 'Book a Consultation or Request a Quote', description: 'Book an in-store, on-site or virtual consultation, or request a quote, for CCTV, networking, smart automation, gaming, training or technical support in Awka.',
      body: `${pageHero({ eyebrow: 'Consultation', title: 'Book a consultation or request a quote', lead: 'Tell us what you need. We review every request and contact you using the details you provide. Your consultation is confirmed once we reply.', trail: trailFor('Consultation', '/consultation/') })}
<section class="section"><div class="container split">
<div>${formShell({ formType: 'consultation', fields, submitLabel: 'Send my request' })}</div>
<aside class="side"><div class="card"><h2 class="h3">What happens next</h2><ol class="mini-steps"><li>We review your request.</li><li>We contact you by your preferred method.</li><li>We agree the time, place and scope with you.</li></ol><p class="muted">Nothing is booked until we reply to confirm it.</p></div>
<div class="card"><h2 class="h3">Prefer to talk now?</h2><div class="stack">${btnIcon('Call ' + esc(site.contact.phoneDisplay), 'tel:' + site.contact.phoneTel, 'outline', 'phone')}${btnIcon('WhatsApp us', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}</div></div></aside></div></section>`,
      schema: [crumbsLd(trailFor('Consultation', '/consultation/'))],
    });
  }

  /* PROJECTS */
  {
    const list = projects.projects.filter((p) => !p.placeholder || site.flags.showProjectPlaceholders);
    const cats = projects.categories.filter((c) => list.some((p) => p.category === c));
    add({
      path: '/projects/', title: 'Projects & Portfolio', description: 'Photos of CCTV, networking and router installations by Cyber_Techx Engineering in Anambra, with more projects added as they are documented.',
      body: `${pageHero({ eyebrow: 'Portfolio', title: 'Projects & Portfolio', lead: 'A look at our installation work. We add projects, with the client\'s permission, as they are documented.', trail: trailFor('Projects', '/projects/') })}
<section class="section"><div class="container"><div class="filter-bar" role="group" aria-label="Filter projects"><button type="button" class="chip-btn is-active" data-filter="all" aria-pressed="true">All</button>${cats.map((c) => `<button type="button" class="chip-btn" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>
<div class="grid cols-3" data-filter-grid>${list.map((p) => projectCard(p, site)).join('')}</div>
<div class="empty-state card" data-empty hidden><h3>No projects in this category yet</h3><p>We will add projects as they are documented.</p></div></div></section>
${ctaBand({ title: 'Have a project in mind?', text: 'Tell us about your space and what you want to achieve.', actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Request a Quote', '/consultation/?type=quote', 'outline')}` })}`,
      schema: [crumbsLd(trailFor('Projects', '/projects/'))],
    });
  }


  /* FOUNDER */
  {
    const f = founder;
    const hl = f.highlights.map((h) => `<li class="stat card reveal"><span class="stat-n" data-count="${h.value}" data-dec="${h.decimals || 0}" data-suffix="${esc(h.suffix || '')}">${h.value}${esc(h.suffix || '')}</span><span class="stat-l">${esc(h.label)}</span></li>`).join('');
    const tl = (items) => `<ol class="timeline">${items.map((e) => `<li class="reveal"><span class="tl-when">${esc(e.period)}</span><div><h3>${esc(e.title)}</h3><p>${esc(e.org)}</p></div></li>`).join('')}</ol>`;
    const links = f.links.filter((l) => /^https:\/\//.test(l.url)).map((l) => `<a class="btn btn-outline" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(l.label)}</span></a>`).join('');
    add({
      path: '/founder/', title: `Meet the Founder: ${f.name}`,
      description: `${f.name} (${f.alias}) is the founder and CEO of Cyber_Techx Engineering in Awka, Anambra: a Systems Engineer with experience in networking, cloud and cybersecurity.`,
      body: `${pageHero({ eyebrow: 'Meet the founder', title: `${esc(f.name)} <span class="grad">aka “${esc(f.alias)}”</span>`, lead: esc(f.tagline), trail: trailFor('Founder', '/founder/'), actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Contact us', '/contact/', 'outline')}`, media: fImg() })}
${section(`<div class="two-col"><div>${sectionHead({ eyebrow: 'The story', title: `Who is behind ${esc(site.name)}`, id: 'story-h' })}<p class="big">${esc(f.intro)}</p>${f.story.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="muted">${esc(f.role)} · ${esc(f.location)}</p></div><div>${sectionHead({ eyebrow: 'Focus areas', title: 'Skills', id: 'skills-h' })}${chips(f.skills)}<h3 class="spaced">Interests</h3>${chips(f.interests)}</div></div>`, { labelledby: 'story-h' })}
${section(`${sectionHead({ eyebrow: 'Track record', title: 'Career highlights', lead: esc(f.highlightsNote), center: true, id: 'hl-h' })}<ul class="stat-grid">${hl}</ul>`, { cls: 'section-alt', labelledby: 'hl-h' })}
${section(`<div class="two-col"><div>${sectionHead({ eyebrow: 'Experience', title: 'Where Judah has worked', id: 'exp-h' })}${tl(f.experience)}</div><div>${sectionHead({ eyebrow: 'Education', title: 'Education', id: 'edu-h' })}${tl(f.education)}</div></div>`, { labelledby: 'exp-h' })}
${section(`<div class="two-col"><article class="card reveal"><p class="eyebrow">Where we are going</p><h3>Career aspirations</h3>${ticks(f.aspirations)}</article><article class="card reveal"><p class="eyebrow">Connect</p><h3>Find Judah online</h3><p>See the wider portfolio and professional profile.</p><div class="btn-row">${links}</div></article></div>`, { cls: 'section-alt' })}
${ctaBand({ title: 'Work with Cyber_Techx', text: 'Tell us what you want to achieve and we will take it from there.', actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Request a Quote', '/consultation/?type=quote', 'outline')}` })}`,
      schema: [crumbsLd(trailFor('Founder', '/founder/')), { '@context': 'https://schema.org', '@type': 'Person', name: f.name, alternateName: f.alias, jobTitle: f.role, worksFor: { '@type': 'Organization', name: site.name }, address: { '@type': 'PostalAddress', addressLocality: 'Awka', addressRegion: 'Anambra', addressCountry: 'NG' }, sameAs: f.links.filter((l) => /linkedin/.test(l.url)).map((l) => l.url) }],
    });
  }

  /* ABOUT */
  {
    add({
      path: '/about/', title: 'About Us', description: 'Cyber_Techx Engineering brings products, installation, consultation, technical support and technology education together under one trusted brand in Awka, Anambra.',
      body: `${pageHero({ eyebrow: 'About us', title: 'Technology you can understand, trust and use', lead: 'Cyber_Techx Engineering brings products, installation, consultation, technical support, and technology education together under one trusted brand.', trail: trailFor('About', '/about/'), media: `<div class="logo-panel"><img src="/assets/img/logo-640.png" width="640" height="415" alt="${esc(site.name)} logo"></div>` })}
${section(`<div class="two-col"><div>${sectionHead({ eyebrow: 'Who we are', title: 'Who we are', id: 'who-h' })}<p>${esc(site.description)}</p><p>We do more than sell technology. We help customers select, install, configure, understand, maintain, and improve technology that makes their environments safer, smarter, faster, and more connected.</p><p>We help customers move from simply buying technology to actually understanding, implementing, and benefiting from it.</p></div><a class="card founder-mini" href="/founder/">${fImg('xs')}<div><p class="eyebrow">Meet the founder</p><h3>${esc(founder.name)}</h3><p>${esc(founder.role)}. Read the story behind ${esc(site.name)}.</p><span class="btn-link">Meet Judah ${'→'}</span></div></a></div>`, { labelledby: 'who-h' })}
${section(`<div class="two-col"><article class="card reveal"><p class="eyebrow">Our mission</p><p class="big">Help people and businesses confidently adopt reliable, secure, and useful technology.</p></article><article class="card reveal"><p class="eyebrow">Our vision</p><p class="big">Build Cyber_Techx Engineering into a trusted technology solutions brand known for connecting security, automation, networking, products, education, and professional support.</p></article></div>`, { cls: 'section-alt' })}
${section(`${sectionHead({ eyebrow: 'Our values', title: 'What we stand for', center: true, id: 'val-h' })}${featureGrid(services.values, 3)}`, { labelledby: 'val-h' })}
${section(`${sectionHead({ eyebrow: 'How we work', title: 'How we work', id: 'how-h' })}${processSteps(services.process)}`, { cls: 'section-alt', labelledby: 'how-h' })}
${section(`${sectionHead({ eyebrow: 'Why customers choose us', title: 'Why customers choose us', id: 'why-h' })}<div class="grid cols-3">${[
        ['Everything under one roof', 'Products, installation, support and training from one team.'],
        ['Explained simply', 'We avoid unnecessary jargon and explain your options clearly.'],
        ['Honest pricing', 'Clear quotes with costs separated and no hidden fees.'],
      ].map(([t, x]) => `<article class="card reveal"><h3>${t}</h3><p>${x}</p></article>`).join('')}</div>`, { labelledby: 'why-h' })}
${ctaBand({ title: 'Talk to Cyber_Techx', text: 'Tell us what you are trying to achieve.', actions: `${btn('Book a Consultation', '/consultation/', 'primary')}${btn('Contact us', '/contact/', 'outline')}` })}`,
      schema: [crumbsLd(trailFor('About', '/about/'))],
    });
  }

  /* TESTIMONIALS */
  add({
    path: '/testimonials/', title: 'Testimonials', description: 'Customer feedback for Cyber_Techx Engineering. Testimonials appear here once real customers have given permission.',
    body: `${pageHero({ eyebrow: 'Testimonials', title: 'What customers say', lead: 'We publish only genuine feedback from real customers who have given permission.', trail: trailFor('Testimonials', '/testimonials/') })}${section(testimonialsBlock(site, misc, { heading: false }))}${ctaBand({ title: 'Become our next happy customer', text: 'Tell us what you need and we will take it from there.', actions: btn('Book a Consultation', '/consultation/', 'primary') })}`,
    schema: [crumbsLd(trailFor('Testimonials', '/testimonials/'))],
  });

  /* BLOG */
  {
    add({
      path: '/blog/', title: 'Blog & Tech Resources', description: 'Practical guides on CCTV, Wi-Fi, smart homes, AI and digital skills from Cyber_Techx Engineering. New guides coming soon.',
      body: `${pageHero({ eyebrow: 'Resources', title: 'Blog & Tech Resources', lead: 'Plain-language guides to help you choose, plan and look after your technology. The first articles are on the way.', trail: trailFor('Blog', '/blog/') })}
<section class="section"><div class="container"><div class="filter-bar" role="group" aria-label="Filter articles"><button type="button" class="chip-btn is-active" data-filter="all" aria-pressed="true">All</button>${misc.blogCategories.map((c) => `<button type="button" class="chip-btn" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>
<div class="grid cols-3" data-filter-grid>${misc.posts.map(postCard).join('')}</div>
<div class="empty-state card" data-empty hidden><h3>No articles in this category yet</h3><p>We are still writing. Check back soon.</p></div></div></section>`,
      schema: [crumbsLd(trailFor('Blog', '/blog/'))],
    });
  }

  /* FAQ */
  add({
    path: '/faq/', title: 'Frequently Asked Questions', description: 'Answers about CCTV installation, networking, smart automation, consultations, quotes, training, returns and delivery from Cyber_Techx Engineering.',
    body: `${pageHero({ eyebrow: 'FAQ', title: 'Frequently asked questions', lead: 'Straight answers about our services, quotes, delivery and returns.', trail: trailFor('FAQ', '/faq/') })}${section(`<div class="narrow">${faqList(faqs.faqs)}</div>`)}${ctaBand({ title: 'Still have a question?', text: 'Ask an expert. We are happy to help.', actions: `${btnIcon('Ask on WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}${btn('Contact us', '/contact/', 'outline')}` })}`,
    schema: [crumbsLd(trailFor('FAQ', '/faq/')), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }],
  });

  /* CONTACT */
  {
    const c = site.contact;
    const fields = [
      field({ id: 'fullName', label: 'Name', required: true, autocomplete: 'name' }),
      field({ id: 'phone', label: 'Phone', type: 'tel', required: true, autocomplete: 'tel', attrs: 'inputmode="tel" pattern="[+0-9][0-9 ()+\\-]{6,19}"' }),
      field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' }),
      field({ id: 'subject', label: 'Subject', required: true }),
      field({ id: 'message', label: 'Message', type: 'textarea', required: true, full: true, rows: 5 }),
      field({ id: 'contactMethod', label: 'Preferred contact method', options: site.forms.contactMethods }),
    ].join('');
    add({
      path: '/contact/', title: 'Contact Us', description: `Contact Cyber_Techx Engineering in Ifite-Awka, Anambra. Call or WhatsApp ${c.phoneDisplay}, email us or send a message.`,
      body: `${pageHero({ eyebrow: 'Contact', title: 'Talk to Cyber_Techx', lead: 'Call, message or send us the details. We will get back to you.', trail: trailFor('Contact', '/contact/') })}
<section class="section"><div class="container split">
<div class="stack-lg"><div class="card contact-card"><h2 class="h3">${esc(site.name)}</h2><ul class="contact-list is-large">
<li>${icon('pin')}<span>${esc(c.addressLine)}</span></li>
<li>${icon('phone')}<span>Call / WhatsApp: <a href="tel:${esc(c.phoneTel)}">${esc(c.phoneDisplay)}</a></span></li>
<li>${icon('mail')}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
<li>${icon('chat')}<span>Social: ${esc(site.handle)}</span></li></ul>${social(site, 'social social-inline')}
<p class="muted">${esc(c.openingHours || c.openingHoursNote)}</p>
<div class="btn-row">${btnIcon('Call', 'tel:' + c.phoneTel, 'primary', 'phone')}${btnIcon('WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}</div>
<div class="btn-row">${btn('Book a Consultation', '/consultation/', 'outline')}${btn('Request a Quote', '/consultation/?type=quote', 'outline')}</div>
<p><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=${enc('Ifite Awka Anambra Nigeria')}" target="_blank" rel="noopener noreferrer">Open this area in Google Maps ${icon('arrow')}</a></p></div></div>
<div>${formShell({ formType: 'contact', fields, submitLabel: 'Send message', intro: 'Send us a message and we will reply using your preferred method.' })}</div></div></section>`,
      schema: [crumbsLd(trailFor('Contact', '/contact/')), { ...business(), '@type': 'ContactPage' }],
    });
  }

  /* POLICIES */
  const notice = site.flags.showPolicyDraftNotice ? `<p class="notice card">${icon('shield')}<span>This policy is a starting framework and has not yet been reviewed by a legal adviser. It may be updated.</span></p>` : '';
  const policyPage = (key, extra = '') => {
    const p = policies[key];
    const sections = p.sections.map((s) => `<section class="policy-sec"><h2>${esc(s.h)}</h2>${(s.p || []).map((t) => `<p>${esc(t)}</p>`).join('')}${s.ul ? `<ul class="bullets">${s.ul.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</section>`).join('');
    add({
      path: `/${p.slug}/`, title: p.title, description: p.description,
      body: `${pageHero({ eyebrow: 'Policy', title: esc(p.title), lead: esc(p.intro), trail: trailFor(p.title, `/${p.slug}/`) })}${section(`<div class="narrow prose">${notice}<p class="muted">Last updated: ${esc(p.updated)}</p>${sections}${extra}</div>`)}${ctaBand({ title: 'Questions about this policy?', text: 'Message us and we will explain.', actions: `${btnIcon('WhatsApp', wa(site.whatsappDefaultMessage), 'wa', 'whatsapp', WA_ATTR)}${btn('Contact us', '/contact/', 'outline')}` })}`,
      schema: [crumbsLd(trailFor(p.title, `/${p.slug}/`))],
    });
  };
  policyPage('returns');
  policyPage('shipping');
  policyPage('privacy');
  policyPage('terms');

  /* FEES (with transparent quote summary) */
  {
    const rows = [
      ['Product costs', 'The price of equipment and products.', 'Stated on your quote or order before you pay.'],
      ['Installation fees', 'Labour for fitting, cabling and set-up.', 'Itemised separately on your quote.'],
      ['Consultation fees', 'Time spent assessing your needs, if charged.', 'Told to you before the consultation. If there is no charge, we will say so.'],
      ['Training fees', 'Courses, workshops and sessions.', 'Confirmed when you enquire.'],
      ['Delivery fees', 'Getting products to you, where applicable.', 'Depends on location and order, and agreed before delivery.'],
      ['Optional maintenance / support fees', 'Ongoing care after installation.', 'Optional, and only applied if you agree.'],
    ];
    const table = `<div class="table-wrap"><table class="fee-table"><caption class="visually-hidden">Types of fees and how each is confirmed</caption><thead><tr><th scope="col">Fee type</th><th scope="col">What it covers</th><th scope="col">How it is confirmed</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>`;
    const calc = `<section class="policy-sec"><h2>Quote summary</h2><p>Every quote shows the same lines, so nothing is hidden. Use this tool to see how the lines add up. It is for illustration only: your written quote is the figure that counts.</p>
<form class="calc card" data-calc novalidate>
<div class="form-grid">
${field({ id: 'calc-subtotal', label: 'Subtotal (₦)', type: 'number', attrs: 'min="0" step="any" inputmode="decimal"' })}
${field({ id: 'calc-delivery', label: 'Delivery (₦)', type: 'number', attrs: 'min="0" step="any" inputmode="decimal"' })}
${field({ id: 'calc-install', label: 'Installation (₦)', type: 'number', attrs: 'min="0" step="any" inputmode="decimal"' })}
<div data-calc-promo>${field({ id: 'calc-code', label: 'Promo code', attrs: 'autocomplete="off"' })}</div></div>
<p class="muted" data-calc-promo-note></p>
<dl class="summary" aria-live="polite"><div><dt>Subtotal</dt><dd data-out="subtotal">₦0</dd></div><div><dt>Discount <span data-out="discount-label"></span></dt><dd data-out="discount">−₦0</dd></div><div><dt>Delivery</dt><dd data-out="delivery">₦0</dd></div><div><dt>Installation</dt><dd data-out="install">₦0</dd></div><div class="total"><dt>Total</dt><dd data-out="total">₦0</dd></div></dl>
<p class="muted">Discounts apply to the subtotal only, and codes do not stack unless an offer says they can.</p></form></section>`;
    policyPage('fees', `<section class="policy-sec"><h2>Fee types</h2>${table}</section>${calc}`);
  }

  /* 404 */
  add({
    path: '/404.html', file: '404.html', title: 'Page not found', description: 'The page you were looking for could not be found.', noindex: true, skipSitemap: true,
    body: `<section class="page-hero"><div class="container narrow center-text"><p class="eyebrow">Error 404</p><h1>We couldn't find that page</h1><p class="lead">The link may be old or mistyped. Try one of these instead.</p><div class="btn-row center">${btn('Go to the homepage', '/', 'primary')}${btn('Services', '/services/', 'outline')}${btn('Products', '/products/', 'outline')}${btn('Contact', '/contact/', 'outline')}</div></div></section>`,
  });

  return pages.map((p) => ({ ...p, html: layout(p) }));
}
