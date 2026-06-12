"use client";
import Link from "next/link";
import { useState } from "react";
import type { PlaylistRequest } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ApprovalProgress } from "./ApprovalProgress";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client-api";

export function RequestCard({ request, role, onChanged }: { request: PlaylistRequest; role?: string; onChanged?: () => void }) {
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canAct = role === "owner" && ["pending", "partially_approved"].includes(request.status) && !request.current_user_decision;

  async function approve() {
    setLoading(true); setError("");
    try { await api(`/api/requests/${request.id}/approve`, { method: "POST" }); setConfirmApprove(false); onChanged?.(); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }
  async function deny() {
    setLoading(true); setError("");
    try { await api(`/api/requests/${request.id}/deny`, { method: "POST", body: JSON.stringify({ reason }) }); setDenyOpen(false); onChanged?.(); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <article className="card request-card">
    {request.album_artwork_url ? <img className="art" src={request.album_artwork_url} alt="" /> : <div className="art" />}
    <div className="request-main">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/requests/${request.id}`}><h2 className="truncate">{request.track_name}</h2></Link>
          <p className="truncate">{request.artist_name}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <p><strong style={{ color: "var(--color-text)" }}>{request.type === "add" ? "Add" : "Remove"}</strong> requested by {request.requester_name}</p>
      {request.request_reason ? <p>{request.request_reason}</p> : null}
      {request.spotify_error ? <div className="error">{request.spotify_error}</div> : null}
      {request.denial_reason ? <p className="error">Denied by {request.denied_by_name}: {request.denial_reason}</p> : null}
      <ApprovalProgress approvedCount={request.approved_count || 0} requiredCount={request.required_count || 0} />
      {request.current_user_decision === "approved" ? <p className="success">You approved this request.</p> : null}
      {canAct ? <div className="actions">
        <Button onClick={() => setConfirmApprove(true)} disabled={loading}>Approve</Button>
        <Button variant="destructive" onClick={() => setDenyOpen(true)} disabled={loading}>Deny</Button>
      </div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
    {confirmApprove ? <Modal onClose={() => setConfirmApprove(false)}>
      <h2>Approve this request?</h2>
      <p>The Spotify playlist will only change after all required owners approve.</p>
      <div className="actions"><Button onClick={approve} disabled={loading}>Confirm approve</Button><Button variant="secondary" onClick={() => setConfirmApprove(false)}>Cancel</Button></div>
    </Modal> : null}
    {denyOpen ? <Modal onClose={() => setDenyOpen(false)}>
      <h2>Deny request</h2>
      <p>A denial reason is required and closes the request immediately.</p>
      <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this request denied?" />
      <div className="actions"><Button variant="destructive" onClick={deny} disabled={loading}>Deny request</Button><Button variant="secondary" onClick={() => setDenyOpen(false)}>Cancel</Button></div>
    </Modal> : null}
  </article>;
}
