import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { RequestsClient } from "./RequestsClient";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login before reviewing requests." icon="login" />;
  const workspace = await getActiveWorkspace(user.id);
  return <RequestsClient role={workspace?.role} />;
}
