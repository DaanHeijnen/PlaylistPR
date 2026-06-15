import { NextRequest } from "next/server";
import { json, badRequest, unauthorized } from "@/lib/http";
import { sql } from "@/lib/db";
import { requireUser, requireWorkspace, requireOwner } from "@/lib/session";
import { spotifyFetch } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    await requireOwner(user.id, workspace.id);
    const body = await req.json();
    if (!body.playlistId) return badRequest("Choose a playlist first.");

    const playlistRes = await spotifyFetch(user.id, `/playlists/${body.playlistId}`);
    const playlist = await playlistRes.json().catch(() => ({}));
    if (!playlistRes.ok) {
      return json({ error: playlist.error?.message || "Spotify could not load this playlist. Choose another playlist." }, playlistRes.status);
    }

    const ownerId = playlist.owner?.id || body.ownerId || null;
    const isOwnedByUser = ownerId === user.spotify_user_id;
    const isCollaborative = Boolean(playlist.collaborative || body.collaborative);

    if (!isOwnedByUser && !isCollaborative) {
      return json(
        { error: "Choose a playlist that you own or a collaborative playlist you can edit." },
        403
      );
    }

    const imageUrl = playlist.images?.[0]?.url || body.imageUrl || null;
    const rows = await sql`
      UPDATE workspaces SET
        name = ${body.workspaceName || "Playlist PR"},
        spotify_playlist_id = ${playlist.id || body.playlistId},
        spotify_playlist_name = ${playlist.name || body.name || "Selected playlist"},
        spotify_playlist_image_url = ${imageUrl},
        spotify_playlist_owner_id = ${ownerId},
        updated_at = now()
      WHERE id = ${workspace.id}
      RETURNING *
    `;
    return json({ workspace: rows[0] });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
