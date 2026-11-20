// Local preview server for the prototype. Usage: node serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    // The published page gets a doctype from the host, so add the same one here.
    const out = extname(file) === '.html' ? Buffer.concat([Buffer.from('<!doctype html>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'), body]) : body;
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(out);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(process.env.PORT || 3810, function () { console.log(`Prototype at http://localhost:${this.address().port}`); });
