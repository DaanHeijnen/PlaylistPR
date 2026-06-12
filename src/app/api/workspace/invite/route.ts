import { json, unauthorized } from "@/lib/http";
import { sql } from "@/lib/db";
import { requireUser, requireWorkspace, requireOwner } from "@/lib/session";
import { appUrl } from "@/lib/env";
import { randomBytes } from "crypto";

export async function POST() {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    await requireOwner(user.id, workspace.id);
    const token = randomBytes(24).toString("base64url");
    await sql`
      INSERT INTO invites (workspace_id, token, created_by_user_id, expires_at)
      VALUES (${workspace.id}, ${token}, ${user.id}, now() + interval '14 days')
    `;
    return json({ inviteUrl: `${appUrl()}/api/workspace/join?token=${token}` });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
