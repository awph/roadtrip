// French typography and formatting helpers.
// Every user-visible string produced here is French — see README, "Langue".

const NBSP = ' '; // espace insécable
const NNBSP = ' '; // espace fine insécable

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const MONTHS_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const WEEKDAYS = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

const WEEKDAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Parses an ISO `YYYY-MM-DD` string without timezone drift. */
function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** `2026-10-03` -> `samedi 3 octobre 2026` */
export function formatDateLong(iso) {
  const { y, m, d, weekday } = parseDate(iso);
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS[m]} ${y}`;
}

/** `2026-10-03` -> `sam. 3 oct.` */
export function formatDateShort(iso) {
  const { m, d, weekday } = parseDate(iso);
  return `${WEEKDAYS_SHORT[weekday]} ${d} ${MONTHS_SHORT[m]}`;
}

/** `2026-10-03` -> `3 octobre` */
export function formatDayMonth(iso) {
  const { m, d } = parseDate(iso);
  return `${d} ${MONTHS[m]}`;
}

/** 2764 -> `2 764` with a narrow no-break space as thousands separator. */
export function formatNumber(n) {
  if (n === null || n === undefined) return null;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/** 286 -> `286 km` */
export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  return `${formatNumber(km)}${NBSP}km`;
}

/** 2764 -> `2 764 m` */
export function formatAltitude(m) {
  if (m === null || m === undefined) return null;
  return `${formatNumber(m)}${NBSP}m`;
}

/**
 * Normalises a duration to French convention: `5h14` -> `5 h 14`,
 * `1h00` -> `1 h`, `50 min` -> `50 min`, `30 à 40 min` -> unchanged.
 */
export function formatDuration(value) {
  if (!value) return null;
  const match = /^(\d+)\s*h\s*(\d{1,2})?$/i.exec(value.trim());
  if (!match) return value;
  const hours = match[1];
  const minutes = match[2];
  if (!minutes || Number(minutes) === 0) return `${hours}${NBSP}h`;
  return `${hours}${NBSP}h${NBSP}${minutes.padStart(2, '0')}`;
}

/** Sums `XhYY` durations and returns the total in the same French style. */
export function sumDurations(values) {
  let total = 0;
  for (const value of values) {
    const match = /^(\d+)\s*h\s*(\d{1,2})?$/i.exec(String(value).trim());
    if (!match) continue;
    total += Number(match[1]) * 60 + Number(match[2] || 0);
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (minutes === 0) return `${formatNumber(hours)}${NBSP}h`;
  return `${formatNumber(hours)}${NBSP}h${NBSP}${String(minutes).padStart(2, '0')}`;
}

/** `+30 km` / `+1 h` — signed additions used by the day options block. */
export function formatAdds(km, time) {
  const parts = [];
  if (km !== null && km !== undefined) parts.push(`+${formatNumber(km)}${NBSP}km`);
  if (time) parts.push(`+${formatDuration(time)}`);
  return parts;
}

/** Applies the French no-break space before `: ; ! ?`. */
export function punctuate(text) {
  if (!text) return text;
  return text
    .replace(/ :/g, `${NBSP}:`)
    .replace(/ ([;!?])/g, `${NNBSP}$1`);
}

/** Escapes text for interpolation into HTML markup. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes and applies French punctuation spacing in one step. */
export function text(value) {
  return escapeHtml(punctuate(value));
}

/** Builds a `geo:` friendly maps link that native apps pick up. */
export function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Strips a phone number down to a dialable `tel:` target. */
export function telUrl(phone) {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

/** Slug used for status badge modifier classes. */
export function statusSlug(status) {
  switch (status) {
    case 'réservé':
      return 'booked';
    case 'confirmé':
      return 'confirmed';
    case 'à réserver':
    default:
      return 'pending';
  }
}

export { NBSP, NNBSP };
