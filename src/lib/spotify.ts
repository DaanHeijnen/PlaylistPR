import { sql } from "./db";
import { getEnv } from "./env";
import type { SpotifyTrack } from "./types";

type TokenPayload = { access_token: string; refresh_token?: string; expires_in: number };

const scopes = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public"
].join(" ");

export function spotifyLoginUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getEnv("SPOTIFY_CLIENT_ID"),
    response_type: "code",
    redirect_uri: getEnv("SPOTIFY_REDIRECT_URI"),
    scope: scopes,
    state
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchange(body: URLSearchParams): Promise<TokenPayload> {
  const basic = Buffer.from(`${getEnv("SPOTIFY_CLIENT_ID")}:${getEnv("SPOTIFY_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${await res.text()}`);
  return res.json();
}

export async function exchangeCode(code: string) {
  return exchange(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: getEnv("SPOTIFY_REDIRECT_URI") }));
}

export async function refreshAccessToken(userId: string) {
  const rows = await sql<{ refresh_token: string }[]>`SELECT refresh_token FROM users WHERE id = ${userId} LIMIT 1`;
  if (!rows[0]) throw new Error("Spotify user not found.");
  const payload = await exchange(new URLSearchParams({ grant_type: "refresh_token", refresh_token: rows[0].refresh_token }));
  const refreshToken = payload.refresh_token || rows[0].refresh_token;
  await sql`
    UPDATE users SET access_token = ${payload.access_token}, refresh_token = ${refreshToken}, token_expires_at = now() + make_interval(secs => ${payload.expires_in}), updated_at = now()
    WHERE id = ${userId}
  `;
  return payload.access_token;
}

export async function getUserAccessToken(userId: string) {
  const rows = await sql<{ access_token: string; expired: boolean }[]>`
    SELECT access_token, token_expires_at <= now() + interval '60 seconds' AS expired FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) throw new Error("Spotify user not found.");
  return rows[0].expired ? refreshAccessToken(userId) : rows[0].access_token;
}

export async function spotifyFetch(userId: string, path: string, init?: RequestInit) {
  const token = await getUserAccessToken(userId);
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  if (res.status === 401) {
    const nextToken = await refreshAccessToken(userId);
    return fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${nextToken}`, "Content-Type": "application/json", ...(init?.headers || {}) }
    });
  }
  return res;
}

export function mapTrack(item: any): SpotifyTrack {
  const track = item.track || item;
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artistName: (track.artists || []).map((a: any) => a.name).join(", "),
    albumName: track.album?.name || "",
    artworkUrl: track.album?.images?.[0]?.url || null,
    durationMs: track.duration_ms || 0
  };
}

export async function applySpotifyChange(userId: string, playlistId: string, type: "add" | "remove", trackUri: string) {
  const res = await spotifyFetch(userId, `/playlists/${playlistId}/tracks`, {
    method: type === "add" ? "POST" : "DELETE",
    body: JSON.stringify(type === "add" ? { uris: [trackUri] } : { tracks: [{ uri: trackUri }] })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || "Spotify playlist update failed.");
  return body.snapshot_id as string | undefined;
}
