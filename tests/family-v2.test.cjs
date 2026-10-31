"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const cloud=fs.readFileSync("assets/family-cloud.js","utf8");
const family=fs.readFileSync("assets/family.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const sql=fs.readFileSync("supabase/migrations/202611010001_habitopia_aile_v2_secure_core.sql","utf8");
test("Cloud and family scripts parse",()=>{
 assert.doesNotThrow(()=>new vm.Script(cloud));
 assert.doesNotThrow(()=>new vm.Script(family));
});
test("Only public Supabase credentials appear in browser",()=>{
 assert.match(cloud,/sb_publishable_/);
 assert.doesNotMatch(cloud,/service_role|sb_secret_/);
 assert.match(cloud,/persistSession:true/);
 assert.match(html,/family-cloud\.js/);
 assert.match(html,/cloud-account/);
});
test("Shared tasks shopping radar calendar assets use protected tables",()=>{
 for(const s of ["family_items","family_members","family_households","family_event_responses","family_documents","family_notifications"])
 assert.match(sql,new RegExp(s));
 for(const k of ["task","shopping","radar","event","asset"])
 assert.match(cloud,new RegExp('kind==="'+k+'"'));
 assert.match(cloud,/family_join/);
 assert.match(cloud,/family_create/);
 assert.match(cloud,/family_complete/);
 assert.match(cloud,/family_set_shopping/);
});
test("RLS and private health handling is built in",()=>{
 for(const name of ["family_households","family_members","family_items","family_event_responses","family_documents","family_notifications"])
 assert.match(sql,new RegExp('alter table public\\.'+name+' enable row level security'));
 assert.match(sql,/Health reminders must be private/);
 assert.match(sql,/Immutable item identity/);
 assert.match(sql,/Private items cannot be assigned to someone else/);
 assert.match(family,/özel eşya/);
});
test("Phone navigation and asset services are wired",()=>{
 assert.match(html,/mobile-bottom-nav/);
 assert.match(html,/data-page="assets"/);
 assert.match(family,/function renderAssets/);
 assert.match(family,/function showAsset/);
 assert.match(family,/case "new-asset"/);
 assert.match(family,/case "asset-service"/);
 assert.match(family,/linkedEventId/);
 assert.match(family,/asset-doc-upload/);
});
test("Cloud fallback can initialize safely when external SDK fails",()=>{
 const nodes=new Map();
 const doc={getElementById:id=>{
  if(!nodes.has(id))nodes.set(id,{hidden:true,innerHTML:"",textContent:"",addEventListener(){},querySelector(){return null}});
  return nodes.get(id);
 },addEventListener(){}};
 const ctx={window:{},document:doc,console};
 vm.runInNewContext(cloud,ctx);
 assert.ok(ctx.window.HabitopiaCloud);
 assert.equal(ctx.window.HabitopiaCloud.active,false);
 assert.doesNotThrow(()=>ctx.window.HabitopiaCloud.init({getState(){},setState(){},reset(){}}));
});
test("Scheduled server notifications and private storage migration present",()=>{
 const sql2=fs.readFileSync("supabase/migrations/202611010002_habitopia_aile_v2_realtime_storage.sql","utf8");
 const sql3=fs.readFileSync("supabase/migrations/202611010003_habitopia_aile_v2_scheduled_notifications.sql","utf8");
 assert.match(sql2,/habitopia-family-docs/);
 assert.match(sql2,/public,false/); // private bucket bool must be false
 assert.match(sql2,/create policy "family secured download"/);
 assert.match(sql3,/cron.schedule/);
 assert.match(sql3,/enqueue_due_notifications/);
});
