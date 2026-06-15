import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">
          Subway <span className="text-amber-400">Game</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-slate-400">
          Name every stop on a random NYC subway line. Type station names to
          fill in the map before you run out of guesses.
        </p>
      </div>
      <Link
        href="/game"
        className="rounded-2xl bg-amber-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-amber-900/40 transition-colors hover:bg-amber-400"
      >
        Play →
      </Link>
    </main>
  );
}
