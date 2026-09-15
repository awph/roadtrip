import {
  escapeHtml, formatAdds, formatAltitude, formatDateLong, formatDistance,
  formatDuration, mapsUrl, statusSlug, telUrl, text,
} from '../lib/format.js';
import { elevationProfile } from '../lib/profile.js';
import { layout } from './layout.js';

export function dayPage({ base, trip, day, previous, next }) {
  const { meta } = trip;
  const routeLabel = `${day.from} → ${day.to}`;

  const content = `<header class="dayhead" id="entete-jour">
  <div class="dayhead__inner">
    <span class="plate plate--small" aria-hidden="true">${day.id}</span>
    <div class="dayhead__text">
      <h1 class="dayhead__route"><span class="visually-hidden">${text(day.dayLabel)} : </span>${text(day.from)} <span class="arrow" aria-hidden="true">→</span> ${text(day.to)}</h1>
      <p class="dayhead__figures">
        <span class="figure">${text(formatDistance(day.distanceKm))}</span>
        <span class="figure">${text(formatDuration(day.ridingTime))}</span>
      </p>
    </div>
  </div>
</header>

<main id="contenu" class="day" data-day="${day.id}"${previous ? ` data-previous="${base}jour/${previous.id}/"` : ''}${next ? ` data-next="${base}jour/${next.id}/"` : ''}>
  <p class="day__date">${text(formatDateLong(day.date))}</p>

  ${day.cols.length ? `<section class="panel" aria-labelledby="titre-profil">
    <h2 class="panel__title" id="titre-profil">Profil des cols</h2>
    ${elevationProfile(day.cols, { label: routeLabel })}
    <p class="profile__caption">Altitudes en mètres, dans l'ordre de passage. Les numéros renvoient à la liste ci-dessous.</p>
  </section>` : ''}

  <section class="panel" aria-labelledby="titre-resume">
    <h2 class="panel__title" id="titre-resume">L'étape</h2>
    <p class="prose">${text(day.summary)}</p>
  </section>

  ${day.highlights?.length ? `<section class="panel" aria-labelledby="titre-temps-forts">
    <h2 class="panel__title" id="titre-temps-forts">Temps forts</h2>
    <ul class="bullets">
      ${day.highlights.map((item) => `<li>${text(item)}</li>`).join('\n      ')}
    </ul>
  </section>` : ''}

  ${day.cols.length ? `<section class="panel" aria-labelledby="titre-cols">
    <h2 class="panel__title" id="titre-cols">Les cols, dans l'ordre</h2>
    <ol class="collist">
      ${day.cols.map((col, index) => colRow(col, index + 1)).join('\n      ')}
    </ol>
  </section>` : ''}

  ${day.options?.length ? `<section class="panel panel--option" aria-labelledby="titre-options">
    <h2 class="panel__title" id="titre-options">Variantes possibles</h2>
    ${day.options.map(optionBlock).join('\n    ')}
  </section>` : ''}

  ${day.warnings?.length ? `<section class="panel panel--warning" aria-labelledby="titre-vigilance">
    <h2 class="panel__title" id="titre-vigilance">Points de vigilance</h2>
    <ul class="bullets bullets--warning">
      ${day.warnings.map((item) => `<li>${text(item)}</li>`).join('\n      ')}
    </ul>
  </section>` : ''}

  <section class="panel" aria-labelledby="titre-etape-soir">
    <h2 class="panel__title" id="titre-etape-soir">L'étape du soir</h2>
    ${hotelBlock(day)}
  </section>

  ${day.waypoints?.length ? `<section class="panel" aria-labelledby="titre-itineraire">
    <h2 class="panel__title" id="titre-itineraire">Itinéraire</h2>
    <p class="waypoints">${day.waypoints.map((w) => `<span class="waypoint">${text(w)}</span>`).join('<span class="waypoint__sep" aria-hidden="true">›</span>')}</p>
  </section>` : ''}

  ${linksBlock(base, day)}

  ${dayNav(base, previous, next)}
</main>`;

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

function colRow(col, position) {
  const optional = col.optional ? ' collist__item--optional' : '';
  return `<li class="collist__item${optional}">
        <span class="collist__rank" aria-hidden="true">${position}</span>
        <span class="collist__name">${text(col.name)}${col.optional ? ' <span class="tag tag--optional">variante</span>' : ''}</span>
        <span class="collist__altitude">${col.altitude ? text(formatAltitude(col.altitude)) : '—'}</span>
      </li>`;
}

function optionBlock(option) {
  const adds = formatAdds(option.addsKm, option.addsTime);
  return `<article class="option">
      <h3 class="option__name">${text(option.name)}${option.altitude ? ` <span class="option__altitude">${text(formatAltitude(option.altitude))}</span>` : ''}</h3>
      <p class="prose">${text(option.description)}</p>
      ${adds.length ? `<p class="option__adds">${adds.map((a) => `<span class="figure figure--adds">${text(a)}</span>`).join('')}</p>` : ''}
      ${option.decisionPoint ? `<p class="option__decision"><span class="option__decision-label">Décision${' '}:</span> ${text(option.decisionPoint)}</p>` : ''}
    </article>`;
}

function hotelBlock(day) {
  const hotel = day.hotel;

  if (!hotel) {
    return `<p class="prose prose--empty">Retour à la maison${' '}: pas d'hôtel ce soir.</p>`;
  }

  const status = hotel.status || 'à réserver';
  const rows = [];

  if (hotel.address) {
    rows.push(`<a class="contact contact--address" href="${escapeHtml(mapsUrl(hotel.address))}">
        <span class="contact__label">Adresse</span>
        <span class="contact__value">${text(hotel.address)}</span>
      </a>`);
  } else if (hotel.city) {
    rows.push(`<p class="contact contact--static">
        <span class="contact__label">Ville</span>
        <span class="contact__value">${text(hotel.city)}</span>
      </p>`);
  }

  if (hotel.phone) {
    rows.push(`<a class="contact contact--phone" href="${escapeHtml(telUrl(hotel.phone))}">
        <span class="contact__label">Téléphone</span>
        <span class="contact__value">${text(hotel.phone)}</span>
      </a>`);
  }

  if (hotel.url) {
    rows.push(`<a class="contact" href="${escapeHtml(hotel.url)}" rel="noopener">
        <span class="contact__label">Site</span>
        <span class="contact__value">${text(hotel.url.replace(/^https?:\/\//, ''))}</span>
      </a>`);
  }

  if (hotel.parking) {
    rows.push(`<p class="contact contact--static">
        <span class="contact__label">Stationnement moto</span>
        <span class="contact__value">${text(hotel.parking)}</span>
      </p>`);
  }

  if (hotel.bookingRef) {
    rows.push(`<p class="contact contact--static">
        <span class="contact__label">Référence</span>
        <span class="contact__value">${text(hotel.bookingRef)}</span>
      </p>`);
  }

  return `<div class="hotel">
      <p class="hotel__head">
        <span class="hotel__name">${text(hotel.name || 'Hébergement à trouver')}</span>
        <span class="badge badge--${statusSlug(status)}">${text(status)}</span>
      </p>
      ${rows.length ? `<div class="contacts">${rows.join('\n      ')}</div>` : ''}
      ${hotel.notes ? `<p class="prose prose--note">${text(hotel.notes)}</p>` : ''}
      ${status === 'à réserver' ? `<p class="prose prose--empty">Rien n'est encore réservé pour cette nuit.</p>` : ''}
    </div>`;
}

function linksBlock(base, day) {
  const links = [];

  if (day.gpxFile) {
    links.push(`<a class="button button--ghost" href="${base}${escapeHtml(day.gpxFile.replace(/^\//, ''))}" download>Télécharger la trace GPX</a>`);
  }
  if (day.ridePlannerUrl) {
    links.push(`<a class="button button--ghost" href="${escapeHtml(day.ridePlannerUrl)}" rel="noopener">Ouvrir dans Ride Planner</a>`);
  }

  if (!links.length) return '';

  return `<section class="panel" aria-labelledby="titre-liens">
    <h2 class="panel__title" id="titre-liens">Fichiers et cartes</h2>
    <div class="buttons">${links.join('\n      ')}</div>
  </section>`;
}

function dayNav(base, previous, next) {
  return `<nav class="daynav" aria-label="Navigation entre les étapes">
    ${previous
      ? `<a class="daynav__link daynav__link--prev" href="${base}jour/${previous.id}/" rel="prev">
        <span class="daynav__hint">Étape précédente</span>
        <span class="daynav__title">${text(previous.dayLabel)} · ${text(previous.to)}</span>
      </a>`
      : `<a class="daynav__link daynav__link--prev" href="${base}">
        <span class="daynav__hint">Retour</span>
        <span class="daynav__title">Toutes les étapes</span>
      </a>`}
    ${next
      ? `<a class="daynav__link daynav__link--next" href="${base}jour/${next.id}/" rel="next">
        <span class="daynav__hint">Étape suivante</span>
        <span class="daynav__title">${text(next.dayLabel)} · ${text(next.to)}</span>
      </a>`
      : `<a class="daynav__link daynav__link--next" href="${base}">
        <span class="daynav__hint">Fin de la boucle</span>
        <span class="daynav__title">Toutes les étapes</span>
      </a>`}
  </nav>`;
}
