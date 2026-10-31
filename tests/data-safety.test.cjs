const {test}=require("node:test");
const assert=require("node:assert/strict");
const guard=require("../src/scripts/data-safety.js");
function st(date){return JSON.stringify({schemaVersion:15,profile:{name:"Tester"},habits:[],updatedAt:date})}
test("accepts genuine Habitopia state and rejects arrays, garbage, empty object",()=>{
  assert.equal(guard.safeParseState(""),null);
  assert.equal(guard.safeParseState("[]"),null);
  assert.equal(guard.safeParseState("{}"),null);
  assert.equal(guard.safeParseState("{oops"),null);
  assert.equal(guard.safeParseState(st("2026-10-30T10:00:00Z")).profile.name,"Tester");
});
test("rejects oversized imports",()=>assert.equal(guard.safeParseState("a".repeat(8*1024*1024+1)),null));
test("newer local data wins cloud conflict",()=>{
  const s=guard.decideStartupState(st("2026-10-31T10:00:00Z"),st("2026-10-30T10:00:00Z"));
  assert.equal(s.source,"local");
  assert.equal(s.overwrite,false);
});
test("newer cloud data is selected for bootstrap",()=>{
  const s=guard.decideStartupState(st("2026-10-30T10:00:00Z"),st("2026-10-31T10:00:00Z"));
  assert.equal(s.source,"cloud");
  assert.equal(s.overwrite,true);
});
test("invalid cloud data never replaces local state",()=>{
  const s=guard.decideStartupState(st("2026-10-31T10:00:00Z"),"[]");
  assert.equal(s.source,"local");
  assert.equal(s.reason,"invalid-cloud");
});
test("missing timestamps have consistent fallback",()=>{
  const s=guard.decideStartupState(JSON.stringify({habits:[]}),st("2026-10-31T10:00:00Z"));
  assert.equal(s.source,"cloud");
});
test("schema with legacy quests is recognized",()=>{
  assert.equal(guard.safeParseState(JSON.stringify({quests:[{title:"Read"}]})).quests.length,1);
});
test("invalid data shapes cannot erase good state",()=>{
  assert.equal(guard.safeParseState(JSON.stringify({tasks:"broken"})),null);
  assert.equal(guard.safeParseState(JSON.stringify({profile:[]})),null);
  assert.equal(guard.safeParseState(JSON.stringify({habits:[]})).habits.length,0);
});
