-- Souq Sharqiya: initial schema (phase 1 MVP)
--
-- Run once on a new Supabase project (SQL Editor, or `supabase db push`).
-- Security model:
--   * Row Level Security on every table.
--   * Column-level grants stop users from writing moderation fields
--     (status, price rating, verified badges, roles) directly.
--   * Anything privileged goes through SECURITY DEFINER functions that check
--     auth.uid() and is_admin() themselves.

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------

-- Arabic-aware normalisation used for search: strips diacritics and tatweel,
-- folds alef/yaa/taa marbuta variants and lowercases Latin text. Mirrored in
-- src/lib/search/normalize.ts so queries and stored text agree.
create or replace function public.normalize_ar(input text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(
    translate(
      regexp_replace(coalesce(input, ''), '[ً-ٰٟـ]', '', 'g'),
      'أإآٱىةؤئ',
      'اااايهوي'
    )
  )
$$;

-------------------------------------------------------------------------------
-- Profiles
-------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  seller_type text not null default 'individual'
    check (seller_type in ('individual', 'dealer', 'agency', 'employer')),
  business_name text check (char_length(business_name) <= 120),
  verified_business boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  created_at timestamptz not null default now()
);

-- Phone numbers live apart from profiles so they are never readable in bulk;
-- buyers get them one ad at a time through reveal_contact().
create table public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone ~ '^\+9665[0-9]{8}$'),
  allow_calls boolean not null default true,
  allow_whatsapp boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- Throwaway email providers are refused at sign-up.
create table public.blocked_email_domains (
  domain text primary key check (domain = lower(domain))
);

insert into public.blocked_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('sharklasers.com'),
  ('10minutemail.com'), ('10minutemail.net'), ('tempmail.com'), ('temp-mail.org'),
  ('temp-mail.io'), ('throwawaymail.com'), ('yopmail.com'), ('yopmail.net'),
  ('getnada.com'), ('nada.email'), ('trashmail.com'), ('trashmail.de'),
  ('dispostable.com'), ('maildrop.cc'), ('mailnesia.com'), ('mintemail.com'),
  ('mohmal.com'), ('emailondeck.com'), ('fakeinbox.com'), ('tempinbox.com'),
  ('spamgourmet.com'), ('mytemp.email'), ('tempmailo.com'), ('tempr.email'),
  ('discard.email'), ('burnermail.io'), ('mailpoof.com'), ('inboxkitten.com'),
  ('moakt.com'), ('emailfake.com'), ('crazymailing.com'), ('tmail.ws'),
  ('tmpmail.org'), ('tmpmail.net'), ('1secmail.com'), ('1secmail.org'),
  ('1secmail.net'), ('mailcatch.com'), ('mailtemp.net'), ('linshiyouxiang.net');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_name text;
begin
  if exists (select 1 from public.blocked_email_domains where domain = v_domain) then
    raise exception 'disposable_email' using errcode = 'P0001';
  end if;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 60));
  insert into public.profile_contacts (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Ads
-------------------------------------------------------------------------------

create table public.banned_words (
  word text primary key check (word = public.normalize_ar(word))
);

insert into public.banned_words (word) values
  ('viagra'), ('casino'), ('bitcoin doubler'), ('forex signals'),
  ('visa for sale'), ('تاشيرات للبيع'), ('تاشيره للبيع'), ('اقامه للبيع'),
  ('سلاح'), ('حشيش'), ('كبتاجون'), ('weapon'), ('hashish'), ('captagon');

create table public.ads (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('cars', 'housing', 'jobs', 'electronics')),
  subcategory text not null check (char_length(subcategory) <= 40),
  city text not null check (char_length(city) <= 40),
  district text check (char_length(district) <= 60),
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  -- SAR. For housing rent and job salaries, price_period says per month/year.
  price numeric(12, 2) check (price >= 0),
  price_period text check (price_period in ('month', 'year')),
  -- Category-specific fields (see src/lib/categories.ts). The ones used for
  -- filtering and price comparison are also promoted to real columns below.
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  brand text check (char_length(brand) <= 60),      -- car make or device brand
  model text check (char_length(model) <= 80),
  year int check (year between 1950 and 2100),
  mileage_km int check (mileage_km >= 0),
  bedrooms int check (bedrooms between 0 and 50),
  size_m2 numeric(10, 2) check (size_m2 > 0),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  photos text[] not null default '{}' check (cardinality(photos) <= 10),
  photo_hashes text[] not null default '{}' check (cardinality(photo_hashes) <= 10),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'closed', 'sold', 'removed')),
  moderation_note text,
  price_rating text check (price_rating in ('great', 'good', 'fair', 'high')),
  price_median numeric(12, 2),
  price_comps int,
  sold_to uuid references public.profiles (id) on delete set null,
  sold_price numeric(12, 2) check (sold_price >= 0),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', public.normalize_ar(title)), 'A') ||
    setweight(to_tsvector('simple', public.normalize_ar(coalesce(brand, '') || ' ' || coalesce(model, ''))), 'A') ||
    setweight(to_tsvector('simple', public.normalize_ar(description)), 'B')
  ) stored
);

create index ads_live_idx on public.ads (category, created_at desc) where status = 'active';
create index ads_user_idx on public.ads (user_id, created_at desc);
create index ads_search_idx on public.ads using gin (search_vector);
create index ads_attributes_idx on public.ads using gin (attributes jsonb_path_ops);
create index ads_comps_idx on public.ads (category, lower(brand), lower(model), created_at desc);
create index ads_city_idx on public.ads (city, category);

create table public.cartlow_prices (
  id bigint generated always as identity primary key,
  brand text not null,
  model text not null,
  storage text,
  price numeric(12, 2) not null check (price > 0),
  -- Affiliate link to the matching Cartlow product page.
  url text not null check (url ~ '^https://'),
  updated_at timestamptz not null default now()
);

create unique index cartlow_prices_key
  on public.cartlow_prices (lower(brand), lower(model), coalesce(lower(storage), ''));

-- Cheapest Cartlow refurbished price for a device; storage narrows it when known.
create or replace function public.cartlow_match(p_brand text, p_model text, p_storage text)
returns public.cartlow_prices
language sql
stable
set search_path = public
as $$
  select c.*
  from public.cartlow_prices c
  where lower(c.brand) = lower(p_brand)
    and lower(c.model) = lower(p_model)
    and (p_storage is null or p_storage = '' or c.storage is null
         or lower(c.storage) = lower(p_storage))
  order by (lower(c.storage) is not distinct from lower(nullif(p_storage, ''))) desc, c.price asc
  limit 1
$$;

-- Price rating: compares an ad with the median of similar ads from the last
-- 90 days. Needs at least 10 comparable ads; widens the match once, then gives
-- up rather than guessing. Sold prices count twice. Electronics priced above
-- Cartlow's refurbished price (with warranty) are rated High from day one.
create or replace function public.compute_price_rating(a public.ads)
returns table (rating text, median numeric, comps int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  min_comps constant int := 10;
  v_value numeric;
  v_floor numeric;
  v_all numeric[];
  v_sold numeric[];
  v_median numeric;
  v_count int := 0;
  v_pass int;
  v_cartlow public.cartlow_prices;
  v_ratio numeric;
begin
  if a.category = 'jobs' or a.price is null or a.price <= 0 then
    return;
  end if;

  if a.category = 'housing' then
    if a.size_m2 is null or a.size_m2 <= 0 then return; end if;
    v_value := a.price / a.size_m2;
  else
    v_value := a.price;
  end if;

  -- Joke prices (SAR 1 etc.) are left out of the comparison set.
  v_floor := case a.category when 'cars' then 1000 when 'housing' then 100 else 20 end;

  for v_pass in 1..2 loop
    select
      coalesce(array_agg(x.v), '{}'),
      coalesce(array_agg(x.v) filter (where x.sold), '{}')
    into v_all, v_sold
    from (
      select
        case when c.category = 'housing'
          then coalesce(c.sold_price, c.price) / c.size_m2
          else coalesce(c.sold_price, c.price)
        end as v,
        c.status = 'sold' and c.sold_price is not null as sold
      from public.ads c
      where c.id is distinct from a.id
        and c.category = a.category
        and c.status in ('active', 'sold', 'closed')
        and c.created_at > now() - interval '90 days'
        and c.price >= v_floor
        and (
          (a.category = 'cars'
            and lower(c.brand) = lower(a.brand)
            and lower(c.model) = lower(a.model)
            and abs(c.year - a.year) <= case when v_pass = 1 then 1 else 2 end
            and (v_pass = 2 or a.mileage_km is null or c.mileage_km is null
                 or abs(c.mileage_km - a.mileage_km) <= 30000))
          or (a.category = 'electronics'
            and lower(c.brand) = lower(a.brand)
            and lower(c.model) = lower(a.model)
            and coalesce(lower(c.attributes ->> 'storage'), '') = coalesce(lower(a.attributes ->> 'storage'), '')
            and (v_pass = 2 or c.attributes ->> 'condition' is not distinct from a.attributes ->> 'condition'))
          or (a.category = 'housing'
            and c.subcategory = a.subcategory
            and c.city = a.city
            and c.bedrooms is not distinct from a.bedrooms
            and c.price_period is not distinct from a.price_period
            and c.size_m2 > 0
            and (v_pass = 2 or c.district is not distinct from a.district))
        )
    ) x;

    -- Trim outliers that survived the floor (more than 4x off the raw median).
    select percentile_cont(0.5) within group (order by u) into v_median from unnest(v_all) u;
    if v_median is not null and v_median > 0 then
      select coalesce(array_agg(u), '{}') into v_all from unnest(v_all) u
      where u between v_median / 4 and v_median * 4;
      select coalesce(array_agg(u), '{}') into v_sold from unnest(v_sold) u
      where u between v_median / 4 and v_median * 4;
    end if;

    v_count := cardinality(v_all);
    exit when v_count >= min_comps;
  end loop;

  v_median := null;
  if v_count >= min_comps then
    select percentile_cont(0.5) within group (order by u) into v_median
    from unnest(v_all || v_sold) u;
  end if;

  if v_median is not null and v_median > 0 then
    v_ratio := v_value / v_median;
    rating := case
      when v_ratio < 0.9 then 'great'
      when v_ratio <= 1.0 then 'good'
      when v_ratio <= 1.1 then 'fair'
      else 'high'
    end;
    median := round(v_median, 2);
    comps := v_count;
  end if;

  if a.category = 'electronics' then
    v_cartlow := public.cartlow_match(a.brand, a.model, a.attributes ->> 'storage');
    if v_cartlow.id is not null and a.price > v_cartlow.price then
      rating := 'high';
    end if;
  end if;

  if rating is not null then
    return next;
  end if;
end;
$$;

-- Moderation and limits on new ads.
create or replace function public.ads_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_confirmed timestamptz;
  v_account_created timestamptz;
  v_today int;
  v_approved int;
  v_text text;
  v_reasons text[] := '{}';
  r record;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = new.user_id;
  if v_profile.is_banned then
    raise exception 'banned' using errcode = 'P0001';
  end if;

  select email_confirmed_at, created_at into v_confirmed, v_account_created
  from auth.users where id = new.user_id;
  if v_confirmed is null then
    raise exception 'email_not_confirmed' using errcode = 'P0001';
  end if;

  -- New accounts (first 7 days) may post 3 ads a day, others 20.
  select count(*) into v_today from public.ads
  where user_id = new.user_id and created_at > now() - interval '24 hours';
  if v_today >= (case when v_account_created > now() - interval '7 days' then 3 else 20 end) then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  -- REGA: agencies and every property sale need an ad licence number.
  if new.category = 'housing'
     and (v_profile.seller_type = 'agency' or new.subcategory like 'sale-%')
     and coalesce(new.attributes ->> 'rega_licence', '') = '' then
    raise exception 'rega_licence_required' using errcode = 'P0001';
  end if;

  -- Server-controlled fields.
  new.price_rating := null;
  new.sold_to := null;
  new.sold_price := null;
  new.sold_at := null;
  new.created_at := now();
  new.updated_at := now();
  new.expires_at := now() + interval '30 days';

  select count(*) into v_approved from public.ads
  where user_id = new.user_id and status in ('active', 'closed', 'sold');
  if v_approved < 2 then
    v_reasons := array_append(v_reasons, 'new_account');
  end if;

  v_text := public.normalize_ar(new.title || ' ' || new.description);
  if exists (select 1 from public.banned_words w where position(w.word in v_text) > 0) then
    v_reasons := array_append(v_reasons, 'banned_word');
  end if;

  if cardinality(new.photo_hashes) > 0 and exists (
    select 1 from public.ads o
    where o.user_id <> new.user_id
      and o.status in ('active', 'pending')
      and o.photo_hashes && new.photo_hashes
  ) then
    v_reasons := array_append(v_reasons, 'duplicate_photo');
  end if;

  if cardinality(v_reasons) > 0 then
    new.status := 'pending';
    new.moderation_note := array_to_string(v_reasons, ',');
  else
    new.status := 'active';
    new.moderation_note := null;
  end if;

  select * into r from public.compute_price_rating(new);
  new.price_rating := r.rating;
  new.price_median := r.median;
  new.price_comps := r.comps;
  return new;
end;
$$;

create trigger ads_before_insert
  before insert on public.ads
  for each row execute function public.ads_before_insert();

create or replace function public.ads_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  new.updated_at := now();

  -- Owner edits to live text are re-checked for banned words.
  if not public.is_admin()
     and (new.title, new.description) is distinct from (old.title, old.description)
     and new.status = 'active'
     and exists (
       select 1 from public.banned_words w
       where position(w.word in public.normalize_ar(new.title || ' ' || new.description)) > 0
     ) then
    new.status := 'pending';
    new.moderation_note := 'banned_word';
  end if;

  if new.category = 'housing'
     and new.subcategory like 'sale-%'
     and coalesce(new.attributes ->> 'rega_licence', '') = '' then
    raise exception 'rega_licence_required' using errcode = 'P0001';
  end if;

  if (new.price, new.brand, new.model, new.year, new.mileage_km, new.bedrooms,
      new.size_m2, new.subcategory, new.city, new.district, new.price_period, new.attributes)
     is distinct from
     (old.price, old.brand, old.model, old.year, old.mileage_km, old.bedrooms,
      old.size_m2, old.subcategory, old.city, old.district, old.price_period, old.attributes)
  then
    select * into r from public.compute_price_rating(new);
    new.price_rating := r.rating;
    new.price_median := r.median;
    new.price_comps := r.comps;
  end if;
  return new;
end;
$$;

create trigger ads_before_update
  before update on public.ads
  for each row execute function public.ads_before_update();

-- Nightly job: ratings drift as new ads arrive.
create or replace function public.refresh_price_ratings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.ads;
  r record;
  n int := 0;
begin
  for a in
    select * from public.ads
    where status = 'active' and expires_at > now() and category <> 'jobs'
  loop
    select * into r from public.compute_price_rating(a);
    if (r.rating, r.median, r.comps) is distinct from (a.price_rating, a.price_median, a.price_comps) then
      update public.ads
      set price_rating = r.rating, price_median = r.median, price_comps = r.comps
      where id = a.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Owner actions on their own ads.
create or replace function public.close_ad(p_ad_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ads set status = 'closed'
  where id = p_ad_id and user_id = auth.uid() and status in ('active', 'pending');
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
end;
$$;

create or replace function public.renew_ad(p_ad_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ads
  set status = 'active', expires_at = now() + interval '30 days'
  where id = p_ad_id and user_id = auth.uid() and status in ('active', 'closed');
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
end;
$$;

-- Marks an ad sold. The buyer must be someone who chatted about the ad, which
-- is what makes the later two-way rating trustworthy. p_buyer may be null when
-- it sold elsewhere (then nobody is asked to rate).
create or replace function public.mark_sold(p_ad_id bigint, p_buyer uuid, p_price numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_buyer is not null and not exists (
    select 1 from public.conversations
    where ad_id = p_ad_id and buyer_id = p_buyer and seller_id = auth.uid()
  ) then
    raise exception 'buyer_not_in_chats' using errcode = 'P0001';
  end if;

  update public.ads
  set status = 'sold', sold_to = p_buyer, sold_price = p_price, sold_at = now()
  where id = p_ad_id and user_id = auth.uid() and status in ('active', 'closed');
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
end;
$$;

-------------------------------------------------------------------------------
-- Contact details, chat, blocking
-------------------------------------------------------------------------------

create table public.contact_reveals (
  id bigint generated always as identity primary key,
  ad_id bigint not null references public.ads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index contact_reveals_user_idx on public.contact_reveals (user_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- Signed-in users get one seller's number per call; capped at 40 a day to
-- stop scraping.
create or replace function public.reveal_contact(p_ad_id bigint)
returns table (phone text, allow_calls boolean, allow_whatsapp boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;

  select user_id into v_seller from public.ads
  where id = p_ad_id and status = 'active' and expires_at > now();
  if v_seller is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if public.is_blocked_between(auth.uid(), v_seller) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  if v_seller <> auth.uid() then
    if (select count(*) from public.contact_reveals
        where user_id = auth.uid() and created_at > now() - interval '24 hours') >= 40 then
      raise exception 'reveal_limit' using errcode = 'P0001';
    end if;
    insert into public.contact_reveals (ad_id, user_id) values (p_ad_id, auth.uid());
  end if;

  return query
  select c.phone, c.allow_calls, c.allow_whatsapp
  from public.profile_contacts c
  where c.user_id = v_seller and c.phone is not null;
end;
$$;

create table public.conversations (
  id bigint generated always as identity primary key,
  ad_id bigint not null references public.ads (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  buyer_last_read_at timestamptz not null default now(),
  seller_last_read_at timestamptz not null default 'epoch',
  buyer_notified_at timestamptz,
  seller_notified_at timestamptz,
  unique (ad_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.start_conversation(p_ad_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  if (select is_banned from public.profiles where id = auth.uid()) then
    raise exception 'banned' using errcode = 'P0001';
  end if;

  select user_id into v_seller from public.ads
  where id = p_ad_id and status = 'active' and expires_at > now();
  if v_seller is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_seller = auth.uid() then
    raise exception 'own_ad' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(auth.uid(), v_seller) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  insert into public.conversations (ad_id, buyer_id, seller_id)
  values (p_ad_id, auth.uid(), v_seller)
  on conflict (ad_id, buyer_id) do update set ad_id = excluded.ad_id
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      buyer_last_read_at = case when buyer_id = new.sender_id then new.created_at else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = new.sender_id then new.created_at else seller_last_read_at end
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

create or replace function public.mark_conversation_read(p_conversation_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversations
  set buyer_last_read_at = case when buyer_id = auth.uid() then now() else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = auth.uid() then now() else seller_last_read_at end
  where id = p_conversation_id and auth.uid() in (buyer_id, seller_id)
$$;

-------------------------------------------------------------------------------
-- Saving, reports, ratings, business verification
-------------------------------------------------------------------------------

create table public.saved_ads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  ad_id bigint not null references public.ads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ad_id)
);

create table public.saved_searches (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- The search page's query string as an object, e.g. {"category":"cars","q":"camry"}.
  params jsonb not null check (jsonb_typeof(params) = 'object'),
  email_alerts boolean not null default true,
  last_alerted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  ad_id bigint references public.ads (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('scam', 'wrong_category', 'duplicate', 'offensive', 'sold', 'prohibited', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check (ad_id is not null or reported_user_id is not null)
);
create index reports_open_idx on public.reports (created_at) where status = 'open';

create table public.ratings (
  id bigint generated always as identity primary key,
  ad_id bigint not null references public.ads (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  -- The role the rated person played in the deal.
  ratee_role text not null check (ratee_role in ('seller', 'buyer')),
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (ad_id, rater_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id, ratee_role);

create view public.profile_rating_summary
with (security_invoker = true)
as
select
  ratee_id as user_id,
  ratee_role as role,
  round(avg(stars)::numeric, 1) as average,
  count(*)::int as count
from public.ratings
group by ratee_id, ratee_role;

create table public.business_verifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_type text not null check (business_type in ('dealer', 'agency', 'employer')),
  business_name text not null check (char_length(business_name) between 2 and 120),
  cr_number text not null check (cr_number ~ '^[0-9]{10}$'),
  fal_licence text check (char_length(fal_licence) <= 30),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (business_type <> 'agency' or coalesce(fal_licence, '') <> '')
);
create index business_verifications_pending_idx on public.business_verifications (created_at) where status = 'pending';

create table public.cartlow_clicks (
  id bigint generated always as identity primary key,
  cartlow_price_id bigint not null references public.cartlow_prices (id) on delete cascade,
  ad_id bigint references public.ads (id) on delete set null,
  created_at timestamptz not null default now()
);
create index cartlow_clicks_price_idx on public.cartlow_clicks (cartlow_price_id, created_at);

-------------------------------------------------------------------------------
-- Admin actions
-------------------------------------------------------------------------------

create or replace function public.admin_set_ad_status(p_ad_id bigint, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if p_status not in ('active', 'rejected', 'removed') then raise exception 'bad_status'; end if;
  update public.ads
  set status = p_status,
      moderation_note = p_note,
      expires_at = case when p_status = 'active' and status = 'pending'
                        then now() + interval '30 days' else expires_at end
  where id = p_ad_id;
end;
$$;

create or replace function public.admin_review_business(p_id bigint, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.business_verifications;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  update public.business_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      admin_note = p_note,
      reviewed_at = now()
  where id = p_id
  returning * into v;

  if p_approve then
    update public.profiles
    set verified_business = true, seller_type = v.business_type, business_name = v.business_name
    where id = v.user_id;
  end if;
end;
$$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  update public.profiles set is_banned = p_banned where id = p_user and role <> 'admin';
  if p_banned then
    update public.ads set status = 'removed', moderation_note = 'user_banned'
    where user_id = p_user and status in ('active', 'pending');
  end if;
end;
$$;

create or replace function public.admin_set_report_status(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  update public.reports set status = p_status where id = p_id;
end;
$$;

-------------------------------------------------------------------------------
-- Row Level Security and grants
-------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.blocked_email_domains enable row level security;
alter table public.banned_words enable row level security;
alter table public.ads enable row level security;
alter table public.cartlow_prices enable row level security;
alter table public.contact_reveals enable row level security;
alter table public.blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_ads enable row level security;
alter table public.saved_searches enable row level security;
alter table public.reports enable row level security;
alter table public.ratings enable row level security;
alter table public.business_verifications enable row level security;
alter table public.cartlow_clicks enable row level security;

-- Start from nothing and grant exactly what the app uses.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.normalize_ar(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.cartlow_match(text, text, text) to anon, authenticated;
grant execute on function public.close_ad(bigint) to authenticated;
grant execute on function public.renew_ad(bigint) to authenticated;
grant execute on function public.mark_sold(bigint, uuid, numeric) to authenticated;
grant execute on function public.reveal_contact(bigint) to authenticated;
grant execute on function public.start_conversation(bigint) to authenticated;
grant execute on function public.mark_conversation_read(bigint) to authenticated;
grant execute on function public.admin_set_ad_status(bigint, text, text) to authenticated;
grant execute on function public.admin_review_business(bigint, boolean, text) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;
grant execute on function public.admin_set_report_status(bigint, text) to authenticated;
-- refresh_price_ratings and compute_price_rating: service role only (cron).

-- profiles: public read; owners edit their own display fields only.
grant select on public.profiles to anon, authenticated;
grant update (display_name, seller_type, business_name, preferred_locale) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, update (phone, allow_calls, allow_whatsapp, updated_at) on public.profile_contacts to authenticated;
create policy contacts_own on public.profile_contacts for select using (user_id = auth.uid());
create policy contacts_update_own on public.profile_contacts for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.banned_words to authenticated;
create policy banned_words_admin on public.banned_words for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, delete on public.blocked_email_domains to authenticated;
create policy blocked_domains_admin on public.blocked_email_domains for all using (public.is_admin()) with check (public.is_admin());

-- ads: anyone reads live/sold/closed ads; owners and admins see the rest.
grant select on public.ads to anon, authenticated;
grant insert (user_id, category, subcategory, city, district, title, description, price, price_period,
              attributes, brand, model, year, mileage_km, bedrooms, size_m2, lat, lng, photos, photo_hashes)
  on public.ads to authenticated;
grant update (subcategory, city, district, title, description, price, price_period,
              attributes, brand, model, year, mileage_km, bedrooms, size_m2, lat, lng, photos, photo_hashes)
  on public.ads to authenticated;
create policy ads_read on public.ads for select
  using (status in ('active', 'sold', 'closed') or user_id = auth.uid() or public.is_admin());
create policy ads_insert_own on public.ads for insert to authenticated
  with check (user_id = auth.uid());
create policy ads_update_own on public.ads for update to authenticated
  using (user_id = auth.uid() and status in ('active', 'pending', 'closed'))
  with check (user_id = auth.uid());
create policy ads_delete_own on public.ads for delete to authenticated
  using (user_id = auth.uid() and status <> 'sold');
grant delete on public.ads to authenticated;

grant select on public.cartlow_prices to anon, authenticated;
grant insert, update, delete on public.cartlow_prices to authenticated;
create policy cartlow_read on public.cartlow_prices for select using (true);
create policy cartlow_admin_insert on public.cartlow_prices for insert with check (public.is_admin());
create policy cartlow_admin_update on public.cartlow_prices for update using (public.is_admin()) with check (public.is_admin());
create policy cartlow_admin_delete on public.cartlow_prices for delete using (public.is_admin());

grant select on public.cartlow_clicks to authenticated;
create policy cartlow_clicks_admin on public.cartlow_clicks for select using (public.is_admin());

grant select on public.contact_reveals to authenticated;
create policy reveals_admin on public.contact_reveals for select using (public.is_admin());

grant select, insert, delete on public.blocks to authenticated;
create policy blocks_own on public.blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

grant select on public.conversations to authenticated;
create policy conversations_participants on public.conversations for select
  using (auth.uid() in (buyer_id, seller_id));

grant select, insert (conversation_id, sender_id, body) on public.messages to authenticated;
create policy messages_read on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
  ));
create policy messages_send on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and not (select is_banned from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
        and not public.is_blocked_between(c.buyer_id, c.seller_id)
    )
  );

grant select, insert, delete on public.saved_ads to authenticated;
create policy saved_ads_own on public.saved_ads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete, update (name, email_alerts) on public.saved_searches to authenticated;
create policy saved_searches_own on public.saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert (reporter_id, ad_id, reported_user_id, reason, details) on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_read on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

-- ratings: only the two people in a sold deal can rate each other, once.
grant select on public.ratings to anon, authenticated;
grant select on public.profile_rating_summary to anon, authenticated;
grant insert (ad_id, rater_id, ratee_id, ratee_role, stars, comment) on public.ratings to authenticated;
create policy ratings_read on public.ratings for select using (true);
create policy ratings_insert on public.ratings for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.ads a
      where a.id = ad_id and a.status = 'sold' and a.sold_to is not null
        and (
          (a.user_id = auth.uid() and ratee_id = a.sold_to and ratee_role = 'buyer')
          or (a.sold_to = auth.uid() and ratee_id = a.user_id and ratee_role = 'seller')
        )
    )
  );

grant select, insert (user_id, business_type, business_name, cr_number, fal_licence)
  on public.business_verifications to authenticated;
create policy business_insert on public.business_verifications for insert to authenticated
  with check (user_id = auth.uid());
create policy business_read on public.business_verifications for select
  using (user_id = auth.uid() or public.is_admin());

-------------------------------------------------------------------------------
-- Realtime chat and photo storage (Supabase-specific; skipped elsewhere)
-------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-photos', 'ad-photos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Photos are stored as <user id>/<file>; users only write inside their folder.
create policy ad_photos_read on storage.objects for select
  using (bucket_id = 'ad-photos');
create policy ad_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy ad_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ad-photos' and (storage.foldername(name))[1] = auth.uid()::text);
