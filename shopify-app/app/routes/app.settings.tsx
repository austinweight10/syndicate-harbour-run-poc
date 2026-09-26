import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";
import { MVP_SCOPE_LIST } from "../scopes";
import { Stub, useShell } from "../components/Stub";
import prisma from "../db.server";
import { loadAgentGate } from "../services/agents/gate";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Settings · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const gate = await loadAgentGate(shopId);
  return {
    gate,
    savedUrl: shop?.storefrontUrl ?? "",
    envLocked: Boolean(process.env.SHOP_STOREFRONT_URL?.trim()),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const shopId = await currentShopId(request);
  const form = await request.formData();
  const paused = form.get("paused") === "on";
  if (!process.env.SHOP_STOREFRONT_URL?.trim()) {
    const url = String(form.get("storefrontUrl") ?? "").trim();
    await prisma.shop.update({
      where: { id: shopId },
      data: { storefrontUrl: url || null },
    });
  }
  await prisma.shopSettings.update({
    where: { shopId },
    data: { agentsAutoRun: !paused },
  });
  return redirect("/app/settings");
}

export default function Settings() {
  const data = useShell();
  const { gate, savedUrl, envLocked } = useLoaderData<typeof loader>();
  return (
    <Stub title="Settings" subtitle="Scopes are read-only. Nightly refresh is off.">
      <section className="card">
        <div className="card-body">
          <h2>{data.shop.name}</h2>
          <p className="muted">
            {data.shop.domain} · GBP · Europe/London · en-GB. Sync runs on install, reconnect, or a
            manual refresh. There is no nightly job.
          </p>
          <ul className="scope-list">
            {MVP_SCOPE_LIST.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="card">
        <div className="card-body">
          <h2>Storefront and agents</h2>
          {!gate.storefrontUrl ? (
            <div className="banner banner-warning" role="status">
              Storefront URL missing — agents cannot browse your shop.
            </div>
          ) : null}
          <Form method="post">
            <p>
              <label htmlFor="storefrontUrl">Storefront URL</label>
              <br />
              <input
                id="storefrontUrl"
                name="storefrontUrl"
                defaultValue={envLocked ? gate.storefrontUrl ?? "" : savedUrl}
                readOnly={envLocked}
                placeholder="http://127.0.0.1:44741"
                style={{ width: "min(100%, 420px)", marginTop: 6 }}
              />
            </p>
            {envLocked ? (
              <p className="muted">SHOP_STOREFRONT_URL is set, so this field follows the environment.</p>
            ) : (
              <p className="muted">
                The Harbour Run placeholder domain is not a live shop. Paste a Dawn URL, or the local stub.
              </p>
            )}
            <p>
              <label>
                <input type="checkbox" name="paused" defaultChecked={gate.paused} /> Pause auto agents
              </label>
            </p>
            <p className="muted">
              Pause is on until a headed path is green. While paused, Run agents stays disabled. Use
              Force headed demo run on <Link to="/app/runs">Agent runs</Link>, or clear this box and save.
            </p>
            <button className="button" type="submit">Save</button>
          </Form>
        </div>
      </section>
    </Stub>
  );
}
