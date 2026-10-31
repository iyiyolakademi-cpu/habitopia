const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const page=readFileSync("habitopia.html","utf8");
const template=readFileSync("src/index.template.html","utf8");
const logic=readFileSync("src/scripts/journey.js","utf8");
const css=readFileSync("src/styles/journey.css","utf8");
test("Home is no longer a grid dashboard, it is a living trail",()=>{
  assert.match(page,/class="journey-scene journey-level-0"/);
  assert.match(page,/class="journey-landscape"/);
  assert.match(page,/class="journey-spot journey-spot-habit"/);
  assert.match(page,/class="journey-spot journey-spot-task"/);
  assert.match(page,/class="journey-spot journey-spot-focus"/);
  assert.match(page,/class="journey-spot journey-spot-plan"/);
  assert.match(page,/class="journey-workbench"/);
});
test("Existing state-bound controls remain available, without duplicate IDs",()=>{
  for(const id of ["quickTask","taskList","waterRing","focusIcon","hbtProgressPercent","growthDashboard","journeyScene","journeyWorkbench"]){
    assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  for(const action of ["quick-task","water-plus","water-minus","open-focus","go-plan","journey-tasks","journey-habits"])
    assert.match(page,new RegExp('data-action="'+action+'"'));
  assert.equal((page.match(/class="nav-btn/g)||[]).length,5);
});
test("Journey is live, safe, localized and reuses original behavior",()=>{
  assert.match(logic,/habitDue\(h,today\)/);
  assert.match(logic,/habitCompletedOn\(h,today\)/);
  assert.match(logic,/dueTasks\(\)/);
  assert.match(logic,/focusSessions/);
  assert.match(logic,/renderToday=function/);
  assert.match(logic,/renderAll=function/);
  assert.match(logic,/oldHandleAction\(action,element\)/);
  assert.match(logic,/journeyWorkbench/);
  assert.match(logic,/tr:.*\{/);
  assert.match(logic,/en:.*\{/);
});
test("Journey supports small screens, accessible focus and reduced motion",()=>{
  assert.match(css,/max-width:370px/);
  assert.match(css,/min-width:900px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/\.journey-legacy\[hidden\]\{display:none!important\}/);
});
