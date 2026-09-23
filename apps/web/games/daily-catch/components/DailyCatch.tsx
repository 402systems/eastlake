'use client';

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import '@/lib/engine/mod';
import {
  WildBattle,
  type FinalResult,
  type PlayerAction,
} from '@/lib/engine/battle';
import { BALL_NAMES, type BallId } from '@/lib/engine/catch';
import {
  dailyChallenge,
  dateKey,
  randomChallenge,
  type DailyChallenge,
} from '@/lib/engine/daily';
import { THROWABLE_BALLS } from '@/lib/engine/mod';
import { SAMPLE_TEAM, cloneTeam } from '@/lib/engine/team';
import { loadRecord, saveRecord, type DailyRecord } from '@/lib/storage';
import { ballIconCss, preload, spriteUrl } from '@/lib/sprites';

import { BattleView } from './BattleView';

const PLAYER_NAME = 'Player';

function todayKey(): string {
  // ?date=YYYY-MM-DD lets development builds play any day.
  if (process.env.NODE_ENV !== 'production') {
    const param = new URLSearchParams(window.location.search).get('date');
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
  }
  return dateKey();
}

type Screen = 'title' | 'battle' | 'result';

type Mode = { kind: 'daily' } | { kind: 'random'; challenge: DailyChallenge };

export default function DailyCatch() {
  const [dayKey] = useState(todayKey);
  const daily = useMemo(() => dailyChallenge(dayKey), [dayKey]);
  const [mode, setMode] = useState<Mode>({ kind: 'daily' });
  const nav: Nav = {
    random: () => setMode({ kind: 'random', challenge: randomChallenge() }),
    daily: () => setMode({ kind: 'daily' }),
  };

  if (mode.kind === 'daily') {
    return (
      <Game
        key="daily"
        challenge={daily}
        label={dayKey}
        saveKey={dayKey}
        nav={nav}
      />
    );
  }
  return (
    <Game
      key={mode.challenge.key}
      challenge={mode.challenge}
      label="Random encounter"
      saveKey={null}
      nav={nav}
    />
  );
}

interface Nav {
  random: () => void;
  daily: () => void;
}

const EMPTY_RECORD: DailyRecord = { actions: [], result: null };

/**
 * One challenge: title, battle and result screens. `saveKey` persists
 * progress (the daily challenge); random encounters pass null.
 */
function Game({
  challenge,
  label,
  saveKey,
  nav,
}: {
  challenge: DailyChallenge;
  label: string;
  saveKey: string | null;
  nav: Nav;
}) {
  const isDaily = saveKey !== null;
  const [record, setRecord] = useState<DailyRecord>(() =>
    saveKey ? loadRecord(saveKey) : EMPTY_RECORD
  );
  const [screen, setScreen] = useState<Screen>(() =>
    !isDaily ? 'battle' : record.result ? 'result' : 'title'
  );
  const [battleKey, setBattleKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const initialActions = useRef<PlayerAction[]>(record.actions);

  const battle = useMemo(
    () =>
      new WildBattle({
        seed: challenge.battleSeed,
        playerName: PLAYER_NAME,
        team: cloneTeam(),
        wild: challenge.wild.set,
        catchRate: challenge.catchRate,
        balls: challenge.balls,
      }),
    // battleKey forces a fresh battle if a saved replay fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge, battleKey]
  );

  useEffect(() => {
    void preload([
      spriteUrl(challenge.wild.set.species, { shiny: challenge.wild.shiny }),
      ...SAMPLE_TEAM.flatMap((s) => [
        spriteUrl(s.species, { back: true }),
        spriteUrl(s.species),
      ]),
    ]);
  }, [challenge]);

  const onAction = useCallback(
    (actions: PlayerAction[]) => {
      const next = { actions, result: null };
      setRecord(next);
      if (saveKey) saveRecord(saveKey, next);
    },
    [saveKey]
  );

  const onEnd = useCallback(
    (result: FinalResult) => {
      setRecord((r) => {
        const next = { ...r, result };
        if (saveKey) saveRecord(saveKey, next);
        return next;
      });
    },
    [saveKey]
  );

  if (screen === 'title') {
    return (
      <Title
        dateKey={label}
        balls={challenge.balls}
        resuming={record.actions.length > 0}
        onStart={() => setScreen('battle')}
        onRandom={nav.random}
      />
    );
  }

  if (screen === 'result' && record.result) {
    return (
      <Result
        label={label}
        isDaily={isDaily}
        challenge={challenge}
        record={record}
        nav={nav}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <Header label={label} isDaily={isDaily} nav={nav} />
      {error && (
        <p className="rounded bg-red-900/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <ErrorBoundaryish
        onError={(message) => {
          // A saved replay no longer matches (e.g. after an update): start the day over.
          setError(
            `Couldn't restore your saved battle (${message}). Starting fresh.`
          );
          initialActions.current = [];
          setRecord(EMPTY_RECORD);
          if (saveKey) saveRecord(saveKey, EMPTY_RECORD);
          setBattleKey((k) => k + 1);
        }}
      >
        <BattleView
          key={battleKey}
          battle={battle}
          playerName={PLAYER_NAME}
          initialActions={initialActions.current}
          onAction={onAction}
          onEnd={onEnd}
        />
      </ErrorBoundaryish>
      {record.result && (
        <button
          type="button"
          onClick={() => setScreen('result')}
          className="self-center rounded-xl bg-amber-500 px-8 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          See result
        </button>
      )}
    </main>
  );
}

/** Catches a failed replay of saved actions so the day can restart cleanly. */
class ErrorBoundaryish extends Component<
  { onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : String(error));
    this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const LINK =
  'rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-100 hover:bg-slate-700';

function Header({
  label,
  isDaily,
  nav,
}: {
  label: string;
  isDaily: boolean;
  nav: Nav;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Daily <span className="text-amber-400">Catch</span>
        </h1>
        <span className="text-sm text-slate-400 tabular-nums">{label}</span>
      </div>
      <nav className="flex gap-2">
        {!isDaily && (
          <button type="button" className={LINK} onClick={nav.daily}>
            Daily
          </button>
        )}
        <button type="button" className={LINK} onClick={nav.random}>
          {isDaily ? 'Random encounter' : 'New Pokémon'}
        </button>
      </nav>
    </header>
  );
}

function BallList({ balls }: { balls: Partial<Record<BallId, number>> }) {
  return (
    <ul className="flex flex-wrap justify-center gap-3">
      {THROWABLE_BALLS.filter((b) => balls[b]).map((b) => (
        <li
          key={b}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
        >
          <span style={ballIconCss(b)} aria-hidden />
          {BALL_NAMES[b]} ×{balls[b]}
        </li>
      ))}
    </ul>
  );
}

function Title({
  dateKey,
  balls,
  resuming,
  onStart,
  onRandom,
}: {
  dateKey: string;
  balls: Partial<Record<BallId, number>>;
  resuming: boolean;
  onStart: () => void;
  onRandom: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div>
        <p className="text-sm tracking-widest text-slate-400 tabular-nums">
          {dateKey}
        </p>
        <h1 className="mt-1 text-5xl font-bold tracking-tight text-white">
          Daily <span className="text-amber-400">Catch</span>
        </h1>
        <p className="mt-3 text-slate-300">
          Something is rustling in the tall grass… One wild Pokémon a day. Catch
          it before it faints.
        </p>
      </div>
      <section className="w-full rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
          Today&apos;s bag
        </h2>
        <BallList balls={balls} />
      </section>
      <section className="w-full rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
          Your team
        </h2>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SAMPLE_TEAM.map((s) => (
            <li
              key={s.species}
              className="flex flex-col items-center text-xs text-slate-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spriteUrl(s.species)}
                alt=""
                width={64}
                height={64}
                className="[image-rendering:pixelated]"
              />
              {s.species} <span className="text-slate-500">Lv{s.level}</span>
            </li>
          ))}
        </ul>
      </section>
      <button
        type="button"
        onClick={onStart}
        className="rounded-2xl bg-amber-500 px-10 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-amber-900/40 hover:bg-amber-400"
      >
        {resuming ? 'Continue battle →' : 'Walk into the grass →'}
      </button>
      <button type="button" className={LINK} onClick={onRandom}>
        Or battle a random Pokémon (not saved)
      </button>
    </main>
  );
}

const OUTCOME_TEXT: Record<FinalResult['kind'], string> = {
  caught: 'Gotcha!',
  wildFainted: 'It fainted…',
  whiteout: 'You blacked out!',
  fled: 'It got away…',
  draw: 'The battle ended in a draw.',
};

function Result({
  label,
  isDaily,
  challenge,
  record,
  nav,
}: {
  label: string;
  isDaily: boolean;
  challenge: DailyChallenge;
  record: DailyRecord;
  nav: Nav;
}) {
  const result = record.result!;
  const species = challenge.wild.set.species;
  const ballsUsed = record.actions.filter((a) => a.kind === 'ball').length;
  const turns = record.actions.length;
  const summary =
    result.kind === 'caught'
      ? `Caught ${species} (Lv${challenge.level}) with a ${BALL_NAMES[result.ball]} after ${ballsUsed} throw${ballsUsed === 1 ? '' : 's'}.`
      : result.kind === 'fled'
        ? result.by === 'p1'
          ? `${species} was driven off by ${result.move}.`
          : `The wild ${species} escaped with ${result.move}.`
        : result.kind === 'wildFainted'
          ? `The wild ${species} (Lv${challenge.level}) fainted.`
          : result.kind === 'whiteout'
            ? `Your whole team fainted against ${species} (Lv${challenge.level}).`
            : `The battle against ${species} was a draw.`;
  const [copied, setCopied] = useState(false);
  const share = `Daily Catch ${label}: ${result.kind === 'caught' ? `caught ${species} 🎯` : OUTCOME_TEXT[result.kind]} · ${ballsUsed} ball${ballsUsed === 1 ? '' : 's'} · ${turns} action${turns === 1 ? '' : 's'}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <p className="text-sm tracking-widest text-slate-400 tabular-nums">
        {label}
      </p>
      <h1 className="text-4xl font-bold text-white">
        {OUTCOME_TEXT[result.kind]}
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spriteUrl(species, { shiny: challenge.wild.shiny })}
        alt={species}
        width={192}
        height={192}
        className={`[image-rendering:pixelated] ${result.kind === 'caught' ? '' : 'opacity-40 grayscale'}`}
      />
      <p className="text-slate-300">{summary}</p>
      {challenge.wild.shiny && (
        <p className="text-amber-300">✦ It was a shiny!</p>
      )}
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(share).then(
            () => setCopied(true),
            () => setCopied(false)
          );
        }}
        className="rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-700"
      >
        {copied ? 'Copied!' : 'Copy result'}
      </button>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={LINK} onClick={nav.random}>
          {isDaily ? 'Battle a random Pokémon' : 'Another random Pokémon'}
        </button>
        {!isDaily && (
          <button type="button" className={LINK} onClick={nav.daily}>
            Back to the daily
          </button>
        )}
      </div>
      {isDaily && (
        <p className="text-sm text-slate-500">
          A new daily Pokémon appears tomorrow.
        </p>
      )}
    </main>
  );
}
