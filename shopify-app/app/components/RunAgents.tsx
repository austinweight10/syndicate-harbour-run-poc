import { Form, Link, useNavigation, useSearchParams } from "react-router";
import type { AgentGate } from "../services/agents/gate";
import { Icon } from "./Icon";

export function AgentNotices({ gate }: { gate: AgentGate }) {
  if (!gate.storefrontUrl) {
    return (
      <div className="callout callout-warn" role="status">
        <Icon name="alert" size={18} />
        <span>
          <strong>Add a storefront URL</strong> so shoppers can browse your shop.
        </span>
        <Link to="/app/settings" className="callout-action">
          Open Settings <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    );
  }
  return null;
}

export function StopBeforePay() {
  return (
    <div className="callout callout-safe" role="status">
      <Icon name="shield" size={18} />
      <span>
        <strong>Shoppers stop before payment.</strong> Checkout may open — nothing is ever charged.
      </span>
    </div>
  );
}

function blockReason(gate: AgentGate, selectedCount: number): string | null {
  if (!gate.storefrontUrl) return "Add a storefront URL in Settings first.";
  if (selectedCount === 0) return "No ready shoppers yet — finish scoring first.";
  if (gate.inflight > 0) return "A shopper is already browsing.";
  return null;
}

export function RunAgentsControls({
  gate,
  personaIds,
  label = "Watch shoppers browse",
}: {
  gate: AgentGate;
  personaIds?: string[];
  label?: string;
}) {
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle" && navigation.formAction === "/app/runs";
  const selected = personaIds ?? gate.ready.map((persona) => persona.id);
  const noReady = selected.length === 0;
  const blocked = !gate.storefrontUrl || noReady || gate.inflight > 0;
  const reason = blockReason(gate, selected.length);
  return (
    <div className="run-actions-wrap">
      <div className="run-actions">
        {gate.paused ? (
          <Form method="post" action="/app/runs">
            {selected.map((id) => (
              <input key={`force-${id}`} type="hidden" name="personaIds" value={id} />
            ))}
            <input type="hidden" name="forceHeadedDemo" value="true" />
            <button className="button button-hero" type="submit" data-run-agents disabled={blocked || submitting}>
              {submitting ? <span className="spinner spinner-light" aria-hidden="true" /> : <Icon name="play" size={15} />}
              {submitting ? "Starting…" : "Run demo shopper now"}
            </button>
          </Form>
        ) : (
          <Form method="post" action="/app/runs">
            {selected.map((id) => (
              <input key={id} type="hidden" name="personaIds" value={id} />
            ))}
            <button className="button button-hero" type="submit" data-run-agents disabled={blocked || submitting}>
              {submitting ? <span className="spinner spinner-light" aria-hidden="true" /> : <Icon name="play" size={15} />}
              {submitting ? "Starting…" : label}
            </button>
          </Form>
        )}
      </div>
      {reason ? (
        <p className="run-block-reason">
          {gate.inflight > 0 ? (
            <Link to="/app/runs">
              <span className="live-dot" aria-hidden="true" /> {reason} Watch it live
            </Link>
          ) : (
            reason
          )}
        </p>
      ) : gate.paused ? (
        <p className="run-block-reason">
          <Icon name="pause" size={12} /> Auto-browse paused · <Link to="/app/settings">Resume</Link>
        </p>
      ) : !gate.headed ? (
        <p className="run-block-reason">Runs in a background browser</p>
      ) : null}
    </div>
  );
}

export function RunToast() {
  const [params] = useSearchParams();
  const toast = params.get("toast");
  const persona = params.get("persona") ?? "your shopper";
  const banner = params.get("banner");
  if (toast === "t01") {
    return (
      <div className="toast" role="status">
        <span className="toast-icon">
          <Icon name="check" size={14} />
        </span>
        <span>
          <strong>Shopper queued</strong> — browsing your storefront as {persona}.
        </span>
      </div>
    );
  }
  if (toast === "t02") {
    return (
      <div className="toast" role="status">
        <span className="toast-icon">
          <Icon name="info" size={14} />
        </span>
        <span>A shopper is already running — progress updates below.</span>
      </div>
    );
  }
  if (toast === "t12") {
    return (
      <div className="callout callout-warn" role="status">
        <Icon name="alert" size={18} />
        <span>No ready shoppers yet — finish scoring or open Shoppers.</span>
        <Link to="/app/personas" className="callout-action">
          Shoppers <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    );
  }
  if (banner === "b06") {
    return (
      <div className="callout callout-warn" role="status">
        <Icon name="alert" size={18} />
        <span>Add a storefront URL so shoppers can browse your shop.</span>
        <Link to="/app/settings" className="callout-action">
          Open Settings <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    );
  }
  if (banner === "b04") {
    return (
      <div className="callout callout-info" role="status">
        <Icon name="pause" size={18} />
        <span>Automatic browsing is paused. Use Run demo shopper now, or resume in Settings.</span>
      </div>
    );
  }
  return null;
}
