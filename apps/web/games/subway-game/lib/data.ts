import type { LineSummary, LineData, BoroughsData, StreetsData } from './types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export async function fetchLines(): Promise<LineSummary[]> {
  const res = await fetch(`${BASE}/data/lines.json`);
  if (!res.ok) throw new Error('Failed to load lines');
  return res.json();
}

export async function fetchLine(id: string): Promise<LineData> {
  const res = await fetch(`${BASE}/data/lines/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load line ${id}`);
  return res.json();
}

export async function fetchBoroughs(): Promise<BoroughsData> {
  const res = await fetch(`${BASE}/data/boroughs.json`);
  if (!res.ok) throw new Error('Failed to load boroughs');
  return res.json();
}

export async function fetchStreets(): Promise<StreetsData> {
  const res = await fetch(`${BASE}/data/streets.json`);
  if (!res.ok) throw new Error('Failed to load streets');
  return res.json();
}
