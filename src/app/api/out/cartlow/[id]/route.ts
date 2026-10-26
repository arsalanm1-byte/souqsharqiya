import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sponsored Cartlow link: counts the click for the admin report, then redirects. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/out/cartlow/[id]">) {
  const { id } = await ctx.params;
  const priceId = Number(id);
  const supabase = await createClient();
  const { data } = await supabase.from("cartlow_prices").select("id, url").eq("id", priceId).maybeSingle();
  if (!data) return NextResponse.redirect(new URL("/", request.url));

  const adId = Number(request.nextUrl.searchParams.get("ad")) || null;
  await createAdminClient()?.from("cartlow_clicks").insert({ cartlow_price_id: data.id, ad_id: adId });
  return NextResponse.redirect(data.url, 302);
}
