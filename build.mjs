#!/usr/bin/env node
// Static site generator. Reads src/data/trip.json, writes dist/.
// No dependencies: `node build.mjs` is the whole build.

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sumDurations } from './src/lib/format.js';
import { homePage } from './src/templates/home.js';
import { dayPage } from './src/templates/day.js';
import { hotelsPage } from './src/templates/hotels.js';
import { practicalPage } from './src/templates/practical.js';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'dist');

// Set BASE_PATH=/roadtrip/ when publishing to a GitHub Pages project subpath.
const base = normaliseBase(process.env.BASE_PATH || '/');

function normaliseBase(value) {
  let out = value.trim();
  if (!out.startsWith('/')) out = `/${out}`;
  if (!out.endsWith('/')) out = `${out}/`;
  return out;
}

async function build() {
  const trip = JSON.parse(await readFile(join(root, 'src/data/trip.json'), 'utf8'));
  validate(trip);

  const stats = computeStats(trip);
  const missingGpx = dropMissingGpx(trip);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Static assets first, so the manifest can be templated over them.
  await cp(join(root, 'public'), outDir, { recursive: true });
  await cp(join(root, 'src/styles'), join(outDir, 'styles'), { recursive: true });

  const pages = [
    ['index.html', homePage({ base, trip, stats })],
    ['hotels/index.html', hotelsPage({ base, trip })],
    ['pratique/index.html', practicalPage({ base, trip })],
  ];

  trip.days.forEach((day, index) => {
    pages.push([
      `jour/${day.id}/index.html`,
      dayPage({
        base,
        trip,
        day,
        previous: trip.days[index - 1] || null,
        next: trip.days[index + 1] || null,
      }),
    ]);
  });

  for (const [path, html] of pages) {
    await writeOut(path, html);
  }

  await writeOut('manifest.webmanifest', renderManifest(trip));
  // Stops GitHub Pages running Jekyll over the output.
  await writeOut('.nojekyll', '');
  // GitHub Pages serves 404.html for unknown paths; point it back home.
  await writeOut('404.html', renderNotFound(trip));

  const assets = await collectAssets();
  await writeOut('sw.js', await renderServiceWorker(assets));

  const bytes = await totalBytes();
  console.log(`Build terminé : ${pages.length + 3} pages, ${assets.length} fichiers précachés, ${(bytes / 1024).toFixed(0)} Ko.`);
  if (missingGpx.length) {
    console.warn(`Traces GPX absentes (bouton masqué) :\n  - ${missingGpx.join('\n  - ')}`);
  }
  if (bytes > 2 * 1024 * 1024) {
    console.warn('Attention : le budget de 2 Mo est dépassé.');
  }
}

async function writeOut(path, contents) {
  const target = join(outDir, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

/** Fails the build on the data mistakes that would otherwise ship silently. */
function validate(trip) {
  const problems = [];

  if (!trip.meta?.title) problems.push('meta.title manquant');
  if (!Array.isArray(trip.days) || trip.days.length === 0) problems.push('aucune étape dans days[]');

  const seen = new Set();
  for (const day of trip.days || []) {
    const where = `étape ${day.id ?? '?'}`;
    if (day.id === undefined || day.id === null) problems.push(`${where} : id manquant`);
    if (seen.has(day.id)) problems.push(`${where} : id en double`);
    seen.add(day.id);
    if (!day.date || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) problems.push(`${where} : date invalide`);
    if (!day.from || !day.to) problems.push(`${where} : from/to manquant`);
    if (typeof day.distanceKm !== 'number') problems.push(`${where} : distanceKm doit être un nombre`);
    if (!/^\d+\s*h\s*\d{0,2}$/i.test(String(day.ridingTime || ''))) problems.push(`${where} : ridingTime doit s'écrire "5h14"`);
    for (const col of day.cols || []) {
      if (!col.name) problems.push(`${where} : un col sans nom`);
      if (col.altitude !== null && col.altitude !== undefined && typeof col.altitude !== 'number') {
        problems.push(`${where} : altitude de "${col.name}" doit être un nombre`);
      }
    }
    if (day.hotel && day.hotel.status
      && !['à réserver', 'réservé', 'confirmé'].includes(day.hotel.status)) {
      problems.push(`${where} : statut d'hôtel inconnu "${day.hotel.status}"`);
    }
  }

  if (problems.length) {
    console.error('Données invalides dans src/data/trip.json :');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
}

/**
 * The GPX traces are exported from Ride Planner by hand and are not all in
 * the repository yet. A declared-but-absent file hides its download button
 * instead of shipping a dead link; the build says which ones are missing.
 */
function dropMissingGpx(trip) {
  const missing = [];
  for (const day of trip.days) {
    if (!day.gpxFile) continue;
    const relPath = day.gpxFile.replace(/^\//, '');
    if (!existsSync(join(root, 'public', relPath))) {
      missing.push(`${day.dayLabel} → public/${relPath}`);
      day.gpxFile = null;
    }
  }
  return missing;
}

function computeStats(trip) {
  const totalDistanceKm = trip.days.reduce((sum, day) => sum + day.distanceKm, 0);
  const totalRidingTime = sumDurations(trip.days.map((day) => day.ridingTime));
  const names = new Set();
  for (const day of trip.days) {
    for (const col of day.cols || []) names.add(col.name);
  }
  return { totalDistanceKm, totalRidingTime, totalCols: names.size };
}

function renderManifest(trip) {
  return `${JSON.stringify({
    name: trip.meta.title,
    short_name: 'Road Book',
    description: trip.meta.description,
    lang: 'fr',
    dir: 'ltr',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f4f0e6',
    theme_color: '#14110d',
    icons: [
      { src: `${base}icons/icone.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: `${base}icons/icone-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icone-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2)}\n`;
}

function renderNotFound(trip) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Page introuvable · ${trip.meta.title}</title>
<link rel="stylesheet" href="${base}styles/tokens.css">
<link rel="stylesheet" href="${base}styles/app.css">
</head>
<body class="page-error">
<main id="contenu" class="errorpage">
  <p class="errorpage__code">404</p>
  <h1 class="errorpage__title">Cette page n'existe pas</h1>
  <p class="prose">Le lien est peut-être incomplet, ou l'étape a été renommée.</p>
  <p><a class="button" href="${base}">Revenir aux étapes</a></p>
</main>
</body>
</html>
`;
}

/** Everything under dist/ except the service worker itself. */
async function collectAssets() {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        files.push(relative(outDir, full).split('\\').join('/'));
      }
    }
  }
  await walk(outDir);
  return files.filter((f) => f !== 'sw.js').sort();
}

async function renderServiceWorker(assets) {
  const template = await readFile(join(root, 'src/sw.template.js'), 'utf8');

  // Directory URLs are what the browser actually requests; cache those too.
  const urls = new Set();
  for (const asset of assets) {
    urls.add(base + asset);
    if (asset.endsWith('index.html')) {
      urls.add(base + asset.replace(/index\.html$/, ''));
    }
  }

  const list = [...urls].sort();
  const version = createHash('sha256')
    .update(await fingerprint(assets))
    .digest('hex')
    .slice(0, 12);

  return template
    .replace('__PRECACHE__', JSON.stringify(list, null, 2))
    .replace('__VERSION__', version)
    .replace('__BASE__', JSON.stringify(base));
}

async function fingerprint(assets) {
  const hash = createHash('sha256');
  for (const asset of assets) {
    hash.update(asset);
    hash.update(await readFile(join(outDir, asset)));
  }
  return hash.digest('hex');
}

async function totalBytes() {
  let total = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        total += (await readFile(full)).length;
      }
    }
  }
  await walk(outDir);
  return total;
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

