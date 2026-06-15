import { NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";
import { spotifyFetch, mapTrack } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SpotifyApiError = {
  status?: number;
  message?: string;
};

async function getWorkspaceOwnerTokenUserId(workspaceId: string, playlistOwnerSpotifyId: string | null, fallbackUserId: string) {
  const rows = await sql<{ id: string }[]>`
    SELECT u.id
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspaceId}
      AND wm.role = 'owner'
    ORDER BY
      CASE WHEN ${playlistOwnerSpotifyId} IS NOT NULL AND u.spotify_user_id = ${playlistOwnerSpotifyId} THEN 0 ELSE 1 END,
      wm.created_at ASC
    LIMIT 1
  `;

  return rows[0]?.id || fallbackUserId;
}

function spotifyErrorMessage(body: any) {
  const error = body?.error as SpotifyApiError | string | undefined;
  if (typeof error === "string") return error;
  return error?.message || body?.message || "Spotify could not load this playlist.";
}

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
    const playlistId = encodeURIComponent(workspace.spotify_playlist_id);
    const tokenUserId = await getWorkspaceOwnerTokenUserId(
      workspace.id,
      workspace.spotify_playlist_owner_id || null,
      user.id
    );

    const res = await spotifyFetch(
      tokenUserId,
      `/playlists/${playlistId}/tracks?limit=100&additional_types=track`
    );
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = spotifyErrorMessage(body);

      if (res.status === 403 || res.status === 404) {
        return json({
          tracks: [],
          playlistConfigured: true,
          needsSetup: true,
          message:
            "Spotify is refusing access to the saved playlist. Open Settings, pick the playlist again, save it, then try the Playlist tab again.",
          spotifyStatus: res.status,
          spotifyMessage: message
        });
      }

      return json({ error: message }, res.status);
    }

    let tracks = (body.items || []).filter((i: any) => i.track?.id).map(mapTrack);
    if (q) tracks = tracks.filter((t: any) => `${t.name} ${t.artistName} ${t.albumName}`.toLowerCase().includes(q));

    return json({
      tracks,
      playlistConfigured: true,
      needsSetup: false,
      playlistId: workspace.spotify_playlist_id,
      snapshotId: body.snapshot_id || null
    });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
