'use client';

import type { IplRole, Lineup } from '@/lib/types';
import { SLOTS } from '@/lib/constants';

interface Props {
  lineup: Lineup;
  activeSlotId?: IplRole | null;
  filledSlots: Set<IplRole>;
  compact?: boolean;
  blind?: boolean;
}

const SLOT_ICONS: Record<IplRole, string> = {
  OPENER: '🏏',
  MIDDLE_ORDER: '🛡️',
  ALL_ROUNDER: '⚡',
  SPIN_BOWLER: '🌀',
  PACE_BOWLER: '🎯',
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
  blind = false,
}: Props) {
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {SLOTS.map((slot) => {
          const player = lineup[slot.id];
          const filled = filledSlots.has(slot.id);
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                filled ? 'bg-slate-800' : 'border border-slate-800 bg-slate-900'
              }`}
            >
              <span className="text-xs">{SLOT_ICONS[slot.id]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-none text-slate-500">
                  {slot.label}
                </p>
                {player ? (
                  <p className="mt-0.5 truncate text-xs leading-tight font-semibold text-white">
                    {player.name.split(' ').slice(-1)[0]}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs leading-tight text-slate-600">
                    —
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
