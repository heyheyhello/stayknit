import { promises as fs } from 'fs';
import path from 'path';

// For "server side"
// If you have a full backend server written, turn it on here instead
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
} from './softdom.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootPublicDir = '../../serve';
const asPublicPath = filepath => path.join(__dirname, rootPublicDir, filepath);

// Server
const app = new Koa();
app.use(async (ctx) => {
  await send(ctx, ctx.path, { root: path.join(__dirname, rootPublicDir) });
});
const server = app.listen(3000);
console.log('Koa server listening on 3000');

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
    url = new URL(`http://localhost:3000/${url}`).toString();
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

// XXX: Convention to detect SSR when "window" isn't set, so don't set it
// XXX: global.window = window;
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

  // Pull out SSR observables
  // ... ugh trace.meta isn't iterable
  // ... maybe the best way is to tap into api.insert/api.property?

  console.time('Serialize');
  const serialized = xmlFormat(document.body.innerHTML, {
    indentation: ' '.repeat(4),
    collapseContent: true,
  });
  console.timeEnd('Serialize');

  const inPath = asPublicPath('index.html');
  const indexHTML = await fs.readFile(inPath, 'utf-8');
  const outPath = asPublicPath('indexSSR.html');
  await fs.writeFile(outPath, indexHTML.replace(/[ ]*<!--SSR-->/, serialized));

  console.log('Written to:', outPath);
})();
