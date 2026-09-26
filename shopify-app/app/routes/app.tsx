import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { loadShell } from "../services/shop-context.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shell = await loadShell(request);
  return {
    ...shell,
    apiKey: process.env.DEMO_FIXTURE_SHOP === "1" ? "" : process.env.SHOPIFY_API_KEY || "",
  };
};

export default function AppLayout() {
  const data = useLoaderData<typeof loader>();
  if (!data.apiKey) {
    return <Outlet context={data} />;
  }

  return (
    <AppProvider embedded apiKey={data.apiKey}>
      <s-app-nav>
        <s-link href="/app">Overview</s-link>
        <s-link href="/app/events">Events</s-link>
        <s-link href="/app/personas">Personas</s-link>
        <s-link href="/app/artifacts">Insights</s-link>
        <s-link href="/app/graph">Graph</s-link>
        <s-link href="/app/runs">Agent runs</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet context={data} />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
