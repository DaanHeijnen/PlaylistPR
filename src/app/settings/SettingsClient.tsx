"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/client-api";

type Playlist = { id: string; name: string; imageUrl: string | null; ownerId: string | null; ownerName: string | null; collaborative: boolean; tracksTotal: number };

type MeData = { user: any; workspace: any; members: any[] };

export function SettingsClient({ initial }: { initial: MeData }) {
  const [me, setMe] = useState(initial);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const isOwner = me.workspace?.role === "owner";
  async function reload() { setMe(await api<MeData>("/api/me")); }
  async function loadPlaylists() { setError(""); try { const data = await api<{ playlists: Playlist[] }>("/api/spotify/playlists"); setPlaylists(data.playlists); } catch (err: any) { setError(err.message); } }
  useEffect(() => { if (isOwner) loadPlaylists(); }, [isOwner]);
  async function savePlaylist() {
    const playlist = playlists.find((p) => p.id === selected);
    if (!playlist) return;
    setError("");
    try { await api("/api/workspace/setup", { method: "POST", body: JSON.stringify({ playlistId: playlist.id, name: playlist.name, imageUrl: playlist.imageUrl, ownerId: playlist.ownerId, workspaceName: "Playlist PR" }) }); await reload(); }
    catch (err: any) { setError(err.message); }
  }
  async function createInvite() { setError(""); try { const data = await api<{ inviteUrl: string }>("/api/workspace/invite", { method: "POST" }); setInvite(data.inviteUrl); } catch (err: any) { setError(err.message); } }
  async function promote(id: string) { await api(`/api/members/${id}/promote`, { method: "POST" }); await reload(); }
  async function remove(id: string) { await api(`/api/members/${id}`, { method: "DELETE" }); await reload(); }

  return <div className="page">
    <div><p className="eyebrow">Workspace</p><h1>Settings</h1></div>
    {error ? <div className="error">{error}</div> : null}
    <Card><div className="row">
      {me.user?.avatar_url ? <img className="avatar" src={me.user.avatar_url} alt="" /> : <span className="avatar" />}
      <div><h2>{me.user?.display_name}</h2><p>Connected with Spotify</p></div>
    </div></Card>
    <Card><div className="stack">
      <h2>Managed playlist</h2>
      <p>{me.workspace?.spotify_playlist_name || "No playlist selected yet."}</p>
      {isOwner ? <><select className="select" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a Spotify playlist</option>{playlists.map((p) => <option key={p.id} value={p.id}>{p.name} {p.collaborative ? "(collaborative)" : ""}</option>)}</select><Button onClick={savePlaylist}>Save playlist</Button></> : null}
    </div></Card>
    <Card><div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}><h2>Members and owners</h2>{isOwner ? <Button variant="secondary" onClick={createInvite}>Invite</Button> : null}</div>
      {invite ? <input className="input" readOnly value={invite} onFocus={(e) => e.currentTarget.select()} /> : null}
      {me.members.map((m) => <div key={m.id} className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">{m.avatar_url ? <img src={m.avatar_url} className="avatar" alt="" /> : <span className="avatar" />}<div><p style={{ color: "var(--color-text)" }}>{m.display_name}</p><p>{m.role}</p></div></div>
        {isOwner && m.role !== "owner" ? <div className="actions"><Button variant="secondary" onClick={() => promote(m.id)}>Make owner</Button><Button variant="destructive" onClick={() => remove(m.id)}>Remove</Button></div> : null}
      </div>)}
    </div></Card>
    <form action="/api/auth/logout" method="post"><Button variant="destructive" full>Log out</Button></form>
  </div>;
}
