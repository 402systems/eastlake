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

export function PositionSlot({
  slot,
  player,
  onClick,
  highlight,
  blind,
  compact,
}: Props) {
  const filled = !!player;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`relative flex h-14 w-12 cursor-pointer flex-col items-center justify-center rounded-md border text-center transition-all duration-150 select-none ${
          filled
            ? `${GROUP_COLORS[slot.positionGroup]} border-transparent shadow`
            : `bg-white/5 ${GROUP_EMPTY[slot.positionGroup]} border-dashed`
        } `}
      >
        <span className="mb-0.5 text-[8px] leading-none font-bold tracking-wider uppercase opacity-70">
          {slot.label}
        </span>
        {filled ? (
          <>
            {!blind && (
              <span className="text-sm leading-none font-black">
                {player!.rating}
              </span>
            )}
            <span className="line-clamp-1 w-full px-0.5 text-center text-[7px] leading-tight font-semibold">
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
      className={`relative flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all duration-150 select-none ${
        filled
          ? `${GROUP_COLORS[slot.positionGroup]} border-transparent shadow-lg`
          : `bg-white/5 ${GROUP_EMPTY[slot.positionGroup]} border-dashed hover:bg-white/10`
      } ${highlight ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''} `}
    >
      <span className="mb-1 text-[10px] font-bold tracking-widest uppercase opacity-70">
        {slot.label}
      </span>
      {filled ? (
        <>
          {!blind && (
            <span className="text-2xl leading-none font-black">
              {player!.rating}
            </span>
          )}
          <span className="mt-1 line-clamp-2 px-1 text-center text-[9px] leading-tight font-semibold">
            {player!.name.split(' ').slice(-1)[0]}
          </span>
        </>
      ) : (
        <span className="text-2xl opacity-30">+</span>
      )}
    </button>
  );
}
