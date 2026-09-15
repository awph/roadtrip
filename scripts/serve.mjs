#!/usr/bin/env node
// Serveur local pour relire le site avant publication : `npm run preview`.
// Sert dist/ tel quel, avec les URL de dossier (/jour/3/) et la page 404.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gpx': 'application/gpx+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');

  try {
    let file = join(root, path);
    const info = await stat(file).catch(() => null);
    if (!info || info.isDirectory()) file = join(root, path, 'index.html');

    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    response.end(body);
  } catch {
    try {
      const body = await readFile(join(root, '404.html'));
      response.writeHead(404, { 'content-type': TYPES['.html'] });
      response.end(body);
    } catch {
      response.writeHead(404).end('404');
    }
  }
});

server.listen(port, () => {
  console.log(`Aperçu sur http://localhost:${port}/`);
});
