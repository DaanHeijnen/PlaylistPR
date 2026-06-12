import { spotifyFetch } from "@/lib/spotify";
import { requireUser } from "@/lib/session";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const res = await spotifyFetch(user.id, "/me/playlists?limit=50");
    const body = await res.json();
    if (!res.ok) return json({ error: body.error?.message || "Could not load playlists." }, res.status);
    const playlists = (body.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.images?.[0]?.url || null,
      ownerId: p.owner?.id || null,
      ownerName: p.owner?.display_name || null,
      collaborative: p.collaborative,
      public: p.public,
      tracksTotal: p.tracks?.total || 0
    }));
    return json({ playlists });
  } catch {
    return unauthorized();
  }
}
