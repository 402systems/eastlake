import type { Club, Nation, Squad } from './types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export async function fetchClubs(): Promise<Club[]> {
  const res = await fetch(`${BASE}/data/clubs.json`);
  if (!res.ok) throw new Error('Failed to load clubs');
  return res.json();
}

export async function fetchSquad(
  clubId: string,
  era: string
): Promise<Squad | null> {
  const res = await fetch(`${BASE}/data/squads/${clubId}_${era}.json`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchNations(): Promise<Nation[]> {
  const res = await fetch(`${BASE}/data/nations.json`);
  if (!res.ok) throw new Error('Failed to load nations');
  return res.json();
}

export async function fetchNationSquad(
  nationId: string,
  era: string
): Promise<Squad | null> {
  const res = await fetch(`${BASE}/data/nations/${nationId}_${era}.json`);
  if (!res.ok) return null;
  return res.json();
}
