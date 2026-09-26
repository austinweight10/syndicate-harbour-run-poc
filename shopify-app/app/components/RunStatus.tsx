import { Icon } from "./Icon";

export function runStatusLabel(status: string): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Browsing";
  if (status === "succeeded" || status === "completed") return "Finished";
  if (status === "failed") return "Failed";
  return status.replaceAll("_", " ");
}

function tone(status: string): "queued" | "running" | "done" | "failed" | "other" {
  if (status === "queued") return "queued";
  if (status === "running") return "running";
  if (status === "succeeded" || status === "completed") return "done";
  if (status === "failed") return "failed";
  return "other";
}

export function isLive(status: string): boolean {
  return status === "queued" || status === "running";
}

export function StatusOrb({ status }: { status: string }) {
  const t = tone(status);
  return (
    <span className={`status-orb is-${t}`} aria-hidden="true">
      {t === "running" ? <span className="spinner" /> : null}
      {t === "queued" ? <Icon name="clock" size={18} /> : null}
      {t === "done" ? <Icon name="check" size={19} /> : null}
      {t === "failed" ? <Icon name="x" size={18} /> : null}
      {t === "other" ? <Icon name="play" size={16} /> : null}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t = tone(status);
  const cls =
    t === "done" ? "pill pill-success" : t === "failed" ? "pill pill-danger" : t === "running" ? "pill pill-success pill-dot" : "pill pill-navy";
  return <span className={cls}>{runStatusLabel(status)}</span>;
}

export function RunProgress({ status, value }: { status: string; value: number | null }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const cls = ["progress-bar"];
  if (isLive(status)) cls.push("is-live");
  if (status === "failed") cls.push("is-failed");
  return (
    <div className={cls.join(" ")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(pct, isLive(status) ? 6 : 0)}%` }} />
    </div>
  );
}
