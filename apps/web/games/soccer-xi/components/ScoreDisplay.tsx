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
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  const color =
    pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';

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
      <text x="100" y="95" textAnchor="middle" fill="white" fontSize="32" fontWeight="900">
        {pct}
      </text>
      <text x="100" y="112" textAnchor="middle" fill="#94a3b8" fontSize="11">
        PERCENTILE
      </text>
    </svg>
  );
}

export function ScoreDisplay({ score, lineup, clubName, eraLabel, onPlayAgain }: Props) {
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
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
          {clubName} · {eraLabel}
        </p>
        <h2 className="text-white text-2xl font-black mt-1">Your Result</h2>
      </div>

      {/* Percentile arc */}
      <div className="flex flex-col items-center">
        <PercentileArc pct={percentile} />
        <p className="text-slate-300 text-sm mt-1">{OrdinalSuffix(percentile)} percentile</p>
        <p className="text-slate-500 text-xs mt-2 text-center max-w-xs">{message}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">Your Avg</p>
          <p className="text-white text-xl font-black">{avgRating.toFixed(1)}</p>
        </div>
        <div className="w-px bg-slate-700" />
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">Best Possible</p>
          <p className="text-white text-xl font-black">{maxPossibleAvg.toFixed(1)}</p>
        </div>
      </div>

      {/* Per-slot breakdown */}
      <div className="w-full max-w-sm bg-slate-800/50 rounded-xl overflow-hidden">
        <p className="text-slate-400 text-xs uppercase tracking-wider px-4 py-2 border-b border-slate-700">
          Slot breakdown
        </p>
        {FORMATION_SLOTS.map((slot) => {
          const player = lineup[slot.id];
          const info = slotScores[slot.id];
          if (!player || !info) return null;
          const slotPct = Math.round(((info.rank - 1) / Math.max(info.total - 1, 1)) * 100);
          return (
            <div key={slot.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-700/50 last:border-0">
              <span className="text-slate-500 text-xs w-8 shrink-0">{slot.label}</span>
              <span className="text-white text-sm flex-1 truncate">{player.name}</span>
              <span className="text-slate-400 text-xs font-mono">{player.rating}</span>
              <div className="w-16 bg-slate-700 rounded-full h-1.5 shrink-0">
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
        className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-slate-100 transition-colors"
      >
        Play Again
      </button>
    </div>
  );
}
