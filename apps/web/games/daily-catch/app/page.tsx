'use client';

import dynamic from 'next/dynamic';

// The battle engine runs entirely in the browser (the date and storage are
// per-player), so the game is never server-rendered.
const DailyCatch = dynamic(() => import('@/components/DailyCatch'), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-slate-400">Loading…</p>,
});

export default function Page() {
  return <DailyCatch />;
}
