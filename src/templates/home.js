import {
  formatDateShort, formatDistance, formatDuration, formatNumber, text,
} from '../lib/format.js';
import { routeMap } from '../lib/profile.js';
import { layout } from './layout.js';

export function homePage({ base, trip, stats }) {
  const { meta, days } = trip;

  const content = `<header class="masthead">
  <p class="masthead__eyebrow">${text(meta.subtitle)}</p>
  <h1 class="masthead__title">${text(meta.title)}</h1>
  <p class="masthead__dates">${text(meta.dates)}</p>
  <dl class="keyfigures">
    <div class="keyfigure">
      <dt class="keyfigure__label">Distance</dt>
      <dd class="keyfigure__value">${text(formatDistance(stats.totalDistanceKm))}</dd>
    </div>
    <div class="keyfigure">
      <dt class="keyfigure__label">Roulage</dt>
      <dd class="keyfigure__value">${text(stats.totalRidingTime)}</dd>
    </div>
    <div class="keyfigure">
      <dt class="keyfigure__label">Cols</dt>
      <dd class="keyfigure__value">${text(formatNumber(stats.totalCols))}</dd>
    </div>
    <div class="keyfigure">
      <dt class="keyfigure__label">Étapes</dt>
      <dd class="keyfigure__value">${text(formatNumber(days.length))}</dd>
    </div>
  </dl>
</header>

<main id="contenu">
  <section class="panel" aria-labelledby="titre-boucle">
    <h2 class="panel__title" id="titre-boucle">La boucle</h2>
    ${routeMap(days, meta.mapPoints)}
  </section>

  <section class="panel" aria-labelledby="titre-etapes">
    <h2 class="panel__title" id="titre-etapes">Les étapes</h2>
    <ol class="daylist">
      ${days.map((day) => dayCard(base, day)).join('\n      ')}
    </ol>
  </section>

  <section class="panel panel--muted">
    <h2 class="panel__title">Équipage</h2>
    <p class="prose">${text(meta.riders.join(', '))}.</p>
  </section>
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
  const headline = day.cols.slice(0, 3).map((col) => col.name);

  return `<li class="daycard">
        <a class="daycard__link" href="${base}jour/${day.id}/">
          <span class="plate" aria-hidden="true">${day.id}</span>
          <span class="daycard__body">
            <span class="daycard__date">${text(formatDateShort(day.date))}</span>
            <span class="daycard__route">${text(day.from)} <span class="arrow" aria-hidden="true">→</span><span class="visually-hidden"> vers </span> ${text(day.to)}</span>
            <span class="daycard__figures">
              <span class="figure">${text(formatDistance(day.distanceKm))}</span>
              <span class="figure">${text(formatDuration(day.ridingTime))}</span>
            </span>
            ${headline.length ? `<span class="daycard__cols">${text(headline.join(' · '))}</span>` : ''}
          </span>
        </a>
      </li>`;
}
