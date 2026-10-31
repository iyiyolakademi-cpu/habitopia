const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const fs=(file)=>readFileSync(file,"utf8");
const portal=fs("index.html"),habit=fs("habitopia.html"),market=fs("hayat-borsan.html");

test("Root is the Habitopia Aile home screen",()=>{
 assert.match(portal,/<title>Habitopia Aile/);
 assert.match(portal,/class="app-layout"/);
 assert.match(portal,/assets\\/family\\.css/);
 assert.match(portal,/assets\\/family\\.js/);
 assert.match(portal,/data-page="tasks"/);
 assert.match(portal,/data-page="shopping"/);
 assert.match(portal,/data-page="radar"/);
 assert.match(portal,/data-page="calendar"/);
 assert.doesNotMatch(portal,/class="world-grid"/);
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

test("Habitopia Aile replaces the old dual-app launcher but preserves both legacy pages",()=>{
 assert.match(portal,/<meta name="theme-color" content="#eef4ee">/);
 assert.match(portal,/family-icon\\.svg/);
 assert.match(portal,/id="page-content"/);
 assert.match(portal,/id="demo-banner"/);
 assert.doesNotMatch(portal,/class="world (market|habit)"/);
 assert.match(habit,/habitopia-state-v15-browser/);
 assert.match(market,/hayatborsasi_terminal_v2/);
});
