import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { appUrl } from "@/lib/env";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(appUrl());
}
