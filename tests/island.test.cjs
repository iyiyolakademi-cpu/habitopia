const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const page=readFileSync("habitopia.html","utf8");
const template=readFileSync("src/index.template.html","utf8");
const js=readFileSync("src/scripts/island.js","utf8");
const css=readFileSync("src/styles/island.css","utf8");
const asset=readFileSync("assets/habitopia-island.svg","utf8");
test("Island main screen has four destinations and no visible fixed bottom navigation",()=>{
 for(const name of ["island-habits","island-world","island-growth","island-account"]){
  assert.match(page,new RegExp('data-action="'+name+'"'));
  assert.ok(js.includes('case "'+name+'"'));
 }
 assert.match(page,/class="island-gates"/);
 assert.match(page,/src="assets\/habitopia-island.svg"/);
 assert.match(css,/body \.nav\{display:none!important/);
 assert.match(css,/body \.topbar\{display:none!important/);
});
test("Tasks, habits, progress and world are individual views with back actions",()=>{
 for(const id of ["view-today","view-habits","view-world","view-tasks","view-profile","view-account","view-plan","view-challenges"]){
  assert.equal((template.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok((template.match(/data-action="island-home"/g)||[]).length>=7);
 assert.match(template,/id="islandHabitRows"/);
 assert.match(template,/id="islandTrendChart"/);
 assert.match(template,/id="islandUnlocks"/);
});
test("Existing tracking DOM IDs and save keys remain exactly once",()=>{
 for(const id of ["quickTask","taskList","waterRing","focusIcon","hbtProgressPercent","growthDashboard","journeyScene","habitTable","settingsSheet"]){
  assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(page,/habitopia-state-v15-browser/);
 assert.match(page,/id="habitopia-island-behavior"/);
});
test("Habit completion calls existing action and uses current tracking values",()=>{
 assert.match(js,/habitDue\(h,today\)/); // ensure renderer uses real due dates
 assert.match(js,/habitCompletedOn\(h,today\)/);
 assert.match(js,/data-action="toggle-habit"/);
 assert.match(js,/data-date/);
 assert.match(js,/dueTasks\(\)/);
 assert.match(js,/focusSessions/);
 assert.match(js,/levelInfo\(\)/);
 assert.match(js,/rangeDays=7/);
 assert.match(js,/\[7,30,90\]/);
 assert.match(js,/oldHandleAction\(action,el\)/);
});
test("Mobile-responsive island illustration and readable touch targets",()=>{
 assert.match(asset,/<svg/);
 assert.match(asset,/viewBox="0 0 430 700"/);
 assert.match(asset,/id="falls"/);
 assert.match(css,/max-width:370px/);
 assert.match(css,/min-width:800px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:88px/);
});
