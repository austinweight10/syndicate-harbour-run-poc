import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import prisma from "../../db.server";
import { isCardField, isDeniedTarget, isDeniedUrl } from "./deny";
import { loadDawnPath, type PathStep } from "./path";
import { resolveHeaded, resolveStorefrontUrl } from "./storefront";

type StepLog = { id: string; ok: boolean; at: string; note?: string };

type Findings = {
  sizeGuideMissing: boolean;
  shellMissingFromRaceKits: boolean;
  addedTee: boolean;
  reachedCheckout: boolean;
};

const EMPTY: Findings = {
  sizeGuideMissing: false,
  shellMissingFromRaceKits: false,
  addedTee: false,
  reachedCheckout: false,
};

export class DeniedClickError extends Error {
  constructor(label: string) {
    super(`Stop-before-pay deny-list blocked a click: ${label}`);
    this.name = "DeniedClickError";
  }
}

function recId(shopId: string, kind: string, targetRef: string, title: string): string {
  return createHash("sha256").update([shopId, kind, targetRef, title].join("|")).digest("hex").slice(0, 24);
}

async function claimRun(client: PrismaClient, id: string): Promise<boolean> {
  try {
    await client.$transaction(async (tx) => {
      const running = await tx.agentRun.count({ where: { status: "running" } });
      if (running > 0) throw new Error("busy");
      const claimed = await tx.agentRun.updateMany({
        where: { id, status: "queued" },
        data: { status: "running", startedAt: new Date(), progressPct: 1 },
      });
      if (claimed.count !== 1) throw new Error("claimed");
    });
    return true;
  } catch {
    return false;
  }
}

export async function executeAgentRun(runId: string, client: PrismaClient = prisma): Promise<void> {
  const claimed = await claimRun(client, runId);
  if (!claimed) return;

  const run = await client.agentRun.findUnique({ where: { id: runId } });
  if (!run) return;
  const shop = await client.shop.findUnique({ where: { id: run.shopId } });
  const storefront = resolveStorefrontUrl(run.storefrontUrl || shop?.storefrontUrl);
  const path = loadDawnPath();
  const headed = resolveHeaded();
  const steps: StepLog[] = [];
  const findings: Findings = { ...EMPTY };
  let sawRaceKits = false;
  let browserMeta: { executablePath: string; pid: number | null; headless: boolean } | null = null;

  const timelineJson = () =>
    JSON.stringify({
      pathId: path.pathId,
      headed,
      browser: browserMeta,
      steps,
    });

  const persist = async (progressPct: number) => {
    await client.agentRun.update({
      where: { id: runId },
      data: { progressPct, timelineJson: timelineJson() },
    });
  };

  if (!storefront) {
    await client.agentRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        outcome: "failed",
        endedAt: new Date(),
        errorMessage: "Storefront URL missing — agents cannot browse your shop.",
        progressPct: 100,
      },
    });
    return;
  }

  let browser: import("playwright").Browser | null = null;
  try {
    const { chromium } = await import("playwright");
    const executablePath = chromium.executablePath();
    browser = await chromium.launch({
      headless: !headed,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    browserMeta = { executablePath, pid: chromiumPid(executablePath), headless: !headed };
    await persist(2);
    const page = await browser.newPage({
      viewport: path.viewport,
      locale: "en-GB",
    });
    page.setDefaultTimeout(8000);
    const started = Date.now();

    const log = (id: string, ok: boolean, note?: string) => {
      steps.push({ id, ok, at: new Date().toISOString(), note });
    };

    if (process.env.SHOP_STOREFRONT_PASSWORD) {
      await page.goto(storefront, { waitUntil: "domcontentloaded" });
      const password = page.locator("input[name=password]");
      if (await password.count()) {
        await password.fill(process.env.SHOP_STOREFRONT_PASSWORD);
        const enter = page.getByText("Enter", { exact: false });
        if (await enter.count()) await enter.first().click();
        log("password_gate", true, "Storefront password only. Not a customer account.");
      }
    }

    for (let index = 0; index < path.steps.length; index += 1) {
      if (Date.now() - started > 180_000) throw new Error("Run timed out after 180s");
      if (index >= 40) throw new Error("Run exceeded 40 steps");
      const step = path.steps[index];
      try {
        await runStep(page, storefront, step, findings, () => {
          sawRaceKits = true;
        }, sawRaceKits);
        log(step.id, true, step.note);
      } catch (error) {
        const message = error instanceof Error ? error.message : "step failed";
        log(step.id, false, message);
        if (!step.optional) throw error;
      }
      await persist(Math.round(((index + 1) / path.steps.length) * 100));
      if (isDeniedUrl(page.url())) {
        throw new DeniedClickError(page.url());
      }
    }

    if (!findings.reachedCheckout) {
      throw new Error("Path finished without reaching checkout.");
    }

    await writeFindings(client, run.shopId, run.personaId, runId, run.eventId, findings);
    await client.agentRun.update({
      where: { id: runId },
      data: {
        status: "stopped_before_payment",
        outcome: "checkout_started",
        endedAt: new Date(),
        progressPct: 100,
        storefrontUrl: storefront,
        errorMessage: null,
        timelineJson: timelineJson(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playwright failed";
    await client.agentRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        outcome: "failed",
        endedAt: new Date(),
        progressPct: 100,
        errorMessage: message,
        storefrontUrl: storefront,
        timelineJson: timelineJson(),
      },
    });
  } finally {
    await browser?.close();
  }
}

function chromiumPid(executablePath: string): number | null {
  try {
    const out = execFileSync("pgrep", ["-f", executablePath], { encoding: "utf8" });
    const pid = Number(out.trim().split("\n").find(Boolean));
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function runStep(
  page: import("playwright").Page,
  storefront: string,
  step: PathStep,
  findings: Findings,
  markRaceKits: () => void,
  sawRaceKits: boolean,
) {
  if (step.action === "stop") return;
  if (step.action === "goto") {
    const target = step.target ?? "/";
    const url = target.startsWith("http") ? target : `${storefront}${target.startsWith("/") ? "" : "/"}${target}`;
    if (isDeniedUrl(url)) throw new DeniedClickError(url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (url.includes("/collections/race-kits")) {
      markRaceKits();
      const body = await page.locator("body").innerText();
      findings.shellMissingFromRaceKits = !/waterproof shell/i.test(body);
    }
    return;
  }
  if (step.action === "observe") {
    const body = await page.locator("body").innerText();
    if (step.assertMissingText?.length) {
      const present = step.assertMissingText.some((text) => body.toLowerCase().includes(text.toLowerCase()));
      findings.sizeGuideMissing = !present;
    }
    if (step.id === "note_race_kits_excludes_shell") {
      findings.shellMissingFromRaceKits = sawRaceKits ? findings.shellMissingFromRaceKits : !/waterproof shell/i.test(body);
    }
    return;
  }
  const hints = [step.selectorHint, ...(step.fallbackHints ?? [])].filter((hint): hint is string => Boolean(hint));
  let last = "no selector";
  for (const hint of hints) {
    try {
      await clickHint(page, hint);
      if (step.id === "atc_tee") findings.addedTee = true;
      if (step.id === "checkout_start") findings.reachedCheckout = true;
      if (page.url().includes("/collections/race-kits")) {
        markRaceKits();
        const body = await page.locator("body").innerText();
        findings.shellMissingFromRaceKits = !/waterproof shell/i.test(body);
      }
      return;
    } catch (error) {
      if (error instanceof DeniedClickError) throw error;
      last = error instanceof Error ? error.message : "click failed";
    }
  }
  throw new Error(last);
}

async function clickHint(page: import("playwright").Page, hint: string) {
  const role = hint.match(/^role=(\w+)\[name=(.+)\]$/);
  const locator = role
    ? page.getByRole(role[1] as "link", { name: role[2] }).first()
    : hint.startsWith("text=")
      ? page.getByText(hint.slice(5), { exact: false }).first()
      : page.locator(hint).first();
  await locator.waitFor({ state: "visible", timeout: 8000 });
  const label = (await locator.innerText().catch(() => "")) || hint;
  const href = await locator.getAttribute("href").catch(() => null);
  if (isCardField(hint) || isCardField(label)) throw new DeniedClickError(label);
  if (isDeniedTarget(label, href)) throw new DeniedClickError(label);
  await locator.click({ timeout: 8000 });
}

async function writeFindings(
  client: PrismaClient,
  shopId: string,
  personaId: string,
  runId: string,
  eventId: string | null,
  findings: Findings,
) {
  if (findings.addedTee || findings.reachedCheckout) {
    const id = recId(shopId, "affordance", "race-tee-unisex", "Race tee added");
    const labels = ["OBSERVED"];
    await client.affordanceScore.upsert({
      where: { id },
      create: {
        id,
        shopId,
        personaId,
        runId,
        targetType: "product",
        targetRef: "race-tee-unisex",
        score: findings.reachedCheckout ? 0.9 : 0.7,
        evidenceJson: JSON.stringify({
          title: "Race tee added",
          summary: "Playwright added the race tee from Race Kits and stopped before payment.",
          provenanceLabels: labels,
          agentRunId: runId,
        }),
        notes: "Observed on the storefront. No payment was taken.",
      },
      update: {
        runId,
        personaId,
        score: findings.reachedCheckout ? 0.9 : 0.7,
        evidenceJson: JSON.stringify({
          title: "Race tee added",
          summary: "Playwright added the race tee from Race Kits and stopped before payment.",
          provenanceLabels: labels,
          agentRunId: runId,
        }),
      },
    });
  }

  if (findings.sizeGuideMissing) {
    const title = "Youth run tee has no size guide";
    const id = recId(shopId, "insight", "kids-youth-run-tee", title);
    const labels = ["OBSERVED"];
    const insightId = `ins_${id}`;
    await client.insightScore.upsert({
      where: { id: insightId },
      create: {
        id: insightId,
        shopId,
        personaId,
        runId,
        targetType: "product",
        targetRef: "kids-youth-run-tee",
        score: 0.9,
        insightKind: "sizing",
        evidenceJson: JSON.stringify({ title, provenanceLabels: labels, agentRunId: runId }),
        notes: "The youth tee page had no size guide. Guest path. Stopped before payment.",
      },
      update: {
        runId,
        personaId,
        evidenceJson: JSON.stringify({ title, provenanceLabels: labels, agentRunId: runId }),
      },
    });
    await client.recommendation.upsert({
      where: { id },
      create: {
        id,
        shopId,
        kind: "insight",
        priority: "P0",
        title,
        body: "The shopper opened Kids / Youth Run Tee and the page has no size guide. This is from the Playwright run. No payment was taken.",
        personaId,
        eventId,
        runId,
        targetType: "product",
        targetRef: "kids-youth-run-tee",
        provenanceLabelsJson: JSON.stringify(labels),
        confidence: 0.9,
        status: "open",
      },
      update: {
        runId,
        personaId,
        eventId,
        body: "The shopper opened Kids / Youth Run Tee and the page has no size guide. This is from the Playwright run. No payment was taken.",
        provenanceLabelsJson: JSON.stringify(labels),
      },
    });
  }
}
