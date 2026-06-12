import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { spotifyLoginUrl } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const state = randomBytes(16).toString("base64url");
  const jar = await cookies();
  const next = new URL(req.url).searchParams.get("next");
  jar.set("spotify_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  if (next && next.startsWith("/")) jar.set("spotify_oauth_next", next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return NextResponse.redirect(spotifyLoginUrl(state));
}
