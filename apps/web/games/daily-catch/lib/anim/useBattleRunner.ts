'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';

import type {
  AvailableActions,
  BattleResult,
  FinalResult,
  PlayerAction,
  WildBattle,
} from '../engine/battle';
import type { BallId } from '../engine/catch';
import * as A from './animations';
import {
  EMPTY_SCENE,
  StepBuilder,
  applyStep,
  hpBar,
  type Scene,
  type SideKey,
  type Step,
} from './steps';

export type Phase = 'intro' | 'playing' | 'input' | 'ended';

export interface SceneRefs {
  playerSprite: HTMLImageElement | null;
  wildSprite: HTMLImageElement | null;
  playerBox: HTMLDivElement | null;
  wildBox: HTMLDivElement | null;
  ball: HTMLDivElement | null;
  flash: HTMLDivElement | null;
  stars: HTMLDivElement | null;
  sparkle: HTMLDivElement | null;
}

/** Ref objects for each animated element, to pass straight to `ref`. */
export type SceneRefObjects = {
  [K in keyof SceneRefs]: RefObject<SceneRefs[K]>;
};

export interface RunnerView {
  phase: Phase;
  scene: Scene;
  text: string;
  /** Increments whenever the text box should reveal its full text immediately. */
  revealAll: number;
  hpDrainMs: Record<SideKey, number>;
  ball: BallId | null;
  available: AvailableActions | null;
  result: BattleResult;
}

const TYPE_MS_PER_CHAR = 28;
const HOLD_MS = 650;

/**
 * Drives a WildBattle: submits actions, turns the protocol into steps, and
 * plays them in order with animations and text.
 */
export function useBattleRunner(options: {
  battle: WildBattle;
  playerName: string;
  /** Actions already taken (restored from storage); replayed instantly. */
  initialActions: PlayerAction[];
  onAction: (actions: PlayerAction[]) => void;
  onEnd: (result: FinalResult) => void;
}) {
  const { battle, playerName } = options;
  const playerSprite = useRef<HTMLImageElement>(null);
  const wildSprite = useRef<HTMLImageElement>(null);
  const playerBox = useRef<HTMLDivElement>(null);
  const wildBox = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const stars = useRef<HTMLDivElement>(null);
  const sparkle = useRef<HTMLDivElement>(null);
  const builder = useRef<StepBuilder | null>(null);
  const actions = useRef<PlayerAction[]>([]);
  const sceneRef = useRef<Scene>(EMPTY_SCENE);
  const skip = useRef<(() => void) | null>(null);
  const started = useRef(false);
  const busy = useRef(false);
  const callbacks = useRef(options);
  useLayoutEffect(() => {
    callbacks.current = options;
  });

  const [view, setView] = useState<RunnerView>({
    phase: 'intro',
    scene: EMPTY_SCENE,
    text: '',
    revealAll: 0,
    hpDrainMs: { player: 0, wild: 0 },
    ball: null,
    available: null,
    result: { kind: 'ongoing' },
  });

  const commit = useCallback((patch: Partial<RunnerView>, sync = false) => {
    const apply = () => setView((v) => ({ ...v, ...patch }));
    if (sync) flushSync(apply);
    else apply();
  }, []);

  const setScene = useCallback(
    (scene: Scene, sync = true) => {
      sceneRef.current = scene;
      commit({ scene }, sync);
    },
    [commit]
  );

  /** Wait that the player can cut short by tapping the text box. */
  const holdable = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(done, ms);
        function done() {
          clearTimeout(timer);
          skip.current = null;
          resolve();
        }
        skip.current = done;
      }),
    []
  );

  const say = useCallback(
    async (text: string, hold = HOLD_MS) => {
      if (!text) return;
      commit({ text });
      await holdable(text.length * TYPE_MS_PER_CHAR + hold);
    },
    [commit, holdable]
  );

  const playStep = useCallback(
    async (step: Step, previous: Step | undefined) => {
      // Getters: elements mount mid-step (e.g. the ball, a new sprite).
      const r: SceneRefs = {
        get playerSprite() {
          return playerSprite.current;
        },
        get wildSprite() {
          return wildSprite.current;
        },
        get playerBox() {
          return playerBox.current;
        },
        get wildBox() {
          return wildBox.current;
        },
        get ball() {
          return ball.current;
        },
        get flash() {
          return flash.current;
        },
        get stars() {
          return stars.current;
        },
        get sparkle() {
          return sparkle.current;
        },
      };
      const sprite = (side: SideKey) =>
        side === 'player' ? r.playerSprite : r.wildSprite;
      switch (step.kind) {
        case 'wildAppear': {
          setScene(applyStep(sceneRef.current, step));
          await A.slideIn(r.wildSprite, 'left');
          A.settle(r.wildSprite);
          if (step.mon.shiny) await A.sparkle(r.sparkle);
          await A.fadeIn(r.wildBox);
          A.settle(r.wildBox);
          await say(step.text);
          break;
        }
        case 'sendOut': {
          commit({ text: step.text });
          await A.wait(400);
          setScene(applyStep(sceneRef.current, step));
          await A.emerge(r.playerSprite);
          A.settle(r.playerSprite);
          await A.fadeIn(r.playerBox);
          A.settle(r.playerBox);
          await holdable(300);
          break;
        }
        case 'recall': {
          commit({ text: step.text });
          await A.wait(350);
          await A.absorb(r.playerSprite);
          setScene(applyStep(sceneRef.current, step));
          A.settle(r.playerSprite);
          break;
        }
        case 'move': {
          await say(step.text, 250);
          const user = sprite(step.side);
          if (step.category === 'Status') await A.glow(user);
          else await A.lunge(user, step.side);
          A.settle(user);
          break;
        }
        case 'hp': {
          const mon = sceneRef.current[step.side];
          if (!mon) break;
          const hit =
            previous?.kind === 'move' &&
            previous.target === step.side &&
            step.hp < mon.hp;
          if (hit) {
            await A.blink(sprite(step.side));
            A.settle(sprite(step.side));
          }
          const before = hpBar(mon.hp, mon.maxhp).pixels;
          const after = hpBar(step.hp, step.maxhp).pixels;
          const ms = Math.max(
            160,
            Math.abs(before - after) * A.HP_DRAIN_MS_PER_PIXEL
          );
          const side = step.side;
          flushSync(() =>
            setView((v) => ({
              ...v,
              hpDrainMs: { ...v.hpDrainMs, [side]: ms },
            }))
          );
          setScene(applyStep(sceneRef.current, step));
          await A.wait(ms + 80);
          if (step.text) await say(step.text);
          break;
        }
        case 'status':
        case 'species': {
          setScene(applyStep(sceneRef.current, step));
          if (step.text) await say(step.text);
          break;
        }
        case 'faint': {
          await A.wait(200);
          await A.faint(sprite(step.side));
          setScene(applyStep(sceneRef.current, step));
          A.settle(sprite(step.side));
          if (step.text) await say(step.text);
          break;
        }
        case 'ball': {
          commit({ text: step.throwText, ball: step.ball }, true);
          await A.throwArc(r.ball);
          await Promise.all([A.burst(r.flash), A.absorb(r.wildSprite)]);
          await A.dropAndBounce(r.ball);
          await A.wait(350);
          for (let i = 0; i < Math.min(step.shakes, 3); i++) {
            await A.wobble(r.ball);
            await A.wait(300);
          }
          if (step.caught) {
            await A.click(r.ball, r.stars);
            setScene(applyStep(sceneRef.current, step));
            A.settle(r.wildSprite);
            await say(step.resultText, 1200);
          } else {
            await A.burst(r.flash);
            commit({ ball: null }, true);
            A.settle(r.ball);
            for (const a of r.wildSprite?.getAnimations() ?? []) a.cancel();
            await A.emerge(r.wildSprite);
            A.settle(r.wildSprite);
            await say(step.resultText);
          }
          break;
        }
        case 'flee': {
          await A.flee(sprite(step.side), step.side);
          setScene(applyStep(sceneRef.current, step));
          A.settle(sprite(step.side));
          if (step.text) await say(step.text);
          break;
        }
        case 'text':
          await say(step.text);
          break;
      }
    },
    [commit, holdable, say, setScene]
  );

  const finishTurn = useCallback(() => {
    const result = battle.result();
    if (result.kind !== 'ongoing') {
      commit({ phase: 'ended', result, available: null });
      callbacks.current.onEnd(result);
      return;
    }
    const available = battle.available();
    const active = sceneRef.current.player?.name.toUpperCase() ?? 'POKéMON';
    commit({
      phase: 'input',
      available,
      text:
        available.mode === 'switch'
          ? 'Choose a POKéMON.'
          : `What will ${active} do?`,
    });
  }, [battle, commit]);

  const playSteps = useCallback(
    async (steps: Step[]) => {
      busy.current = true;
      commit({ phase: 'playing', available: null });
      try {
        for (let i = 0; i < steps.length; i++)
          await playStep(steps[i], steps[i - 1]);
      } finally {
        busy.current = false;
        finishTurn();
      }
    },
    [commit, finishTurn, playStep]
  );

  /** Start (or resume) the battle. */
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const b = new StepBuilder(playerName);
    builder.current = b;
    const introSteps = b.build(battle.drainLog());

    const saved = callbacks.current.initialActions;
    if (!saved.length) {
      // Not from inside the effect: steps use flushSync to sync the DOM.
      setTimeout(() => void playSteps(introSteps), 0);
      return;
    }
    // Resume: replay saved actions instantly, then show the current state.
    let scene = introSteps.reduce(applyStep, EMPTY_SCENE);
    for (const action of saved) {
      const res = battle.choose(action);
      if (!res.ok)
        throw new Error(`Could not replay saved action: ${res.error}`);
      actions.current.push(action);
      scene = b.build(battle.drainLog()).reduce(applyStep, scene);
    }
    setScene(scene, false);
    finishTurn();
  }, [battle, finishTurn, playSteps, playerName, setScene]);

  const choose = useCallback(
    (action: PlayerAction) => {
      // Ignore input while a turn is still being shown.
      if (!builder.current || busy.current) return;
      const res = battle.choose(action);
      if (!res.ok) {
        commit({ text: res.error });
        return;
      }
      actions.current.push(action);
      callbacks.current.onAction([...actions.current]);
      void playSteps(builder.current.build(battle.drainLog()));
    },
    [battle, commit, playSteps]
  );

  /** Tap on the text box: reveal the text and move on. */
  const advance = useCallback(() => {
    setView((v) => ({ ...v, revealAll: v.revealAll + 1 }));
    skip.current?.();
  }, []);

  useEffect(() => () => skip.current?.(), []);

  const targets: SceneRefObjects = {
    playerSprite,
    wildSprite,
    playerBox,
    wildBox,
    ball,
    flash,
    stars,
    sparkle,
  };

  return { view, targets, start, choose, advance };
}
