/**
 * @inkform/astro — serves an Inkform content folder from any Astro 7 site.
 *
 *   // astro.config.ts
 *   import inkform from '@inkform/astro';
 *   export default defineConfig({ integrations: [inkform({ base: '/docs' })] });
 *
 * Adds prerendered routes under `base` only: docs pages from docs.json + MDX,
 * the API Reference from the OpenAPI tab, blog and changelog when those
 * folders have entries, and llms.txt / llms-full.txt. After `astro build` it
 * indexes the docs pages with Pagefind.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { docsRoutePattern, InkformOptionsError, resolveOptions, type InkformOptions, type ResolvedOptions } from './options';
import { buildSearchIndex } from './search-index';
import { inkformVitePlugin } from './vite-plugin';

export type { InkformOptions, ResolvedOptions } from './options';

const PACKAGE = '@inkform/astro';
const here = path.dirname(fileURLToPath(import.meta.url));
const srcFile = (...parts: string[]) => path.join(here, ...parts);

function themeFile(theme: string): string | null {
  if (theme === 'plain') return null;
  if (theme === 'galley') return srcFile('themes', 'galley.css');
  return theme;
}

export default function inkform(options: InkformOptions = {}): AstroIntegration {
  let resolved: ResolvedOptions;

  return {
    name: PACKAGE,
    hooks: {
      'astro:config:setup': ({ config, command, injectRoute, updateConfig, logger }) => {
        resolved = resolveOptions(options, {
          root: fileURLToPath(config.root),
          siteBase: config.base,
          trailingSlash: config.trailingSlash,
          csp: Boolean(config.security?.csp),
          cspAlgorithm: typeof config.security?.csp === 'object' ? config.security.csp.algorithm : undefined,
        });

        const docsJson = path.join(resolved.contentRoot, 'docs', 'docs.json');
        if (!existsSync(docsJson) && !existsSync(path.join(resolved.contentRoot, 'docs', 'freewrite.json'))) {
          throw new InkformOptionsError(
            `${PACKAGE}: no docs.json at ${docsJson}. Set the \`contentRoot\` option to the folder that holds docs/docs.json.`,
          );
        }
        const css = [themeFile(resolved.theme), ...resolved.customCss].filter((f): f is string => f !== null);
        for (const file of css) {
          if (!existsSync(file)) throw new InkformOptionsError(`${PACKAGE}: CSS file not found: ${file}`);
        }

        injectRoute({
          pattern: docsRoutePattern(resolved.base),
          entrypoint: srcFile('routes', 'page.astro'),
          prerender: true,
        });
        if (resolved.llmsTxt) {
          injectRoute({ pattern: `${resolved.base}/llms.txt`, entrypoint: srcFile('routes', 'llms.txt.ts'), prerender: true });
          injectRoute({
            pattern: `${resolved.base}/llms-full.txt`,
            entrypoint: srcFile('routes', 'llms-full.txt.ts'),
            prerender: true,
          });
        }

        updateConfig({
          vite: {
            plugins: [inkformVitePlugin({ options: resolved, css, mermaidClient: srcFile('client', 'mermaid.ts') })],
            // Both packages ship TypeScript source for Vite to compile.
            ssr: { noExternal: ['@inkform/framework', PACKAGE] },
            // In dev, prebundle what the diagram script loads on demand, so
            // the first page with a diagram doesn't trigger a re-optimize.
            ...(command === 'dev' && resolved.mermaid
              ? { optimizeDeps: { include: [`${PACKAGE} > @panzoom/panzoom`, 'mermaid'] } }
              : {}),
          },
        });

        logger.debug(`docs at ${resolved.base || '/'} from ${resolved.contentRoot}`);
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!resolved?.search) return;
        const result = await buildSearchIndex({
          outDir: fileURLToPath(dir),
          base: resolved.base,
          publicBase: resolved.publicBase,
          trailingSlash: resolved.trailingSlash,
        });
        if (result.pages === 0) {
          logger.warn('No docs pages found in the build output, so there is no search index.');
        } else {
          logger.info(`Search: indexed ${result.pages} pages into ${path.relative(process.cwd(), result.outputPath)}`);
        }
      },
    },
  };
}
