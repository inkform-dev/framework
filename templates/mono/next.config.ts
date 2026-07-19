import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inkform/framework'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // Pagefind indexes .next/server/app's built .html files directly, so its
  // search results carry a trailing .html this app doesn't actually serve
  // (e.g. /essentials/markdown.html) — this app's real routes are
  // extensionless. Redirect (not rewrite) so the address bar ends up on the
  // real, shareable permalink; query params (?q=... for highlighting) are
  // preserved automatically.
  async redirects() {
    return [{ source: '/:path*.html', destination: '/:path*', permanent: false }];
  },
};

export default nextConfig;
