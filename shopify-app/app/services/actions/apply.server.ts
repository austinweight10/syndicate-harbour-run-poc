import prisma from "../../db.server";
import { FIXTURE_ACCESS_TOKEN } from "../../fixture-token";
import { hasWriteScope } from "../../scopes";
import { adminGraphql } from "../ingest/admin-graphql";
import { parseParams, type ActionParams } from "./types";

/**
 * One-click apply / undo for StorefrontAction rows.
 *
 * Live installs write with the shop's offline token (needs write_products).
 * The demo fixture shop has no real Admin token: when SHOPIFY_STORE_DOMAIN and
 * SHOPIFY_ADMIN_ACCESS_TOKEN are set (a custom-app token on the Dawn store the
 * shoppers browse) it writes there; otherwise the change is recorded as
 * simulated and the card says so.
 */

type Target =
  | { mode: "shopify"; domain: string; token: string }
  | { mode: "simulated"; reason: string };

export type ApplyResult = { ok: true; simulated: boolean; message: string } | { ok: false; message: string };

type Undo =
  | { type: "collection_remove_product"; collectionId: string; productId: string }
  | {
      type: "collection_unfeature_product";
      collectionId: string;
      productId: string;
      priorSortOrder: string;
      priorIndex: number;
    }
  | { type: "product_restore_description"; productId: string; descriptionHtml: string }
  | { type: "product_remove_tags"; productId: string; tags: string[] }
  | { type: "simulated"; params: ActionParams };

async function resolveTarget(shopId: string): Promise<Target | { error: string }> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "Shop not found." };
  const demo = process.env.DEMO_FIXTURE_SHOP === "1" || shop.accessToken === FIXTURE_ACCESS_TOKEN;
  if (demo) {
    const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
    if (domain && token) return { mode: "shopify", domain, token };
    return { mode: "simulated", reason: "Demo shop — no Admin token, so the storefront was not changed." };
  }
  if (!hasWriteScope(shop.scopes)) {
    return {
      error: "Syndicate needs write_products to change your storefront. Click Deploy again to approve product updates.",
    };
  }
  if (!shop.accessToken) return { error: "Shop is disconnected. Reinstall Syndicate." };
  return { mode: "shopify", domain: shop.myshopifyDomain, token: shop.accessToken };
}

export async function applyAction(shopId: string, actionId: string): Promise<ApplyResult> {
  const claimed = await prisma.storefrontAction.updateMany({
    where: { id: actionId, shopId, status: { in: ["proposed", "failed", "reverted"] } },
    data: { status: "applying", errorMessage: null },
  });
  if (claimed.count !== 1) return { ok: false, message: "This action is already applied or in progress." };
  const action = await prisma.storefrontAction.findUniqueOrThrow({ where: { id: actionId } });
  const params = parseParams(action.paramsJson);

  try {
    const target = await resolveTarget(shopId);
    if ("error" in target) throw new Error(target.error);
    let undo: Undo;
    let message: string;
    if (target.mode === "simulated") {
      undo = { type: "simulated", params };
      message = target.reason;
    } else {
      const gql = <T>(query: string, variables: Record<string, unknown>) =>
        adminGraphql<T>(target.domain, target.token, query, variables, { retries: 1 });
      undo = await runMutation(gql, params);
      message = "Live on your storefront.";
    }
    await syncLocal(shopId, params, "apply");
    await prisma.storefrontAction.update({
      where: { id: actionId },
      data: {
        status: "applied",
        appliedAt: new Date(),
        revertedAt: null,
        undoJson: JSON.stringify(undo),
        resultJson: JSON.stringify({ simulated: target.mode === "simulated", message }),
      },
    });
    await prisma.recommendation.updateMany({ where: { id: action.cardId, shopId }, data: { status: "actioned" } });
    return { ok: true, simulated: target.mode === "simulated", message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify rejected the change.";
    await prisma.storefrontAction.update({
      where: { id: actionId },
      data: { status: "failed", errorMessage: message.slice(0, 500) },
    });
    return { ok: false, message };
  }
}

export async function undoAction(shopId: string, actionId: string): Promise<ApplyResult> {
  const action = await prisma.storefrontAction.findFirst({ where: { id: actionId, shopId, status: "applied" } });
  if (!action?.undoJson) return { ok: false, message: "Nothing to undo." };
  const undo = JSON.parse(action.undoJson) as Undo;
  const params = parseParams(action.paramsJson);
  try {
    if (undo.type !== "simulated") {
      const target = await resolveTarget(shopId);
      if ("error" in target) throw new Error(target.error);
      if (target.mode !== "shopify") throw new Error("This change was made on Shopify; an Admin token is needed to undo it.");
      const gql = <T>(query: string, variables: Record<string, unknown>) =>
        adminGraphql<T>(target.domain, target.token, query, variables, { retries: 1 });
      await runUndo(gql, undo);
    }
    await syncLocal(shopId, params, "undo");
    await prisma.storefrontAction.update({
      where: { id: actionId },
      data: { status: "reverted", revertedAt: new Date(), undoJson: null, errorMessage: null },
    });
    await prisma.recommendation.updateMany({ where: { id: action.cardId, shopId }, data: { status: "open" } });
    return { ok: true, simulated: undo.type === "simulated", message: "Change undone." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undo failed.";
    await prisma.storefrontAction.update({ where: { id: actionId }, data: { errorMessage: message.slice(0, 500) } });
    return { ok: false, message };
  }
}

type Gql = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
type UserErrors = { field?: string[] | null; message: string }[];

function assertNoUserErrors(errors: UserErrors | undefined, what: string) {
  if (errors && errors.length > 0) throw new Error(`${what}: ${errors.map((error) => error.message).join("; ")}`);
}

type ProductNode = { id: string; handle: string; title: string; descriptionHtml: string; tags: string[] };
type CollectionNode = {
  id: string;
  handle: string;
  sortOrder: string;
  ruleSet: { appliedDisjunctively: boolean } | null;
  products: { nodes: { id: string }[] };
};

async function findProduct(gql: Gql, handle: string): Promise<ProductNode> {
  const data = await gql<{ products: { nodes: ProductNode[] } }>(
    `query($q: String!) { products(first: 5, query: $q) { nodes { id handle title descriptionHtml tags } } }`,
    { q: `handle:${handle}` },
  );
  const node = data.products.nodes.find((row) => row.handle === handle);
  if (!node) throw new Error(`Product "${handle}" is not in this Shopify store.`);
  return node;
}

async function findCollection(gql: Gql, handle: string): Promise<CollectionNode> {
  const data = await gql<{ collections: { nodes: CollectionNode[] } }>(
    `query($q: String!) {
      collections(first: 5, query: $q) {
        nodes { id handle sortOrder ruleSet { appliedDisjunctively } products(first: 250) { nodes { id } } }
      }
    }`,
    { q: `handle:${handle}` },
  );
  const node = data.collections.nodes.find((row) => row.handle === handle);
  if (!node) throw new Error(`Collection "${handle}" is not in this Shopify store.`);
  return node;
}

async function runMutation(gql: Gql, params: ActionParams): Promise<Undo> {
  const product = await findProduct(gql, params.productHandle);

  if (params.type === "collection_add_product") {
    const collection = await findCollection(gql, params.collectionHandle);
    if (collection.ruleSet) {
      throw new Error("That is an automated collection — Shopify fills it by rules, so products can't be added by hand.");
    }
    const data = await gql<{ collectionAddProducts: { userErrors: UserErrors } }>(
      `mutation($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) { collection { id } userErrors { field message } }
      }`,
      { id: collection.id, productIds: [product.id] },
    );
    assertNoUserErrors(data.collectionAddProducts.userErrors, "Add to collection");
    return { type: "collection_remove_product", collectionId: collection.id, productId: product.id };
  }

  if (params.type === "collection_feature_product") {
    const collection = await findCollection(gql, params.collectionHandle);
    const priorIndex = collection.products.nodes.findIndex((row) => row.id === product.id);
    if (priorIndex < 0) throw new Error("Product is not in that collection on Shopify.");
    if (collection.sortOrder !== "MANUAL") {
      const update = await gql<{ collectionUpdate: { userErrors: UserErrors } }>(
        `mutation($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id } userErrors { field message } } }`,
        { input: { id: collection.id, sortOrder: "MANUAL" } },
      );
      assertNoUserErrors(update.collectionUpdate.userErrors, "Switch collection to manual order");
    }
    await reorder(gql, collection.id, product.id, 0);
    return {
      type: "collection_unfeature_product",
      collectionId: collection.id,
      productId: product.id,
      priorSortOrder: collection.sortOrder,
      priorIndex,
    };
  }

  if (params.type === "product_append_size_guide") {
    const html = `${product.descriptionHtml ?? ""}\n<div class="syndicate-size-guide">${params.sizeGuideHtml}</div>`;
    await updateDescription(gql, product.id, html);
    return { type: "product_restore_description", productId: product.id, descriptionHtml: product.descriptionHtml ?? "" };
  }

  const fresh = params.tags.filter((tag) => !product.tags.includes(tag));
  if (fresh.length === 0) throw new Error("Product already has those tags.");
  const data = await gql<{ tagsAdd: { userErrors: UserErrors } }>(
    `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } userErrors { field message } } }`,
    { id: product.id, tags: fresh },
  );
  assertNoUserErrors(data.tagsAdd.userErrors, "Add tags");
  return { type: "product_remove_tags", productId: product.id, tags: fresh };
}

async function runUndo(gql: Gql, undo: Exclude<Undo, { type: "simulated" }>): Promise<void> {
  if (undo.type === "collection_remove_product") {
    const data = await gql<{ collectionRemoveProducts: { userErrors: UserErrors } }>(
      `mutation($id: ID!, $productIds: [ID!]!) {
        collectionRemoveProducts(id: $id, productIds: $productIds) { job { id } userErrors { field message } }
      }`,
      { id: undo.collectionId, productIds: [undo.productId] },
    );
    assertNoUserErrors(data.collectionRemoveProducts.userErrors, "Remove from collection");
    return;
  }
  if (undo.type === "collection_unfeature_product") {
    if (undo.priorSortOrder === "MANUAL") {
      await reorder(gql, undo.collectionId, undo.productId, undo.priorIndex);
    } else {
      const update = await gql<{ collectionUpdate: { userErrors: UserErrors } }>(
        `mutation($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id } userErrors { field message } } }`,
        { input: { id: undo.collectionId, sortOrder: undo.priorSortOrder } },
      );
      assertNoUserErrors(update.collectionUpdate.userErrors, "Restore collection order");
    }
    return;
  }
  if (undo.type === "product_restore_description") {
    await updateDescription(gql, undo.productId, undo.descriptionHtml);
    return;
  }
  const data = await gql<{ tagsRemove: { userErrors: UserErrors } }>(
    `mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { node { id } userErrors { field message } } }`,
    { id: undo.productId, tags: undo.tags },
  );
  assertNoUserErrors(data.tagsRemove.userErrors, "Remove tags");
}

async function reorder(gql: Gql, collectionId: string, productId: string, position: number) {
  const data = await gql<{ collectionReorderProducts: { userErrors: UserErrors } }>(
    `mutation($id: ID!, $moves: [MoveInput!]!) {
      collectionReorderProducts(id: $id, moves: $moves) { job { id } userErrors { field message } }
    }`,
    { id: collectionId, moves: [{ id: productId, newPosition: String(position) }] },
  );
  assertNoUserErrors(data.collectionReorderProducts.userErrors, "Reorder collection");
}

async function updateDescription(gql: Gql, productId: string, descriptionHtml: string) {
  const data = await gql<{ productUpdate: { userErrors: UserErrors } }>(
    `mutation($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id } userErrors { field message } } }`,
    { product: { id: productId, descriptionHtml } },
  );
  assertNoUserErrors(data.productUpdate.userErrors, "Update description");
}

/** Keeps the local catalogue in step so re-drafts and the graph see the change before the next ingest. */
async function syncLocal(shopId: string, params: ActionParams, direction: "apply" | "undo") {
  const product = await prisma.productRow.findFirst({ where: { shopId, handle: params.productHandle } });
  if (!product) return;
  if (params.type === "collection_add_product") {
    const collection = await prisma.collectionRow.findFirst({ where: { shopId, handle: params.collectionHandle } });
    if (!collection) return;
    const key = { productId_collectionId: { productId: product.id, collectionId: collection.id } };
    if (direction === "apply") {
      await prisma.productCollection.upsert({
        where: key,
        create: { productId: product.id, collectionId: collection.id },
        update: {},
      });
    } else {
      await prisma.productCollection.deleteMany({ where: { productId: product.id, collectionId: collection.id } });
    }
  }
  if (params.type === "product_add_tags") {
    const tags = new Set(
      (product.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
    for (const tag of params.tags) {
      if (direction === "apply") tags.add(tag);
      else tags.delete(tag);
    }
    await prisma.productRow.update({ where: { id: product.id }, data: { tags: [...tags].join(",") } });
  }
}
