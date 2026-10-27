/** Modules the integration's Vite plugin serves (see ../src/vite-plugin.ts). */

declare module 'virtual:@inkform/astro/config' {
  const config: import('./options').ResolvedOptions;
  export default config;
}

/** Imports the theme and `customCss` files, in order. No exports. */
declare module 'virtual:@inkform/astro/user-css' {}

declare module 'virtual:@inkform/astro/mermaid' {
  /** Renders every `[data-fw-mermaid]` figure on the page; a no-op when the `mermaid` option is off. */
  export function mountMermaid(): void;
}

declare module 'virtual:@inkform/astro/components' {
  /** The site's `components` module (every export), or `{}` without the option. */
  const components: Record<string, unknown>;
  export default components;
}
