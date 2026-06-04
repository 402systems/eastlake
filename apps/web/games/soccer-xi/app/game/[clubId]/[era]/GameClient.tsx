'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Club, Lineup, Player, Slot, SlotId } from '@/lib/types';
import type { Squad } from '@/lib/types';
import { FORMATION_SLOTS } from '@/lib/constants';
import { fetchClubs, fetchSquad } from '@/lib/data';
import { scoreLineup } from '@/lib/scoring';
import { Formation } from '@/components/Formation';
import { PlayerPickerModal } from '@/components/PlayerPickerModal';
import { ScoreDisplay } from '@/components/ScoreDisplay';

interface Props {
  clubId: string;
  era: string;
}

export function GameClient({ clubId, era }: Props) {
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [lineup, setLineup] = useState<Lineup>({});
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchClubs(), fetchSquad(clubId, era)])
      .then(([clubs, squadData]) => {
        const found = clubs.find((c) => c.id === clubId) ?? null;
        setClub(found);
        setSquad(squadData);
        if (!squadData || squadData.players.length === 0) {
          setError(
            'No player data for this era yet. Run the data pipeline first.'
          );
        }
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, [clubId, era]);

  const usedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(lineup)
          .filter(Boolean)
          .map((p) => p!.id)
      ),
    [lineup]
  );

  const allFilled = FORMATION_SLOTS.every((s) => lineup[s.id]);

  function selectPlayer(player: Player) {
    if (!activeSlot) return;
    setLineup((prev) => ({ ...prev, [activeSlot.id]: player }));
    setActiveSlot(null);
  }

  function clearSlot(slotId: SlotId) {
    setLineup((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }

  function handleSlotClick(slot: Slot) {
    if (submitted) return;
    if (lineup[slot.id]) {
      clearSlot(slot.id);
    } else {
      setActiveSlot(slot);
    }
  }

  const eraLabel = squad?.label ?? era;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading squad...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-red-400">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to home
        </button>
      </main>
    );
  }

  const score = submitted && squad ? scoreLineup(lineup, squad) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex w-full items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-slate-500 transition-colors hover:text-white"
        >
          ← Home
        </button>
        <div className="text-center">
          <p className="text-lg font-black text-white">
            {club?.name ?? clubId}
          </p>
          <p className="text-xs text-slate-400">{eraLabel} · 4-3-3</p>
        </div>
        <div className="w-12" />
      </div>

      {!submitted ? (
        <>
          {/* Fill counter */}
          <div className="mb-4 flex items-center gap-2">
            {FORMATION_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className={`h-2 w-2 rounded-full transition-colors ${
                  lineup[slot.id] ? 'bg-green-400' : 'bg-slate-700'
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-slate-500">
              {Object.keys(lineup).length}/11
            </span>
          </div>

          {/* Formation */}
          <div className="w-full">
            <Formation
              lineup={lineup}
              onSlotClick={handleSlotClick}
              activeSlotId={activeSlot?.id}
            />
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            Tap a slot to pick · tap again to clear
          </p>

          {/* Submit */}
          <button
            disabled={!allFilled}
            onClick={() => setSubmitted(true)}
            className={`mt-6 w-full rounded-xl py-4 text-lg font-black transition-all ${
              allFilled
                ? 'bg-green-500 text-white shadow-lg shadow-green-900/40 hover:bg-green-400'
                : 'cursor-not-allowed bg-slate-800 text-slate-600'
            } `}
          >
            {allFilled
              ? 'Submit Squad →'
              : `Pick ${11 - Object.keys(lineup).length} more`}
          </button>
        </>
      ) : (
        score && (
          <ScoreDisplay
            score={score}
            lineup={lineup}
            clubName={club?.name ?? clubId}
            eraLabel={eraLabel}
            onPlayAgain={() => {
              setLineup({});
              setSubmitted(false);
            }}
          />
        )
      )}

      {activeSlot && squad && (
        <PlayerPickerModal
          positionGroup={activeSlot.positionGroup}
          players={squad.players}
          usedPlayerIds={usedPlayerIds}
          onSelect={selectPlayer}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </main>
  );
}
