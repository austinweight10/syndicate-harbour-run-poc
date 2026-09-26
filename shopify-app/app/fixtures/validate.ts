import { readFileSync } from "node:fs";
import { MVP_SCOPES, assertExactScopes } from "../scopes";
import { FIXTURE_FILES, fixturePath } from "./paths";

export type ValidationIssue = { file: string; message: string };

const PROVENANCE = new Set([
  "OBSERVED",
  "AGGREGATE_PROXY",
  "MODEL_HYPOTHESIS",
  "MOCK",
  "CURATED",
  "MIXED",
  "GOLDEN",
  "PROPOSED",
]);

const SOCIAL_DEMAND_FORBIDDEN = new Set(["OBSERVED"]);

function readJson(rel: string): unknown {
  const raw = readFileSync(fixturePath(rel), "utf8");
  return JSON.parse(raw) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, file: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${file} must be a JSON object`);
  }
  return value;
}

function issuesFor(file: string, messages: string[]): ValidationIssue[] {
  return messages.map((message) => ({ file, message }));
}

export function validateExpectedScores(rel: string): ValidationIssue[] {
  const file = rel;
  const data = requireRecord(readJson(rel), file);
  const messages: string[] = [];
  if (!Array.isArray(data.bands) || data.bands.length < 1) {
    messages.push("bands must be a non-empty array");
    return issuesFor(file, messages);
  }
  for (const [index, band] of data.bands.entries()) {
    if (!isRecord(band)) {
      messages.push(`bands[${index}] must be an object`);
      continue;
    }
    if (typeof band.name !== "string" || band.name.length === 0) {
      messages.push(`bands[${index}].name is required`);
    }
    if (typeof band.confidenceMin !== "number" || typeof band.confidenceMax !== "number") {
      messages.push(`bands[${index}] confidenceMin/confidenceMax must be numbers`);
    } else if (band.confidenceMin > band.confidenceMax) {
      messages.push(`bands[${index}] confidenceMin exceeds confidenceMax`);
    }
    if (!Array.isArray(band.provenanceMustInclude) || band.provenanceMustInclude.length === 0) {
      messages.push(`bands[${index}].provenanceMustInclude is required`);
    }
  }
  if (!Array.isArray(data.assertRules) || data.assertRules.length === 0) {
    messages.push("assertRules must be a non-empty array");
  }
  return issuesFor(file, messages);
}

export function validateFixtures(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const session = requireRecord(readJson(FIXTURE_FILES.session), FIXTURE_FILES.session);
  const shop = requireRecord(session.shop, FIXTURE_FILES.session);
  const connection = requireRecord(session.connection, FIXTURE_FILES.session);
  if (shop.myshopifyDomain !== "harbour-run-demo.myshopify.com") {
    issues.push({
      file: FIXTURE_FILES.session,
      message: "shop.myshopifyDomain must be harbour-run-demo.myshopify.com",
    });
  }
  if (shop.vertical !== "running") {
    issues.push({ file: FIXTURE_FILES.session, message: "shop.vertical must be running" });
  }
  if (shop.currencyCode !== "GBP" || shop.ianaTimezone !== "Europe/London") {
    issues.push({
      file: FIXTURE_FILES.session,
      message: "shop must be GBP and Europe/London",
    });
  }
  if (!Array.isArray(connection.scopes)) {
    issues.push({ file: FIXTURE_FILES.session, message: "connection.scopes must be an array" });
  } else {
    const scopes = connection.scopes.join(",");
    try {
      assertExactScopes(scopes);
    } catch (error) {
      issues.push({
        file: FIXTURE_FILES.session,
        message: error instanceof Error ? error.message : "bad scopes",
      });
    }
    if (scopes !== MVP_SCOPES) {
      issues.push({ file: FIXTURE_FILES.session, message: "scope order drifted" });
    }
  }

  const ordersDoc = requireRecord(readJson(FIXTURE_FILES.orders), FIXTURE_FILES.orders);
  if (!Array.isArray(ordersDoc.orders)) {
    issues.push({ file: FIXTURE_FILES.orders, message: "orders array missing" });
  } else {
    if (ordersDoc.orders.length < 40) {
      issues.push({
        file: FIXTURE_FILES.orders,
        message: `expected at least 40 orders, found ${ordersDoc.orders.length}`,
      });
    }
    for (const [index, order] of ordersDoc.orders.entries()) {
      if (!isRecord(order)) {
        issues.push({ file: FIXTURE_FILES.orders, message: `orders[${index}] not an object` });
        continue;
      }
      if (typeof order.created_at !== "string" || typeof order.id !== "string") {
        issues.push({
          file: FIXTURE_FILES.orders,
          message: `orders[${index}] must use snake_case id and created_at`,
        });
      }
      if (!Array.isArray(order.line_items)) {
        issues.push({
          file: FIXTURE_FILES.orders,
          message: `orders[${index}].line_items missing`,
        });
      } else {
        for (const line of order.line_items) {
          if (!isRecord(line) || typeof line.sku !== "string" || !line.sku.startsWith("HR-")) {
            issues.push({
              file: FIXTURE_FILES.orders,
              message: `orders[${index}] line item SKU must start with HR-`,
            });
          }
        }
      }
    }
  }

  const productsDoc = requireRecord(readJson(FIXTURE_FILES.products), FIXTURE_FILES.products);
  if (!Array.isArray(productsDoc.products) || productsDoc.products.length < 9) {
    issues.push({ file: FIXTURE_FILES.products, message: "expected at least 9 products" });
  } else {
    for (const product of productsDoc.products) {
      if (!isRecord(product) || !Array.isArray(product.variants)) continue;
      for (const variant of product.variants) {
        if (!isRecord(variant) || typeof variant.sku !== "string" || !variant.sku.startsWith("HR-")) {
          issues.push({ file: FIXTURE_FILES.products, message: "product variant SKU must start with HR-" });
        }
      }
    }
  }
  if (!Array.isArray(productsDoc.collections) || productsDoc.collections.length < 1) {
    issues.push({ file: FIXTURE_FILES.products, message: "collections missing" });
  }

  const hashtags = requireRecord(readJson(FIXTURE_FILES.hashtags), FIXTURE_FILES.hashtags);
  if (!Array.isArray(hashtags.watchlist) || hashtags.watchlist.length < 8) {
    issues.push({ file: FIXTURE_FILES.hashtags, message: "watchlist must contain at least 8 tags" });
  }

  const harvest = requireRecord(readJson(FIXTURE_FILES.webHarvest), FIXTURE_FILES.webHarvest);
  const forbidden = ["twitter.com", "x.com", "t.co"];
  const domains = Array.isArray(harvest.domains) ? harvest.domains : [];
  if (domains.length < 1) {
    issues.push({ file: FIXTURE_FILES.webHarvest, message: "domains missing" });
  }
  for (const domain of domains) {
    if (!isRecord(domain) || typeof domain.domain !== "string") continue;
    const host = domain.domain.toLowerCase();
    if (forbidden.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      issues.push({
        file: FIXTURE_FILES.webHarvest,
        message: `forbidden harvest host ${domain.domain}`,
      });
    }
  }
  if (harvest.robotsPolicy !== "respect_robots_txt") {
    issues.push({ file: FIXTURE_FILES.webHarvest, message: "robotsPolicy must respect_robots_txt" });
  }

  const trends = requireRecord(readJson(FIXTURE_FILES.socialTrends), FIXTURE_FILES.socialTrends);
  if (!Array.isArray(trends.trends) || trends.trends.length < 1) {
    issues.push({ file: FIXTURE_FILES.socialTrends, message: "trends missing" });
  } else {
    for (const trend of trends.trends) {
      if (!isRecord(trend)) continue;
      if (SOCIAL_DEMAND_FORBIDDEN.has(String(trend.provenance))) {
        issues.push({
          file: FIXTURE_FILES.socialTrends,
          message: "social trend provenance must never be OBSERVED",
        });
      }
      if (typeof trend.score === "number" && (trend.score < 0 || trend.score > 1)) {
        issues.push({ file: FIXTURE_FILES.socialTrends, message: "trend score must be 0..1" });
      }
    }
  }

  const sports = requireRecord(readJson(FIXTURE_FILES.sports), FIXTURE_FILES.sports);
  if (!Array.isArray(sports.events) || sports.events.length < 6) {
    issues.push({ file: FIXTURE_FILES.sports, message: "expected at least 6 catalogue events" });
  } else {
    for (const event of sports.events) {
      if (!isRecord(event)) continue;
      if (typeof event.mode !== "string") {
        issues.push({ file: FIXTURE_FILES.sports, message: `event ${String(event.title)} missing mode` });
      }
    }
  }

  const virtuals = requireRecord(readJson(FIXTURE_FILES.virtualEvents), FIXTURE_FILES.virtualEvents);
  const virtualRows = Array.isArray(virtuals.events) ? virtuals.events : [];
  const virtualModes = virtualRows.filter(
    (row) => isRecord(row) && (row.mode === "virtual" || row.mode === "hybrid"),
  );
  if (virtualModes.length < 3) {
    issues.push({
      file: FIXTURE_FILES.virtualEvents,
      message: "expected at least 3 virtual or hybrid events",
    });
  }

  const activity = requireRecord(readJson(FIXTURE_FILES.activity), FIXTURE_FILES.activity);
  if (!Array.isArray(activity.challenges) || activity.challenges.length < 2) {
    issues.push({ file: FIXTURE_FILES.activity, message: "expected at least 2 activity challenges" });
  }

  const personas = requireRecord(readJson(FIXTURE_FILES.personas), FIXTURE_FILES.personas);
  const personaMeta = isRecord(personas._meta) ? personas._meta : {};
  if (personaMeta.vertical !== "running") {
    issues.push({ file: FIXTURE_FILES.personas, message: "personas vertical must be running" });
  }
  if (!Array.isArray(personas.personas)) {
    issues.push({ file: FIXTURE_FILES.personas, message: "personas array missing" });
  } else {
    const ready = personas.personas.filter(
      (row) => isRecord(row) && (row.status === "ready" || row.status === "draft"),
    );
    const stubs = personas.personas.filter((row) => isRecord(row) && row.status === "stub");
    if (ready.length < 2 || stubs.length < 1) {
      issues.push({
        file: FIXTURE_FILES.personas,
        message: "expected two ready/draft personas and one fashion stub",
      });
    }
  }

  const agentPath = requireRecord(readJson(FIXTURE_FILES.agentPath), FIXTURE_FILES.agentPath);
  const agentMeta = isRecord(agentPath._meta) ? agentPath._meta : {};
  if (agentPath.stopPolicy !== "checkout_start_only") {
    issues.push({ file: FIXTURE_FILES.agentPath, message: "stopPolicy must be checkout_start_only" });
  }
  if (agentMeta.vertical !== "running") {
    issues.push({ file: FIXTURE_FILES.agentPath, message: "agent path vertical must be running" });
  }

  // Schema check only. This file must never be inserted as an AgentRun.
  const agentRun = requireRecord(readJson(FIXTURE_FILES.agentRun), FIXTURE_FILES.agentRun);
  const run = requireRecord(agentRun.agentRun, FIXTURE_FILES.agentRun);
  if (run.outcome !== "checkout_started") {
    issues.push({ file: FIXTURE_FILES.agentRun, message: "outcome must be checkout_started" });
  }
  if (run.mode !== "MOCK") {
    issues.push({ file: FIXTURE_FILES.agentRun, message: "completed run mode must be MOCK" });
  }

  const recs = requireRecord(readJson(FIXTURE_FILES.recommendations), FIXTURE_FILES.recommendations);
  if (!Array.isArray(recs.insights) || recs.insights.length < 3) {
    issues.push({ file: FIXTURE_FILES.recommendations, message: "expected at least 3 insight cards" });
  }

  issues.push(...validateExpectedScores(FIXTURE_FILES.expectedScores));
  issues.push(...validateExpectedScores(FIXTURE_FILES.expectedScoresRunning));

  for (const rel of Object.values(FIXTURE_FILES)) {
    const doc = readJson(rel);
    if (isRecord(doc) && isRecord(doc._meta)) {
      const provenance = doc._meta.provenance;
      if (typeof provenance === "string" && !PROVENANCE.has(provenance)) {
        issues.push({ file: rel, message: `unknown _meta.provenance ${provenance}` });
      }
    }
  }

  return issues;
}
