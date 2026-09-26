/**
 * Minimal Admin GraphQL seam. The live pipeline takes one of these so tests can
 * pass a fake shop and the worker can pass the real offline-session client.
 */
export type AdminGraphql = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

export class AdminQueryError extends Error {
  constructor(
    message: string,
    readonly detail: unknown,
  ) {
    super(message);
    this.name = "AdminQueryError";
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const body = (error as Error & { body?: unknown }).body;
    return body ? `${error.message} ${JSON.stringify(body)}` : error.message;
  }
  return String(error);
}

function isThrottled(text: string): boolean {
  return /throttled/i.test(text);
}

/**
 * Admin client for a shop's stored offline session. The Shopify library
 * refreshes expiring offline tokens before handing the session back.
 */
export async function liveAdminClient(shop: string): Promise<AdminGraphql> {
  const { unauthenticated } = await import("../../shopify.live.server");
  const { admin } = await unauthenticated.admin(shop);

  return async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await admin.graphql(query, variables ? { variables } : undefined);
        const json = (await response.json()) as { data?: T; errors?: unknown };
        if (json.errors) {
          const text = JSON.stringify(json.errors);
          if (isThrottled(text)) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
            continue;
          }
          throw new AdminQueryError(`Admin GraphQL error: ${text}`, json.errors);
        }
        return json.data as T;
      } catch (error) {
        if (error instanceof AdminQueryError) throw error;
        const text = describe(error);
        if (isThrottled(text)) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        throw new AdminQueryError(`Admin GraphQL request failed: ${text}`, error);
      }
    }
    throw new AdminQueryError("Admin GraphQL still throttled after retries.", null);
  };
}
