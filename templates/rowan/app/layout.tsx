import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

// One clean sans voice throughout — headings are the same face at heavier
// weight, not a second typeface. The Maple reference site doesn't use a
// serif display face either, so there's no second voice to add here (same
// call Birch made — see its app/layout.tsx).
const inter = Inter({
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
  const name = config?.name ?? 'Rowan Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
