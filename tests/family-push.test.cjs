"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const read=p=>fs.readFileSync(p,"utf8");
const html=read("index.html"),app=read("assets/family.js"),push=read("assets/family-push.js"),
 mobile=read("assets/family-mobile.js"),sw=read("sw.js"),
 css=read("assets/family-push-ui.css"),
 schema=read("supabase/migrations/202611010004_family_web_push.sql"),
 sender=read("supabase/functions/family-webpush/index.ts");
test("PWA worker and device scripts parse",()=>{
 for(const s of [app,push,mobile,sw])assert.doesNotThrow(()=>new vm.Script(s));
});
test("PWA manifest is installable and service worker has push click and privacy protections",()=>{
 const manifest=JSON.parse(read("manifest.webmanifest"));
 assert.equal(manifest.display,"standalone");assert.equal(manifest.id,"/habitopia/");
 assert.match(sw,/addEventListener\("push"/);
 assert.match(sw,/showNotification\("Habitopia Aile"/);
 assert.match(sw,/addEventListener\("notificationclick"/);
 assert.match(sw,/HABITOPIA_OPEN_NOTIFICATIONS/);
 assert.match(sw,/privacy|private|Ailenden yeni bir görev/i);
});
test("Browser opt-in records account-specific device subscription",()=>{
 assert.match(push,/Notification\.requestPermission\(\)/);
 assert.match(push,/pushManager\.subscribe\(/);
 assert.match(push,/userVisibleOnly:true/);
 assert.match(push,/family_push_subscriptions/);
 assert.match(push,/onConflict:"household_id,user_id,endpoint"/);
 assert.match(push,/isiOS\(\)&&!installed\(\)/);
 assert.match(push,/VAPID_PUBLIC=/);
 assert.doesNotMatch(push,/PRIVATE_JWK|SERVICE_ROLE_KEY|sb_secret_/);
});
test("UI provides real notification controls and deep link to inbox",()=>{
 assert.match(html,/family-push-ui\.css/);
 assert.match(html,/family-push\.js/);
 assert.match(html,/family-mobile\.js/);
 assert.match(app,/id="push-enable"/);
 assert.match(app,/data-action="push-enable"/);
 assert.match(app,/function showNotifications\(/);
 assert.match(app,/habitopia-family-ready/);
 assert.match(app,/openRequested/);
 assert.match(app,/habitopia-open-notifications/);
 assert.match(app,/HabitopiaPush\?\.setBadge/);
});
test("Private push subscriptions have RLS and delivery worker is privileged",()=>{
 assert.match(schema,/family_push_subscriptions enable row level security/);
 assert.match(schema,/user_id=\(select auth\.uid\(\)\)/);
 assert.match(schema,/family_private\.is_member\(household_id\)/);
 assert.match(schema,/revoke all on function public\.family_get_push_settings\(\) from public,anon,authenticated/);
 assert.match(schema,/family_claim_push_delivery/);
 assert.match(sender,/x-habitopia-dispatch/);
 assert.match(sender,/family_get_push_settings/);
 assert.match(sender,/family_claim_push_delivery/);
 assert.match(sender,/crypto\.subtle\.sign/);
 assert.match(sender,/method:"POST"/);
 assert.match(sender,/TTL:"240"/);
});
test("Mobile layout has keyboard handling, loading, responsive cards and reduced motion",()=>{
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/\.loading-state/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.push-status\.ok/);
 assert.match(mobile,/visualViewport/);
 assert.match(mobile,/scrollIntoView/);
 assert.match(css,/font-size:16px!important/);
});
