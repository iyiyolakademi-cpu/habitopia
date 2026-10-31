/* Habitopia / Interactive Island – real, safe read-only projections + existing actions. */
(function(){
"use strict";
const tr={
 name:"Habitopia",today:"Bugün",completed:"tamamlandı",
 motiv:["Dünyan yeni adımlarını bekliyor.","Her tamamlanan adım adanı canlandırıyor.","Dünyan gelişmeye devam ediyor.","Harika! Bugün kendin için ilerledin."],
 line:(d,n)=>n?d+" / "+n+" bugünkü adım tamamlandı":"Yeni bir başlangıç için hazırsın.",
 level:n=>"Seviye "+n, levelStage:["Başlangıç Adası","Yeşeren Ada","Gelişen Orman","Işıklı Habitopia"],
 habitEmpty:"Henüz alışkanlığın yok. Yeni bir tane oluşturabilirsin.",
 habitCount:(d,n)=>d+" / "+n+" tamamlandı",
 habitDate:"Bugünkü alışkanlıkların",
 habitDone:"Tamamlandı",habitUndone:"Tamamlamak için dokun",
 units:"Hedef",period:d=>"Son "+d+" gün",rate:"Başarı oranı",focus:"Odak (dk)",actions:"Tamamlanan",
 unlock:"Keşfedildi",locked:x=>x+" XP'de açılır",zoneWelcome:"Keşif alanın açıldı!",
 zoneNotYet:"Bu bölgeye erişmek için biraz daha ilerlemelisin.",
 zoneDesc:"Kendi gelişim yolculuğunda yeni bir alana ulaştın."
};
const en={
 name:"Habitopia",today:"Today",completed:"complete",
 motiv:["Your world awaits your next step.","Every step brings your island to life.","Your world keeps growing.","Wonderful progress today!"],
 line:(d,n)=>n?d+" of "+n+" steps completed today":"Ready for a fresh start?",
 level:n=>"Level "+n,levelStage:["Starter Island","Growing Island","Living Forest","Glowing Habitopia"],
 habitEmpty:"No habits yet. Create your first one.",
 habitCount:(d,n)=>d+" of "+n+" completed",
 habitDate:"Today's habits",habitDone:"Done",habitUndone:"Tap to finish",
 units:"Goal",period:d=>"Last "+d+" days",rate:"Success rate",focus:"Focus (min)",actions:"Completed",
 unlock:"Discovered",locked:x=>"Unlocks at "+x+" XP",zoneWelcome:"Area discovered!",
 zoneNotYet:"Keep growing to discover this area.",zoneDesc:"You've reached a new part of your personal journey."
};
let rangeDays=7;
const zones=[
 {id:"house",name:["Ev","Home"],icon:"⌂",xp:0},
 {id:"garden",name:["Bahçe","Garden"],icon:"✿",xp:75},
 {id:"bridge",name:["Köprü","Bridge"],icon:"≈",xp:250},
 {id:"island",name:["Yeni Ada","New Island"],icon:"♧",xp:600}
];
const lang=()=>state?.settings?.lang==="en"?"en":"tr";
const w=()=>lang()==="en"?en:tr;
function put(id,text){const x=document.getElementById(id);if(x)x.textContent=String(text)}
function localeStatic(){
 const loc=lang();document.querySelectorAll("[data-island-tr]").forEach(el=>{
  const text=el.getAttribute("data-island-"+loc);if(text!=null)el.textContent=text;
 });
 document.querySelectorAll(".island-period").forEach(b=>{
  const days=Number(b.dataset.days),locText=loc==="en"?" Days":" Gün";b.textContent=days+locText;
 });
}
function metrics(){
 const today=localDateKey();
 const habits=state?.habits||[];
 const due=habits.filter(h=>habitDue(h,today));
 const done=due.filter(h=>habitCompletedOn(h,today));
 const tasks=dueTasks(),finished=tasks.filter(t=>t.completedDates?.includes(today));
 return {today,due,done,tasks,finished,doneCount:done.length+finished.length,total:due.length+tasks.length};
}
function home(){
 if(!document.querySelector(".island-home")||!state?.profile)return;
 localeStatic();
 const m=metrics(),word=w(),name=state.profile.name?.trim()||word.name,xp=Math.max(0,Number(state.progress?.xp)||0);
 put("islandName",name);
 put("islandCoins",xp);
 put("islandDailyLine",word.line(m.doneCount,m.total));
 const factor=m.total?Math.min(3,Math.floor(3*m.doneCount/m.total)):0;
 put("islandMotivation",word.motiv[factor]);
 const art=document.querySelector("#view-today .island-stage");
 if(art)art.dataset.bloom=String(factor);
}
function habits(){
 const host=document.getElementById("islandHabitRows");if(!host||!state)return;
 const m=metrics(),word=w();
 put("islandHabitDate",word.habitDate);
 put("islandHabitSummary",word.habitCount(m.done.length,m.due.length));
 if(!m.due.length){
  host.innerHTML='<div class="island-empty"><span aria-hidden="true" style="font-size:26px">❧</span><strong>'+word.habitEmpty+'</strong><button class="primary" type="button" data-action="add-habit">+ '+(lang()==="en"?"New Habit":"Yeni alışkanlık")+'</button></div>';
  return;
 }
 const iconByCategory={health:"✦",mind:"▧",order:"◈",social:"✿"};
 host.innerHTML=m.due.map(h=>{
  const done=habitCompletedOn(h,m.today);
  const sub=h.mode==="value"?
    word.units+": "+(Number(h.target)||1)+" "+esc(String(h.unit||"")):
    done?word.habitDone:word.habitUndone;
  const title=esc(h.title||"Alışkanlık");
  const id=esc(h.id),date=esc(m.today);
  const category=iconByCategory[h.category]||"❧";
  return '<article class="island-habit-row"><span aria-hidden="true">'+category+'</span>'+
    '<div class="island-habit-copy"><strong>'+title+'</strong><small>'+sub+'</small></div>'+
    '<button type="button" data-action="toggle-habit" data-id="'+id+'" data-date="'+date+
    '" class="'+(done?"is-done":"")+'" aria-label="'+title+': '+(done?word.habitDone:word.habitUndone)+
    '" aria-pressed="'+(done?"true":"false")+'">'+(done?"✓":"○")+'</button></article>';
 }).join("");
}
function world(){
 const container=document.getElementById("islandUnlocks");if(!container||!state)return;
 const word=w(),xp=Math.max(0,Number(state.progress?.xp)||0),lvl=levelInfo();
 put("islandLevel",word.level(lvl.level));
 put("islandXp",Math.round(lvl.current)+" / "+Math.round(lvl.need)+" XP");
 const fill=document.getElementById("islandXpFill");if(fill)fill.style.width=String(lvl.pct)+"%";
 const stage=xp>=600?3:xp>=250?2:xp>=75?1:0;
 put("islandWorldStage",word.levelStage[stage]);
 container.innerHTML=zones.map(z=>{
  const unlocked=xp>=z.xp,label=z.name[lang()==="en"?1:0];
  return '<button type="button" class="island-unlock '+(unlocked?"":"is-locked")+
   '" data-action="island-zone" data-id="'+z.id+'" aria-label="'+esc(label)+'">'+
   '<span aria-hidden="true">'+z.icon+'</span><strong>'+esc(label)+'</strong><small>'+
   (unlocked?word.unlock:word.locked(z.xp))+'</small></button>';
 }).join("");
}
function progress(){
 if(!state||!document.getElementById("islandTrendChart"))return;
 const word=w(),today=localDateKey(),datas=[];let doneTotal=0,dueTotal=0,taskCount=0;
 for(let offset=rangeDays-1;offset>=0;offset--){
  const date=addDays(today,-offset);let due=0,done=0;
  for(const h of state.habits||[]){if(habitDue(h,date)){due++;if(habitCompletedOn(h,date))done++;}}
  doneTotal+=done;dueTotal+=due;
  taskCount+=(state.tasks||[]).filter(t=>Array.isArray(t.completedDates)&&t.completedDates.includes(date)).length;
  datas.push({done,due});
 }
 const earliest=addDays(today,-rangeDays+1);
 const focus=(state.tracking?.focusSessions||[]).reduce((n,s)=>{
  return s?.date>=earliest&&s?.date<=today?n+Math.max(0,Number(s.minutes)||0):n;
 },0);
 const success=dueTotal?Math.round(100*doneTotal/dueTotal):0;
 put("islandGrowthPeriodText",word.period(rangeDays));
 const el=document.getElementById("islandTrendMetrics");
 if(el)el.innerHTML='<div><strong>'+success+'%</strong><span>'+word.rate+'</span></div>'+
   '<div><strong>'+Math.round(focus)+'</strong><span>'+word.focus+'</span></div>'+
   '<div><strong>'+taskCount+'</strong><span>'+word.actions+'</span></div>';
 const chart=document.getElementById("islandTrendChart");
 if(chart)chart.innerHTML=dueTotal?datas.map(a=>{
    const h=a.due?Math.max(4,Math.round(a.done/a.due*140)):3;
    return '<span class="island-chart-bar" style="height:'+h+'px" aria-hidden="true"></span>';
 }).join(""):'<span class="island-chart-empty">'+(lang()==="en"?"Start your first habit to see your progress.":"Grafiğin oluşması için ilk alışkanlığını ekle.")+'</span>';
 document.querySelectorAll(".island-period").forEach(b=>{
  const active=Number(b.dataset.days)===rangeDays;b.classList.toggle("active",active);
  b.setAttribute("aria-pressed",String(active));
 });
}
function draw(){if(!state)return;home();habits();world();progress()}
function navigate(name){
 if(!document.getElementById("view-"+name))return;
 if(document.querySelector(".view.active")?.id!=="view-"+name){
   history.pushState({island:name},"","#"+name);
 }
 showView(name);
}
const oldRenderAll=renderAll;
renderAll=function(...args){const res=oldRenderAll.apply(this,args);draw();return res};
const oldRenderHabits=renderHabits;
renderHabits=function(...args){const res=oldRenderHabits.apply(this,args);habits();return res};
const oldRenderProfile=renderProfile;
renderProfile=function(...args){const res=oldRenderProfile.apply(this,args);progress();return res};
const oldRenderToday=renderToday;
renderToday=function(...args){const res=oldRenderToday.apply(this,args);home();return res};
const oldShowView=showView;
showView=function(name){
 const res=oldShowView(name);
 if(name==="world")world();
 if(name==="habits")habits();
 if(name==="profile")progress();
 if(name==="today")home();
 document.documentElement.classList.toggle("journey-home-active",name==="today");
 return res;
};
const oldHandleAction=handleAction;
handleAction=function(action,el){
 switch(action){
  case "island-home":navigate("today");return;
  case "island-habits":navigate("habits");return;
  case "island-world":navigate("world");return;
  case "island-growth":navigate("profile");return;
  case "island-account":navigate("account");return;
  case "island-tasks":navigate("tasks");return;
  case "island-plan":navigate("plan");return;
  case "island-period":{
   const n=Number(el.dataset.days);if([7,30,90].includes(n)){rangeDays=n;progress();}return;
  }
  case "island-zone":{
   const z=zones.find(x=>x.id===el.dataset.id);if(!z)return;
   const label=z.name[lang()==="en"?1:0],xp=Number(state?.progress?.xp)||0,word=w();
   if(xp<z.xp){showToast(word.zoneNotYet);return;}
   showDialog('<h2>'+esc(label)+'</h2><p>'+word.zoneDesc+'</p>'+
    '<button type="button" class="primary" data-action="island-home">'+
    (lang()==="en"?"Return to world":"Dünyama dön")+'</button>');
   return;
  }
  default:return oldHandleAction(action,el);
 }
};
window.addEventListener("popstate",()=>{
 const view=location.hash.replace(/^#/,"");
 const safe=["today","habits","world","profile","account","tasks","plan","challenges"];
 showView(safe.includes(view)?view:"today");
});
window.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!document.querySelector(".sheet-backdrop.open,.dialog-backdrop.open") &&
  document.querySelector(".view.active")?.id!=="view-today")showView("today");
});
draw();
})();
