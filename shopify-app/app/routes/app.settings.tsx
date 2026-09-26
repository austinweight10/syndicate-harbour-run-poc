import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { MVP_SCOPE_LIST } from "../scopes";
import { Icon } from "../components/Icon";
import { Stub, useShell } from "../components/Stub";
import prisma from "../db.server";
import { loadAgentGate } from "../services/agents/gate";
import { pipelineEnqueue } from "../services/pipeline.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Settings · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const gate = await loadAgentGate(shopId);
  const lastSync = await prisma.syncRun.findFirst({
    where: { shopId },
    orderBy: { startedAt: "desc" },
  });
  return {
    gate,
    savedUrl: shop?.storefrontUrl ?? "",
    envLocked: Boolean(process.env.SHOP_STOREFRONT_URL?.trim()),
    lastSync: lastSync
      ? {
          status: lastSync.status,
          orders: lastSync.ordersUpserted,
          products: lastSync.productsUpserted,
          at: lastSync.finishedAt?.toISOString() ?? lastSync.startedAt.toISOString(),
          error: lastSync.errorMessage,
        }
      : null,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const shopId = await currentShopId(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");

  if (intent === "refresh") {
    await pipelineEnqueue(shopId, "manual_refresh");
    return redirect("/app/settings");
  }

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
  const { gate, savedUrl, envLocked, lastSync } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const refreshing =
    nav.state !== "idle" && nav.formData?.get("intent") === "refresh";
  const saving = nav.state !== "idle" && nav.formData?.get("intent") === "save";
  const syncOk = lastSync?.status === "success";

  return (
    <Stub title="Settings" subtitle="Shop connection, storefront URL, and automatic browsing.">
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-body">
            <div className="shop-id">
              <span className="shop-glyph">
                <Icon name="store" size={20} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2>{data.shop.name}</h2>
                <code className="muted">{data.shop.domain}</code>
              </div>
            </div>
            <dl className="kv">
              <dt>Connection</dt>
              <dd>
                {data.shop.connected ? (
                  <span className="pill pill-success pill-dot">Connected</span>
                ) : (
                  <span className="pill pill-warn">Not connected</span>
                )}
              </dd>
              <dt>Locale</dt>
              <dd>GBP · Europe/London · en-GB</dd>
              <dt>Last sync</dt>
              <dd>
                {lastSync ? (
                  <>
                    <span className={syncOk ? "pill pill-success" : "pill pill-warn"}>{lastSync.status}</span>{" "}
                    {syncOk
                      ? `${lastSync.orders} orders · ${lastSync.products} products`
                      : lastSync.error ?? ""}
                    <br />
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {new Date(lastSync.at).toLocaleString("en-GB")}
                    </span>
                  </>
                ) : (
                  <span className="muted" style={{ fontWeight: 400 }}>No Admin sync yet</span>
                )}
              </dd>
            </dl>
            <div>
              <p className="subhead" style={{ marginTop: 0 }}>Read-only access</p>
              <ul className="scope-list">
                {MVP_SCOPE_LIST.map((scope) => (
                  <li key={scope}>
                    <Icon name="check" size={12} />
                    {scope}
                  </li>
                ))}
              </ul>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="refresh" />
              <button className="button button-dark" type="submit" disabled={refreshing}>
                {refreshing ? <span className="spinner spinner-light" aria-hidden="true" /> : <Icon name="zap" size={15} />}
                {refreshing ? "Refreshing…" : "Refresh store + re-run"}
              </button>
            </Form>
            <p className="field-hint">
              Pulls the last 60 days of orders and products from Shopify Admin, then re-scores occasions and
              shoppers. Data syncs on install, reconnect, or a manual refresh — not on a nightly schedule.
            </p>
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-body">
            <h2>Storefront and shoppers</h2>
            {!gate.storefrontUrl ? (
              <div className="callout callout-warn" role="status" style={{ margin: 0 }}>
                <Icon name="alert" size={18} />
                <span>Add a storefront URL so shoppers can browse your shop.</span>
              </div>
            ) : null}
            <Form method="post" className="stack" style={{ gap: 16 }}>
              <input type="hidden" name="intent" value="save" />
              <div className="field">
                <label htmlFor="storefrontUrl" className="field-label">
                  Storefront URL
                </label>
                <div className="input-wrap">
                  <Icon name="link" size={15} />
                  <input
                    id="storefrontUrl"
                    name="storefrontUrl"
                    className="input"
                    defaultValue={envLocked ? gate.storefrontUrl ?? "" : savedUrl}
                    readOnly={envLocked}
                    placeholder="https://your-shop.myshopify.com"
                    inputMode="url"
                  />
                </div>
                <p className="field-hint">
                  {envLocked
                    ? "This URL is locked by the server environment."
                    : "The public storefront shoppers should open (Dawn theme or a local demo stub)."}
                </p>
              </div>
              <label className="switch-row">
                <span className="switch">
                  <input type="checkbox" name="paused" defaultChecked={gate.paused} />
                  <span className="switch-track" />
                </span>
                <span>
                  <strong>Pause automatic browsing</strong>
                  <span>
                    While paused, Watch shoppers browse stays off — you can still use Run demo shopper now on{" "}
                    <Link to="/app/runs">Shopper runs</Link>.
                  </span>
                </span>
              </label>
              <div className="callout callout-safe" style={{ margin: 0 }}>
                <Icon name="shield" size={18} />
                <span>Shoppers always stop before payment. Nothing is ever charged.</span>
              </div>
              <div className="form-actions">
                <button className="button" type="submit" disabled={saving}>
                  {saving ? <span className="spinner spinner-light" aria-hidden="true" /> : <Icon name="check" size={15} />}
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </Form>
          </div>
        </section>
      </div>
    </Stub>
  );
}
