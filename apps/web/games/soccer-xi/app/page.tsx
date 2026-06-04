import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">
          Soccer <span className="text-green-400">XI</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-slate-400">
          11 random clubs. Pick one player from each. Build the best squad you
          can.
        </p>
      </div>
      <Link
        href="/game"
        className="rounded-2xl bg-green-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-green-900/40 transition-colors hover:bg-green-400"
      >
        Play →
      </Link>
    </main>
  );
}
