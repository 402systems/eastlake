'use client';

import { useState, useMemo } from 'react';
import type { Player, PositionGroup } from '@/lib/types';

interface Props {
  positionGroup: PositionGroup;
  players: Player[];
  usedPlayerIds: Set<string>;
  onSelect: (player: Player) => void;
  onClose: () => void;
}

const GROUP_LABEL: Record<PositionGroup, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

const RATING_COLOR = (r: number) => {
  if (r >= 90) return 'bg-amber-400 text-amber-900';
  if (r >= 80) return 'bg-green-500 text-white';
  if (r >= 70) return 'bg-blue-500 text-white';
  return 'bg-slate-500 text-white';
};

export function PlayerPickerModal({
  positionGroup,
  players,
  usedPlayerIds,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');

  const eligible = useMemo(
    () =>
      players
        .filter((p) => p.positionGroup === positionGroup)
        .sort((a, b) => b.rating - a.rating),
    [players, positionGroup]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return eligible;
    const q = query.toLowerCase();
    return eligible.filter((p) => p.name.toLowerCase().includes(q));
  }, [eligible, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            Pick a {GROUP_LABEL[positionGroup]}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-700 px-5 py-3">
          <input
            autoFocus
            type="text"
            placeholder="Search player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Player list */}
        <div className="flex-1 divide-y divide-slate-800 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No players found
            </p>
          )}
          {filtered.map((player) => {
            const used = usedPlayerIds.has(player.id);
            return (
              <button
                key={player.id}
                disabled={used}
                onClick={() => !used && onSelect(player)}
                className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-colors ${
                  used
                    ? 'cursor-not-allowed opacity-30'
                    : 'cursor-pointer hover:bg-slate-800'
                } `}
              >
                {/* Rating badge */}
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black ${RATING_COLOR(player.rating)}`}
                >
                  {player.rating}
                </span>

                {/* Name + position */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {player.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {player.position} · {player.nationality}
                  </p>
                </div>

                {used && <span className="text-xs text-slate-500">Used</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
