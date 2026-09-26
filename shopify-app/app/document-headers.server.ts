export async function addDocumentResponseHeaders(request: Request, headers: Headers) {
  if (process.env.DEMO_FIXTURE_SHOP === "1") return;
  if (!process.env.SHOPIFY_API_KEY) return;
  const live = await import("./shopify.live.server");
  live.addDocumentResponseHeaders(request, headers);
}
