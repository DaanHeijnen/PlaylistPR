import { getCurrentUser } from "@/lib/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaylistClient } from "./PlaylistClient";

export default async function PlaylistPage() {
  const user = await getCurrentUser();
  if (!user) return <EmptyState title="Log in first" description="Use Spotify login before viewing the playlist." icon="login" />;
  return <PlaylistClient />;
}
