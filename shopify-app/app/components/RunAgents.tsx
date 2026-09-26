import { Form, Link, useSearchParams } from "react-router";
import type { AgentGate } from "../services/agents/gate";

export function AgentNotices({ gate }: { gate: AgentGate }) {
  return (
    <>
      {!gate.storefrontUrl ? (
        <div className="banner banner-warning" role="status">
          Storefront URL missing — agents cannot browse your shop. <Link to="/app/settings">Open Settings</Link>
        </div>
      ) : null}
      {gate.paused ? (
        <div className="banner" role="status">
          Auto agents are paused. Manual Run agents stays off until you resume, or use Force headed demo
          run. New auto-queues will not start.
        </div>
      ) : null}
      {gate.storefrontUrl && !gate.headed ? (
        <p className="muted">
          No desktop display on this machine, so Chromium runs headless. Set AGENTS_HEADED=1 where a
          display is available to watch the window.
        </p>
      ) : null}
    </>
  );
}

export function StopBeforePay() {
  return (
    <div className="banner" role="status">
      Agents stop before payment — checkout may start; no charge is taken.
    </div>
  );
}

export function RunAgentsControls({
  gate,
  personaIds,
  label = "Run agents",
}: {
  gate: AgentGate;
  personaIds?: string[];
  label?: string;
}) {
  const selected = personaIds ?? gate.ready.map((persona) => persona.id);
  const noReady = selected.length === 0;
  const blocked = !gate.storefrontUrl || noReady || gate.inflight > 0;
  return (
    <div className="run-actions">
      <Form method="post" action="/app/runs">
        {selected.map((id) => (
          <input key={id} type="hidden" name="personaIds" value={id} />
        ))}
        <button className="button" type="submit" data-run-agents disabled={blocked || gate.paused}>
          {label}
        </button>
      </Form>
      {gate.paused ? (
        <Form method="post" action="/app/runs">
          {selected.map((id) => (
            <input key={`force-${id}`} type="hidden" name="personaIds" value={id} />
          ))}
          <input type="hidden" name="forceHeadedDemo" value="true" />
          <button className="button" type="submit" disabled={blocked}>
            Force headed demo run
          </button>
        </Form>
      ) : null}
    </div>
  );
}

export function RunToast() {
  const [params] = useSearchParams();
  const toast = params.get("toast");
  const persona = params.get("persona") ?? "your persona";
  const banner = params.get("banner");
  if (toast === "t01") {
    return (
      <div className="banner" role="status">
        Agents queued — watching your storefront as {persona}.
      </div>
    );
  }
  if (toast === "t02") {
    return (
      <div className="banner" role="status">
        Agents already running — open Agent runs to watch progress.
      </div>
    );
  }
  if (toast === "t12") {
    return (
      <div className="banner banner-warning" role="status">
        No Ready personas yet — finish scoring or unpause drafts.
      </div>
    );
  }
  if (banner === "b06") {
    return (
      <div className="banner banner-warning" role="status">
        Storefront URL missing — agents cannot browse your shop. <Link to="/app/settings">Open Settings</Link>
      </div>
    );
  }
  if (banner === "b04") {
    return (
      <div className="banner" role="status">
        Auto agents are paused. Resume them in Settings, or use Force headed demo run.
      </div>
    );
  }
  return null;
}
