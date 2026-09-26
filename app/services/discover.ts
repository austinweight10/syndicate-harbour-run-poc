import { events, personas } from '../data/fixture.ts';

/**
 * Tier 0 stand-in. A later job replaces this with calendar joins and basket rules
 * over ingested orders. Naming stays a model hypothesis.
 */
export function discoverEvents() {
  return events;
}

export function discoverPersonas() {
  return personas;
}
