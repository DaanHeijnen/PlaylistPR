import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { createSession } from "@/lib/session";
import { exchangeCode } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const expectedState = jar.get("spotify_oauth_state")?.value;
  const nextPath = jar.get("spotify_oauth_next")?.value;
  jar.delete("spotify_oauth_state");
  jar.delete("spotify_oauth_next");
  if (error) return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent(error)}`);
  if (!code || !state || state !== expectedState) return NextResponse.redirect(`${appUrl()}/?error=Invalid Spotify login state`);

  try {
    const token = await exchangeCode(code);
    const profileRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileRes.ok) throw new Error("Could not fetch Spotify profile.");
    const profile = await profileRes.json();
    const avatarUrl = profile.images?.[0]?.url || null;
    const rows = await sql<{ id: string }[]>`
      INSERT INTO users (spotify_user_id, display_name, avatar_url, access_token, refresh_token, token_expires_at)
      VALUES (${profile.id}, ${profile.display_name || profile.id}, ${avatarUrl}, ${token.access_token}, ${token.refresh_token || ""}, now() + make_interval(secs => ${token.expires_in}))
      ON CONFLICT (spotify_user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(NULLIF(EXCLUDED.refresh_token, ''), users.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = now()
      RETURNING id
    `;
    const userId = rows[0].id;
    const existing = await sql`SELECT id FROM workspace_members WHERE user_id = ${userId} LIMIT 1`;
    const isNewWorkspace = !existing[0];
    if (isNewWorkspace) {
      const workspace = await sql<{ id: string }[]>`INSERT INTO workspaces (name, created_by_user_id) VALUES ('Playlist PR', ${userId}) RETURNING id`;
      await sql`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${workspace[0].id}, ${userId}, 'owner')`;
    }
    await createSession(userId);
    const fallbackPath = isNewWorkspace ? "/settings" : "/";
    return NextResponse.redirect(`${appUrl()}${nextPath && nextPath.startsWith("/") ? nextPath : fallbackPath}`);
  } catch (err: any) {
    return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent(err.message || "Spotify login failed")}`);
  }
}
