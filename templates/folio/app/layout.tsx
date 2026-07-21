import type { Metadata } from 'next';
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Two-voice typography, Willow's signature move: a serif display voice for
// headings (H1s especially), distinct from the sans body/UI voice above and
// the mono voice below. Every other theme in this repo uses one typeface for
// both — Folio is deliberately the exception, wired to --fw-font-heading in
// theme.css.
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Folio Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
