import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, badRequest, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";

const requestSelect = `
  SELECT pr.*,
    requester.display_name AS requester_name,
    requester.avatar_url AS requester_avatar_url,
    (SELECT count(*)::int FROM request_required_reviewers rrr WHERE rrr.request_id = pr.id) AS required_count,
    (SELECT count(*)::int FROM request_reviews rr WHERE rr.request_id = pr.id AND rr.decision = 'approved') AS approved_count,
    denied_user.display_name AS denied_by_name,
    denied.reason AS denial_reason
  FROM playlist_requests pr
  JOIN users requester ON requester.id = pr.requested_by_user_id
  LEFT JOIN request_reviews denied ON denied.request_id = pr.id AND denied.decision = 'denied'
  LEFT JOIN users denied_user ON denied_user.id = denied.reviewer_user_id
`;

export async function GET() {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const rows = await sql.unsafe(`${requestSelect}
      WHERE pr.workspace_id = $1 AND pr.status IN ('pending','partially_approved')
      ORDER BY pr.created_at DESC`, [workspace.id]);
    const decisions = await sql`SELECT request_id, decision FROM request_reviews WHERE reviewer_user_id = ${user.id}`;
    const byRequest = new Map(decisions.map((d: any) => [d.request_id, d.decision]));
    return json({ requests: rows.map((r: any) => ({ ...r, current_user_decision: byRequest.get(r.id) || null })) });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const body = await req.json();
    if (!workspace.spotify_playlist_id) return badRequest("Select a managed playlist first.");
    if (!body.type || !["add", "remove"].includes(body.type)) return badRequest("Invalid request type.");
    if (!body.track?.id || !body.track?.uri) return badRequest("Choose a Spotify track first.");
    const owners = await sql<{ user_id: string }[]>`SELECT user_id FROM workspace_members WHERE workspace_id = ${workspace.id} AND role = 'owner'`;
    if (owners.length === 0) return badRequest("A request needs at least one owner reviewer.");

    const duplicate = await sql`
      SELECT id FROM playlist_requests
      WHERE workspace_id = ${workspace.id} AND spotify_track_id = ${body.track.id} AND type = ${body.type} AND status IN ('pending','partially_approved')
      LIMIT 1
    `;
    if (duplicate[0]) return badRequest("There is already an open request for this track.");

    const rows = await sql<{ id: string }[]>`
      INSERT INTO playlist_requests (workspace_id, type, spotify_track_id, track_uri, track_name, artist_name, album_name, album_artwork_url, requested_by_user_id, request_reason)
      VALUES (${workspace.id}, ${body.type}, ${body.track.id}, ${body.track.uri}, ${body.track.name}, ${body.track.artistName}, ${body.track.albumName || null}, ${body.track.artworkUrl || null}, ${user.id}, ${body.reason || null})
      RETURNING id
    `;
    for (const owner of owners) {
      await sql`INSERT INTO request_required_reviewers (request_id, reviewer_user_id) VALUES (${rows[0].id}, ${owner.user_id})`;
    }
    return json({ id: rows[0].id }, 201);
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
