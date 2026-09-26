import { readFileSync } from "node:fs";
import prisma from "../db.server";
import { FIXTURE_ACCESS_TOKEN } from "../fixture-token";
import { FIXTURE_FILES, fixturePath } from "../fixtures/paths";
import { MVP_SCOPES, assertExactScopes } from "../scopes";
import { DEMO_SHOP_DOMAIN } from "../fixtures/seed";
import { PIPELINE_STAGE_LABELS, pipelineEnqueue, type PipelineStage } from "./pipeline.server";

export async function currentShopId(request?: Request): Promise<string> {
  if (process.env.DEMO_FIXTURE_SHOP === "1") return DEMO_SHOP_DOMAIN;
  if (!request) {
    throw new Response("Live shop requires a request.", { status: 401 });
  }
  const shell = await loadShell(request);
  return shell.shop.domain;
}

export type ShellData = {
  shop: {
    domain: string;
    name: string;
    connected: boolean;
    mode: "demo" | "live";
  };
  scopes: string;
  pipeline: null | {
    id: string;
    status: string;
    label: string;
  };
  seed: {
    orders: number;
    products: number;
  };
};

type DemoShopFile = {
  shop: {
    name: string;
    myshopifyDomain: string;
    currencyCode: string;
    ianaTimezone: string;
    storefrontUrl: string;
    vertical: string;
  };
  connection: { scopes: string[]; status: string };
  flags: { agentsAutoRun: boolean };
};

function readDemoShop(): DemoShopFile {
  return JSON.parse(readFileSync(fixturePath(FIXTURE_FILES.session), "utf8")) as DemoShopFile;
}

async function seedCounts(shopId: string): Promise<ShellData["seed"]> {
  const [orders, products] = await Promise.all([
    prisma.orderRow.count({ where: { shopId } }),
    prisma.productRow.count({ where: { shopId } }),
  ]);
  return { orders, products };
}

async function activePipeline(shopId: string): Promise<ShellData["pipeline"]> {
  const run = await prisma.pipelineRun.findFirst({
    where: { shopId, status: { in: ["pending", "running"] }, mode: "live" },
    orderBy: { startedAt: "desc" },
  });
  if (!run) return null;
  const stage = (run.currentStage ?? "store_makeup") as PipelineStage;
  return {
    id: run.id,
    status: run.status,
    label: PIPELINE_STAGE_LABELS[stage] ?? "Ingesting store makeup…",
  };
}

async function ensureDemoShop(): Promise<ShellData> {
  const demo = readDemoShop();
  const scopes = demo.connection.scopes.join(",");
  assertExactScopes(scopes);
  const domain = demo.shop.myshopifyDomain;

  await prisma.shop.upsert({
    where: { myshopifyDomain: domain },
    create: {
      id: domain,
      myshopifyDomain: domain,
      name: demo.shop.name,
      accessToken: FIXTURE_ACCESS_TOKEN,
      scopes,
      primaryLocale: "en-GB",
      currencyCode: demo.shop.currencyCode,
      timezone: demo.shop.ianaTimezone,
      storefrontUrl: process.env.SHOP_STOREFRONT_URL?.trim() || null,
    },
    update: {
      name: demo.shop.name,
      accessToken: FIXTURE_ACCESS_TOKEN,
      scopes,
      uninstalledAt: null,
      currencyCode: demo.shop.currencyCode,
      timezone: demo.shop.ianaTimezone,
      ...(process.env.SHOP_STOREFRONT_URL?.trim()
        ? { storefrontUrl: process.env.SHOP_STOREFRONT_URL.trim() }
        : {}),
    },
  });

  await prisma.shopSettings.upsert({
    where: { shopId: domain },
    create: {
      shopId: domain,
      agentsAutoRun: demo.flags.agentsAutoRun,
      modeOverride: "demo",
    },
    update: { modeOverride: "demo" },
  });

  return {
    shop: {
      domain,
      name: demo.shop.name,
      connected: demo.connection.status === "connected",
      mode: "demo",
    },
    scopes: MVP_SCOPES,
    pipeline: null,
    seed: await seedCounts(domain),
  };
}

type LiveSession = { shop: string; accessToken: string; scope?: string | null };

async function ensureLiveShop(session: LiveSession): Promise<ShellData> {
  const domain = session.shop;
  const scopes = session.scope && session.scope.length > 0 ? session.scope : MVP_SCOPES;
  assertExactScopes(scopes);

  const existing = await prisma.shop.findUnique({ where: { myshopifyDomain: domain } });
  await prisma.shop.upsert({
    where: { myshopifyDomain: domain },
    create: {
      id: domain,
      myshopifyDomain: domain,
      name: domain,
      accessToken: session.accessToken,
      scopes,
      primaryLocale: "en-GB",
      currencyCode: "GBP",
      timezone: "Europe/London",
    },
    update: {
      accessToken: session.accessToken,
      scopes,
      uninstalledAt: null,
    },
  });
  await prisma.shopSettings.upsert({
    where: { shopId: domain },
    create: { shopId: domain, agentsAutoRun: true, modeOverride: "live" },
    update: { modeOverride: "live" },
  });

  if (!existing || existing.uninstalledAt) {
    await pipelineEnqueue(domain, "install");
  } else {
    const active = await prisma.pipelineRun.findFirst({
      where: { shopId: domain, status: { in: ["pending", "running"] } },
    });
    if (!active) {
      const installed = await prisma.pipelineRun.findFirst({
        where: { shopId: domain, trigger: "install" },
      });
      if (!installed) await pipelineEnqueue(domain, "install");
    }
  }

  const shop = await prisma.shop.findUnique({ where: { id: domain } });
  return {
    shop: {
      domain,
      name: shop?.name || domain,
      connected: true,
      mode: "live",
    },
    scopes,
    pipeline: await activePipeline(domain),
    seed: await seedCounts(domain),
  };
}

export async function loadShell(request: Request): Promise<ShellData> {
  if (process.env.DEMO_FIXTURE_SHOP === "1") {
    return ensureDemoShop();
  }

  if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
    throw new Response(
      "Partner credentials are not set. Start with DEMO_FIXTURE_SHOP=1, or add SHOPIFY_API_KEY and SHOPIFY_API_SECRET. Do not invent a token.",
      { status: 401, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const { authenticate } = await import("../shopify.live.server");
  const { session } = await authenticate.admin(request);
  return ensureLiveShop({
    shop: session.shop,
    accessToken: session.accessToken ?? "",
    scope: session.scope,
  });
}
