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
    ],
  },
  // Exclude example/reference files from build
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Ignore native modules that can't be used in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'graceful-fs': false,
      };
      
      // Ignore bundlr native dependencies on client
      // Make secp256k1 resolve to empty module on client
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'secp256k1': false,
        '@bundlr-network/client': false,
        'avsc': false,
        'arbundles': false,
      };
      
      // Ignore bundlr storage driver completely on client
      config.resolve.alias['@metaplex-foundation/js/dist/esm/plugins/bundlrStorage'] = false;
      
      // Ignore additional Node.js modules used by bundlr dependencies
      config.resolve.alias['util'] = false;
      
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
