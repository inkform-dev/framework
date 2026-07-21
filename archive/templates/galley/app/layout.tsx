import type { Metadata } from 'next';
import { Newsreader, JetBrains_Mono } from 'next/font/google';
import '@inkform/framework/styles.css';
import './theme.css';
import { themeInitScript } from '@inkform/framework/theme-toggle';
import { loadDocsConfig } from '@inkform/framework/content';

// Two-voice typography: Newsreader is the human/prose voice (display +
// long-form reading), General Sans is the UI voice (loaded via a <link> tag
// in <head> below — it's a Fontshare font, not on Google Fonts, so it can't
// go through next/font/google), JetBrains Mono is the machine voice (anything
// Git touches: paths, hashes, commits, code). Matches the Galley design
// system's own font stack exactly (see the inkform-design skill).
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const config = loadDocsConfig();
  const name = config?.name ?? 'Galley Docs';
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
      className={`${newsreader.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash theme init — must run synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* General Sans — Fontshare (not on Google Fonts). See the
            inkform-design skill's readme.md § Fonts: CDN for now, self-host
            by dropping binaries in assets/fonts/ and swapping this for a
            local @font-face rule. */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
