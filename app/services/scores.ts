import { affordances, frictions } from '../data/fixture.ts';

/**
 * Score writers will persist AffordanceScore and FrictionScore from the agent runner.
 * v0 returns the fixture rows the Artifacts screen renders.
 */
export function listAffordances() {
  return affordances;
}

export function listFrictions() {
  return frictions;
}
