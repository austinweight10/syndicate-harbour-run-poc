import { useMemo, useState } from "react";
import { useFetcher } from "react-router";
import type { PackView } from "../services/content-pack/board.server";
import { sidekickPrompt, sidekickUrl, type OccasionForSidekick } from "../services/content-pack/sidekick";
import { Icon } from "./Icon";
import { useShell } from "./Stub";

type Result = { ok: boolean; message: string; simulated?: boolean };

export function ContentPackPanel({
  pack,
  trending,
  drafting,
  shopDomain,
  occasion,
}: {
  pack: PackView | null;
  trending: boolean;
  drafting?: boolean;
  shopDomain?: string;
  occasion: OccasionForSidekick;
}) {
  const fetcher = useFetcher<Result>();
  const busy = fetcher.state !== "idle";
  const pendingIntent = busy ? String(fetcher.formData?.get("intent") ?? "") : "";

  if (!pack && drafting) {
    return (
      <section className="card pack-card">
        <div className="card-body pack-panel pack-panel-empty">
          <span className="spinner" aria-hidden="true" />
          <span className="muted">Drafting marketing pack…</span>
        </div>
      </section>
    );
  }

  if (!pack) {
    if (!trending) return null;
    return (
      <section className="card pack-card">
        <div className="card-body">
          <p className="eyebrow">
            <Icon name="sparkles" size={13} /> Marketing pack
          </p>
          <h2 className="pack-title">Build blog, banner, email and segments</h2>
          <p className="muted">
            One click drafts a blog post, marketing page, storefront banner, email template and customer
            segments aimed at the shoppers linked to this occasion.
          </p>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generate_pack" />
            <button className="button" type="submit" disabled={busy}>
              {pendingIntent === "generate_pack" ? (
                <span className="spinner spinner-light" aria-hidden="true" />
              ) : (
                <Icon name="zap" size={14} />
              )}
              {pendingIntent === "generate_pack" ? "Drafting…" : "Build marketing pack"}
            </button>
          </fetcher.Form>
        </div>
      </section>
    );
  }

  const applied = pack.status === "applied";
  const failed = pack.status === "failed";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.message : failed ? pack.errorMessage : null;
  const needsWrite = Boolean(error) && /write_content|write_customers|write_products/i.test(error ?? "");
  const { assets } = pack;
  const storeOrigin = shopDomain ? `https://${shopDomain}` : "";
  const pageUrl = pack.pagePath && storeOrigin ? `${storeOrigin}${pack.pagePath}` : pack.pagePath;

  return (
    <section className={`card pack-card${applied ? " pack-card-applied" : ""}`}>
      <div className="card-body">
        <div className="action-head">
          <p className="eyebrow" style={{ margin: 0 }}>
            <Icon name={applied ? "check" : "sparkles"} size={13} />{" "}
            {applied
              ? pack.simulated
                ? "Pack saved in Syndicate"
                : "Marketing pack live on Shopify"
              : "Marketing pack"}
          </p>
          <span className="prov prov-mock" title="Template pack — British English Harbour Run copy">
            Template
          </span>
        </div>
        <h2 className="pack-title">{pack.headline}</h2>
        <p className="action-rationale">{pack.rationale}</p>

        <div className="pack-grid">
          <article className="pack-asset">
            <span className="pack-asset-label">Blog</span>
            <strong>{assets.blog.title}</strong>
            <p className="muted">{assets.blog.summary}</p>
          </article>
          <article className="pack-asset">
            <span className="pack-asset-label">Page</span>
            <strong>{assets.page.title}</strong>
            <p className="muted">/pages/{assets.page.handle}</p>
          </article>
          <article className="pack-asset">
            <span className="pack-asset-label">Banner</span>
            <strong>{assets.banner.headline}</strong>
            <p className="muted">
              {assets.banner.body} · {assets.banner.ctaLabel}
            </p>
          </article>
          <article className="pack-asset">
            <span className="pack-asset-label">Email</span>
            <strong>{assets.email.subject}</strong>
            <p className="muted">
              {assets.email.previewText}
              {assets.email.personaTargets.length
                ? ` · ${assets.email.personaTargets.join(", ")}`
                : ""}
            </p>
          </article>
          <article className="pack-asset pack-asset-wide">
            <span className="pack-asset-label">Segments</span>
            {assets.segments.length === 0 ? (
              <p className="muted">No linked personas to segment yet.</p>
            ) : (
              <ul className="pack-segments">
                {assets.segments.map((segment) => (
                  <li key={segment.personaId}>
                    <strong>{segment.name}</strong>
                    <span className="muted">{segment.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        {applied ? (
          <div className="action-row">
            <span className={`pill ${pack.simulated ? "pill-warn" : "pill-success"}`}>
              {pack.simulated ? "Simulated — not on storefront yet" : "Live on Shopify"}
            </span>
            {pack.simulated ? (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="apply_pack" />
                <input type="hidden" name="packId" value={pack.id} />
                <button className="button" type="submit" disabled={busy} data-apply-pack>
                  {pendingIntent === "apply_pack" ? (
                    <span className="spinner spinner-light" aria-hidden="true" />
                  ) : (
                    <Icon name="zap" size={14} />
                  )}
                  {pendingIntent === "apply_pack" ? "Publishing…" : "Publish to Shopify for real"}
                </button>
              </fetcher.Form>
            ) : pageUrl ? (
              <a className="button button-quiet button-small" href={pageUrl} target="_blank" rel="noreferrer">
                Open storefront page <Icon name="arrowRight" size={13} />
              </a>
            ) : null}
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="undo_pack" />
              <input type="hidden" name="packId" value={pack.id} />
              <button className="button button-quiet button-small" type="submit" disabled={busy}>
                {pendingIntent === "undo_pack" ? (
                  <span className="spinner" aria-hidden="true" />
                ) : (
                  <Icon name="arrowLeft" size={13} />
                )}
                {pendingIntent === "undo_pack" ? "Undoing…" : "Undo"}
              </button>
            </fetcher.Form>
            {pack.simulated ? <SidekickHandoff pack={pack} occasion={occasion} /> : null}
          </div>
        ) : (
          <div className="action-row">
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="apply_pack" />
              <input type="hidden" name="packId" value={pack.id} />
              <button className="button" type="submit" disabled={busy} data-apply-pack>
                {pendingIntent === "apply_pack" ? (
                  <span className="spinner spinner-light" aria-hidden="true" />
                ) : (
                  <Icon name="zap" size={14} />
                )}
                {pendingIntent === "apply_pack"
                  ? "Publishing…"
                  : failed
                    ? "Retry publish"
                    : "Publish to Shopify"}
              </button>
            </fetcher.Form>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="redraft_pack" />
              <button className="button button-quiet button-small" type="submit" disabled={busy}>
                Redraft pack
              </button>
            </fetcher.Form>
            <SidekickHandoff pack={pack} occasion={occasion} />
          </div>
        )}
        {applied && !pack.simulated && pack.pagePath ? (
          <p className="action-note muted">
            Storefront page: <code>{pageUrl ?? pack.pagePath}</code>
            {" · "}
            {pack.resultMessage}
          </p>
        ) : null}
        {applied && pack.simulated && pack.resultMessage ? (
          <p className="action-note muted">
            {pack.resultMessage} Click <strong>Publish to Shopify for real</strong> — Shopify will ask you to approve
            page and segment access, then open <code>/pages/…</code> on the storefront.
          </p>
        ) : null}
        {error ? (
          <p className="action-error" role="alert">
            <Icon name="alert" size={13} />{" "}
            {needsWrite
              ? "Syndicate needs permission to create pages, segments and product metafields. Click Publish again — Shopify will ask you to approve."
              : error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Alternative to Publish: open Sidekick in the Shopify admin with a prompt
 * built from this pack, or copy the prompt. The deep link is not in Shopify's
 * developer docs, so Copy is always offered too.
 */
function SidekickHandoff({ pack, occasion }: { pack: PackView; occasion: OccasionForSidekick }) {
  const shell = useShell();
  const prompt = useMemo(() => sidekickPrompt(pack, occasion), [pack, occasion]);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const live = shell.shop.mode === "live";

  const openSidekick = () => {
    // The app runs in the admin iframe: navigate the top frame, not the iframe.
    window.open(sidekickUrl(shell.shop.domain, prompt), "_top");
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopy("copied");
      window.setTimeout(() => setCopy("idle"), 2500);
    } catch {
      setCopy("failed");
    }
  };

  return (
    <>
      {live ? (
        <button type="button" className="button button-quiet" onClick={openSidekick} data-sidekick-open>
          <Icon name="sparkles" size={14} /> Create with Sidekick
        </button>
      ) : null}
      <button type="button" className="button button-quiet button-small" onClick={copyPrompt} data-sidekick-copy>
        <Icon name={copy === "copied" ? "check" : "layers"} size={13} />
        {copy === "copied" ? "Copied" : "Copy Sidekick prompt"}
      </button>
      <details className="sidekick-prompt" open={copy === "failed" || undefined}>
        <summary>{copy === "failed" ? "Copy blocked — select the prompt below" : "Preview Sidekick prompt"}</summary>
        <pre>{prompt}</pre>
      </details>
    </>
  );
}
