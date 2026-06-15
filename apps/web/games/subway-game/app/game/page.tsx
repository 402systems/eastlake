'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBoroughs, fetchLine, fetchLines } from '@/lib/data';
import { matchGuess } from '@/lib/matchStation';
import type { BoroughsData, LineData, LineSummary } from '@/lib/types';
import { ProgressHeader } from '@/components/ProgressHeader';
import { GuessInput } from '@/components/GuessInput';
import { SubwayMap } from '@/components/SubwayMap';
import { CompletionScreen } from '@/components/CompletionScreen';

const ERROR_FLASH_MS = 300;

export default function GamePage() {
  const [lines, setLines] = useState<LineSummary[] | null>(null);
  const [boroughs, setBoroughs] = useState<BoroughsData | null>(null);
  const [line, setLine] = useState<LineData | null>(null);
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const usedRef = useRef(new Set<string>());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickLine = useCallback(async (allLines: LineSummary[]) => {
    let pool = allLines.filter((l) => !usedRef.current.has(l.id));
    if (pool.length === 0) {
      usedRef.current.clear();
      pool = allLines;
    }
    const choice = pool[Math.floor(Math.random() * pool.length)];
    usedRef.current.add(choice.id);

    const lineData = await fetchLine(choice.id);
    setLine(lineData);
    setGuessedIds(new Set());
    setInput('');
    setError(false);
    setDone(false);
    setStartTime(Date.now());
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [linesData, boroughsData] = await Promise.all([
        fetchLines(),
        fetchBoroughs(),
      ]);
      if (cancelled) return;
      setLines(linesData);
      setBoroughs(boroughsData);
      await pickLine(linesData);
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickLine]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!line) return;

    const unguessed = line.stations.filter((s) => !guessedIds.has(s.id));
    const match = matchGuess(input, unguessed);

    if (match) {
      const next = new Set(guessedIds);
      next.add(match.id);
      setGuessedIds(next);
      setInput('');
      if (next.size === line.stations.length) {
        setElapsedMs(Date.now() - startTime);
        setDone(true);
      }
    } else {
      setInput('');
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setError(true);
      errorTimeoutRef.current = setTimeout(
        () => setError(false),
        ERROR_FLASH_MS
      );
    }
  }, [line, guessedIds, input, startTime]);

  const handleGiveUp = useCallback(() => {
    setElapsedMs(Date.now() - startTime);
    setDone(true);
  }, [startTime]);

  const handlePlayAgain = useCallback(async () => {
    if (!lines) return;
    setLoading(true);
    await pickLine(lines);
    setLoading(false);
  }, [lines, pickLine]);

  if (loading || !line || !boroughs) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (done) {
    return (
      <CompletionScreen
        line={line}
        guessedIds={guessedIds}
        elapsedMs={elapsedMs}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0e17]">
      <ProgressHeader
        line={line}
        foundCount={guessedIds.size}
        totalCount={line.stations.length}
        onGiveUp={handleGiveUp}
      />
      <div className="flex-1 overflow-hidden">
        <SubwayMap line={line} boroughs={boroughs} guessedIds={guessedIds} />
      </div>
      <GuessInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        error={error}
      />
    </div>
  );
}
