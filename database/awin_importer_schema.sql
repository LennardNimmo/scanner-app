-- SlimBesteld Awin importer schema additions.
-- Run this in Supabase SQL Editor after the affiliate schema is installed.

create extension if not exists "uuid-ossp";

alter table affiliate_sources add column if not exists name text;
alter table affiliate_sources add column if not exists advertiser_id text;
alter table affiliate_sources add column if not exists delimiter text not null default '|';
alter table affiliate_sources add column if not exists compression text not null default 'gzip';
alter table affiliate_sources add column if not exists format text not null default 'csv';
alter table affiliate_sources add column if not exists last_started_at timestamptz;
alter table affiliate_sources add column if not exists last_error_message text;
alter table affiliate_sources add column if not exists rows_read integer not null default 0;
alter table affiliate_sources add column if not exists rows_imported integer not null default 0;
alter table affiliate_sources add column if not exists rows_failed integer not null default 0;
alter table affiliate_sources add column if not exists stale_after_hours integer not null default 24;

alter table affiliate_offers add column if not exists source_id uuid references affiliate_sources(id) on delete set null;
alter table affiliate_offers add column if not exists stock_quantity integer;
alter table affiliate_offers add column if not exists delivery_cost_cents integer;
alter table affiliate_offers add column if not exists delivery_time_text text;
alter table affiliate_offers add column if not exists savings_percent numeric(7,2);
alter table affiliate_offers add column if not exists saving_cents integer;
alter table affiliate_offers add column if not exists source_row_hash text;
alter table affiliate_offers add column if not exists price_updated_at timestamptz;

create index if not exists idx_affiliate_sources_network_active on affiliate_sources(network, active);
create index if not exists idx_affiliate_offers_source_seen on affiliate_offers(source_id, last_seen_at);

create table if not exists import_jobs (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references affiliate_sources(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0,
  rows_imported integer not null default 0,
  rows_failed integer not null default 0,
  error_message text
);

create index if not exists idx_import_jobs_source_started on import_jobs(source_id, started_at desc);

create table if not exists offer_snapshots (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid references affiliate_offers(id) on delete cascade,
  price_cents integer,
  old_price_cents integer,
  availability text,
  stock_status text,
  captured_at timestamptz not null default now()
);

create index if not exists idx_offer_snapshots_offer_captured on offer_snapshots(offer_id, captured_at desc);

-- Example setup for one Awin webshop.
-- Replace the values before running, or add this manually in Supabase Table Editor.
--
-- insert into merchants (name, domain, affiliate_network, affiliate_program_id, active)
-- values ('NAAM WEBSHOP', 'voorbeeld.nl', 'awin', 'AWIN_ADVERTISER_ID', true)
-- returning id;
--
-- insert into affiliate_sources (
--   merchant_id, name, network, source_type, feed_url, delimiter, compression, format,
--   refresh_interval_minutes, active
-- ) values (
--   'MERCHANT_UUID_HIER',
--   'Awin productfeed NAAM WEBSHOP',
--   'awin',
--   'csv_feed',
--   'ZET_HIER_DE_AWIN_PRODUCTFEED_URL',
--   '|',
--   'gzip',
--   'csv',
--   60,
--   true
-- );
--
-- insert into affiliate_shipping_rules (
--   merchant_id, country, base_shipping_cents, free_shipping_threshold_cents,
--   delivery_days_min, delivery_days_max, notes
-- ) values (
--   'MERCHANT_UUID_HIER', 'NL', 495, 3000, 1, 3, 'Handmatig ingesteld. Controleer periodiek.'
-- );
