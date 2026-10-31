
-- In-app notifications are scheduled server-side, independent of an open browser.
create or replace function family_private.enqueue_due_notifications()
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_added bigint;
begin
 insert into public.family_notifications(household_id,item_id,user_id,title,due_at)
 select i.household_id,i.id,i.assignee,
   case when i.kind='task' then 'Aile görevi: ' else 'Aile Radarı: ' end || i.title,
   i.reminder_at
 from public.family_items i
 where i.kind in ('task','radar')
   and i.assignee is not null and i.done_at is null
   and i.reminder_at is not null
   and i.reminder_at<=now()
   and i.reminder_at>=now()-interval '7 days'
   and exists (select 1 from public.family_members m where m.household_id=i.household_id and m.user_id=i.assignee)
 on conflict(item_id,user_id,due_at) do nothing;
 get diagnostics v_added = row_count;
 return v_added;
end $$;
revoke all on function family_private.enqueue_due_notifications() from public,anon,authenticated;
-- Supabase Cron runs trusted internal SQL, not a user's client request.
create extension if not exists pg_cron;
select cron.schedule('habitopia-family-due-notifications','* * * * *',
$$select family_private.enqueue_due_notifications();$$);
