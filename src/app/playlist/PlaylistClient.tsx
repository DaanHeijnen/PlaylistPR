"use client";
import { useEffect, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client-api";
import type { SpotifyTrack } from "@/lib/types";

type PlaylistTracksResponse = {
  tracks: SpotifyTrack[];
  playlistConfigured?: boolean;
  needsSetup?: boolean;
  message?: string;
};

export function PlaylistClient() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(query = q) {
    setLoading(true);
    setError("");
    try {
      const data = await api<PlaylistTracksResponse>(`/api/playlist/tracks?q=${encodeURIComponent(query)}`);
      setTracks(data.tracks || []);
      setNeedsSetup(Boolean(data.needsSetup));
      if (data.message) setMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(""); }, []);
  useEffect(() => {
    if (needsSetup) return;
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function requestRemoval() {
    if (!selected) return;
    setError("");
    try {
      await api("/api/requests", { method: "POST", body: JSON.stringify({ type: "remove", track: selected, reason }) });
      setMessage("Removal request submitted.");
      setSelected(null);
      setReason("");
    } catch (err: any) { setError(err.message); }
  }

  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">Managed playlist</p><h1>Playlist</h1></div></div>
    {!needsSetup ? <SearchInput placeholder="Search playlist..." value={q} onChange={(e) => setQ(e.target.value)} /> : null}
    {message ? <div className="success">{message}</div> : null}
    {error ? <div className="error">{error}</div> : null}
    {loading ? <p>Loading playlist...</p> : needsSetup ? <EmptyState title="No playlist selected" description="Go to Settings and choose the Spotify playlist you want to manage first." icon="settings" actionLabel="Open settings" onAction={() => { window.location.href = "/settings"; }} /> : tracks.length === 0 ? <EmptyState title="No tracks found" description="This playlist is empty or your search did not match any songs." icon="music_note" /> : <section className="stack">
      {tracks.map((track, index) => <article key={`${track.id}-${index}`} className="card track-row">
        <span className="muted" style={{ width: 22 }}>{index + 1}</span>
        {track.artworkUrl ? <img src={track.artworkUrl} className="art" alt="" /> : <div className="art" />}
        <div className="track-main"><h2 className="truncate">{track.name}</h2><p className="truncate">{track.artistName}</p></div>
        <Button variant="destructive" onClick={() => setSelected(track)}>Remove</Button>
      </article>)}
    </section>}
    {selected ? <Modal onClose={() => setSelected(null)}>
      <h2>Request removal</h2>
      <p>{selected.name} by {selected.artistName}</p>
      <textarea className="textarea" placeholder="Optional reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="actions"><Button variant="destructive" onClick={requestRemoval}>Submit removal request</Button><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button></div>
    </Modal> : null}
  </div>;
}
