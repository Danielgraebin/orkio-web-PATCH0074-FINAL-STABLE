import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../ui/api.js";
import { getTenant, getToken, getUser, isAdmin } from "../lib/auth.js";

function Badge({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
      {children}
    </span>
  );
}

export default function AdminConsole() {
  const nav = useNavigate();
  const token = getToken();
  const tenant = getTenant();
  const user = getUser();

  const userIsAdmin = useMemo(() => isAdmin(user), [user]);

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) nav("/auth");
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (!userIsAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenant, userIsAdmin]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: ov } = await apiFetch("/api/admin/overview", { token, org: tenant });
      setOverview(ov);
      const { data: au } = await apiFetch("/api/admin/audit?limit=30", { token, org: tenant });
      setAudit(Array.isArray(au) ? au : []);
    } catch (e) {
      setError(e?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_10%,rgba(124,92,255,0.22),transparent_60%),radial-gradient(900px_600px_at_85%_15%,rgba(53,208,255,0.10),transparent_60%),linear-gradient(180deg,#070910,#070910)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070910]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img
                src="/orkio-logo.png"
                alt="Orkio"
                className="h-9 w-9 rounded-xl shadow-[0_10px_35px_rgba(124,92,255,0.25)]"
              />
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold tracking-wide">Admin</span>
                  <Badge>org: {tenant || "public"}</Badge>
                  {loading ? <Badge>loading</Badge> : <Badge>ready</Badge>}
                </div>
                <div className="text-xs text-white/60">{user?.email || "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => nav("/app")}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Back to Console
              </button>
              <button
                onClick={load}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-black hover:brightness-110"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {!userIsAdmin ? (
          <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
            <div className="text-sm font-extrabold">Access denied</div>
            <div className="mt-2 text-sm text-white/75 leading-7">
              Your account is not an admin for this tenant. If you just promoted the user, log out and log in again to
              refresh the token/claims.
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">System overview</h1>
                <p className="mt-2 text-sm text-white/70">
                  Operational metrics for the last window (lightweight by design). Audit is the source of truth.
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-6">
                <div className="text-sm font-extrabold">Error</div>
                <div className="mt-2 text-sm text-white/75 leading-7 break-words">{error}</div>
                <div className="mt-3 text-xs text-white/60">
                  Tip: verify backend PATCH0071 (admin JWT fix), and that your user role is admin.
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {overview
                ? Object.entries(overview).map(([k, v]) => (
                    <div key={k} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="text-xs text-white/60">{k}</div>
                      <div className="mt-2 text-2xl font-extrabold">{String(v)}</div>
                    </div>
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-5 animate-pulse">
                      <div className="h-3 w-24 rounded bg-white/10" />
                      <div className="mt-3 h-7 w-16 rounded bg-white/10" />
                    </div>
                  ))}
            </div>

            <div className="mt-10 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight">Audit (last 30)</h2>
                <p className="mt-1 text-sm text-white/70">Every request that matters should leave a trace here.</p>
              </div>
              <Badge>{audit?.length || 0} rows</Badge>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-black/20">
                    <tr className="text-xs text-white/70">
                      <th className="px-4 py-3 font-semibold">when</th>
                      <th className="px-4 py-3 font-semibold">org</th>
                      <th className="px-4 py-3 font-semibold">action</th>
                      <th className="px-4 py-3 font-semibold">path</th>
                      <th className="px-4 py-3 font-semibold">status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {audit?.map((r) => (
                      <tr key={r.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white/80">
                          {new Date((r.created_at || 0) * 1000).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-white/70">{r.org_slug}</td>
                        <td className="px-4 py-3 text-white/80">{r.action}</td>
                        <td className="px-4 py-3 text-white/70 break-all">{r.path}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-xs font-semibold " +
                              ((r.status_code || 0) >= 400
                                ? "bg-red-500/15 text-red-200 border border-red-400/20"
                                : "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20")
                            }
                          >
                            {r.status_code}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!audit?.length && !loading ? (
                      <tr>
                        <td className="px-4 py-6 text-white/60" colSpan={5}>
                          No audit entries yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 text-xs text-white/55">
              Note: Admin endpoints accept JWT admin (role=admin). X-Admin-Key is reserved for machine-to-machine calls.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
