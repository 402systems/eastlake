import { config } from '../tracker.config';

// Types re-exported for components that import from this file
export type { Friend, NewFriend } from '../context/AppContext';

export function getDaysSince(lastAction: string | null): number {
  if (!lastAction) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastAction + 'T00:00:00');
  return Math.max(0, Math.floor((today.getTime() - last.getTime()) / 86_400_000));
}

export function getUrgencyColor(days: number): string {
  if (days >= 999) return '#dc2626';
  if (days >= config.urgencyThresholds.overdue) return '#dc2626';
  if (days >= config.urgencyThresholds.soon) return '#f97316';
  if (days >= config.urgencyThresholds.checkin) return '#eab308';
  return '#22c55e';
}
