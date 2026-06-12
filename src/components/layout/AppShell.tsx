import { TopAppBar } from "./TopAppBar";
import { BottomNavigation } from "./BottomNavigation";
import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const workspace = user ? await getActiveWorkspace(user.id) : null;
  let pendingCount = 0;
  if (workspace) {
    const rows = await sql<{ count: number }[]>`SELECT count(*)::int FROM playlist_requests WHERE workspace_id = ${workspace.id} AND status IN ('pending','partially_approved')`;
    pendingCount = rows[0]?.count || 0;
  }
  return <div className="app-shell">
    <TopAppBar user={user} workspace={workspace} />
    <main className="app-main">{children}</main>
    <BottomNavigation pendingCount={pendingCount} />
  </div>;
}
