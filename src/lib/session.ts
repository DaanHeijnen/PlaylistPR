import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { sql } from "./db";
import { sessionCookieName } from "./env";
import type { AppUser, Workspace, Role } from "./types";

const FIVE_DAYS_SECONDS = 60 * 60 * 24 * 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await sql`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash}, now() + interval '5 days')`;
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIVE_DAYS_SECONDS
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  jar.delete(sessionCookieName());
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token) return null;
  const rows = await sql<AppUser[]>`
    SELECT u.id, u.spotify_user_id, u.display_name, u.avatar_url
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now()
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function getActiveWorkspace(userId: string): Promise<(Workspace & { role: Role }) | null> {
  const rows = await sql<(Workspace & { role: Role })[]>`
    SELECT w.*, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ${userId}
    ORDER BY w.created_at ASC
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function requireWorkspace(userId: string) {
  const workspace = await getActiveWorkspace(userId);
  if (!workspace) throw new Error("NO_WORKSPACE");
  return workspace;
}

export async function requireOwner(userId: string, workspaceId: string) {
  const rows = await sql<{ role: Role }[]>`
    SELECT role FROM workspace_members WHERE user_id = ${userId} AND workspace_id = ${workspaceId} LIMIT 1
  `;
  if (rows[0]?.role !== "owner") throw new Error("FORBIDDEN");
}
