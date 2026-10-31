
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const html=readFileSync("index.html","utf8");
const core=readFileSync("src/scripts/core.js","utf8");
const css=readFileSync("src/styles/midnight.css","utf8");

test("Habitopia loads in midnight mode before JavaScript runs",()=>{
  assert.match(html,/<html lang="tr" class="dark habitopia-midnight">/);
  assert.match(html,/<meta name="theme-color" content="#090a0f">/);
  assert.match(html,/<meta name="color-scheme" content="dark">/);
  assert.ok(html.includes('<style id="habitopia-midnight">'));
});
test("permanent dark appearance survives legacy light settings",()=>{
  assert.ok(core.includes('settings:{lang:"tr",sound:true,dark:true'));
  assert.ok(core.includes('next.settings.dark=true;'));
  assert.ok(core.includes('root.classList.add("dark","habitopia-midnight")'));
  assert.ok(!core.includes('{id:"dark",icon:"moon"'));
  assert.ok(core.includes('if(!["sound","reduceMotion"].includes(id))return'));
});
test("midnight CSS covers all major screens including overlays and onboarding",()=>{
  for(const scope of [
    ".hbt-today-summary",".hbt-calendar-card",".habit-row",".hbt-insight-summary",
    ".hbt-account-head",".nav",".sheet",".dialog",".onboarding",
    ".period-bar-track",".note-compose",".mood-btn",".water-day-btn",".v21-score"
  ]) assert.ok(css.includes(scope),scope);
});
test("night UI retains five navigation tabs and essential controls",()=>{
  for(const view of ["today","habits","plan","profile","account"])
    assert.ok(html.includes('data-view="'+view+'"'),view);
  for(const action of ["save-habit","quick-task","calendar","settings","toggle-setting"])
    assert.ok(html.includes('data-action="'+action+'"') || core.includes('case"'+action+'"'),action);
  assert.equal((html.match(/class="nav-btn/g)||[]).length,5);
});
test("night skin uses high contrast text with no light background root",()=>{
  assert.ok(css.includes("--night-bg:#080a0f;"));
  assert.ok(css.includes("--night-panel:#151923;"));
  assert.ok(css.includes("--night-text:#f5f6fd;"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes(":focus-visible"));
});
