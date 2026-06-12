import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, badRequest, forbidden, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    const { requestId } = await params;
    const body = await req.json();
    const reason = String(body.reason || "").trim();
    if (!reason) return badRequest("A denial reason is required.");
    const requestRows = await sql`SELECT id, status FROM playlist_requests WHERE id = ${requestId} AND workspace_id = ${workspace.id} LIMIT 1`;
    const request = requestRows[0];
    if (!request) return json({ error: "Request not found." }, 404);
    if (!["pending", "partially_approved"].includes(request.status)) return json({ error: "This request is closed." }, 400);
    const reviewer = await sql`SELECT id FROM request_required_reviewers WHERE request_id = ${requestId} AND reviewer_user_id = ${user.id} LIMIT 1`;
    if (!reviewer[0]) return forbidden("Only required owner reviewers can deny this request.");
    await sql`
      INSERT INTO request_reviews (request_id, reviewer_user_id, decision, reason)
      VALUES (${requestId}, ${user.id}, 'denied', ${reason})
      ON CONFLICT (request_id, reviewer_user_id) DO NOTHING
    `;
    await sql`UPDATE playlist_requests SET status = 'denied', resolved_at = now() WHERE id = ${requestId}`;
    return json({ status: "denied" });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
