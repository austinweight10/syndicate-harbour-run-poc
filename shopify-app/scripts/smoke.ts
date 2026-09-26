import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, DEMO_FIXTURE_SHOP: "1" };

function run(args: string[]) {
  const result = spawnSync("npx", ["tsx", ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["scripts/validate-fixtures.ts"]);
run(["--test", "--test-concurrency=1", "tests/phase01.test.ts", "tests/pipeline-demo.test.ts"]);
