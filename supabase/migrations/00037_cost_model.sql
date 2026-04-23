-- =====================================================================
-- Migration: 00037_cost_model.sql
-- Description: Fully-dynamic cost model — categories, line items, settings
--              Feeds the pricing health dashboard and proposal builder.
--              Everything is editable from the admin UI; Excel values are
--              seeded as a starting point only.
-- Created: 2026-04-23
-- =====================================================================

-- =====================================================================
-- 1. COST CATEGORIES (dynamic — admin can add/rename/delete/reorder)
-- =====================================================================

create table if not exists public.cost_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_cost_categories_sort on public.cost_categories(sort_order);
create unique index if not exists idx_cost_categories_name_unique
  on public.cost_categories(lower(name)) where active;

-- =====================================================================
-- 2. COST ITEMS (salaries, operational, equipment, production, etc.)
--    An "employee" is just a row with subcategory = 'Μισθός'.
--    Adding/renaming/removing an employee = adding/editing/deactivating a row.
-- =====================================================================

create table if not exists public.cost_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.cost_categories(id) on delete restrict,
  subcategory   text,                               -- e.g. 'Μισθός', 'Bonus', 'Freelancers'
  description   text,                               -- e.g. 'Χριστίνα Τσατσά', 'Internet'
  monthly_cost  numeric(12,2) not null default 0,
  comments      text,
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_by    uuid references auth.users(id) on delete set null
);

create index if not exists idx_cost_items_category on public.cost_items(category_id);
create index if not exists idx_cost_items_active   on public.cost_items(active);
create index if not exists idx_cost_items_sort     on public.cost_items(sort_order);

-- =====================================================================
-- 3. COST SETTINGS (singleton: the coefficients that drive pricing)
-- =====================================================================

create table if not exists public.cost_settings (
  id                        int primary key default 1 check (id = 1),
  expected_monthly_hours    numeric(8,2)  not null default 352,
  default_margin            numeric(5,4)  not null default 0.60,
  price_min_multiplier      numeric(5,4)  not null default 1.30,
  price_target_multiplier   numeric(5,4)  not null default 1.60,
  price_max_multiplier      numeric(5,4)  not null default 2.00,
  discount_first_months     int           not null default 6,
  discount_first_percent    numeric(5,4)  not null default 0.10,
  vat_percent               numeric(5,4)  not null default 0.24,
  deposit_percent           numeric(5,4)  not null default 0.50,
  updated_at                timestamptz   not null default now(),
  updated_by                uuid references auth.users(id) on delete set null
);

-- Singleton row
insert into public.cost_settings (id) values (1)
  on conflict (id) do nothing;

-- =====================================================================
-- 4. updated_at triggers (reuse handle_updated_at if it exists,
--    otherwise define a local one)
-- =====================================================================

create or replace function public.cost_model_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cost_categories_updated_at on public.cost_categories;
create trigger trg_cost_categories_updated_at
  before update on public.cost_categories
  for each row execute function public.cost_model_touch_updated_at();

drop trigger if exists trg_cost_items_updated_at on public.cost_items;
create trigger trg_cost_items_updated_at
  before update on public.cost_items
  for each row execute function public.cost_model_touch_updated_at();

drop trigger if exists trg_cost_settings_updated_at on public.cost_settings;
create trigger trg_cost_settings_updated_at
  before update on public.cost_settings
  for each row execute function public.cost_model_touch_updated_at();

-- =====================================================================
-- 5. RLS — admin / super_admin only
-- =====================================================================

alter table public.cost_categories enable row level security;
alter table public.cost_items      enable row level security;
alter table public.cost_settings   enable row level security;

-- categories
create policy "Admins full access to cost_categories"
  on public.cost_categories for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  );

-- items
create policy "Admins full access to cost_items"
  on public.cost_items for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  );

-- settings
create policy "Admins full access to cost_settings"
  on public.cost_settings for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  );

-- =====================================================================
-- 6. SEED DATA (initial starting point from Excel — fully editable after)
-- =====================================================================

-- Categories
insert into public.cost_categories (name, sort_order) values
  ('Ανθρώπινο Κόστος',   10),
  ('Λειτουργικά',        20),
  ('Εξοπλισμός',         30),
  ('Παραγωγή',           40),
  ('Marketing & Sales',  50),
  ('Φόροι & Ασφάλεια',   60)
on conflict do nothing;

-- Items (only seed if the table is empty — idempotent-ish)
do $$
declare
  v_human      uuid;
  v_ops        uuid;
  v_equip      uuid;
  v_prod       uuid;
  v_marketing  uuid;
  v_tax        uuid;
begin
  if (select count(*) from public.cost_items) > 0 then
    return;
  end if;

  select id into v_human     from public.cost_categories where name = 'Ανθρώπινο Κόστος';
  select id into v_ops       from public.cost_categories where name = 'Λειτουργικά';
  select id into v_equip     from public.cost_categories where name = 'Εξοπλισμός';
  select id into v_prod      from public.cost_categories where name = 'Παραγωγή';
  select id into v_marketing from public.cost_categories where name = 'Marketing & Sales';
  select id into v_tax       from public.cost_categories where name = 'Φόροι & Ασφάλεια';

  -- Ανθρώπινο Κόστος
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, comments, sort_order) values
    (v_human, 'Μισθός',      'Χριστίνα Τσατσά',     1210.00, null, 10),
    (v_human, 'Μισθός',      'Άγγελος Ντεβρεντλής', 1600.00, null, 20),
    (v_human, 'Μισθός',      'Πλάτωνας',             605.00, null, 30),
    (v_human, 'Μισθός',      'Μαρία',                605.00, null, 40),
    (v_human, 'Bonus',       null,                   200.00, null, 50),
    (v_human, 'Freelancers', null,                   100.00, 'Αυγουστίνος', 60);

  -- Λειτουργικά
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, sort_order) values
    (v_ops, 'Ενοίκιο γραφείου',     null,   0.00,  10),
    (v_ops, 'Κοινόχρηστα',          null,   0.00,  20),
    (v_ops, 'Ρεύμα',                null,   0.00,  30),
    (v_ops, 'Internet',             null,   0.00,  40),
    (v_ops, 'Νερό / Καύσιμα',       null,  27.00,  50),
    (v_ops, 'Καθαριότητα',          null,   0.00,  60),
    (v_ops, 'Consulting',           null, 300.00,  70),
    (v_ops, 'Τηλέφωνο',             null,  50.00,  80),
    (v_ops, 'Τραπεζικά / POS',      null,   5.00,  90),
    (v_ops, 'Συνδρομές',            null,   0.00, 100),
    (v_ops, 'Software subscriptions', null, 159.30, 110),
    (v_ops, 'Cloud storage',        null,  20.00, 120),
    (v_ops, 'Domain / Hosting',     null,  18.00, 130);

  -- Εξοπλισμός
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, sort_order) values
    (v_equip, 'Κάμερες',       null, 391.67, 10),
    (v_equip, 'Φακοί',         null,   0.00, 20),
    (v_equip, 'Ήχος',          null, 350.00, 30),
    (v_equip, 'Αξεσουάρ',      null, 200.00, 40),
    (v_equip, 'Φώτα',          null,  41.67, 50),
    (v_equip, 'Monitors',      null, 200.00, 60),
    (v_equip, 'Drone',         null, 125.00, 70);

  -- Παραγωγή
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, sort_order) values
    (v_prod, 'Shooting day',          null, 15.00, 10),
    (v_prod, 'Βενζίνη',               null, 10.00, 20),
    (v_prod, 'Parking / Διόδια',      null,  0.00, 30),
    (v_prod, 'Coordination cost',     null, 81.00, 40),
    (v_prod, 'Αναλώσιμα παραγωγής',   null, 50.00, 50),
    (v_prod, 'Location fees',         null,  0.00, 60),
    (v_prod, 'External συνεργάτες',   null,  0.00, 70);

  -- Marketing & Sales
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, comments, sort_order) values
    (v_marketing, 'Website',              null, 0.00, 'host only', 10),
    (v_marketing, 'Διαφήμιση',            null, 0.00, null, 20),
    (v_marketing, 'Social media',         null, 0.00, null, 30),
    (v_marketing, 'Portfolio material',   null, 0.00, null, 40),
    (v_marketing, 'Networking / Events',  null, 0.00, null, 50),
    (v_marketing, 'CRM tools',            null, 0.00, null, 60);

  -- Φόροι & Ασφάλεια
  insert into public.cost_items (category_id, subcategory, description, monthly_cost, comments, sort_order) values
    (v_tax, 'ΤΕΒΕ (εισφορές)',           null, 1200.00, null,            10),
    (v_tax, 'Φόρος εισοδήματος',         null,    0.00, 'Ετήσιος φόρος', 20),
    (v_tax, 'Λογιστικά (5-10%)',         null,  120.00, null,            30),
    (v_tax, 'Τέλη',                      null,   52.00, null,            40);
end$$;
