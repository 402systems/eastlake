'use client';

import type { Player, Slot } from '@/lib/types';

interface Props {
  slot: Slot;
  player?: Player;
  onClick: () => void;
  highlight?: boolean;
  blind?: boolean;
  compact?: boolean;
}

const GROUP_COLORS: Record<string, string> = {
  GK: 'bg-yellow-400 text-yellow-900',
  DEF: 'bg-blue-500 text-white',
  MID: 'bg-green-500 text-white',
  FWD: 'bg-red-500 text-white',
};

const GROUP_EMPTY: Record<string, string> = {
  GK: 'border-yellow-400 text-yellow-300',
  DEF: 'border-blue-400 text-blue-300',
  MID: 'border-green-400 text-green-300',
  FWD: 'border-red-400 text-red-300',
};

export function PositionSlot({ slot, player, onClick, highlight, blind, compact }: Props) {
  const filled = !!player;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          relative flex flex-col items-center justify-center
          w-12 h-14 rounded-md border transition-all duration-150
          cursor-pointer select-none text-center
          ${filled
            ? `${GROUP_COLORS[slot.positionGroup]} border-transparent shadow`
            : `bg-white/5 ${GROUP_EMPTY[slot.positionGroup]} border-dashed`
          }
        `}
      >
        <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 leading-none mb-0.5">
          {slot.label}
        </span>
        {filled ? (
          <>
            {!blind && <span className="text-sm font-black leading-none">{player!.rating}</span>}
            <span className="text-[7px] font-semibold px-0.5 leading-tight line-clamp-1 w-full text-center">
              {player!.name.split(' ').pop()}
            </span>
          </>
        ) : (
          <span className="text-base opacity-20">+</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-20 h-24 rounded-lg border-2 transition-all duration-150
        cursor-pointer select-none
        ${filled
          ? `${GROUP_COLORS[slot.positionGroup]} border-transparent shadow-lg`
          : `bg-white/5 ${GROUP_EMPTY[slot.positionGroup]} border-dashed hover:bg-white/10`
        }
        ${highlight ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}
      `}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
        {slot.label}
      </span>
      {filled ? (
        <>
          {!blind && <span className="text-2xl font-black leading-none">{player!.rating}</span>}
          <span className="text-[9px] font-semibold mt-1 px-1 text-center leading-tight line-clamp-2">
            {player!.name.split(' ').slice(-1)[0]}
          </span>
        </>
      ) : (
        <span className="text-2xl opacity-30">+</span>
      )}
    </button>
  );
}
