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
}

export interface Week {
  id: string;
  league_id: string;
  phase: WeekPhase;
  week_number: number | null;
  playoff_round: PlayoffRound | null;
  sort_order: number;
}

export interface Team {
  code: string;
  name: string;
}

export interface Game {
  id: string;
  week_id: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_time: string;
  status: GameStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_code: string | null;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string | null;
  username: string;
  is_commissioner: boolean;
  is_simulated: boolean;
}

export interface Pick {
  id: string;
  league_member_id: string;
  week_id: string;
  game_id: string;
  team_code: string;
  phase: WeekPhase;
  is_correct: boolean | null;
}

export interface StandingsRow {
  league_member_id: string;
  username: string;
  win_points: number;
  loss_points: number;
  correct_picks: number;
  incorrect_picks: number;
}
