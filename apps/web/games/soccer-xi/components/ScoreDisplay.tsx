'use client';

import type { ScoreResult } from '@/lib/scoring';
import type { Lineup } from '@/lib/types';
import { FORMATION_SLOTS } from '@/lib/constants';

interface Props {
  score: ScoreResult;
  lineup: Lineup;
  clubName: string;
  eraLabel: string;
  onPlayAgain: () => void;
}

function OrdinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function PercentileArc({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? '#22c55e'
      : pct >= 60
        ? '#3b82f6'
        : pct >= 40
          ? '#f59e0b'
          : '#ef4444';

  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      {/* Background arc */}
      <path
        d="M 10 110 A 90 90 0 0 1 190 110"
        fill="none"
        stroke="#1e293b"
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <path
        d="M 10 110 A 90 90 0 0 1 190 110"
        fill="none"
        stroke={color}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * 283} 283`}
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />
      {/* Percentile number */}
      <text
        x="100"
        y="95"
        textAnchor="middle"
        fill="white"
        fontSize="32"
        fontWeight="900"
      >
        {pct}
      </text>
      <text x="100" y="112" textAnchor="middle" fill="#94a3b8" fontSize="11">
        PERCENTILE
      </text>
    </svg>
  );
}

export function ScoreDisplay({
  score,
  lineup,
  clubName,
  eraLabel,
  onPlayAgain,
}: Props) {
  const { avgRating, percentile, maxPossibleAvg, slotScores } = score;

  const message =
    percentile >= 90
      ? 'Elite scout! You picked the cream of the crop.'
      : percentile >= 70
        ? 'Great squad. You know your football history.'
        : percentile >= 50
          ? 'Solid lineup. A few better options were available.'
          : percentile >= 30
            ? 'Room to improve. Did you miss the stars?'
            : 'Tough luck — the stars were hiding from you.';

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
          {clubName} · {eraLabel}
        </p>
        <h2 className="mt-1 text-2xl font-black text-white">Your Result</h2>
      </div>

      {/* Percentile arc */}
      <div className="flex flex-col items-center">
        <PercentileArc pct={percentile} />
        <p className="mt-1 text-sm text-slate-300">
          {OrdinalSuffix(percentile)} percentile
        </p>
        <p className="mt-2 max-w-xs text-center text-xs text-slate-500">
          {message}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-xs tracking-wider text-slate-400 uppercase">
            Your Avg
          </p>
          <p className="text-xl font-black text-white">
            {avgRating.toFixed(1)}
          </p>
        </div>
        <div className="w-px bg-slate-700" />
        <div>
          <p className="text-xs tracking-wider text-slate-400 uppercase">
            Best Possible
          </p>
          <p className="text-xl font-black text-white">
            {maxPossibleAvg.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Per-slot breakdown */}
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-slate-800/50">
        <p className="border-b border-slate-700 px-4 py-2 text-xs tracking-wider text-slate-400 uppercase">
          Slot breakdown
        </p>
        {FORMATION_SLOTS.map((slot) => {
          const player = lineup[slot.id];
          const info = slotScores[slot.id];
          if (!player || !info) return null;
          const slotPct = Math.round(
            ((info.rank - 1) / Math.max(info.total - 1, 1)) * 100
          );
          return (
            <div
              key={slot.id}
              className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-2 last:border-0"
            >
              <span className="w-8 shrink-0 text-xs text-slate-500">
                {slot.label}
              </span>
              <span className="flex-1 truncate text-sm text-white">
                {player.name}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {player.rating}
              </span>
              <div className="h-1.5 w-16 shrink-0 rounded-full bg-slate-700">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${slotPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onPlayAgain}
        className="rounded-xl bg-white px-8 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-100"
      >
        Play Again
      </button>
    </div>
  );
}
