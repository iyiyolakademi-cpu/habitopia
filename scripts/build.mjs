// Builds the self-contained index.html for Github Pages, offline copies, and embedded WebViews.
// Never edit the generated index directly; edit src/ and run node scripts/build.mjs.
import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const parts=[
  ["BASE_CSS","src/styles/base.css",c=>`<style>${c}</style>`],
  ["DATA_SAFETY_JS","src/scripts/data-safety.js",c=>`<script>${c}</script>`],
  ["CORE_JS","src/scripts/core.js",c=>`<script>${c}</script>`],
  ["POLISH_CSS","src/styles/polish.css",c=>`<style id="habitopia-v3-polish">${c}</style>`],
  ["REDESIGN_CSS","src/styles/redesign.css",c=>`<style id="habitopia-redesign">${c}</style>`],
  ["MIDNIGHT_CSS","src/styles/midnight.css",c=>`<style id="habitopia-midnight">${c}</style>`],
  ["POLISH_JS","src/scripts/polish.js",c=>`<script id="habitopia-v3-behavior">${c}</script>`],
  ["REDESIGN_JS","src/scripts/redesign.js",c=>`<script id="habitopia-redesign-behavior">${c}</script>`]
];
let output=await readFile(resolve(root,"src/index.template.html"),"utf8");
for(const [key,path,wrap] of parts){
  const token=`<!-- HBT:${key} -->`;
  if(output.split(token).length!==2)throw Error(`Missing or duplicate token ${token}`);
  output=output.replace(token,wrap(await readFile(resolve(root,path),"utf8")));
}
if(output.includes("<!-- HBT:"))throw Error("Unfilled template token");
const target=resolve(root,"index.html");
if(process.argv.includes("--check")){
  const existing=await readFile(target,"utf8");
  if(existing!==output){console.error("index.html is out of date; run node scripts/build.mjs");process.exitCode=1}
  else console.log("PASS: generated index.html matches src/");
}else{
  await writeFile(target,output,"utf8");
  console.log("Updated index.html from src/");
}
