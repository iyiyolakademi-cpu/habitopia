/* Habitopia Living Map — live projections of the existing account state. */
(function(){
 "use strict";
 const wording={
  tr:{
   chapter:"HABITOPIA / YENİ BİR GÜN",headline:"Kendi yolunu",headlineEnd:"çiz.",
   tagline:"Bir liste değil. Bugün keşfedeceğin bir dünya.",map:"BUGÜNÜN ROTASI",stops:"4 DURAK",
   habit:"Ritim Ormanı",task:"Görev Yolu",focus:"Sessiz Vadi",plan:"Ufuk Noktası",
   habitEmpty:"Yeni bir ritim oluştur",taskEmpty:"İlk görevini oluştur",
   focusEmpty:"Zihnini dinlendir",planCopy:"Takvim ve hedefler",
   countHabit:(done,total)=>done+"/"+total+" alışkanlık",countTask:(done,total)=>done+"/"+total+" görev",
   focusMinutes:n=>n+" dakika odak",forest:["Dünyan seni bekliyor.","İlk adımların toprağa işleniyor.","Ağacın yeni yapraklar açıyor.","Bu dünya seninle canlanıyor.","Bugün yolculuğunu tamamladın."],
   footnote:"Dört ayrı durak. Tek bir yolculuk.",workbench:"Günlük defterim",workbenchSub:"Görevler, su, odak ve günlük araçlar",
   nav:{today:"Rotam",habits:"Ritim",plan:"Takvim",profile:"İzlerim",account:"Ben"}
  },
  en:{
   chapter:"HABITOPIA / A NEW DAY",headline:"Find your own",headlineEnd:"path.",
   tagline:"Not a dashboard. A world to explore today.",map:"TODAY'S PATH",stops:"4 STOPS",
   habit:"Rhythm Forest",task:"Task Trail",focus:"Quiet Valley",plan:"Horizon Point",
   habitEmpty:"Create your first habit",taskEmpty:"Create your first task",
   focusEmpty:"Find your focus",planCopy:"Calendar and goals",
   countHabit:(done,total)=>done+"/"+total+" habits",countTask:(done,total)=>done+"/"+total+" tasks",
   focusMinutes:n=>n+" minutes focused",forest:["Your world is waiting.","Your first steps are taking root.","Your tree is growing new leaves.","Your world is coming alive.","You've completed today's journey."],
   footnote:"Four stops. One journey.",workbench:"My daily notebook",workbenchSub:"Tasks, water, focus and daily tools",
   nav:{today:"My Path",habits:"Rhythm",plan:"Calendar",profile:"My Traces",account:"Me"}
  }
 };
 function t(){return wording[state?.settings?.lang==="en"?"en":"tr"]}
 function put(id,value){const node=document.getElementById(id);if(node)node.textContent=String(value)}
 function setHomeClass(){
   document.documentElement.classList.toggle("journey-home-active",!!document.getElementById("view-today")?.classList.contains("active"));
 }
 function renderJourney(){
   const scene=document.getElementById("journeyScene");
   if(!scene || !state || !state.settings)return;
   const w=t(),today=localDateKey();
   const dueHabits=(Array.isArray(state.habits)?state.habits:[]).filter(h=>habitDue(h,today));
   const doneHabits=dueHabits.filter(h=>habitCompletedOn(h,today)).length;
   const todayTasks=dueTasks();
   const doneTasks=todayTasks.filter(x=>Array.isArray(x.completedDates)&&x.completedDates.includes(today)).length;
   const focusMinutes=(state.tracking?.focusSessions||[]).filter(s=>s?.date===today)
      .reduce((total,s)=>total+Math.max(0,Number(s.minutes)||0),0);
   const total=dueHabits.length+todayTasks.length;
   const done=doneHabits+doneTasks;
   const level=total?Math.max(0,Math.min(4,Math.floor(4*done/total))):0;
   for(let i=0;i<=4;i++)scene.classList.toggle("journey-level-"+i,i===level);
   const lang=state.settings.lang==="en"?"en-US":"tr-TR";
   put("journeyChapter",w.chapter);
   put("journeyDate",dateFromKey(today).toLocaleDateString(lang,{day:"numeric",month:"short"}));
   const header=document.getElementById("journeyHeadline");
   if(header){header.replaceChildren(document.createTextNode(w.headline),document.createElement("br"));
     const em=document.createElement("em");em.textContent=w.headlineEnd;header.appendChild(em);}
   put("journeyTagline",w.tagline);
   put("journeyMapTitle",w.map);put("journeyWorldHint",w.stops);
   put("journeyHabitTitle",w.habit);put("journeyTaskTitle",w.task);
   put("journeyFocusTitle",w.focus);put("journeyPlanTitle",w.plan);
   put("journeyHabitCount",dueHabits.length?w.countHabit(doneHabits,dueHabits.length):w.habitEmpty);
   put("journeyTaskCount",todayTasks.length?w.countTask(doneTasks,todayTasks.length):w.taskEmpty);
   put("journeyFocusCount",focusMinutes?w.focusMinutes(Math.round(focusMinutes)):w.focusEmpty);
   put("journeyPlanCount",w.planCopy);
   put("journeyWorldMessage",w.forest[level]);put("journeyFootnote",w.footnote);
   put("journeyWorkbenchTitle",w.workbench);put("journeyWorkbenchSubtitle",w.workbenchSub);
   for(const [view,label] of Object.entries(w.nav)){
     const el=document.querySelector('.nav-btn[data-view="'+view+'"] span');
     if(el)el.textContent=label;
   }
   setHomeClass();
 }
 // These wrappers run after the original render methods; no data schema or save logic changes.
 const oldRenderToday=renderToday;
 renderToday=function(...args){const result=oldRenderToday.apply(this,args);renderJourney();return result};
 const oldRenderAll=renderAll;
 renderAll=function(...args){const result=oldRenderAll.apply(this,args);renderJourney();return result};
 const oldShowView=showView;
 showView=function(...args){const result=oldShowView.apply(this,args);setHomeClass();if(args[0]==="today")renderJourney();return result};
 const oldHandleAction=handleAction;
 handleAction=function(action,element){
   if(action==="journey-habits"){showView("habits");return}
   if(action==="journey-tasks"){
     const details=document.getElementById("journeyWorkbench");
     if(details){
       details.open=true;
       const target=details.querySelector(".quick-add")||details;
       const reduce=state?.settings?.reduceMotion||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
       target.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
     }
     return;
   }
   return oldHandleAction(action,element);
 };
 setHomeClass();
})();
