-- Initial schema for BWF Virtual Seats.
-- Source of truth: design/03-claude-code-prd.md §4. Apply with the Supabase
-- SQL editor or `supabase db push`. The Enthuse-pattern delta in
-- 0003_enthuse_delta.sql relaxes some columns added here, so apply 0001,
-- 0002, 0003 in order.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- SEATS — physical layout, seeded once from geometry
-- =====================================================================
create table seats (
  id              text primary key,
  stand_id        text not null,
  stand_name      text not null,
  row_index       int  not null,
  col_index       int  not null,
  tier            text not null check (tier in ('premium','standard','general')),
  base_price_pence int not null,
  x_coord         numeric(10,4),
  y_coord         numeric(10,4),
  is_disabled     boolean not null default false,
  created_at      timestamptz not null default now()
);
create index seats_stand_idx on seats(stand_id);

-- =====================================================================
-- DONORS — one per email
-- =====================================================================
create table donors (
  id                 uuid primary key default gen_random_uuid(),
  email              citext unique not null,
  full_name          text,
  address_line1      text,
  address_line2      text,
  city               text,
  postcode           text,
  is_uk_taxpayer     boolean,
  marketing_opt_in   boolean not null default false,
  created_at         timestamptz not null default now()
);

-- =====================================================================
-- DONATIONS — Stripe payment record
-- =====================================================================
create table donations (
  id                          uuid primary key default gen_random_uuid(),
  donor_id                    uuid not null references donors(id) on delete restrict,
  amount_pence                int  not null,
  base_amount_pence           int  not null,
  bump_amount_pence           int  not null default 0,
  gift_aid                    boolean not null default false,
  gift_aid_amount_pence       int  not null default 0,
  stripe_payment_intent_id    text unique,
  stripe_checkout_session_id  text unique,
  status                      text not null check (status in ('pending','succeeded','failed','refunded')),
  refunded_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  succeeded_at                timestamptz
);
create index donations_donor_idx on donations(donor_id);
create index donations_status_idx on donations(status);

-- =====================================================================
-- CLAIMS — the canonical "this seat is taken"
-- =====================================================================
create table claims (
  id                  uuid primary key default gen_random_uuid(),
  seat_id             text unique not null references seats(id),
  donor_id            uuid not null references donors(id),
  donation_id         uuid not null references donations(id),
  display_name        text,
  tribute_message     text check (length(tribute_message) <= 280),
  is_anonymous        boolean not null default false,
  is_amount_private   boolean not null default false,
  avatar_config       jsonb,
  moderation_status   text not null default 'auto_approved'
                      check (moderation_status in ('auto_approved','pending_review','approved','rejected')),
  moderation_notes    text,
  moderated_by        uuid,
  moderated_at        timestamptz,
  claimed_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index claims_donor_idx on claims(donor_id);
create index claims_moderation_idx on claims(moderation_status);

-- =====================================================================
-- SEAT_HOLDS — soft lock during checkout
-- =====================================================================
create table seat_holds (
  id          uuid primary key default gen_random_uuid(),
  seat_id     text not null references seats(id),
  session_id  text not null,
  donor_email citext,
  expires_at  timestamptz not null,
  released    boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index seat_holds_active_uniq
  on seat_holds(seat_id)
  where released = false and expires_at > now();

-- =====================================================================
-- PRIZE DRAW
-- =====================================================================
create table prize_entries (
  id           uuid primary key default gen_random_uuid(),
  donation_id  uuid references donations(id),
  donor_id     uuid references donors(id),
  source       text not null check (source in ('donation','postal')),
  eligible     boolean not null default true,
  created_at   timestamptz not null default now()
);
create index prize_entries_donation_idx on prize_entries(donation_id);
create index prize_entries_eligible_idx on prize_entries(eligible);

create table prize_draw_results (
  id                 uuid primary key default gen_random_uuid(),
  drawn_at           timestamptz not null default now(),
  drawn_by           text not null,
  total_entries      int not null,
  winning_entry_id   uuid not null references prize_entries(id),
  seed               text not null,
  notes              text
);

-- =====================================================================
-- AUDIT LOG
-- =====================================================================
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text,
  action      text not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_target_idx on audit_log(target_type, target_id);

-- =====================================================================
-- STRIPE EVENTS — idempotency
-- =====================================================================
create table stripe_events (
  id          text primary key,
  type        text not null,
  payload     jsonb not null,
  processed_at timestamptz not null default now()
);

-- =====================================================================
-- VIEWS
-- =====================================================================
create or replace view v_seat_status as
select
  s.id,
  s.stand_id,
  s.row_index,
  s.col_index,
  s.tier,
  case
    when s.is_disabled then 'disabled'
    when c.id is not null then 'claimed'
    when h.id is not null then 'held'
    else 'empty'
  end as state,
  c.is_anonymous as claim_is_anonymous,
  c.display_name as claim_display_name,
  c.avatar_config as claim_avatar_config
from seats s
left join claims c on c.seat_id = s.id
  and c.moderation_status in ('auto_approved','approved')
left join seat_holds h on h.seat_id = s.id and h.released = false and h.expires_at > now();

create or replace view v_campaign_stats as
select
  (select count(*) from claims) as seats_claimed,
  (select coalesce(sum(amount_pence + gift_aid_amount_pence), 0) from donations where status='succeeded') as total_raised_pence,
  (select count(*) from prize_entries where eligible = true) as prize_entries,
  (select count(*) from seats where not is_disabled) as total_seats;

-- =====================================================================
-- ROW-LEVEL SECURITY
-- =====================================================================
alter table seats enable row level security;
alter table claims enable row level security;
alter table donations enable row level security;
alter table donors enable row level security;
alter table seat_holds enable row level security;

grant select on v_seat_status to anon, authenticated;
grant select on v_campaign_stats to anon, authenticated;

create policy "donors_self_read" on donors for select
  using ( email = auth.jwt() ->> 'email' );
create policy "claims_self_read" on claims for select
  using ( donor_id in (select id from donors where email = auth.jwt() ->> 'email') );
create policy "claims_self_update" on claims for update
  using ( donor_id in (select id from donors where email = auth.jwt() ->> 'email') );
