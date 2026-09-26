import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";
import { BrandPattern, DARK_TONES } from "../components/Brand";
import { Icon } from "../components/Icon";

export const meta: MetaFunction = () => [{ title: "Syndicate" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (process.env.DEMO_FIXTURE_SHOP === "1" && !url.searchParams.get("stay")) {
    throw redirect("/app");
  }
  // Embedded Admin loads the App URL (/) with shop/host/id_token. Send that to
  // /app so authenticate.admin can bounce out of the iframe via App Bridge.
  // Never send those params to /auth/login — a raw 302 to admin.shopify.com
  // inside the iframe shows "admin.shopify.com refused to connect".
  if (url.searchParams.get("shop") || url.searchParams.get("host")) {
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
    <div className="landing-page">
      <div className="hero-pattern">
        <BrandPattern tones={DARK_TONES} scale={0.5} />
      </div>
      <main className="landing">
        <img src="/brand/syndicate-lockup-white.svg" alt="Syndicate" className="landing-lockup" width={220} height={44} />
        <h1>Occasion intelligence for your Shopify store</h1>
        <p>See what's driving demand, then watch your store shop itself.</p>
        <ul className="landing-points">
          <li>
            <Icon name="flag" size={16} /> Race weekends and weather, scored from your orders
          </li>
          <li>
            <Icon name="users" size={16} /> Shopper personas that browse your storefront
          </li>
          <li>
            <Icon name="shield" size={16} /> Evidence labelled · always stops before payment
          </li>
        </ul>
        {data.error === "shop" ? (
          <div className="callout callout-warn" role="alert">
            <Icon name="alert" size={18} />
            <span>Enter your myshopify.com domain to continue.</span>
          </div>
        ) : null}
        {!data.partnerConfigured ? (
          <p className="muted">
            Partner app secrets are not set here, so live install is unavailable. Open the Harbour Run demo to explore.
          </p>
        ) : (
          <Form method="post" className="form">
            <label>
              Shop domain
              <input name="shop" className="input" placeholder="your-shop.myshopify.com" autoComplete="off" />
            </label>
            <button className="button button-hero" type="submit">
              Connect shop <Icon name="arrowRight" size={15} />
            </button>
          </Form>
        )}
        {data.partnerConfigured ? <div className="landing-divider">or</div> : null}
        <a className={data.partnerConfigured ? "button button-glass" : "button button-hero"} href="/app">
          <Icon name="play" size={15} /> Open the Harbour Run demo
        </a>
      </main>
    </div>
  );
}
