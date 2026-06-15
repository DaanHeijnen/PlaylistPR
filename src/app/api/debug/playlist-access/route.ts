import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";
import { spotifyFetch } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);

    const owners = await sql<{ id: string; spotify_user_id: string; display_name: string }[]>`
      SELECT u.id, u.spotify_user_id, u.display_name
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ${workspace.id} AND wm.role = 'owner'
      ORDER BY wm.created_at ASC
    `;

    const result: any = {
      currentUser: {
        id: user.id,
        spotifyUserId: user.spotify_user_id,
        displayName: user.display_name
      },
      workspace: {
        id: workspace.id,
        playlistId: workspace.spotify_playlist_id,
        playlistName: workspace.spotify_playlist_name,
        playlistOwnerSpotifyId: workspace.spotify_playlist_owner_id
      },
      owners: owners.map((owner) => ({
        spotifyUserId: owner.spotify_user_id,
        displayName: owner.display_name,
        matchesPlaylistOwner: owner.spotify_user_id === workspace.spotify_playlist_owner_id
      })),
      spotifyChecks: []
    };

    if (workspace.spotify_playlist_id) {
      for (const owner of owners) {
        const playlistId = encodeURIComponent(workspace.spotify_playlist_id);
        const res = await spotifyFetch(owner.id, `/playlists/${playlistId}?fields=id,name,owner,collaborative,public,tracks(total)`);
        const body = await res.json().catch(() => ({}));
        result.spotifyChecks.push({
          checkedWithOwner: owner.display_name,
          checkedWithSpotifyUserId: owner.spotify_user_id,
          status: res.status,
          ok: res.ok,
          playlist: res.ok ? body : null,
          error: res.ok ? null : body.error || body
        });
      }
    }

    return json(result);
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
