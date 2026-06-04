import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <div className="text-center">
        <h1 className="text-5xl font-black text-white tracking-tight">
          Soccer <span className="text-green-400">XI</span>
        </h1>
        <p className="text-slate-400 mt-3 text-sm max-w-xs">
          11 random clubs. Pick one player from each. Build the best squad you can.
        </p>
      </div>
      <Link
        href="/game"
        className="bg-green-500 hover:bg-green-400 text-white font-black px-10 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-green-900/40"
      >
        Play →
      </Link>
    </main>
  );
}
