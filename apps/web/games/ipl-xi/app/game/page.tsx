'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  IplPlayer,
  IplRole,
  IplSquad,
  IplTeam,
  Lineup,
} from '@/lib/types';
import { SLOTS } from '@/lib/constants';
import { fetchTeams, fetchSquad, fetchSeasons } from '@/lib/data';
import type { SeasonTeam } from '@/lib/types';
import { computePercentile, getRoleEligible } from '@/lib/scoring';
import { TeamSheet } from '@/components/TeamSheet';

interface Pick {
  player: IplPlayer;
  team: IplTeam;
  year: string;
  percentile: number;
  rankInSquad: number; // 1 = best available for that role in that squad
  eligibleCount: number; // how many options existed for that role
}

const TIERS: { score: number; minPct: number; label: string }[] = [
  { score: 14, minPct: 97, label: 'All-time great XI' },
  { score: 13, minPct: 92, label: 'Elite scouting' },
  { score: 12, minPct: 86, label: 'Excellent' },
  { score: 11, minPct: 79, label: 'Very strong' },
  { score: 10, minPct: 71, label: 'Strong' },
  { score: 9, minPct: 63, label: 'Good' },
  { score: 8, minPct: 55, label: 'Solid' },
  { score: 7, minPct: 47, label: 'Average' },
  { score: 6, minPct: 39, label: 'Below average' },
  { score: 5, minPct: 31, label: 'Weak' },
  { score: 4, minPct: 24, label: 'Poor' },
  { score: 3, minPct: 17, label: 'Very poor' },
  { score: 2, minPct: 11, label: 'Struggling' },
  { score: 1, minPct: 6, label: 'Bottom tier' },
  { score: 0, minPct: 0, label: 'Start over' },
];

function toTier(avgPct: number) {
  return TIERS.find((t) => avgPct >= t.minPct) ?? TIERS[TIERS.length - 1];
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function pickExplanation(pick: Pick): string {
  const squadNote =
    pick.eligibleCount === 1
      ? 'Only option available'
      : pick.rankInSquad === 1
        ? `Best available (${pick.eligibleCount} options)`
        : `${ordinal(pick.rankInSquad)} of ${pick.eligibleCount} available`;
  const globalNote =
    pick.percentile >= 90
      ? 'all-time elite'
      : pick.percentile >= 70
        ? 'well above average all-time'
        : pick.percentile >= 50
          ? 'above average all-time'
          : pick.percentile >= 30
            ? 'below average all-time'
            : 'bottom tier all-time';
  return `${squadNote} · ${globalNote}`;
}

const PCT_COLOR = (p: number) =>
  p >= 70 ? '#a855f7' : p >= 40 ? '#f59e0b' : '#ef4444';

const RATING_COLOR = (r: number) => {
  if (r >= 88) return 'bg-amber-400 text-amber-900';
  if (r >= 75) return 'bg-green-500 text-white';
  if (r >= 62) return 'bg-blue-500 text-white';
  return 'bg-slate-500 text-white';
};

export default function GamePage() {
  const [started, setStarted] = useState(false);
  const [blind, setBlind] = useState(false);

  const [picks, setPicks] = useState<Pick[]>([]);
  const [lineup, setLineup] = useState<Lineup>({});
  const [filledSlots, setFilledSlots] = useState<Set<IplRole>>(new Set());

  const [currentTeam, setCurrentTeam] = useState<IplTeam | null>(null);
  const [currentYear, setCurrentYear] = useState<string | null>(null);
  const [currentSquad, setCurrentSquad] = useState<IplSquad | null>(null);
  const [activeRole, setActiveRole] = useState<IplRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState('');
  const [yearShuffled, setYearShuffled] = useState(false);
  const [teamShuffled, setTeamShuffled] = useState(false);

  const teamsRef = useRef<IplTeam[]>([]);
  const usedRef = useRef(new Set<string>());
  // Track which roles are still unfilled at roll time (for auto-reroll)
  const filledRef = useRef<Set<IplRole>>(new Set());

  useEffect(() => {
    fetchTeams().then((teams) => {
      teamsRef.current = teams;
    });
  }, []);

  function startGame() {
    setStarted(true);
    setLoading(true);
    doRoll(new Set());
  }

  async function doRoll(currentFilled: Set<IplRole>) {
    const teams = teamsRef.current;
    const remaining = SLOTS.map((s) => s.id).filter(
      (id) => !currentFilled.has(id)
    );

    const available = teams
      .flatMap((t) => t.years.map((y) => ({ team: t, year: String(y) })))
      .filter(({ team, year }) => !usedRef.current.has(`${team.id}_${year}`));

    if (available.length === 0) return;

    // Shuffle to pick randomly without bias
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (const { team, year } of shuffled) {
      const key = `${team.id}_${year}`;
      if (usedRef.current.has(key)) continue;
      usedRef.current.add(key);

      setCurrentTeam(team);
      setCurrentYear(year);
      setCurrentSquad(null);
      setActiveRole(null);
      setLoading(true);

      const squad = await fetchSquad(team.id, year);
      if (!squad || squad.players.length === 0) continue;

      // Auto-reroll if squad has no players for any remaining slot
      const coversRemaining = remaining.some((role) =>
        squad.players.some((p) => p.role === role)
      );
      if (!coversRemaining) continue;

      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  async function shuffleYear() {
    if (!currentTeam || yearShuffled || loading) return;
    setYearShuffled(true);
    const remaining = SLOTS.map((s) => s.id).filter(
      (id) => !filledRef.current.has(id)
    );
    const otherYears = currentTeam.years
      .map(String)
      .filter(
        (y) =>
          y !== currentYear && !usedRef.current.has(`${currentTeam.id}_${y}`)
      )
      .sort(() => Math.random() - 0.5);

    for (const year of otherYears) {
      const key = `${currentTeam.id}_${year}`;
      usedRef.current.add(key);
      setCurrentYear(year);
      setCurrentSquad(null);
      setActiveRole(null);
      setLoading(true);
      const squad = await fetchSquad(currentTeam.id, year);
      if (!squad || squad.players.length === 0) continue;
      const coversRemaining = remaining.some((role) =>
        squad.players.some((p) => p.role === role)
      );
      if (!coversRemaining) continue;
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  async function shuffleTeam() {
    if (teamShuffled || loading) return;
    setTeamShuffled(true);
    const remaining = SLOTS.map((s) => s.id).filter(
      (id) => !filledRef.current.has(id)
    );
    const teams = teamsRef.current;

    // Prefer teams that share the current year; fall back to any unused combo
    const sameYearCandidates = teams
      .filter(
        (t) =>
          t.id !== currentTeam?.id &&
          t.years.map(String).includes(currentYear ?? '')
      )
      .map((t) => ({ team: t, year: currentYear! }))
      .filter(({ team, year }) => !usedRef.current.has(`${team.id}_${year}`));

    const allCandidates = teams
      .flatMap((t) => t.years.map((y) => ({ team: t, year: String(y) })))
      .filter(
        ({ team, year }) =>
          team.id !== currentTeam?.id &&
          !usedRef.current.has(`${team.id}_${year}`)
      );

    const pool = (
      sameYearCandidates.length > 0 ? sameYearCandidates : allCandidates
    ).sort(() => Math.random() - 0.5);

    for (const { team, year } of pool) {
      const key = `${team.id}_${year}`;
      if (usedRef.current.has(key)) continue;
      usedRef.current.add(key);
      setCurrentTeam(team);
      setCurrentYear(year);
      setCurrentSquad(null);
      setActiveRole(null);
      setLoading(true);
      const squad = await fetchSquad(team.id, year);
      if (!squad || squad.players.length === 0) continue;
      const coversRemaining = remaining.some((role) =>
        squad.players.some((p) => p.role === role)
      );
      if (!coversRemaining) continue;
      setCurrentSquad(squad);
      setSearch('');
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  function selectPlayer(player: IplPlayer) {
    if (!currentTeam || !currentYear || !currentSquad || !activeRole) return;

    const percentile = computePercentile(player);
    const eligible = getRoleEligible(currentSquad, player.role);
    const rankInSquad = eligible.findIndex((p) => p.id === player.id) + 1;
    const newPick: Pick = {
      player,
      team: currentTeam,
      year: currentYear,
      percentile,
      rankInSquad,
      eligibleCount: eligible.length,
    };
    const newPicks = [...picks, newPick];
    const newLineup = { ...lineup, [player.role]: player };
    const newFilled = new Set([...filledSlots, player.role]);

    setPicks(newPicks);
    setLineup(newLineup);
    setFilledSlots(newFilled);
    filledRef.current = newFilled;
    setActiveRole(null);

    if (newPicks.length === 5) {
      setDone(true);
    } else {
      doRoll(newFilled);
    }
  }

  function reset() {
    setPicks([]);
    setLineup({});
    const empty = new Set<IplRole>();
    setFilledSlots(empty);
    filledRef.current = empty;
    setCurrentTeam(null);
    setCurrentYear(null);
    setCurrentSquad(null);
    setActiveRole(null);
    usedRef.current.clear();
    setDone(false);
    setYearShuffled(false);
    setTeamShuffled(false);
    setStarted(false);
  }

  const unfilled = SLOTS.filter((s) => !filledSlots.has(s.id));

  if (!started) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight text-white">
            IPL <span className="text-purple-400">V</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            5 squads · 5 positions · pick wisely
          </p>
        </div>

        <div className="flex w-72 flex-col gap-3">
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
                  ? 'Ratings hidden · listed A–Z'
                  : 'Ratings visible · sorted by rating'}
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
          className="rounded-2xl bg-purple-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-purple-900/40 transition-colors hover:bg-purple-400"
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
    const tier = toTier(avg);
    return (
      <ScoreScreen picks={picks} avg={avg} tier={tier} onPlayAgain={reset} />
    );
  }

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
            {picks.length} / 5
          </span>
        </div>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Left: current squad + player list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Current squad header */}
          {currentTeam && currentYear && (
            <div
              className="mb-3 shrink-0 rounded-xl border border-white/10 px-4 py-3"
              style={{
                background: `linear-gradient(135deg, ${currentTeam.color}40, ${currentTeam.color}15)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/20"
                  style={{ backgroundColor: currentTeam.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base leading-tight font-black text-white">
                    {currentTeam.name}
                  </p>
                  <p className="text-xs text-slate-400">{currentYear}</p>
                </div>
                <div className="ml-auto flex shrink-0 gap-1.5">
                  <button
                    disabled={yearShuffled || loading}
                    onClick={shuffleYear}
                    title="New year, same team"
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                      !yearShuffled && !loading
                        ? 'bg-slate-700 text-white hover:bg-slate-600'
                        : 'cursor-not-allowed bg-slate-800 text-slate-600 line-through'
                    }`}
                  >
                    📅 Year
                  </button>
                  <button
                    disabled={teamShuffled || loading}
                    onClick={shuffleTeam}
                    title="New team, same year"
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                      !teamShuffled && !loading
                        ? 'bg-slate-700 text-white hover:bg-slate-600'
                        : 'cursor-not-allowed bg-slate-800 text-slate-600 line-through'
                    }`}
                  >
                    🔀 Team
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Role selector */}
          {!loading && currentSquad && (
            <div className="mb-2 shrink-0">
              <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                Pick for slot
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unfilled.map((slot) => {
                  const hasPlayers =
                    getRoleEligible(currentSquad, slot.id).length > 0;
                  const isActive = activeRole === slot.id;
                  return (
                    <button
                      key={slot.id}
                      disabled={!hasPlayers}
                      onClick={() => setActiveRole(isActive ? null : slot.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-purple-500 text-white'
                          : hasPlayers
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'cursor-not-allowed bg-slate-800 text-slate-600 line-through'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player list */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-500">Rolling…</p>
            </div>
          ) : activeRole && currentSquad ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <input
                type="text"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2 w-full shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
              <div className="flex-1 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800">
                {getRoleEligible(currentSquad, activeRole)
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
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => selectPlayer(player)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-800"
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
                          {blind
                            ? `${player.matches}m`
                            : activeRole === 'SPIN_BOWLER' ||
                                activeRole === 'PACE_BOWLER'
                              ? `${player.wickets ?? 0}w · eco ${player.economy?.toFixed(1) ?? '—'} · ${player.matches}m`
                              : `${player.runs ?? 0}r · SR ${player.strikeRate?.toFixed(0) ?? '—'} · avg ${player.average?.toFixed(1) ?? '—'}`}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            !loading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="px-4 text-center text-sm text-slate-500">
                  {currentSquad
                    ? 'Select a slot above to see eligible players'
                    : 'Loading squad…'}
                </p>
              </div>
            )
          )}
        </div>

        {/* Right: team sheet */}
        <div className="w-[160px] shrink-0">
          <TeamSheet
            lineup={lineup}
            activeSlotId={activeRole}
            filledSlots={filledSlots}
            compact
            blind={blind}
          />
        </div>
      </div>
    </main>
  );
}

function StatsModal({ pick, onClose }: { pick: Pick; onClose: () => void }) {
  const p = pick.player;
  const isBowler = p.role === 'SPIN_BOWLER' || p.role === 'PACE_BOWLER';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-black text-white">{p.name}</p>
            <p className="text-xs text-slate-400">
              {pick.team.name} · {pick.year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl text-slate-500 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Matches" value={String(p.matches)} />
          <Stat label="Rating" value={String(p.rating)} />
          {p.runs != null && <Stat label="Runs" value={String(p.runs)} />}
          {p.average != null && (
            <Stat label="Batting avg" value={p.average.toFixed(1)} />
          )}
          {p.strikeRate != null && (
            <Stat label="Strike rate" value={p.strikeRate.toFixed(0)} />
          )}
          {p.wickets != null && (
            <Stat label="Wickets" value={String(p.wickets)} />
          )}
          {p.economy != null && (
            <Stat label="Economy" value={p.economy.toFixed(1)} />
          )}
          {p.bowlingAverage != null && (
            <Stat label="Bowl avg" value={p.bowlingAverage.toFixed(1)} />
          )}
          {!isBowler && p.runs == null && (
            <Stat label="Batting" value="Limited data" />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800 px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}

function ScoreScreen({
  picks,
  avg,
  tier,
  onPlayAgain,
}: {
  picks: Pick[];
  avg: number;
  tier: { score: number; minPct: number; label: string };
  onPlayAgain: () => void;
}) {
  interface SimRow {
    teamId: string;
    shortName: string;
    teamName: string;
    composite: number;
    isUser: boolean;
    wins: number;
    losses: number;
    points: number;
  }
  interface SimResult {
    year: number;
    standings: SimRow[];
    userPosition: number;
  }

  function simulateTournament(
    rows: Omit<SimRow, 'wins' | 'losses' | 'points'>[]
  ): SimRow[] {
    const records: SimRow[] = rows.map((r) => ({
      ...r,
      wins: 0,
      losses: 0,
      points: 0,
    }));
    // Power-curve win probability: gap^1.5 makes small differences nearly 50/50
    // (easy to be mid-table) while large gaps become increasingly dominant
    // (hard to reach the top). 5pt gap → ~55%, 15pt → ~75%, 25pt → ~90%.
    const winProb = (a: number, b: number) => {
      const gap = a - b;
      const k = (Math.sign(gap) * Math.pow(Math.abs(gap), 1.5)) / 60;
      return 1 / (1 + Math.exp(-k));
    };
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        for (let m = 0; m < 2; m++) {
          if (
            Math.random() < winProb(records[i].composite, records[j].composite)
          ) {
            records[i].wins++;
            records[i].points += 2;
            records[j].losses++;
          } else {
            records[j].wins++;
            records[j].points += 2;
            records[i].losses++;
          }
        }
      }
    }
    return records.sort(
      (a, b) => b.points - a.points || b.composite - a.composite
    );
  }

  const [copied, setCopied] = useState(false);
  const [statsFor, setStatsFor] = useState<Pick | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);

  const SLOT_ICONS: Record<IplRole, string> = {
    OPENER: '🏏',
    MIDDLE_ORDER: '🛡️',
    ALL_ROUNDER: '⚡',
    SPIN_BOWLER: '🌀',
    PACE_BOWLER: '🎯',
  };
  const SLOT_LABELS: Record<IplRole, string> = {
    OPENER: 'Opener',
    MIDDLE_ORDER: 'Middle Order',
    ALL_ROUNDER: 'All-rounder / Finisher',
    SPIN_BOWLER: 'Spin Bowler',
    PACE_BOWLER: 'Pace Bowler',
  };

  useEffect(() => {
    fetchSeasons().then((seasons) => {
      const avgYear = Math.round(
        picks.reduce((s, p) => s + Number(p.year), 0) / picks.length
      );
      const availableYears = Object.keys(seasons)
        .map(Number)
        .sort((a, b) => a - b);
      if (availableYears.length === 0) return;
      const targetYear = availableYears.reduce((best, y) =>
        Math.abs(y - avgYear) < Math.abs(best - avgYear) ? y : best
      );

      const teams: SeasonTeam[] = seasons[String(targetYear)] ?? [];
      if (teams.length === 0) return;

      // Use pctComposite so simulation aligns with the percentile score.
      // Replace the weakest historical seed with the user's team to keep
      // the correct team count (and thus the right number of games).
      const userPctComposite =
        picks.reduce((s, p) => s + p.player.globalPercentile, 0) / picks.length;
      const sorted = [...teams].sort((a, b) => a.pctComposite - b.pctComposite);
      const rows = [
        ...sorted
          .slice(1)
          .map((t) => ({ ...t, composite: t.pctComposite, isUser: false })),
        {
          teamId: '__you__',
          shortName: 'YOU',
          teamName: 'Your Team',
          composite: userPctComposite,
          pctComposite: userPctComposite,
          isUser: true,
        },
      ];

      const standings = simulateTournament(rows);
      const userPosition = standings.findIndex((t) => t.isUser) + 1;
      setSim({ year: targetYear, standings, userPosition });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyToClipboard() {
    const simLines = sim
      ? [
          '',
          `${sim.year} IPL season — ${ordinal(sim.userPosition)} of ${sim.standings.length}:`,
          ...sim.standings.map(
            (row, i) =>
              `  ${i + 1}. ${row.isUser ? '★ Your Team' : row.shortName}  ${row.wins}W ${row.losses}L  ${row.points}pts`
          ),
        ]
      : [];
    const lines = [
      `IPL V · ${ordinal(avg)} percentile · ${tier.label}`,
      '',
      ...picks.map((pick) => {
        const icon = SLOT_ICONS[pick.player.role];
        const label = SLOT_LABELS[pick.player.role];
        return `${icon} ${label}: ${pick.player.name} (${pick.team.shortName} ${pick.year}) — ${pick.percentile}th pct all-time`;
      }),
      ...simLines,
      '',
      'web.402systems.com/games/ipl-xi',
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-8">
      {statsFor && (
        <StatsModal pick={statsFor} onClose={() => setStatsFor(null)} />
      )}

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white">Your IPL V</h2>
      </div>

      {/* Score */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className="text-9xl leading-none font-black tabular-nums"
          style={{ color: PCT_COLOR(avg) }}
        >
          {avg}
        </div>
        <div className="mt-2 text-sm font-semibold tracking-widest text-slate-400 uppercase">
          Squad Ranking
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {ordinal(avg)} percentile all-time · {tier.label}
        </div>
      </div>

      {/* Season simulation table */}
      {sim && (
        <div className="mb-6 w-full">
          <p className="mb-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">
            {sim.year} IPL Season · {ordinal(sim.userPosition)} of{' '}
            {sim.standings.length}
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="flex items-center border-b border-slate-800 px-3 py-1.5">
              <span className="w-5" />
              <span className="w-12 text-[10px] font-semibold text-slate-600 uppercase">
                Team
              </span>
              <span className="flex-1" />
              <span className="w-6 text-right text-[10px] font-semibold text-slate-600 uppercase">
                W
              </span>
              <span className="w-6 text-right text-[10px] font-semibold text-slate-600 uppercase">
                L
              </span>
              <span className="w-8 text-right text-[10px] font-semibold text-slate-600 uppercase">
                Pts
              </span>
            </div>
            {sim.standings.map((row, i) => (
              <div
                key={row.teamId}
                className={`flex items-center border-b border-slate-800 px-3 py-2 last:border-0 ${
                  row.isUser ? 'bg-purple-900/30' : ''
                }`}
              >
                <span
                  className={`w-5 shrink-0 text-xs font-bold ${row.isUser ? 'text-purple-400' : 'text-slate-600'}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`w-12 shrink-0 text-xs font-black ${row.isUser ? 'text-purple-300' : 'text-slate-300'}`}
                >
                  {row.shortName}
                </span>
                <span className="flex-1 truncate text-[11px] text-slate-600">
                  {row.isUser ? 'Your Team' : row.teamName}
                </span>
                <span
                  className={`w-6 text-right text-xs font-semibold tabular-nums ${row.isUser ? 'text-purple-300' : 'text-slate-400'}`}
                >
                  {row.wins}
                </span>
                <span
                  className={`w-6 text-right text-xs tabular-nums ${row.isUser ? 'text-purple-400' : 'text-slate-600'}`}
                >
                  {row.losses}
                </span>
                <span
                  className={`w-8 text-right text-xs font-bold tabular-nums ${row.isUser ? 'text-purple-300' : 'text-slate-400'}`}
                >
                  {row.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-pick breakdown */}
      <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-800">
        {picks.map((pick, i) => (
          <div
            key={i}
            className="flex flex-col gap-0.5 border-b border-slate-800 px-4 py-3 last:border-0"
          >
            <div className="flex items-center gap-3">
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
                  {pick.team.shortName} {pick.year}
                </p>
              </div>
              <button
                onClick={() => setStatsFor(pick)}
                className="shrink-0 rounded-md px-1.5 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                title="View stats"
              >
                ⓘ
              </button>
              <span
                className="w-9 shrink-0 text-right text-sm font-bold tabular-nums"
                style={{ color: PCT_COLOR(pick.percentile) }}
              >
                {pick.percentile}th
              </span>
            </div>
            <p className="pl-11 text-[11px] text-slate-600">
              {pickExplanation(pick)}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex w-full gap-3">
        <button
          onClick={copyToClipboard}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700"
        >
          {copied ? '✓ Copied!' : '⎘ Share'}
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
        >
          Play Again
        </button>
      </div>
    </main>
  );
}
