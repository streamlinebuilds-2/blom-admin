import type { Handler } from "@netlify/functions";

const GH = "https://api.github.com";
const OWNER = process.env.GITHUB_REPO_OWNER || "streamlinebuilds-2";
const REPO = process.env.GITHUB_REPO_NAME || "blom-cosmetics-main";
const TOKEN = process.env.GITHUB_TOKEN!;
const LIVE = process.env.SITE_URL || "https://blom-admin-1.netlify.app";

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {})
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }
  try {
    const { prNumber } = JSON.parse(e.body || "{}");
    if (!prNumber) {
      return { statusCode: 400, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify({ error: "Missing prNumber" }) };
    }

    // 1) Get PR
    const pr = await gh(`/repos/${OWNER}/${REPO}/pulls/${prNumber}`);

    // Optional guardrails (uncomment if you want):
    // if (!pr.mergeable) return { statusCode: 409, body: JSON.stringify({ error: "PR not mergeable yet (checks/conflicts)" }) };

    // 2) Merge PR (squash)
    await gh(`/repos/${OWNER}/${REPO}/pulls/${prNumber}/merge`, {
      method: "PUT",
      body: JSON.stringify({
        merge_method: "squash",
        commit_title: `feat: publish ${pr.title}`,
      })
    });

    // 3) Delete branch (best-practice cleanup)
    const ref = pr.head?.ref; // e.g. "add-cuticle-oil-rose"
    if (ref) {
      try {
        await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${encodeURIComponent(ref)}`, { method: "DELETE" });
      } catch {
        // ignore if already deleted
      }
    }

    // 4) Return
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({
        ok: true,
        merged: true,
        prUrl: pr.html_url,
        branch: ref || null,
        liveUrl: LIVE
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: err?.message || "server_error" })
    };
  }
};

export { handler as default };


