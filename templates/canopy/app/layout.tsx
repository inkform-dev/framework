import type { Metadata } from 'next';
import { Figtree, IBM_Plex_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

// One clean sans voice throughout, at a slightly larger size and looser
// leading (see theme.css's .fw-prose override) for the spacious, editorial
// reading feel Sequoia describes itself with — headings are the same face at
// heavier weight, not a second (e.g. serif) typeface. Figtree reads a touch
// warmer/rounder than Birch's Inter, which matters here since Canopy leans
// into a softer, warm-white palette rather than Birch's cooler dark mode.
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Canopy Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
