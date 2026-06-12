import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const params: any[] = [workspace.id];
    let where = "WHERE pr.workspace_id = $1 AND pr.status IN ('approved','denied','failed')";
    if (status && status !== "all") { params.push(status); where += ` AND pr.status = $${params.length}`; }
    if (type && type !== "all") { params.push(type); where += ` AND pr.type = $${params.length}`; }
    const rows = await sql.unsafe(`
      SELECT pr.*, requester.display_name AS requester_name, requester.avatar_url AS requester_avatar_url,
        (SELECT count(*)::int FROM request_required_reviewers rrr WHERE rrr.request_id = pr.id) AS required_count,
        (SELECT count(*)::int FROM request_reviews rr WHERE rr.request_id = pr.id AND rr.decision = 'approved') AS approved_count,
        denied_user.display_name AS denied_by_name,
        denied.reason AS denial_reason
      FROM playlist_requests pr
      JOIN users requester ON requester.id = pr.requested_by_user_id
      LEFT JOIN request_reviews denied ON denied.request_id = pr.id AND denied.decision = 'denied'
      LEFT JOIN users denied_user ON denied_user.id = denied.reviewer_user_id
      ${where}
      ORDER BY COALESCE(pr.resolved_at, pr.created_at) DESC
      LIMIT 100`, params);
    return json({ history: rows });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
