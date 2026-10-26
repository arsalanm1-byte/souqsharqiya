import type { SupabaseClient } from "@supabase/supabase-js";
import { filterFields, getCategory } from "@/lib/categories";
import { AD_CARD_COLUMNS } from "@/lib/types";
import { PAGE_SIZE, type SearchParams } from "./params";
import { toTsQuery } from "./normalize";

/**
 * Builds the live-ads query for a search. Shared by the search pages and the
 * saved-search alert job (which passes `createdAfter`).
 */
export function buildAdsQuery(
  supabase: SupabaseClient,
  p: SearchParams,
  options: { createdAfter?: string; limit?: number; paginate?: boolean } = {},
) {
  const columns = p.seller
    ? AD_CARD_COLUMNS.replace("profiles!ads_user_id_fkey(", "profiles!ads_user_id_fkey!inner(seller_type, ")
    : AD_CARD_COLUMNS;

  let query = supabase
    .from("ads")
    .select(columns, { count: options.paginate ? "estimated" : undefined })
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (p.category) query = query.eq("category", p.category);
  if (p.sub) query = query.eq("subcategory", p.sub);
  if (p.city) query = query.eq("city", p.city);
  if (p.district) query = query.eq("district", p.district);
  if (p.min !== undefined) query = query.gte("price", p.min);
  if (p.max !== undefined) query = query.lte("price", p.max);
  if (p.seller === "individual") query = query.eq("profiles.seller_type", "individual");
  if (p.seller === "business") query = query.neq("profiles.seller_type", "individual");

  const since = options.createdAfter ?? (p.posted ? new Date(Date.now() - p.posted * 86_400_000).toISOString() : undefined);
  if (since) query = query.gt("created_at", since);

  const tsq = p.q ? toTsQuery(p.q) : null;
  if (tsq) query = query.textSearch("search_vector", tsq, { config: "simple" });

  const cat = getCategory(p.category);
  if (cat) {
    for (const f of filterFields(cat)) {
      const target = f.column ?? `attributes->>${f.key}`;
      if (f.filter === "eq" && p.fields[f.key]) {
        query = f.column === "brand" || f.column === "model"
          ? query.ilike(target, p.fields[f.key])
          : query.eq(target, p.fields[f.key]);
      }
      if (f.filter === "range" && f.column) {
        const lo = p.fields[`${f.key}_min`];
        const hi = p.fields[`${f.key}_max`];
        if (lo) query = query.gte(f.column, Number(lo));
        if (hi) query = query.lte(f.column, Number(hi));
      }
    }
  }

  if (p.sort === "price_asc") query = query.order("price", { ascending: true, nullsFirst: false });
  else if (p.sort === "price_desc") query = query.order("price", { ascending: false, nullsFirst: false });
  query = query.order("created_at", { ascending: false });

  if (options.paginate) {
    const from = (p.page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);
  } else {
    query = query.limit(options.limit ?? PAGE_SIZE);
  }
  return query;
}
