import { json } from "@/lib/http";
import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ user: null, workspace: null, members: [] });
  const workspace = await getActiveWorkspace(user.id);
  const members = workspace ? await sql`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, u.display_name, u.avatar_url
    FROM workspace_members wm JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspace.id}
    ORDER BY wm.role ASC, wm.created_at ASC
  ` : [];
  return json({ user, workspace, members });
}
