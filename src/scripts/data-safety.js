/* Habitopia safety helpers. Bundled inline by scripts/build.mjs for offline/WebView compatibility. */
(function(root){
  "use strict";
  const KNOWN_KEYS=["profile","settings","progress","tasks","quests","habits","challenges","water","tracking","planner","focusTimer","achievements"];
  function isRecord(value){
    return value!==null && typeof value==="object" && !Array.isArray(value);
  }
  function isPlausibleState(value){
    if(!isRecord(value))return false;
    return KNOWN_KEYS.some(key=>{
      if(!Object.prototype.hasOwnProperty.call(value,key))return false;
      if(["tasks","quests","habits","challenges","achievements"].includes(key))return Array.isArray(value[key]);
      return isRecord(value[key]);
    });
  }
  function safeParseState(raw){
    if(typeof raw!=="string" || !raw.trim() || raw.length>8*1024*1024)return null;
    try{const parsed=JSON.parse(raw);return isPlausibleState(parsed)?parsed:null}catch(error){return null}
  }
  function updatedAt(parsed){
    if(!isPlausibleState(parsed))return 0;
    const raw=parsed.updatedAt || parsed.createdAt;
    const stamp=typeof raw==="string"?Date.parse(raw):NaN;
    return Number.isFinite(stamp)&&stamp>0?stamp:0;
  }
  function decideStartupState(localText,cloudText){
    const local=safeParseState(localText);
    const cloud=safeParseState(cloudText);
    if(!cloud)return {source:local?"local":"none",reason:cloudText?"invalid-cloud":"no-cloud",overwrite:false};
    if(!local)return {source:"cloud",reason:localText?"invalid-local":"no-local",overwrite:true};
    if(updatedAt(local)>updatedAt(cloud))return {source:"local",reason:"local-newer",overwrite:false};
    return {source:"cloud",reason:"cloud-newer-or-equal",overwrite:localText!==cloudText};
  }
  const api=Object.freeze({isPlausibleState,safeParseState,updatedAt,decideStartupState});
  root.HabitopiaDataSafety=api;
  if(typeof module==="object" && module.exports)module.exports=api;
})(typeof globalThis==="object"?globalThis:window);
