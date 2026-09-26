import prisma from "../../db.server";
import { FIXTURE_ACCESS_TOKEN } from "../../fixture-token";
import { hasMarketingWriteScopes } from "../../scopes";
import { adminGraphql } from "../ingest/admin-graphql";
import { parseAssets, type ContentPackAssets } from "./types";

/**
 * Deploy / undo a ContentPack to Shopify Admin.
 * Live token + marketing write scopes → real pages/article/segments/banner metafield.
 * Demo fixture without Admin token → simulated (same pattern as storefront actions).
 */

type Target =
  | { mode: "shopify"; domain: string; token: string }
  | { mode: "simulated"; reason: string };

export type PackApplyResult = { ok: true; simulated: boolean; message: string } | { ok: false; message: string };

type Undo =
  | {
      type: "shopify";
      articleId: string | null;
      pageId: string | null;
      emailPageId: string | null;
      segmentIds: string[];
      shopId: string;
      priorBanner: string | null;
    }
  | { type: "simulated" };

type Gql = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
type UserErrors = { field?: string[] | null; message: string }[];

function assertNoUserErrors(errors: UserErrors | undefined, what: string) {
  if (errors && errors.length > 0) throw new Error(`${what}: ${errors.map((error) => error.message).join("; ")}`);
}

async function resolveTarget(shopId: string): Promise<Target | { error: string }> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "Shop not found." };
  const demo = process.env.DEMO_FIXTURE_SHOP === "1" || shop.accessToken === FIXTURE_ACCESS_TOKEN;
  if (demo) {
    const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
    if (domain && token) return { mode: "shopify", domain, token };
    return { mode: "simulated", reason: "Demo shop — no Admin token, so Shopify was not changed." };
  }
  if (!shop.accessToken) return { error: "Shop is disconnected. Reinstall Syndicate." };

  // Custom Admin token (same as storefront actions) can publish even when OAuth
  // optional scopes aren't granted yet.
  const overrideDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const overrideToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (overrideDomain && overrideToken) {
    return { mode: "shopify", domain: overrideDomain, token: overrideToken };
  }

  if (!hasMarketingWriteScopes(shop.scopes)) {
    return {
      error:
        "Syndicate needs permission to create pages, blogs and customer segments. Click Publish again — Shopify will ask you to approve write access.",
    };
  }
  return { mode: "shopify", domain: shop.myshopifyDomain, token: shop.accessToken };
}

export async function applyPack(shopId: string, packId: string): Promise<PackApplyResult> {
  const existing = await prisma.contentPack.findFirst({ where: { id: packId, shopId } });
  if (!existing) return { ok: false, message: "Pack not found." };

  // Allow a second Publish after a simulated save so the merchant can go live
  // once write_content / write_customers are granted.
  let simulatedPrior = false;
  if (existing.status === "applied" && existing.resultJson) {
    try {
      simulatedPrior = Boolean((JSON.parse(existing.resultJson) as { simulated?: boolean }).simulated);
    } catch {
      simulatedPrior = false;
    }
  }
  const rePublish = existing.status === "applied" && simulatedPrior;
  if (!rePublish) {
    const claimed = await prisma.contentPack.updateMany({
      where: { id: packId, shopId, status: { in: ["proposed", "failed", "reverted"] } },
      data: { status: "applying", errorMessage: null },
    });
    if (claimed.count !== 1) return { ok: false, message: "This pack is already applied or in progress." };
  } else {
    await prisma.contentPack.update({
      where: { id: packId },
      data: { status: "applying", errorMessage: null },
    });
  }
  const pack = await prisma.contentPack.findUniqueOrThrow({ where: { id: packId } });
  const assets = parseAssets(pack.assetsJson);

  try {
    const target = await resolveTarget(shopId);
    if ("error" in target) throw new Error(target.error);
    let undo: Undo;
    let message: string;
    let resultExtra: Record<string, unknown> = {};
    if (target.mode === "simulated") {
      undo = { type: "simulated" };
      message = target.reason;
      resultExtra = { assets: summarise(assets) };
    } else {
      const gql = <T>(query: string, variables: Record<string, unknown>) =>
        adminGraphql<T>(target.domain, target.token, query, variables, { retries: 1 });
      const published = await publishToShopify(gql, assets);
      undo = published.undo;
      message = "Live in Shopify Admin — blog, page, banner, email draft and segments.";
      resultExtra = { links: published.links };
    }
    await prisma.contentPack.update({
      where: { id: packId },
      data: {
        status: "applied",
        appliedAt: new Date(),
        revertedAt: null,
        undoJson: JSON.stringify(undo),
        resultJson: JSON.stringify({ simulated: target.mode === "simulated", message, ...resultExtra }),
      },
    });
    return { ok: true, simulated: target.mode === "simulated", message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify rejected the pack.";
    await prisma.contentPack.update({
      where: { id: packId },
      data: { status: "failed", errorMessage: message.slice(0, 500) },
    });
    return { ok: false, message };
  }
}

export async function undoPack(shopId: string, packId: string): Promise<PackApplyResult> {
  const pack = await prisma.contentPack.findFirst({ where: { id: packId, shopId, status: "applied" } });
  if (!pack?.undoJson) return { ok: false, message: "Nothing to undo." };
  const undo = JSON.parse(pack.undoJson) as Undo;
  try {
    if (undo.type === "shopify") {
      const target = await resolveTarget(shopId);
      if ("error" in target) throw new Error(target.error);
      if (target.mode !== "shopify") throw new Error("This pack was published on Shopify; an Admin token is needed to undo it.");
      const gql = <T>(query: string, variables: Record<string, unknown>) =>
        adminGraphql<T>(target.domain, target.token, query, variables, { retries: 1 });
      await revertShopify(gql, undo);
    }
    await prisma.contentPack.update({
      where: { id: packId },
      data: { status: "reverted", revertedAt: new Date(), undoJson: null, errorMessage: null },
    });
    return { ok: true, simulated: undo.type === "simulated", message: "Marketing pack undone." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undo failed.";
    await prisma.contentPack.update({ where: { id: packId }, data: { errorMessage: message.slice(0, 500) } });
    return { ok: false, message };
  }
}

function summarise(assets: ContentPackAssets) {
  return {
    blog: assets.blog.title,
    page: assets.page.title,
    banner: assets.banner.headline,
    email: assets.email.subject,
    segments: assets.segments.map((segment) => segment.name),
  };
}

async function publishToShopify(
  gql: Gql,
  assets: ContentPackAssets,
): Promise<{ undo: Extract<Undo, { type: "shopify" }>; links: Record<string, string | string[]> }> {
  const shop = await gql<{ shop: { id: string } }>(`query { shop { id } }`, {});
  const blogs = await gql<{ blogs: { nodes: { id: string; handle: string; title: string }[] } }>(
    `query { blogs(first: 5) { nodes { id handle title } } }`,
    {},
  );
  let blogId: string | null = blogs.blogs.nodes[0]?.id ?? null;
  if (!blogId) {
    const created = await gql<{
      blogCreate: { blog: { id: string } | null; userErrors: UserErrors };
    }>(
      `mutation($title: String!) {
        blogCreate(blog: { title: $title }) { blog { id } userErrors { field message } }
      }`,
      { title: "News" },
    );
    assertNoUserErrors(created.blogCreate.userErrors, "Create blog");
    blogId = created.blogCreate.blog?.id ?? null;
  }
  if (!blogId) throw new Error("Could not find or create a Shopify blog.");
  const resolvedBlogId: string = blogId;

  const priorBanner = await readBanner(gql, shop.shop.id);

  const article = await gql<{
    articleCreate: { article: { id: string; handle: string } | null; userErrors: UserErrors };
  }>(
    `mutation($article: ArticleCreateInput!) {
      articleCreate(article: $article) { article { id handle } userErrors { field message } }
    }`,
    {
      article: {
        blogId: resolvedBlogId,
        title: assets.blog.title,
        handle: assets.blog.handle,
        body: assets.blog.bodyHtml,
        summary: assets.blog.summary,
        isPublished: true,
      },
    },
  );
  assertNoUserErrors(article.articleCreate.userErrors, "Create article");

  const page = await gql<{
    pageCreate: { page: { id: string; handle: string } | null; userErrors: UserErrors };
  }>(
    `mutation($page: PageCreateInput!) {
      pageCreate(page: $page) { page { id handle } userErrors { field message } }
    }`,
    {
      page: {
        title: assets.page.title,
        handle: assets.page.handle,
        body: assets.page.bodyHtml,
        isPublished: true,
      },
    },
  );
  assertNoUserErrors(page.pageCreate.userErrors, "Create marketing page");

  const emailPage = await gql<{
    pageCreate: { page: { id: string; handle: string } | null; userErrors: UserErrors };
  }>(
    `mutation($page: PageCreateInput!) {
      pageCreate(page: $page) { page { id handle } userErrors { field message } }
    }`,
    {
      page: {
        title: `Email draft · ${assets.email.subject}`,
        handle: `email-${assets.page.handle.replace(/^occasion-/, "")}`,
        body: emailDraftPageHtml(assets),
        isPublished: false,
      },
    },
  );
  assertNoUserErrors(emailPage.pageCreate.userErrors, "Create email draft page");

  await setBanner(gql, shop.shop.id, assets.banner);

  const segmentIds: string[] = [];
  const segmentNames: string[] = [];
  for (const segment of assets.segments) {
    const created = await gql<{
      segmentCreate: { segment: { id: string; name: string } | null; userErrors: UserErrors };
    }>(
      `mutation($name: String!, $query: String!) {
        segmentCreate(name: $name, query: $query) { segment { id name } userErrors { field message } }
      }`,
      { name: segment.name, query: segment.query },
    );
    // Segment query dialects vary by shop — soft-fail one segment rather than abort the pack.
    if (created.segmentCreate.userErrors?.length) {
      console.warn("content_pack.segment_failed", created.segmentCreate.userErrors.map((e) => e.message).join("; "));
      continue;
    }
    if (created.segmentCreate.segment) {
      segmentIds.push(created.segmentCreate.segment.id);
      segmentNames.push(created.segmentCreate.segment.name);
    }
  }

  return {
    undo: {
      type: "shopify",
      articleId: article.articleCreate.article?.id ?? null,
      pageId: page.pageCreate.page?.id ?? null,
      emailPageId: emailPage.pageCreate.page?.id ?? null,
      segmentIds,
      shopId: shop.shop.id,
      priorBanner,
    },
    links: {
      article: article.articleCreate.article?.handle ?? "",
      page: page.pageCreate.page?.handle ?? "",
      emailPage: emailPage.pageCreate.page?.handle ?? "",
      segments: segmentNames,
    },
  };
}

async function revertShopify(gql: Gql, undo: Extract<Undo, { type: "shopify" }>) {
  if (undo.articleId) {
    const data = await gql<{ articleDelete: { deletedArticleId: string | null; userErrors: UserErrors } }>(
      `mutation($id: ID!) { articleDelete(id: $id) { deletedArticleId userErrors { field message } } }`,
      { id: undo.articleId },
    );
    assertNoUserErrors(data.articleDelete.userErrors, "Delete article");
  }
  for (const pageId of [undo.pageId, undo.emailPageId]) {
    if (!pageId) continue;
    const data = await gql<{ pageDelete: { deletedPageId: string | null; userErrors: UserErrors } }>(
      `mutation($id: ID!) { pageDelete(id: $id) { deletedPageId userErrors { field message } } }`,
      { id: pageId },
    );
    assertNoUserErrors(data.pageDelete.userErrors, "Delete page");
  }
  for (const segmentId of undo.segmentIds) {
    const data = await gql<{ segmentDelete: { deletedSegmentId: string | null; userErrors: UserErrors } }>(
      `mutation($id: ID!) { segmentDelete(id: $id) { deletedSegmentId userErrors { field message } } }`,
      { id: segmentId },
    );
    assertNoUserErrors(data.segmentDelete.userErrors, "Delete segment");
  }
  if (undo.priorBanner == null) {
    await gql<{ metafieldsDelete: { deletedIds: string[] | null; userErrors: UserErrors } }>(
      `mutation($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) { deletedIds userErrors { field message } }
      }`,
      { metafields: [{ ownerId: undo.shopId, namespace: "syndicate", key: "storefront_banner" }] },
    );
  } else {
    await gql<{ metafieldsSet: { userErrors: UserErrors } }>(
      `mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } userErrors { field message } }
      }`,
      {
        metafields: [
          {
            ownerId: undo.shopId,
            namespace: "syndicate",
            key: "storefront_banner",
            type: "json",
            value: undo.priorBanner,
          },
        ],
      },
    );
  }
}

async function readBanner(gql: Gql, shopGid: string): Promise<string | null> {
  const data = await gql<{
    shop: { metafield: { value: string } | null };
  }>(
    `query($namespace: String!, $key: String!) {
      shop { metafield(namespace: $namespace, key: $key) { value } }
    }`,
    { namespace: "syndicate", key: "storefront_banner" },
  );
  void shopGid;
  return data.shop.metafield?.value ?? null;
}

async function setBanner(
  gql: Gql,
  shopGid: string,
  banner: ContentPackAssets["banner"],
): Promise<void> {
  const data = await gql<{ metafieldsSet: { userErrors: UserErrors } }>(
    `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { metafields { id } userErrors { field message } }
    }`,
    {
      metafields: [
        {
          ownerId: shopGid,
          namespace: "syndicate",
          key: "storefront_banner",
          type: "json",
          value: JSON.stringify(banner),
        },
      ],
    },
  );
  assertNoUserErrors(data.metafieldsSet.userErrors, "Set banner metafield");
}

function emailDraftPageHtml(assets: ContentPackAssets): string {
  const targets = assets.email.personaTargets.join(", ") || "linked personas";
  return `<p><em>Syndicate email draft — copy into Shopify Email. Not sent.</em></p>
<p><strong>Subject:</strong> ${escape(assets.email.subject)}</p>
<p><strong>Preview:</strong> ${escape(assets.email.previewText)}</p>
<p><strong>Audiences:</strong> ${escape(targets)}</p>
<hr/>
${assets.email.bodyHtml}`;
}

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
