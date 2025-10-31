export async function publishPR(prNumber: number) {
  const res = await fetch("/.netlify/functions/publish-pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prNumber })
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) throw new Error(out.error || "Publish failed");
  return out as { ok: true; liveUrl?: string };
}


