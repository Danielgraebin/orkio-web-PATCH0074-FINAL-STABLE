import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, uploadFile, chat } from "../ui/api.js";
import { clearSession, getTenant, getToken, getUser, isAdmin } from "../lib/auth.js";

export default function AppConsole() {
  const nav = useNavigate();
  const token = getToken();
  const user = getUser();
  const [tenant, setTenant] = useState(getTenant());
  const [health, setHealth] = useState("...");
  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!token) nav("/auth");
  }, [token]);

  async function loadHealth() {
    try {
      const res = await fetch((window.__ORKIO_ENV__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "") + "/api/health");
      const j = await res.json();
      setHealth(j?.status === "ok" ? "ok" : "down");
    } catch {
      setHealth("down");
    }
  }

  async function loadThreads() {
    try {
      const { data } = await apiFetch("/api/threads", { token, org: tenant });
      setThreads(data);
      if (!threadId && data?.[0]?.id) setThreadId(data[0].id);
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function loadMessages(tid) {
    if (!tid) return;
    try {
      const { data } = await apiFetch(`/api/messages?thread_id=${encodeURIComponent(tid)}`, { token, org: tenant });
      setMessages(data);
    } catch (e) {
      setStatus(e.message);
    }
  }

  useEffect(() => { loadHealth(); }, []);
  useEffect(() => { loadThreads(); }, [tenant]);
  useEffect(() => { if (threadId) loadMessages(threadId); }, [threadId]);

  async function createThread() {
    try {
      const { data } = await apiFetch("/api/threads", { method: "POST", token, org: tenant, body: { title: "Nova conversa" } });
      setThreads([data, ...threads]);
      setThreadId(data.id);
      setMessages([]);
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    setStatus("Enviando...");
    setText("");
    try {
      const { data } = await chat({ thread_id: threadId || null, message: msg, top_k: 6, token, org: tenant });
      // Reload messages for the thread returned
      setThreadId(data.thread_id);
      await loadMessages(data.thread_id);
      setStatus("");
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function doUpload(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    setUploadStatus("Enviando...");
    try {
      const { data } = await uploadFile(f, { token, org: tenant });
      setUploadStatus(`OK: ${data.filename} (chars=${data.extracted_chars})`);
    } catch (e) {
      setUploadStatus(e.message);
    }
  }

  function logout() {
    clearSession();
    nav("/auth");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "100vh", fontFamily: "system-ui" }}>
      <aside style={{ borderRight: "1px solid #eee", padding: 14, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Orkio</b>
          <span style={{ fontSize: 12, color: "#666" }}>health: {health}</span>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
          {user?.email || "—"} {isAdmin(user) ? <span style={tag}>admin</span> : <span style={tag}>user</span>}
        </div>

        <label style={lbl}>Tenant</label>
        <input style={inp} value={tenant} onChange={(e) => setTenant(e.target.value)} />

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button style={btnPrimary} onClick={createThread}>+ Thread</button>
          <button style={btnSecondary} onClick={logout}>Sair</button>
        </div>

        {isAdmin(user) ? (
          <button style={{ ...btnSecondary, width: "100%", marginTop: 10 }} onClick={() => nav("/admin")}>
            Ir para Admin
          </button>
        ) : null}

        <h4 style={{ marginTop: 18, marginBottom: 8 }}>Conversas</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {threads.map(t => (
            <button key={t.id} onClick={() => setThreadId(t.id)} style={threadBtn(t.id === threadId)}>
              {t.title}
            </button>
          ))}
        </div>

        <h4 style={{ marginTop: 18, marginBottom: 8 }}>Upload</h4>
        <input type="file" onChange={doUpload} />
        {uploadStatus ? <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>{uploadStatus}</div> : null}
      </aside>

      <main style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
          {messages.map(m => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#666" }}>{m.role}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #eee", padding: 12, display: "flex", gap: 8 }}>
          <input style={{ flex: 1, ...inp }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua mensagem..." />
          <button style={btnPrimary} onClick={send}>Enviar</button>
        </div>
        {status ? <div style={{ padding: "0 12px 12px", fontSize: 12, color: "#444" }}>{status}</div> : null}
      </main>
    </div>
  );
}

const lbl = { display: "block", marginTop: 12, marginBottom: 6, color: "#333", fontSize: 12 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" };
const btnPrimary = { background: "#111", color: "#fff", padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer" };
const btnSecondary = { background: "#f3f3f3", color: "#111", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" };
const threadBtn = (active) => ({
  textAlign: "left",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid " + (active ? "#111" : "#ddd"),
  background: active ? "#111" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
});
const tag = { marginLeft: 6, background: "#f0f0f0", padding: "2px 8px", borderRadius: 999, fontSize: 11 };
