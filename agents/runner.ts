import type { Persona } from '../app/data/types.ts';

/**
 * Playwright persona loop — not executed by the v0 UI.
 *
 * Later runtime:
 *   LOAD persona JSON from agents/personas/ plus the linked event
 *   SET mobile or desktop viewport and en-GB
 *   WHILE goals remain and steps < MAX_STEPS:
 *     OBSERVE title, H1, nav, products, prices, errors
 *     ACT: home, collection, search, PDP, variant, add to basket, checkout start
 *     SCORE resonate vs friction
 *   STOP before payment
 *   PERSIST AgentRun, AffordanceScore, FrictionScore
 *
 * Sample timelines already shown in the app live in app/data/fixture.ts.
 */
export const MAX_STEPS = 24;

export async function runPersona(persona: Persona): Promise<never> {
  throw new Error(
    `Playwright is not connected. Would have shopped as “${persona.name}” and stopped before payment.`,
  );
}
