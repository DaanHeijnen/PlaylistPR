import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return json({ error: message }, 400);
}

export function unauthorized() {
  return json({ error: "You must log in first." }, 401);
}

export function forbidden(message = "You do not have permission to do this.") {
  return json({ error: message }, 403);
}
