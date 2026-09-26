import type { LoaderFunctionArgs } from "react-router";
import { MVP_SCOPES } from "../scopes";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.pathname !== "/health") {
    return new Response("Not found", { status: 404 });
  }
  return Response.json({
    ok: true,
    demo: process.env.DEMO_FIXTURE_SHOP === "1",
    scopes: MVP_SCOPES,
    shop: process.env.DEMO_FIXTURE_SHOP === "1" ? "harbour-run-demo.myshopify.com" : null,
  });
};
