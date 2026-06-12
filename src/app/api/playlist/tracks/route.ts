import { NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";
import { spotifyFetch, mapTrack } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    if (!workspace.spotify_playlist_id) return json({ tracks: [] });
    const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
    const res = await spotifyFetch(user.id, `/playlists/${workspace.spotify_playlist_id}/tracks?limit=100`);
    const body = await res.json();
    if (!res.ok) return json({ error: body.error?.message || "Could not load playlist." }, res.status);
    let tracks = (body.items || []).filter((i: any) => i.track?.id).map(mapTrack);
    if (q) tracks = tracks.filter((t: any) => `${t.name} ${t.artistName} ${t.albumName}`.toLowerCase().includes(q));
    return json({ tracks, snapshotId: body.snapshot_id || null });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
