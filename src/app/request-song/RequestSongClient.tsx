"use client";
import { useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client-api";
import type { SpotifyTrack } from "@/lib/types";

export function RequestSongClient() {
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    try { const data = await api<{ tracks: SpotifyTrack[] }>(`/api/spotify/search?q=${encodeURIComponent(q)}`); setTracks(data.tracks); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }
  async function submit() {
    if (!selected) return;
    setLoading(true); setError("");
    try { await api("/api/requests", { method: "POST", body: JSON.stringify({ type: "add", track: selected, reason }) }); setMessage("Song request submitted."); setSelected(null); setReason(""); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <div className="page">
    <div><p className="eyebrow">Spotify search</p><h1>Request song</h1></div>
    <form onSubmit={search} className="row"><SearchInput placeholder="Song, artist, or Spotify link" value={q} onChange={(e) => setQ(e.target.value)} /><Button disabled={loading}>Search</Button></form>
    {message ? <div className="success">{message}</div> : null}
    {error ? <div className="error">{error}</div> : null}
    {tracks.length === 0 ? <EmptyState title="Search for a song" description="Choose a Spotify track and add an optional reason for the owners." icon="playlist_add" /> : <section className="stack">
      {tracks.map((track) => <article className="card track-row" key={track.id}>
        {track.artworkUrl ? <img src={track.artworkUrl} className="art" alt="" /> : <div className="art" />}
        <div className="track-main"><h2 className="truncate">{track.name}</h2><p className="truncate">{track.artistName}</p></div>
        <Button onClick={() => setSelected(track)}>Request</Button>
      </article>)}
    </section>}
    {selected ? <Modal onClose={() => setSelected(null)}>
      <h2>Request this song?</h2>
      <p>{selected.name} by {selected.artistName}</p>
      <textarea className="textarea" placeholder="Optional reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="actions"><Button onClick={submit} disabled={loading}>Submit request</Button><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button></div>
    </Modal> : null}
  </div>;
}
