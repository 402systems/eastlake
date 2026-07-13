import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import type { Game } from '../lib/types';
import type { PickWithUsername } from '../hooks/useWeekGames';

interface GameCardProps {
  game: Game;
  myPick: PickWithUsername | undefined;
  otherPicks: PickWithUsername[];
  usedTeamCodes: Set<string>;
  onPick: (teamCode: string) => void;
  isSubmitting: boolean;
}

function hasKickedOff(game: Game): boolean {
  return new Date(game.kickoff_time).getTime() <= Date.now();
}

function TeamButton({
  code,
  isMyPick,
  isUsed,
  disabled,
  onClick,
}: {
  code: string;
  isMyPick: boolean;
  isUsed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isMyPick ? 'default' : 'outline'}
      disabled={disabled || (isUsed && !isMyPick)}
      onClick={onClick}
      className="flex-1"
      title={
        isUsed && !isMyPick ? 'Already picked this team this phase' : undefined
      }
    >
      {code}
      {isUsed && !isMyPick ? ' (used)' : ''}
    </Button>
  );
}

export function GameCard({
  game,
  myPick,
  otherPicks,
  usedTeamCodes,
  onPick,
  isSubmitting,
}: GameCardProps) {
  const kickedOff = hasKickedOff(game);
  const isFinal = game.status === 'final';
  const locked = kickedOff || isSubmitting;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(game.kickoff_time).toLocaleString()}</span>
        <span className="uppercase">{game.status.replace('_', ' ')}</span>
      </div>

      <div className="flex items-center gap-3">
        <TeamButton
          code={game.away_team_code}
          isMyPick={myPick?.team_code === game.away_team_code}
          isUsed={usedTeamCodes.has(game.away_team_code)}
          disabled={locked}
          onClick={() => onPick(game.away_team_code)}
        />
        <span className="text-xs text-slate-400">@</span>
        <TeamButton
          code={game.home_team_code}
          isMyPick={myPick?.team_code === game.home_team_code}
          isUsed={usedTeamCodes.has(game.home_team_code)}
          disabled={locked}
          onClick={() => onPick(game.home_team_code)}
        />
      </div>

      {isFinal && (
        <p className="mt-2 text-sm text-slate-600">
          Final: {game.away_team_code} {game.away_score} — {game.home_team_code}{' '}
          {game.home_score}
          {game.winner_team_code && (
            <span className="font-medium"> · {game.winner_team_code} won</span>
          )}
        </p>
      )}

      {kickedOff && otherPicks.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-600">
          <p className="mb-1 font-medium text-slate-500">Picks for this game</p>
          <ul className="space-y-0.5">
            {otherPicks.map((pick) => (
              <li key={pick.id}>
                {pick.username}: {pick.team_code}
                {pick.is_correct === true && ' ✅'}
                {pick.is_correct === false && ' ❌'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
