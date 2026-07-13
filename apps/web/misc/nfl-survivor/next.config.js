import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@eastlake/lib-core-ui',
    '@eastlake/lib-core-supabase-auth',
  ],

  reactStrictMode: true,

  output: 'export',

  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
