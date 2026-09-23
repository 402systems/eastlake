import type { FinalResult, PlayerAction } from './engine/battle';
import { THROWABLE_BALLS } from './engine/mod';

export interface DailyRecord {
  actions: PlayerAction[];
  result: FinalResult | null;
}

// Bump when challenges change so stale saves are ignored rather than replayed.
const KEY_PREFIX = 'daily-catch:v2:';

function isAction(a: unknown): a is PlayerAction {
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  if (x.kind === 'move' || x.kind === 'switch')
    return Number.isInteger(x.slot) && (x.slot as number) >= 1;
  if (x.kind === 'ball') return THROWABLE_BALLS.includes(x.ball as never);
  return false;
}

function isResult(r: unknown): r is FinalResult {
  if (!r || typeof r !== 'object') return false;
  const kind = (r as { kind?: unknown }).kind;
  return ['caught', 'wildFainted', 'whiteout', 'fled', 'draw'].includes(
    kind as string
  );
}

export function loadRecord(dateKey: string): DailyRecord {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + dateKey);
    if (!raw) return { actions: [], result: null };
    const parsed = JSON.parse(raw) as { actions?: unknown; result?: unknown };
    const actions =
      Array.isArray(parsed.actions) && parsed.actions.every(isAction)
        ? parsed.actions
        : [];
    const result = isResult(parsed.result) ? parsed.result : null;
    return { actions, result };
  } catch {
    return { actions: [], result: null };
  }
}

export function saveRecord(dateKey: string, record: DailyRecord) {
  try {
    window.localStorage.setItem(KEY_PREFIX + dateKey, JSON.stringify(record));
  } catch {
    // Storage unavailable (private mode, quota): the day simply won't persist.
  }
}
