import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";

export const meta: MetaFunction = () => [{ title: "Syndicate" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (process.env.DEMO_FIXTURE_SHOP === "1" && !url.searchParams.get("stay")) {
    throw redirect("/app");
  }
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return {
    demo: process.env.DEMO_FIXTURE_SHOP === "1",
    partnerConfigured: Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    error: url.searchParams.get("error"),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const shop = String(form.get("shop") || "").trim();
  if (!shop) {
    throw redirect("/?error=shop");
  }
  throw redirect(`/auth/login?shop=${encodeURIComponent(shop)}`);
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  return (
    <main className="landing">
      <h1 className="landing-logo">
        <img src="/brand/syndicate-lockup-charcoal.svg" alt="Syndicate" width={240} height={58} />
      </h1>
      <p>
        Occasion intelligence for a running shop. Connect Shopify Admin, or open the Harbour Run
        fixture without a Partner store.
      </p>
      {data.error === "shop" ? (
        <p className="banner" role="alert">Enter the myshopify domain to continue.</p>
      ) : null}
      {!data.partnerConfigured ? (
        <p className="muted">
          Partner app secrets are not in this environment. That blocks a live install only. Set
          DEMO_FIXTURE_SHOP=1 to boot harbour-run-demo.myshopify.com.
        </p>
      ) : (
        <Form method="post" className="form">
          <label>
            <span className="muted">Shop domain</span>
            <input name="shop" placeholder="harbour-run-demo.myshopify.com" />
          </label>
          <button className="button" type="submit">Log in</button>
        </Form>
      )}
      <p>
        <a className="button" href="/app">Open fixture shell</a>
      </p>
    </main>
  );
}
