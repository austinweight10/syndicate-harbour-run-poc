import { useEffect } from "react";
import { useRevalidator } from "react-router";

export function RunPoller({ live, quiet = false }: { live: boolean; quiet?: boolean }) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => revalidate(), 2000);
    return () => window.clearInterval(timer);
  }, [live, revalidate]);
  if (!live || quiet) return null;
  return (
    <p className="live-status" role="status">
      <span className="live-dot" aria-hidden="true" /> Live — updating every 2 seconds
    </p>
  );
}
