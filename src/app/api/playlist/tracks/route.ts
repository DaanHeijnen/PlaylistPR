import { NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";
import { spotifyFetch, mapTrack } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);

    if (!workspace.spotify_playlist_id) {
      return json({
        tracks: [],
        playlistConfigured: false,
        needsSetup: true,
        message: "No managed playlist has been selected yet. Go to Settings and choose a Spotify playlist first."
      });
    }

    const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
    const res = await spotifyFetch(user.id, `/playlists/${workspace.spotify_playlist_id}/tracks?limit=100`);
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403) {
        return json(
          {
            error:
              "Spotify rejected access to this playlist. Go to Settings and choose a playlist that your Spotify account can read and edit."
          },
          403
        );
      }
      return json({ error: body.error?.message || "Could not load playlist." }, res.status);
    }

    let tracks = (body.items || []).filter((i: any) => i.track?.id).map(mapTrack);
    if (q) tracks = tracks.filter((t: any) => `${t.name} ${t.artistName} ${t.albumName}`.toLowerCase().includes(q));
    return json({ tracks, playlistConfigured: true, needsSetup: false, snapshotId: body.snapshot_id || null });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
