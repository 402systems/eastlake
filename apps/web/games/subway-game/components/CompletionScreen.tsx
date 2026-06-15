import Link from 'next/link';
import type { LineData } from '@/lib/types';

interface CompletionScreenProps {
  line: LineData;
  guessedIds: Set<string>;
  elapsedMs: number;
  onPlayAgain: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CompletionScreen({
  line,
  guessedIds,
  elapsedMs,
  onPlayAgain,
}: CompletionScreenProps) {
  const found = guessedIds.size;
  const total = line.stations.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-8">
      <div className="mb-2 text-center">
        <h2 className="text-2xl font-black text-white">
          {found === total ? 'All stations found!' : 'Game over'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          <span
            className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
            style={{ backgroundColor: line.color }}
          />
          {line.id} · {line.name}
        </p>
      </div>

      <div className="my-6 flex gap-8 text-center">
        <div>
          <div className="text-3xl font-black text-white">
            {found} / {total}
          </div>
          <div className="text-xs tracking-wide text-slate-500 uppercase">
            Found
          </div>
        </div>
        <div>
          <div className="text-3xl font-black text-white">
            {formatElapsed(elapsedMs)}
          </div>
          <div className="text-xs tracking-wide text-slate-500 uppercase">
            Time
          </div>
        </div>
      </div>

      <ul className="mb-6 w-full divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50">
        {line.stations.map((station) => {
          const isFound = guessedIds.has(station.id);
          return (
            <li
              key={station.id}
              className={`flex items-center justify-between px-4 py-2 text-sm ${
                isFound ? 'text-white' : 'text-slate-500'
              }`}
            >
              <span>{station.name}</span>
              <span>{isFound ? '✓' : '—'}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex w-full gap-3">
        <Link
          href="/"
          className="flex-1 rounded-lg bg-slate-800 px-5 py-3 text-center text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700"
        >
          Home
        </Link>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-lg bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400"
        >
          Play Again
        </button>
      </div>
    </main>
  );
}
