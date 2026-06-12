import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";
import { requireUser, requireWorkspace, requireOwner } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const user = await requireUser();
    const workspace = await requireWorkspace(user.id);
    await requireOwner(user.id, workspace.id);
    const { memberId } = await params;
    const owners = await sql<{ count: number }[]>`SELECT count(*)::int FROM workspace_members WHERE workspace_id = ${workspace.id} AND role = 'owner'`;
    const target = await sql`SELECT role FROM workspace_members WHERE id = ${memberId} AND workspace_id = ${workspace.id}`;
    if (target[0]?.role === "owner" && owners[0].count <= 1) return json({ error: "You need at least one owner." }, 400);
    await sql`DELETE FROM workspace_members WHERE id = ${memberId} AND workspace_id = ${workspace.id}`;
    return json({ ok: true });
  } catch (err: any) {
    return err.message === "UNAUTHORIZED" ? unauthorized() : json({ error: err.message }, 400);
  }
}
