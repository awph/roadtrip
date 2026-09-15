import { escapeHtml, text } from '../lib/format.js';

/**
 * Wraps a page body in the shared document shell.
 * `base` lets the site live at the domain root or under a repository subpath.
 */
export function layout({
  base,
  title,
  description,
  path,
  bodyClass = '',
  content,
  meta,
  active,
}) {
  const fullTitle = title === meta.title ? meta.title : `${title} · ${meta.title}`;
  const canonical = `${base}${path}`.replace(/\/{2,}/g, '/');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${text(fullTitle)}</title>
<meta name="description" content="${text(description)}">
<meta name="theme-color" content="#0E0E0E">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${text(meta.title)}">
<meta property="og:title" content="${text(fullTitle)}">
<meta property="og:description" content="${text(description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${text(fullTitle)}">
<meta name="twitter:description" content="${text(description)}">
<link rel="manifest" href="${base}manifest.webmanifest">
<link rel="icon" href="${base}icons/icone.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${base}icons/icone-180.png">
<link rel="stylesheet" href="${base}styles/tokens.css">
<link rel="stylesheet" href="${base}styles/app.css">
</head>
<body class="${escapeHtml(bodyClass)}" data-base="${escapeHtml(base)}">
<a class="skip-link" href="#contenu">Aller au contenu</a>
<div class="offline-flag" id="indicateur-hors-ligne" hidden>Hors ligne — contenu enregistré</div>
${content}
${bottomNav(base, active)}
<script src="${base}app.js" defer></script>
</body>
</html>
`;
}

/** Primary navigation sits at the bottom of the screen, within thumb reach. */
function bottomNav(base, active) {
  const items = [
    { key: 'accueil', href: `${base}`, label: 'Étapes', icon: iconRoute() },
    { key: 'hotels', href: `${base}hotels/`, label: 'Hôtels', icon: iconBed() },
    { key: 'pratique', href: `${base}pratique/`, label: 'Pratique', icon: iconTools() },
  ];

  return `<nav class="tabbar" aria-label="Navigation principale">
  ${items.map((item) => `<a class="tabbar__item${item.key === active ? ' is-active' : ''}" href="${escapeHtml(item.href)}"${item.key === active ? ' aria-current="page"' : ''}>
    ${item.icon}
    <span class="tabbar__label">${text(item.label)}</span>
  </a>`).join('\n  ')}
</nav>`;
}

// Hand-drawn, angular icons: closer to a stencil than to a generic icon set.
function iconRoute() {
  return `<svg class="tabbar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 21V9a3 3 0 0 1 3-3h6a3 3 0 0 0 3-3" />
    <path d="M6 3v2M6 7v2" />
    <circle cx="18" cy="3" r="0.6" />
  </svg>`;
}

function iconBed() {
  return `<svg class="tabbar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 18V7" />
    <path d="M3 12h18v6" />
    <path d="M21 18v2M3 18v2" />
    <path d="M7 12V9h5v3" />
  </svg>`;
}

function iconTools() {
  return `<svg class="tabbar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 20l7-7" />
    <path d="M13 11l3-3a3.5 3.5 0 0 1 4.5-4.5L18 6l1.5 1.5L22 5a3.5 3.5 0 0 1-4.5 4.5l-3 3" />
    <path d="M4 4l4 4" />
  </svg>`;
}
