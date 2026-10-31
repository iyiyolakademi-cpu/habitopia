(() => {
  "use strict";
  const KEY = "habitopia:nova:v1";
  const MOODS = {great:"Harika hissetmen çok güzel ✨",good:"Güzel bir gün olsun 🌿",okay:"Normal hissetmek de normaldir.",low:"Kendine nazik davran. Küçük adımlar yeterli."};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const id = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const dayKey = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.valueOf())) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  };
  const lastDays = (number) => Array.from({length:number},(_,i) => {
    const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() - (number - 1 - i)); return dayKey(date);
  });
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cleanTitle = (x,max) => typeof x === "string" ? x.trim().slice(0,max) : "";
  const validDay = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && dayKey(x+"T12:00:00") === x;
  const safeTime = (x) => typeof x === "string" && !Number.isNaN(Date.parse(x)) ? x : null;
  const uniqueId = (x) => typeof x === "string" && /^[a-zA-Z0-9_-]{1,90}$/.test(x) ? x : id();
  const emptyState = () => ({name:"",onboarded:false,habits:[],tasks:[],focusSessions:[],moods:{},createdAt:new Date().toISOString()});
  const normalize = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Desteklenmeyen veri biçimi");
    const s = emptyState();
    s.name = cleanTitle(raw.name,32);
    s.onboarded = raw.onboarded === true;
    s.createdAt = safeTime(raw.createdAt) || s.createdAt;
    s.habits = Array.isArray(raw.habits) ? raw.habits.slice(0,300).map(h => ({
      id:uniqueId(h?.id), title:cleanTitle(h?.title,80),
      completedDays:Array.isArray(h?.completedDays) ? [...new Set(h.completedDays.filter(validDay))].slice(-1000) : []
    })).filter(x => x.title) : [];
    s.tasks = Array.isArray(raw.tasks) ? raw.tasks.slice(0,1500).map(t => ({
      id:uniqueId(t?.id),title:cleanTitle(t?.title,100),createdAt:safeTime(t?.createdAt)||s.createdAt,
      completedAt:safeTime(t?.completedAt)
    })).filter(x => x.title) : [];
    s.focusSessions = Array.isArray(raw.focusSessions) ? raw.focusSessions.slice(0,2000).map(x => ({
      id:uniqueId(x?.id),minutes:[10,25,45].includes(x?.minutes)?x.minutes:0,
      completedAt:safeTime(x?.completedAt)
    })).filter(x=>x.minutes && x.completedAt) : [];
    if(raw.moods && typeof raw.moods === "object" && !Array.isArray(raw.moods)){
      Object.entries(raw.moods).slice(-600).forEach(([day,value]) => {
        if(validDay(day) && Object.hasOwn(MOODS,value)) s.moods[day]=value;
      });
    }
    return s;
  };
  let state;
  let storageAvailable = true;
  try {const saved = localStorage.getItem(KEY);state=saved ? normalize(JSON.parse(saved)) : emptyState();}
  catch(error){state=emptyState();storageAvailable=false;console.error("Habitopia local data error",error);}
  const persist = () => {
    if(!storageAvailable) return false;
    try {localStorage.setItem(KEY,JSON.stringify(state));return true;}
    catch(error){storageAvailable=false;console.error("Habitopia save error",error);notify("Depolama kullanılamıyor; yeni değişiklikler kalıcı olmayabilir.");return false;}
  };
  let toastTimeout;
  const notify = (message) => {
    const toast=$("#toast");toast.textContent=message;toast.classList.add("show");
    clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove("show"),3400);
  };
  const today = () => dayKey();
  const taskDoneToday = (task) => task.completedAt && dayKey(task.completedAt) === today();
  const todayHabits = () => state.habits.filter(x=>x.completedDays.includes(today())).length;
  const todayTasks = () => state.tasks.filter(taskDoneToday).length;
  const todayFocus = () => state.focusSessions.filter(x=>dayKey(x.completedAt)===today()).reduce((sum,x)=>sum+x.minutes,0);
  const totalXP = () => state.habits.reduce((sum,x)=>sum+x.completedDays.length*10,0)
    +state.tasks.filter(x=>x.completedAt).length*15+state.focusSessions.length*5+Object.keys(state.moods).length*2;
  const progressPercent = () => {
    const activeTasks=state.tasks.filter(x=>!x.completedAt || taskDoneToday(x));
    const possible=state.habits.length+activeTasks.length;
    return possible?Math.round(100*(todayHabits()+todayTasks())/possible):0;
  };
  const streak = (habit) => {
    const dates=new Set(habit.completedDays);let cursor=new Date();cursor.setHours(12,0,0,0);
    if(!dates.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);
    let days=0;
    while(dates.has(dayKey(cursor)) && days<1000){days++;cursor.setDate(cursor.getDate()-1);}
    return days;
  };
  const renderTask = (task) => {
    const done=Boolean(task.completedAt);
    const safeId=escapeHtml(task.id);
    return '<div class="task-row '+(done?"completed":"")+'">'+
      '<button type="button" class="check-btn" data-action="toggle-task" data-id="'+safeId+'" aria-label="'+(done?"Tamamlandı işaretini kaldır":"Görevi tamamla")+'" aria-pressed="'+done+'">✓</button>'+
      '<span class="task-title">'+escapeHtml(task.title)+'</span>'+
      '<button type="button" class="delete-btn" data-action="delete-task" data-id="'+safeId+'" aria-label="Görevi sil">×</button></div>';
  };
  const sortedTasks = () => [...state.tasks].sort((a,b)=>Number(Boolean(a.completedAt))-Number(Boolean(b.completedAt)) || b.createdAt.localeCompare(a.createdAt));
  const renderHabits = () => {
    $("#habit-summary").textContent=todayHabits()+" / "+state.habits.length;
    const list=$("#habit-list");
    if(!state.habits.length){list.innerHTML='<div class="empty-state">Henüz alışkanlık oluşturmadın. İlk rutinini aşağıdan ekleyebilirsin.</div>';return;}
    const days=lastDays(7);
    list.innerHTML=state.habits.map(h=>{
      const done=h.completedDays.includes(today());
      const bubbles=days.map(day=>'<span class="habit-day '+(h.completedDays.includes(day)?"done":"")+'" title="'+day+'" aria-label="'+day+' '+(h.completedDays.includes(day)?"tamamlandı":"tamamlanmadı")+'">'+new Date(day+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"narrow"})+'</span>').join("");
      return '<article class="habit-card '+(done?"is-done":"")+'"><div class="habit-top"><div><h3 class="habit-name">'+escapeHtml(h.title)+'</h3><span class="habit-meta">'+streak(h)+' günlük seri</span></div><button type="button" class="delete-btn" data-action="delete-habit" data-id="'+escapeHtml(h.id)+'" aria-label="Alışkanlığı sil">×</button></div>'+
        '<div class="habit-bottom"><div class="habit-week" aria-label="Son yedi gün">'+bubbles+'</div>'+
        '<button type="button" class="habit-toggle" data-action="toggle-habit" data-id="'+escapeHtml(h.id)+'" aria-pressed="'+done+'">'+(done?"✓ Tamamlandı":"Bugün yaptım")+'</button></div></article>';
    }).join("");
  };
  const renderTasks = () => {
    $("#task-summary").textContent=todayTasks()+" görev";
    const items=sortedTasks();
    $("#task-list").innerHTML=items.length?items.map(renderTask).join(""):'<div class="empty-state">Henüz görevin yok. Küçük bir adımla başla.</div>';
    $("#quick-tasks").innerHTML=items.length?items.slice(0,3).map(renderTask).join(""):'<div class="empty-state">Bugün için yeni bir görev eklemeye ne dersin?</div>';
  };
  const renderProgress = () => {
    const xp=totalXP(),level=Math.floor(xp/120)+1;
    $("#progress-level").textContent=level;
    $("#progress-xp").textContent=xp+" deneyim puanı";
    $("#progress-tasks").textContent=state.tasks.filter(x=>x.completedAt).length;
    $("#progress-habits").textContent=state.habits.reduce((sum,x)=>sum+x.completedDays.length,0);
    $("#progress-focus").textContent=state.focusSessions.reduce((sum,x)=>sum+x.minutes,0)+" dk";
    $("#stat-level").textContent=level;
    const days=lastDays(7);
    const totals=days.map(day=>({
      day,value:state.habits.filter(h=>h.completedDays.includes(day)).length+
        state.tasks.filter(t=>t.completedAt && dayKey(t.completedAt)===day).length+
        state.focusSessions.filter(s=>dayKey(s.completedAt)===day).length
    }));
    const max=Math.max(1,...totals.map(x=>x.value));
    $("#weekly-chart").innerHTML=totals.map(x=>
      '<div class="chart-column '+(x.day===today()?"today":"")+'" aria-label="'+x.day+': '+x.value+' etkinlik">'+
      '<strong>'+x.value+'</strong><div class="chart-bar-wrap"><span class="chart-bar" style="--bar-height:'+Math.max(5,Math.round(x.value/max*100))+'%"></span></div>'+
      '<span>'+new Date(x.day+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short"})+'</span></div>'
    ).join("");
  };
  const renderMood = () => {
    const current=state.moods[today()];
    $$("[data-mood]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.mood===current)));
    $("#mood-message").textContent=current?MOODS[current]:"Her gün aynı hissetmek zorunda değilsin.";
  };
  const render = () => {
    const name=state.name||"dostum";
    $("#greeting-name").textContent=name;
    $("#avatar-initial").textContent=name.slice(0,1).toLocaleUpperCase("tr-TR");
    $("#profile-name").value=state.name;
    $("#stat-habit").textContent=todayHabits()+" / "+state.habits.length;
    $("#stat-focus").textContent=todayFocus()+" dk";
    $("#focus-total").textContent=todayFocus()+" dakika";
    $("#hero-progress-fill").style.width=progressPercent()+"%";
    $("#hero-progress-percent").textContent=progressPercent()+"%";
    const goalCount=state.habits.length+state.tasks.filter(x=>!x.completedAt || taskDoneToday(x)).length;
    $("#hero-subtitle").textContent=goalCount?"Bugün "+goalCount+" küçük hedefin var.":"Kendine ait ilk adımı oluştur.";
    $("#hero-footnote").textContent=goalCount?"Bugün "+(todayHabits()+todayTasks())+" hedef tamamlandı.":"Henüz bugüne ait hedefin yok.";
    renderTasks();renderHabits();renderProgress();renderMood();
  };
  const navigate = (name) => {
    const target=$('[data-screen="'+name+'"]');if(!target)return;
    $$(".screen").forEach(section=>{const active=section===target;section.hidden=!active;section.classList.toggle("is-active",active);});
    document.title=(name==="home"?"Habitopia":target.getAttribute("aria-label")+" — Habitopia");
    window.scrollTo({top:0,behavior:"instant"});
  };
  const addTask = (value) => {
    const title=cleanTitle(value,100);if(!title)return;
    state.tasks.push({id:id(),title,createdAt:new Date().toISOString(),completedAt:null});persist();render();notify("Görev eklendi.");
  };
  const addHabit = (value) => {
    const title=cleanTitle(value,80);if(!title)return;
    state.habits.push({id:id(),title,completedDays:[]});persist();render();notify("Alışkanlık eklendi.");
  };
  const handleAction = (action,key) => {
    if(action==="toggle-task"){const item=state.tasks.find(x=>x.id===key);if(!item)return;item.completedAt=item.completedAt?null:new Date().toISOString();}
    if(action==="delete-task"){if(!window.confirm("Bu görevi silmek istiyor musun?"))return;state.tasks=state.tasks.filter(x=>x.id!==key);}
    if(action==="toggle-habit"){const item=state.habits.find(x=>x.id===key);if(!item)return;item.completedDays=item.completedDays.includes(today())?item.completedDays.filter(d=>d!==today()):[...item.completedDays,today()];}
    if(action==="delete-habit"){if(!window.confirm("Bu alışkanlığı ve işaretleme geçmişini silmek istiyor musun?"))return;state.habits=state.habits.filter(x=>x.id!==key);}
    persist();render();
  };
  document.addEventListener("click",e=>{
    const go=e.target.closest("[data-go]");if(go){navigate(go.dataset.go);return;}
    const action=e.target.closest("[data-action]");if(action){handleAction(action.dataset.action,action.dataset.id);return;}
    const mood=e.target.closest("[data-mood]");if(mood){state.moods[today()]=mood.dataset.mood;persist();renderMood();}
  });
  const wireForm=(selector,input,fn)=>{
    $(selector).addEventListener("submit",event=>{event.preventDefault();const field=$(input);if(!field.value.trim())return;fn(field.value);field.value="";});
  };
  wireForm("#task-form","#task-title",addTask);
  wireForm("#quick-task-form","#quick-task-title",addTask);
  wireForm("#habit-form","#habit-title",addHabit);
  $("#profile-form").addEventListener("submit",e=>{e.preventDefault();state.name=cleanTitle($("#profile-name").value,32);persist();render();notify("Profil güncellendi.");});
  $("#onboarding-form").addEventListener("submit",e=>{
    e.preventDefault();
    state.name=cleanTitle($("#onboarding-name").value,32);
    $$('[name="starter"]:checked').forEach(x=>{const title=cleanTitle(x.value,80);if(title && !state.habits.some(h=>h.title===title))state.habits.push({id:id(),title,completedDays:[]});});
    state.onboarded=true;persist();$("#onboarding").hidden=true;render();navigate("home");notify("Habitopia'ya hoş geldin!");
  });
  // A timestamp-based timer continues to account for elapsed time when a tab is backgrounded.
  const timer={minutes:25,remaining:1500,running:false,endAt:0};
  const timerUpdate=()=>{
    if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
      if(timer.remaining===0){
        timer.running=false;timer.endAt=0;
        state.focusSessions.push({id:id(),minutes:timer.minutes,completedAt:new Date().toISOString()});
        persist();render();notify("Odak seansı tamamlandı! Güzel iş.");
      }
    }
    const mm=String(Math.floor(timer.remaining/60)).padStart(2,"0"),ss=String(timer.remaining%60).padStart(2,"0");
    $("#timer-time").textContent=mm+":"+ss;
    $("#timer-status").textContent=timer.running?"Odak devam ediyor":timer.remaining===0?"Seans tamamlandı":timer.remaining<timer.minutes*60?"Mola verdin":"Başlamaya hazır";
    $("#timer-toggle").textContent=timer.running?"Duraklat":timer.remaining===0?"Yeni seans başlat":timer.remaining===timer.minutes*60?"Odaklanmaya başla":"Devam et";
    $(".timer-visual").style.setProperty("--timer-progress",100*(1-timer.remaining/(timer.minutes*60))+"%");
    $$("[data-duration]").forEach(x=>{x.classList.toggle("selected",Number(x.dataset.duration)===timer.minutes);x.disabled=timer.running;});
  };
  $$("[data-duration]").forEach(el=>el.addEventListener("click",()=>{
    if(timer.running)return;timer.minutes=Number(el.dataset.duration);timer.remaining=timer.minutes*60;timerUpdate();
  }));
  $("#timer-toggle").addEventListener("click",()=>{
    if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));timer.running=false;timer.endAt=0;}
    else{if(timer.remaining===0)timer.remaining=timer.minutes*60;timer.running=true;timer.endAt=Date.now()+timer.remaining*1000;}
    timerUpdate();
  });
  $("#timer-reset").addEventListener("click",()=>{
    timer.running=false;timer.remaining=timer.minutes*60;timer.endAt=0;timerUpdate();
  });
  setInterval(timerUpdate,1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)timerUpdate();});
  $("#export-data").addEventListener("click",()=>{
    const payload={format:"habitopia-nova",version:1,exportedAt:new Date().toISOString(),data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download="habitopia-yedek-"+today()+".json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify("Yedek dosyası oluşturuldu.");
  });
  $("#import-data").addEventListener("change",async e=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>1024*1024){notify("Dosya çok büyük (en fazla 1 MB).");return;}
    try{
      const payload=JSON.parse(await file.text());
      if(payload?.format!=="habitopia-nova" || payload?.version!==1)throw new Error("Bu dosya Habitopia Nova yedeği değil.");
      const candidate=normalize(payload.data);
      if(!window.confirm("Yedek yüklenirse bu tarayıcıdaki mevcut Nova verileri değiştirilecek. Devam edilsin mi?"))return;
      const previous=state;state=candidate;
      if(!persist()){state=previous;throw new Error("Yedek kaydedilemedi.");}
      render();navigate("home");notify("Yedek başarıyla yüklendi.");
    }catch(error){console.error(error);notify("Yedek açılamadı: "+(error.message||"Bilinmeyen hata"));}
  });
  const now=new Date();
  $("#today-stamp").textContent=now.toLocaleDateString("tr-TR",{day:"numeric",month:"long",weekday:"long"});
  $("#greeting-date").textContent=now.toLocaleDateString("tr-TR",{day:"numeric",month:"long"});
  render();timerUpdate();
  if(!state.onboarded){$("#onboarding").hidden=false;}
  if(!storageAvailable)notify("Yerel depolama okunamadı. Mevcut kaydın üzerine yazılmadı.");
})();