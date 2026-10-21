import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inkform/framework'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // Search indexes built with `pagefind --site .next/server/app` linked to
  // each page's .html file (e.g. /essentials/markdown.html), which this app
  // doesn't serve — its real routes are extensionless. scripts/pagefind.mjs
  // now indexes the real URLs; this redirect keeps old links working.
  // Redirect (not rewrite) so the address bar ends up on the real, shareable
  // permalink; query params (?q=... for highlighting) are preserved.
  async redirects() {
    return [{ source: '/:path*.html', destination: '/:path*', permanent: false }];
  },
};

export default nextConfig;
