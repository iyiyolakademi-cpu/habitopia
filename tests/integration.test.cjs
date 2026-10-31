const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const fs=(file)=>readFileSync(file,"utf8");
const portal=fs("index.html"),habit=fs("habitopia.html"),market=fs("hayat-borsan.html");

test("Root is a two-choice boxed portal, not an automatic redirect",()=>{
 assert.match(portal,/<title>Habitopia/);
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

test("Landing is a minimal black Habitopia-only selector",()=>{
  assert.match(portal,/<meta name="theme-color" content="#000000">/);
  assert.match(portal,/<img src="assets\/habitopia-logo.jpg"/);
  assert.match(portal,/<strong>Hayat Borsası<\/strong>/);
  assert.match(portal,/<strong>Habitopia Dünyası<\/strong>/);
  assert.match(portal,/--black: #000000/);
  assert.match(portal,/--cream: #f2dfbc/);
  assert.match(portal,/--green: #214d42/);
  assert.doesNotMatch(portal,/OYNABAK|OynaBak|oynabak|Bağlı|Nasıl Oynanır|Oda Oluştur|Kodla Katıl|Çıkış/i);
  assert.doesNotMatch(portal,/class="mast"|class="footer"|class="mast-right"|class="duo-topbar"/);
});
