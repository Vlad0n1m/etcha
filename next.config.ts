import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use Turbopack (Next.js 16 default)
  turbopack: {},
  // Server external packages
  serverExternalPackages: [
    'secp256k1',
    '@bundlr-network/client',
    '@metaplex-foundation/js',
  ],
};

export default nextConfig;
