/**
 * Signs into Supabase and prints the access token (JWT).
 *
 * Usage:
 *   npx tsx scripts/get-token.ts <email> <password>
 *
 * Or set FT_EMAIL and FT_PASSWORD env vars:
 *   FT_EMAIL=you@example.com FT_PASSWORD=secret npx tsx scripts/get-token.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sgsbfelkbsoueiickbrk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BIXr0dVqTzDWsXnfblaIvg_kp2gHCdZ';

const email = process.argv[2] || process.env.FT_EMAIL;
const password = process.argv[3] || process.env.FT_PASSWORD;

if (!email || !password) {
  console.error('Usage: npx tsx scripts/get-token.ts <email> <password>');
  console.error('   or: FT_EMAIL=… FT_PASSWORD=… npx tsx scripts/get-token.ts');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Auth error:', error.message);
    process.exit(1);
  }

  console.log(data.session.access_token);
}

main();
