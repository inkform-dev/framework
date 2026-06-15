import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@freewrite-cms/framework'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;
