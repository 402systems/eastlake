'use client';

import type { IplRole, Lineup } from '@/lib/types';
import { SLOTS } from '@/lib/constants';

interface Props {
  lineup: Lineup;
  activeSlotId?: IplRole | null;
  filledSlots: Set<IplRole>;
  compact?: boolean;
  /** Horizontal 5-across strip — used on the single-column game layout. */
  row?: boolean;
  blind?: boolean;
}

const SLOT_ICONS: Record<IplRole, string> = {
  OPENER: '🏏',
  MIDDLE_ORDER: '🛡️',
  ALL_ROUNDER: '⚡',
  SPIN_BOWLER: '🌀',
  PACE_BOWLER: '🎯',
};

const SLOT_SHORT: Record<IplRole, string> = {
  OPENER: 'Open',
  MIDDLE_ORDER: 'Mid',
  ALL_ROUNDER: 'All-R',
  SPIN_BOWLER: 'Spin',
  PACE_BOWLER: 'Pace',
};

const RATING_BG = (r: number) => {
  if (r >= 88) return '#f59e0b';
  if (r >= 75) return '#22c55e';
  if (r >= 62) return '#3b82f6';
  return '#64748b';
};

export function TeamSheet({
  lineup,
  activeSlotId,
  filledSlots,
  compact = false,
  row = false,
  blind = false,
}: Props) {
  if (row) {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {SLOTS.map((slot) => {
          const player = lineup[slot.id];
          const filled = filledSlots.has(slot.id);
          const isActive = activeSlotId === slot.id;
          return (
            <div
              key={slot.id}
              className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${
                filled
                  ? 'animate-pop border-emerald-500/25 bg-emerald-500/10'
                  : isActive
                    ? 'border-purple-400/60 bg-purple-500/15'
                    : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              <span
                className={`text-base leading-none ${filled || isActive ? '' : 'opacity-40'}`}
              >
                {SLOT_ICONS[slot.id]}
              </span>
              {player ? (
                <>
                  <span className="w-full truncate text-[10px] leading-tight font-semibold text-white">
                    {player.name.split(' ').slice(-1)[0]}
                  </span>
                  {blind ? (
                    <span className="text-[10px] leading-none text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span
                      className="rounded px-1 text-[9px] font-black text-white"
                      style={{ backgroundColor: RATING_BG(player.rating) }}
                    >
                      {player.rating}
                    </span>
                  )}
                </>
              ) : (
                <span
                  className={`text-[9px] leading-tight font-semibold tracking-wide uppercase ${
                    isActive ? 'text-purple-300' : 'text-slate-500'
                  }`}
                >
                  {isActive ? '•••' : SLOT_SHORT[slot.id]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {SLOTS.map((slot) => {
          const player = lineup[slot.id];
          const filled = filledSlots.has(slot.id);
          const isActive = activeSlotId === slot.id;
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all ${
                filled
                  ? 'animate-pop border border-emerald-500/20 bg-emerald-500/10'
                  : isActive
                    ? 'border border-purple-400/60 bg-purple-500/15'
                    : 'border border-white/8 bg-white/[0.02]'
              }`}
            >
              <span className={`text-xs ${filled ? '' : 'opacity-50'}`}>
                {SLOT_ICONS[slot.id]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-none text-slate-500">
                  {slot.label}
                </p>
                {player ? (
                  <p className="mt-0.5 truncate text-xs leading-tight font-semibold text-white">
                    {player.name.split(' ').slice(-1)[0]}
                  </p>
                ) : (
                  <p
                    className={`mt-0.5 text-xs leading-tight ${isActive ? 'font-semibold text-purple-300' : 'text-slate-600'}`}
                  >
                    {isActive ? 'picking…' : '—'}
                  </p>
                )}
              </div>
              {player && !blind && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-black text-white"
                  style={{ backgroundColor: RATING_BG(player.rating) }}
                >
                  {player.rating}
                </span>
              )}
              {player && blind && (
                <span className="text-xs text-emerald-400">✓</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {SLOTS.map((slot) => {
        const player = lineup[slot.id];
        const isActive = activeSlotId === slot.id;
        const isFilled = filledSlots.has(slot.id);

        return (
          <div
            key={slot.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
              isActive
                ? 'border-2 border-purple-400 bg-purple-900/20'
                : isFilled
                  ? 'border border-slate-700 bg-slate-800/50'
                  : 'border border-slate-800 bg-slate-900/50'
            }`}
          >
            <span className="text-xl">{SLOT_ICONS[slot.id]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {slot.label}
              </p>
              {player ? (
                <p className="truncate text-sm font-bold text-white">
                  {player.name}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  {isActive ? 'Picking…' : slot.description}
                </p>
              )}
            </div>
            {player && !blind && (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: RATING_BG(player.rating) }}
              >
                {player.rating}
              </span>
            )}
            {!player && isActive && (
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-purple-400" />
            )}
          </div>
        );
      })}
    </div>
  );
}
