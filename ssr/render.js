import { promises as fs } from 'fs';
import path from 'path';

// For "server side"
import Koa from 'koa';
import send from 'koa-send';

// For "client side"
import fetch from 'node-fetch';
import AbortController from 'abort-controller';

// Pretty print HTML for easier debugging
import xmlFormat from 'xml-formatter';

import {
  Node,
  Text,
  Element,
  Document,
  DocumentFragment,
  Event
} from 'softdom';

const ROOT_DIR = '../serve';
const SERVER_PORT = 3000;

// @ts-ignore TS module is ESNext...
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const asPublicPath = filepath => path.join(__dirname, ROOT_DIR, filepath);

// Server
const app = new Koa();
app.use(async (ctx) => {
  await send(ctx, ctx.path, { root: path.join(__dirname, ROOT_DIR) });
});
const server = app.listen(SERVER_PORT);
console.log(`Koa server listening on ${SERVER_PORT}`);

// Client
const window = {
  // Constructors
  Document,
  DocumentFragment,
  Node,
  Text,
  Element,
  SVGElement: Element,
  Event,
  AbortController,
  // Many properties are hard to support, for instance, window.location isn't a
  // string, it's a "Location" object. Also "window" isn't defined so using
  // properties like "window.innerHeight" wouldn't be accessible
};

// Patch fetch() to be able to wait for all active requests
const networkRequests = [];

window.fetch = (url, ...args) => {
  // Convert relative and absolute paths to full URLs needed by node-fetch
  if (!url.match(/^https?:\/\//)) {
    url = new URL(`http://localhost:${SERVER_PORT}/${url}`).toString();
  }
  const reqStart = Date.now();
  const req = fetch(url, ...args);
  networkRequests.push(req.then(() => {
    const reqEnd = Date.now();
    console.log(`Fetch '${url}': ${reqEnd - reqStart}ms`);
  }));
  return req;
};

const document = new Document();
window.document = document;
document.defaultView = window;

// Allows statements like "if (el instanceof Node)" as Node is a global
for (const key in window) global[key] = window[key];

// Note that "window" isn't global so "typeof window === undefined" checks work
// @ts-ignore
global.document = document;

// Create the initial blank DOM
document.documentElement = document.createElement('html');
document.head = document.createElement('head');
document.body = document.createElement('body');

document.appendChild(document.documentElement);
document.documentElement.appendChild(document.head);
document.documentElement.appendChild(document.body);

(async () => {
  console.time('Render');
  await import(asPublicPath('index.js'));
  console.timeEnd('Render');
  await Promise.all(networkRequests);

  // General buffer to let things settle. Maybe a necessary evil in SSR
  await new Promise((resolve) => setTimeout(resolve, 500));
  server.close();
  console.log('Koa server stopped');

  console.time('Serialize');
  // XML formatter requires a single root node else it drops content out of tags
  const serialized = xmlFormat(`<root>${document.body.innerHTML}`, {
    indentation: '  ',
    collapseContent: true,
  })
  // Remove the root...
    .replace(/^<root>\s*/, '')
    .replace(/\s*<\/root>$/, '');
  console.timeEnd('Serialize');

  const inPath = asPublicPath('index.html');
  const indexHTML = await fs.readFile(inPath, 'utf-8');
  const outPath = asPublicPath('indexSSR.html');
  await fs.writeFile(outPath, indexHTML.replace('<!--SSR-->', serialized));

  console.log('Written to:', outPath);
})();
