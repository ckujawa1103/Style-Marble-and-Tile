#!/usr/bin/env node
//
// Builds the static site into dist/, in English and Spanish.
//
// There is no framework here on purpose. A stone-and-tile shop's website needs
// to be findable, fast, and still editable in five years — so it is plain HTML
// and CSS, assembled by this one dependency-free script.
//
//   node build.mjs          build into dist/
//   node build.mjs --serve  build, then serve dist/ on http://localhost:8000
//
// Languages get real, separate URLs — English at /, Spanish under /es/ — rather
// than being swapped in by JavaScript. Search engines index each language on
// its own, the pages work with JS off, and a Spanish page can be linked to
// directly. Each page declares its counterpart with hreflang so Google serves
// the right one.
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

const readJson = async (p) => JSON.parse(await readFile(join(root, p), "utf8"));

const baseConfig = await readJson("site.config.json");
const ui = await readJson("content/ui.json");
const esOverrides = await readJson("content/es.json");

const LANGS = ["en", "es"];
/** Where each language's pages live. English sits at the root. */
const langPrefix = (lang) => (lang === "en" ? "" : `/${lang}`);

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
const unwrap = (node, path = "") => {
  if (typeof node === "string") {
    if (node.startsWith("TODO:")) {
      todos.push(path);
      return node.slice(5).trim();
    }
    return node;
  }
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

/**
 * Lay a translation file over the English config. Objects merge key by key;
 * arrays of objects merge element by element, so a Spanish file only needs the
 * fields that actually differ — the phone number and photo filenames fall
 * through from English on their own.
 */
const overlay = (base, over, path = "") => {
  if (over === undefined) return base;
  if (Array.isArray(base) && Array.isArray(over)) {
    if (base.length !== over.length && typeof base[0] === "object") {
      throw new Error(
        `translation length mismatch at ${path}: English has ${base.length}, translation has ${over.length}.\n` +
          `These merge position by position, so both files need the same number of entries.`,
      );
    }
    return base.map((v, i) => overlay(v, over[i], `${path}[${i}]`));
  }
  if (base && typeof base === "object" && over && typeof over === "object") {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) {
      if (k.startsWith("_")) continue;
      out[k] = overlay(base[k], v, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return over;
};

// ---------------------------------------------------------------------------
// One language's worth of rendered HTML
// ---------------------------------------------------------------------------

function buildLanguage(lang) {
  const config = unwrap(lang === "en" ? baseConfig : overlay(baseConfig, esOverrides));
  const { site: s, business: b, forms: f, analytics, serviceArea, services, differentiators, faq, materials, technology } = config;
  const reviews = config.reviews.items;
  const projects = config.gallery.projects ?? [];

  /** Look up an interface string, insisting both languages exist. */
  const t = (key, ...args) => {
    const entry = ui[key];
    if (!entry) throw new Error(`unknown ui string: ${key}`);
    const value = entry[lang];
    if (value === undefined) throw new Error(`ui string "${key}" has no ${lang} translation`);
    let i = 0;
    return String(value).replace(/%[sd]/g, () => args[i++]);
  };

  const origin = s.url.replace(/\/$/, "");
  const base = (s.basePath + langPrefix(lang)).replace(/\/$/, "");
  const url = (p) => `${base}/${p}`.replace(/\/+/g, "/");
  const absolute = (p) => origin + url(p);
  /** The same page in the other language. */
  const otherLang = lang === "en" ? "es" : "en";
  const altUrl = (p) =>
    origin + `${s.basePath + langPrefix(otherLang)}/${p}`.replace(/\/+/g, "/");
  /** x-default is the fallback for locales we do not target — always English. */
  const enUrl = (p) => origin + `${s.basePath}/${p}`.replace(/\/+/g, "/");
  /**
   * The same page in the other language, as a root-relative path. hreflang and
   * canonical have to be absolute, but the link a visitor clicks must not be —
   * an absolute href would send anyone previewing locally, or on a future
   * domain, back to whatever origin happened to be in the config at build time.
   */
  const altPath = (p) => `${s.basePath + langPrefix(otherLang)}/${p}`.replace(/\/+/g, "/");

  const addressLine = `${b.address.street}, ${b.address.locality}, ${b.address.region} ${b.address.postalCode}`;

  // --- HTML blocks --------------------------------------------------------

  const serviceCards = services
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
          <span class="teaser-more" aria-hidden="true">${esc(t("learnMore"))} &rarr;</span>
        </a>`,
    )
    .join("\n");

  const footerServices = services
    .map((svc) => `<li><a href="${esc(url("services/#" + svc.slug))}">${esc(svc.name)}</a></li>`)
    .join("\n            ");

  const differentiatorBlocks = differentiators
    .map(
      (d) => `
        <div class="pillar">
          <h3>${esc(d.title)}</h3>
          <p>${esc(d.body)}</p>
        </div>`,
    )
    .join("\n");

  const techPoints = technology.points
    .map(
      (p) => `
        <div class="pillar">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.body)}</p>
        </div>`,
    )
    .join("\n");

  const areaList = serviceArea.map((a) => `<li>${esc(a)}</li>`).join("\n          ");
  const materialList = materials.map((m) => `<li>${esc(m)}</li>`).join("\n          ");

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
    `<span class="stars" role="img" aria-label="${esc(t("starsLabel", n))}">${"\u2605".repeat(n)}${"\u2606".repeat(5 - n)}</span>`;

  const reviewCards = reviews.length
    ? reviews
        .map(
          (r) => `
        <figure class="review">
          ${stars(r.rating)}
          <blockquote><p>${esc(r.text)}</p></blockquote>
          <figcaption>${esc(r.author)}${r.source ? ` <span class="review-source">${esc(t("reviewVia"))} ${esc(r.source)}</span>` : ""}</figcaption>
        </figure>`,
        )
        .join("\n")
    : `<p class="empty-state">${t("reviewsEmptyHtml", esc(b.links.googleReview))}</p>`;

  const shot = (g, eager = false) => `
        <figure class="shot">
          <img src="${esc(url("assets/img/gallery/" + g.src))}" alt="${esc(g.alt)}"
               ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"
               width="${esc(g.width ?? 1600)}" height="${esc(g.height ?? 1200)}">
          ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}
        </figure>`;

  const emptyGallery = `<p class="empty-state">${esc(t("galleryEmpty"))}</p>`;

  const galleryProjects = projects.length
    ? projects
        .map(
          (p, i) => `
      <section class="project">
        <header class="project-head">
          <h2>${esc(p.title)}</h2>
          <p class="project-meta">${[p.location, p.material].filter(Boolean).map(esc).join(" &middot; ")}</p>
          ${p.blurb ? `<p class="project-blurb">${esc(p.blurb)}</p>` : ""}
        </header>
        <div class="gallery-grid">
          ${p.photos.map((g) => shot(g, i === 0)).join("\n")}
        </div>
      </section>`,
        )
        .join("\n")
    : emptyGallery;

  const galleryPreview = projects.length
    ? projects.map((p) => shot(p.photos[0])).join("\n")
    : emptyGallery;

  // Day labels come from the string table so the footer reads "Lunes a viernes"
  // in Spanish, while the schema below keeps the English keys Google expects.
  const dayKeys = {
    "Monday – Friday": "daysWeekdays",
    Saturday: "daysSaturday",
    Sunday: "daysSunday",
  };

  const fmtTime = (t24) => {
    const [h, m] = t24.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
  };

  const hoursRows = b.hours
    .map((h) => {
      const label = dayKeys[h.days] ? t(dayKeys[h.days]) : h.days;
      const value = h.opens ? `${fmtTime(h.opens)} – ${fmtTime(h.closes)}` : t("closed");
      return `<div class="hours-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
    })
    .join("\n            ");

  const joiner = lang === "es" ? " y " : ", and ";
  const areaSentence = serviceArea.slice(0, -1).join(", ") + joiner + serviceArea.at(-1);

  const licenseBlock = b.licenseNumber ? `<p class="footer-license">${esc(b.licenseNumber)}</p>` : "";

  const socialBlock = (() => {
    const links = [
      ["Facebook", b.links.facebook],
      ["Instagram", b.links.instagram],
      ["Yelp", b.links.yelp],
      ["Google", b.links.googleProfile],
    ].filter(([, href]) => href && !href.includes("YOUR_"));
    if (!links.length) return "";
    return `<ul class="social">${links
      .map(([name, href]) => `<li><a href="${esc(href)}" rel="noopener">${esc(name)}</a></li>`)
      .join("")}</ul>`;
  })();

  // --- Structured data ----------------------------------------------------

  const dayCodes = {
    "Monday – Friday": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    Saturday: ["Saturday"],
    Sunday: ["Sunday"],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": origin + `${s.basePath}/`.replace(/\/+/g, "/") + "#business",
    name: b.name,
    legalName: b.legalName,
    description: s.description,
    url: absolute(""),
    telephone: b.phone,
    email: b.email,
    priceRange: b.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address.street,
      addressLocality: b.address.locality,
      addressRegion: b.address.region,
      postalCode: b.address.postalCode,
      addressCountry: b.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: b.geo.latitude, longitude: b.geo.longitude },
    openingHoursSpecification: b.hours
      .filter((h) => h.opens)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayCodes[h.days] ?? [h.days],
        opens: h.opens,
        closes: h.closes,
      })),
    areaServed: serviceArea.map((a) => ({ "@type": "City", name: a, addressRegion: "NY" })),
    availableLanguage: ["en", "es"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Stone and tile services",
      itemListElement: services.map((svc) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: svc.name, description: svc.summary },
      })),
    },
    makesOffer: materials.map((m) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: m, category: "Countertop and tile material" },
    })),
    sameAs: [b.links.googleProfile, b.links.facebook, b.links.instagram, b.links.yelp].filter(Boolean),
  };

  if (b.founded) localBusinessSchema.foundingDate = b.founded;

  if (reviews.length) {
    localBusinessSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
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
    inLanguage: lang,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const jsonLd = (obj) =>
    `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

  // --- Pages --------------------------------------------------------------

  const pages = [
    {
      template: "index",
      out: "index.html",
      path: "",
      title:
        lang === "es"
          ? `${b.name} | Mármol, granito y azulejo en Hampton Bays, NY`
          : `${b.name} | Marble, Granite & Tile in Hampton Bays, NY`,
      description: s.description,
      schema: [localBusinessSchema, faqSchema],
    },
    {
      template: "services",
      out: "services/index.html",
      path: "services/",
      title:
        lang === "es"
          ? `Encimeras, azulejo y piedra | ${b.name}`
          : `Countertops, Tile & Stone Services | ${b.name}`,
      description: services.map((x) => x.name).join(", "),
    },
    {
      template: "gallery",
      out: "gallery/index.html",
      path: "gallery/",
      title: lang === "es" ? `Proyectos | ${b.name}` : `Project Gallery | ${b.name}`,
      description: t("galleryLede"),
    },
    {
      template: "reviews",
      out: "reviews/index.html",
      path: "reviews/",
      title: lang === "es" ? `Reseñas | ${b.name}` : `Reviews | ${b.name}`,
      description: t("reviewsLede"),
    },
    {
      template: "contact",
      out: "contact/index.html",
      path: "contact/",
      title:
        lang === "es"
          ? `Presupuesto gratis | ${b.name} — Hampton Bays, NY`
          : `Free Estimate | ${b.name} — Hampton Bays, NY`,
      description: t("contactLede"),
    },
    {
      template: "404",
      out: "404.html",
      path: "404.html",
      title: `${t("notFoundTitle")} | ${b.name}`,
      description: t("notFoundTitle"),
      noindex: true,
    },
  ];

  const context = (page) => ({
    lang,
    business: { ...b, addressLine, telHref: telHref(b.phone) },
    site: s,
    technology,
    t: Object.fromEntries(Object.keys(ui).filter((k) => !k.startsWith("_")).map((k) => [k, ui[k][lang]])),
    page: {
      title: page.title,
      description: page.description,
      canonical: absolute(page.path),
      alternate: altUrl(page.path),
      alternateLang: otherLang,
      xDefault: enUrl(page.path),
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
      css: `${s.basePath}/assets/css/styles.css`.replace(/\/+/g, "/"),
      js: `${s.basePath}/assets/js/main.js`.replace(/\/+/g, "/"),
      logo: `${s.basePath}/assets/img/logo.svg`.replace(/\/+/g, "/"),
      wordmark: `${s.basePath}/assets/img/wordmark.svg`.replace(/\/+/g, "/"),
      heroImage: `${s.basePath}/assets/img/gallery/sag-harbor-marble-island.jpg`.replace(/\/+/g, "/"),
      // Reuse the gallery's description of the same photo, so the hero image is
      // described in the page's own language rather than always in English.
      heroAlt: projects[0]?.photos[0]?.alt ?? "",
      switchLang: altPath(page.path),
    },
    year: new Date().getFullYear(),
    html: {
      serviceCards,
      serviceTeasers,
      footerServices,
      differentiators: differentiatorBlocks,
      techPoints,
      areaList,
      materials: materialList,
      areaSentence: esc(areaSentence),
      whereWeWorkBody: t("whereWeWorkBody", esc(areaSentence)),
      heroTitle: t("heroTitleHtml"),
      faq: faqBlocks,
      reviews: reviewCards,
      gallery: galleryPreview,
      galleryProjects,
      hours: hoursRows,
      license: licenseBlock,
      social: socialBlock,
      schema: (page.schema ?? [localBusinessSchema]).map(jsonLd).join("\n  "),
      analytics: analytics.plausibleDomain
        ? `<script defer data-domain="${esc(analytics.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>`
        : "",
    },
  });

  return { pages, context, prefix: langPrefix(lang), projects, reviews };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const partials = {};
for (const file of await readdir(join(SRC, "partials"))) {
  partials[file.replace(/\.html$/, "")] = await readFile(join(SRC, "partials", file), "utf8");
}

const templates = {};
for (const file of await readdir(join(SRC, "pages"))) {
  templates[file.replace(/\.html$/, "")] = await readFile(join(SRC, "pages", file), "utf8");
}

const lookup = (ctx, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);

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

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const sitemapEntries = [];
let built = 0;

for (const lang of LANGS) {
  const { pages, context, prefix } = buildLanguage(lang);
  for (const page of pages) {
    const ctx = context(page);
    const html = render(templates[page.template], ctx);
    const dest = join(OUT, prefix, page.out);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, html);
    built++;
    if (!page.noindex) sitemapEntries.push({ loc: ctx.page.canonical, alt: ctx.page.alternate, lang });
  }
}

// Assets are shared between languages — one copy, one cache entry.
await cp(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });

const { pages: enPages, context: enContext, projects, reviews } = buildLanguage("en");
const sampleCtx = enContext(enPages[0]);
const origin = baseConfig.site.url.replace(/\/$/, "");

await writeFile(
  join(OUT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${origin}${`${baseConfig.site.basePath}/sitemap.xml`.replace(/\/+/g, "/")}\n`,
);

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n` +
      `    <xhtml:link rel="alternate" hreflang="${e.lang}" href="${e.loc}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="${e.lang === "en" ? "es" : "en"}" href="${e.alt}"/>\n` +
      `    <lastmod>${today}</lastmod>\n  </url>`,
  )
  .join("\n")}
</urlset>
`,
);

// GitHub Pages must not run the output through Jekyll.
await writeFile(join(OUT, ".nojekyll"), "");

if (!baseConfig.site.url.includes("TODO") && existsSync(join(root, "CNAME"))) {
  await cp(join(root, "CNAME"), join(OUT, "CNAME"));
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Built ${built} pages in ${LANGS.length} languages (${LANGS.join(", ")}) into dist/`);

if (todos.length) {
  const unique = [...new Set(todos)];
  console.log(`\n\u26a0  ${unique.length} placeholder${unique.length === 1 ? "" : "s"} still unfilled in site.config.json:`);
  for (const t of unique) console.log(`     ${t}`);
  console.log("\n   The site builds and previews fine, but do not point a domain at it");
  console.log("   until these are real — Google penalises wrong contact details.\n");
}

if (!reviews.length) console.log("   note: reviews list is empty (see reviews/ page CTA)");
if (!projects.length) console.log("   note: gallery is empty — real project photos matter more than any copy on this site");
else
  console.log(
    `   ${projects.length} projects, ${projects.reduce((n, p) => n + p.photos.length, 0)} photos in the gallery`,
  );

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
    const bp = baseConfig.site.basePath;
    if (bp && p.startsWith(bp)) p = p.slice(bp.length) || "/";
    if (p.endsWith("/")) p += "index.html";
    let file = join(OUT, p);
    const found = existsSync(file);
    if (!found) file = join(OUT, "404.html");
    try {
      const body = await readFile(file);
      res.writeHead(found ? 200 : 404, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(500).end("error");
    }
  }).listen(8000, () =>
    console.log(`\nPreview: http://localhost:8000${baseConfig.site.basePath}/`),
  );
}
