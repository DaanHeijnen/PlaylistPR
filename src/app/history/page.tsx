import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistoryClient } from "./HistoryClient";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login before viewing history." icon="login" />;
  const workspace = await getActiveWorkspace(user.id);
  return <HistoryClient role={workspace?.role} />;
}
