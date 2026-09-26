function hue(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 5;
}

export function Avatar({
  initials,
  seed,
  draft = false,
  large = false,
}: {
  initials: string;
  seed: string;
  draft?: boolean;
  large?: boolean;
}) {
  const classes = ["avatar", `hue-${hue(seed)}`];
  if (draft) classes.push("is-draft");
  if (large) classes.push("avatar-lg");
  return (
    <span className={classes.join(" ")} aria-hidden="true">
      {initials}
    </span>
  );
}

export function personaStatusLabel(status: string): string {
  if (status === "ready") return "Ready to browse";
  if (status === "stub" || status === "draft") return "Draft";
  return status.replaceAll("_", " ");
}

export function isReady(status: string): boolean {
  return status === "ready";
}
