-- Run after family-webpush Edge Function is deployed and Vault values are configured.
-- The job only sends a private token from Vault to a fixed first-party Edge Function URL.
select cron.schedule(
 'habitopia-family-web-push',
 '* * * * *',
 $cron$
 select net.http_post(
   url:='https://bcrbkrkgsiugsmxmginx.supabase.co/functions/v1/family-webpush',
   headers:=jsonb_build_object(
     'content-type','application/json',
     'x-habitopia-dispatch',
     (select decrypted_secret from vault.decrypted_secrets where name='habitopia_push_dispatch_token')
   ),
   body:='{}'::jsonb,
   timeout_milliseconds:=15000
 );
 $cron$
);