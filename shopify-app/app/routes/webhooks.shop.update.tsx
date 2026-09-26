import type { ActionFunctionArgs } from "react-router";

/** Optional stub. Ignores shop fields Syndicate does not store. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (process.env.DEMO_FIXTURE_SHOP === "1" || !process.env.SHOPIFY_API_SECRET) {
    return new Response("Live HMAC verification needs Partner credentials.", { status: 401 });
  }
  const { authenticate } = await import("../shopify.live.server");
  await authenticate.webhook(request);
  return new Response();
};
