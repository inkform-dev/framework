/**
 * Serves the integration's virtual modules and reloads the browser when the
 * content folder changes in `astro dev`.
 *
 * - `virtual:@inkform/astro/config`: the resolved options, read by the routes.
 * - `virtual:@inkform/astro/user-css`: imports the theme and `customCss` files.
 * - `virtual:@inkform/astro/mermaid`: the diagram renderer when the `mermaid`
 *   option is on, an empty function when it's off, so a site without diagrams
 *   never resolves (or needs) the `mermaid` package.
 * - `virtual:@inkform/astro/components`: the site's `components` module as a
 *   namespace object, or an empty one without the option.
 */

import path from 'node:path';
import type { AstroConfig } from 'astro';
import type { ResolvedOptions } from './options';

type VitePlugin = NonNullable<NonNullable<AstroConfig['vite']>['plugins']>[number];

export const VIRTUAL_CONFIG = 'virtual:@inkform/astro/config';
export const VIRTUAL_USER_CSS = 'virtual:@inkform/astro/user-css';
export const VIRTUAL_MERMAID = 'virtual:@inkform/astro/mermaid';
export const VIRTUAL_COMPONENTS = 'virtual:@inkform/astro/components';
const VIRTUAL_IDS = new Set([VIRTUAL_CONFIG, VIRTUAL_USER_CSS, VIRTUAL_MERMAID, VIRTUAL_COMPONENTS]);

export interface VitePluginInput {
  options: ResolvedOptions;
  /** Absolute paths of the CSS files to load after the framework's styles, in order. */
  css: string[];
  /** Absolute path of client/mermaid.ts. */
  mermaidClient: string;
}

/** Normalized for a JS import specifier on any OS. */
const importPath = (file: string) => JSON.stringify(file.split(path.sep).join('/'));

export function virtualModuleSource(id: string, { options, css, mermaidClient }: VitePluginInput): string | undefined {
  switch (id) {
    case VIRTUAL_CONFIG:
      return `export default ${JSON.stringify(options)};`;
    case VIRTUAL_USER_CSS:
      return css.map((file) => `import ${importPath(file)};`).join('\n');
    case VIRTUAL_MERMAID:
      return options.mermaid
        ? `export { mountMermaid } from ${importPath(mermaidClient)};`
        : 'export function mountMermaid() {}';
    case VIRTUAL_COMPONENTS:
      return options.components
        ? `import * as components from ${importPath(options.components)};\nexport default components;`
        : 'export default {};';
    default:
      return undefined;
  }
}

interface DevServer {
  watcher: { add(paths: string): unknown; on(event: string, cb: (file: string) => void): unknown };
  ws?: { send(payload: { type: 'full-reload'; path?: string }): void };
}

export function inkformVitePlugin(input: VitePluginInput): VitePlugin {
  const contentRoot = input.options.contentRoot;
  return {
    name: '@inkform/astro',
    resolveId(id: string) {
      return VIRTUAL_IDS.has(id) ? `\0${id}` : undefined;
    },
    load(id: string) {
      return id.startsWith('\0') ? virtualModuleSource(id.slice(1), input) : undefined;
    },
    configureServer(server: DevServer) {
      // Pages are read from the content folder at request time in dev, so a
      // reload is all an edit needs.
      server.watcher.add(contentRoot);
      const reload = (file: string) => {
        if (path.resolve(file).startsWith(contentRoot + path.sep)) server.ws?.send({ type: 'full-reload', path: '*' });
      };
      for (const event of ['change', 'add', 'unlink']) server.watcher.on(event, reload);
    },
  } as VitePlugin;
}
