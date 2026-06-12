import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace, requireOwner } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    await requireOwner(user.id, workspace.id);
    const { memberId } = await params;
    await sql`UPDATE workspace_members SET role = 'owner' WHERE id = ${memberId} AND workspace_id = ${workspace.id}`;
    return json({ ok: true });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
