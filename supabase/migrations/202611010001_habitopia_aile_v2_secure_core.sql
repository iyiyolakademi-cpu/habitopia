
-- Habitopia Aile 2.0: isolated family workspace with account-based RLS.
create schema if not exists family_private;
revoke all on schema family_private from public, anon;
grant usage on schema family_private to authenticated;

create table public.family_households (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 1 and 80),
 owner_id uuid not null references auth.users(id),
 invite_code uuid not null default gen_random_uuid() unique,
 shopping_budget numeric(12,2) not null default 0 check(shopping_budget >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.family_members (
 household_id uuid not null references public.family_households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 1 and 60),
 role text not null default 'member' check(role in ('owner','member')),
 joined_at timestamptz not null default now(),
 primary key (household_id,user_id)
);
create index family_members_user_idx on public.family_members(user_id);

create table public.family_items (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.family_households(id) on delete cascade,
 kind text not null check (kind in ('task','shopping','radar','event','asset','workflow')),
 created_by uuid not null references auth.users(id),
 assignee uuid references auth.users(id),
 title text not null check(char_length(btrim(title)) between 1 and 200),
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object'),
 privacy text not null default 'family' check(privacy in ('family','private')),
 due_at timestamptz,
 reminder_at timestamptz,
 done_at timestamptz,
 linked_event_id uuid references public.family_items(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index family_items_household_kind_idx on public.family_items(household_id,kind,updated_at desc);
create index family_items_reminders_idx on public.family_items(reminder_at) where done_at is null and reminder_at is not null;
create index family_items_assignee_idx on public.family_items(assignee,done_at);

create table public.family_event_responses (
 event_id uuid not null references public.family_items(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 response text not null check (response in ('yes','maybe','no')),
 updated_at timestamptz not null default now(),
 primary key(event_id,user_id)
);

create table public.family_documents (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.family_households(id) on delete cascade,
 item_id uuid not null references public.family_items(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id),
 path text not null unique,
 display_name text not null check(char_length(btrim(display_name)) between 1 and 160),
 privacy text not null default 'private' check(privacy in ('private','family')),
 created_at timestamptz not null default now()
);

create table public.family_notifications (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.family_households(id) on delete cascade,
 item_id uuid not null references public.family_items(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 due_at timestamptz not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(item_id,user_id,due_at)
);
create index family_notifications_user_idx on public.family_notifications(user_id,read_at,created_at desc);

create or replace function family_private.is_member(p_household uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$select exists(select 1 from public.family_members m where m.household_id=p_household and m.user_id=auth.uid())$$;
revoke all on function family_private.is_member(uuid) from public, anon;
grant execute on function family_private.is_member(uuid) to authenticated;

create or replace function family_private.member_exists(p_household uuid,p_user uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$select exists(select 1 from public.family_members m where m.household_id=p_household and m.user_id=p_user)$$;
revoke all on function family_private.member_exists(uuid,uuid) from public, anon;
grant execute on function family_private.member_exists(uuid,uuid) to authenticated;

create or replace function family_private.event_invited(p_event uuid,p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$select exists(
 select 1 from public.family_items e
 where e.id=p_event and e.kind='event'
 and family_private.member_exists(e.household_id,p_user)
 and (e.privacy='family' or e.created_by=p_user)
 and (e.created_by=p_user or (e.details->'invitees') ? p_user::text)
)$$;
revoke all on function family_private.event_invited(uuid,uuid) from public, anon;
grant execute on function family_private.event_invited(uuid,uuid) to authenticated;

create or replace function family_private.check_item()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if tg_op='UPDATE' then
  if new.household_id<>old.household_id or new.created_by<>old.created_by or new.kind<>old.kind or new.id<>old.id then
   raise exception 'Immutable item identity';
  end if;
 end if;
 if new.assignee is not null and not family_private.member_exists(new.household_id,new.assignee) then
  raise exception 'Assignee must belong to family';
 end if;
 if new.privacy='private' and new.assignee is not null and new.assignee<>new.created_by then
  raise exception 'Private items cannot be assigned to someone else';
 end if;
 if new.kind='radar' and new.details->>'cat'='health' and new.privacy<>'private' then
  raise exception 'Health reminders must be private';
 end if;
 if new.linked_event_id is not null and not exists (
  select 1 from public.family_items e where e.id=new.linked_event_id
  and e.household_id=new.household_id and e.kind='event'
 ) then raise exception 'Linked event must belong to family'; end if;
 new.updated_at=now();
 return new;
end $$;
create trigger family_item_guard before insert or update on public.family_items
for each row execute function family_private.check_item();

create or replace function family_private.check_document()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if new.household_id <> (select x.household_id from public.family_items x where x.id=new.item_id) then
  raise exception 'Document must belong to asset household';
 end if;
 if new.privacy='family' and exists(select 1 from public.family_items x where x.id=new.item_id and x.privacy='private') then
  raise exception 'Private item cannot have family document';
 end if;
 if split_part(new.path,'/',1)<>new.household_id::text or split_part(new.path,'/',2)<>new.uploaded_by::text then
  raise exception 'Invalid document path';
 end if;
 return new;
end $$;
create trigger family_document_guard before insert or update on public.family_documents for each row execute function family_private.check_document();

alter table public.family_households enable row level security;
alter table public.family_members enable row level security;
alter table public.family_items enable row level security;
alter table public.family_event_responses enable row level security;
alter table public.family_documents enable row level security;
alter table public.family_notifications enable row level security;

create policy "households read by members" on public.family_households for select to authenticated
 using(family_private.is_member(id));
create policy "households edit by owner" on public.family_households for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create policy "members read their family" on public.family_members for select to authenticated
 using(family_private.is_member(household_id));
create policy "member can update own name" on public.family_members for update to authenticated
 using(user_id=(select auth.uid()) and family_private.is_member(household_id))
 with check(user_id=(select auth.uid()) and family_private.is_member(household_id));
-- Prevent role changes with a trigger, even when self-updating.
create or replace function family_private.check_member_update() returns trigger language plpgsql
set search_path='' as $$
begin
 if new.household_id<>old.household_id or new.user_id<>old.user_id or new.role<>old.role then
  raise exception 'Only display name is editable'; end if;
 return new;
end $$;
create trigger family_member_guard before update on public.family_members for each row execute function family_private.check_member_update();

create policy "items read family or own private" on public.family_items for select to authenticated
 using(family_private.is_member(household_id) and (privacy='family' or created_by=(select auth.uid())));
create policy "items create by member" on public.family_items for insert to authenticated
 with check (family_private.is_member(household_id) and created_by=(select auth.uid())
 and (assignee is null or family_private.member_exists(household_id,assignee))
 and (privacy='family' or assignee is null or assignee=(select auth.uid())));
create policy "items edit by creator" on public.family_items for update to authenticated
 using (created_by=(select auth.uid()) and family_private.is_member(household_id))
 with check (created_by=(select auth.uid()) and family_private.is_member(household_id));
create policy "items delete by creator" on public.family_items for delete to authenticated
 using (created_by=(select auth.uid()) and family_private.is_member(household_id));

create policy "event responses read by invited" on public.family_event_responses for select to authenticated
 using (family_private.event_invited(event_id,(select auth.uid())));
create policy "event response by self" on public.family_event_responses for insert to authenticated
 with check (user_id=(select auth.uid()) and family_private.event_invited(event_id,(select auth.uid())));
create policy "event response update by self" on public.family_event_responses for update to authenticated
 using(user_id=(select auth.uid()) and family_private.event_invited(event_id,(select auth.uid())))
 with check(user_id=(select auth.uid()) and family_private.event_invited(event_id,(select auth.uid())));

create policy "documents read based on scope" on public.family_documents for select to authenticated
 using(family_private.is_member(household_id) and (privacy='family' or uploaded_by=(select auth.uid()))
  and exists(select 1 from public.family_items i where i.id=item_id and (i.privacy='family' or i.created_by=(select auth.uid()))));
create policy "documents insert by member" on public.family_documents for insert to authenticated
 with check(family_private.is_member(household_id) and uploaded_by=(select auth.uid())
  and exists(select 1 from public.family_items i where i.id=item_id and i.household_id=household_id and (i.privacy='family' or i.created_by=(select auth.uid()))));
create policy "documents delete by uploader" on public.family_documents for delete to authenticated
 using(uploaded_by=(select auth.uid()) and family_private.is_member(household_id));

create policy "notification read own" on public.family_notifications for select to authenticated
 using(user_id=(select auth.uid()) and family_private.is_member(household_id));
create policy "notification acknowledge own" on public.family_notifications for update to authenticated
 using(user_id=(select auth.uid()) and family_private.is_member(household_id))
 with check(user_id=(select auth.uid()) and family_private.is_member(household_id));
-- Notifications are only inserted by trusted DB job, not regular clients.

create or replace function public.family_create(p_name text,p_display_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required';end if;
 if char_length(btrim(p_name)) not between 1 and 80 or char_length(btrim(p_display_name)) not between 1 and 60 then raise exception 'Invalid family or display name';end if;
 insert into public.family_households(name,owner_id) values(btrim(p_name),v_user) returning id into v_id;
 insert into public.family_members(household_id,user_id,display_name,role) values(v_id,v_user,btrim(p_display_name),'owner');
 return v_id;
end $$;
revoke all on function public.family_create(text,text) from public,anon;
grant execute on function public.family_create(text,text) to authenticated;

create or replace function public.family_join(p_code uuid,p_display_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required';end if;
 if char_length(btrim(p_display_name)) not between 1 and 60 then raise exception 'Invalid display name';end if;
 select id into v_id from public.family_households where invite_code=p_code;
 if v_id is null then raise exception 'Invalid invite code';end if;
 insert into public.family_members(household_id,user_id,display_name,role)
 values(v_id,v_user,btrim(p_display_name),'member')
 on conflict (household_id,user_id) do nothing;
 return v_id;
end $$;
revoke all on function public.family_join(uuid,text) from public,anon;
grant execute on function public.family_join(uuid,text) to authenticated;

create or replace function public.family_complete(p_item uuid,p_done boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_item public.family_items%rowtype; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required';end if;
 select * into v_item from public.family_items where id=p_item for update;
 if not found or not family_private.is_member(v_item.household_id) then raise exception 'Item unavailable';end if;
 if v_item.privacy='private' and v_item.created_by<>v_user then raise exception 'Not authorized';end if;
 if v_item.kind in ('task','radar') and not (v_item.assignee=v_user or v_item.created_by=v_user) then raise exception 'Not assigned';end if;
 if v_item.kind not in ('task','radar','shopping') then raise exception 'Unsupported item';end if;
 update public.family_items set done_at=case when p_done then now() else null end where id=p_item;
 return true;
end $$;
revoke all on function public.family_complete(uuid,boolean) from public,anon;
grant execute on function public.family_complete(uuid,boolean) to authenticated;

create or replace function public.family_set_budget(p_household uuid,p_budget numeric)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not family_private.is_member(p_household) then raise exception 'Not a member';end if;
 if p_budget is null or p_budget<0 or p_budget>999999999 then raise exception 'Invalid budget';end if;
 update public.family_households set shopping_budget=p_budget,updated_at=now() where id=p_household;
 return true;
end $$;
revoke all on function public.family_set_budget(uuid,numeric) from public,anon;
grant execute on function public.family_set_budget(uuid,numeric) to authenticated;

-- Grant exposure to authenticated only; RLS still applies per row.
revoke all on public.family_households,public.family_members,public.family_items,public.family_event_responses,public.family_documents,public.family_notifications from anon;
grant select,update on public.family_households to authenticated;
grant select,update on public.family_members to authenticated;
grant select,insert,update,delete on public.family_items to authenticated;
grant select,insert,update on public.family_event_responses to authenticated;
grant select,insert,delete on public.family_documents to authenticated;
grant select,update on public.family_notifications to authenticated;
