import { useEffect } from "react";
import { useRevalidator } from "react-router";

export function RunPoller({ live }: { live: boolean }) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => revalidate(), 2000);
    return () => window.clearInterval(timer);
  }, [live, revalidate]);
  if (!live) return null;
  return (
    <p className="muted" role="status">
      Updating…
    </p>
  );
}
