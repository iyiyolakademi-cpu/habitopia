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
  ["UNIVERSE_CSS","src/styles/universe.css",c=>`<style id="habitopia-universe">${c}</style>`],
  ["JOURNEY_CSS","src/styles/journey.css",c=>`<style id="habitopia-journey">${c}</style>`],
  ["ISLAND_CSS","src/styles/island.css",c=>`<style id="habitopia-island">${c}</style>`],
  ["POLISH_JS","src/scripts/polish.js",c=>`<script id="habitopia-v3-behavior">${c}</script>`],
  ["REDESIGN_JS","src/scripts/redesign.js",c=>`<script id="habitopia-redesign-behavior">${c}</script>`],
  ["JOURNEY_JS","src/scripts/journey.js",c=>`<script id="habitopia-journey-behavior">${c}</script>`],
  ["ISLAND_JS","src/scripts/island.js",c=>`<script id="habitopia-island-behavior">${c}</script>`]
];
let output=await readFile(resolve(root,"src/index.template.html"),"utf8");
for(const [key,path,wrap] of parts){
  const token=`<!-- HBT:${key} -->`;
  if(output.split(token).length!==2)throw Error(`Missing or duplicate token ${token}`);
  output=output.replace(token,wrap(await readFile(resolve(root,path),"utf8")));
}
if(output.includes("<!-- HBT:"))throw Error("Unfilled template token");
// The new root is the launcher. The complete Habitopia app is built as a separate page.
const files=[
  ["habitopia.html",output],
  ["index.html",await readFile(resolve(root,"src/launcher.html"),"utf8")],
  ["hayat-borsan.html",await readFile(resolve(root,"src/hayat-borsan.html"),"utf8")]
];
for(const [name,contents] of files){
  const destination=resolve(root,name);
  if(process.argv.includes("--check")){
    const current=await readFile(destination,"utf8");
    if(current!==contents){console.error(name+" is out of date; run node scripts/build.mjs");process.exitCode=1}
    else console.log("PASS: "+name+" matches src/");
  }else{
    await writeFile(destination,contents,"utf8");
    console.log("Updated "+name);
  }
}
