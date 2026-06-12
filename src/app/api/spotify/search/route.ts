import { NextRequest } from "next/server";
import { json, badRequest, unauthorized } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { spotifyFetch, mapTrack } from "@/lib/spotify";

function parseSpotifyTrackId(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/track[:/]([A-Za-z0-9]+)/);
  return match?.[1] || null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q) return badRequest("Enter a song title, artist, or Spotify track link.");
    const trackId = parseSpotifyTrackId(q);
    const path = trackId ? `/tracks/${trackId}` : `/search?type=track&limit=10&q=${encodeURIComponent(q)}`;
    const res = await spotifyFetch(user.id, path);
    const body = await res.json();
    if (!res.ok) return json({ error: body.error?.message || "Spotify search failed." }, res.status);
    const tracks = trackId ? [mapTrack(body)] : (body.tracks?.items || []).map(mapTrack);
    return json({ tracks });
  } catch {
    return unauthorized();
  }
}
