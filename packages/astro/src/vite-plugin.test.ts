import { describe, expect, it } from 'vitest';
import { resolveOptions } from './options';
import { inkformVitePlugin, VIRTUAL_COMPONENTS, VIRTUAL_CONFIG, VIRTUAL_MERMAID, VIRTUAL_USER_CSS, virtualModuleSource } from './vite-plugin';

const options = resolveOptions({}, { root: '/site', siteBase: '/', trailingSlash: 'ignore', csp: false });
const input = { options, css: ['/pkg/themes/galley.css', '/site/fonts.css'], mermaidClient: '/pkg/client/mermaid.ts' };

describe('virtual modules', () => {
  it('serves the resolved options', () => {
    const source = virtualModuleSource(VIRTUAL_CONFIG, input) ?? '';
    expect(JSON.parse(source.replace(/^export default /, '').replace(/;$/, ''))).toEqual(options);
  });

  it('imports the theme and custom CSS in order', () => {
    expect(virtualModuleSource(VIRTUAL_USER_CSS, input)).toBe('import "/pkg/themes/galley.css";\nimport "/site/fonts.css";');
  });

  it('keeps mermaid out of the graph unless the option is on', () => {
    expect(virtualModuleSource(VIRTUAL_MERMAID, input)).toBe('export function mountMermaid() {}');
    const on = { ...input, options: { ...options, mermaid: true } };
    expect(virtualModuleSource(VIRTUAL_MERMAID, on)).toBe('export { mountMermaid } from "/pkg/client/mermaid.ts";');
  });

  it('re-exports the site’s components module, or nothing without the option', () => {
    expect(virtualModuleSource(VIRTUAL_COMPONENTS, input)).toBe('export default {};');
    const on = { ...input, options: { ...options, components: '/site/src/mdx-components.tsx' } };
    expect(virtualModuleSource(VIRTUAL_COMPONENTS, on)).toBe(
      'import * as components from "/site/src/mdx-components.tsx";\nexport default components;',
    );
  });

  it('resolves only its own ids', () => {
    const plugin = inkformVitePlugin(input) as unknown as { resolveId: (id: string) => string | undefined };
    expect(plugin.resolveId(VIRTUAL_CONFIG)).toBe(`\0${VIRTUAL_CONFIG}`);
    expect(plugin.resolveId(VIRTUAL_COMPONENTS)).toBe(`\0${VIRTUAL_COMPONENTS}`);
    expect(plugin.resolveId('react')).toBeUndefined();
  });
});
