import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
    // Allow local uploads
    unoptimized: false,
  },
  // Exclude example/reference files from build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore native modules that can't be used in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'graceful-fs': false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      };
      
      // Ignore bundlr native dependencies on client
      // Make secp256k1 resolve to empty module on client
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'secp256k1': false,
        '@bundlr-network/client': false,
        'avsc': false,
        'arbundles': false,
        'fs': false,
      };
      
      // Ignore bundlr storage driver completely on client
      config.resolve.alias['@metaplex-foundation/js/dist/esm/plugins/bundlrStorage'] = false;
      
      // Ignore Metaplex JS SDK from client bundle completely
      // Only use it on server (API routes)
      config.resolve.alias['@metaplex-foundation/js'] = false;
      
      // Add Buffer and process polyfills
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack')).ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
      
      // Ignore native modules that cause issues
      config.externals = config.externals || [];
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
    }
    
    // For server-side, also exclude problematic modules
    if (isServer) {
      config.externals = config.externals || [];
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
      config.externals.push({
        'secp256k1': 'commonjs secp256k1',
        '@bundlr-network/client': 'commonjs @bundlr-network/client',
      });
    }
    
    return config;
  },
};

export default nextConfig;
