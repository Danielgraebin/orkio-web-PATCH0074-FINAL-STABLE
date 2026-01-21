export function apiBase() {
  const raw = (window.__ORKIO_ENV__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  const base = raw.replace(/\/$/, "");
  // Accept both styles:
  // - https://host (recommended)
  // - https://host/api (legacy)
  return base.endsWith("/api") ? base.slice(0, -4) : base;
}

export function joinApi(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase()}${p}`;
}

export function headers({ token, org, extra = {} }) {
  const h = { "X-Org-Slug": org || "public", ...extra };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function apiFetch(path, { method = "GET", token, org, body, headers: extraHeaders } = {}) {
  const res = await fetch(joinApi(path), {
    method,
    headers: { "Content-Type": "application/json", ...headers({ token, org, extra: extraHeaders }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
