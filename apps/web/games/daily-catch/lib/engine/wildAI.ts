import type { Battle } from '@pkmn/sim';

/**
 * Gen 3 wild Pokémon move selection (pokeemerald OpponentHandleChooseMove,
 * non-trainer branch): pick a random non-empty move slot; if the engine
 * rejects it (disabled, tormented, taunted, imprisoned, no PP) the controller
 * silently re-rolls. The net effect is a uniform choice among usable moves.
 * Locked moves (recharge, Thrash, Bide, charging...) and Struggle are forced.
 *
 * Returns the Showdown choice string for p2.
 */
export function chooseWildMove(battle: Battle): string {
  const side = battle.sides[1];
  const request = side.activeRequest;
  if (!request || request.wait)
    throw new Error('chooseWildMove: wild side has no pending request');
  if (request.forceSwitch || request.teamPreview) {
    throw new Error('chooseWildMove: wild side cannot switch');
  }
  const [active] = request.active;
  const mon = side.active[0];
  if (mon.getLockedMove() || mon.getSemiLockedMove()) return 'move 1';
  const usable = active.moves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => !move.disabled);
  if (!usable.length)
    throw new Error(
      'chooseWildMove: no usable moves (Showdown should offer Struggle)'
    );
  const pick = usable[battle.random(usable.length)];
  return `move ${pick.index + 1}`;
}
