import { spotifyFetch } from "@/lib/spotify";
import { requireUser } from "@/lib/session";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const res = await spotifyFetch(user.id, "/me/playlists?limit=50");
    const body = await res.json();
    if (!res.ok) return json({ error: body.error?.message || "Could not load playlists." }, res.status);

    const playlists = (body.items || [])
      .map((p: any) => {
        const ownerId = p.owner?.id || null;
        const isOwnedByUser = ownerId === user.spotify_user_id;
        const isCollaborative = Boolean(p.collaborative);

        return {
          id: p.id,
          name: p.name,
          imageUrl: p.images?.[0]?.url || null,
          ownerId,
          ownerName: p.owner?.display_name || null,
          collaborative: isCollaborative,
          public: p.public,
          tracksTotal: p.tracks?.total || 0,
          editable: isOwnedByUser || isCollaborative
        };
      })
      .filter((p: any) => p.editable);

    return json({ playlists });
  } catch {
    return unauthorized();
  }
}
