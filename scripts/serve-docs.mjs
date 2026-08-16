import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'site-dist'
);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8']
]);

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    let file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);

    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      sendError(response, 403, 'Forbidden');
      return;
    }

    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');

    response.writeHead(200, {
      'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=300',
      'Content-Type': types.get(path.extname(file)) || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    createReadStream(file).pipe(response);
  } catch {
    sendError(response, 404, 'Not found');
  }
}).listen(port, host, () => {
  console.log(`Documentation available at http://127.0.0.1:${port}`);
});

function sendError(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(`${message}\n`);
}
