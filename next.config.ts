import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@x402/svm/exact/client': './lib/empty-module.js',
    },
  },
};

export default nextConfig;