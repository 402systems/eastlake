import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@eastlake/lib/core/ui'],
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
  // Don't generate AGENTS.md / CLAUDE.md in the app directory on `next dev`.
  agentRules: false,
};

export default nextConfig;
