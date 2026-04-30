-- fn_complete_claim — atomic donor upsert + donation insert + claim insert
-- + hold release + prize entry, called from the Stripe webhook handler on
-- checkout.session.completed. Runs as security definer so the webhook
-- service role can write through RLS. Returns the new ids for logging.
--
-- Source: design/03-claude-code-prd.md §4 migration 0002.

create or replace function fn_complete_claim(
  p_seat_id        text,
  p_donor_email    citext,
  p_donor_name     text,
  p_address_line1  text,
  p_address_line2  text,
  p_city           text,
  p_postcode       text,
  p_is_uk_taxpayer boolean,
  p_marketing_opt_in boolean,
  p_amount_pence   int,
  p_base_amount_pence int,
  p_bump_amount_pence int,
  p_gift_aid       boolean,
  p_gift_aid_amount_pence int,
  p_stripe_pi_id   text,
  p_stripe_cs_id   text,
  p_display_name   text,
  p_tribute        text,
  p_is_anonymous   boolean,
  p_is_amount_private boolean,
  p_avatar_config  jsonb,
  p_moderation_status text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_donor_id    uuid;
  v_donation_id uuid;
  v_claim_id    uuid;
begin
  insert into donors (
    email, full_name, address_line1, address_line2, city, postcode,
    is_uk_taxpayer, marketing_opt_in
  )
  values (
    p_donor_email, p_donor_name, p_address_line1, p_address_line2,
    p_city, p_postcode, p_is_uk_taxpayer, p_marketing_opt_in
  )
  on conflict (email) do update set
    full_name      = coalesce(excluded.full_name, donors.full_name),
    address_line1  = coalesce(excluded.address_line1, donors.address_line1),
    address_line2  = coalesce(excluded.address_line2, donors.address_line2),
    city           = coalesce(excluded.city, donors.city),
    postcode       = coalesce(excluded.postcode, donors.postcode),
    is_uk_taxpayer = coalesce(excluded.is_uk_taxpayer, donors.is_uk_taxpayer)
  returning id into v_donor_id;

  insert into donations (
    donor_id, amount_pence, base_amount_pence, bump_amount_pence,
    gift_aid, gift_aid_amount_pence,
    stripe_payment_intent_id, stripe_checkout_session_id,
    status, succeeded_at
  )
  values (
    v_donor_id, p_amount_pence, p_base_amount_pence, p_bump_amount_pence,
    p_gift_aid, p_gift_aid_amount_pence,
    p_stripe_pi_id, p_stripe_cs_id,
    'succeeded', now()
  )
  returning id into v_donation_id;

  insert into claims (
    seat_id, donor_id, donation_id, display_name, tribute_message,
    is_anonymous, is_amount_private, avatar_config, moderation_status
  )
  values (
    p_seat_id, v_donor_id, v_donation_id, p_display_name, p_tribute,
    p_is_anonymous, p_is_amount_private, p_avatar_config, p_moderation_status
  )
  returning id into v_claim_id;

  update seat_holds
     set released = true
   where seat_id = p_seat_id and released = false;

  -- NB: prize_entries deliberately NOT inserted here. Per 04 §1, the prize
  -- draw entry must be a separate, free, post-donation opt-in to keep
  -- Gift Aid valid (donations bundled with prize entries fail HMRC's
  -- "no benefit in return" test). The opt-in lands on /donate complete
  -- page and writes prize_entries through its own endpoint.

  return jsonb_build_object(
    'claim_id',    v_claim_id,
    'donation_id', v_donation_id,
    'donor_id',    v_donor_id
  );
end;
$$;
