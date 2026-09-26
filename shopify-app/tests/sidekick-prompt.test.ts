import assert from "node:assert/strict";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";

const { default: prisma } = await import("../app/db.server");
const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
const { runDemoPipeline } = await import("../app/services/pipeline/run-demo");
const { loadPackInput, templatePack } = await import("../app/services/content-pack/generate.server");
const { MAX_PROMPT_CHARS, htmlToText, sidekickPrompt, sidekickUrl } = await import("../app/services/content-pack/sidekick");

async function raceWeekendPack() {
  let event = await prisma.eventCandidate.findFirst({ where: { shopId: DEMO_SHOP_DOMAIN, name: { startsWith: "Race weekend" } } });
  if (!event) {
    await runDemoPipeline(prisma);
    event = await prisma.eventCandidate.findFirstOrThrow({ where: { shopId: DEMO_SHOP_DOMAIN, name: { startsWith: "Race weekend" } } });
  }
  const input = await loadPackInput(DEMO_SHOP_DOMAIN, event.id);
  assert.ok(input, "pack input for the race weekend");
  return { event, draft: templatePack(input) };
}

test("the Sidekick prompt carries every asset in the pack as plain text", async () => {
  const { event, draft } = await raceWeekendPack();
  const prompt = sidekickPrompt(draft, { name: event.name, windowLabel: event.windowLabel, city: event.venueCity });
  const { blog, page, banner, email, segments } = draft.assets;

  for (const text of [event.name, blog.title, page.title, banner.headline, banner.body, banner.ctaPath, email.subject]) {
    assert.ok(prompt.includes(text), `prompt mentions ${text}`);
  }
  assert.ok(prompt.includes(`/pages/${page.handle}`), "page URL uses Shopify's /pages/ path");
  for (const segment of segments) {
    assert.ok(prompt.includes(segment.name) && prompt.includes(segment.query), `segment ${segment.name} and its query`);
  }
  assert.equal(/<\/?[a-z][^>]*>/i.test(prompt), false, "no HTML tags");
  assert.match(prompt, /one at a time/);
  assert.match(prompt, /drafts or hidden/);
  assert.ok(prompt.length <= MAX_PROMPT_CHARS);
});

test("very long pack bodies are dropped before the brief is cut", async () => {
  const { draft } = await raceWeekendPack();
  const long = "<p>" + "Race kit advice for London runners. ".repeat(400) + "</p>";
  const bloated = { ...draft, assets: { ...draft.assets, blog: { ...draft.assets.blog, bodyHtml: long }, page: { ...draft.assets.page, bodyHtml: long }, email: { ...draft.assets.email, bodyHtml: long } } };
  const prompt = sidekickPrompt(bloated, { name: "Race weekend", windowLabel: null, city: null });
  assert.ok(prompt.length <= MAX_PROMPT_CHARS, `${prompt.length} chars`);
  assert.ok(prompt.includes(draft.assets.email.subject), "titles survive the trim");
  assert.ok(prompt.includes(draft.assets.segments[0]?.query ?? ""), "segment queries survive the trim");
});

test("the deep link is the shop's admin with the prompt URL-encoded", () => {
  const prompt = "Launch \"Race weekend\" & email: 19–29 Sept\n1. Blog";
  const url = sidekickUrl("syndicate-4ghkumor.myshopify.com", prompt);
  assert.ok(url.startsWith("https://syndicate-4ghkumor.myshopify.com/admin?sidekick="));
  assert.equal(decodeURIComponent(url.split("?sidekick=")[1]), prompt);
  assert.equal(htmlToText("<p>Hi&nbsp;<strong>there</strong> &amp; you</p><ul><li>one</li></ul>"), "Hi there & you • one");
});
