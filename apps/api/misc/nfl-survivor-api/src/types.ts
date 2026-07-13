export interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  /** Bypasses RLS — only used for game/schedule writes and commissioner-privileged actions. */
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type WeekPhase = 'regular' | 'playoff';
export type PlayoffRound =
  | 'wild_card'
  | 'divisional'
  | 'conference'
  | 'super_bowl';
export type GameStatus = 'scheduled' | 'in_progress' | 'final';

export interface League {
  id: string;
  name: string;
  commissioner_id: string;
  invite_code: string;
  season_year: number;
  is_simulation: boolean;
  current_week_id: string | null;
  created_at: string;
}

export interface Week {
  id: string;
  league_id: string;
  season_year: number;
  phase: WeekPhase;
  week_number: number | null;
  playoff_round: PlayoffRound | null;
  espn_week_number: number | null;
  espn_season_type: number | null;
  sort_order: number;
  locked: boolean;
}

export interface Game {
  id: string;
  week_id: string;
  espn_event_id: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_time: string;
  status: GameStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_code: string | null;
  is_simulated_result: boolean;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string | null;
  username: string;
  is_commissioner: boolean;
  is_simulated: boolean;
}

export interface NewLeague {
  name: string;
  season_year: number;
  is_simulation: boolean;
}

export interface JoinLeagueBody {
  invite_code: string;
  username: string;
}
