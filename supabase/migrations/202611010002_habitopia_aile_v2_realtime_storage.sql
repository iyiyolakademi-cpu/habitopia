
alter table public.family_households add column shopping_meta jsonb not null default '{}'::jsonb
 check(jsonb_typeof(shopping_meta)='object');

create or replace function public.family_set_shopping(p_household uuid,p_budget numeric,p_meta jsonb)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not family_private.is_member(p_household) then raise exception 'Not a member';end if;
 if p_budget is null or p_budget<0 or p_budget>999999999 then raise exception 'Invalid budget';end if;
 if jsonb_typeof(p_meta)<>'object' then raise exception 'Invalid shopping settings';end if;
 update public.family_households set shopping_budget=p_budget,shopping_meta=p_meta,updated_at=now()
 where id=p_household;
 return true;
end $$;
revoke all on function public.family_set_shopping(uuid,numeric,jsonb) from public,anon;
grant execute on function public.family_set_shopping(uuid,numeric,jsonb) to authenticated;

-- Keep notification updates restricted to 'read_at'; don't permit users to change targets or content.
create or replace function family_private.check_notification_update()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.household_id<>old.household_id or new.item_id<>old.item_id or
    new.user_id<>old.user_id or new.title<>old.title or new.due_at<>old.due_at or
    new.created_at<>old.created_at then
  raise exception 'Only acknowledgement can be updated'; end if;
 return new;
end $$;
create trigger family_notification_guard before update on public.family_notifications
for each row execute function family_private.check_notification_update();

-- An invitation is a random 128-bit code, not a guessable sequential ID.
-- Household owner can rotate this value if an invitation was shared accidentally.

-- Restrict household updates to name, invite code and budget, preserving owner and id.
create or replace function family_private.check_household_update()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.owner_id<>old.owner_id or new.created_at<>old.created_at then
  raise exception 'Immutable household identity';
 end if;
 new.updated_at=now();return new;
end $$;
create trigger family_household_guard before update on public.family_households
for each row execute function family_private.check_household_update();

-- Realtime subscriptions: row-level filtering still enforced by Supabase RLS.
alter publication supabase_realtime add table public.family_items;
alter publication supabase_realtime add table public.family_members;
alter publication supabase_realtime add table public.family_households;
alter publication supabase_realtime add table public.family_event_responses;
alter publication supabase_realtime add table public.family_notifications;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('habitopia-family-docs','habitopia-family-docs',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Upload path: household_uuid/uploading_user_uuid/random_uuid.ext
create policy "family private upload" on storage.objects for insert to authenticated
with check(bucket_id='habitopia-family-docs'
 and exists(select 1 from public.family_members m
 where m.household_id::text=(storage.foldername(name))[1]
 and m.user_id=(select auth.uid())
 and (storage.foldername(name))[2]=(select auth.uid())::text)
);
create policy "family secured download" on storage.objects for select to authenticated
using (bucket_id='habitopia-family-docs' and exists(
 select 1 from public.family_documents d
 where d.path=name and d.uploaded_by=(storage.foldername(name))[2]::uuid
 and family_private.is_member(d.household_id)
 and (d.privacy='family' or d.uploaded_by=(select auth.uid()))
));
create policy "uploader can remove document object" on storage.objects for delete to authenticated
using (bucket_id='habitopia-family-docs' and
 (storage.foldername(name))[2]=(select auth.uid())::text
 and exists(select 1 from public.family_documents d where d.path=name and d.uploaded_by=(select auth.uid()))
);

-- Prevent forged replies to other users' invitations.
create index if not exists family_items_event_idx on public.family_items(linked_event_id) where linked_event_id is not null;
