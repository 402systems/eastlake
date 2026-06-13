import type { IplTeam, IplSquad, SeasonTeam } from './types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export async function fetchTeams(): Promise<IplTeam[]> {
  const res = await fetch(`${BASE}/data/teams.json`);
  if (!res.ok) throw new Error('Failed to load teams');
  return res.json();
}

export async function fetchSquad(
  teamId: string,
  year: string
): Promise<IplSquad | null> {
  const res = await fetch(`${BASE}/data/squads/${teamId}_${year}.json`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeasons(): Promise<Record<string, SeasonTeam[]>> {
  const res = await fetch(`${BASE}/data/seasons.json`);
  if (!res.ok) return {};
  return res.json();
}
