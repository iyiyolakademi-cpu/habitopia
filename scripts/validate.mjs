import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import vm from "node:vm";
const html=await readFile(resolve("index.html"),"utf8");
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
if(scripts.length!==4)throw Error(`Expected 4 inline scripts, got ${scripts.length}`);
scripts.forEach(([whole,js],idx)=>{new vm.Script(js,{filename:`inline-${idx}.js`})});
for(const key of ["BASE_CSS","DATA_SAFETY_JS","CORE_JS","POLISH_CSS","POLISH_JS","REDESIGN_CSS","REDESIGN_JS","MIDNIGHT_CSS"]){
  if(html.includes(`<!-- HBT:${key} -->`))throw Error(`Unbuilt ${key}`);
}
if(!html.includes("HabitopiaDataSafety"))throw Error("Data safety helper not bundled");
console.log("PASS: index JavaScript syntax, embedded safety module, and no leftover tokens");
