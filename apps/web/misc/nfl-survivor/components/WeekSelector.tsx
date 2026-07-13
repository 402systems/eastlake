import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eastlake/lib-core-ui/components/ui/select';
import type { Week } from '../lib/types';
import { weekLabel } from '../hooks/useWeeks';

export function WeekSelector({
  weeks,
  selectedWeekId,
  currentWeekId,
  onSelect,
}: {
  weeks: Week[];
  selectedWeekId: string | null;
  currentWeekId: string | null;
  onSelect: (weekId: string) => void;
}) {
  return (
    <Select value={selectedWeekId ?? undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a week" />
      </SelectTrigger>
      <SelectContent>
        {weeks.map((week) => (
          <SelectItem key={week.id} value={week.id}>
            {weekLabel(week)}
            {week.id === currentWeekId ? ' (current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
