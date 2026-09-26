# AI_CALL_CONTRACT — what AI the app calls (weekend)

**Date:** 24 Sep 2026 · Europe/London  
**Product:** Syndicate MVP (hackathon)  
**Status:** Locked for weekend build agents — do not invent call sites  
**Companions:** [NON_FUNCTIONALS.md](./NON_FUNCTIONALS.md) · [RISKS_AND_DECISIONS.md](./RISKS_AND_DECISIONS.md) (A8, D32) · epics 05 / 06 / 07

---

## 1) Executive answer

Syndicate’s **merchant runtime** (Remix app + in-process jobs + Playwright shopper) does **not** run LangGraph, LLM-driven browsers, embeddings/RAG, or vision. **Cursor Cloud Agents** write app code on Origin (D28); they are **not** `PipelineRun` executors and are not “AI the shop calls.”

At **runtime**, recommendations and personas are **deterministic rules + templates** first. Optional thin LLM polish may rename EventCandidates, write persona blurbs, and polish recommendation title/body — **only** on aggregated non-PII cluster cards, behind env keys, capped ≤5 calls per score/persona batch and ≤$5 weekend total. If no key / provider fail / over budget: **templates only** (fixtures + en-GB string tables). The demo must work with LLM **off**.

**Playwright agents** follow **scripted** happy paths (home → collection → PDP → ATC → checkout start → stop). They do **not** ask an LLM what to click next. Provenance for any LLM text is **MODEL_HYPOTHESIS** (UI: Hyp). Social demand scoring, weather, catalogue clustering, and confidence remain non-LLM.

---

## 2) Call sites

### Called (optional polish only)

| Call ID | When (job/step) | Provider | Model (weekend default) | Purpose | Input shape (no PII) | Output shape | Provenance | Required? | Fallback if no key/fail | Max calls | Cost ceiling |
|---------|-----------------|----------|-------------------------|---------|----------------------|--------------|------------|-----------|-------------------------|-----------|--------------|
| `ai.eventName` | After EventCandidate clustering in `graph.buildAndScore` / stage `score_link` | Primary OpenAI; else Anthropic; else off | `gpt-4o-mini` · fallback Claude Haiku class `claude-haiku-4-5` | Short British English event display name | Aggregate cluster card: top SKUs/types, weekday, city buckets, collection mix, weather driver labels, archetype hint | `{ name: string }` ≤80 chars | `MODEL_HYPOTHESIS` | **No** | Template from archetype + top collection (`Match-day · {collection}`) | ≤2 per score batch | Share ≤$5 weekend pool |
| `ai.personaBlurb` | After persona seed in `personas.derive` / stage `personas` | Same | Same | 1–2 sentence merchant blurb | Goals[], budget band £, constraints flags, event archetype, locationProxy city-level only | `{ blurb: string }` ≤280 chars | `MODEL_HYPOTHESIS` | **No** | Fixture / en-GB string table by persona key | ≤2 per persona batch | Same pool |
| `ai.recPolish` | Optional *after* `recommendations.build` templates | Same | Same | Polish title/body only — does not invent kind/priority/target | Template title/body + insightKind + event name + persona name (persona **display** name only, never email) | `{ title, body }` | `MODEL_HYPOTHESIS` | **No** | Keep deterministic template strings | ≤1 per rec batch (or skip entirely) | Same pool |

**Batch rule:** Sum of LLM completions for one shop score→persona→rec pass ≤ `SYNDICATE_LLM_MAX_CALLS_PER_BATCH` (default **5**). Prefer naming + blurb; skip `ai.recPolish` first if near cap.

### Explicitly NOT called (do not implement)

| Forbidden | Why |
|-----------|-----|
| LangGraph / multi-agent orchestrator at runtime | Unbounded cost/latency; not in stack |
| LLM-driven Playwright “decide next click” | Flaky; epic 06 = **scripted** paths only |
| Embeddings / RAG / vector store over catalogue or orders | Out of weekend scope |
| Vision / multimodal on screenshots | Nice-if-time screenshots are storage only |
| Customer-email / SMS rewrite or send | No write marketing; no PII to LLM |
| Social demand scoring via LLM | Social = watchlist + `social.webHarvest` AGGREGATE_PROXY + MOCK |
| Cloud Agent / computer-use as merchant `PipelineRun` | D28: Cloud Agents **build** code; Playwright + in-app worker run the shop |
| Unofficial X/Twitter scrape “summarised by LLM” | Forbidden acquisition path (A15) |

---

## 3) Weekend default provider

| Role | Vendor | Model ID | Env |
|------|--------|----------|-----|
| **Primary** | OpenAI | `gpt-4o-mini` | `OPENAI_API_KEY` |
| **Fallback** | Anthropic | `claude-haiku-4-5` (Claude Haiku class; pinned snapshot commonly `claude-haiku-4-5-20251001` — use alias `claude-haiku-4-5` unless override) | `ANTHROPIC_API_KEY` |
| **Off** | — | Templates only | Neither key, or `SYNDICATE_LLM_PROVIDER=off` |

**Selection order:**

1. If `SYNDICATE_LLM_PROVIDER=off` → templates.  
2. Else if `=openai` and `OPENAI_API_KEY` → OpenAI.  
3. Else if `=anthropic` and `ANTHROPIC_API_KEY` → Anthropic.  
4. Else if unset: try OpenAI key, else Anthropic key, else templates.  
5. Optional `SYNDICATE_LLM_MODEL` overrides the default model string for the chosen vendor.

**As of Sep 2026:** weekend agents should treat Anthropic’s cheap tier as **“Claude Haiku class”** with API id `claude-haiku-4-5` (not legacy `claude-3-5-haiku` unless a key only works on that older id — document in Settings if forced).

**Demo rule:** App must still demo fully with templates only (fixtures + en-GB tables). Missing keys are not a PipelineRun failure.

---

## 4) Env vars

| Variable | Values | Default |
|----------|--------|---------|
| `OPENAI_API_KEY` | secret | unset |
| `ANTHROPIC_API_KEY` | secret | unset |
| `SYNDICATE_LLM_PROVIDER` | `openai` \| `anthropic` \| `off` | unset → auto (OpenAI → Anthropic → off) |
| `SYNDICATE_LLM_MODEL` | provider model id override | unset → `gpt-4o-mini` or `claude-haiku-4-5` |
| `SYNDICATE_LLM_MAX_CALLS_PER_BATCH` | int | `5` |

Also honour existing optional `OPENAI_API_KEY` note in CONTRACTS. Never log raw keys. Settings may show “LLM: off | openai | anthropic” without revealing secrets.

**Weekend spend:** track approximate tokens; if estimated spend ≥ **$5** total for the hackathon box, force provider `off` for remaining calls (templates).

---

## 5) Prompt rules

- **Locale / tone:** British English; sports / athleisure merchant voice; short; no hype claims presented as fact.  
- **Never send:** emails, full names, phones, order ids, customer ids, `gid://shopify/Customer…`, street addresses, raw order notes, payment fields.  
- **Only send:** aggregated cluster cards — top SKUs / productTypes, weekday, city buckets (city/sector max), collection mix, weather driver labels, archetype, AOV band £, constraint **flags** (mobileFirst, timePressure), insightKind enums.  
- **Output:** plain text / tiny JSON only; no tool calls; max tokens modest (e.g. 256).  
- **Provenance:** persist `MODEL_HYPOTHESIS` on any field filled by LLM; UI Hyp badge.  
- **PII guard:** before send, reject prompt if it matches `/@/` (email-like) or contains `gid://shopify/Customer` (case-sensitive); fall back to template and log `llm.pii_guard_rejected`.

---

## 6) Pseudocode — `llm.completeOptional`

```ts
// app/services/llm.ts — never throws into PipelineRun
type LlmPurpose = "ai.eventName" | "ai.personaBlurb" | "ai.recPolish";

type LlmResult = { text: string; usedLlm: boolean };

async function completeOptional(
  purpose: LlmPurpose,
  payload: Record<string, unknown>, // already aggregated, no PII
  templateText: string,
): Promise<LlmResult> {
  try {
    if (getProvider() === "off") return { text: templateText, usedLlm: false };
    if (batchCallCount() >= maxCallsPerBatch()) return { text: templateText, usedLlm: false };
    if (weekendSpendUsd() >= 5) return { text: templateText, usedLlm: false };

    const prompt = buildPrompt(purpose, payload); // British English system + aggregate user card
    if (piiGuardRejects(prompt)) {
      logWarn("llm.pii_guard_rejected", { purpose });
      return { text: templateText, usedLlm: false };
    }

    const text = await callProvider(prompt); // timeout ~8s; abort → template
    if (!text?.trim()) return { text: templateText, usedLlm: false };

    incrementBatchCalls();
    return { text: text.trim(), usedLlm: true };
  } catch (err) {
    logWarn("llm.optional_failed", { purpose, err: String(err) });
    return { text: templateText, usedLlm: false };
  }
}
```

Callers set provenance `MODEL_HYPOTHESIS` iff `usedLlm === true`; otherwise use OBSERVED / AGGREGATE_PROXY / MOCK as appropriate for the template path.

---

## 7) Test acceptance criteria

- [ ] **Templates path:** `SYNDICATE_LLM_PROVIDER=off` (or no keys) → `personas.derive` + `recommendations.build` + event naming produce fixture/en-GB strings; PipelineRun succeeds; zero HTTP to OpenAI/Anthropic.  
- [ ] **Mock provider path:** inject fake client → `usedLlm: true` → fields tagged `MODEL_HYPOTHESIS` / Hyp in loader JSON.  
- [ ] **PII guard:** prompt containing `@` or `gid://shopify/Customer` → reject → template; no provider call.  
- [ ] **Cap:** 6th call in one batch returns template without provider hit.  
- [ ] **Epic 06:** no import of `llm.completeOptional` inside Playwright decide/act loop.

---

## 8) Weekend Definition of Done (AI)

> Demo works with LLM **off**. With a key present, ≤3 naming/blurb calls may run and appear as **Hyp** badges on event names / persona blurbs; recommendations remain usable from templates alone. No LangGraph, no LLM-driven Playwright, no unbounded OpenAI spend.

**Pointer:** Merchant shoppers are scripted Playwright only — see [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md). The LLM must **not** drive Playwright decide/act; Cloud Agents / MCP Todo are not the shopper runtime.

---

## 9) Build vs runtime cheat-sheet

| Layer | AI? |
|-------|-----|
| Cursor Cloud Agents (Origin) | Yes — they **author** Remix/TS code (human/Austin greenlight). Not a shop API. |
| `PipelineRun` stages a→f | Deterministic jobs; optional `completeOptional` at naming/blurb/polish only |
| Playwright shopper | Scripted; **no** LLM ([RUN_AGENTS_UI_CONTRACT](./RUN_AGENTS_UI_CONTRACT.md)) |
| football-data / Open-Meteo / webHarvest | Non-LLM HTTP |
