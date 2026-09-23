'use client';

import { useEffect, useState } from 'react';

import { useBattleRunner } from '@/lib/anim/useBattleRunner';
import type {
  FinalResult,
  PlayerAction,
  WildBattle,
} from '@/lib/engine/battle';

import { BattleScene, TEXT_AREA } from './BattleScene';
import { ActionMenus } from './Menus';
import { TextBox } from './TextBox';

export function BattleView({
  battle,
  playerName,
  initialActions,
  onAction,
  onEnd,
}: {
  battle: WildBattle;
  playerName: string;
  initialActions: PlayerAction[];
  onAction: (actions: PlayerAction[]) => void;
  onEnd: (result: FinalResult) => void;
}) {
  const runner = useBattleRunner({
    battle,
    playerName,
    initialActions,
    onAction,
    onEnd,
  });
  const { view, targets, start, choose, advance } = runner;
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    start();
  }, [start]);

  // Menu messages ("You can't run...") show briefly in the text box.
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 1400);
    return () => clearTimeout(id);
  }, [message]);

  const showMenus = view.phase === 'input' && view.available && !message;

  return (
    <BattleScene view={view} targets={targets}>
      {showMenus && view.available ? (
        <ActionMenus
          key={`${battle.turn}-${view.available.mode}`}
          available={view.available}
          prompt={view.text}
          onChoose={choose}
          onMessage={setMessage}
        />
      ) : (
        <div className="gba" style={TEXT_AREA}>
          <TextBox
            key={message ?? view.text}
            text={message ?? view.text}
            revealAll={view.revealAll}
            onAdvance={message ? () => setMessage(null) : advance}
          />
        </div>
      )}
    </BattleScene>
  );
}
