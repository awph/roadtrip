import { escapeHtml, text } from '../lib/format.js';
import { layout } from './layout.js';

const URL_PATTERN = /\b((?:[a-z0-9-]+\.)+(?:fr|ch|com|it|org|net))\b/i;
const PHONE_PATTERN = /^(.*?)\s*:\s*(\d{2,4})$/;

export function practicalPage({ base, trip }) {
  const { meta, practical } = trip;

  const content = `<header class="pagehead">
  <h1 class="pagehead__title">Pratique</h1>
  <p class="pagehead__lede">Numéros, états de route et rappels à garder sous la main.</p>
</header>

<main id="contenu">
  <div class="accordion">
    ${practical.sections.map((section, index) => sectionBlock(section, index)).join('\n    ')}
  </div>
</main>`;

  return layout({
    base,
    title: 'Pratique',
    description: `Numéros d’urgence, état des cols et check-list matériel pour le ${meta.title}.`,
    path: 'pratique/',
    bodyClass: 'page-practical',
    active: 'pratique',
    meta,
    content,
  });
}

function sectionBlock(section, index) {
  return `<details class="accordion__item"${index === 0 ? ' open' : ''}>
      <summary class="accordion__summary">
        <span class="accordion__title">${text(section.title)}</span>
        <span class="accordion__chevron" aria-hidden="true"></span>
      </summary>
      <ul class="bullets">
        ${section.items.map((item) => {
          const rendered = renderItem(item);
          const isRow = rendered.startsWith('<a class="rowlink"');
          return `<li${isRow ? ' class="bullets__row"' : ''}>${rendered}</li>`;
        }).join('\n        ')}
      </ul>
    </details>`;
}

/**
 * Emergency numbers and road-status sites become full-width rows rather than
 * inline links: they are tapped with gloves on, so they need a real target.
 */
function renderItem(item) {
  const phone = PHONE_PATTERN.exec(item);
  if (phone) {
    return `<a class="rowlink" href="tel:${escapeHtml(phone[2])}">
          <span class="rowlink__label">${text(phone[1])}</span>
          <span class="rowlink__value rowlink__value--number">${escapeHtml(phone[2])}</span>
        </a>`;
  }

  const url = URL_PATTERN.exec(item);
  if (url) {
    const domain = url[1];
    const label = item.slice(0, url.index).replace(/\s*:\s*$/, '').trim();
    return `<a class="rowlink" href="https://${escapeHtml(domain)}" rel="noopener">
          ${label ? `<span class="rowlink__label">${text(label)}</span>` : ''}
          <span class="rowlink__value">${escapeHtml(domain)}</span>
        </a>`;
  }

  return text(item);
}
