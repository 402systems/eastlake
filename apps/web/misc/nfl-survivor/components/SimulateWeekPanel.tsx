'use client';

import { useState } from 'react';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import {
  Alert,
  AlertDescription,
} from '@eastlake/lib-core-ui/components/ui/alert';

export function SimulateWeekPanel({
  simulateWeek,
  advanceWeek,
  generatePlayoffs,
  isBusy,
  onChanged,
}: {
  simulateWeek: () => Promise<{
    resolved: unknown[];
    picks_generated: number;
  } | null>;
  advanceWeek: () => Promise<unknown | null>;
  generatePlayoffs: () => Promise<unknown | null>;
  isBusy: boolean;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="mb-1 font-semibold text-amber-900">Simulation controls</h3>
      <p className="mb-3 text-sm text-amber-800">
        Randomly picks for any member who hasn&apos;t picked yet, then resolves
        the current week&apos;s remaining games with random results — repeat
        with advance to fast-forward through the season solo.
      </p>

      {message && (
        <Alert className="mb-3">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isBusy}
          onClick={async () => {
            const res = await simulateWeek();
            if (res) {
              setMessage(
                `Generated ${res.picks_generated} pick(s), resolved ${res.resolved.length} game(s).`
              );
              onChanged();
            }
          }}
        >
          Simulate week
        </Button>
        <Button
          variant="outline"
          disabled={isBusy}
          onClick={async () => {
            const res = await advanceWeek();
            if (res) {
              setMessage('Advanced to the next week.');
              onChanged();
            }
          }}
        >
          Advance week
        </Button>
        <Button
          variant="ghost"
          disabled={isBusy}
          onClick={async () => {
            const res = await generatePlayoffs();
            if (res) {
              setMessage('Playoff weeks generated.');
              onChanged();
            }
          }}
        >
          Generate playoffs
        </Button>
      </div>
    </div>
  );
}
