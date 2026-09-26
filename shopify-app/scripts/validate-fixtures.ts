import { validateFixtures } from "../app/fixtures/validate";

const issues = validateFixtures();
if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}
console.log("fixtures ok");
