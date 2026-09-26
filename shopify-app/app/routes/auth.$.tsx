import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (process.env.DEMO_FIXTURE_SHOP === "1") {
    throw redirect("/app");
  }
  if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
    throw redirect("/");
  }
  // /auth/login is handled by auth.login.tsx (shopify.login).
  // This splat covers /auth/callback and other auth paths.
  const { authenticate } = await import("../shopify.live.server");
  await authenticate.admin(request);
  return null;
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
