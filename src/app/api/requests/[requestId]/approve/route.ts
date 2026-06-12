import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, forbidden, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";
import { applySpotifyChange } from "@/lib/spotify";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const { requestId } = await params;
    const requestRows = await sql`
      SELECT * FROM playlist_requests WHERE id = ${requestId} AND workspace_id = ${workspace.id} LIMIT 1
    `;
    const request = requestRows[0];
    if (!request) return json({ error: "Request not found." }, 404);
    if (!["pending", "partially_approved"].includes(request.status)) return json({ error: "This request is closed." }, 400);
    const reviewer = await sql`
      SELECT id FROM request_required_reviewers WHERE request_id = ${requestId} AND reviewer_user_id = ${user.id} LIMIT 1
    `;
    if (!reviewer[0]) return forbidden("Only required owner reviewers can approve this request.");
    await sql`
      INSERT INTO request_reviews (request_id, reviewer_user_id, decision)
      VALUES (${requestId}, ${user.id}, 'approved')
      ON CONFLICT (request_id, reviewer_user_id) DO NOTHING
    `;
    const counts = await sql<{ required_count: number; approved_count: number; denied_count: number }[]>`
      SELECT
        (SELECT count(*)::int FROM request_required_reviewers WHERE request_id = ${requestId}) AS required_count,
        (SELECT count(*)::int FROM request_reviews WHERE request_id = ${requestId} AND decision = 'approved') AS approved_count,
        (SELECT count(*)::int FROM request_reviews WHERE request_id = ${requestId} AND decision = 'denied') AS denied_count
    `;
    if (counts[0].denied_count > 0) return json({ error: "This request was denied." }, 400);
    if (counts[0].approved_count < counts[0].required_count) {
      await sql`UPDATE playlist_requests SET status = 'partially_approved' WHERE id = ${requestId}`;
      return json({ status: "partially_approved" });
    }

    try {
      if (!workspace.spotify_playlist_id) throw new Error("No managed Spotify playlist is selected.");
      const snapshotId = await applySpotifyChange(user.id, workspace.spotify_playlist_id, request.type, request.track_uri);
      await sql`
        UPDATE playlist_requests SET status = 'approved', resolved_at = now(), spotify_snapshot_id = ${snapshotId || null}, spotify_error = null WHERE id = ${requestId}
      `;
      await sql`UPDATE workspaces SET spotify_playlist_snapshot_id = ${snapshotId || null}, updated_at = now() WHERE id = ${workspace.id}`;
      return json({ status: "approved", spotifySnapshotId: snapshotId || null });
    } catch (err: any) {
      await sql`
        UPDATE playlist_requests SET status = 'failed', resolved_at = now(), spotify_error = ${err.message || "Spotify update failed."} WHERE id = ${requestId}
      `;
      return json({ status: "failed", error: err.message || "Spotify update failed." }, 502);
    }
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
