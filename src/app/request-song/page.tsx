import { getCurrentUser } from "@/lib/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { RequestSongClient } from "./RequestSongClient";

export default async function RequestSongPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login before requesting songs." icon="login" />;
  return <RequestSongClient />;
}
