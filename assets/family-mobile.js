/* Habitopia Aile: keyboard-safe mobile viewport and accessible touch feedback. */
(()=>{
"use strict";
function updateViewport(){
 const viewport=window.visualViewport;
 if(!viewport)return;
 const height=Math.max(300,Math.round(viewport.height));
 document.documentElement.style.setProperty("--app-vvh",height+"px");
 const hidden=Math.max(0,window.innerHeight-viewport.height);
 document.documentElement.classList.toggle("keyboard-visible",hidden>140);
}
function setup(){
 updateViewport();
 window.visualViewport?.addEventListener("resize",updateViewport,{passive:true});
 window.visualViewport?.addEventListener("scroll",updateViewport,{passive:true});
 window.addEventListener("orientationchange",()=>setTimeout(updateViewport,100),{passive:true});
 document.addEventListener("focusin",event=>{
   const target=event.target;
   if(!target?.matches?.("input,select,textarea"))return;
   if(!target.closest?.(".modal,.cloud-dialog"))return;
   setTimeout(()=>{
     if(document.activeElement!==target)return;
     target.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
   },220);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
else setup();
})();
