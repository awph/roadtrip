import {
  escapeHtml, formatAdds, formatAltitude, formatDateShort, formatDistance,
  formatDuration, formatNumber, mapsUrl, statusSlug, telUrl, text,
} from '../lib/format.js';
import { elevationProfile } from '../lib/profile.js';
import { layout } from './layout.js';

/** Shown on every pass panel; the site has no live data of its own. */
const PASS_STATUS_URL = 'https://www.alpen-paesse.ch/fr/etat-des-cols/';

export function dayPage({ base, trip, day, previous, next }) {
  const { meta } = trip;
  const routeLabel = `${day.from} → ${day.to}`;
  const dayNumber = String(day.id).padStart(2, '0');

  const content = `<header class="dayhead">
  <div class="dayhead__bar">
    <a class="dayhead__back" href="${base}">← Road book</a>
    <span class="dayhead__eyebrow">Jour ${dayNumber} · ${text(formatDateShort(day.date))}</span>
  </div>
  <h1 class="dayhead__route">${text(day.from)} <span class="arrow" aria-hidden="true">→</span><span class="visually-hidden"> vers </span> ${text(day.to)}</h1>
</header>

<div class="statband">
  <div class="statband__cell">
    <span class="statband__label">Distance</span>
    <span class="statband__value">${text(formatDistance(day.distanceKm))}</span>
  </div>
  <div class="statband__cell">
    <span class="statband__label">Selle</span>
    <span class="statband__value">${text(formatDuration(day.ridingTime))}</span>
  </div>
  <div class="statband__cell">
    <span class="statband__label">Cols</span>
    <span class="statband__value">${text(formatNumber(day.cols.length))}</span>
  </div>
</div>

<main id="contenu" class="day" data-day="${day.id}"${previous ? ` data-previous="${base}jour/${previous.id}/"` : ''}${next ? ` data-next="${base}jour/${next.id}/"` : ''}>

  <p class="day__summary">${text(day.summary)}</p>

  ${day.cols.length ? `<section class="block" aria-labelledby="titre-profil">
    <h2 class="block__title" id="titre-profil">Profil des cols</h2>
    ${elevationProfile(day.cols, { label: routeLabel })}
  </section>` : ''}

  ${day.cols.length ? `<section class="block" aria-labelledby="titre-cols">
    <h2 class="block__title" id="titre-cols">Les cols, dans l'ordre <span class="block__hint">· touchez pour le détail</span></h2>
    <div class="cols">
      ${day.cols.map((col, index) => passRow(col, index + 1)).join('\n      ')}
    </div>
  </section>` : ''}

  ${day.warnings?.length ? `<section class="alert" aria-labelledby="titre-vigilance">
    <h2 class="alert__title" id="titre-vigilance">Vigilance</h2>
    <ul class="alert__list">
      ${day.warnings.map((item) => `<li>${text(item)}</li>`).join('\n      ')}
    </ul>
  </section>` : ''}

  ${day.options?.length ? `<section class="block" aria-labelledby="titre-options">
    <h2 class="block__title" id="titre-options">Variantes possibles</h2>
    ${day.options.map(optionBlock).join('\n    ')}
  </section>` : ''}

  ${day.highlights?.length ? `<section class="block" aria-labelledby="titre-temps-forts">
    <h2 class="block__title" id="titre-temps-forts">À ne pas manquer</h2>
    <ul class="marks">
      ${day.highlights.map((item) => `<li>${text(item)}</li>`).join('\n      ')}
    </ul>
  </section>` : ''}

  <section class="block" aria-labelledby="titre-ce-soir">
    <h2 class="block__title" id="titre-ce-soir">Ce soir</h2>
    ${hotelBlock(day)}
  </section>

  ${day.waypoints?.length ? `<section class="block" aria-labelledby="titre-itineraire">
    <h2 class="block__title" id="titre-itineraire">Itinéraire</h2>
    <p class="waypoints">${day.waypoints.map((w) => `<span class="waypoint">${text(w)}</span>`).join('<span class="waypoint__sep" aria-hidden="true">›</span>')}</p>
  </section>` : ''}

  ${linksBlock(base, day)}
</main>

${dayNav(base, previous, next)}`;

  const description = `${day.dayLabel} du ${meta.title} : ${routeLabel}, ${formatDistance(day.distanceKm)}, ${formatDuration(day.ridingTime)} de roulage.`;

  return layout({
    base,
    title: `${day.dayLabel} · ${routeLabel}`,
    description,
    path: `jour/${day.id}/`,
    bodyClass: 'page-day',
    active: 'accueil',
    meta,
    content,
  });
}

/**
 * Variante 2a : the pass opens in place, so the day's list stays the thread.
 * Built on <details>, so it works with JavaScript disabled and is keyboard
 * operable for free.
 */
function passRow(col, position) {
  const rank = String(position).padStart(2, '0');
  const optional = col.optional ? ' cols__item--optional' : '';

  // Numeric facts are set in the display face and share a two-column grid;
  // prose facts run full width in the body face, as in the canvas.
  const facts = [
    ['Montée', climbLabel(col), 'num'],
    ['Épingles', col.hairpins !== undefined && col.hairpins !== null ? formatNumber(col.hairpins) : null, 'num'],
    ['Temps', col.climbTime ? `≈ ${formatDuration(col.climbTime)}` : null, 'num'],
    ['Versant', col.side, 'text'],
  ].filter(([, value]) => value);

  const lines = [
    ['Dernière essence', col.lastFuel],
    ['Pause', col.stop],
    ['Ouverture', col.openWindow],
  ].filter(([, value]) => value);

  return `<details class="cols__item${optional}">
        <summary class="cols__summary">
          <span class="cols__rank">${rank}</span>
          <span class="cols__name">${text(col.name)}${col.optional ? ' <span class="chip chip--outline">variante</span>' : ''}</span>
          <span class="cols__alt">${col.altitude ? text(formatNumber(col.altitude)) : '—'}</span>
        </summary>
        <div class="passpanel">
          ${facts.length ? `<dl class="passpanel__facts">
            ${facts.map(([label, value, kind]) => `<div class="passpanel__fact passpanel__fact--${kind}">
              <dt>${text(label)}</dt>
              <dd>${text(value)}</dd>
            </div>`).join('\n            ')}
          </dl>` : ''}
          ${col.surface?.length ? `<p class="passpanel__tags">${col.surface.map((tag) => `<span class="chip chip--onink">${text(tag)}</span>`).join('')}</p>` : ''}
          ${lines.length ? `<dl class="passpanel__lines">
            ${lines.map(([label, value]) => `<div>
              <dt>${text(label)}</dt>
              <dd>${text(value)}</dd>
            </div>`).join('\n            ')}
          </dl>` : ''}
          ${col.notes ? `<p class="passpanel__note">${text(col.notes)}</p>` : ''}
          <p class="passpanel__actions">
            <a class="button button--red" href="${escapeHtml(mapsUrl(col.coords ? col.coords.join(',') : col.name))}" rel="noopener">Y aller</a>
            <a class="button button--onink" href="${PASS_STATUS_URL}" rel="noopener">État du col</a>
          </p>
        </div>
      </details>`;
}

/** `13,4 km · 6,1 %` — French decimal comma, both halves optional. */
function climbLabel(col) {
  const parts = [];
  if (typeof col.climbKm === 'number') {
    parts.push(`${String(col.climbKm).replace('.', ',')}${' '}km`);
  }
  if (typeof col.gradient === 'number') {
    parts.push(`${String(col.gradient).replace('.', ',')}${' '}%`);
  }
  return parts.join(' · ') || null;
}

function optionBlock(option) {
  const adds = formatAdds(option.addsKm, option.addsTime);
  return `<article class="option">
      <h3 class="option__name">${text(option.name)}${option.altitude ? ` <span class="option__altitude">${text(formatAltitude(option.altitude))}</span>` : ''}</h3>
      <p class="option__text">${text(option.description)}</p>
      ${adds.length ? `<p class="option__adds">${adds.map((a) => `<span class="chip chip--solid">${text(a)}</span>`).join('')}</p>` : ''}
      ${option.decisionPoint ? `<p class="option__decision"><span class="option__decision-label">Décision</span>${text(option.decisionPoint)}</p>` : ''}
    </article>`;
}

function hotelBlock(day) {
  const hotel = day.hotel;

  if (!hotel) {
    return `<p class="empty">Retour à la maison${' '}: pas d'hôtel ce soir.</p>`;
  }

  const status = hotel.status || 'à réserver';
  const cells = [];

  if (hotel.phone) {
    cells.push(`<a class="hotel__cell" href="${escapeHtml(telUrl(hotel.phone))}">
        <span class="hotel__cell-label">Téléphone</span>
        <span class="hotel__cell-value hotel__cell-value--tel">${text(hotel.phone)}</span>
      </a>`);
  }

  if (hotel.parking) {
    cells.push(`<p class="hotel__cell">
        <span class="hotel__cell-label">Parking moto</span>
        <span class="hotel__cell-value">${text(hotel.parking)}</span>
      </p>`);
  }

  if (hotel.url) {
    cells.push(`<a class="hotel__cell" href="${escapeHtml(hotel.url)}" rel="noopener">
        <span class="hotel__cell-label">Site</span>
        <span class="hotel__cell-value">${text(hotel.url.replace(/^https?:\/\//, ''))}</span>
      </a>`);
  }

  if (hotel.bookingRef) {
    cells.push(`<p class="hotel__cell">
        <span class="hotel__cell-label">Référence</span>
        <span class="hotel__cell-value">${text(hotel.bookingRef)}</span>
      </p>`);
  }

  const where = hotel.address || hotel.city || day.to;

  return `<div class="hotel">
      <div class="hotel__head">
        <div>
          <p class="hotel__name">${text(hotel.name || 'Hébergement à trouver')}</p>
          ${hotel.address
            ? `<a class="hotel__addr hotel__addr--link" href="${escapeHtml(mapsUrl(hotel.address))}">${text(hotel.address)}</a>`
            : `<p class="hotel__addr">${text(where)}</p>`}
        </div>
        <span class="badge badge--${statusSlug(status)}">${text(status)}</span>
      </div>
      ${cells.length ? `<div class="hotel__grid">${cells.join('\n      ')}</div>` : ''}
      ${hotel.notes ? `<p class="hotel__note">${text(hotel.notes)}</p>` : ''}
      ${status === 'à réserver' ? `<p class="hotel__note empty">Rien n'est encore réservé pour cette nuit.</p>` : ''}
    </div>`;
}

function linksBlock(base, day) {
  const links = [];

  if (day.ridePlannerUrl) {
    links.push(`<a class="button button--red" href="${escapeHtml(day.ridePlannerUrl)}" rel="noopener">Itinéraire</a>`);
  }
  if (day.gpxFile) {
    links.push(`<a class="button button--ink" href="${base}${escapeHtml(day.gpxFile.replace(/^\//, ''))}" download>Trace GPX</a>`);
  }

  if (!links.length) return '';

  return `<section class="block" aria-labelledby="titre-fichiers">
    <h2 class="block__title" id="titre-fichiers">Fichiers et cartes</h2>
    <p class="buttons">${links.join('')}</p>
  </section>`;
}

function dayNav(base, previous, next) {
  const cell = (side, href, hint, title) => `<a class="daynav__cell daynav__cell--${side}" href="${href}"${side === 'prev' ? ' rel="prev"' : ' rel="next"'}>
    <span class="daynav__hint">${hint}</span>
    <span class="daynav__title">${text(title)}</span>
  </a>`;

  return `<nav class="daynav" aria-label="Navigation entre les étapes">
    ${previous
      ? cell('prev', `${base}jour/${previous.id}/`, '← Précédent', `${previous.dayLabel} · ${previous.to}`)
      : cell('prev', base, '← Retour', 'Toutes les étapes')}
    ${next
      ? cell('next', `${base}jour/${next.id}/`, 'Suivant →', `${next.dayLabel} · ${next.to}`)
      : cell('next', base, 'Fin de la boucle', 'Toutes les étapes')}
  </nav>`;
}
