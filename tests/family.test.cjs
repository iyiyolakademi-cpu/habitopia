"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("assets/family.css","utf8");
const js=fs.readFileSync("assets/family.js","utf8");
test("Family script parses",()=>assert.doesNotThrow(()=>new vm.Script(js)));
test("Root is family-first and legacy pages remain separate",()=>{
  assert.match(html,/Habitopia Aile/);
  for(const page of ["home","tasks","shopping","radar","calendar","family","settings"])assert.match(html,new RegExp('data-page="'+page+'"'));
  assert.match(html,/id="notification-open"/);
  assert.match(html,/id="user-switch"/);
});
test("Eight selected Radar categories and scheduled responsibility",()=>{
  for(const key of ["bill","subscription","vehicle","warranty","home","health","school","custom"])assert.match(js,new RegExp(key+':\\['));
  assert.match(js,/reminderAt/);
  assert.match(js,/assignee/);
  assert.match(js,/doneAt/);
  assert.match(js,/privacy.checked=true/);
});
test("Shopping budget, quantities, user-specific reminders and RSVP flow exist",()=>{
 assert.match(js,/shoppingBudget/);
 assert.match(js,/shoppingMeta/);
 assert.match(js,/qty:number/);
 assert.match(js,/const cost=/);
 assert.match(js,/function notificationsForMember/);
 assert.match(js,/data-action="rsvp"/);
 assert.ok(js.includes("e.rsvp[current()]"));
});
test("Standalone local preview does not silently reuse old storage",()=>{
 assert.match(js,/habitopia-family-v1/);
 assert.doesNotMatch(js,/habitopia-state-v15-browser/);
 assert.match(js,/localStorage/);
 assert.ok(js.includes("JSON.stringify"));
 assert.match(html,/Örnek aileyi inceliyorsun/);
});
test("Mobile and accessibility styling",()=>{
 assert.ok(css.includes("@media(max-width:780px)"));
 assert.ok(css.includes("@media(max-width:420px)"));
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(html,/aria-modal="true"/);
});
function harness(){
 const handlers={},map=new Map(),storage=new Map();
 const element=()=>({
   innerHTML:"",textContent:"",hidden:false,style:{},dataset:{},value:"",classList:{add(){},remove(){},toggle(){}},
   setAttribute(){},addEventListener(){},querySelector(){return{focus(){}}}
 });
 const node=(id)=>{if(!map.has(id))map.set(id,element());return map.get(id)};
 const doc={querySelector:node,querySelectorAll(){return[]},addEventListener(name,cb){handlers[name]=cb},body:{style:{}},title:""};
 const ctx={document:doc,window:{addEventListener(){},scrollTo(){},focus(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Date,console,Math,Number,String,Object,Array,Map,Set,JSON,Intl,setInterval(){},setTimeout(){return 1},clearTimeout(){},crypto:{randomUUID:()=>String(Math.random())},location:{hash:""},history:{replaceState(){}},confirm(){return true}};
 vm.runInNewContext(js,ctx,{timeout:1000});
 return {handlers,node,storage};
}
test("Initial app actually renders dashboard and separate screens",()=>{
 const h=harness();
 assert.match(h.node("#page-content").innerHTML,/Ailenin yaşam alanı/);
 assert.match(h.node("#page-content").innerHTML,/Aile Görevleri/);
 h.handlers.click({target:{closest(selector){return selector==="[data-page]"?{dataset:{page:"shopping"}}:null}},preventDefault(){}});
 assert.match(h.node("#page-content").innerHTML,/ALIŞVERİŞ BÜTÇESİ/);
 h.handlers.click({target:{closest(selector){return selector==="[data-page]"?{dataset:{page:"radar"}}:null}},preventDefault(){}});
 assert.match(h.node("#page-content").innerHTML,/İnternet taahhüdü/);
 h.handlers.click({target:{closest(selector){return selector==="[data-page]"?{dataset:{page:"calendar"}}:null}},preventDefault(){}});
 assert.match(h.node("#page-content").innerHTML,/Aile Takvimi/);
});
