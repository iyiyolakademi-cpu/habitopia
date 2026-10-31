/* Habitopia 3.0: navigation, calendar and accessible dashboard presentation.
   Read-only projections of existing state: no schema changes. */
(function(){
  "use strict";
  const labels={
    tr:{today:"Bugün",habits:"Alışkanlıklar",plan:"Planım",profile:"Gelişim",account:"Profil",
      daily:"GÜNLÜK PLAN",todayLabel:"Bugün",progress:"tamamlandı",slogan:"Kendi yolunda ilerle.",
      summary:"Küçük adımlar her gün birikir.",empty:"İlk adımını bugün planla.",steps:"adım",
      task:"+ Görev ekle",calendar:"TAKVİM",planTitle:"Planım",planSub:"Takvimin ve kişisel planın tek yerde.",
      tools:"Planlama araçların",calendarAction:"Gelişim takvimi",calendarDetail:"Tüm geçmişini incele",
      routineAction:"Rutinlerim",routineDetail:"Sabah ve akşam",
      goalsAction:"Haftalık hedefler",goalsDetail:"Bu haftanın odağı",
      challengeAction:"21 günlük hedefler",challengeDetail:"Meydan okumalarını aç",back:"← Planıma dön",
      tasksDone:"Görev",habitsDone:"Alışkanlık",focusDone:"Odak (dk)",
      dayActivity:"Seçili günün ilerlemesi",future:"Gelecek gün",past:"Günlük kayıt",
      performance:"Gelişim özeti",last30:"Son 30 gün",
      habitSuccess:"Alışkanlık",focusMin:"Odak (dk)",streak:"Günlük seri",
      accountTitle:"Profilim",accountSub:"Hedeflerin ve kişisel ayarların.",accountTools:"Kişisel alanım",
      personal:"Kişisel gelişim yolculuğun",habits:"Alışkanlıklar",doneTotal:"Tamamlanan",notesCount:"Notlar",
      notes:"Not defteri",journal:"Günlük",weekly:"Haftalık değerlendirme",settings:"Ayarlar ve görünüm",
      privacy:"Verilerin ve kişisel gelişimin senin kontrolünde.",
      goalFocus:"Odaklanma",goalHealth:"Sağlıklı yaşam",goalOrder:"Düzen",goalBalance:"Dengeli yaşam"},
    en:{today:"Today",habits:"Habits",plan:"My Plan",profile:"Growth",account:"Profile",
      daily:"DAILY PLAN",todayLabel:"Today",progress:"complete",slogan:"Grow at your own pace.",
      summary:"Small steps add up every day.",empty:"Take your first step today.",steps:"steps",
      task:"+ Add task",calendar:"CALENDAR",planTitle:"My Plan",planSub:"Your calendar and personal plan in one place.",
      tools:"Planning tools",calendarAction:"Growth calendar",calendarDetail:"Review your history",
      routineAction:"My routines",routineDetail:"Morning and evening",
      goalsAction:"Weekly goals",goalsDetail:"Focus for this week",
      challengeAction:"21-day challenges",challengeDetail:"See your challenges",back:"← Back to my plan",
      tasksDone:"Tasks",habitsDone:"Habits",focusDone:"Focus (min)",
      dayActivity:"Progress for selected day",future:"Upcoming day",past:"Daily record",
      performance:"Growth overview",last30:"Last 30 days",
      habitSuccess:"Habits",focusMin:"Focus (min)",streak:"Day streak",
      accountTitle:"My Profile",accountSub:"Your goals and preferences.",accountTools:"Personal space",
      personal:"Your personal growth journey",doneTotal:"Completed",notesCount:"Notes",
      notes:"Notebook",journal:"Journal",weekly:"Weekly review",settings:"Settings and appearance",
      privacy:"Your personal progress and data remain in your control.",
      goalFocus:"Focus",goalHealth:"Healthy living",goalOrder:"Organization",goalBalance:"Balanced life"}
  };
  const NAV=[
    {name:"today",svg:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'},
    {name:"habits",svg:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>'},
    {name:"plan",svg:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18"/>'},
    {name:"profile",svg:'<path d="M4 19V12m5 7V5m5 14v-9m5 9V8"/>'},
    {name:"account",svg:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'}
  ];
  let displayMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
  let selectedDay=localDateKey();
  function locale(){return state?.settings?.lang==="en"?"en":"tr"}
  function dict(){return labels[locale()]}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function niceDate(key,opts){
    return dateFromKey(key).toLocaleDateString(locale()==="en"?"en-US":"tr-TR",opts)
  }
  function calendarKey(year,month,day){return year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0")}
  function activityOn(key){
    const completedTasks=(state.tasks||[]).filter(x=>Array.isArray(x.completedDates)&&x.completedDates.includes(key)).length;
    const completedHabits=(state.habits||[]).filter(x=>habitDue(x,key)&&habitCompletedOn(x,key)).length;
    const focus=(state.tracking?.focusSessions||[]).filter(x=>x.date===key).reduce((sum,x)=>sum+(Number(x.minutes)||0),0);
    return {completedTasks,completedHabits,focus:Math.round(focus)};
  }
  function drawNav(){
    const d=dict();
    const current=document.querySelector(".view.active")?.id?.replace("view-","");
    const selected=current==="challenges"?"plan":current;
    document.querySelectorAll(".nav-btn").forEach(button=>{
      const item=NAV.find(x=>x.name===button.dataset.view);
      if(!item)return;
      const title=d[item.name];
      button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+item.svg+'</svg><span>'+title+'</span>';
      button.setAttribute("aria-label",title);
      if(selected===item.name){button.setAttribute("aria-current","page");button.classList.add("active")}
      else{button.removeAttribute("aria-current");button.classList.remove("active")}
    });
    document.documentElement.lang=locale()==="en"?"en":"tr";
  }
  function summary(){
    const el=document.getElementById("hbtTodaySummary");if(!el||!state)return;
    const d=dict(),today=localDateKey(),tasks=dueTasks(),habits=(state.habits||[]).filter(x=>habitDue(x,today));
    const doneTasks=tasks.filter(x=>Array.isArray(x.completedDates)&&x.completedDates.includes(today)).length;
    const doneHabits=habits.filter(x=>habitCompletedOn(x,today)).length;
    const total=tasks.length+habits.length,done=doneTasks+doneHabits,pct=total?Math.round(done*100/total):0;
    setText("hbtDailyGreeting",d.daily);
    setText("hbtSummaryWeek",niceDate(today,{weekday:"long",day:"numeric",month:"short"}));
    setText("hbtSummaryTitle",d.slogan);
    setText("hbtSummaryCopy",total?d.summary:d.empty);
    setText("hbtProgressPercent",pct+"%");
    setText("hbtPercentLabel",d.progress);
    setText("hbtSummaryCount",done+" / "+total+" "+d.steps);
    setText("hbtQuickTask",d.task);
    document.getElementById("hbtProgressCircle")?.style.setProperty("--progress",String(pct));
  }
  function calendar(){
    const host=document.getElementById("hbtCalendarDays");if(!host||!state)return;
    const d=dict(),year=displayMonth.getFullYear(),month=displayMonth.getMonth(),
          today=localDateKey(),last=new Date(year,month+1,0).getDate(),start=(new Date(year,month,1).getDay()+6)%7;
    setText("hbtPlanTitle",d.planTitle);setText("hbtPlanSubtitle",d.planSub);
    setText("hbtPlanToolsHeading",d.tools);setText("hbtCalendarCaption",d.calendar);
    setText("hbtCalendarMonth",displayMonth.toLocaleDateString(locale()==="en"?"en-US":"tr-TR",{month:"long",year:"numeric"}));
    for(const [id,text] of [
      ["hbtCalendarAction",d.calendarAction],["hbtCalendarActionDetail",d.calendarDetail],
      ["hbtRoutineAction",d.routineAction],["hbtRoutineActionDetail",d.routineDetail],
      ["hbtGoalsAction",d.goalsAction],["hbtGoalsActionDetail",d.goalsDetail],
      ["hbtChallengeAction",d.challengeAction],["hbtChallengeActionDetail",d.challengeDetail],
      ["hbtBackToPlan",d.back]])setText(id,text);
    document.getElementById("hbtCalendarWeekdays").innerHTML=(locale()==="en"?["M","T","W","T","F","S","S"]:["P","S","Ç","P","C","C","P"]).map(x=>'<span>'+x+'</span>').join("");
    let html='<span class="hbt-blank" aria-hidden="true"></span>'.repeat(start);
    for(let i=1;i<=last;i++){
      const key=calendarKey(year,month,i),activity=activityOn(key),marked=activity.completedTasks+activity.completedHabits+activity.focus>0;
      const classes=[key===today?"is-today":"",key===selectedDay?"is-selected":"",key>today?"is-future":""].filter(Boolean).join(" ");
      html+='<button type="button" class="'+classes+'" data-action="hbt-select-day" data-date="'+key+'" aria-pressed="'+String(key===selectedDay)+'" aria-label="'+niceDate(key,{day:"numeric",month:"long",year:"numeric"})+'">'+i+(marked?"<i aria-hidden=\"true\"></i>":"")+'</button>';
    }
    host.innerHTML=html;selected();
  }
  function selected(){
    const host=document.getElementById("hbtSelectedDay");if(!host||!state)return;
    const d=dict(),a=activityOn(selectedDay),today=localDateKey();
    host.innerHTML='<div class="hbt-selected-day-title"><strong>'+niceDate(selectedDay,{day:"numeric",month:"long",year:"numeric"})+'</strong><span>'+(selectedDay>today?d.future:d.dayActivity)+'</span></div>'+
      '<div class="hbt-selected-day-metrics">'+
      '<div><strong>'+a.completedTasks+'</strong><span>'+d.tasksDone+'</span></div>'+
      '<div><strong>'+a.completedHabits+'</strong><span>'+d.habitsDone+'</span></div>'+
      '<div><strong>'+a.focus+'</strong><span>'+d.focusDone+'</span></div></div>';
  }
  function insights(){
    const host=document.getElementById("hbtInsightSummary");if(!host||!state)return;
    const d=dict(),today=localDateKey();let due=0,done=0,focus=0;
    for(let k=0;k<30;k++){
      const day=addDays(today,-k);
      for(const h of state.habits||[]){if(habitDue(h,day)){due++;if(habitCompletedOn(h,day))done++}}
    }
    for(const x of state.tracking?.focusSessions||[]){if(x.date>=addDays(today,-29)&&x.date<=today)focus+=Number(x.minutes)||0}
    const rate=due?Math.round(done/due*100):0;
    host.innerHTML='<div class="hbt-insight-top"><strong>'+d.performance+'</strong><span>'+d.last30+'</span></div>'+
      '<div class="hbt-insight-metrics"><div><strong>'+rate+'%</strong><span>'+d.habitSuccess+'</span></div>'+
      '<div><strong>'+Math.round(focus)+'</strong><span>'+d.focusMin+'</span></div>'+
      '<div><strong>'+Math.max(0,Number(state.progress?.currentStreak)||0)+'</strong><span>'+d.streak+'</span></div></div>';
  }
  function account(){
    const host=document.getElementById("hbtAccountHero");if(!host||!state)return;
    const d=dict(),profile=state.profile||{},name=String(profile.name||"Habitopia").slice(0,28),
    names={focusGoal:d.goalFocus,healthGoal:d.goalHealth,orderGoal:d.goalOrder,balanceGoal:d.goalBalance};
    setText("hbtAccountTitle",d.accountTitle);setText("hbtAccountSubtitle",d.accountSub);
    setText("hbtAccountToolsHeading",d.accountTools);
    for(const [id,text] of [
      ["hbtNotesLabel",d.notes],["hbtJournalLabel",d.journal],
      ["hbtWeeklyLabel",d.weekly],["hbtSettingsLabel",d.settings],
      ["hbtAccountPrivacy",d.privacy]])setText(id,text);
    host.innerHTML='<div class="hbt-account-intro"><div class="hbt-account-avatar" aria-hidden="true">'+esc(name[0]?.toLocaleUpperCase(locale()==="en"?"en-US":"tr-TR")||"H")+'</div><div><strong>'+esc(name)+'</strong><span>'+esc(names[profile.goal]||d.personal)+'</span></div></div>'+
      '<div class="hbt-account-stats"><div><strong>'+(state.habits||[]).length+'</strong><span>'+d.habits+'</span></div>'+
      '<div><strong>'+Math.max(0,Number(state.progress?.totalCompleted)||0)+'</strong><span>'+d.doneTotal+'</span></div>'+
      '<div><strong>'+(state.tracking?.notes||[]).length+'</strong><span>'+d.notesCount+'</span></div></div>';
  }
  function redraw(){drawNav();summary();calendar();insights();account()}
  const priorRenderStatic=renderStatic;
  renderStatic=function(){priorRenderStatic();drawNav()};
  const priorRenderAll=renderAll;
  renderAll=function(){priorRenderAll();redraw()};
  const priorShowView=showView;
  showView=function(name){priorShowView(name);drawNav();if(name==="plan")calendar();if(name==="account")account();if(name==="profile")insights()};
  const priorHandleAction=handleAction;
  handleAction=function(action,el){
    switch(action){
      case "go-account":showView("account");return;
      case "go-plan":showView("plan");return;
      case "go-challenges":showView("challenges");return;
      case "hbt-month-prev":displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()-1,1,12);calendar();return;
      case "hbt-month-next":displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()+1,1,12);calendar();return;
      case "hbt-select-day":
        if(/^\d{4}-\d{2}-\d{2}$/.test(el.dataset.date||"")){
          selectedDay=el.dataset.date;calendar();
        }
        return;
      default:return priorHandleAction(action,el);
    }
  };
})();
