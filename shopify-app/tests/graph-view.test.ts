import assert from "node:assert/strict";
import test from "node:test";
import prisma from "../app/db.server";
import { loadGraphView } from "../app/services/graph/view.server";
import { runDemoPipeline } from "../app/services/pipeline/run-demo";

const shopId = "harbour-run-demo.myshopify.com";

test("graph page data comes from Prisma edges", async () => {
  await runDemoPipeline(prisma);
  const view = await loadGraphView(prisma, shopId);
  assert.ok(view.edges.length > 0);
  assert.ok(view.nodes.length > 0);
  assert.ok(view.nodes.length <= 150);
  assert.ok(view.edges.length <= 300);
  assert.ok(view.nodes.some((node) => node.type === "EventCandidate" && node.label.includes("London 10K")));
  assert.ok(view.nodes.some((node) => node.type === "Geo"));
  assert.ok(view.nodes.some((node) => node.type === "Order"));
  assert.ok(view.highlightIds.some((id) => id.startsWith("EventCandidate:")));
  assert.ok(view.highlightIds.some((id) => id.startsWith("Geo:")));
  assert.ok(view.highlightIds.some((id) => id.startsWith("Order:")));
  assert.ok(view.highlightIds.some((id) => id.startsWith("WeatherForecast:") || id.startsWith("Driver:")));
  assert.equal(view.preset, "race_day_evidence");
  assert.equal(view.capped, view.truncated);
  assert.equal(view.error, null);
  assert.ok(view.totals.edges >= view.edges.length);
  assert.ok(view.totals.nodes >= view.nodes.length);
  assert.equal(view.edges.every((edge) => edge.provenance.length > 0 && edge.fromId === edge.from), true);
  const chips = ["Order", "SKU", "Geo", "CatalogueEvent", "Driver", "Weather", "Social", "EventCandidate", "Persona"];
  assert.ok(view.nodes.some((node) => node.type === "Weather" || node.type === "Driver"));
  assert.equal(view.nodes.some((node) => node.type === "WeatherForecast" || node.type === "Event" || node.type === "SocialTrend"), false);
  assert.equal(view.nodes.filter((node) => chips.includes(node.type)).length > 0, true);

  await prisma.graphEdge.deleteMany({ where: { shopId: "shop_empty_graph" } });
  const empty = await loadGraphView(prisma, "shop_empty_graph");
  assert.equal(empty.edges.length, 0);
  assert.equal(empty.nodes.length, 0);
  assert.equal(empty.emptyReason, "no_edges_after_pipeline");
  assert.equal(empty.preset, "race_day_evidence");

  const runningShop = "shop_graph_running";
  await prisma.pipelineRun.deleteMany({ where: { shopId: runningShop } });
  await prisma.pipelineRun.create({
    data: {
      shopId: runningShop,
      mode: "demo",
      trigger: "manual_refresh",
      status: "running",
      currentStage: "graph_seed",
      stagesJson: "[]",
      idempotencyKey: `${runningShop}:${Date.now()}`,
    },
  });
  const running = await loadGraphView(prisma, runningShop);
  assert.equal(running.emptyReason, "pipeline_incomplete");
  await prisma.pipelineRun.deleteMany({ where: { shopId: runningShop } });

  const failedShop = "shop_graph_failed";
  await prisma.pipelineRun.deleteMany({ where: { shopId: failedShop } });
  await prisma.pipelineRun.create({
    data: {
      shopId: failedShop,
      mode: "demo",
      trigger: "manual_refresh",
      status: "failed",
      failedStage: "score_link",
      stagesJson: "[]",
      idempotencyKey: `${failedShop}:${Date.now()}`,
    },
  });
  const failed = await loadGraphView(prisma, failedShop);
  assert.equal(failed.error, "score_failed");
  assert.equal(failed.edges.length, 0);
  await prisma.pipelineRun.deleteMany({ where: { shopId: failedShop } });
});
