import assert from "node:assert/strict";
import { test } from "node:test";
import { postalSectorFromZip } from "../app/services/ingest/shopify-full";

test("postalSectorFromZip keeps UK outward code only", () => {
  assert.equal(postalSectorFromZip("W2 2UH"), "W2");
  assert.equal(postalSectorFromZip("SW11 4NJ"), "SW11");
  assert.equal(postalSectorFromZip("m1 1ae"), "M1");
  assert.equal(postalSectorFromZip("EC1A 1BB"), "EC1A");
  assert.equal(postalSectorFromZip(null), null);
  assert.equal(postalSectorFromZip(""), null);
});
