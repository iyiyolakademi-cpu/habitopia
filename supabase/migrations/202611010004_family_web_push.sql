-- Habitopia Aile PWA Web Push. Own device subscriptions, isolated per family.
create table if not exists public.family_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.family_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 25 and 2048 and left(endpoint,8)='https://'),
  p256dh text not null check (char_length(p256dh) between 20 and 255),
  auth text not null check (char_length(auth) between 8 and 255),
  user_agent text not null default '' check(char_length(user_agent)<=255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id,user_id,endpoint)
);
create index if not exists family_push_subscriptions_recipient on public.family_push_subscriptions(user_id,household_id);
alter table public.family_push_subscriptions enable row level security;
revoke all on public.family_push_subscriptions from public,anon;
grant select,insert,update,delete on public.family_push_subscriptions to authenticated;
create policy "push subscriptions own read" on public.family_push_subscriptions for select to authenticated
using(user_id=(select auth.uid()) and family_private.is_member(household_id));
create policy "push subscriptions own create" on public.family_push_subscriptions for insert to authenticated
with check(user_id=(select auth.uid()) and family_private.is_member(household_id));
create policy "push subscriptions own edit" on public.family_push_subscriptions for update to authenticated
using(user_id=(select auth.uid()) and family_private.is_member(household_id))
with check(user_id=(select auth.uid()) and family_private.is_member(household_id));
create policy "push subscriptions own delete" on public.family_push_subscriptions for delete to authenticated
using(user_id=(select auth.uid()) and family_private.is_member(household_id));

create or replace function family_private.check_push_subscription()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
   if new.id<>old.id or new.household_id<>old.household_id
      or new.user_id<>old.user_id or new.endpoint<>old.endpoint then
     raise exception 'Push subscription identity is immutable';
   end if;
 end if;
 if new.user_id<>auth.uid() and current_setting('request.jwt.claim.role',true)<>'service_role' then
   raise exception 'Cannot subscribe a different user';
 end if;
 if not family_private.is_member(new.household_id) and current_setting('request.jwt.claim.role',true)<>'service_role' then
   raise exception 'Not in this household';
 end if;
 if tg_op='INSERT' and (
   select count(*) from public.family_push_subscriptions p where p.household_id=new.household_id and p.user_id=new.user_id
 )>=8 then
   raise exception 'Maximum eight devices per user';
 end if;
 new.updated_at=now();
 return new;
end $$;
create trigger family_push_subscription_guard before insert or update on public.family_push_subscriptions
for each row execute function family_private.check_push_subscription();

create table if not exists public.family_push_deliveries (
  notification_id uuid not null references public.family_notifications(id) on delete cascade,
  subscription_id uuid not null references public.family_push_subscriptions(id) on delete cascade,
  attempts integer not null default 0 check(attempts between 0 and 4),
  state text not null default 'claimed' check(state in ('claimed','sent','retry','gone')),
  last_attempt_at timestamptz,
  http_status integer,
  created_at timestamptz not null default now(),
  primary key (notification_id,subscription_id)
);
alter table public.family_push_deliveries enable row level security;
revoke all on public.family_push_deliveries from public,anon,authenticated;
grant all on public.family_push_deliveries to service_role;

-- Called only by Supabase service_role on the Edge worker, not from a browser.
create or replace function public.family_claim_push_delivery(p_notification uuid,p_subscription uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_claimed integer;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then
   raise exception 'Service only';
 end if;
 if not exists(
   select 1 from public.family_notifications n
   join public.family_push_subscriptions s on s.id=p_subscription
   where n.id=p_notification and n.user_id=s.user_id and n.household_id=s.household_id
      and n.read_at is null
 ) then return false;end if;
 insert into public.family_push_deliveries(notification_id,subscription_id,attempts,state,last_attempt_at)
 values(p_notification,p_subscription,1,'claimed',now())
 on conflict(notification_id,subscription_id) do update
 set attempts=public.family_push_deliveries.attempts+1,
     state='claimed',last_attempt_at=now()
 where public.family_push_deliveries.state='retry'
   and public.family_push_deliveries.attempts<3
   and public.family_push_deliveries.last_attempt_at<now()-interval '2 minutes';
 get diagnostics v_claimed=row_count;
 return v_claimed=1;
end $$;
revoke all on function public.family_claim_push_delivery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.family_claim_push_delivery(uuid,uuid) to service_role;

-- Private VAPID JWK and dispatch token live encrypted inside Supabase Vault.
-- This RPC is inaccessible to anonymous/authenticated API clients.
create or replace function public.family_get_push_settings()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_vapid text;v_token text;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then
   raise exception 'Service only';
 end if;
 select decrypted_secret into v_vapid from vault.decrypted_secrets where name='habitopia_vapid_private_jwk';
 select decrypted_secret into v_token from vault.decrypted_secrets where name='habitopia_push_dispatch_token';
 if v_vapid is null or v_token is null then raise exception 'Push credentials unconfigured';end if;
 return jsonb_build_object('vapid',v_vapid::jsonb,'dispatch_token',v_token);
end $$;
revoke all on function public.family_get_push_settings() from public,anon,authenticated;
grant execute on function public.family_get_push_settings() to service_role;

-- Database cron dispatch uses pg_net and a private rotating token stored in Vault.
create extension if not exists pg_net with schema extensions;
