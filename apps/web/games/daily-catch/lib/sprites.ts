import { Icons, Sprites } from '@pkmn/img';

import type { BallId } from './engine/catch';

/** Gen 3 (Ruby/Sapphire/Emerald) battle sprite URL. */
export function spriteUrl(
  species: string,
  opts: { back?: boolean; shiny?: boolean } = {}
) {
  return Sprites.getPokemon(species, {
    gen: 'gen3',
    side: opts.back ? 'p1' : 'p2',
    shiny: opts.shiny,
  }).url;
}

const BALL_ITEM_NAMES: Record<BallId, string> = {
  pokeball: 'Poke Ball',
  greatball: 'Great Ball',
  ultraball: 'Ultra Ball',
  masterball: 'Master Ball',
  netball: 'Net Ball',
  nestball: 'Nest Ball',
  timerball: 'Timer Ball',
  repeatball: 'Repeat Ball',
  luxuryball: 'Luxury Ball',
  premierball: 'Premier Ball',
  diveball: 'Dive Ball',
};

export function ballIconCss(ball: BallId) {
  return Icons.getItem(BALL_ITEM_NAMES[ball]).css;
}

/** Colours for the CSS-drawn ball used in the throw animation. */
export const BALL_COLORS: Record<BallId, { top: string; bottom?: string }> = {
  pokeball: { top: '#e83838' },
  greatball: { top: '#3878e0' },
  ultraball: { top: '#303030' },
  masterball: { top: '#8840b8' },
  netball: { top: '#38b8c0' },
  nestball: { top: '#88c040', bottom: '#f0d878' },
  timerball: { top: '#f8f8f8' },
  repeatball: { top: '#f09030' },
  luxuryball: { top: '#282828', bottom: '#383838' },
  premierball: { top: '#f8f8f8' },
  diveball: { top: '#3888d8' },
};

export function preload(urls: string[]) {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
}
