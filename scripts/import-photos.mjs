#!/usr/bin/env node
//
// Turns a pile of phone photos into web-ready gallery images.
//
//   npm i -D sharp                     (one time — not needed to build the site)
//   node scripts/import-photos.mjs incoming/
//
// For each image it: strips EXIF (which carries GPS coordinates from the
// phone that took it), resizes to fit 1600px, re-encodes as progressive JPEG,
// writes it into src/assets/img/gallery/, and prints a ready-to-paste block
// for the "gallery" section of site.config.json with the real pixel
// dimensions filled in.
//
// The alt text it writes is a placeholder on purpose. Alt text describes what
// is *in* the photo, and only a person who has seen it can write that.
//
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(root, "src/assets/img/gallery");
const MAX_WIDTH = 1600;
const QUALITY = 80;

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(`
This script needs sharp, which is not installed. It is only used here — the
site itself builds with no dependencies at all.

    npm i -D sharp
    node scripts/import-photos.mjs <folder>
`);
  process.exit(1);
}

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/import-photos.mjs <folder-of-photos>");
  process.exit(1);
}

/** kitchen-01.jpg, IMG_4821.JPG -> kitchen-01, img-4821 */
const slugify = (name) =>
  basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

await mkdir(DEST, { recursive: true });

const files = (await readdir(src)).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();

if (!files.length) {
  console.error(`No images found in ${src}`);
  process.exit(1);
}

const entries = [];
let before = 0;
let after = 0;

for (const file of files) {
  const from = join(src, file);
  const name = `${slugify(file)}.jpg`;
  const to = join(DEST, name);

  before += (await stat(from)).size;

  const { width, height } = await sharp(from)
    // withoutEnlargement: a small photo stays small rather than being blown up
    // into a blurry mess.
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .rotate() // honour the EXIF orientation flag before we strip EXIF
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toFile(to);

  after += (await stat(to)).size;

  entries.push({ src: name, alt: `TODO: describe this photo — ${file}`, caption: "", width, height });
  console.log(`  ${file}  ->  ${name}  (${width}x${height})`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
console.log(`\n${files.length} photos: ${mb(before)} -> ${mb(after)}\n`);
console.log('Paste into site.config.json under "gallery":\n');
console.log(JSON.stringify({ items: entries }, null, 2));
console.log(`
Now replace every "TODO:" alt with a real description of what is in the photo
— the room, the material, and the town if you know it. For example:

  "alt": "Calacatta marble waterfall island in a Southampton kitchen"

That text is what a screen reader reads aloud and what Google Images indexes,
so it is worth the two minutes.
`);
