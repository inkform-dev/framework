import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

// One clean, airy sans voice throughout — headings are the same face at
// heavier weight, not a second typeface. Plus Jakarta Sans reads warmer and
// more open than Birch's Inter, matching Feather's "lightweight, low visual
// weight" identity (theme.css maps --fw-font-heading to this same family).
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Feather Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No forced color scheme — the framework follows system preference /
  // localStorage (see themeInitScript below), same as every other theme.
  // Feather is light-mode-FORWARD (its design identity, like Luma's own
  // site) but does not force light mode on a user whose system/stored
  // preference is dark.
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
