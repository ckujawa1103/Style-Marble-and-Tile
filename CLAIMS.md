# Where every claim on this site came from

The site says a lot of specific things about how the shop works. Some of it came
from the business's own material. Some came from third-party directory listings
that may or may not be accurate. **Some I wrote because it is normal practice in
the trade, and nobody has confirmed it.**

This file separates those three, so the last group can be confirmed or killed in
one sitting rather than discovered by a customer.

Legend:

- **[OWN]** — from the business's own words: the Facebook page, the flyer, or
  Chris confirming it directly. Treat as solid.
- **[DIR]** — from a third-party directory (Yelp, Yahoo Local, Angi,
  Experience.com, hub.biz). Often auto-generated and stale. Worth a check.
- **[MINE]** — I wrote it. It is standard for a stone shop and probably true,
  but **no source says it about this business.** These are the ones to go
  through.

---

## Solid — from the business's own material

| Claim | Source |
|---|---|
| Name, address (150 E Montauk Hwy, Ste B), phone, email | **[OWN]** flyer; suite from hub.biz |
| In business since 1987 | **[OWN]** Facebook bio |
| Hard-surface dimensional fabrication shop | **[OWN]** Facebook bio |
| Kitchen & BBQ countertops, custom sinks, fireplaces, interior slab walls, floors, ceilings | **[OWN]** Facebook bio |
| Materials: marble, granite, quartz, slate, bluestone, onyx, limestone, Corian, Dekton, porcelain | **[OWN]** flyer + Facebook bio |
| Vanity tops, pool coping | **[DIR]** but consistent with **[OWN]** photos |
| Dual-router CNC/saw from Construal; 12" blocks; overhead scanning camera; suction arms; 12'×18'×28'; first in the country at the time | **[OWN]** their Facebook post, Aug 2024 |
| Certified MORE AntiEtch applicators; restore and protect countertops | **[OWN]** their Facebook post, Dec 2025 |
| Licensed, insured, permitted in local municipalities | **[OWN]** Chris confirmed |
| Spanish-speaking staff available | **[OWN]** Chris confirmed |
| "Dream it & we can Fabricate it" | **[OWN]** flyer |
| The four reviews | **[OWN]** Yelp and Google, quoted verbatim |

---

## Worth checking — from directories only

| Claim | Where it appears | Note |
|---|---|---|
| **Free estimates** | Hero, CTA band on every page, FAQ, contact page | **[DIR]** Experience.com has a "Free estimates: Yes" field — but that profile is **unclaimed**, so it may be directory-generated rather than something the shop said. Not on the flyer. Appears in a lot of places, so worth confirming. |
| **Hours** — Mon–Fri 8:30–4:30, Sat 10–2, Sun closed | Footer, contact page, callback windows, structured data | **[DIR]** Yahoo Local and Yelp agree on 8:30; one other listing said 8:00. Not on the flyer. The callback time options are built from these, so if the hours are wrong the form offers wrong slots. |
| Sells tile as well as installing it | Services, FAQ, home | **[DIR]** hub.biz lists the business under "Tile Supply"; flyer implies it. Reasonably safe. |

---

## Unconfirmed — I wrote these

None of these are outlandish; they are all ordinary for a fabricator. But no
source says them about *this* shop, and a few are promises a customer could act
on. Go down the list and strike anything that is not true.

### Promises a customer might act on — check these first

| Claim | Where | Status |
|---|---|---|
| ~~"We will fabricate and install a slab you bought elsewhere"~~ | was in FAQ | **REMOVED** Aug 2026 — pending confirmation. Restore if true; it is a genuinely good differentiator. |
| ~~"We will walk the slab yards with you and help you pick"~~ | was on home page | **REMOVED** Aug 2026 — same reason. |
| "Written estimate with material, square footage, and labor broken out separately" | Services, process step 2 | **[MINE]** Does he actually itemise estimates that way? |
| "We usually reply the same day" | Contact form | **[MINE]** A response-time promise. Is it true in July? |
| "We will get samples in front of you" | Tile service | **[MINE]** Plausible for a tile supplier, unconfirmed. |
| "We restore stone we did not install, including other fabricators' work" | Sealing service | **[MINE]**, though their own AntiEtch post is addressed to the public generally, which implies it. |
| "No mailing list, ever" | Contact form | **[MINE]** True as long as nobody starts a newsletter. |

### Process and capability — lower risk

| Claim | Where | Status |
|---|---|---|
| The six-step job flow (walk → estimate → permits → template → fabricate → install) | Services page | **[MINE]** Standard trade sequence. Worth a read-through — the order and the emphasis are guesses. |
| "We template to the actual space, not to the plans" | Process step 4 | **[MINE]** Standard practice. |
| "We walk it with you before we leave" | Process step 6 | **[MINE]** |
| Edge profiles: eased, bullnose, ogee, mitered, waterfall | Countertops | **[MINE]** Standard offerings. |
| Substrate prep, crack isolation, heated floor systems | Tile service | **[MINE]** Do they actually do radiant heat? |
| Handmade and zellige tile | Backsplashes | **[MINE]** |
| Waterproofed shower pans, curbs, niches, benches, steam showers | Bathrooms | **[MINE]** Photos show tiled showers, so the category is real; the specifics are mine. |
| Freeze-thaw material selection for outdoor stone | Outdoor | **[MINE]** True of the trade generally. |
| **Service area town list** (14 towns) | Footer, home, structured data | **[MINE]** I picked these from "East End of Long Island". How far east and west does he actually travel? This one affects local SEO, so it is worth getting right rather than aspirational. |

### Characterisations — tone, not facts

These are how the site describes the shop's attitude. They read as claims, so
they should still sound like him.

| Claim | Status |
|---|---|
| "The hand work still gets done by hand — delicate trim cut by hand because a machine cannot do them" | **[DIR]** paraphrased from a Yahoo Local description mentioning a personal touch on delicate work machines cannot manage. Loosely sourced. |
| "We know which materials hold up in a house that sits empty half the winter" | **[MINE]** Characterisation built on the 1987 date. |
| "Nothing gets lost in a handoff between a fabricator and an installer who have never met" | **[MINE]** Follows from them doing both, but the framing is mine. |

---

## How to use this

Read the **[MINE]** table out loud to him. It takes ten minutes. Anything he
says no to, delete from `site.config.json` or `content/ui.json` — and delete the
Spanish twin in `content/es.json`, or the build will stop and tell you the two
files no longer line up.

Anything he confirms, move up into the solid table with "confirmed by owner,
<date>" so the next person does not have to ask again.
