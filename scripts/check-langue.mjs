#!/usr/bin/env node
// Règle zéro : aucune chaîne visible en anglais dans dist/.
// Lance `npm run verifier` après un build. Sort en erreur au premier mot trouvé.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

// Mots anglais sans homographe français, typiques d'une interface oubliée
// en anglais. Les mots comme « page », « distance », « option », « total »,
// « notes » ou « parking » sont français et ne figurent pas ici.
const ENGLISH = [
  'about', 'back', 'booked', 'booking', 'cancel', 'close', 'confirmed',
  'day', 'days', 'download', 'error', 'from', 'here', 'highlights', 'home',
  'hotel', 'hotels', 'learn', 'loading', 'more', 'next', 'night', 'nights',
  'offline', 'online', 'overview', 'pending', 'phone', 'previous', 'riders',
  'save', 'search', 'settings', 'share', 'submit', 'summary', 'today',
  'tonight', 'warning', 'warnings', 'with', 'yes', 'your',
];

// Noms propres du voyage : ils restent tels quels, en français comme ailleurs.
const PROPER_NOUNS = [
  'Road Trip Alpes 2026',
  'Road Book',
  'Road book',
  'Ride Planner',
  // Marque du site de réservation : affichée telle quelle dans les liens.
  'Booking.com',
  'booking.com',
];

// Bornes de mot conscientes des accents : `\b` couperait « téléphone »
// juste avant « phone », l'accent ne comptant pas comme caractère de mot.
const BOUND_BEFORE = '(?<![\\p{L}\\p{N}_])';
const BOUND_AFTER = '(?![\\p{L}\\p{N}_])';
const pattern = new RegExp(`${BOUND_BEFORE}(${ENGLISH.join('|')})${BOUND_AFTER}`, 'giu');

async function main() {
  const files = await walk(distDir);
  const problems = [];

  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const source = await readFile(file, 'utf8');
    for (const [where, value] of visibleStrings(source)) {
      let cleaned = value;
      for (const noun of PROPER_NOUNS) cleaned = cleaned.split(noun).join(' ');
      const found = cleaned.match(pattern);
      if (found) {
        problems.push(`${relative(root, file)} — ${where} — « ${found.join(', ')} » dans : ${value.slice(0, 90)}`);
      }
    }

    if (!/<html lang="fr">/.test(source)) {
      problems.push(`${relative(root, file)} — attribut lang="fr" absent sur <html>`);
    }
  }

  const manifest = JSON.parse(await readFile(join(distDir, 'manifest.webmanifest'), 'utf8'));
  if (manifest.lang !== 'fr') problems.push('manifest.webmanifest — lang doit valoir "fr"');

  if (problems.length) {
    console.error(`Règle zéro non respectée — ${problems.length} problème(s) :`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(`Règle zéro respectée : ${files.filter((f) => f.endsWith('.html')).length} pages vérifiées, aucune chaîne anglaise visible.`);
}

/** Text nodes plus the attributes a human actually reads. */
function* visibleStrings(source) {
  const stripped = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  for (const match of stripped.matchAll(/>([^<>]+)</g)) {
    const value = decode(match[1]).trim();
    if (value) yield ['texte', value];
  }

  for (const attr of ['alt', 'title', 'aria-label', 'placeholder', 'content']) {
    for (const match of stripped.matchAll(new RegExp(`${attr}="([^"]*)"`, 'g'))) {
      const value = decode(match[1]).trim();
      if (value) yield [attr, value];
    }
  }
}

function decode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
