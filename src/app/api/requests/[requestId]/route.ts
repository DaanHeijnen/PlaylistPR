import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const { requestId } = await params;
    const rows = await sql`
      SELECT pr.*, requester.display_name AS requester_name, requester.avatar_url AS requester_avatar_url
      FROM playlist_requests pr JOIN users requester ON requester.id = pr.requested_by_user_id
      WHERE pr.id = ${requestId} AND pr.workspace_id = ${workspace.id}
    `;
    const reviewers = await sql`
      SELECT rrr.reviewer_user_id, u.display_name, u.avatar_url, rr.decision, rr.reason, rr.created_at AS reviewed_at
      FROM request_required_reviewers rrr
      JOIN users u ON u.id = rrr.reviewer_user_id
      LEFT JOIN request_reviews rr ON rr.request_id = rrr.request_id AND rr.reviewer_user_id = rrr.reviewer_user_id
      WHERE rrr.request_id = ${requestId}
      ORDER BY rrr.created_at ASC
    `;
    return json({ request: rows[0] || null, reviewers });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
