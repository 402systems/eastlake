/**
 * GBA-style battle animations on top of the Web Animations API. Every helper
 * resolves once its animation has finished. Animations fill 'forwards' so the
 * end pose holds until React applies the matching scene state; call
 * `settle(el)` afterwards to hand control back to React's styles.
 */

export const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Gen 3 drains the HP bar about one pixel (of 48) per frame. */
export const HP_DRAIN_MS_PER_PIXEL = 1000 / 60;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

async function play(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
): Promise<void> {
  if (!el || typeof el.animate !== 'function') return;
  const duration = reducedMotion() ? 1 : options.duration;
  const animation = el.animate(keyframes, {
    fill: 'forwards',
    ...options,
    duration,
  });
  try {
    await animation.finished;
  } catch {
    // Cancelled (e.g. unmounted); nothing to do.
  }
}

/** Drop any held end poses so React's own styles apply again. */
export function settle(...els: (Element | null | undefined)[]) {
  requestAnimationFrame(() => {
    for (const el of els)
      for (const a of el?.getAnimations?.() ?? []) a.cancel();
  });
}

export function slideIn(
  el: Element | null,
  from: 'left' | 'right',
  duration = 900
) {
  const x = from === 'left' ? '-160cqw' : '160cqw';
  return play(
    el,
    [{ transform: `translateX(${x})` }, { transform: 'translateX(0)' }],
    {
      duration,
      easing: 'linear',
    }
  );
}

export function fadeIn(el: Element | null, duration = 250) {
  return play(el, [{ opacity: 0 }, { opacity: 1 }], {
    duration,
    easing: 'ease-out',
  });
}

/** A Pokémon emerging from its ball: white flash, growing from the ground up. */
export function emerge(el: Element | null, duration = 380) {
  return play(
    el,
    [
      { transform: 'scale(0.05)', filter: 'brightness(4)', opacity: 0.6 },
      {
        transform: 'scale(1)',
        filter: 'brightness(2)',
        opacity: 1,
        offset: 0.7,
      },
      { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 },
    ],
    { duration, easing: 'ease-out' }
  );
}

/** A Pokémon being pulled into a ball: red tint while shrinking to a point. */
export function absorb(el: Element | null, duration = 380) {
  return play(
    el,
    [
      { transform: 'scale(1)', filter: 'none', opacity: 1 },
      {
        transform: 'scale(0.8)',
        filter: 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(1.2)',
        opacity: 1,
        offset: 0.35,
      },
      {
        transform: 'scale(0.02)',
        filter: 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(1.2)',
        opacity: 0,
      },
    ],
    { duration, easing: 'ease-in' }
  );
}

/** Attacker lunges toward its target. */
export function lunge(el: Element | null, side: 'player' | 'wild') {
  const [dx, dy] = side === 'player' ? ['6cqw', '-2cqw'] : ['-6cqw', '2cqw'];
  return play(
    el,
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${dx}, ${dy})`, offset: 0.4 },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 260, easing: 'ease-in-out' }
  );
}

/** Status moves: the user glows briefly. */
export function glow(el: Element | null) {
  return play(
    el,
    [
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.8)' },
      { filter: 'brightness(1)' },
    ],
    { duration: 360 }
  );
}

/** Taking a hit: the sprite blinks as in the GBA games. */
export function blink(el: Element | null) {
  return play(
    el,
    [
      { opacity: 1 },
      { opacity: 0, offset: 0.15 },
      { opacity: 1, offset: 0.3 },
      { opacity: 0, offset: 0.45 },
      { opacity: 1, offset: 0.6 },
      { opacity: 0, offset: 0.75 },
      { opacity: 1 },
    ],
    { duration: 480, easing: 'steps(1, end)' }
  );
}

/** Fainting: the sprite sinks out of view (the sprite box clips it). */
export function faint(el: Element | null) {
  return play(
    el,
    [{ transform: 'translateY(0)' }, { transform: 'translateY(110%)' }],
    {
      duration: 420,
      easing: 'ease-in',
    }
  );
}

/** Leaving the battle (Roar, Whirlwind, Teleport). */
export function flee(el: Element | null, side: 'player' | 'wild') {
  const x = side === 'wild' ? '60cqw' : '-60cqw';
  return play(
    el,
    [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: `translateX(${x})`, opacity: 0 },
    ],
    {
      duration: 520,
      easing: 'ease-in',
    }
  );
}

/** The ball arcs from the player's side to the wild Pokémon. */
export function throwArc(el: Element | null) {
  return play(
    el,
    [
      {
        transform: 'translate(-48cqw, 34cqw) rotate(0deg) scale(0.9)',
        opacity: 1,
      },
      {
        transform: 'translate(-24cqw, -6cqw) rotate(360deg) scale(1)',
        offset: 0.5,
      },
      { transform: 'translate(0, 0) rotate(720deg) scale(1)', opacity: 1 },
    ],
    { duration: 620, easing: 'linear' }
  );
}

/** After absorbing the Pokémon the ball drops to the ground and bounces. */
export function dropAndBounce(el: Element | null) {
  return play(
    el,
    [
      { transform: 'translate(0, 0)', easing: 'ease-in' },
      { transform: 'translate(0, 6.5cqw)', easing: 'ease-out', offset: 0.4 },
      { transform: 'translate(0, 2.5cqw)', easing: 'ease-in', offset: 0.6 },
      { transform: 'translate(0, 6.5cqw)', easing: 'ease-out', offset: 0.78 },
      { transform: 'translate(0, 5cqw)', easing: 'ease-in', offset: 0.89 },
      { transform: 'translate(0, 6.5cqw)' },
    ],
    { duration: 700 }
  );
}

/** One wobble of the ball on the ground. */
export function wobble(el: Element | null) {
  return play(
    el,
    [
      { transform: 'translate(0, 6.5cqw) rotate(0deg)' },
      { transform: 'translate(-1cqw, 6.5cqw) rotate(-28deg)', offset: 0.25 },
      { transform: 'translate(0, 6.5cqw) rotate(0deg)', offset: 0.5 },
      { transform: 'translate(1cqw, 6.5cqw) rotate(28deg)', offset: 0.75 },
      { transform: 'translate(0, 6.5cqw) rotate(0deg)' },
    ],
    { duration: 560, easing: 'ease-in-out' }
  );
}

/** The ball bursts open: a quick white flash. */
export function burst(el: Element | null) {
  return play(
    el,
    [
      { opacity: 0, transform: 'scale(0.2)' },
      { opacity: 1, transform: 'scale(1)', offset: 0.3 },
      { opacity: 0, transform: 'scale(1.6)' },
    ],
    { duration: 360, easing: 'ease-out' }
  );
}

/** Capture confirmed: the ball dims and stars pop out. */
export function click(ball: Element | null, stars: Element | null) {
  return Promise.all([
    play(ball, [{ filter: 'brightness(1)' }, { filter: 'brightness(0.55)' }], {
      duration: 200,
    }),
    play(
      stars,
      [
        { opacity: 0, transform: 'translate(0, 6.5cqw) scale(0.4)' },
        { opacity: 1, transform: 'translate(0, 3.5cqw) scale(1)', offset: 0.4 },
        { opacity: 0, transform: 'translate(0, 0.5cqw) scale(1.3)' },
      ],
      { duration: 700, easing: 'ease-out' }
    ),
  ]);
}

/** Shiny sparkle on appearance. */
export function sparkle(el: Element | null) {
  return play(
    el,
    [
      { opacity: 0, transform: 'scale(0.4) rotate(0deg)' },
      { opacity: 1, transform: 'scale(1.1) rotate(45deg)', offset: 0.5 },
      { opacity: 0, transform: 'scale(0.6) rotate(90deg)' },
    ],
    { duration: 700 }
  );
}
