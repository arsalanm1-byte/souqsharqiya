-- Behavioural tests for the schema: moderation, limits, price rating, RLS,
-- chat, ratings. Run with scripts/test-db.sh.

create schema test;
grant usage on schema test to anon, authenticated;

create function test.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
  if p_id is null then
    execute 'set role anon';
  else
    execute 'set role authenticated';
  end if;
end;
$$;
grant execute on function test.as_user(uuid) to anon, authenticated;

create function test.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok: %', label;
end;
$$;
grant execute on function test.check(boolean, text) to anon, authenticated;

-- Runs a statement that must fail; passes when the error message contains p_expect.
create function test.fails(p_sql text, p_expect text, label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_expect in sqlerrm) > 0 then
      raise notice 'ok: %', label;
      return;
    end if;
    raise exception 'FAILED: % (wrong error: %)', label, sqlerrm;
  end;
  raise exception 'FAILED: % (statement succeeded)', label;
end;
$$;
grant execute on function test.fails(text, text, text) to anon, authenticated;

\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer   '''22222222-2222-2222-2222-222222222222'''
\set other   '''33333333-3333-3333-3333-333333333333'''
\set admin   '''44444444-4444-4444-4444-444444444444'''
\set fresh   '''55555555-5555-5555-5555-555555555555'''
\set unconf  '''66666666-6666-6666-6666-666666666666'''

-------------------------------------------------------------------------------
-- Sign-up
-------------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at) values
  (:seller, 'seller@example.com', now(), '{"full_name":"Fahad Seller"}', now() - interval '60 days'),
  (:buyer,  'buyer@example.com',  now(), '{}', now() - interval '60 days'),
  (:other,  'other@example.com',  now(), '{}', now() - interval '60 days'),
  (:admin,  'admin@example.com',  now(), '{}', now() - interval '60 days'),
  (:fresh,  'fresh@example.com',  now(), '{}', now()),
  (:unconf, 'unconf@example.com', null,  '{}', now() - interval '60 days');
update public.profiles set role = 'admin' where id = :admin;
update public.profile_contacts set phone = '+966501234567' where user_id = :seller;

select test.check((select display_name from profiles where id = :seller) = 'Fahad Seller', 'profile created from sign-up name');
select test.check((select display_name from profiles where id = :buyer) = 'buyer', 'profile name falls back to email');
select test.fails(
  $$insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'x@mailinator.com')$$,
  'disposable_email', 'disposable email domains are refused');

-------------------------------------------------------------------------------
-- Posting and moderation
-------------------------------------------------------------------------------
select test.as_user(:seller);

insert into ads (user_id, category, subcategory, city, title, description, price)
values (:seller, 'electronics', 'mobiles', 'dammam', 'First ad phone', 'A description long enough', 900);
select test.check((select status from ads where title = 'First ad phone') = 'pending', 'first ad of a new seller waits for review');
select test.check((select moderation_note from ads where title = 'First ad phone') = 'new_account', 'review reason recorded');

select test.fails(
  $$insert into ads (user_id, category, subcategory, city, title, description, price, status)
    values ('11111111-1111-1111-1111-111111111111', 'electronics', 'mobiles', 'dammam', 'Sneaky status', 'A description long enough', 900, 'active')$$,
  'permission denied', 'users cannot set ad status on insert');

select test.fails(
  $$insert into ads (user_id, category, subcategory, city, title, description, price)
    values ('22222222-2222-2222-2222-222222222222', 'electronics', 'mobiles', 'dammam', 'Not mine', 'A description long enough', 900)$$,
  'not_owner', 'users cannot post as someone else');

select test.fails(
  $$insert into ads (user_id, category, subcategory, city, title, description, price, size_m2, bedrooms, attributes)
    values ('11111111-1111-1111-1111-111111111111', 'housing', 'sale-villa', 'khobar', 'Villa for sale', 'A description long enough', 900000, 300, 4, '{}')$$,
  'rega_licence_required', 'property sales need a REGA licence number');

insert into ads (user_id, category, subcategory, city, title, description, price)
values (:seller, 'electronics', 'mobiles', 'dammam', 'Second ad phone', 'A description long enough', 900);

reset role;
select test.as_user(:admin);
select admin_set_ad_status(id, 'active') from ads where status = 'pending';
reset role;

select test.as_user(:seller);
insert into ads (user_id, category, subcategory, city, title, description, price)
values (:seller, 'electronics', 'mobiles', 'dammam', 'Third ad phone', 'A description long enough', 900);
select test.check((select status from ads where title = 'Third ad phone') = 'active', 'trusted seller ads go live at once');

insert into ads (user_id, category, subcategory, city, title, description, price)
values (:seller, 'electronics', 'mobiles', 'dammam', 'Cheap كبتاجون here', 'A description long enough', 900);
select test.check((select status from ads where title like 'Cheap%') = 'pending', 'banned words send an ad to review');

select test.fails(
  $$update ads set status = 'active' where title like 'Cheap%'$$,
  'permission denied', 'owners cannot approve their own ads');
select test.fails(
  $$update ads set price_rating = 'great' where title = 'Third ad phone'$$,
  'permission denied', 'owners cannot set the price rating');
reset role;

select test.as_user(:unconf);
select test.fails(
  $$insert into ads (user_id, category, subcategory, city, title, description, price)
    values ('66666666-6666-6666-6666-666666666666', 'electronics', 'mobiles', 'dammam', 'Unconfirmed', 'A description long enough', 900)$$,
  'email_not_confirmed', 'unconfirmed emails cannot post');
reset role;

select test.as_user(:fresh);
insert into ads (user_id, category, subcategory, city, title, description, price)
select :fresh, 'jobs', 'hiring', 'dammam', 'Job number ' || g, 'A description long enough', 5000 from generate_series(1, 3) g;
select test.fails(
  $$insert into ads (user_id, category, subcategory, city, title, description, price)
    values ('55555555-5555-5555-5555-555555555555', 'jobs', 'hiring', 'dammam', 'Job number 4', 'A description long enough', 5000)$$,
  'daily_limit', 'new accounts are limited to 3 ads a day');
reset role;

-------------------------------------------------------------------------------
-- Visibility
-------------------------------------------------------------------------------
select test.as_user(null);
select test.check((select count(*) from ads where title like 'Cheap%') = 0, 'visitors cannot see ads under review');
select test.check((select count(*) from ads where title = 'Third ad phone') = 1, 'visitors can see live ads');
select test.fails($$select * from profile_contacts$$, 'permission denied', 'visitors cannot read phone numbers');
select test.fails($$select * from reveal_contact(1)$$, 'permission denied', 'visitors cannot reveal phone numbers');
reset role;

select test.as_user(:buyer);
select test.check((select count(*) from profile_contacts) = 1, 'users only see their own contact row');
select test.check(
  (select phone from reveal_contact((select id from ads where title = 'Third ad phone'))) = '+966501234567',
  'signed-in users can reveal a seller phone');
select test.check((select count(*) from contact_reveals) = 0, 'reveal log is admin-only');
reset role;

-------------------------------------------------------------------------------
-- Price rating
-------------------------------------------------------------------------------
-- Comparable ads are inserted directly (bypassing moderation) by the superuser.
alter table ads disable trigger ads_before_insert;
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, year, mileage_km, status)
select :other, 'cars', 'cars-for-sale', 'dammam', 'Toyota Camry ' || g, 'A description long enough',
       60000 + g * 1000, 'Toyota', 'Camry', 2020, 80000, 'active'
from generate_series(1, 11) g;                       -- median 66,000
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, year, mileage_km, status)
values (:other, 'cars', 'cars-for-sale', 'dammam', 'Joke price Camry', 'A description long enough', 1, 'Toyota', 'Camry', 2020, 80000, 'active');
alter table ads enable trigger ads_before_insert;

select test.as_user(:seller);
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, year, mileage_km)
values (:seller, 'cars', 'cars-for-sale', 'khobar', 'My Camry great', 'A description long enough', 55000, 'toyota', 'camry', 2021, 90000);
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, year, mileage_km)
values (:seller, 'cars', 'cars-for-sale', 'khobar', 'My Camry high', 'A description long enough', 80000, 'Toyota', 'Camry', 2020, 80000);
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, year, mileage_km)
values (:seller, 'cars', 'cars-for-sale', 'khobar', 'Old Camry', 'A description long enough', 30000, 'Toyota', 'Camry', 2012, 200000);
reset role;

select test.check((select price_rating from ads where title = 'My Camry great') = 'great', 'price >10% under median is Great');
select test.check((select price_median from ads where title = 'My Camry great') = 66000, 'median ignores joke prices');
select test.check((select price_rating from ads where title = 'My Camry high') = 'high', 'price >10% over median is High');
select test.check((select price_rating from ads where title = 'Old Camry') is null, 'no rating without 10 comparable ads');

select test.as_user(:seller);
update ads set price = 65000 where title = 'My Camry high';  -- median is now 65,500
reset role;
select test.check((select price_rating from ads where title = 'My Camry high') = 'good', 'rating updates when the price changes');

insert into cartlow_prices (brand, model, storage, price, url)
values ('Apple', 'iPhone 13', '128GB', 1500, 'https://cartlow.com/sa/en/example');
select test.as_user(:seller);
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, attributes)
values (:seller, 'electronics', 'mobiles', 'dammam', 'iPhone 13 overpriced', 'A description long enough', 1800, 'apple', 'iphone 13', '{"storage":"128GB","condition":"good"}');
insert into ads (user_id, category, subcategory, city, title, description, price, brand, model, attributes)
values (:seller, 'electronics', 'mobiles', 'dammam', 'iPhone 13 fine', 'A description long enough', 1200, 'Apple', 'iPhone 13', '{"storage":"128GB","condition":"good"}');
reset role;
select test.check((select price_rating from ads where title = 'iPhone 13 overpriced') = 'high', 'electronics above Cartlow refurbished price are High');
select test.check((select price_rating from ads where title = 'iPhone 13 fine') is null, 'below Cartlow with no comps has no rating');

select test.as_user(:seller);
select test.fails($$insert into cartlow_prices (brand, model, price, url) values ('a', 'b', 1, 'https://x')$$,
  'row-level security', 'only admins edit Cartlow prices');
reset role;

-------------------------------------------------------------------------------
-- Chat, sale and two-way ratings
-------------------------------------------------------------------------------
select test.as_user(:buyer);
select start_conversation((select id from ads where title = 'Third ad phone'));
insert into messages (conversation_id, sender_id, body)
values ((select id from conversations limit 1), :buyer, 'Is it available?');
select test.check(
  (select start_conversation((select id from ads where title = 'Third ad phone'))) = (select id from conversations limit 1),
  'starting a chat twice reuses the conversation');
reset role;

select test.as_user(:other);
select test.check((select count(*) from messages) = 0, 'outsiders cannot read a chat');
select test.fails(
  $$insert into messages (conversation_id, sender_id, body) values ((select min(id) from conversations), '33333333-3333-3333-3333-333333333333', 'hi')$$,
  'row-level security', 'outsiders cannot write into a chat');
reset role;

select test.as_user(:seller);
select test.check((select count(*) from messages) = 1, 'seller sees the buyer message');
select test.fails(
  $$select mark_sold((select id from ads where title = 'Third ad phone'), '33333333-3333-3333-3333-333333333333', 850)$$,
  'buyer_not_in_chats', 'sold-to must be someone who chatted');
select mark_sold((select id from ads where title = 'Third ad phone'), :buyer, 850);
insert into ratings (ad_id, rater_id, ratee_id, ratee_role, stars, comment)
values ((select id from ads where title = 'Third ad phone'), :seller, :buyer, 'buyer', 5, 'Paid on time');
select test.fails(
  $$insert into ratings (ad_id, rater_id, ratee_id, ratee_role, stars)
    values ((select id from ads where title = 'Third ad phone'), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'buyer', 1)$$,
  'duplicate key', 'one rating per person per deal');
reset role;

select test.as_user(:buyer);
insert into ratings (ad_id, rater_id, ratee_id, ratee_role, stars)
values ((select id from ads where title = 'Third ad phone'), :buyer, :seller, 'seller', 4);
reset role;

select test.as_user(:other);
select test.fails(
  $$insert into ratings (ad_id, rater_id, ratee_id, ratee_role, stars)
    values ((select id from ads where title = 'Third ad phone'), '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'seller', 1)$$,
  'row-level security', 'people outside the deal cannot rate');
reset role;

select test.as_user(null);
select test.check(
  (select average from profile_rating_summary where user_id = :seller and role = 'seller') = 4.0,
  'seller score is public');
select test.check(
  (select average from profile_rating_summary where user_id = :buyer and role = 'buyer') = 5.0,
  'buyer score is public');
reset role;

-------------------------------------------------------------------------------
-- Admin
-------------------------------------------------------------------------------
select test.as_user(:seller);
select test.fails($$select admin_set_banned('22222222-2222-2222-2222-222222222222', true)$$, 'admin_only', 'non-admins cannot ban');
insert into business_verifications (user_id, business_type, business_name, cr_number)
values (:seller, 'dealer', 'Fahad Motors', '2050012345');
reset role;

select test.as_user(:admin);
select admin_review_business((select id from business_verifications limit 1), true);
select admin_set_banned(:fresh, true);
reset role;
select test.check((select verified_business from profiles where id = :seller), 'approved business gets the badge');
select test.check(
  (select count(*) from ads where user_id = :fresh and status <> 'removed') = 0,
  'banning removes the user''s ads');

select test.as_user(:buyer);
select test.fails($$update profiles set verified_business = true where id = '22222222-2222-2222-2222-222222222222'$$,
  'permission denied', 'users cannot give themselves the business badge');
reset role;

select test.check(refresh_price_ratings() >= 0, 'nightly refresh runs');
