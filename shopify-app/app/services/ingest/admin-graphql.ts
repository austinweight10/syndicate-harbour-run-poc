/**
 * Minimal Admin GraphQL client using the offline Shop.accessToken.
 * API version matches shopify.live.server.ts (October25 → 2025-10).
 */

export const ADMIN_API_VERSION = "2025-10";

export type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export class ShopifyGraphqlError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ShopifyGraphqlError";
    this.status = status;
    this.code = code;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function adminGraphql<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  opts: { retries?: number } = {},
): Promise<T> {
  const url = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const retries = opts.retries ?? 3;
  let attempt = 0;
  let backoffMs = 30_000;

  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("Retry-After") || "0");
      const wait = retryAfter > 0 ? retryAfter * 1000 : backoffMs;
      await sleep(wait);
      attempt += 1;
      backoffMs = Math.min(backoffMs * 4, 600_000);
      continue;
    }

    const json = (await res.json()) as GraphqlResponse<T>;
    if (!res.ok) {
      throw new ShopifyGraphqlError(
        `Admin GraphQL HTTP ${res.status}`,
        res.status,
        res.status === 429 ? "HTTP_429" : `HTTP_${res.status}`,
      );
    }
    if (json.errors?.length) {
      const first = json.errors[0];
      const code = first.extensions?.code ?? "GRAPHQL_ERROR";
      throw new ShopifyGraphqlError(first.message, res.status, code);
    }
    if (!json.data) {
      throw new ShopifyGraphqlError("Admin GraphQL returned empty data", res.status, "EMPTY");
    }
    return json.data;
  }
}
