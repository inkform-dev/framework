/**
 * Pagefind indexing after `astro build`. Reads the prerendered docs pages
 * from the static output folder and writes the index next to them, at
 * `<base>/_pagefind/`, so a host's own `/_pagefind` (if it has one) is left
 * alone. Only each page's `[data-pagefind-body]` region (the article) is
 * indexed; the shell around it is not.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { joinHref } from '@inkform/framework/routes';
// Imported up front: the integration runs inside Astro's config loader, which
// is closed by the time build hooks run, so a dynamic import() here fails.
// Pagefind starts its binary on the first createIndex(), not on import.
import * as pagefind from 'pagefind';

export interface SearchIndexInput {
  /** Absolute path of the static output folder (`dir` in `astro:build:done`). */
  outDir: string;
  /** Route base, e.g. `/docs`: where the pages are on disk under `outDir`. */
  base: string;
  /** Link base readers see, e.g. `/docs`, or `''` behind a host rewrite. */
  publicBase: string;
  trailingSlash: 'always' | 'never' | 'ignore';
}

export const INDEX_DIR = '_pagefind';

/**
 * The URL readers use for a built page, from its path under the docs folder:
 * `quickstart/index.html` and `quickstart.html` → `/docs/quickstart`,
 * `index.html` → `/docs`.
 */
export function pageUrl(relativeHtmlPath: string, publicBase: string, trailingSlash: SearchIndexInput['trailingSlash']): string {
  const route = relativeHtmlPath
    .split(path.sep)
    .join('/')
    .replace(/(^|\/)index\.html$/, '')
    .replace(/\.html$/, '');
  const url = joinHref(publicBase, route);
  return trailingSlash === 'always' && !url.endsWith('/') ? `${url}/` : url;
}

async function htmlFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => path.join(e.parentPath, e.name))
    .filter((file) => !path.relative(dir, file).split(path.sep).includes(INDEX_DIR));
}

export interface SearchIndexResult {
  pages: number;
  outputPath: string;
}

export async function buildSearchIndex(input: SearchIndexInput): Promise<SearchIndexResult> {
  const docsDir = path.join(input.outDir, ...input.base.split('/').filter(Boolean));
  const outputPath = path.join(docsDir, INDEX_DIR);
  const files = await htmlFiles(docsDir);
  if (files.length === 0) return { pages: 0, outputPath };

  const fail = (step: string, errors: string[]): never => {
    throw new Error(`[@inkform/astro] Pagefind ${step} failed:\n${errors.join('\n')}`);
  };

  const { index, errors: createErrors } = await pagefind.createIndex({});
  if (!index) return fail('createIndex', createErrors);
  let indexFiles: { path: string; content: Uint8Array }[];
  try {
    for (const file of files) {
      const url = pageUrl(path.relative(docsDir, file), input.publicBase, input.trailingSlash);
      const { errors } = await index.addHTMLFile({ url, content: await readFile(file, 'utf8') });
      if (errors.length) fail(`indexing ${url}`, errors);
    }
    // Pagefind's own writeFiles() can resolve before the files are on disk
    // (seen as empty pagefind.js / pagefind-entry.json in roughly one build
    // in four), so the index is taken in memory and written here instead.
    const result = await index.getFiles();
    if (result.errors.length) fail('getFiles', result.errors);
    indexFiles = result.files;
  } finally {
    await pagefind.close();
  }

  await rm(outputPath, { recursive: true, force: true });
  for (const file of indexFiles) {
    const target = path.join(outputPath, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
  return { pages: files.length, outputPath };
}
