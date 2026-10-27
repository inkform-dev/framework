import node from '@astrojs/node';
import react from '@astrojs/react';
import inkform from '@inkform/astro';
import { defineConfig } from 'astro/config';

// A host app shaped like the forms app: on-demand pages by default, React
// islands on its own pages, Astro's CSP on. The docs live under /docs and
// are prerendered.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    inkform({
      base: '/docs',
      contentRoot: './content',
      mermaid: true,
      // The site's own MDX components, and the CSS they use.
      components: './src/mdx-components.tsx',
      customCss: ['./src/styles/docs.css'],
      // "Built with Inkform" under each page. Off unless a site turns it on.
      credits: true,
    }),
  ],
  // This site has no Markdown pages of its own. Docs code blocks are
  // highlighted by the integration, which keeps their colors CSP-safe.
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        // The API Reference's Try It console calls the API from the browser.
        "connect-src 'self' https://api.example.com",
        'frame-src https://www.youtube.com',
        "object-src 'none'",
      ],
    },
  },
});
