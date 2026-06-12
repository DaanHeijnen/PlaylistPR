import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login before opening settings." icon="login" />;
  const workspace = await getActiveWorkspace(user.id);
  const members = workspace ? await sql`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, u.display_name, u.avatar_url
    FROM workspace_members wm JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspace.id}
    ORDER BY wm.role ASC, wm.created_at ASC
  ` : [];
  return <SettingsClient initial={{ user, workspace, members }} />;
}
