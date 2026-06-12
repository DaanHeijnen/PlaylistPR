"use client";
import { useEffect, useState } from "react";
import type { PlaylistRequest } from "@/lib/types";
import { api } from "@/lib/client-api";
import { RequestCard } from "@/components/requests/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";

export function RequestsClient({ role }: { role?: string }) {
  const [requests, setRequests] = useState<PlaylistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const data = await api<{ requests: PlaylistRequest[] }>("/api/requests"); setRequests(data.requests); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  return <div className="page">
    <div><p className="eyebrow">Approval queue</p><h1>Requests</h1></div>
    {error ? <div className="error">{error}</div> : null}
    {loading ? <p>Loading requests...</p> : requests.length === 0 ? <EmptyState title="No open requests" description="Pending and partially approved requests will appear here." icon="queue_music" /> : <section className="stack">
      {requests.map((request) => <RequestCard key={request.id} request={request} role={role} onChanged={load} />)}
    </section>}
  </div>;
}
