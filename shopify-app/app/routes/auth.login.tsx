import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

export const meta: MetaFunction = () => [{ title: "Log in · Syndicate" }];

async function runLogin(request: Request) {
  if (process.env.DEMO_FIXTURE_SHOP === "1") {
    return { shop: null as string | null, demo: true };
  }
  if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
    return { shop: "missing_credentials" as const, demo: false };
  }
  const { login } = await import("../shopify.live.server");
  // Throws redirect to Shopify install/OAuth when shop is present.
  return login(request);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = await runLogin(request);
  return errors;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = await runLogin(request);
  return errors;
};

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData ?? loaderData) as { shop?: string | null; demo?: boolean };

  if (errors?.demo) {
    return (
      <div className="landing-page">
      <main className="landing">
        <h1>Fixture mode</h1>
        <p className="muted">DEMO_FIXTURE_SHOP is on — open the shell without OAuth.</p>
        <p>
          <a className="button" href="/app">
            Open fixture shell
          </a>
        </p>
      </main>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <main className="landing">
      <h1>Log in</h1>
      <p className="muted">Enter the myshopify domain to install Syndicate on that shop.</p>
      {errors?.shop === "missing_credentials" ? (
        <p className="callout callout-warn" role="alert">
          Partner API key/secret are missing from the environment.
        </p>
      ) : null}
      {errors?.shop && errors.shop !== "missing_credentials" ? (
        <p className="callout callout-warn" role="alert">
          Check the shop domain (e.g. harbour-run-demo.myshopify.com).
        </p>
      ) : null}
      <Form method="post" className="form">
        <label>
          <span className="muted">Shop domain</span>
          <input name="shop" className="input" placeholder="harbour-run-demo.myshopify.com" defaultValue="" />
        </label>
        <button className="button" type="submit">
          Continue
        </button>
      </Form>
    </main>
      </div>
  );
}
