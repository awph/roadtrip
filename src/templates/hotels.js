import {
  escapeHtml, formatDateShort, mapsUrl, statusSlug, telUrl, text,
} from '../lib/format.js';
import { layout } from './layout.js';

export function hotelsPage({ base, trip }) {
  const { meta, days } = trip;
  const nights = days.filter((day) => day.hotel);

  const pending = nights.filter(
    (day) => statusSlug(day.hotel.status || 'à réserver') === 'pending',
  ).length;

  const lede = pending === 0
    ? 'Tout est réservé.'
    : pending === nights.length
      ? 'Rien n’est encore réservé.'
      : `${pending} ${pending > 1 ? 'nuits restent' : 'nuit reste'} à réserver.`;

  const content = `<header class="pagehead">
  <p class="pagehead__eyebrow"><span class="masthead__dash" aria-hidden="true"></span>Road book · Alpes</p>
  <h1 class="pagehead__title">Hôtels</h1>
  <p class="pagehead__lede">${text(nights.length > 1 ? `${nights.length} nuits sur la route.` : `${nights.length} nuit sur la route.`)} ${text(lede)}</p>
</header>

<main id="contenu">
  <ol class="hotellist">
    ${nights.map((day) => hotelRow(base, day)).join('\n    ')}
  </ol>
</main>`;

  return layout({
    base,
    title: 'Hôtels',
    description: `Les hébergements du ${meta.title}, nuit par nuit, avec leur état de réservation.`,
    path: 'hotels/',
    bodyClass: 'page-hotels',
    active: 'hotels',
    meta,
    content,
  });
}

function hotelRow(base, day) {
  const hotel = day.hotel;
  const status = hotel.status || 'à réserver';

  const actions = [];
  if (hotel.phone) {
    actions.push(`<a class="button button--red" href="${escapeHtml(telUrl(hotel.phone))}">Appeler</a>`);
  }
  if (hotel.address) {
    actions.push(`<a class="button button--ink" href="${escapeHtml(mapsUrl(hotel.address))}">Y aller</a>`);
  }
  if (hotel.url) {
    actions.push(`<a class="button button--ink" href="${escapeHtml(hotel.url)}" rel="noopener">Site</a>`);
  }

  return `<li class="hotelrow">
      <p class="hotelrow__night">
        <span class="hotelrow__num">${String(day.id).padStart(2, '0')}</span>
        <span class="hotelrow__date">${text(formatDateShort(day.date))} · ${text(day.to)}</span>
      </p>
      <div class="hotelrow__head">
        <p class="hotelrow__name">${text(hotel.name || 'Hébergement à trouver')}</p>
        <span class="badge badge--${statusSlug(status)}">${text(status)}</span>
      </div>
      <p class="hotelrow__where">${text(hotel.address || hotel.city || day.to)}</p>
      ${hotel.parking ? `<p class="hotelrow__detail">${text(hotel.parking)}</p>` : ''}
      ${hotel.bookingRef ? `<p class="hotelrow__detail">Référence${' '}: ${text(hotel.bookingRef)}</p>` : ''}
      ${actions.length ? `<p class="buttons">${actions.join('')}</p>` : ''}
      ${alternativesLine(hotel)}
      <p class="hotelrow__more"><a class="textlink" href="${base}jour/${day.id}/">Voir l’étape →</a></p>
    </li>`;
}

/**
 * One quiet line: the detail of a fallback lives on the day page, so the
 * list of nights stays readable at a glance.
 */
function alternativesLine(hotel) {
  const list = hotel.alternatives || [];
  if (!list.length) return '';

  const label = list.length > 1 ? 'Autres options' : 'Autre option';

  // Named beds are worth reading here; the rest are counted, since several
  // lines of the same domain would say nothing.
  const named = list.map((alt) => alt.name).filter(Boolean);
  const pending = list.length - named.length;
  const parts = [...named];
  if (pending) parts.push(`${pending} lien${pending > 1 ? 's' : ''} à ouvrir`);

  return `<p class="hotelrow__detail">${label}${'\u00a0'}: ${text(parts.join(', '))}</p>`;
}
