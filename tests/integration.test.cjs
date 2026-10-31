const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const fs=(file)=>readFileSync(file,"utf8");
const portal=fs("index.html"),habit=fs("habitopia.html"),market=fs("hayat-borsan.html");

test("Root is a two-choice boxed portal, not an automatic redirect",()=>{
 assert.match(portal,/<title>İki Dünya/);
 assert.match(portal,/class="world-grid"/);
 assert.equal((portal.match(/class="world (market|habit)"/g)||[]).length,2);
 assert.match(portal,/href="habitopia.html"/);
 assert.match(portal,/href="hayat-borsan.html"/);
 assert.doesNotMatch(portal,/location\.replace|location\.assign|window\.location/);
});
test("Habitopia is fully preserved under its new entrypoint",()=>{
 assert.match(habit,/id="view-today"/);
 assert.match(habit,/id="view-habits"/);
 assert.match(habit,/id="view-plan"/);
 assert.match(habit,/id="view-profile"/);
 assert.match(habit,/id="habitopia-universe"/);
 assert.match(habit,/class="world-switchbar"/);
 assert.match(habit,/href="hayat-borsan.html"/);
 assert.match(habit,/href="index.html"/);
 assert.match(habit,/habitopia-state-v15-browser/);
});
test("The restored stock-market app keeps both original scripts and Firebase",()=>{
 assert.match(market,/const KEY="hayatborsasi_terminal_v2"/);
 assert.match(market,/firebase-app\.js/);
 assert.match(market,/firebase-auth\.js/);
 assert.match(market,/firebase-firestore\.js/);
 assert.match(market,/id="googleLogin"/);
 assert.match(market,/id="authCover"/);
 assert.match(market,/class="duo-topbar"/);
 assert.match(market,/href="habitopia.html"/);
 assert.match(market,/href="index.html"/);
});
test("Both apps are accessible from each other without changing their data keys",()=>{
 assert.ok(!habit.includes('const KEY="hayatborsasi_terminal_v2"'));
 assert.ok(!market.includes("habitopia-state-v15-browser"));
 assert.match(habit,/data-action="add-habit"/);
 assert.match(habit,/data-action="open-focus"/);
 assert.match(habit,/data-action="go-plan"/);
});
