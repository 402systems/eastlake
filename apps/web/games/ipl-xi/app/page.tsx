import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">
          IPL <span className="text-purple-400">V</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-slate-400">
          5 random IPL squads. Pick one player from each. Build the ultimate
          five across opener, middle order, all-rounder, spin bowler, and pace bowler.
        </p>
      </div>
      <Link
        href="/game"
        className="rounded-2xl bg-purple-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-purple-900/40 transition-colors hover:bg-purple-400"
      >
        Play →
      </Link>
    </main>
  );
}
