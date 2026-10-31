import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import vm from "node:vm";
const html=await readFile(resolve("habitopia.html"),"utf8");
const landing=await readFile(resolve("index.html"),"utf8");
const market=await readFile(resolve("hayat-borsan.html"),"utf8");
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
if(scripts.length!==6)throw Error(`Expected 6 inline scripts, got ${scripts.length}`);
scripts.forEach(([whole,js],idx)=>{new vm.Script(js,{filename:`inline-${idx}.js`})});
for(const key of ["BASE_CSS","DATA_SAFETY_JS","CORE_JS","POLISH_CSS","POLISH_JS","REDESIGN_CSS","REDESIGN_JS","MIDNIGHT_CSS","UNIVERSE_CSS","JOURNEY_CSS","JOURNEY_JS","ISLAND_CSS","ISLAND_JS"]){
  if(html.includes(`<!-- HBT:${key} -->`))throw Error(`Unbuilt ${key}`);
}
if(!html.includes("HabitopiaDataSafety"))throw Error("Data safety helper not bundled");
if(!html.includes("journeyScene") || !html.includes("journeyWorkbench"))throw Error("Legacy task layout missing");
if(!html.includes("class=\"island-gates\"")||!html.includes("view-world")||!html.includes("view-tasks"))throw Error("Four-choice island layout missing");
if(!landing.includes('href="habitopia.html"')||!landing.includes('href="hayat-borsan.html"'))throw Error("Launcher links are missing");
if(!html.includes('href="index.html"')||!html.includes('href="hayat-borsan.html"'))throw Error("Habitopia world switch is missing");
if(!market.includes('href="habitopia.html"')||!market.includes('href="index.html"'))throw Error("Market world switch is missing");
if(!market.includes("firebase-app.js")||!market.includes('const KEY="hayatborsasi_terminal_v2"'))throw Error("Market state or Firebase integration is missing");
console.log("PASS: 3 app pages, original Firebase integration, Habitopia scripts and routes");
