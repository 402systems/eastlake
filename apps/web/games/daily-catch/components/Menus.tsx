'use client';

import { Dex } from '@pkmn/sim';
import { useState } from 'react';

import { hpBar, parseCondition } from '@/lib/anim/steps';
import type { AvailableActions, PlayerAction } from '@/lib/engine/battle';
import { BALL_NAMES, type BallId } from '@/lib/engine/catch';
import { THROWABLE_BALLS } from '@/lib/engine/mod';
import { ballIconCss, spriteUrl } from '@/lib/sprites';

const gen3 = Dex.mod('gen3');

type MenuView = 'main' | 'fight' | 'bag' | 'party';

export function ActionMenus({
  available,
  prompt,
  onChoose,
  onMessage,
}: {
  available: AvailableActions;
  prompt: string;
  onChoose: (action: PlayerAction) => void;
  onMessage: (text: string) => void;
}) {
  const [view, setView] = useState<MenuView>(
    available.mode === 'switch' ? 'party' : 'main'
  );
  const forced = available.mode === 'switch';

  if (view === 'party' || forced) {
    return (
      <PartyPanel
        available={available}
        onBack={forced ? undefined : () => setView('main')}
        onPick={(slot) => onChoose({ kind: 'switch', slot })}
      />
    );
  }
  if (view === 'bag') {
    return (
      <BagPanel
        available={available}
        onBack={() => setView('main')}
        onPick={(ball) => onChoose({ kind: 'ball', ball })}
      />
    );
  }
  if (view === 'fight') {
    return (
      <FightMenu
        available={available}
        onBack={() => setView('main')}
        onPick={(slot) => onChoose({ kind: 'move', slot })}
      />
    );
  }

  return (
    <div
      className="gba flex gap-[calc(var(--px)*2)]"
      style={
        { '--x': 0, '--y': 112, '--w': 240, '--h': 48 } as React.CSSProperties
      }
    >
      <div className="textbox flex-1 cursor-default">{prompt}</div>
      <div className="menu grid w-[calc(var(--px)*108)] grid-cols-2 content-center">
        <button
          type="button"
          className="menu-item"
          onClick={() => setView('fight')}
          autoFocus
        >
          FIGHT
        </button>
        <button
          type="button"
          className="menu-item"
          onClick={() =>
            available.canThrow
              ? setView('bag')
              : onMessage(noBagReason(available))
          }
        >
          BAG
        </button>
        <button
          type="button"
          className="menu-item"
          onClick={() => setView('party')}
        >
          POKéMON
        </button>
        <button
          type="button"
          className="menu-item"
          onClick={() => onMessage("You can't run from today's catch!")}
        >
          RUN
        </button>
      </div>
    </div>
  );
}

function noBagReason(available: AvailableActions) {
  const left = Object.values(available.balls).reduce((n, v) => n + (v ?? 0), 0);
  return left
    ? "There's no time to use the BAG now!"
    : 'There are no POKé BALLS left!';
}

function FightMenu({
  available,
  onBack,
  onPick,
}: {
  available: AvailableActions;
  onBack: () => void;
  onPick: (slot: number) => void;
}) {
  const [focus, setFocus] = useState(
    available.moves.find((m) => !m.disabled)?.slot ?? 1
  );
  const current =
    available.moves.find((m) => m.slot === focus) ?? available.moves[0];
  const type = current ? gen3.moves.get(current.id).type : '';
  // A locked-in move (Outrage, recharge...) shows as a single forced option.
  return (
    <div
      className="gba flex gap-[calc(var(--px)*2)]"
      style={
        { '--x': 0, '--y': 112, '--w': 240, '--h': 48 } as React.CSSProperties
      }
    >
      <div className="menu grid flex-1 grid-cols-2 content-center">
        {available.moves.map((m) => (
          <button
            key={m.slot}
            type="button"
            className="menu-item"
            disabled={m.disabled}
            onMouseEnter={() => setFocus(m.slot)}
            onFocus={() => setFocus(m.slot)}
            onClick={() => onPick(m.slot)}
            autoFocus={m.slot === focus}
          >
            {m.name.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="menu flex w-[calc(var(--px)*78)] flex-col justify-center px-[calc(var(--px)*4)] text-[calc(var(--px)*8.5)] whitespace-nowrap">
        {current?.maxpp !== undefined && (
          <div className="flex justify-between">
            <span>PP</span>
            <span className="tabular-nums">
              {current.pp}/{current.maxpp}
            </span>
          </div>
        )}
        {type && <div>TYPE/{type.toUpperCase()}</div>}
        <button
          type="button"
          className="menu-item mt-auto self-end"
          onClick={onBack}
        >
          BACK
        </button>
      </div>
    </div>
  );
}

function BagPanel({
  available,
  onBack,
  onPick,
}: {
  available: AvailableActions;
  onBack: () => void;
  onPick: (ball: BallId) => void;
}) {
  const balls = THROWABLE_BALLS.filter((b) => (available.balls[b] ?? 0) > 0);
  return (
    <div className="overlay">
      <div className="menu px-[calc(var(--px)*6)] py-[calc(var(--px)*3)] font-bold">
        POKé BALLS
      </div>
      <div className="menu flex flex-1 flex-col p-[calc(var(--px)*3)]">
        {balls.map((ball, i) => (
          <button
            key={ball}
            type="button"
            className="menu-item justify-between"
            onClick={() => onPick(ball)}
            autoFocus={i === 0}
          >
            <span className="flex items-center gap-[calc(var(--px)*3)]">
              <span style={ballIconCss(ball)} aria-hidden />
              {BALL_NAMES[ball]}
            </span>
            <span className="tabular-nums">×{available.balls[ball]}</span>
          </button>
        ))}
        <button type="button" className="menu-item mt-auto" onClick={onBack}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

function PartyPanel({
  available,
  onBack,
  onPick,
}: {
  available: AvailableActions;
  onBack?: () => void;
  onPick: (slot: number) => void;
}) {
  const [notice, setNotice] = useState<string>(
    onBack ? 'Choose a POKéMON.' : 'Choose a POKéMON to send out.'
  );
  return (
    <div className="overlay">
      <div className="grid flex-1 grid-cols-2 content-start gap-[calc(var(--px)*3)]">
        {available.switches.map((s) => {
          const c = parseCondition(s.condition);
          const bar = hpBar(c.hp, c.maxhp);
          const blocked = s.fainted || s.active;
          return (
            <button
              key={s.slot}
              type="button"
              className="menu flex items-center gap-[calc(var(--px)*2)] px-[calc(var(--px)*2)] py-[calc(var(--px)*1)] text-left disabled:opacity-50"
              disabled={s.fainted}
              onClick={() => {
                if (s.active)
                  setNotice(`${s.name.toUpperCase()} is already in battle!`);
                else if (!available.canSwitch && onBack)
                  setNotice("It can't be switched out!");
                else if (!blocked) onPick(s.slot);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spriteUrl(s.species)}
                alt=""
                className="h-[calc(var(--px)*24)] w-[calc(var(--px)*24)] shrink-0 [image-rendering:pixelated]"
              />
              <span className="flex min-w-0 flex-1 flex-col text-[calc(var(--px)*8)]">
                <span className="flex justify-between gap-[calc(var(--px)*2)]">
                  <span className="truncate font-bold uppercase">
                    {s.name} {s.active && '●'}
                  </span>
                  <span className="shrink-0">Lv{s.level}</span>
                </span>
                <span className="hp-track justify-between">
                  <span className="hp-bar">
                    <span
                      className={`hp-fill block ${bar.color}`}
                      style={{ width: `${(bar.pixels / 48) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums">
                    {s.fainted ? 'FNT' : `${c.hp}/${c.maxhp}`}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-[calc(var(--px)*3)]">
        <div className="textbox flex-1 cursor-default py-[calc(var(--px)*2)] text-[calc(var(--px)*9)]">
          {notice}
        </div>
        {onBack && (
          <button type="button" className="menu menu-item" onClick={onBack}>
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
