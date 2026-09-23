'use client';

import type { CSSProperties, ReactNode } from 'react';

import type { RunnerView, SceneRefObjects } from '@/lib/anim/useBattleRunner';
import { BALL_COLORS, spriteUrl } from '@/lib/sprites';

import { HealthBox } from './HealthBox';

/** Position in GBA pixels on the 240x160 screen. */
const at = (x: number, y: number, w: number, h: number) =>
  ({ '--x': x, '--y': y, '--w': w, '--h': h }) as CSSProperties;

// Layout after Ruby/Sapphire/Emerald's battle screen.
const WILD_SPRITE = at(128, -6, 96, 96);
const PLAYER_SPRITE = at(16, 38, 96, 96);
const WILD_PLATFORM = at(112, 62, 128, 26);
const PLAYER_PLATFORM = at(-8, 100, 144, 30);
const WILD_BOX = at(10, 14, 104, 30);
const PLAYER_BOX = at(124, 70, 110, 40);
const BALL = at(170, 40, 12, 12);
const FLASH = at(150, 16, 52, 52);
const STARS = at(150, 40, 52, 16);
const SPARKLE = at(150, 10, 52, 52);

export function BattleScene({
  view,
  targets,
  children,
}: {
  view: RunnerView;
  targets: SceneRefObjects;
  children: ReactNode;
}) {
  const { scene } = view;
  const {
    wildSprite: wildSpriteRef,
    playerSprite: playerSpriteRef,
    wildBox: wildBoxRef,
    playerBox: playerBoxRef,
    ball: ballRef,
    flash: flashRef,
    stars: starsRef,
    sparkle: sparkleRef,
  } = targets;
  const ball = view.ball ? BALL_COLORS[view.ball] : null;
  return (
    <div className="scene-wrap">
      <div className="scene" role="img" aria-label="Battle scene">
        <div className="gba platform" style={WILD_PLATFORM} />
        <div className="gba platform" style={PLAYER_PLATFORM} />

        <div className="gba sprite-box" style={WILD_SPRITE}>
          {scene.wild && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={wildSpriteRef}
              className="sprite"
              src={spriteUrl(scene.wild.species, { shiny: scene.wild.shiny })}
              alt={scene.wild.name}
              style={{
                visibility: view.scene.wildVisible ? 'visible' : 'hidden',
              }}
            />
          )}
        </div>
        <div
          ref={sparkleRef}
          className="gba sparkle"
          style={SPARKLE}
          aria-hidden
        >
          ✦ ✧ ✦
        </div>

        <div className="gba sprite-box" style={PLAYER_SPRITE}>
          {scene.player && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={playerSpriteRef}
              className="sprite"
              src={spriteUrl(scene.player.species, {
                back: true,
                shiny: scene.player.shiny,
              })}
              alt={scene.player.name}
              style={{
                visibility: view.scene.playerVisible ? 'visible' : 'hidden',
              }}
            />
          )}
        </div>

        {scene.wild && (
          <HealthBox
            ref={wildBoxRef}
            mon={scene.wild}
            side="wild"
            drainMs={view.hpDrainMs.wild}
            style={WILD_BOX}
            hidden={!scene.wildVisible && !view.ball}
          />
        )}
        {scene.player && (
          <HealthBox
            ref={playerBoxRef}
            mon={scene.player}
            side="player"
            drainMs={view.hpDrainMs.player}
            style={PLAYER_BOX}
            hidden={!scene.playerVisible}
          />
        )}

        {ball && (
          <div
            ref={ballRef}
            className="gba ball"
            style={
              {
                ...BALL,
                '--ball-top': ball.top,
                '--ball-bottom': ball.bottom,
              } as CSSProperties
            }
            aria-hidden
          />
        )}
        <div ref={flashRef} className="gba flash" style={FLASH} aria-hidden />
        <div ref={starsRef} className="gba stars" style={STARS} aria-hidden>
          ✦ ✦ ✦
        </div>

        {children}
      </div>
    </div>
  );
}

export const TEXT_AREA = at(0, 112, 240, 48);
