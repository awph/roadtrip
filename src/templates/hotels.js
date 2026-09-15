import {
  escapeHtml, formatDateLong, mapsUrl, statusSlug, telUrl, text,
} from '../lib/format.js';
import { layout } from './layout.js';

export function hotelsPage({ base, trip }) {
  const { meta, days } = trip;
  const nights = days.filter((day) => day.hotel);

  const counts = nights.reduce((acc, day) => {
    const key = statusSlug(day.hotel.status || 'à réserver');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pending = counts.pending || 0;

  const content = `<header class="pagehead">
  <h1 class="pagehead__title">Hôtels</h1>
  <p class="pagehead__lede">${text(nights.length > 1 ? `${nights.length} nuits sur la route.` : `${nights.length} nuit sur la route.`)} ${text(pending === 0
    ? 'Tout est réservé.'
    : pending === nights.length
      ? 'Rien n’est encore réservé.'
      : `${pending} ${pending > 1 ? 'nuits restent' : 'nuit reste'} à réserver.`)}</p>
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
    actions.push(`<a class="button button--ghost" href="${escapeHtml(telUrl(hotel.phone))}">Appeler</a>`);
  }
  if (hotel.address) {
    actions.push(`<a class="button button--ghost" href="${escapeHtml(mapsUrl(hotel.address))}">Itinéraire</a>`);
  }
  if (hotel.url) {
    actions.push(`<a class="button button--ghost" href="${escapeHtml(hotel.url)}" rel="noopener">Site</a>`);
  }

  return `<li class="hotelrow">
      <p class="hotelrow__night">
        <span class="plate plate--small" aria-hidden="true">${day.id}</span>
        <span class="hotelrow__date">${text(formatDateLong(day.date))}</span>
      </p>
      <p class="hotelrow__head">
        <span class="hotelrow__name">${text(hotel.name || 'Hébergement à trouver')}</span>
        <span class="badge badge--${statusSlug(status)}">${text(status)}</span>
      </p>
      <p class="hotelrow__city">${text(hotel.address || hotel.city || day.to)}</p>
      ${hotel.parking ? `<p class="hotelrow__detail">${text(hotel.parking)}</p>` : ''}
      ${hotel.bookingRef ? `<p class="hotelrow__detail">Référence${' '}: ${text(hotel.bookingRef)}</p>` : ''}
      ${actions.length ? `<div class="buttons">${actions.join('')}</div>` : ''}
      <p class="hotelrow__more"><a class="textlink textlink--tap" href="${base}jour/${day.id}/">Voir l’étape</a></p>
    </li>`;
}
