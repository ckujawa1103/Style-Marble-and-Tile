# Style Marble and Tile

Website for Style Marble and Tile — a stone and tile shop in Hampton Bays, NY.

Built to do three jobs: **get found** in local search, **show the work**, and
**turn visitors into estimate requests**.

---

## Where things stand

The site is built, and the business details are real — name, address, phone,
email, hours, services, and materials were taken from the company's public
listings (Yelp, Yahoo Local, Angi, Experience.com, hub.biz) in August 2026.
**Check them against what the shop actually says before launch**; directory
listings go stale, and one of them disagreed with another about opening time.

Three things are still unfilled, and `npm run build` lists them:

```
⚠  3 placeholders still unfilled in site.config.json
     business.links.googleReview     from the Google Business Profile
     business.links.googleProfile    from the Google Business Profile
     forms.endpoint                  from Formspree or similar
```

Two more are deliberately left blank rather than guessed:

- **`business.founded`** — directory listings say the shop started in 1987, but
  the company's own copy has read "in business 30 years" for a while. Those
  disagree, so no founding year is published at all. Get the real one; an
  accurate "since 1987" is a strong trust signal, and a wrong one is worse than
  silence.
- **`business.licenseNumber`** — the licence *number*. The shop being licensed,
  insured, and permitted in the local municipalities is confirmed and is stated
  across the site already; this field is only the number itself, which the
  footer displays automatically once present. Worth chasing — a visible number
  converts better than the word "licensed" on its own.

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

**1. Verify the contact details.** Open `site.config.json` and confirm the
phone, address, and hours with the shop. Google cross-checks them against the
Google Business Profile, and mismatched details hurt local ranking. Note the
address includes **Ste B** — confirm that is right.

**2. Claim the Google Business Profile.** This matters more for getting found
locally than the entire website does. Go to
[google.com/business](https://www.google.com/business), claim or create the
listing, and make the name, address, and phone character-for-character
identical to `site.config.json`. Then paste the profile and review links into
`business.links`.

**3. Add real project photos.** The Facebook page already has project shots —
pulling the best dozen across is the highest-value change available. Drop them
in `src/assets/img/gallery/` and list them under `gallery.items`:

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

**6. Point a domain at it.** Until then the site lives at
`https://ckujawa1103.github.io/Style-Marble-and-Tile/`. Buy
`stylemarbleandtile.com` (or similar), add a `CNAME` file at the repo root
containing just the domain, and set the DNS records GitHub gives you. Then in
`site.config.json` set `site.url` to `https://stylemarbleandtile.com` and
`site.basePath` to `""` — the second part matters, or every link on the site
will keep pointing at the old subfolder.

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

There are already real 5-star reviews on
[Yelp](https://www.yelp.com/biz/style-marble-and-tile-corp-hampton-bays) and
Angi. Copy those across verbatim, with the reviewer's name as it appears and
`"source": "Yelp"`, and they will render on the site.

Going forward, the way to fill that section is to ask. After a job wraps, text
the customer the Google review link (`business.links.googleReview`) while the
finished kitchen is still in front of them — that single habit outperforms
everything else on this list for local ranking. As reviews come in, copy them
into the config and they feed both the reviews page and the star ratings that
show up in search results.

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
