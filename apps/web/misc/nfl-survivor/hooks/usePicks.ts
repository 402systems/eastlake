import { useCallback, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { WeekPhase } from '../lib/types';

interface SubmitPickArgs {
  leagueMemberId: string;
  weekId: string;
  gameId: string;
  teamCode: string;
  phase: WeekPhase;
}

/**
 * Submits/updates the current member's pick for a week. Relies entirely on RLS +
 * the DB unique constraints for enforcement (kickoff lock, one pick per team per
 * phase) — a rejected write surfaces as a Postgres error we forward to the caller.
 */
export function usePicks() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPick = useCallback(async (args: SubmitPickArgs) => {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { error: upsertError } = await supabase.from('picks').upsert(
      {
        league_member_id: args.leagueMemberId,
        week_id: args.weekId,
        game_id: args.gameId,
        team_code: args.teamCode,
        phase: args.phase,
      },
      { onConflict: 'league_member_id,week_id' }
    );

    setIsSubmitting(false);
    if (upsertError) {
      const message = upsertError.message.includes(
        'picks_member_phase_team_unique'
      )
        ? "You've already picked that team this phase — pick a different one."
        : upsertError.message.includes('kickoff') ||
            upsertError.code === '42501'
          ? "That game has already kicked off, or it's not your pick to make."
          : upsertError.message;
      setError(message);
      return { error: message };
    }
    return { error: null };
  }, []);

  return { submitPick, isSubmitting, error };
}
