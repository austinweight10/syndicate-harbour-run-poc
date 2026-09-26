import { readFileSync } from "node:fs";
import { FIXTURE_FILES, fixturePath } from "../../fixtures/paths";

export type PathStep = {
  id: string;
  action: "goto" | "click" | "observe" | "stop";
  target?: string;
  selectorHint?: string;
  fallbackHints?: string[];
  /** Storefront path to open when every click hint fails (e.g. the product page). */
  fallbackGoto?: string;
  optional?: boolean;
  expect?: string;
  note?: string;
  assertMissingText?: string[];
  outcome?: string;
  reason?: string;
};

export type DawnPath = {
  personaId: string;
  stopPolicy: string;
  viewport: { width: number; height: number };
  denyList: string[];
  steps: PathStep[];
  pathId: "path-harbour-run-dawn";
};

export function loadDawnPath(): DawnPath {
  const doc = JSON.parse(readFileSync(fixturePath(FIXTURE_FILES.agentPath), "utf8")) as DawnPath;
  return { ...doc, pathId: "path-harbour-run-dawn" };
}
