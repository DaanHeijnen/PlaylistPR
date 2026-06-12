"use client";
import { useEffect, useState } from "react";
import type { PlaylistRequest } from "@/lib/types";
import { api } from "@/lib/client-api";
import { RequestCard } from "@/components/requests/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";

const statuses = ["all", "approved", "denied", "failed"];
const types = ["all", "add", "remove"];

export function HistoryClient({ role }: { role?: string }) {
  const [history, setHistory] = useState<PlaylistRequest[]>([]);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try { const data = await api<{ history: PlaylistRequest[] }>(`/api/history?status=${status}&type=${type}`); setHistory(data.history); }
    catch (err: any) { setError(err.message); }
  }
  useEffect(() => { load(); }, [status, type]);
  return <div className="page">
    <div><p className="eyebrow">Transparent log</p><h1>History</h1></div>
    <div className="filters">{statuses.map((s) => <button key={s} className={`pill ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>{s}</button>)}</div>
    <div className="filters">{types.map((t) => <button key={t} className={`pill ${type === t ? "active" : ""}`} onClick={() => setType(t)}>{t}</button>)}</div>
    {error ? <div className="error">{error}</div> : null}
    {history.length === 0 ? <EmptyState title="No history yet" description="Approved, denied, and failed requests will stay visible here." icon="history" /> : <section className="stack">
      {history.map((request) => <RequestCard key={request.id} request={request} role={role} />)}
    </section>}
  </div>;
}
