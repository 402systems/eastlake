'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Club, Lineup, Nation, Player, Squad } from '@/lib/types';
import {
  fetchClubs,
  fetchNations,
  fetchNationSquad,
  fetchSquad,
} from '@/lib/data';
import { Formation } from '@/components/Formation';

const POPULATED_ERAS = [
  { era: '2015', label: '2015' },
  { era: '2019', label: '2019' },
  { era: '2022', label: '2022' },
];

// Slot assignment order per position group
const GROUP_SLOTS: Record<string, string[]> = {
  GK: ['GK'],
  DEF: ['LB', 'LCB', 'RCB', 'RB'],
  MID: ['LCM', 'CM', 'RCM'],
  FWD: ['LW', 'ST', 'RW'],
};

const GROUP_MAX: Record<string, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

type GroupCounts = Record<string, number>;

interface Pick {
  player: Player;
  club: Club | null;
  nation: Nation | null;
  eraLabel: string;
  percentile: number;
}

function computePercentile(player: Player, squad: Squad): number {
  const ratings = squad.players.map((p) => p.rating).sort((a, b) => a - b);
  if (ratings.length <= 1) return 100;
  const rank = ratings.filter((r) => r < player.rating).length;
  return Math.round((rank / (ratings.length - 1)) * 100);
}

const RATING_COLOR = (r: number) =>
  r >= 90
    ? 'bg-amber-400 text-amber-900'
    : r >= 80
      ? 'bg-green-500 text-white'
      : r >= 70
        ? 'bg-blue-500 text-white'
        : 'bg-slate-500 text-white';

const PCT_COLOR = (p: number) =>
  p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444';

export default function GamePage() {
  const [started, setStarted] = useState(false);
  const [blind, setBlind] = useState(false);
  const [nationMode, setNationMode] = useState(false);

  const [picks, setPicks] = useState<Pick[]>([]);
  const [lineup, setLineup] = useState<Lineup>({});
  const [groupCounts, setGroupCounts] = useState<GroupCounts>({
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  });

  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [currentNation, setCurrentNation] = useState<Nation | null>(null);
  const [currentEra, setCurrentEra] = useState<
    (typeof POPULATED_ERAS)[0] | null
  >(null);
  const [currentSquad, setCurrentSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState('');
  const [reshuffles, setReshuffles] = useState(3);

  const clubsRef = useRef<Club[]>([]);
  const nationsRef = useRef<Nation[]>([]);
  const usedRef = useRef(new Set<string>());
  const nationModeRef = useRef(false);

  useEffect(() => {
    fetchClubs().then((clubs) => {
      clubsRef.current = clubs;
    });
    fetchNations().then((nations) => {
      nationsRef.current = nations;
    });
  }, []);

  function startGame() {
    nationModeRef.current = nationMode;
    setStarted(true);
    setLoading(true);
    doRoll(nationMode);
  }

  async function doRoll(useNations = nationModeRef.current) {
    if (useNations) {
      const nations = nationsRef.current;
      const available = nations
        .flatMap((n) => POPULATED_ERAS.map((e) => ({ nation: n, era: e })))
        .filter(
          ({ nation, era }) => !usedRef.current.has(`${nation.id}_${era.era}`)
        );

      if (available.length === 0) return;
      const { nation, era } =
        available[Math.floor(Math.random() * available.length)];
      usedRef.current.add(`${nation.id}_${era.era}`);

      setCurrentNation(nation);
      setCurrentClub(null);
      setCurrentEra(era);
      setCurrentSquad(null);
      setLoading(true);

      const squad = await fetchNationSquad(nation.id, era.era);
      if (!squad || squad.players.length === 0) {
        doRoll(useNations);
        return;
      }
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
    } else {
      const clubs = clubsRef.current;
      const available = clubs
        .flatMap((c) => POPULATED_ERAS.map((e) => ({ club: c, era: e })))
        .filter(
          ({ club, era }) => !usedRef.current.has(`${club.id}_${era.era}`)
        );

      if (available.length === 0) return;
      const { club, era } =
        available[Math.floor(Math.random() * available.length)];
      usedRef.current.add(`${club.id}_${era.era}`);

      setCurrentClub(club);
      setCurrentNation(null);
      setCurrentEra(era);
      setCurrentSquad(null);
      setLoading(true);

      const squad = await fetchSquad(club.id, era.era);
      if (!squad || squad.players.length === 0) {
        doRoll(useNations);
        return;
      }
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
    }
  }

  function selectPlayer(player: Player, currentGroupCounts: GroupCounts) {
    if ((!currentClub && !currentNation) || !currentEra || !currentSquad)
      return;

    const group = player.positionGroup;
    if (currentGroupCounts[group] >= GROUP_MAX[group]) return;

    const slotId = GROUP_SLOTS[group][
      currentGroupCounts[group]
    ] as keyof Lineup;
    const newLineup = { ...lineup, [slotId]: player };
    const newGroupCounts = {
      ...currentGroupCounts,
      [group]: currentGroupCounts[group] + 1,
    };
    const newPick: Pick = {
      player,
      club: currentClub,
      nation: currentNation,
      eraLabel: currentEra.label,
      percentile: computePercentile(player, currentSquad),
    };
    const newPicks = [...picks, newPick];

    setLineup(newLineup);
    setGroupCounts(newGroupCounts);
    setPicks(newPicks);

    if (newPicks.length === 11) {
      setDone(true);
    } else {
      doRoll(nationModeRef.current);
    }
  }

  function reset() {
    setPicks([]);
    setLineup({});
    setGroupCounts({ GK: 0, DEF: 0, MID: 0, FWD: 0 });
    setCurrentClub(null);
    setCurrentNation(null);
    usedRef.current.clear();
    setDone(false);
    setReshuffles(3);
    setStarted(false);
  }

  if (!started) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight text-white">
            Soccer <span className="text-green-400">XI</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Choose your mode before you start.
          </p>
        </div>

        <div className="flex w-72 flex-col gap-3">
          <button
            onClick={() => setNationMode((b) => !b)}
            className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-all ${
              nationMode
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <span className="text-3xl">{nationMode ? '🌍' : '🏟️'}</span>
            <div className="text-left">
              <p
                className={`font-bold ${nationMode ? 'text-white' : 'text-slate-300'}`}
              >
                {nationMode ? 'Nation Mode ON' : 'Nation Mode OFF'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {nationMode
                  ? 'Pick from national teams'
                  : 'Pick from club squads'}
              </p>
            </div>
            <div
              className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                nationMode ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
              }`}
            >
              {nationMode && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </button>

          <button
            onClick={() => setBlind((b) => !b)}
            className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-all ${
              blind
                ? 'border-purple-500 bg-purple-900/30 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <span className="text-3xl">{blind ? '🙈' : '👁'}</span>
            <div className="text-left">
              <p
                className={`font-bold ${blind ? 'text-white' : 'text-slate-300'}`}
              >
                {blind ? 'Blind Mode ON' : 'Blind Mode OFF'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {blind
                  ? 'Ratings hidden · players listed A–Z'
                  : 'Ratings visible · players by rating'}
              </p>
            </div>
            <div
              className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                blind ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
              }`}
            >
              {blind && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <button
          onClick={startGame}
          className="rounded-2xl bg-green-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-green-900/40 transition-colors hover:bg-green-400"
        >
          Start Game →
        </button>

        <Link
          href="/"
          className="text-sm text-slate-600 transition-colors hover:text-slate-400"
        >
          ← Back
        </Link>
      </main>
    );
  }

  if (done) {
    const avg = Math.round(
      picks.reduce((s, p) => s + p.percentile, 0) / picks.length
    );
    return (
      <ScoreScreen
        picks={picks}
        avg={avg}
        lineup={lineup}
        blind={blind}
        onPlayAgain={reset}
      />
    );
  }

  const filledCount = picks.length;

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col overflow-hidden px-3 py-4">
      {/* Header */}
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <Link
          href="/"
          className="text-sm text-slate-500 transition-colors hover:text-white"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-2">
          {blind && (
            <span className="rounded-full border border-purple-700 bg-purple-900/50 px-2 py-1 text-xs font-semibold text-purple-300">
              🙈 Blind
            </span>
          )}
          <span className="font-mono text-sm text-slate-400">
            {filledCount} / 11
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Left: roll + player list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Current roll */}
          {currentEra && (currentClub || currentNation) && (
            <div
              className="mb-3 shrink-0 rounded-xl border border-white/10 px-4 py-3"
              style={
                currentClub
                  ? {
                      background: `linear-gradient(135deg, ${currentClub.color}40, ${currentClub.color}15)`,
                    }
                  : {
                      background:
                        'linear-gradient(135deg, #1e3a5f40, #1e3a5f15)',
                    }
              }
            >
              <div className="flex items-center gap-2.5">
                {currentClub ? (
                  <div
                    className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/20"
                    style={{ backgroundColor: currentClub.color }}
                  />
                ) : (
                  <span className="shrink-0 text-2xl leading-none">
                    {currentNation!.flag}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base leading-tight font-black text-white">
                    {currentClub?.name ?? currentNation?.name}
                  </p>
                  <p className="text-xs text-slate-400">{currentEra.label}</p>
                </div>
                <button
                  disabled={reshuffles === 0 || loading}
                  onClick={() => {
                    setReshuffles((r) => r - 1);
                    doRoll(nationModeRef.current);
                  }}
                  className={`ml-auto flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    reshuffles > 0 && !loading
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'cursor-not-allowed bg-slate-800 text-slate-600'
                  }`}
                >
                  🔀 {reshuffles}
                </button>
              </div>
            </div>
          )}

          {/* Slot needs indicator */}
          <div className="mb-2 flex shrink-0 gap-1.5">
            {Object.entries(GROUP_MAX).map(([group, max]) => {
              const count = groupCounts[group];
              const full = count >= max;
              return (
                <div
                  key={group}
                  className={`flex-1 rounded px-1 py-0.5 text-center text-[10px] font-bold ${
                    full
                      ? 'bg-slate-700 text-slate-500 line-through'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {group} {count}/{max}
                </div>
              );
            })}
          </div>

          {/* Player list */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-500">Rolling…</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <input
                type="text"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2 w-full shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-slate-500"
              />
              <div className="flex-1 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800">
                {currentSquad &&
                  [...currentSquad.players]
                    .sort(
                      blind
                        ? (a, b) => a.name.localeCompare(b.name)
                        : (a, b) => b.rating - a.rating
                    )
                    .filter(
                      (p) =>
                        !search.trim() ||
                        p.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((player) => {
                      const full =
                        groupCounts[player.positionGroup] >=
                        GROUP_MAX[player.positionGroup];
                      return (
                        <button
                          key={player.id}
                          disabled={full}
                          onClick={() => selectPlayer(player, groupCounts)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            full
                              ? 'cursor-not-allowed opacity-30'
                              : 'cursor-pointer hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                              blind
                                ? 'bg-slate-700 text-slate-400'
                                : RATING_COLOR(player.rating)
                            }`}
                          >
                            {blind ? '?' : player.rating}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {player.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {player.position} · {player.nationality}
                            </p>
                          </div>
                          {full && (
                            <span className="shrink-0 text-xs text-slate-600">
                              Full
                            </span>
                          )}
                        </button>
                      );
                    })}
              </div>
            </div>
          )}
        </div>

        {/* Right: formation */}
        <div className="w-[152px] shrink-0">
          <Formation
            lineup={lineup}
            onSlotClick={() => {}}
            blind={blind}
            compact
          />
        </div>
      </div>
    </main>
  );
}

function ScoreScreen({
  picks,
  avg,
  lineup,
  onPlayAgain,
}: {
  picks: Pick[];
  avg: number;
  lineup: Lineup;
  blind: boolean;
  onPlayAgain: () => void;
}) {
  const color = PCT_COLOR(avg);
  const message =
    avg >= 90
      ? 'Elite scout. You maxed every pick.'
      : avg >= 70
        ? 'Strong squad. You knew who to take.'
        : avg >= 50
          ? 'Decent eye — a few stars slipped by.'
          : avg >= 30
            ? 'Some big names were right there.'
            : 'The stars were right in front of you!';

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white">Final Squad</h2>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
      </div>

      <div className="mb-6 flex flex-col items-center">
        <div className="text-8xl font-black tabular-nums" style={{ color }}>
          {avg}
        </div>
        <div className="mt-2 text-xs tracking-widest text-slate-400 uppercase">
          avg percentile
        </div>
      </div>

      {/* Formation */}
      <div className="mb-6 w-full">
        <Formation lineup={lineup} onSlotClick={() => {}} blind={false} />
      </div>

      {/* Per-pick breakdown */}
      <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-800">
        {picks.map((pick, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5 last:border-0"
          >
            <span className="w-4 shrink-0 text-right text-xs text-slate-600">
              {i + 1}
            </span>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${RATING_COLOR(pick.player.rating)}`}
            >
              {pick.player.rating}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {pick.player.name}
              </p>
              <p className="text-xs text-slate-500">
                {pick.nation
                  ? `${pick.nation.flag} ${pick.nation.name}`
                  : pick.club?.name}{' '}
                · {pick.eraLabel}
              </p>
            </div>
            <span
              className="shrink-0 text-xs font-bold"
              style={{ color: PCT_COLOR(pick.percentile) }}
            >
              {pick.percentile}%
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onPlayAgain}
        className="rounded-xl bg-white px-8 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-100"
      >
        Play Again
      </button>
    </main>
  );
}
