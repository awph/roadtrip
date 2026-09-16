import {
  formatDateShort, formatDistance, formatDuration, formatNumber, text,
} from '../lib/format.js';
import { routeMap } from '../lib/profile.js';
import { layout } from './layout.js';

export function homePage({ base, trip, stats }) {
  const { meta, days } = trip;

  const content = `<header class="masthead">
  <p class="masthead__eyebrow"><span class="masthead__dash" aria-hidden="true"></span>Road book · Alpes</p>
  <h1 class="masthead__title">${text(meta.title)}</h1>
  <p class="masthead__lede">${text(meta.tagline || meta.description)}</p>
  <dl class="masthead__figures">
    <div>
      <dt>Dates</dt>
      <dd>${text(meta.dates)}</dd>
    </div>
    <div>
      <dt>Total</dt>
      <dd>${text(formatDistance(stats.totalDistanceKm))}</dd>
    </div>
    <div>
      <dt>Selle</dt>
      <dd>${text(stats.totalRidingTime)}</dd>
    </div>
  </dl>
</header>

<main id="contenu">
  <section class="block" aria-labelledby="titre-boucle">
    <h2 class="block__title" id="titre-boucle">La boucle</h2>
    ${meta.intro ? `<p class="prose">${text(meta.intro)}</p>` : ''}
    ${routeMap(days, meta.mapPoints)}
  </section>

  <section class="block" aria-labelledby="titre-etapes">
    <h2 class="block__title" id="titre-etapes">Les étapes</h2>
    <ol class="daylist">
      ${days.map((day) => dayCard(base, day)).join('\n      ')}
    </ol>
  </section>

  <section class="block" aria-labelledby="titre-equipage">
    <h2 class="block__title" id="titre-equipage">Équipage</h2>
    <p class="prose">${text(meta.riders.join(', '))}.</p>
  </section>

  <p class="notice">
    <span class="notice__label">Avant de rouler</span>
    Pneus, huile, pression${' '}: contrôle la veille du départ. Les cols d'altitude peuvent fermer dès la première neige d'octobre.
  </p>
</main>`;

  return layout({
    base,
    title: meta.title,
    description: meta.description,
    path: '',
    bodyClass: 'page-home',
    active: 'accueil',
    meta,
    content,
  });
}

function dayCard(base, day) {
  return `<li>
        <a class="daycard" href="${base}jour/${day.id}/">
          <span class="daycard__num">${String(day.id).padStart(2, '0')}</span>
          <span class="daycard__body">
            <span class="daycard__date">${text(formatDateShort(day.date))}</span>
            <span class="daycard__route">${text(day.from)} <span class="arrow" aria-hidden="true">→</span><span class="visually-hidden"> vers </span> ${text(day.to)}</span>
            ${day.title ? `<span class="daycard__title">${text(day.title)}</span>` : ''}
            <span class="daycard__figures">
              <span>${text(formatDistance(day.distanceKm))}</span>
              <span class="daycard__sep" aria-hidden="true">|</span>
              <span>${text(formatDuration(day.ridingTime))}</span>
              <span class="daycard__sep" aria-hidden="true">|</span>
              <span>${text(formatNumber(day.cols.length))} cols</span>
            </span>
          </span>
        </a>
      </li>`;
}
