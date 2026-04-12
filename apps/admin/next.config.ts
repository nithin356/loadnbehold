import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@loadnbehold/types',
    '@loadnbehold/constants',
    '@loadnbehold/validators',
    '@loadnbehold/design-tokens',
    '@loadnbehold/config',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
    ],
  },
};

export default nextConfig;
