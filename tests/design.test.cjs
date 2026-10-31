const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const html=readFileSync("index.html","utf8");
const source=readFileSync("src/scripts/redesign.js","utf8");
const css=readFileSync("src/styles/redesign.css","utf8");

test("five bottom tabs and unique native views are present",()=>{
  for(const id of ["view-today","view-habits","view-plan","view-profile","view-account","view-challenges"]){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  for(const view of ["today","habits","plan","profile","account"])
    assert.match(html,new RegExp('data-view="'+view+'"'));
  assert.equal((html.match(/class="nav-btn/g)||[]).length,5);
});
test("existing feature entry points survive redesign",()=>{
  for(const action of ["calendar","routines","weekly-goals","go-challenges","notes","weekly-review","settings"]){
    assert.match(html,new RegExp('data-action="'+action+'"'));
  }
});
test("new tabs have functional handlers and calendar navigation",()=>{
  for(const action of ["go-account","go-plan","go-challenges","hbt-month-prev","hbt-month-next","hbt-select-day"])
    assert.ok(source.includes('case "'+action+'"'),action);
  assert.ok(source.includes("renderAll=function"));
  assert.ok(source.includes("showView=function"));
});
test("responsive design, dark theme and reduced motion are supported",()=>{
  assert.match(css,/min-width:900px/);
  assert.match(css,/max-width:370px/);
  assert.match(css,/html\.dark/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/:focus-visible/);
});
