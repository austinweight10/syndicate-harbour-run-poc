import { useFetcher } from "react-router";
import type { ActionView } from "../services/actions/board.server";
import { Icon } from "./Icon";

type Result = { ok: boolean; message: string; simulated?: boolean };

export function StorefrontActionPanel({
  cardId,
  action,
  drafting = false,
}: {
  cardId: string;
  action: ActionView | undefined;
  drafting?: boolean;
}) {
  const fetcher = useFetcher<Result>();
  const busy = fetcher.state !== "idle";
  const pendingIntent = busy ? String(fetcher.formData?.get("intent") ?? "") : "";

  if (!action) {
    return (
      <div className="action-panel action-panel-empty">
        {drafting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span className="muted">Drafting a fix…</span>
          </>
        ) : (
          <span className="muted">Already in place on the storefront — nothing to deploy.</span>
        )}
      </div>
    );
  }

  const applied = action.status === "applied";
  const failed = action.status === "failed";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.message : failed ? action.errorMessage : null;
  const needsWrite =
    Boolean(error) && /write_products/i.test(error ?? "");

  return (
    <div className={`action-panel${applied ? " action-panel-applied" : ""}`}>
      <div className="action-head">
        <span className="eyebrow">
          <Icon name={applied ? "check" : "sparkles"} size={13} /> {applied ? "Shipped" : "Recommended fix"}
        </span>
        <span
          className={`prov ${action.source === "agent" ? "prov-model_hypothesis" : "prov-mock"}`}
          title={
            action.source === "agent"
              ? `Drafted by the agent (${action.model ?? "Claude"}) — review before shipping`
              : "Template fix — no agent key set"
          }
        >
          {action.source === "agent" ? "Agent" : "Template"}
        </span>
      </div>
      <p className="action-headline">{action.headline}</p>
      <p className="action-rationale">{action.rationale}</p>
      <dl className="action-preview">
        <div>
          <dt>Change</dt>
          <dd>{action.verb}</dd>
        </div>
        {action.preview.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {applied ? (
        <div className="action-row">
          <span className={`pill ${action.simulated ? "pill-warn" : "pill-success"}`}>
            {action.simulated ? "Simulated — demo shop" : "Live on storefront"}
          </span>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="undo" />
            <input type="hidden" name="actionId" value={action.id} />
            <button className="button button-quiet button-small" type="submit" disabled={busy}>
              {pendingIntent === "undo" ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowLeft" size={13} />}
              {pendingIntent === "undo" ? "Undoing…" : "Undo"}
            </button>
          </fetcher.Form>
        </div>
      ) : (
        <div className="action-row">
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="apply" />
            <input type="hidden" name="actionId" value={action.id} />
            <button className="button" type="submit" disabled={busy} data-apply-action>
              {pendingIntent === "apply" ? (
                <span className="spinner spinner-light" aria-hidden="true" />
              ) : (
                <Icon name="zap" size={14} />
              )}
              {pendingIntent === "apply" ? "Deploying…" : failed ? "Retry deploy" : "Deploy to storefront"}
            </button>
          </fetcher.Form>
          {action.source === "agent" ? (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="redraft" />
              <input type="hidden" name="cardId" value={cardId} />
              <button className="button button-quiet button-small" type="submit" disabled={busy}>
                Ask the agent again
              </button>
            </fetcher.Form>
          ) : null}
        </div>
      )}
      {applied && action.simulated && action.resultMessage ? (
        <p className="action-note muted">{action.resultMessage}</p>
      ) : null}
      {error ? (
        <p className="action-error" role="alert">
          <Icon name="alert" size={13} />{" "}
          {needsWrite
            ? "Syndicate needs permission to update products. Click Deploy again — Shopify will ask you to approve write access."
            : error}
        </p>
      ) : null}
    </div>
  );
}
