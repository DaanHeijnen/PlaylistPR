import { NextRequest } from "next/server";
import { json, badRequest, unauthorized } from "@/lib/http";
import { sql } from "@/lib/db";
import { requireUser, requireWorkspace, requireOwner } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    await requireOwner(user.id, workspace.id);
    const body = await req.json();
    if (!body.playlistId || !body.name) return badRequest("Choose a playlist first.");
    const rows = await sql`
      UPDATE workspaces SET
        name = ${body.workspaceName || "Playlist PR"},
        spotify_playlist_id = ${body.playlistId},
        spotify_playlist_name = ${body.name},
        spotify_playlist_image_url = ${body.imageUrl || null},
        spotify_playlist_owner_id = ${body.ownerId || null},
        updated_at = now()
      WHERE id = ${workspace.id}
      RETURNING *
    `;
    return json({ workspace: rows[0] });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
