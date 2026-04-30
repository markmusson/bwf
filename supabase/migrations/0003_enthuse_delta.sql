-- Enthuse-pattern delta — applied after 0001 + 0002.
-- Source: design/04-enthuse-pattern-findings.md §4 (marketing consent),
-- §5 (Gift Aid confirmations), and design/06-locked-from-adam.md (claim tags).

-- =====================================================================
-- DONORS — marketing consent must be a positive choice (PECR/GDPR).
-- Drop NOT NULL + default so we can distinguish "not asked" from
-- "explicit no". Application layer enforces non-null at capture time.
-- Add a timestamp column for ICO defensibility.
-- =====================================================================
alter table donors alter column marketing_opt_in drop not null;
alter table donors alter column marketing_opt_in drop default;

alter table donors
  add column if not exists marketing_consent_recorded_at timestamptz;

-- =====================================================================
-- DONATIONS — record the three Gift Aid confirmations as JSONB so we
-- can produce the original declaration if HMRC asks. Shape:
--   {
--     "uk_taxpayer": true,
--     "own_money": true,
--     "no_benefit": true,
--     "declared_at": "2026-05-15T12:00:00Z"
--   }
-- The summary boolean donations.gift_aid stays as the fast filter.
-- =====================================================================
alter table donations
  add column if not exists gift_aid_confirmations jsonb;

-- =====================================================================
-- CLAIMS — open-ended tag for sponsor blocks, memorial seats, etc.
-- Per design/06-locked-from-adam.md: a sponsor is a donor with a
-- non-personal display_name and a bulk of claims; the tag lets us
-- filter without bolting on a separate sponsors table.
-- =====================================================================
alter table claims
  add column if not exists tag text;
create index if not exists claims_tag_idx on claims(tag);
