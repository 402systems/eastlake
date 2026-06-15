'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BALL_KNOWLEDGE_KEY } from '@/lib/constants';

const POSITIONS = [
  { icon: '🏏', label: 'Opener' },
  { icon: '🛡️', label: 'Middle Order' },
  { icon: '⚡', label: 'All-rounder' },
  { icon: '🌀', label: 'Spin' },
  { icon: '🎯', label: 'Pace' },
];

const STEPS = [
  {
    n: '1',
    title: 'Get a random squad',
    body: 'A franchise + season is dealt to you, one at a time.',
  },
  {
    n: '2',
    title: 'Draft one player',
    body: 'Pick a single player to fill one of your five slots.',
  },
  {
    n: '3',
    title: 'Build the best XI',
    body: 'Score your five against every player in IPL history.',
  },
];

const TEAM_COLORS = [
  '#F7B318',
  '#17479E',
  '#1C3E73',
  '#3A225D',
  '#00A19D',
  '#004BA0',
  '#E72C32',
  '#254AA5',
  '#C41E3A',
  '#F26522',
];

export default function HomePage() {
  const [ball, setBall] = useState(false);

  // Persist the toggle to localStorage (kept in sync, defaulting off on each
  // visit) so the game can read the mode without it being in the URL.
  useEffect(() => {
    try {
      localStorage.setItem(BALL_KNOWLEDGE_KEY, ball ? '1' : '0');
    } catch {
      // ignore storage being unavailable (e.g. private mode)
    }
  }, [ball]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="flex w-full max-w-md flex-col items-center">
        {/* Badge */}
        <div className="animate-fade-up glass mb-7 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-purple-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
          </span>
          19 seasons · 15 franchises
        </div>

        {/* Title */}
        <h1 className="animate-fade-up text-center text-7xl font-black tracking-tighter delay-1">
          <span className="text-gradient">IPL</span>
          <span className="ml-2 text-white">V</span>
        </h1>
        <p className="animate-fade-up mt-4 max-w-sm text-center text-[15px] leading-relaxed text-slate-300 delay-2">
          Five random IPL squads. One pick from each. Build the ultimate XI and
          see how it stacks up against every player in league history.
        </p>

        {/* Position preview */}
        <div className="animate-fade-up mt-7 flex max-w-xs flex-wrap items-center justify-center gap-2 delay-3">
          {POSITIONS.map((p) => (
            <div
              key={p.label}
              className="glass flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
            >
              <span className="text-base">{p.icon}</span>
              {p.label}
            </div>
          ))}
        </div>

        {/* Ball knowledge mode */}
        <button
          onClick={() => setBall((b) => !b)}
          className={`animate-fade-up mt-8 flex w-full max-w-xs items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all delay-4 ${
            ball
              ? 'border-purple-500/70 bg-purple-500/15 shadow-lg shadow-purple-900/30'
              : 'glass hover:border-white/20'
          }`}
        >
          <span className="text-2xl">{ball ? '🧠' : '👁'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Ball Knowledge Mode</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {ball
                ? 'Ratings hidden — trust your gut'
                : 'Ratings shown · sorted best first'}
            </p>
          </div>
          <div
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              ball ? 'bg-purple-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                ball ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        {/* CTA */}
        <Link
          href="/game"
          className="animate-fade-up group relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-12 py-4 text-lg font-black text-white shadow-xl shadow-purple-900/50 transition-transform delay-4 hover:scale-[1.03] active:scale-95"
        >
          <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
          Play
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>

        {/* How to play */}
        <div className="animate-fade-up mt-12 grid w-full gap-2.5 delay-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="glass flex items-start gap-3 rounded-2xl p-3.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-sm font-black text-purple-300">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-bold text-white">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Team color strip */}
        <div className="animate-fade-in mt-10 flex items-center gap-1.5 delay-5">
          {TEAM_COLORS.map((c, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
