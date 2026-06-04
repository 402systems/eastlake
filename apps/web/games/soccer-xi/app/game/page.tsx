'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Club, Lineup, Nation, Player, Squad } from '@/lib/types';
import { FORMATION_SLOTS } from '@/lib/constants';
import { fetchClubs, fetchNations, fetchNationSquad, fetchSquad } from '@/lib/data';
import { Formation } from '@/components/Formation';

const POPULATED_ERAS = [
  { era: '2015', label: '2015' },
  { era: '2019', label: '2019' },
  { era: '2022', label: '2022' },
];

// Slot assignment order per position group
const GROUP_SLOTS: Record<string, string[]> = {
  GK:  ['GK'],
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
  r >= 90 ? 'bg-amber-400 text-amber-900' :
  r >= 80 ? 'bg-green-500 text-white' :
  r >= 70 ? 'bg-blue-500 text-white' :
  'bg-slate-500 text-white';

const PCT_COLOR = (p: number) =>
  p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444';

export default function GamePage() {
  const [started, setStarted] = useState(false);
  const [blind, setBlind] = useState(false);
  const [nationMode, setNationMode] = useState(false);

  const [picks, setPicks] = useState<Pick[]>([]);
  const [lineup, setLineup] = useState<Lineup>({});
  const [groupCounts, setGroupCounts] = useState<GroupCounts>({ GK: 0, DEF: 0, MID: 0, FWD: 0 });

  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [currentNation, setCurrentNation] = useState<Nation | null>(null);
  const [currentEra, setCurrentEra] = useState<typeof POPULATED_ERAS[0] | null>(null);
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
    fetchClubs().then((clubs) => { clubsRef.current = clubs; });
    fetchNations().then((nations) => { nationsRef.current = nations; });
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
      const available = nations.flatMap((n) =>
        POPULATED_ERAS.map((e) => ({ nation: n, era: e }))
      ).filter(({ nation, era }) => !usedRef.current.has(`${nation.id}_${era.era}`));

      if (available.length === 0) return;
      const { nation, era } = available[Math.floor(Math.random() * available.length)];
      usedRef.current.add(`${nation.id}_${era.era}`);

      setCurrentNation(nation);
      setCurrentClub(null);
      setCurrentEra(era);
      setCurrentSquad(null);
      setLoading(true);

      const squad = await fetchNationSquad(nation.id, era.era);
      if (!squad || squad.players.length === 0) { doRoll(useNations); return; }
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
    } else {
      const clubs = clubsRef.current;
      const available = clubs.flatMap((c) =>
        POPULATED_ERAS.map((e) => ({ club: c, era: e }))
      ).filter(({ club, era }) => !usedRef.current.has(`${club.id}_${era.era}`));

      if (available.length === 0) return;
      const { club, era } = available[Math.floor(Math.random() * available.length)];
      usedRef.current.add(`${club.id}_${era.era}`);

      setCurrentClub(club);
      setCurrentNation(null);
      setCurrentEra(era);
      setCurrentSquad(null);
      setLoading(true);

      const squad = await fetchSquad(club.id, era.era);
      if (!squad || squad.players.length === 0) { doRoll(useNations); return; }
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
    }
  }

  function selectPlayer(player: Player, currentGroupCounts: GroupCounts) {
    if ((!currentClub && !currentNation) || !currentEra || !currentSquad) return;

    const group = player.positionGroup;
    if (currentGroupCounts[group] >= GROUP_MAX[group]) return;

    const slotId = GROUP_SLOTS[group][currentGroupCounts[group]] as keyof Lineup;
    const newLineup = { ...lineup, [slotId]: player };
    const newGroupCounts = { ...currentGroupCounts, [group]: currentGroupCounts[group] + 1 };
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
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-tight">
            Soccer <span className="text-green-400">XI</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Choose your mode before you start.</p>
        </div>

        <div className="flex flex-col gap-3 w-72">
          <button
            onClick={() => setNationMode((b) => !b)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
              nationMode
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <span className="text-3xl">{nationMode ? '🌍' : '🏟️'}</span>
            <div className="text-left">
              <p className={`font-bold ${nationMode ? 'text-white' : 'text-slate-300'}`}>
                {nationMode ? 'Nation Mode ON' : 'Nation Mode OFF'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {nationMode ? 'Pick from national teams' : 'Pick from club squads'}
              </p>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              nationMode ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
            }`}>
              {nationMode && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>

          <button
            onClick={() => setBlind((b) => !b)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
              blind
                ? 'border-purple-500 bg-purple-900/30 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <span className="text-3xl">{blind ? '🙈' : '👁'}</span>
            <div className="text-left">
              <p className={`font-bold ${blind ? 'text-white' : 'text-slate-300'}`}>
                {blind ? 'Blind Mode ON' : 'Blind Mode OFF'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {blind ? 'Ratings hidden · players listed A–Z' : 'Ratings visible · players by rating'}
              </p>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              blind ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
            }`}>
              {blind && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <button
          onClick={startGame}
          className="bg-green-500 hover:bg-green-400 text-white font-black px-10 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-green-900/40"
        >
          Start Game →
        </button>

        <Link href="/" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
          ← Back
        </Link>
      </main>
    );
  }

  if (done) {
    const avg = Math.round(picks.reduce((s, p) => s + p.percentile, 0) / picks.length);
    return <ScoreScreen picks={picks} avg={avg} lineup={lineup} blind={blind} onPlayAgain={reset} />;
  }

  const filledCount = picks.length;

  return (
    <main className="h-screen flex flex-col max-w-2xl mx-auto px-3 py-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">
          ← Home
        </Link>
        <div className="flex items-center gap-2">
          {blind && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-900/50 border border-purple-700 text-purple-300">
              🙈 Blind
            </span>
          )}
          <span className="text-slate-400 text-sm font-mono">{filledCount} / 11</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-3 flex-1 overflow-hidden">
        {/* Left: roll + player list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Current roll */}
          {currentEra && (currentClub || currentNation) && (
            <div
              className="rounded-xl px-4 py-3 mb-3 border border-white/10 shrink-0"
              style={currentClub
                ? { background: `linear-gradient(135deg, ${currentClub.color}40, ${currentClub.color}15)` }
                : { background: 'linear-gradient(135deg, #1e3a5f40, #1e3a5f15)' }
              }
            >
              <div className="flex items-center gap-2.5">
                {currentClub
                  ? <div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white/20" style={{ backgroundColor: currentClub.color }} />
                  : <span className="text-2xl leading-none shrink-0">{currentNation!.flag}</span>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-base leading-tight truncate">
                    {currentClub?.name ?? currentNation?.name}
                  </p>
                  <p className="text-slate-400 text-xs">{currentEra.label}</p>
                </div>
                <button
                  disabled={reshuffles === 0 || loading}
                  onClick={() => { setReshuffles((r) => r - 1); doRoll(nationModeRef.current); }}
                  className={`ml-auto flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                    reshuffles > 0 && !loading
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  🔀 {reshuffles}
                </button>
              </div>
            </div>
          )}

          {/* Slot needs indicator */}
          <div className="flex gap-1.5 mb-2 shrink-0">
            {Object.entries(GROUP_MAX).map(([group, max]) => {
              const count = groupCounts[group];
              const full = count >= max;
              return (
                <div
                  key={group}
                  className={`flex-1 text-center text-[10px] font-bold rounded px-1 py-0.5 ${
                    full ? 'bg-slate-700 text-slate-500 line-through' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {group} {count}/{max}
                </div>
              );
            })}
          </div>

          {/* Player list */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500 text-sm">Rolling…</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <input
                type="text"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500 shrink-0"
              />
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800">
                {currentSquad &&
                  [...currentSquad.players]
                    .sort(blind
                      ? (a, b) => a.name.localeCompare(b.name)
                      : (a, b) => b.rating - a.rating
                    )
                    .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((player) => {
                      const full = groupCounts[player.positionGroup] >= GROUP_MAX[player.positionGroup];
                      return (
                        <button
                          key={player.id}
                          disabled={full}
                          onClick={() => selectPlayer(player, groupCounts)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            full ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'
                          }`}
                        >
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            blind ? 'bg-slate-700 text-slate-400' : RATING_COLOR(player.rating)
                          }`}>
                            {blind ? '?' : player.rating}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                            <p className="text-slate-400 text-xs">{player.position} · {player.nationality}</p>
                          </div>
                          {full && <span className="text-slate-600 text-xs shrink-0">Full</span>}
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

function ScoreScreen({ picks, avg, lineup, onPlayAgain }: {
  picks: Pick[];
  avg: number;
  lineup: Lineup;
  blind: boolean;
  onPlayAgain: () => void;
}) {
  const color = PCT_COLOR(avg);
  const message =
    avg >= 90 ? 'Elite scout. You maxed every pick.' :
    avg >= 70 ? 'Strong squad. You knew who to take.' :
    avg >= 50 ? 'Decent eye — a few stars slipped by.' :
    avg >= 30 ? 'Some big names were right there.' :
    'The stars were right in front of you!';

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-white text-2xl font-black">Final Squad</h2>
        <p className="text-slate-400 text-sm mt-1">{message}</p>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="text-8xl font-black tabular-nums" style={{ color }}>{avg}</div>
        <div className="text-slate-400 text-xs uppercase tracking-widest mt-2">avg percentile</div>
      </div>

      {/* Formation */}
      <div className="w-full mb-6">
        <Formation lineup={lineup} onSlotClick={() => {}} blind={false} />
      </div>

      {/* Per-pick breakdown */}
      <div className="w-full rounded-xl border border-slate-800 overflow-hidden mb-6">
        {picks.map((pick, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 last:border-0">
            <span className="text-slate-600 text-xs w-4 text-right shrink-0">{i + 1}</span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${RATING_COLOR(pick.player.rating)}`}>
              {pick.player.rating}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{pick.player.name}</p>
              <p className="text-slate-500 text-xs">
                {pick.nation ? `${pick.nation.flag} ${pick.nation.name}` : pick.club?.name} · {pick.eraLabel}
              </p>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color: PCT_COLOR(pick.percentile) }}>
              {pick.percentile}%
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onPlayAgain}
        className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-slate-100 transition-colors"
      >
        Play Again
      </button>
    </main>
  );
}
