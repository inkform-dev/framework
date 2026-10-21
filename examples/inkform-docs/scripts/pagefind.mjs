#!/usr/bin/env node
/**
 * Postbuild: builds the Pagefind search index from this app's prerendered HTML.
 *
 * A plain `next build` writes static pages to .next/server/app/<route>.html.
 * Built with a deployment adapter (Vercel uses one, and from Next.js 16.3.8 it
 * changes the layout), the same pages land in
 * .next/server/route-cache/APP_PAGE/<hash>/$/<route>.html instead, and
 * `pagefind --site .next/server/app` finds nothing and fails the build. This
 * reads both layouts and hands Pagefind each page's real URL (/docs/intro, not
 * /docs/intro.html), using Pagefind's Node API.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as pagefind from 'pagefind';

const SERVER_DIR = path.join('.next', 'server');
const OUTPUT_PATH = path.join('public', '_pagefind');
// Next's own error pages are not search results.
const SKIP = new Set(['/_not-found', '/_global-error']);

async function htmlFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/** "docs/intro.html" → "/docs/intro"; "index.html" → "/". */
function toUrl(relativeHtmlPath) {
  const route = `/${relativeHtmlPath.split(path.sep).join('/').replace(/\.html$/, '')}`;
  return route === '/index' ? '/' : route;
}

const pages = new Map();

// Plain build: .next/server/app/<route>.html
const appDir = path.join(SERVER_DIR, 'app');
for (const file of await htmlFiles(appDir)) {
  pages.set(toUrl(path.relative(appDir, file)), file);
}

// Adapter build: .next/server/route-cache/APP_PAGE/<hash>/$/<route>.html
const routeCacheDir = path.join(SERVER_DIR, 'route-cache', 'APP_PAGE');
for (const file of await htmlFiles(routeCacheDir)) {
  const [, marker, ...route] = path.relative(routeCacheDir, file).split(path.sep);
  if (marker === '$' && route.length) pages.set(toUrl(route.join(path.sep)), file);
}

for (const url of SKIP) pages.delete(url);

if (pages.size === 0) {
  console.error(`[pagefind] No prerendered HTML found under ${SERVER_DIR}. Run \`next build\` first.`);
  process.exit(1);
}

const fail = (step, errors) => {
  console.error(`[pagefind] ${step} failed:\n${errors.join('\n')}`);
  process.exit(1);
};

const { index, errors: createErrors } = await pagefind.createIndex();
if (!index) fail('createIndex', createErrors);

for (const [url, file] of pages) {
  const { errors } = await index.addHTMLFile({ url, content: await readFile(file, 'utf8') });
  if (errors.length) fail(`Indexing ${url}`, errors);
}

const { errors: writeErrors } = await index.writeFiles({ outputPath: OUTPUT_PATH });
if (writeErrors.length) fail('writeFiles', writeErrors);
await pagefind.close();

console.log(`[pagefind] Indexed ${pages.size} pages into ${OUTPUT_PATH}`);
