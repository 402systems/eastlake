import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@402systems/lib/core/ui',
    '@402systems/lib-core-supabase-auth',
  ],

  reactStrictMode: true,

  output: 'export',

  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
