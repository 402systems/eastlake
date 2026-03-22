import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required in 2025 for monorepos:
  // Tells Next.js to look for source code in these local packages
  transpilePackages: ['@402systems/lib/core/ui'],

  // Clean URLs and production optimizations
  reactStrictMode: true,

  // This allows you to deploy each app independently as a Docker container
  output: 'export',

  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
