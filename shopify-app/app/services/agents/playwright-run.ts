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
  missingVariantXl: boolean;
  weakRaceCopy: boolean;
  priceShockShipping: boolean;
  trustThinReviews: boolean;
  uxTrapCookie: boolean;
};

const EMPTY: Findings = {
  sizeGuideMissing: false,
  shellMissingFromRaceKits: false,
  addedTee: false,
  reachedCheckout: false,
  missingVariantXl: false,
  weakRaceCopy: false,
  priceShockShipping: false,
  trustThinReviews: false,
  uxTrapCookie: false,
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
  let forceHeaded = false;
  try {
    const prior = JSON.parse(run.timelineJson || "{}") as { forceHeaded?: boolean };
    forceHeaded = prior.forceHeaded === true;
  } catch {
    forceHeaded = false;
  }
  const headed = resolveHeaded(forceHeaded);
  const steps: StepLog[] = [];
  const findings: Findings = { ...EMPTY };
  let sawRaceKits = false;
  let browserMeta: { executablePath: string; pid: number | null; headless: boolean } | null = null;

  const timelineJson = () =>
    JSON.stringify({
      pathId: path.pathId,
      headed,
      forceHeaded,
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
      // Dawn skips scroll/fade animations under reduced motion; animating
      // banners otherwise intercept clicks on their own buttons.
      reducedMotion: "reduce",
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
        // Dawn hides the field behind "Enter using password"; the dev-store page shows it.
        if (!(await password.first().isVisible())) {
          const reveal = page.getByText("Enter using password", { exact: false });
          if (await reveal.count()) await reveal.first().click();
        }
        await password.first().fill(process.env.SHOP_STOREFRONT_PASSWORD);
        // Submit the form itself. getByText("Enter") also matches the
        // "Enter store password" label, which does not submit.
        await Promise.all([
          page.waitForLoadState("domcontentloaded"),
          password.first().press("Enter"),
        ]);
        await page.waitForURL((url) => !url.pathname.startsWith("/password"), { timeout: 15_000 }).catch(() => {});
        if (new URL(page.url()).pathname.startsWith("/password")) {
          throw new Error("Storefront password was not accepted. Check SHOP_STOREFRONT_PASSWORD.");
        }
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
    const lower = body.toLowerCase();
    if (step.assertMissingText?.length) {
      const present = step.assertMissingText.some((text) => lower.includes(text.toLowerCase()));
      findings.sizeGuideMissing = !present;
    }
    if (step.id === "note_race_kits_excludes_shell") {
      findings.shellMissingFromRaceKits = sawRaceKits
        ? findings.shellMissingFromRaceKits
        : !/waterproof shell/i.test(body);
    }
    if (step.id === "note_missing_xl" || step.id === "select_size_l") {
      const hasXl =
        (await page.getByRole("radio", { name: "XL", exact: true }).count()) > 0 ||
        (await page.locator("label", { hasText: /^XL$/i }).count()) > 0 ||
        /\bXL\b/.test(body);
      if (!hasXl) findings.missingVariantXl = true;
    }
    if (step.id === "note_weak_race_copy") {
      if (!/(race day|race weekend|marathon|parkrun|wet weather|london marathon)/i.test(body)) {
        findings.weakRaceCopy = true;
      }
    }
    if (step.id === "note_trust_reviews") {
      if (!/(review|reviews|★|stars)/i.test(body)) findings.trustThinReviews = true;
    }
    if (step.id === "note_price_shock_shipping" || step.id === "checkout_start") {
      if (
        /shipping/i.test(body) &&
        /(£\s*\d|\$\s*\d|calculated at|at checkout)/i.test(body)
      ) {
        findings.priceShockShipping = true;
      }
    }
    if (step.id === "note_ux_cookie") {
      if (/(accept (all )?cookies|cookie (settings|preferences)|we use cookies)/i.test(body)) {
        findings.uxTrapCookie = true;
      }
    }
    return;
  }
  const hints = [step.selectorHint, ...(step.fallbackHints ?? [])].filter((hint): hint is string => Boolean(hint));
  const tried: string[] = [];
  for (const hint of hints) {
    try {
      await clickHint(page, hint);
      if (step.id === "atc_tee") findings.addedTee = true;
      if (step.id === "checkout_start") {
        findings.reachedCheckout = true;
        const body = await page.locator("body").innerText();
        findings.priceShockShipping =
          /shipping/i.test(body) &&
          /(£\s*\d|\$\s*\d|calculated at|at checkout)/i.test(body);
      }
      if (step.id === "select_size_l" || step.id === "open_tee") {
        const body = await page.locator("body").innerText();
        const hasXl =
          (await page.getByRole("radio", { name: "XL", exact: true }).count()) > 0 ||
          /\bXL\b/.test(body);
        findings.missingVariantXl = !hasXl;
        if (step.id === "open_tee") {
          findings.weakRaceCopy = !/(race day|race weekend|marathon|parkrun|wet weather|london marathon)/i.test(
            body,
          );
          findings.trustThinReviews = !/(review|reviews|★|stars)/i.test(body);
        }
      }
      if (page.url().includes("/collections/race-kits")) {
        markRaceKits();
        const body = await page.locator("body").innerText();
        findings.shellMissingFromRaceKits = !/waterproof shell/i.test(body);
      }
      return;
    } catch (error) {
      if (error instanceof DeniedClickError) throw error;
      const message = error instanceof Error ? error.message.split("\n")[0] : "click failed";
      tried.push(`${hint}: ${message}`);
    }
  }
  // Live Dawn without menu hooks: jump straight to the collection URL.
  if (step.id === "nav_race_kits") {
    await page.goto(`${storefront}/collections/race-kits`, { waitUntil: "domcontentloaded" });
    markRaceKits();
    const body = await page.locator("body").innerText();
    findings.shellMissingFromRaceKits = !/waterproof shell/i.test(body);
    return;
  }
  if (step.id === "open_tee") {
    await page.goto(`${storefront}/products/race-tee-unisex`, { waitUntil: "domcontentloaded" });
    const body = await page.locator("body").innerText();
    findings.missingVariantXl =
      (await page.getByRole("radio", { name: "XL", exact: true }).count()) === 0 && !/\bXL\b/.test(body);
    findings.weakRaceCopy = !/(race day|race weekend|marathon|parkrun|wet weather|london marathon)/i.test(
      body,
    );
    findings.trustThinReviews = !/(review|reviews|★|stars)/i.test(body);
    findings.uxTrapCookie = /(accept (all )?cookies|cookie (settings|preferences)|we use cookies)/i.test(
      body,
    );
    return;
  }
  if (step.id === "open_shorts") {
    await page.goto(`${storefront}/products/running-shorts`, { waitUntil: "domcontentloaded" });
    return;
  }
  if (step.id === "open_youth_tee") {
    await page.goto(`${storefront}/products/kids-youth-run-tee`, { waitUntil: "domcontentloaded" });
    return;
  }
  if (step.fallbackGoto) {
    const url = `${storefront}${step.fallbackGoto.startsWith("/") ? "" : "/"}${step.fallbackGoto}`;
    if (isDeniedUrl(url)) throw new DeniedClickError(url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    return;
  }
  throw new Error(tried.length ? tried.join(" | ") : "no selector");
}

/** Dawn's mobile header keeps the main menu inside a closed drawer. */
const MENU_TOGGLE = "header-drawer summary, summary[aria-label='Menu']";

async function clickHint(page: import("playwright").Page, hint: string) {
  const role = hint.match(/^role=(\w+)\[name=(.+)\]$/);
  // Radios match exactly so size "L" does not also hit "XL"; links stay loose
  // ("Race Kits" should find "Shop Race Kits" when the menu is collapsed).
  const matches = role
    ? page.getByRole(role[1] as "link", { name: role[2], exact: role[1] === "radio" })
    : hint.startsWith("text=")
      ? page.getByText(hint.slice(5), { exact: false })
      : page.locator(hint);
  const visible = matches.filter({ visible: true });

  // The first DOM match is often a hidden copy (drawer vs desktop nav). If the
  // only copies are in the closed mobile drawer, open it and look again.
  const openDrawer = async () => {
    const toggle = page.locator(MENU_TOGGLE).filter({ visible: true }).first();
    if (!(await toggle.count())) return false;
    await toggle.click();
    await visible.first().waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    return true;
  };
  if ((await visible.count()) === 0 && (await matches.count()) > 0) await openDrawer();
  await visible.first().waitFor({ state: "visible", timeout: 8000 });

  // Try up to three visible copies: a hero CTA can be covered by its own
  // banner while a menu link with the same name is fine.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const count = Math.min(await visible.count(), 3);
    for (let index = 0; index < count; index += 1) {
      let locator = visible.nth(index);
      // Dawn animates its variant radios ("element is not stable"); the label
      // is what a shopper actually taps.
      if (role?.[1] === "radio") {
        const id = await locator.getAttribute("id").catch(() => null);
        if (id) {
          const label = page.locator(`label[for="${id.replace(/"/g, '\\"')}"]`).filter({ visible: true }).first();
          if (await label.count()) locator = label;
        }
      }
      const text = (await locator.innerText().catch(() => "")) || hint;
      const href = await locator.getAttribute("href").catch(() => null);
      if (isCardField(hint) || isCardField(text)) throw new DeniedClickError(text);
      if (isDeniedTarget(text, href)) throw new DeniedClickError(text);
      try {
        await locator.click({ timeout: 4000 });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    // Every visible copy was blocked: fall back to the menu drawer's copy.
    if (attempt === 0 && !(await openDrawer())) break;
  }
  throw lastError instanceof Error ? lastError : new Error(`No clickable match for ${hint}`);
}

async function writeInsight(
  client: PrismaClient,
  input: {
    shopId: string;
    personaId: string;
    runId: string;
    eventId: string | null;
    targetType: string;
    targetRef: string;
    title: string;
    body: string;
    notes: string;
    insightKind: string;
    score: number;
    priority: "P0" | "P1" | "P2";
  },
) {
  const labels = ["OBSERVED"];
  const id = recId(input.shopId, "insight", input.targetRef, input.title);
  const insightId = `ins_${id}`;
  await client.insightScore.upsert({
    where: { id: insightId },
    create: {
      id: insightId,
      shopId: input.shopId,
      personaId: input.personaId,
      runId: input.runId,
      targetType: input.targetType,
      targetRef: input.targetRef,
      score: input.score,
      insightKind: input.insightKind,
      evidenceJson: JSON.stringify({
        title: input.title,
        provenanceLabels: labels,
        agentRunId: input.runId,
      }),
      notes: input.notes,
    },
    update: {
      runId: input.runId,
      personaId: input.personaId,
      insightKind: input.insightKind,
      score: input.score,
      evidenceJson: JSON.stringify({
        title: input.title,
        provenanceLabels: labels,
        agentRunId: input.runId,
      }),
      notes: input.notes,
    },
  });
  await client.recommendation.upsert({
    where: { id },
    create: {
      id,
      shopId: input.shopId,
      kind: "insight",
      priority: input.priority,
      title: input.title,
      body: input.body,
      personaId: input.personaId,
      eventId: input.eventId,
      runId: input.runId,
      targetType: input.targetType,
      targetRef: input.targetRef,
      provenanceLabelsJson: JSON.stringify(labels),
      confidence: input.score,
      status: "open",
    },
    update: {
      runId: input.runId,
      personaId: input.personaId,
      eventId: input.eventId,
      priority: input.priority,
      body: input.body,
      provenanceLabelsJson: JSON.stringify(labels),
      confidence: input.score,
    },
  });
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
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "product",
      targetRef: "kids-youth-run-tee",
      title: "Youth run tee has no size guide",
      body: "The shopper opened Kids / Youth Run Tee and the page has no size guide. This is from the Playwright run. No payment was taken.",
      notes: "The youth tee page had no size guide. Guest path. Stopped before payment.",
      insightKind: "sizing",
      score: 0.9,
      priority: "P0",
    });
  }

  if (findings.shellMissingFromRaceKits) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "collection",
      targetRef: "race-kits",
      title: "Race Kits is missing the waterproof shell",
      body: "The shopper opened Race Kits and the waterproof shell was not in that collection. This is from the Playwright run. No payment was taken.",
      notes: "Race Kits had no waterproof shell on the storefront walk. Guest path. Stopped before payment.",
      insightKind: "dead_end",
      score: 0.8,
      priority: "P1",
    });
  }

  if (findings.missingVariantXl) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "product",
      targetRef: "race-tee-unisex",
      title: "Race tee has no XL size",
      body: "The shopper opened Race Tee and could not find an XL option. This is from the Playwright run. No payment was taken.",
      notes: "Size XL was absent on the race tee PDP. Guest path.",
      insightKind: "missing_variant",
      score: 0.75,
      priority: "P0",
    });
  }

  if (findings.weakRaceCopy) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "copy",
      targetRef: "race-tee-unisex",
      title: "Race tee copy misses the race occasion",
      body: "The race tee PDP does not mention race day, weather, or a London race story. Shoppers shopping for a race weekend get little occasion cue.",
      notes: "No race/weather occasion copy on the PDP body.",
      insightKind: "weak_copy",
      score: 0.65,
      priority: "P1",
    });
  }

  if (findings.priceShockShipping) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "page",
      targetRef: "checkout",
      title: "Shipping cost only appears at checkout",
      body: "The shopper only saw a shipping charge once checkout started. Surfacing delivery cost earlier reduces late drop-off.",
      notes: "Shipping amount observed on the checkout step, not earlier in the path.",
      insightKind: "price_shock",
      score: 0.7,
      priority: "P1",
    });
  }

  if (findings.trustThinReviews) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "product",
      targetRef: "race-tee-unisex",
      title: "Race tee has no visible reviews",
      body: "The race tee page showed no reviews or star ratings. Race-day shoppers look for fit proof before they commit.",
      notes: "No review or star signals on the PDP.",
      insightKind: "trust",
      score: 0.55,
      priority: "P2",
    });
  }

  if (findings.uxTrapCookie) {
    await writeInsight(client, {
      shopId,
      personaId,
      runId,
      eventId,
      targetType: "page",
      targetRef: "home",
      title: "Cookie banner interrupts the browse path",
      body: "A cookie or consent banner competed with the shopping path. Keep it dismissible and off the critical race-kit clicks.",
      notes: "Cookie / consent copy was visible during the storefront walk.",
      insightKind: "ux_trap",
      score: 0.5,
      priority: "P2",
    });
  }
}

