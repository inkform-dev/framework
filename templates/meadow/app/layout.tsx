import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

// One clean sans voice throughout — headings are the same face at heavier
// weight, not a second typeface. Plus Jakarta Sans reads warm and geometric,
// matching Meadow's Aspen-inspired amber/gold identity (and gives Meadow its
// own typographic voice, distinct from Birch's Inter).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Meadow Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme init — must run synchronously before first paint.
            Meadow is light-mode-forward by design intent, but there is no
            way to actually force that here: themeInitScript (see
            @inkform/framework/theme-toggle) always runs on the client before
            first paint and sets the `dark` class from localStorage, falling
            back to prefers-color-scheme — it does not read or defer to
            anything this file could set server-side (a hardcoded
            data-theme="light" attribute would just be overwritten a moment
            later). Both theme.css blocks are written to look intentional;
            which one a given visitor sees is entirely up to their own
            system/browser preference. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
