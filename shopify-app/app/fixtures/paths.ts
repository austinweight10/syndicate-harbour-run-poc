import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** docs/fixtures — canonical Harbour Run JSON. */
export const FIXTURES_ROOT = path.resolve(here, "../../../docs/fixtures");

export const FIXTURE_FILES = {
  session: "session/demo-shop.json",
  orders: "orders/orders-demo.json",
  products: "products/products-demo.json",
  hashtags: "catalogue/hashtag-watchlist.json",
  webHarvest: "catalogue/web-harvest-allowlist.json",
  socialTrends: "catalogue/social-trends-mock.json",
  sports: "catalogue/sports-mock.json",
  virtualEvents: "catalogue/virtual-events-mock.json",
  activity: "catalogue/activity-challenges.json",
  personas: "personas/demo.json",
  expectedScores: "graph/expected-scores.json",
  expectedScoresRunning: "graph/expected-scores.running.proposed.json",
  agentPath: "agents/path-harbour-run-dawn.json",
  agentRun: "agents/demo-completed-run.json",
  recommendations: "recommendations/demo.json",
} as const;

export function fixturePath(rel: string): string {
  return path.join(FIXTURES_ROOT, rel);
}
