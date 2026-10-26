import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";

/** Nightly: re-rates live ads as new comparable ads arrive (see vercel.json). */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return new NextResponse("SUPABASE_SECRET_KEY not set", { status: 500 });
  const { data, error } = await admin.rpc("refresh_price_ratings");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data });
}
