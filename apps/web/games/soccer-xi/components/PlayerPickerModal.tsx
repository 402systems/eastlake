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

export function PlayerPickerModal({ positionGroup, players, usedPlayerIds, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const eligible = useMemo(
    () =>
      players
        .filter((p) => p.positionGroup === positionGroup)
        .sort((a, b) => b.rating - a.rating),
    [players, positionGroup],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return eligible;
    const q = query.toLowerCase();
    return eligible.filter((p) => p.name.toLowerCase().includes(q));
  }, [eligible, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg">
            Pick a {GROUP_LABEL[positionGroup]}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-700">
          <input
            autoFocus
            type="text"
            placeholder="Search player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Player list */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No players found</p>
          )}
          {filtered.map((player) => {
            const used = usedPlayerIds.has(player.id);
            return (
              <button
                key={player.id}
                disabled={used}
                onClick={() => !used && onSelect(player)}
                className={`
                  w-full flex items-center gap-4 px-5 py-3 text-left transition-colors
                  ${used
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-slate-800 cursor-pointer'
                  }
                `}
              >
                {/* Rating badge */}
                <span
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${RATING_COLOR(player.rating)}`}
                >
                  {player.rating}
                </span>

                {/* Name + position */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                  <p className="text-slate-400 text-xs">{player.position} · {player.nationality}</p>
                </div>

                {used && (
                  <span className="text-slate-500 text-xs">Used</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
