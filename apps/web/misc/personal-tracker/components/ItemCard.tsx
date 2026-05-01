import { Button } from '@eastlake/core-ui/components/ui/button';
import { Badge } from '@eastlake/core-ui/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eastlake/core-ui/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { getDaysSince, getItemStyles } from '../hooks/useItems';
import { config } from '../tracker.config';
import type { Item } from '../hooks/useItems';

interface ItemCardProps {
  item: Item;
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
}

function getUrgencyBadge(days: number) {
  const { checkin, soon, overdue } = config.urgencyThresholds;
  if (days >= 999)
    return { label: config.neverLabel, variant: 'destructive' as const };
  if (days >= overdue)
    return { label: 'Overdue', variant: 'destructive' as const };
  if (days >= soon) return { label: 'Soon', variant: 'secondary' as const };
  if (days >= checkin)
    return { label: 'Check in', variant: 'outline' as const };
  return null;
}

function getDaysLabel(days: number): string {
  if (days >= 999) return 'Never';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function ItemCard({ item, onAction, onDelete }: ItemCardProps) {
  const days = getDaysSince(item.last_action);
  const styles = getItemStyles(days);
  const badge = getUrgencyBadge(days);
  const daysLabel = getDaysLabel(days);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span style={styles} className="leading-tight font-semibold">
            {item.name}
          </span>
          {badge && (
            <Badge variant={badge.variant} className="shrink-0 text-xs">
              {badge.label}
            </Badge>
          )}
        </div>
        <span className="text-xs text-slate-400">{daysLabel}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={() => onAction(item.id)}>
              {config.actionLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset counter to today</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove {config.itemNoun.singular}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
