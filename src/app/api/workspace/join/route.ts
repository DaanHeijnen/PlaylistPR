import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { appUrl } from "@/lib/env";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(`${appUrl()}/?error=Missing invite token`);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/api/auth/spotify?next=${encodeURIComponent(`/api/workspace/join?token=${token}`)}`);
  const invite = await sql`SELECT * FROM invites WHERE token = ${token} AND expires_at > now() LIMIT 1`;
  if (!invite[0]) return NextResponse.redirect(`${appUrl()}/?error=Invite expired or invalid`);
  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${invite[0].workspace_id}, ${user.id}, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING
  `;
  await sql`UPDATE invites SET used_at = now() WHERE id = ${invite[0].id}`;
  return NextResponse.redirect(`${appUrl()}/`);
}
