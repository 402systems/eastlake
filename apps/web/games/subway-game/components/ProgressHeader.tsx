import Link from 'next/link';
import type { LineData } from '@/lib/types';

interface ProgressHeaderProps {
  line: LineData;
  foundCount: number;
  totalCount: number;
  onGiveUp: () => void;
}

export function ProgressHeader({
  line,
  foundCount,
  totalCount,
  onGiveUp,
}: ProgressHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#0a0e17] px-4 py-3">
      <Link
        href="/"
        className="text-sm text-slate-500 transition-colors hover:text-white"
      >
        ← Home
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: line.color }}
        />
        <span className="truncate text-sm font-bold text-white">
          {line.id} · {line.name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm text-slate-400">
          {foundCount} / {totalCount}
        </span>
        <button
          onClick={onGiveUp}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
        >
          Give Up
        </button>
      </div>
    </header>
  );
}
