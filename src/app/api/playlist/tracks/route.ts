import { NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/http";
import { sql } from "@/lib/db";
import { requireUser, requireWorkspace } from "@/lib/session";
import { spotifyFetch, spotifyFetchUrl, mapTrack } from "@/lib/spotify";

type OwnerTokenCandidate = {
  id: string;
  spotify_user_id: string;
  display_name: string;
};

function setupResponse(message: string) {
  return json({
    tracks: [],
    playlistConfigured: false,
    needsSetup: true,
    message
  });
}

function spotifyErrorMessage(body: any) {
  if (typeof body?.error === "string") return body.error;
  if (typeof body?.error?.message === "string") return body.error.message;
  return "Spotify could not load this playlist.";
}

async function readBody(res: Response) {
  return res.json().catch(() => ({}));
}

async function loadTracksFromPlaylistObject(userId: string, playlistId: string) {
  const fields = encodeURIComponent(
    "id,name,snapshot_id,tracks(next,items(track(id,uri,name,artists(name),album(name,images),duration_ms)))"
  );
  const res = await spotifyFetch(userId, `/playlists/${encodeURIComponent(playlistId)}?fields=${fields}`);
  const body = await readBody(res);

  if (!res.ok) {
    return { ok: false as const, status: res.status, body, tracks: [], snapshotId: null as string | null };
  }

  const items: any[] = [...(body.tracks?.items || [])];
  let nextUrl: string | null = body.tracks?.next || null;
  let safety = 0;

  while (nextUrl && safety < 20) {
    safety += 1;
    const nextRes = await spotifyFetchUrl(userId, nextUrl);
    const nextBody = await readBody(nextRes);
    if (!nextRes.ok) break;
    items.push(...(nextBody.items || []));
    nextUrl = nextBody.next || null;
  }

  return {
    ok: true as const,
    status: res.status,
    body,
    tracks: items.filter((item: any) => item.track?.id).map(mapTrack),
    snapshotId: body.snapshot_id || null
  };
}

async function loadTracksFromTracksEndpoint(userId: string, playlistId: string) {
  const res = await spotifyFetch(userId, `/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`);
  const body = await readBody(res);

  if (!res.ok) {
    return { ok: false as const, status: res.status, body, tracks: [], snapshotId: null as string | null };
  }

  const items: any[] = [...(body.items || [])];
  let nextUrl: string | null = body.next || null;
  let safety = 0;

  while (nextUrl && safety < 20) {
    safety += 1;
    const nextRes = await spotifyFetchUrl(userId, nextUrl);
    const nextBody = await readBody(nextRes);
    if (!nextRes.ok) break;
    items.push(...(nextBody.items || []));
    nextUrl = nextBody.next || null;
  }

  return {
    ok: true as const,
    status: res.status,
    body,
    tracks: items.filter((item: any) => item.track?.id).map(mapTrack),
    snapshotId: null
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);

    if (!workspace.spotify_playlist_id) {
      return setupResponse("No managed playlist has been selected yet. Go to Settings and choose a Spotify playlist first.");
    }

    const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";

    const owners = await sql<OwnerTokenCandidate[]>`
      SELECT u.id, u.spotify_user_id, u.display_name
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ${workspace.id} AND wm.role = 'owner'
      ORDER BY
        CASE WHEN u.spotify_user_id = ${workspace.spotify_playlist_owner_id || ""} THEN 0 ELSE 1 END,
        wm.created_at ASC
    `;

    const tokenCandidates = owners.length ? owners : [{ id: user.id, spotify_user_id: user.spotify_user_id, display_name: user.display_name }];
    const attempts: string[] = [];

    for (const owner of tokenCandidates) {
      const fromPlaylistObject = await loadTracksFromPlaylistObject(owner.id, workspace.spotify_playlist_id);
      if (fromPlaylistObject.ok) {
        let tracks = fromPlaylistObject.tracks;
        if (q) tracks = tracks.filter((t: any) => `${t.name} ${t.artistName} ${t.albumName}`.toLowerCase().includes(q));
        return json({ tracks, playlistConfigured: true, needsSetup: false, snapshotId: fromPlaylistObject.snapshotId });
      }
      attempts.push(`${owner.display_name}: playlist object ${fromPlaylistObject.status} ${spotifyErrorMessage(fromPlaylistObject.body)}`);

      const fromTracksEndpoint = await loadTracksFromTracksEndpoint(owner.id, workspace.spotify_playlist_id);
      if (fromTracksEndpoint.ok) {
        let tracks = fromTracksEndpoint.tracks;
        if (q) tracks = tracks.filter((t: any) => `${t.name} ${t.artistName} ${t.albumName}`.toLowerCase().includes(q));
        return json({ tracks, playlistConfigured: true, needsSetup: false, snapshotId: fromTracksEndpoint.snapshotId });
      }
      attempts.push(`${owner.display_name}: tracks endpoint ${fromTracksEndpoint.status} ${spotifyErrorMessage(fromTracksEndpoint.body)}`);
    }

    return setupResponse(
      "The selected Spotify playlist could not be opened by Playlist PR. Open Settings, select the playlist again, and save it. Details: " + attempts.join(" | ")
    );
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return unauthorized();
    if (err.message === "NO_WORKSPACE") return setupResponse("No workspace exists yet. Open Settings to finish setup.");
    return json({ error: err.message }, 400);
  }
}
