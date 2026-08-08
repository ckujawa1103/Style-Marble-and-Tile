#!/usr/bin/env node
//
// Builds the static site into dist/.
//
// There is no framework here on purpose. A stone-and-tile shop's website needs
// to be findable, fast, and still editable in five years — so it is plain HTML
// and CSS, assembled by this one dependency-free script.
//
//   node build.mjs          build into dist/
//   node build.mjs --serve  build, then serve dist/ on http://localhost:8000
//
// Templating is deliberately tiny:
//   {{> name }}      inline the partial src/partials/name.html
//   {{ a.b }}        insert a value from the context, HTML-escaped
//   {{{ a.b }}}      insert a value raw (for pre-built HTML blocks)
//
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const SRC = join(root, "src");
const OUT = join(root, "dist");

const config = JSON.parse(await readFile(join(root, "site.config.json"), "utf8"));
const { site, business, forms, analytics, serviceArea, services, differentiators, faq } = config;
const reviews = config.reviews.items;
const gallery = config.gallery.items;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** A phone number reduced to something tel: will dial. */
const telHref = (phone) => "tel:" + String(phone).replace(/[^\d+]/g, "");

/** Placeholders are "TODO: real value" — show the value, flag it for the build. */
const todos = [];
const val = (path, raw) => {
  if (typeof raw === "string" && raw.startsWith("TODO:")) {
    todos.push(path);
    return raw.slice(5).trim();
  }
  return raw;
};

/** Walk the config and unwrap every TODO: marker, recording what is unfilled. */
const unwrap = (node, path = "") => {
  if (typeof node === "string") return val(path, node);
  if (Array.isArray(node)) return node.map((v, i) => unwrap(v, `${path}[${i}]`));
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([k]) => !k.startsWith("_"))
        .map(([k, v]) => [k, unwrap(v, path ? `${path}.${k}` : k)]),
    );
  }
  return node;
};

const b = unwrap(business, "business");
const s = unwrap(site, "site");
const f = unwrap(forms, "forms");

const origin = s.url.replace(/\/$/, "");
const base = s.basePath.replace(/\/$/, "");
const url = (p) => `${base}/${p}`.replace(/\/+/g, "/");
const absolute = (p) => origin + url(p);

const addressLine = `${b.address.street}, ${b.address.locality}, ${b.address.region} ${b.address.postalCode}`;

// ---------------------------------------------------------------------------
// HTML blocks
// ---------------------------------------------------------------------------

const serviceCards = (list) =>
  list
    .map(
      (svc) => `
        <article class="card" id="${esc(svc.slug)}">
          <h3>${esc(svc.name)}</h3>
          <p>${esc(svc.description)}</p>
          <ul class="ticks">
            ${svc.bullets.map((x) => `<li>${esc(x)}</li>`).join("\n            ")}
          </ul>
        </article>`,
    )
    .join("\n");

const serviceTeasers = services
  .map(
    (svc) => `
        <a class="teaser" href="${esc(url("services/#" + svc.slug))}">
          <h3>${esc(svc.name)}</h3>
          <p>${esc(svc.summary)}</p>
          <span class="teaser-more" aria-hidden="true">Learn more &rarr;</span>
        </a>`,
  )
  .join("\n");

const differentiatorBlocks = differentiators
  .map(
    (d) => `
        <div class="pillar">
          <h3>${esc(d.title)}</h3>
          <p>${esc(d.body)}</p>
        </div>`,
  )
  .join("\n");

const areaList = serviceArea.map((a) => `<li>${esc(a)}</li>`).join("\n          ");

const faqBlocks = faq
  .map(
    (item) => `
        <details class="faq-item">
          <summary><h3>${esc(item.q)}</h3></summary>
          <div class="faq-answer"><p>${esc(item.a)}</p></div>
        </details>`,
  )
  .join("\n");

const stars = (n) =>
  `<span class="stars" role="img" aria-label="${n} out of 5 stars">${"\u2605".repeat(n)}${"\u2606".repeat(5 - n)}</span>`;

const reviewCards = reviews.length
  ? reviews
      .map(
        (r) => `
        <figure class="review">
          ${stars(r.rating)}
          <blockquote><p>${esc(r.text)}</p></blockquote>
          <figcaption>${esc(r.author)}${r.source ? ` <span class="review-source">via ${esc(r.source)}</span>` : ""}</figcaption>
        </figure>`,
      )
      .join("\n")
  : `
        <p class="empty-state">
          Reviews from recent jobs will appear here. If we have worked on your
          home, <a href="${esc(b.links.googleReview)}">leaving a review</a> is
          the single most useful thing you can do for a small local shop.
        </p>`;

const galleryItems = gallery.length
  ? gallery
      .map(
        (g) => `
        <figure class="shot">
          <img src="${esc(url("assets/img/gallery/" + g.src))}" alt="${esc(g.alt)}" loading="lazy" width="800" height="600">
          ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}
        </figure>`,
      )
      .join("\n")
  : `
        <p class="empty-state">
          Project photos are on the way. In the meantime, call for references and
          recent work in your town.
        </p>`;

const hoursRows = b.hours
  .map(
    (h) =>
      `<div class="hours-row"><dt>${esc(h.days)}</dt><dd>${
        h.opens ? `${esc(fmtTime(h.opens))} – ${esc(fmtTime(h.closes))}` : "Closed"
      }</dd></div>`,
  )
  .join("\n            ");

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
}

const serviceAreaSentence = serviceArea.slice(0, -1).join(", ") + ", and " + serviceArea.at(-1);

// ---------------------------------------------------------------------------
// Structured data — this is what puts the business in the local map pack
// ---------------------------------------------------------------------------

const dayCodes = {
  "Monday – Friday": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  Saturday: ["Saturday"],
  Sunday: ["Sunday"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": absolute("#business"),
  name: b.name,
  legalName: b.legalName,
  description: s.description,
  url: origin + url(""),
  telephone: b.phone,
  email: b.email,
  priceRange: b.priceRange,
  foundingDate: b.founded,
  address: {
    "@type": "PostalAddress",
    streetAddress: b.address.street,
    addressLocality: b.address.locality,
    addressRegion: b.address.region,
    postalCode: b.address.postalCode,
    addressCountry: b.address.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: b.geo.latitude,
    longitude: b.geo.longitude,
  },
  openingHoursSpecification: b.hours
    .filter((h) => h.opens)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayCodes[h.days] ?? [h.days],
      opens: h.opens,
      closes: h.closes,
    })),
  areaServed: serviceArea.map((a) => ({
    "@type": "City",
    name: a,
    addressRegion: "NY",
  })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Stone and tile services",
    itemListElement: services.map((svc) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: svc.name, description: svc.summary },
    })),
  },
  sameAs: [b.links.googleProfile, b.links.facebook, b.links.instagram].filter(Boolean),
};

if (reviews.length) {
  localBusinessSchema.aggregateRating = {
    "@type": "AggregateRating",
    ratingValue: (reviews.reduce((t, r) => t + r.rating, 0) / reviews.length).toFixed(1),
    reviewCount: reviews.length,
  };
  localBusinessSchema.review = reviews.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.author },
    datePublished: r.date,
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
    reviewBody: r.text,
  }));
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const pages = [
  {
    template: "index",
    out: "index.html",
    path: "",
    title: `${b.name} | Marble, Granite & Tile in Hampton Bays, NY`,
    description: s.description,
    schema: [localBusinessSchema, faqSchema],
  },
  {
    template: "services",
    out: "services/index.html",
    path: "services/",
    title: `Countertops, Tile & Stone Services | ${b.name}`,
    description:
      "Kitchen countertops, bathroom vanities, backsplashes, floor and wall tile, custom fabrication, and outdoor stone — templated, fabricated, and installed on the East End.",
  },
  {
    template: "gallery",
    out: "gallery/index.html",
    path: "gallery/",
    title: `Project Gallery | ${b.name}`,
    description: `Recent stone and tile projects by ${b.name} across Hampton Bays, Southampton, and the Hamptons.`,
  },
  {
    template: "reviews",
    out: "reviews/index.html",
    path: "reviews/",
    title: `Reviews | ${b.name}`,
    description: `What homeowners and builders on the East End say about working with ${b.name}.`,
  },
  {
    template: "contact",
    out: "contact/index.html",
    path: "contact/",
    title: `Free Estimate | ${b.name} — Hampton Bays, NY`,
    description: `Request a free stone or tile estimate from ${b.name} in Hampton Bays, NY. Call ${b.phone} or send project details online.`,
  },
  {
    template: "404",
    out: "404.html",
    path: "404.html",
    title: `Page not found | ${b.name}`,
    description: "That page does not exist.",
    noindex: true,
  },
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const partials = {};
for (const file of await readdir(join(SRC, "partials"))) {
  partials[file.replace(/\.html$/, "")] = await readFile(join(SRC, "partials", file), "utf8");
}

function render(tpl, ctx, depth = 0) {
  if (depth > 10) throw new Error("partial recursion too deep");
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`no such partial: ${name}`);
    return render(partials[name], ctx, depth + 1);
  });
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (m, path) => lookup(ctx, path) ?? m);
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, path) => {
    const v = lookup(ctx, path);
    return v === undefined ? m : esc(v);
  });
  return out;
}

const lookup = (ctx, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const page of pages) {
  const tpl = await readFile(join(SRC, "pages", `${page.template}.html`), "utf8");

  const ctx = {
    business: { ...b, addressLine, telHref: telHref(b.phone) },
    site: s,
    page: {
      title: page.title,
      description: page.description,
      canonical: absolute(page.path),
      robots: page.noindex ? "noindex, follow" : "index, follow",
      active: page.template,
    },
    form: { endpoint: f.endpoint },
    u: {
      home: url(""),
      services: url("services/"),
      gallery: url("gallery/"),
      reviews: url("reviews/"),
      contact: url("contact/"),
      css: url("assets/css/styles.css"),
      js: url("assets/js/main.js"),
      logo: url("assets/img/logo.svg"),
      ogImage: absolute("assets/img/og.png"),
    },
    year: new Date().getFullYear(),
    html: {
      serviceCards: serviceCards(services),
      serviceTeasers,
      differentiators: differentiatorBlocks,
      areaList,
      areaSentence: esc(serviceAreaSentence),
      faq: faqBlocks,
      reviews: reviewCards,
      gallery: galleryItems,
      hours: hoursRows,
      schema: (page.schema ?? [localBusinessSchema]).map(jsonLd).join("\n  "),
      analytics: analytics.plausibleDomain
        ? `<script defer data-domain="${esc(analytics.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>`
        : "",
    },
  };

  const html = render(tpl, ctx);
  const dest = join(OUT, page.out);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, html);
}

// Assets, verbatim.
await cp(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });

// robots.txt + sitemap.xml
await writeFile(
  join(OUT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${absolute("sitemap.xml")}\n`,
);

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => !p.noindex)
  .map(
    (p) =>
      `  <url>\n    <loc>${absolute(p.path)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
  )
  .join("\n")}
</urlset>
`,
);

// GitHub Pages must not run the output through Jekyll.
await writeFile(join(OUT, ".nojekyll"), "");

// A custom domain, once there is one.
if (!s.url.includes("TODO") && existsSync(join(root, "CNAME"))) {
  await cp(join(root, "CNAME"), join(OUT, "CNAME"));
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Built ${pages.length} pages into dist/`);

if (todos.length) {
  console.log(`\n\u26a0  ${todos.length} placeholder${todos.length === 1 ? "" : "s"} still unfilled in site.config.json:`);
  for (const t of new Set(todos)) console.log(`     ${t}`);
  console.log("\n   The site builds and previews fine, but do not point a domain at it");
  console.log("   until these are real — Google penalises wrong contact details.\n");
}

if (!reviews.length) console.log("   note: reviews list is empty (see reviews/ page CTA)");
if (!gallery.length) console.log("   note: gallery is empty — real project photos matter more than any copy on this site");

if (process.argv.includes("--serve")) {
  const { createServer } = await import("node:http");
  const { extname } = await import("node:path");
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".xml": "application/xml",
    ".txt": "text/plain",
  };
  createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    let file = join(OUT, p);
    if (!existsSync(file)) file = join(OUT, "404.html");
    try {
      const body = await readFile(file);
      res.writeHead(existsSync(join(OUT, p)) ? 200 : 404, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(500).end("error");
    }
  }).listen(8000, () => console.log("\nPreview: http://localhost:8000"));
}
