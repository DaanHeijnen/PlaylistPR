import { sql } from "@/lib/db";
import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { RequestCard } from "@/components/requests/RequestCard";
import type { PlaylistRequest } from "@/lib/types";

export default async function RequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login to view request details." icon="login" />;
  const workspace = await getActiveWorkspace(user.id);
  if (!workspace) return <EmptyState title="No workspace" description="Create a workspace first." icon="group" />;
  const { requestId } = await params;
  const rows = await sql<PlaylistRequest[]>`
    SELECT pr.*, requester.display_name AS requester_name, requester.avatar_url AS requester_avatar_url,
      (SELECT count(*)::int FROM request_required_reviewers rrr WHERE rrr.request_id = pr.id) AS required_count,
      (SELECT count(*)::int FROM request_reviews rr WHERE rr.request_id = pr.id AND rr.decision = 'approved') AS approved_count,
      denied_user.display_name AS denied_by_name,
      denied.reason AS denial_reason,
      my_review.decision AS current_user_decision
    FROM playlist_requests pr
    JOIN users requester ON requester.id = pr.requested_by_user_id
    LEFT JOIN request_reviews denied ON denied.request_id = pr.id AND denied.decision = 'denied'
    LEFT JOIN users denied_user ON denied_user.id = denied.reviewer_user_id
    LEFT JOIN request_reviews my_review ON my_review.request_id = pr.id AND my_review.reviewer_user_id = ${user.id}
    WHERE pr.id = ${requestId} AND pr.workspace_id = ${workspace.id}
  `;
  const request = rows[0];
  if (!request) return <EmptyState title="Request not found" description="This request does not exist in your workspace." icon="search_off" />;
  const reviewers = await sql`
    SELECT u.display_name, u.avatar_url, rr.decision, rr.reason, rr.created_at AS reviewed_at
    FROM request_required_reviewers rrr
    JOIN users u ON u.id = rrr.reviewer_user_id
    LEFT JOIN request_reviews rr ON rr.request_id = rrr.request_id AND rr.reviewer_user_id = rrr.reviewer_user_id
    WHERE rrr.request_id = ${request.id}
    ORDER BY rrr.created_at ASC
  `;
  return <div className="page">
    <div><p className="eyebrow">Audit trail</p><h1>Request detail</h1></div>
    <RequestCard request={request} role={workspace.role} />
    <Card>
      <div className="stack">
        <h2>Required owners</h2>
        {reviewers.map((reviewer: any) => <div key={reviewer.display_name} className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">{reviewer.avatar_url ? <img src={reviewer.avatar_url} className="avatar" alt="" /> : <span className="avatar" />}<p>{reviewer.display_name}</p></div>
          <StatusBadge status={reviewer.decision === "approved" ? "approved" : reviewer.decision === "denied" ? "denied" : "pending"} />
        </div>)}
      </div>
    </Card>
  </div>;
}
