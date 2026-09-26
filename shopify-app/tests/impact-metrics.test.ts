import assert from "node:assert/strict";
import test from "node:test";
import { commercialImpact, type OrderLite } from "../app/services/impact/metrics";

const DAY = 24 * 60 * 60 * 1000;
const deployedAt = new Date("2026-09-12T09:00:00+01:00");
const day = (offset: number, hour = 12) => new Date(deployedAt.getTime() + offset * DAY + (hour - 9) * 60 * 60 * 1000);

function order(at: Date, lines: [string, number, number][]): OrderLite {
  return { at, lines: lines.map(([productId, quantity, lineTotal]) => ({ productId, quantity, lineTotal })) };
}

test("uplift is relative to the rest of the store over the same windows", () => {
  const orders: OrderLite[] = [];
  for (let i = 1; i <= 6; i += 1) orders.push(order(day(-i), [["shell", 1, 100], ["tee", 1, 50]]));
  for (let i = 0; i < 6; i += 1) {
    orders.push(order(day(i), [["shell", 1, 100], ["tee", 1, 50]]));
    orders.push(order(day(i, 15), [["shell", 1, 100]]));
  }
  const c = commercialImpact(orders, new Set(["shell"]), deployedAt, day(20));
  assert.equal(c.windowDays, 10);
  assert.equal(c.before.orders, 6);
  assert.equal(c.after.orders, 12);
  assert.equal(c.before.revenue, 600);
  assert.equal(c.after.revenue, 1200);
  // Target doubled while the rest of the store stayed flat → +100%.
  assert.ok(Math.abs((c.uplift ?? 0) - 1) < 1e-9);
  assert.ok(Math.abs((c.incrementalRevenue ?? 0) - 600) < 1e-9);
  assert.equal(c.status, "ok");
  assert.equal(c.series.length, 20);
  assert.equal(c.series.reduce((sum, point) => sum + point.revenue, 0), 1800);
});

test("a store-wide rise is not counted as impact", () => {
  const orders: OrderLite[] = [];
  for (let i = 1; i <= 6; i += 1) orders.push(order(day(-i), [["shell", 1, 100], ["tee", 1, 100]]));
  for (let i = 0; i < 6; i += 1) {
    orders.push(order(day(i), [["shell", 1, 100], ["tee", 1, 100]]));
    orders.push(order(day(i, 15), [["shell", 1, 100], ["tee", 1, 100]]));
  }
  const c = commercialImpact(orders, new Set(["shell"]), deployedAt, day(20));
  assert.ok(Math.abs(c.uplift ?? 1) < 1e-9, "target doubled but so did the store");
  assert.ok(Math.abs(c.incrementalRevenue ?? 1) < 1e-9);
});

test("low order counts are an early signal; under a week is still measuring", () => {
  const orders = [
    order(day(-2), [["kids", 1, 28], ["tee", 1, 38]]),
    order(day(2), [["kids", 1, 28], ["tee", 1, 38]]),
    order(day(3), [["kids", 1, 28]]),
  ];
  assert.equal(commercialImpact(orders, new Set(["kids"]), deployedAt, day(20)).status, "early");
  const young = commercialImpact(orders, new Set(["kids"]), deployedAt, day(4));
  assert.equal(young.status, "measuring");
  assert.equal(young.daysLive, 4);
  assert.equal(young.windowDays, 4);
  assert.equal(commercialImpact(orders, new Set(), deployedAt, day(20)).status, "no_targets");
});

test("conversion rate is orders ÷ sessions, only when traffic is known", () => {
  const orders: OrderLite[] = [];
  for (let i = 1; i <= 6; i += 1) orders.push(order(day(-i), [["shell", 1, 100], ["tee", 1, 50]]));
  for (let i = 0; i < 9; i += 1) orders.push(order(day(i), [["shell", 1, 100], ["tee", 1, 50]]));
  const withTraffic = commercialImpact(orders, new Set(["shell"]), deployedAt, day(20), { sessionsBefore: 300, sessionsAfter: 300 });
  assert.equal(withTraffic.before.conversion, 6 / 300);
  assert.equal(withTraffic.after.conversion, 9 / 300);
  assert.ok(Math.abs((withTraffic.conversionChange ?? 0) - 0.01) < 1e-12);
  const without = commercialImpact(orders, new Set(["shell"]), deployedAt, day(20));
  assert.equal(without.before.conversion, null);
  assert.equal(without.conversionChange, null);
});
