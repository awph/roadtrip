// Build-time SVG generators. No charting library, no runtime dependency:
// everything is emitted as inline markup so it renders offline and instantly.

import { escapeHtml, formatAltitude, formatNumber } from './format.js';

// Sized so that at a 360px phone width the altitude figures still land
// around 16px on screen — the number is what the eye hunts for.
const WIDTH = 1000;
const HEIGHT = 460;
const PAD_TOP = 80;
const PAD_BOTTOM = 84;
const PAD_X = 44;

/**
 * Renders the altitude of each pass, in riding order, as a filled profile.
 * This is the single most-read element of a day page, so it is drawn large,
 * with the altitude printed above every peak rather than on an axis.
 */
export function elevationProfile(cols, { label } = {}) {
  const points = cols.filter((col) => typeof col.altitude === 'number');
  if (points.length === 0) return '';

  const max = Math.max(...points.map((c) => c.altitude));
  const min = Math.min(...points.map((c) => c.altitude));
  // Pad the scale so the lowest pass never sits flat on the baseline.
  const top = Math.ceil((max + (max - min) * 0.18 + 60) / 100) * 100;
  const bottom = Math.max(0, Math.floor((min - (max - min) * 0.35 - 80) / 100) * 100);
  const span = top - bottom || 1;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i) => PAD_X + (points.length === 1
    ? plotWidth / 2
    : (plotWidth * i) / (points.length - 1));
  const y = (alt) => PAD_TOP + plotHeight - ((alt - bottom) / span) * plotHeight;

  const coords = points.map((col, i) => ({
    col,
    x: x(i),
    y: y(col.altitude),
  }));

  // A gentle curve between peaks reads more like a road profile than a polyline.
  let line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const midX = (prev.x + curr.x) / 2;
    line += ` C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const baseline = PAD_TOP + plotHeight;
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline} L ${coords[0].x.toFixed(1)} ${baseline} Z`;

  // Peaks carry their altitude and their rank only. The names sit in the
  // ordered list directly below, keyed by the same rank: rotated labels
  // under the curve are unreadable on a phone, at arm's length, in sun.
  const markers = coords.map(({ col, x: cx, y: cy }, i) => {
    const altitudeLabel = formatNumber(col.altitude);
    const anchor = i === 0 ? 'start' : i === coords.length - 1 ? 'end' : 'middle';
    const labelX = i === 0 ? cx - 10 : i === coords.length - 1 ? cx + 10 : cx;
    const optional = col.optional ? ' profile__peak--optional' : '';
    return `
      <line class="profile__stem" x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${baseline}" />
      <circle class="profile__peak${optional}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" />
      <text class="profile__altitude" x="${labelX.toFixed(1)}" y="${(cy - 26).toFixed(1)}" text-anchor="${anchor}">${escapeHtml(altitudeLabel)}</text>
      <text class="profile__rank" x="${cx.toFixed(1)}" y="${baseline + 46}" text-anchor="middle">${i + 1}</text>`;
  }).join('');

  const description = points
    .map((c) => `${c.name} ${formatAltitude(c.altitude)}`)
    .join(', ');

  return `<svg class="profile" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
     aria-label="Profil des cols${label ? ` — ${escapeHtml(label)}` : ''} : ${escapeHtml(description)}"
     preserveAspectRatio="xMidYMid meet">
    <line class="profile__base" x1="${PAD_X}" y1="${baseline}" x2="${WIDTH - PAD_X}" y2="${baseline}" />
    <path class="profile__area" d="${area}" />
    <path class="profile__line" d="${line}" />
    ${markers}
  </svg>`;
}

/**
 * A simplified map of the loop. Stops are projected from the latitude and
 * longitude in `meta.mapPoints`; any stop without coordinates falls the whole
 * map back to an evenly spaced ring, so adding a day never breaks the page.
 * Static SVG either way — no tile server, nothing to load offline.
 */
export function routeMap(days, mapPoints = {}) {
  const stops = [days[0].from, ...days.map((d) => d.to)];
  // A closed loop repeats its departure point; draw that node once.
  const nodes = stops[0] === stops[stops.length - 1] ? stops.slice(0, -1) : stops;

  const w = 560;
  const h = 640;
  const placed = project(nodes, mapPoints, w, h) || ring(nodes, w, h);

  // Labels sit centred above or below their node: centred text keeps long
  // names such as "Bourg-Saint-Maurice" inside the viewBox at phone width.
  const labels = layoutLabels(placed);

  const segments = placed.map((node, i) => {
    const next = placed[(i + 1) % placed.length];
    return `<line class="routemap__leg" x1="${node.x.toFixed(1)}" y1="${node.y.toFixed(1)}" x2="${next.x.toFixed(1)}" y2="${next.y.toFixed(1)}" />`;
  }).join('');

  // Leg numbers sit off the line, on the outside of the loop, and slide
  // along the leg until they clear every place name — the names are drawn
  // last, with a background halo, and would otherwise erase them.
  const centre = centroid(placed);
  const legLabels = placed.map((node, i) => {
    const next = placed[(i + 1) % placed.length];
    const outX = (node.x + next.x) / 2 - centre.x;
    const outY = (node.y + next.y) / 2 - centre.y;
    const len = Math.hypot(outX, outY) || 1;

    let best = null;
    for (const t of [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75]) {
      const px = node.x + (next.x - node.x) * t + (outX / len) * 26;
      const py = node.y + (next.y - node.y) * t + (outY / len) * 26;
      if (!best) best = { px, py };
      if (!nearLabel(px, py, placed, labels)) { best = { px, py }; break; }
    }

    return `<text class="routemap__leg-label" x="${best.px.toFixed(1)}" y="${(best.py + 8).toFixed(1)}" text-anchor="middle">${i + 1}</text>`;
  }).join('');

  const markers = placed.map((node, i) => {
    const start = i === 0 ? ' routemap__node--start' : '';
    return `
      <circle class="routemap__node${start}" cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${i === 0 ? 12 : 9}" />
      <text class="routemap__label" x="${node.x.toFixed(1)}" y="${labels[i].toFixed(1)}" text-anchor="middle">${escapeHtml(node.name)}</text>`;
  }).join('');

  return `<svg class="routemap" viewBox="0 0 ${w} ${h}" role="img"
     aria-label="Schéma de la boucle : ${escapeHtml(stops.join(', '))}"
     preserveAspectRatio="xMidYMid meet">
    ${segments}
    ${legLabels}
    ${markers}
  </svg>`;
}

const LABEL_FONT = 25;
const LABEL_ABOVE = -26;
const LABEL_BELOW = 40;
const LABEL_GAP = 30; // minimum vertical clearance between two names

/**
 * Places each name above or below its stop — above when the stop is a local
 * high point of the loop, so the name stays clear of the two legs meeting
 * there — then nudges any pair that still overlaps.
 */
function layoutLabels(nodes) {
  const width = (name) => name.length * LABEL_FONT * 0.52;

  const ys = nodes.map((node, i) => {
    const before = nodes[(i - 1 + nodes.length) % nodes.length];
    const after = nodes[(i + 1) % nodes.length];
    return node.y + (node.y < (before.y + after.y) / 2 ? LABEL_ABOVE : LABEL_BELOW);
  });

  const overlaps = (a, b) => Math.abs(nodes[a].x - nodes[b].x)
    < (width(nodes[a].name) + width(nodes[b].name)) / 2;

  // Try flipping the offending label to its other side before shifting it,
  // which keeps names attached to the right stop.
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (!overlaps(i, j)) continue;
      if (Math.abs(ys[i] - ys[j]) >= LABEL_GAP) continue;

      const lower = ys[i] > ys[j] ? i : j;
      const flipped = ys[lower] === nodes[lower].y + LABEL_BELOW
        ? nodes[lower].y + LABEL_ABOVE
        : nodes[lower].y + LABEL_BELOW;

      const clashes = nodes.some((_, k) => k !== lower && overlaps(lower, k)
        && Math.abs(flipped - ys[k]) < LABEL_GAP);

      ys[lower] = clashes
        ? ys[lower] + (LABEL_GAP - Math.abs(ys[i] - ys[j]))
        : flipped;
    }
  }

  return ys;
}

/** True when (x, y) falls inside the painted box of any place name. */
function nearLabel(x, y, nodes, labelYs) {
  return nodes.some((node, i) => {
    const halfWidth = (node.name.length * LABEL_FONT * 0.52) / 2 + 8;
    return Math.abs(x - node.x) < halfWidth && Math.abs(y - labelYs[i]) < 24;
  });
}

function centroid(nodes) {
  return {
    x: nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length,
    y: nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length,
  };
}

/** Equirectangular projection, corrected for longitude shrink at latitude. */
function project(nodes, mapPoints, w, h) {
  const points = nodes.map((name) => mapPoints[name]);
  if (points.some((p) => !Array.isArray(p) || p.length !== 2)) return null;

  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  const meanLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const k = Math.cos((meanLat * Math.PI) / 180);

  const xs = lons.map((lon) => lon * k);
  const ys = lats.map((lat) => -lat);

  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;

  // Generous horizontal inset: the place names need the room, not the route.
  const boxW = w - 300;
  const boxH = h - 120;
  const scale = Math.min(boxW / spanX, boxH / spanY);

  const offsetX = (w - spanX * scale) / 2 - Math.min(...xs) * scale;
  const offsetY = (h - spanY * scale) / 2 - Math.min(...ys) * scale;

  return nodes.map((name, i) => ({
    name,
    x: xs[i] * scale + offsetX,
    y: ys[i] * scale + offsetY,
  }));
}

/** Fallback when a stop has no coordinates: an evenly spaced ring. */
function ring(nodes, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w - 300, h - 120) / 2;

  return nodes.map((name, i) => {
    const angle = (Math.PI * 2 * i) / nodes.length - Math.PI / 2;
    return {
      name,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });
}
