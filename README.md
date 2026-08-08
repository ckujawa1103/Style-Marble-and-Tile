# Style Marble and Tile

Website for Style Marble and Tile — a stone and tile shop in Hampton Bays, NY.

Built to do three jobs: **get found** in local search, **show the work**, and
**turn visitors into estimate requests**.

---

## Where things stand

The site is built and works end to end. What it does *not* yet have is real
information about the business. Every one of those gaps is marked in
`site.config.json` with `TODO:`, and `npm run build` lists them:

```
⚠  11 placeholders still unfilled in site.config.json
```

Nothing in this repository is a real detail about the business — the phone
number, address, hours, and license number are all invented placeholders and
must be replaced before anyone points a domain at this.

---

## Editing the site

**Almost everything lives in one file: `site.config.json`.** Phone number,
address, hours, services, service area, FAQs, reviews, gallery. Change it
there and it updates everywhere — page copy, the footer, the phone links, and
the structured data Google reads.

You can edit that file directly on github.com — open it, click the pencil,
click "Commit changes", and the live site rebuilds itself in about a minute.
No terminal required.

To work on it locally:

```sh
npm run dev     # builds, then serves at http://localhost:8000
npm run build   # builds into dist/
```

There are no dependencies to install. The build is one Node script.

---

## Before launch

These are in rough order of how much they matter.

**1. Fill in the real details.** Open `site.config.json` and replace every
`TODO:`. The phone, address, and hours especially — Google cross-checks them
against your Google Business Profile, and mismatched details hurt ranking.

**2. Claim the Google Business Profile.** This matters more for getting found
locally than the entire website does. Go to
[google.com/business](https://www.google.com/business), claim or create the
listing, and make the name, address, and phone character-for-character
identical to `site.config.json`. Then paste the profile and review links into
`business.links`.

**3. Add real project photos.** Drop them in `src/assets/img/gallery/` and
list them under `gallery.items` in the config:

```json
{ "src": "kitchen-southampton-01.jpg", "alt": "White marble waterfall island in a Southampton kitchen", "caption": "Calacatta island, Southampton" }
```

Phone photos in good daylight are fine. Resize them to about 1600px wide so
pages stay fast. Write a real `alt` for each — it is what a screen reader
announces and what Google Images indexes.

**4. Hook up the estimate form.** Create a free form endpoint at
[formspree.io](https://formspree.io) and paste the URL into `forms.endpoint`.
Until you do, the form falls back to opening the visitor's email app so no
lead is lost — but that is a worse experience and some people will drop off.

**5. Turn on GitHub Pages.** Settings → Pages → Source: **GitHub Actions**.
Every push to `main` deploys automatically.

**6. Point a domain at it.** Buy `stylemarbleandtile.com` (or similar), add a
`CNAME` file at the repo root containing just the domain, and set the DNS
records GitHub gives you. Then update `site.url` in the config.

**7. Submit the sitemap.** Once live, add the site to
[Google Search Console](https://search.google.com/search-console) and submit
`/sitemap.xml`. This is how you find out what people actually search for
before they land on you.

---

## About reviews

`reviews.items` in the config starts empty on purpose. **Do not write
testimonials.** Fake reviews are illegal under the FTC's rule on consumer
reviews (16 CFR Part 465), which carries per-violation penalties, and Google
removes business listings for them.

The way to fill that section is to ask. After a job wraps, text the customer
the Google review link (`business.links.googleReview`) while the finished
kitchen is still in front of them — that single habit outperforms everything
else on this list for local ranking. As real reviews come in, copy them into
the config and they render on the site *and* feed the star ratings in search
results.

---

## What is in here

```
site.config.json      every fact about the business — start here
build.mjs             the whole build; no framework, no dependencies
src/
  pages/              one template per page
  partials/           head, header, footer, call-to-action band
  assets/css/         one stylesheet
  assets/js/          mobile menu + form submission
  assets/img/gallery/ project photos go here
.github/workflows/    builds and deploys to GitHub Pages on push to main
dist/                 build output — generated, not committed
```

### Why plain HTML

A local business site needs to load fast on a phone with two bars in
Riverhead, be readable by Google without running JavaScript, and still be
editable in five years by whoever is around. A framework would work against
all three. So: templates, one CSS file, and a build script short enough to
read in a sitting.

### SEO built in

Handled automatically by the build, no plugin required:

- `LocalBusiness` structured data with service area, hours, geo, and offer
  catalog — this is what feeds the Google map pack
- `FAQPage` structured data, which can win expanded search results
- Aggregate star ratings in search results, once `reviews.items` is populated
- Per-page titles, meta descriptions, canonical URLs, and Open Graph tags
- `sitemap.xml` and `robots.txt`, regenerated on every build
- Semantic HTML, real heading order, and skip links
