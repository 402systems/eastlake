import type { Station } from './types';

const ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  av: 'avenue',
  ave: 'avenue',
  sq: 'square',
  pkwy: 'parkway',
  blvd: 'boulevard',
  hts: 'heights',
  pl: 'place',
  ctr: 'center',
  jct: 'junction',
};

const ORDINAL_RE = /^(\d+)(st|nd|rd|th)$/;

export function normalizeStationName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const ordinalMatch = token.match(ORDINAL_RE);
      const base = ordinalMatch ? ordinalMatch[1] : token;
      return ABBREVIATIONS[base] ?? base;
    })
    .join(' ');
}

export function matchGuess(guess: string, stations: Station[]): Station | null {
  const normalizedGuess = normalizeStationName(guess);
  if (normalizedGuess.length === 0) return null;

  const matches = stations.filter((station) =>
    normalizeStationName(station.name).includes(normalizedGuess)
  );

  return matches.length === 1 ? matches[0] : null;
}
