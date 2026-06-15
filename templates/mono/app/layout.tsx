import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import '@freewrite-cms/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@freewrite-cms/framework/theme-toggle';
import { loadDocsConfig } from '@freewrite-cms/framework/content';

/*
 * Mono theme: monospace everywhere.
 * JetBrains Mono is loaded into --font-mono; theme.css maps all three
 * font slots (--fw-font, --fw-font-heading, --fw-mono) to it.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Mono Docs';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Documentation for ${name}`,
    icons: { icon: config?.favicon ?? '/favicon.svg' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
