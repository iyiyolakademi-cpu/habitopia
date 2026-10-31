
(function(){
  'use strict';

  /* Puan / XP / ödül sistemi tamamen devre dışı */
  try{
    I18N.tr.completedReward='Tamamlandı.'; I18N.en.completedReward='Completed.';
    I18N.tr.undoDone='Tamamlanma geri alındı.'; I18N.en.undoDone='Completion undone.';
    I18N.tr.rewardFair=''; I18N.en.rewardFair='';
    I18N.tr.focusRangeHelp='1 ile 180 dakika arasında bir süre seçebilirsin.';
    I18N.en.focusRangeHelp='Choose a duration from 1 to 180 minutes.';
    I18N.tr.invalidFocusMinutes='1 ile 180 dakika arasında bir odak süresi yaz.';
    I18N.en.invalidFocusMinutes='Enter a focus duration from 1 to 180 minutes.';
  }catch(e){}

  rewardForTask=function(task){return {xp:0,coins:0,energy:0,category:task?.category||'mind'}};
  focusReward=function(minutes,category='mind'){return {xp:0,coins:0,energy:0,category:CATEGORIES[category]?category:'mind'}};
  checkAchievements=function(){return []};
  applyReward=function(key,reward,{countCompletion=true,activity=''}={}){
    if(state.rewardLedger[key])return false;
    const date=key.split(':').pop();
    state.rewardLedger[key]={xp:0,coins:0,energy:0,category:reward?.category||'mind',countCompletion,date};
    if(countCompletion){
      state.progress.totalCompleted=Math.max(0,Number(state.progress.totalCompleted)||0)+1;
      state.progress.dayCounts[date]=(Number(state.progress.dayCounts[date])||0)+1;
      if(!state.progress.activeDates.includes(date))state.progress.activeDates.push(date);
    }
    if(activity)state.activity.unshift({id:uid('log'),date,text:activity});
    updateStreak();
    return true;
  };
  openRewards=function(){}; claimGift=function(){};

  /* Pomodoro: 1 dk minimum + alarm */
  startNewFocus=function(minutes=25,taskId=null,category='mind'){
    minutes=clamp(Number(minutes)||25,1,180);
    const sec=minutes*60;
    state.focusTimer={durationSec:sec,remainingSec:sec,running:false,endAt:0,startedAt:0,taskId:taskId||null,category:CATEGORIES[category]?category:'mind'};
    scheduleSave(); renderFocusDialog();
  };
  renderFocusSetup=function(){
    const preferred=clamp(Number(state.profile.dailyMinutes)||25,1,180),presets=[1,5,25,45];
    showDialog(`<div class="focus-setup"><div><h2>${t('customFocus')}</h2><p>${t('focusRangeHelp')}</p></div><div class="focus-presets">${presets.map(n=>`<button class="focus-preset ${n===preferred?'active':''}" data-action="focus-preset" data-minutes="${n}">${n} ${t('minutesShort')}</button>`).join('')}</div><div class="field"><label>${t('focusMinutesInput')}</label><input class="text-input" id="customFocusMinutes" type="number" inputmode="numeric" min="1" max="180" step="1" value="${preferred}"></div><button class="primary" data-action="start-custom-focus">${t('focusStartCustom')}</button></div>`);
  };
  startCustomFocus=function(){
    const input=document.getElementById('customFocusMinutes'),minutes=Number(input?.value);
    if(!Number.isFinite(minutes)||minutes<1||minutes>180){showToast(t('invalidFocusMinutes'),'bad');return}
    startNewFocus(Math.round(minutes),null,goalCategory());
  };
  const normalizeStateBeforeV3=normalizeState;
  normalizeState=function(raw){
    const next=normalizeStateBeforeV3(raw);
    if(raw?.focusTimer){
      next.focusTimer.durationSec=clamp(Number(raw.focusTimer.durationSec)||next.focusTimer.durationSec,60,10800);
      next.focusTimer.remainingSec=clamp(Number(raw.focusTimer.remainingSec)||next.focusTimer.remainingSec,0,next.focusTimer.durationSec);
    }
    return next;
  };
  saveTask=function(){
    const title=document.getElementById('taskTitleInput').value.trim();if(!title){showToast(t('titleRequired'),'bad');return}
    state.tasks.unshift({id:uid('task'),title,type:document.getElementById('taskTypeInput').value==='focus'?'focus':'once',category:document.getElementById('taskCategoryInput').value,effort:selectedEffort,duration:clamp(Number(document.getElementById('taskDurationInput').value)||25,1,180),completedDates:[],createdAt:new Date().toISOString()});
    closeSheet('taskSheet');scheduleSave();renderToday();showToast(t('taskAdded'),'good');
  };

  const oldRenderFocusDialog=renderFocusDialog;
  renderFocusDialog=function(){oldRenderFocusDialog();const p=document.querySelector('#dialogBackdrop .timer>p');if(p&&!p.textContent.trim())p.remove()};


/* ===== Focus alarm audio unlock ===== */
(function(){
  let focusAudioUnlocked=false;

  async function unlockFocusAudio(){
    if(focusAudioUnlocked && audioContext && audioContext.state==="running") return true;
    try{
      audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==="suspended") await audioContext.resume();

      /* Çok kısa, sessiz bir ses üretmek WebView'ın ses motorunu kullanıcı
         dokunuşuna bağlar. Sonradan sayaç bitince alarm çalabilir. */
      const o=audioContext.createOscillator();
      const g=audioContext.createGain();
      const now=audioContext.currentTime;
      g.gain.setValueAtTime(0.00001,now);
      o.frequency.value=440;
      o.connect(g).connect(audioContext.destination);
      o.start(now);
      o.stop(now+0.025);

      focusAudioUnlocked=true;
      return true;
    }catch(e){
      return false;
    }
  }

  window.unlockHabitopiaFocusAudio=unlockFocusAudio;

  /* İlk gerçek kullanıcı dokunuşunda sesi hazırla. */
  ["pointerdown","touchstart","click"].forEach(type=>{
    document.addEventListener(type,unlockFocusAudio,{passive:true});
  });

  /* Odak başlatma/durdurma butonuna basıldığında da garantiye al. */
  document.addEventListener("click",e=>{
    if(e.target.closest('[data-action="toggle-focus"],[data-action="start-custom-focus"],[data-action="open-focus"],[data-action="focus-preset"]')){
      unlockFocusAudio();
    }
  });
})();

  let alarmInterval=null;
  async function alarmTone(){
    try{
      audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended')await audioContext.resume();

      const now=audioContext.currentTime;
      const tones=[
        {d:0.00,f:880,t:.28},
        {d:0.34,f:1046,t:.28},
        {d:0.68,f:880,t:.38}
      ];

      tones.forEach(({d,f,t})=>{
        const o=audioContext.createOscillator();
        const g=audioContext.createGain();
        o.type='square';
        o.frequency.setValueAtTime(f,now+d);
        g.gain.setValueAtTime(.0001,now+d);
        g.gain.exponentialRampToValueAtTime(.22,now+d+.025);
        g.gain.exponentialRampToValueAtTime(.0001,now+d+t);
        o.connect(g).connect(audioContext.destination);
        o.start(now+d);
        o.stop(now+d+t+.03);
      });
    }catch(e){
      try{await window.unlockHabitopiaFocusAudio?.()}catch(_){}
    }

    try{navigator.vibrate?.([450,180,450,180,650])}catch(e){}
  }
  window.stopHabitopiaFocusAlarm=function(){
    if(alarmInterval){clearInterval(alarmInterval);alarmInterval=null}
    try{navigator.vibrate?.(0)}catch(e){}
    document.getElementById('focusAlarm')?.classList.remove('show');
  };
  window.startHabitopiaFocusAlarm=function(){
    stopHabitopiaFocusAlarm();
    const en=state?.settings?.lang==='en';
    const title=document.getElementById('focusAlarmTitle'),text=document.getElementById('focusAlarmText'),btn=document.querySelector('.focus-alarm-stop');
    if(title)title.textContent=en?'Focus complete':'Odak süresi tamamlandı';
    if(text)text.textContent=en?'Tap stop to silence the alarm.':'Alarmı durdurmak için butona dokun.';
    if(btn)btn.textContent=en?'Stop':'Durdur';
    document.getElementById('focusAlarm')?.classList.add('show');
    alarmTone(); alarmInterval=setInterval(alarmTone,1800);
  };
  completeFocus=function(){
    const f=state.focusTimer,minutes=Math.max(1,Math.round(f.durationSec/60)),date=localDateKey(),sessionId=uid('focus'),task=f.taskId?state.tasks.find(x=>x.id===f.taskId):null,category=task?.category||f.category||'mind';
    clearInterval(timerInterval);
    state.progress.focusMinutes+=minutes;
    state.tracking.focusSessions.unshift({id:sessionId,date,minutes,category,completedAt:new Date().toISOString()});
    if(task&&!task.completedDates.includes(date))task.completedDates.push(date);
    applyReward(task?rewardKey('task',task.id,date):rewardKey('focus',sessionId,date),{category},{activity:t('sessionComplete',{minutes})});
    state.focusTimer=defaultState().focusTimer;
    closeDialog(true);persistNow();renderAll();showToast(t('sessionComplete',{minutes}),'good');startHabitopiaFocusAlarm();
  };

  /* Görevlerde puan metnini kaldır */
  const renderTodayBeforeV3=renderToday;
  const dailyQuotesTR=[
    'Bugün yaptığın küçük bir şey, yarının düzenini kurabilir.',
    'İlerleme bazen hızlanmak değil, doğru şeyi tekrar etmektir.',
    'Kendine verdiğin küçük bir sözü bugün tut.',
    'Büyük değişimler, sıradan günlerde verilen küçük kararlardan doğar.',
    'Bugünün hedefi mükemmel olmak değil, bir adım ilerlemek olsun.',
    'Dikkatini verdiğin şey zamanla hayatında büyür.',
    'Kendine ayırdığın zaman da yapılacaklar kadar değerlidir.'
  ];
  const dailyQuotesEN=[
    'One small action today can shape tomorrow’s rhythm.',
    'Progress is often repeating the right thing, not moving faster.',
    'Keep one small promise you made to yourself today.',
    'Big changes grow from small decisions on ordinary days.',
    'Today’s goal is not perfection, just one step forward.',
    'What you consistently give attention to tends to grow.',
    'Time you give yourself matters as much as your to-do list.'
  ];
  renderToday=function(){
    renderTodayBeforeV3();
    document.querySelectorAll('#taskList .reward').forEach(x=>x.remove());
    const hero=document.querySelector('#view-today .hero');
    if(hero){
      const d=Math.floor(new Date().setHours(0,0,0,0)/86400000),en=state.settings.lang==='en',arr=en?dailyQuotesEN:dailyQuotesTR,q=arr[Math.abs(d)%arr.length];
      const kicker=hero.querySelector('.hero-kicker'),line=hero.querySelector('.hero-line'),pills=hero.querySelector('.pill-row');
      if(kicker)kicker.textContent=en?'QUOTE OF THE DAY':'GÜNÜN SÖZÜ';
      if(line)line.textContent=q;
      if(pills)pills.innerHTML='';
    }
    renderWaterV3();
  };

  /* Su sistemi: ml/bardak boyutu + geçmiş günü düzenleme */
  let selectedWaterDate=localDateKey();
  function glassMl(){state.water.glassMl=clamp(Number(state.water.glassMl)||250,50,1500);return state.water.glassMl}
  function waterRecord(date){if(!state.water.records[date])state.water.records[date]={count:0,goal:state.water.defaultGoal||8,rewarded:false};return state.water.records[date]}
  window.renderWaterV3=function(){
    const r=currentWater(),ml=glassMl(),title=document.querySelector('#view-today .water-card .card-title');
    if(title&&!title.querySelector('.water-emoji'))title.insertAdjacentHTML('beforeend','<span class="water-emoji" aria-hidden="true">💧</span>');
    const copy=document.getElementById('waterCopy');
    if(copy){const currentMl=r.count*ml,targetMl=r.goal*ml;copy.textContent=`${(currentMl/1000).toFixed(currentMl%1000?1:0)} L / ${(targetMl/1000).toFixed(targetMl%1000?1:0)} L · ${ml} ml`}
    const lock=document.getElementById('waterLockNote');if(lock)lock.textContent='';
  };
  const oldRenderWater=renderWater;
  renderWater=function(){oldRenderWater();renderWaterV3()};
  changeWater=function(delta){
    const date=localDateKey(),r=currentWater();r.count=clamp(r.count+delta,0,40);r.rewarded=r.count>=r.goal;
    scheduleSave();renderAll();
  };
  function renderWaterStatsV3(){
    const host=document.getElementById('waterStatsContent');if(!host)return;
    glassMl();const days=lastDays(30),r=waterRecord(selectedWaterDate),ml=glassMl(),isToday=selectedWaterDate===localDateKey();
    host.innerHTML=`<div class="water-editor"><div class="water-editor-top"><div><span class="card-sub">${formatDate(selectedWaterDate,true)}</span><strong>${r.count} / ${r.goal} ${gx('bardak','glasses')}</strong><div class="card-sub">${r.count*ml} ml ${gx('içildi','drunk')} · ${r.goal*ml} ml ${gx('hedef','goal')}</div></div><div style="font-size:28px">💧</div></div><div class="water-editor-actions"><button data-action="water-history-minus">−</button><button class="drink" data-action="water-history-plus">+1 ${gx('bardak içtim','glass')}</button><button data-action="water-history-plus">+</button></div></div><div class="water-editor"><div class="glass-size-row"><div class="field"><label>${gx('Bir bardak kaç ml?','Glass size (ml)')}</label><input class="text-input" id="glassMlInput" type="number" inputmode="numeric" min="50" max="1500" step="10" value="${ml}"></div><button class="primary" data-action="save-glass-ml">${t('save')}</button></div><p class="card-sub" style="margin-top:8px">${gx('Örn. 200 ml, 330 ml veya 500 ml. Tüm su hesapları bu değere göre gösterilir.','For example 200, 330 or 500 ml. Water totals use this value.')}</p></div><div class="section-head"><h2>${gx('Son 30 gün','Last 30 days')}</h2><span>${gx('Bir güne dokun ve düzenle','Tap a day to edit')}</span></div><div class="water-history-grid">${days.map(d=>{const x=state.water.records[d.key]||{count:0,goal:state.water.defaultGoal};return `<button class="water-day-btn ${x.count?'has':''} ${x.count>=x.goal?'done':''} ${d.key===selectedWaterDate?'selected':''}" data-action="water-day" data-date="${d.key}"><strong>${dateFromKey(d.key).getDate()}</strong><span>${x.count?`${x.count}×💧`:'—'}</span></button>`}).join('')}</div>`;
  }
  renderWaterStats=renderWaterStatsV3;
  openWaterStats=function(){selectedWaterDate=localDateKey();renderWaterStatsV3();openSheet('waterStatsSheet')};

  /* Ruh hali: sadece nasıl geçti + geçmiş günleri düzenleme */
  let selectedMoodDate=localDateKey();
  function shiftMoodDay(n){const next=addDays(selectedMoodDate,n);if(next<=localDateKey())selectedMoodDate=next;renderMood()}
  renderMood=function(){
    const host=document.getElementById('moodContent');if(!host)return;
    const current=Number((state.tracking.moods||{})[selectedMoodDate])||0,days=lastDays(35);
    host.innerHTML=`<div class="card"><div class="simple-mood-date"><button data-action="mood-day-prev">‹</button><div style="text-align:center"><strong>${formatDate(selectedMoodDate,true)}</strong><div class="card-sub">${selectedMoodDate===localDateKey()?gx('Bugün','Today'):gx('Bu günü düzenliyorsun','Editing this day')}</div></div><button data-action="mood-day-next" ${selectedMoodDate>=localDateKey()?'disabled':''}>›</button></div><h3 class="card-title">${gx('Günün nasıl geçti?','How was your day?')}</h3><div class="mood-grid simple">${MOODS.map(m=>`<button class="mood-option ${current===m.v?'active':''}" data-action="save-mood" data-value="${m.v}"><span>${premiumMood(m.v)}</span><small>${t(m.k)}</small></button>`).join('')}</div></div><div class="section-head"><h2>${gx('Geçmiş günler','Past days')}</h2><span>${gx('Dokunarak düzenle','Tap to edit')}</span></div><div class="mood-history-simple">${days.map(d=>{const v=Number(state.tracking.moods[d.key])||0;return `<button class="mood-history-day ${d.key===selectedMoodDate?'selected':''}" data-action="mood-date" data-date="${d.key}">${dateFromKey(d.key).getDate()}${v?`<span>${premiumMood(v,'xs')}</span>`:''}</button>`}).join('')}</div>`;
  };
  saveMood=function(value){
    const v=clamp(Number(value)||3,1,5),existed=Boolean(state.tracking.moods[selectedMoodDate]);state.tracking.moods[selectedMoodDate]=v;
    scheduleSave();renderMood();renderProfile();renderToday();showToast(t(existed?'moodUpdated':'moodSaved'),'good');
  };
  openMood=function(){selectedMoodDate=localDateKey();renderMood();openSheet('moodSheet')};

  /* Günlük = temiz Not Defteri */
  openJournal=function(){openNotes()};
  const oldSaveNote=saveNote;
  saveNote=function(){
    const body=document.getElementById('noteBodyInput');if(body)body.setAttribute('maxlength','12000');
    const title=document.getElementById('noteTitleInput')?.value.trim()||'',text=body?.value.trim()||'',id=document.getElementById('editingNoteId')?.value||'';
    if(!title&&!text){showToast(t('emptyNote'),'bad');return}
    const now=new Date().toISOString();
    if(id){const n=state.tracking.notes.find(x=>x.id===id);if(n){n.title=(title||gx('Yeni Not','New Note')).slice(0,100);n.body=text.slice(0,12000);n.color='#6ca27a';n.updatedAt=now}}
    else state.tracking.notes.unshift({id:uid('note'),title:(title||gx('Yeni Not','New Note')).slice(0,100),body:text.slice(0,12000),color:'#6ca27a',pinned:false,createdAt:now,updatedAt:now});
    scheduleSave();resetNoteEditor();renderNotes();renderProfile();showToast(t(id?'noteUpdated':'noteSaved'),'good');
  };
  const oldRenderNotes=renderNotes;
  renderNotes=function(){oldRenderNotes();document.querySelectorAll('#notesList .note-actions').forEach(a=>a.style.opacity='.72')};

  /* Eski istatistik bloklarını görsel olarak tamamen kaldır */
  function hideLegacyStats(){
    ['weekActivityChart','habitPerformance','badgeGrid'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const card=el.closest('.chart-card,.badge-grid')||el;card.classList.add('legacy-stat-hidden');const head=card.previousElementSibling;if(head?.classList.contains('section-head'))head.classList.add('legacy-stat-hidden')});
  }
  const oldRenderProfileV3=renderProfile;
  renderProfile=function(){
    oldRenderProfileV3();hideLegacyStats();
    const j=document.querySelector('#growthHubActions [data-action="journal"]');if(j){const strong=j.querySelector('strong'),span=j.querySelector('span');if(strong)strong.textContent=gx('Not Defteri','Notebook');if(span)span.textContent=gx('Düşüncelerini özgürce yaz','Write freely')}
  };

  /* Yeni aksiyonlar */
  const oldHandleActionV3=handleAction;
  handleAction=function(action,el){
    switch(action){
      case 'gift':case 'rewards':return;
      case 'stop-focus-alarm':stopHabitopiaFocusAlarm();return;
      case 'water-day':selectedWaterDate=el.dataset.date||localDateKey();renderWaterStatsV3();return;
      case 'water-history-plus':{const r=waterRecord(selectedWaterDate);r.count=clamp(r.count+1,0,40);r.rewarded=r.count>=r.goal;scheduleSave();renderWaterStatsV3();if(selectedWaterDate===localDateKey())renderAll();return}
      case 'water-history-minus':{const r=waterRecord(selectedWaterDate);r.count=clamp(r.count-1,0,40);r.rewarded=r.count>=r.goal;scheduleSave();renderWaterStatsV3();if(selectedWaterDate===localDateKey())renderAll();return}
      case 'save-glass-ml':{const v=Number(document.getElementById('glassMlInput')?.value);if(!Number.isFinite(v)||v<50||v>1500){showToast(gx('50–1500 ml arasında bir değer yaz.','Enter a value from 50–1500 ml.'),'bad');return}state.water.glassMl=Math.round(v);scheduleSave();renderWaterStatsV3();renderAll();showToast(gx('Bardak ölçüsü güncellendi.','Glass size updated.'),'good');return}
      case 'mood-date':selectedMoodDate=el.dataset.date||localDateKey();renderMood();return;
      case 'mood-day-prev':shiftMoodDay(-1);return;
      case 'mood-day-next':shiftMoodDay(1);return;
      case 'journal':openNotes();return;
      case 'mood-factor':case 'save-mood-detail':return;
      default:return oldHandleActionV3(action,el);
    }
  };

  /* İlk açılış ve her render sonrası küçük temizlik */
  const oldStartHabitopiaV3=startHabitopia;
  startHabitopia=async function(account){
    await oldStartHabitopiaV3(account);
    state.water.glassMl=clamp(Number(state.water.glassMl)||250,50,1500);
    const dur=document.getElementById('taskDurationInput');if(dur)dur.min='1';
    const noteBody=document.getElementById('noteBodyInput');if(noteBody)noteBody.maxLength=12000;
    hideLegacyStats();renderToday();renderProfile();
  };
})();


/* ===== Alışkanlıklar: sade görsel istatistik grafiği ===== */
function renderHabitVisualChart(){
  const table=document.getElementById("habitTable");
  if(!table)return;

  let host=document.getElementById("habitVisualChart");
  if(!host){
    host=document.createElement("section");
    host.id="habitVisualChart";
    host.className="habit-visual-chart";
    const anchor=table.parentElement&&table.parentElement.classList.contains("habit-table-wrap")
      ? table.parentElement
      : table;
    anchor.parentNode.insertBefore(host,anchor);
  }

  if(!state.habits.length){
    host.style.display="none";
    return;
  }

  host.style.display="";
  const today=localDateKey();
  const days=Array.from({length:7},(_,i)=>addDays(today,i-6));
  const values=days.map(date=>{
    let due=0,done=0;
    state.habits.forEach(h=>{
      if(!habitDue(h,date))return;
      due++;
      if(typeof habitStatus==="function"){
        if(habitStatus(h,date)==="done")done++;
      }else if(habitCompletedOn(h,date)){
        done++;
      }
    });
    return due?Math.round(done/due*100):0;
  });

  const labels=state.settings.lang==="en"
    ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    : ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];

  host.innerHTML=`
    <div class="habit-visual-chart-head">
      <div>
        <strong>${state.settings.lang==="en"?"Weekly rhythm":"Haftalık ritim"}</strong>
        <span>${state.settings.lang==="en"?"Your habit consistency at a glance":"Alışkanlık düzenini tek bakışta gör"}</span>
      </div>
    </div>
    <div class="habit-visual-chart-body">
      ${days.map((date,i)=>{
        const d=dateFromKey(date);
        const mondayIndex=(d.getDay()+6)%7;
        const pct=values[i];
        return `
          <div class="habit-chart-col ${date===today?"today":""} ${pct===0?"empty":""}">
            <div class="habit-chart-track">
              <i class="habit-chart-fill" style="--habit-h:${Math.max(4,pct)}%"></i>
            </div>
            <span class="habit-chart-day">${labels[mondayIndex]}</span>
          </div>`;
      }).join("")}
    </div>`;
}

(function(){
  const originalRenderHabits=renderHabits;
  renderHabits=function(){
    const result=originalRenderHabits.apply(this,arguments);
    try{renderHabitVisualChart()}catch(error){console.warn("Habit chart:",error)}
    return result;
  };
})();


/* =========================================================
   HABITOPIA FINAL STABLE ANALYTICS ENGINE
   Haftalık · Aylık · Yıllık · Tüm zamanlar
   ========================================================= */
(function(){
  'use strict';

  const PERIODS = {
    week:{tr:'Haftalık',en:'Weekly'},
    month:{tr:'Aylık',en:'Monthly'},
    year:{tr:'Yıllık',en:'Yearly'},
    all:{tr:'Tüm zamanlar',en:'All time'}
  };

  const HS = window.HabitopiaStats = window.HabitopiaStats || {
    waterDate: localDateKey(),
    moodDate: localDateKey()
  };

  function ensureStatsSettings(){
    state.settings = state.settings || {};
    state.settings.statsPeriods = state.settings.statsPeriods || {};
    const defaults={habits:'week',water:'week',weight:'month',focus:'week',mood:'month'};
    Object.keys(defaults).forEach(k=>{
      if(!PERIODS[state.settings.statsPeriods[k]]) state.settings.statsPeriods[k]=defaults[k];
    });

    /* Görünmeyen eski puan sistemi değerlerini sıfırla. */
    state.progress.xp=0;
    state.progress.coins=0;
    state.achievements=[];
    state.dailyGiftDates=[];
    state.unlockedRewards=[];
    state.inventory={focusBoost:0,pointBoost:0,xpBoost:0,streakShield:0};
  }

  function period(kind){ensureStatsSettings();return state.settings.statsPeriods[kind]}
  function periodName(k){const p=PERIODS[k]||PERIODS.week;return state.settings.lang==='en'?p.en:p.tr}
  function setPeriod(kind,value){
    ensureStatsSettings();
    if(PERIODS[value]){
      state.settings.statsPeriods[kind]=value;
      scheduleSave();
    }
  }

  function tabs(kind){
    return `<div class="stats-period-tabs">${Object.keys(PERIODS).map(k=>
      `<button class="${period(kind)===k?'active':''}" data-action="stats-period" data-kind="${kind}" data-period="${k}">${periodName(k)}</button>`
    ).join('')}</div>`;
  }

  function keyFromDate(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function createdDate(item){
    if(!item?.createdAt)return null;
    const d=new Date(item.createdAt);
    return Number.isNaN(d.getTime())?null:keyFromDate(d);
  }
  function earliest(values,fallback=localDateKey()){
    const clean=values.filter(Boolean).sort();
    return clean[0]||fallback;
  }

  function periodStart(type, firstDate){
    const today=localDateKey();
    if(type==='week') return addDays(today,-6);
    if(type==='month') return addDays(today,-29);
    if(type==='year') return `${new Date().getFullYear()}-01-01`;
    return firstDate||today;
  }

  function monthLabel(ym){
    const [y,m]=ym.split('-').map(Number);
    return new Date(y,m-1,1).toLocaleDateString(state.settings.lang==='en'?'en-US':'tr-TR',{month:'short'});
  }

  function makeBuckets(type, firstDate){
    const today=localDateKey();

    if(type==='week'){
      return Array.from({length:7},(_,i)=>{
        const date=addDays(today,-6+i);
        return {label:t(DAY_KEYS[dayIndexMonday(date)]),dates:[date]};
      });
    }

    if(type==='month'){
      const start=addDays(today,-29), out=[];
      for(let i=0;i<5;i++){
        const dates=[];
        for(let j=0;j<6;j++){
          const d=addDays(start,i*6+j);
          if(d<=today)dates.push(d);
        }
        out.push({label:`${i+1}.`,dates});
      }
      return out;
    }

    if(type==='year'){
      const now=new Date(),y=now.getFullYear(),out=[];
      for(let m=1;m<=now.getMonth()+1;m++){
        const ym=`${y}-${String(m).padStart(2,'0')}`;
        const last=new Date(y,m,0).getDate(),dates=[];
        for(let d=1;d<=last;d++){
          const k=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if(k<=today)dates.push(k);
        }
        out.push({label:monthLabel(ym),dates});
      }
      return out;
    }

    const first=dateFromKey(firstDate||today),now=dateFromKey(today);
    const months=(now.getFullYear()-first.getFullYear())*12+(now.getMonth()-first.getMonth());

    if(months>18){
      const out=[];
      for(let y=first.getFullYear();y<=now.getFullYear();y++){
        const dates=[],last=(y===now.getFullYear()?today:`${y}-12-31`);
        let d=`${y}-01-01`;
        while(d<=last){dates.push(d);d=addDays(d,1)}
        out.push({label:String(y),dates});
      }
      return out;
    }

    const out=[];
    let y=first.getFullYear(),m=first.getMonth()+1;
    while(y<now.getFullYear() || (y===now.getFullYear()&&m<=now.getMonth()+1)){
      const ym=`${y}-${String(m).padStart(2,'0')}`,lastDay=new Date(y,m,0).getDate(),dates=[];
      for(let d=1;d<=lastDay;d++){
        const k=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if(k>=firstDate&&k<=today)dates.push(k);
      }
      out.push({label:monthLabel(ym),dates});
      m++;if(m>12){m=1;y++}
    }
    return out;
  }

  function bars(values,labels,type=''){
    const max=Math.max(1,...values.map(Number));
    const minWidth=values.length>14?Math.max(500,values.length*34):0;
    return `<div class="period-scroll"${minWidth?` style="--chart-min:${minWidth}px"`:''}>
      <div class="period-chart-bars">
        ${values.map((v,i)=>`<div class="period-bar ${type}">
          <div class="period-bar-track"><i class="period-bar-fill" style="--h:${v>0?Math.max(5,(Number(v)/max)*100):3}%"></i></div>
          <span class="period-bar-label">${labels[i]||''}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* ---------------- ALIŞKANLIKLAR ---------------- */
  function habitFirstDate(){
    const dates=[];
    state.habits.forEach(h=>{
      dates.push(createdDate(h));
      (h.completedDates||[]).forEach(d=>dates.push(d));
      Object.keys(h.values||{}).forEach(d=>dates.push(d));
    });
    return earliest(dates);
  }

  function habitScoreForDates(dates){
    let due=0,score=0;
    dates.forEach(date=>{
      state.habits.forEach(h=>{
        const born=createdDate(h);
        if(born && date<born)return;
        if(!habitDue(h,date) || date>localDateKey())return;

        let st='';
        try{st=typeof habitStatus==='function'?habitStatus(h,date):''}catch(e){}
        if(!st) st=habitCompletedOn(h,date)?'done':'';

        if(st==='skip')return;
        due++;
        if(st==='done')score+=1;
        else if(st==='partial')score+=.5;
      });
    });
    return due?Math.round(score/due*100):0;
  }

  window.renderHabitVisualChart=function(){
    const table=document.getElementById('habitTable');
    if(!table)return;

    let host=document.getElementById('habitVisualChart');
    if(!host){
      host=document.createElement('section');
      host.id='habitVisualChart';
      host.className='habit-visual-chart';
      const anchor=table.parentElement?.classList.contains('habit-table-wrap')?table.parentElement:table;
      anchor.parentNode.insertBefore(host,anchor);
    }

    if(!state.habits.length){host.style.display='none';return}
    host.style.display='';

    const p=period('habits'),b=makeBuckets(p,habitFirstDate());
    const values=b.map(x=>habitScoreForDates(x.dates));
    host.innerHTML=`${tabs('habits')}
      <div class="habit-visual-chart-head"><div><strong>${gx('Alışkanlık ritmi','Habit rhythm')}</strong><span>${periodName(p)}</span></div></div>
      ${bars(values,b.map(x=>x.label))}`;
  };

  const previousRenderHabits = renderHabits;
  renderHabits=function(){
    const result=previousRenderHabits.apply(this,arguments);
    try{window.renderHabitVisualChart()}catch(e){console.warn('Habit chart',e)}
    return result;
  };

  /* ---------------- SU ---------------- */
  function waterRecordSafe(date){
    state.water=state.water||{defaultGoal:8,records:{}};
    state.water.records=state.water.records||{};
    if(!state.water.records[date]){
      state.water.records[date]={count:0,goal:Number(state.water.defaultGoal)||8,rewarded:false};
    }
    return state.water.records[date];
  }

  function waterFirstDate(){
    return earliest(Object.keys(state.water.records||{}));
  }

  function renderWaterStable(){
    const host=document.getElementById('waterStatsContent');if(!host)return;
    const p=period('water'),b=makeBuckets(p,waterFirstDate());
    const ml=clamp(Number(state.water.glassMl)||250,50,1500);

    /* Eksik gün = 0 bardak. Böylece istatistik yapay biçimde yüksek görünmez. */
    const values=b.map(bucket=>{
      if(!bucket.dates.length)return 0;
      return bucket.dates.reduce((sum,date)=>{
        const r=state.water.records?.[date];
        return sum+(Number(r?.count)||0);
      },0)/bucket.dates.length;
    });

    const r=waterRecordSafe(HS.waterDate);
    const goal=Number(r.goal)||Number(state.water.defaultGoal)||8;

    host.innerHTML=`${tabs('water')}
      <div class="period-chart">
        <div class="stats-period-title"><div><strong>${gx('Su düzeni','Water rhythm')}</strong><span>${periodName(p)}</span></div></div>
        ${bars(values,b.map(x=>x.label),'water')}
      </div>

      <div class="water-editor">
        <div class="water-editor-top">
          <div><span class="card-sub">${formatDate(HS.waterDate,true)}</span>
          <strong>${r.count}/${goal}</strong>
          <div class="card-sub">${r.count*ml} ml ${gx('içildi','drunk')} · ${goal*ml} ml ${gx('hedef','goal')}</div></div>
          <span class="water-emoji">💧</span>
        </div>
        <div class="water-editor-actions">
          <button data-action="water-history-minus">−</button>
          <button class="drink" data-action="water-history-plus">+ ${ml} ml</button>
          <button data-action="water-history-plus">+</button>
        </div>
      </div>

      <div class="water-editor">
        <div class="glass-size-row">
          <div class="field"><label>${gx('Bir bardak kaç ml?','Glass size (ml)')}</label><input id="glassMlInput" class="text-input" type="number" inputmode="numeric" min="50" max="1500" step="10" value="${ml}"></div>
          <button class="primary" data-action="save-glass-ml">${t('save')}</button>
        </div>
        <div class="glass-size-row">
          <div class="field"><label>${gx('Günlük hedef kaç bardak?','Daily glass goal')}</label><input id="waterGoalInput" class="text-input" type="number" inputmode="numeric" min="1" max="40" step="1" value="${goal}"></div>
          <button class="secondary" data-action="save-water-goal">${t('update')}</button>
        </div>
      </div>

      <div class="section-head"><h2>${gx('Son 28 gün','Last 28 days')}</h2><span>${gx('Dokunarak düzenle','Tap to edit')}</span></div>
      <div class="water-history-grid">${lastDays(28).map(d=>{
        const x=state.water.records?.[d.key]||{count:0,goal:state.water.defaultGoal||8};
        return `<button class="water-day-btn ${x.count?'has':''} ${x.count>=x.goal?'done':''} ${d.key===HS.waterDate?'selected':''}" data-action="water-day" data-date="${d.key}">
          <strong>${dateFromKey(d.key).getDate()}</strong><span>${x.count?`${x.count}×💧`:'—'}</span>
        </button>`;
      }).join('')}</div>`;
  }

  renderWaterStats=renderWaterStable;
  openWaterStats=function(){
    HS.waterDate=localDateKey();
    document.getElementById('waterStatsSheet')?.classList.add('fullscreen-stat');
    renderWaterStable();
    openSheet('waterStatsSheet');
  };

  /* ---------------- KİLO ---------------- */
  function weightFiltered(){
    const p=period('weight'),first=earliest(state.tracking.weights.map(x=>x.date));
    const start=periodStart(p,first);
    return state.tracking.weights.filter(x=>x.date>=start && x.date<=localDateKey());
  }

  function weightSvg(items){
    if(!items.length)return `<div class="period-empty">${gx('Bu dönem için kilo kaydı yok.','No weight records for this period.')}</div>`;
    const vals=items.map(x=>Number(x.value)),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(.5,max-min);
    const W=330,H=180,P=18;
    const pts=items.map((x,i)=>({
      x:items.length===1?W/2:P+i*(W-P*2)/Math.max(1,items.length-1),
      y:H-P-(Number(x.value)-min)/span*(H-P*2)
    }));
    return `<svg class="weight-period-line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line class="grid" x1="${P}" y1="${H/3}" x2="${W-P}" y2="${H/3}"/>
      <line class="grid" x1="${P}" y1="${H*2/3}" x2="${W-P}" y2="${H*2/3}"/>
      <polyline class="line" points="${pts.map(q=>`${q.x},${q.y}`).join(' ')}"/>
      ${pts.map(q=>`<circle class="dot" cx="${q.x}" cy="${q.y}" r="4"/>`).join('')}
    </svg>`;
  }

  renderWeight=function(){
    const host=document.getElementById('weightContent');if(!host)return;
    const items=weightFiltered(),first=items[0],latest=items[items.length-1];
    const change=first&&latest?Number(latest.value)-Number(first.value):0;

    host.innerHTML=`${tabs('weight')}
      <div class="period-chart"><div class="stats-period-title"><div><strong>${gx('Kilo değişimi','Weight trend')}</strong><span>${periodName(period('weight'))}</span></div></div>${weightSvg(items)}</div>
      <div class="period-summary-grid">
        <div class="period-summary"><span>${gx('Dönemin ilk kaydı','First record')}</span><strong>${first?decimal(first.value)+' kg':'—'}</strong></div>
        <div class="period-summary"><span>${gx('Son kayıt','Latest')}</span><strong>${latest?decimal(latest.value)+' kg':'—'}</strong></div>
        <div class="period-summary"><span>${gx('Değişim','Change')}</span><strong>${first&&latest?`${change>0?'+':''}${decimal(change)} kg`:'—'}</strong></div>
        <div class="period-summary"><span>${gx('Kayıt sayısı','Records')}</span><strong>${items.length}</strong></div>
      </div>
      <div class="section-head"><h2>${t('history')}</h2><span>${items.length} ${t('records')}</span></div>
      <div class="weight-history">${items.length?items.slice().reverse().map(x=>
        `<div class="weight-record"><div class="weight-record-main"><span>${formatDate(x.date,true)}</span><strong>${decimal(x.value)} kg</strong></div><button class="more" data-action="delete-weight" data-id="${x.id}">×</button></div>`
      ).join(''):`<div class="empty"><strong>${t('noRecord')}</strong></div>`}</div>`;
  };

  openWeight=function(){
    document.getElementById('weightSheet')?.classList.add('fullscreen-stat');
    document.getElementById('weightDateInput').value=localDateKey();
    document.getElementById('weightDateInput').max=localDateKey();
    document.getElementById('weightInput').value='';
    document.getElementById('targetWeightInput').value=state.profile.targetWeight||'';
    renderWeight();
    openSheet('weightSheet');
  };

  /* ---------------- ODAK ---------------- */
  function focusFirstDate(){
    return earliest((state.tracking.focusSessions||[]).map(x=>x.date));
  }

  renderFocusStats=function(){
    const host=document.getElementById('focusStatsContent');if(!host)return;
    const p=period('focus'),b=makeBuckets(p,focusFirstDate()),sessions=state.tracking.focusSessions||[];
    const values=b.map(bucket=>sessions.filter(x=>bucket.dates.includes(x.date)).reduce((n,x)=>n+Number(x.minutes||0),0));
    const start=periodStart(p,focusFirstDate());
    const filtered=sessions.filter(x=>x.date>=start&&x.date<=localDateKey());
    const total=filtered.reduce((n,x)=>n+Number(x.minutes||0),0);
    const avg=filtered.length?Math.round(total/filtered.length):0;
    const longest=filtered.length?Math.max(...filtered.map(x=>Number(x.minutes)||0)):0;

    host.innerHTML=`${tabs('focus')}
      <div class="period-chart"><div class="stats-period-title"><div><strong>${gx('Odak ritmi','Focus rhythm')}</strong><span>${periodName(p)}</span></div></div>${bars(values,b.map(x=>x.label),'focus')}</div>
      <div class="period-summary-grid">
        <div class="period-summary"><span>${t('totalFocus')}</span><strong>${fmt(total)} ${t('minutesShort')}</strong></div>
        <div class="period-summary"><span>${t('averageSession')}</span><strong>${fmt(avg)} ${t('minutesShort')}</strong></div>
        <div class="period-summary"><span>${t('longestSession')}</span><strong>${fmt(longest)} ${t('minutesShort')}</strong></div>
        <div class="period-summary"><span>${t('sessions')}</span><strong>${filtered.length}</strong></div>
      </div>
      <div class="focus-history">${filtered.length?filtered.slice().reverse().slice(0,50).map(x=>
        `<div class="focus-history-item"><div class="feature-icon">${icon('timer',17)}</div><div class="focus-history-main"><strong>${formatDate(x.date)}</strong><span>${categoryName(x.category)}</span></div><b>${x.minutes} ${t('minutesShort')}</b></div>`
      ).join(''):`<div class="empty"><strong>${t('noRecord')}</strong></div>`}</div>`;
  };

  openFocusStats=function(){
    document.getElementById('focusStatsSheet')?.classList.add('fullscreen-stat');
    renderFocusStats();
    openSheet('focusStatsSheet');
  };

  /* ---------------- RUH HALİ ---------------- */
  function moodFirstDate(){
    return earliest(Object.keys(state.tracking.moods||{}));
  }

  function renderMoodStable(){
    const host=document.getElementById('moodContent');if(!host)return;
    const p=period('mood'),b=makeBuckets(p,moodFirstDate()),moods=state.tracking.moods||{};
    const values=b.map(bucket=>{
      const vals=bucket.dates.map(d=>Number(moods[d])||0).filter(Boolean);
      return vals.length?vals.reduce((a,c)=>a+c,0)/vals.length:0;
    });
    const current=Number(moods[HS.moodDate])||0;

    host.innerHTML=`${tabs('mood')}
      <div class="period-chart"><div class="stats-period-title"><div><strong>${gx('Ruh hali ritmi','Mood rhythm')}</strong><span>${periodName(p)}</span></div></div>${bars(values,b.map(x=>x.label),'mood')}</div>

      <div class="card">
        <div class="simple-mood-date">
          <button data-action="mood-day-prev">‹</button>
          <div style="text-align:center"><strong>${formatDate(HS.moodDate,true)}</strong><div class="card-sub">${HS.moodDate===localDateKey()?gx('Bugün','Today'):gx('Bu günü düzenliyorsun','Editing this day')}</div></div>
          <button data-action="mood-day-next" ${HS.moodDate>=localDateKey()?'disabled':''}>›</button>
        </div>
        <h3 class="card-title">${gx('Günün nasıl geçti?','How was your day?')}</h3>
        <div class="mood-grid simple">${MOODS.map(m=>
          `<button class="mood-option ${current===m.v?'active':''}" data-action="save-mood" data-value="${m.v}"><span>${typeof premiumMood==='function'?premiumMood(m.v):m.e}</span><small>${t(m.k)}</small></button>`
        ).join('')}</div>
      </div>

      <div class="section-head"><h2>${gx('Geçmiş günler','Past days')}</h2><span>${gx('Dokunarak düzenle','Tap to edit')}</span></div>
      <div class="mood-history-simple">${lastDays(35).map(d=>{
        const v=Number(moods[d.key])||0;
        return `<button class="mood-history-day ${d.key===HS.moodDate?'selected':''}" data-action="mood-date" data-date="${d.key}">${dateFromKey(d.key).getDate()}${v?`<span>${typeof premiumMood==='function'?premiumMood(v,'xs'):MOODS.find(m=>m.v===v)?.e||''}</span>`:''}</button>`;
      }).join('')}</div>`;
  }

  renderMood=renderMoodStable;
  saveMood=function(value){
    const v=clamp(Number(value)||3,1,5);
    const existed=Boolean(state.tracking.moods?.[HS.moodDate]);
    state.tracking.moods=state.tracking.moods||{};
    state.tracking.moods[HS.moodDate]=v;
    scheduleSave();
    renderMoodStable();
    renderProfile();
    renderToday();
    showToast(t(existed?'moodUpdated':'moodSaved'),'good');
  };

  openMood=function(){
    HS.moodDate=localDateKey();
    document.getElementById('moodSheet')?.classList.add('fullscreen-stat');
    renderMoodStable();
    openSheet('moodSheet');
  };

  /* ---------------- AKSİYON YÖNLENDİRME ---------------- */
  const baseHandle=handleAction;
  handleAction=function(action,el){
    switch(action){
      case 'stats-period':{
        const kind=el.dataset.kind, p=el.dataset.period;
        setPeriod(kind,p);
        if(kind==='habits')window.renderHabitVisualChart();
        if(kind==='water')renderWaterStable();
        if(kind==='weight')renderWeight();
        if(kind==='focus')renderFocusStats();
        if(kind==='mood')renderMoodStable();
        return;
      }

      case 'water-day':
        HS.waterDate=el.dataset.date||localDateKey();renderWaterStable();return;

      case 'water-history-plus':{
        const r=waterRecordSafe(HS.waterDate);
        r.count=clamp(Number(r.count||0)+1,0,40);
        r.rewarded=r.count>=r.goal;
        scheduleSave();renderWaterStable();
        if(HS.waterDate===localDateKey())renderAll();
        return;
      }

      case 'water-history-minus':{
        const r=waterRecordSafe(HS.waterDate);
        r.count=clamp(Number(r.count||0)-1,0,40);
        r.rewarded=r.count>=r.goal;
        scheduleSave();renderWaterStable();
        if(HS.waterDate===localDateKey())renderAll();
        return;
      }

      case 'save-glass-ml':{
        const v=Number(document.getElementById('glassMlInput')?.value);
        if(!Number.isFinite(v)||v<50||v>1500){showToast(gx('50–1500 ml arasında bir değer yaz.','Enter a value from 50–1500 ml.'),'bad');return}
        state.water.glassMl=Math.round(v);
        scheduleSave();renderWaterStable();renderAll();
        showToast(gx('Bardak ölçüsü güncellendi.','Glass size updated.'),'good');
        return;
      }

      case 'save-water-goal':{
        const v=Math.round(Number(document.getElementById('waterGoalInput')?.value));
        if(!Number.isFinite(v)||v<1||v>40){showToast(gx('1–40 bardak arasında bir hedef yaz.','Enter a goal from 1–40 glasses.'),'bad');return}
        const r=waterRecordSafe(HS.waterDate);
        r.goal=v;
        if(HS.waterDate===localDateKey())state.water.defaultGoal=v;
        r.rewarded=r.count>=r.goal;
        scheduleSave();renderWaterStable();renderAll();
        showToast(gx('Su hedefi güncellendi.','Water goal updated.'),'good');
        return;
      }

      case 'mood-date':
        HS.moodDate=el.dataset.date||localDateKey();renderMoodStable();return;

      case 'mood-day-prev':
        HS.moodDate=addDays(HS.moodDate,-1);renderMoodStable();return;

      case 'mood-day-next':{
        const next=addDays(HS.moodDate,1);
        if(next<=localDateKey())HS.moodDate=next;
        renderMoodStable();return;
      }

      default:return baseHandle(action,el);
    }
  };

  /* ---------------- BAŞLANGIÇ TEMİZLİĞİ ---------------- */
  const previousStart=startHabitopia;
  startHabitopia=async function(){
    const result=await previousStart.apply(this,arguments);
    try{
      ensureStatsSettings();
      document.getElementById('waterStatsSheet')?.classList.add('fullscreen-stat');
      document.getElementById('weightSheet')?.classList.add('fullscreen-stat');
      document.getElementById('focusStatsSheet')?.classList.add('fullscreen-stat');
      document.getElementById('moodSheet')?.classList.add('fullscreen-stat');
      if(document.getElementById('habitTable'))window.renderHabitVisualChart();
    }catch(e){console.warn('Habitopia analytics init',e)}
    return result;
  };

  /* Eski görünmeyen istatistik alanları yalnızca JS uyumluluğu için kalır. */
  try{
    ['weekActivityChart','habitPerformance','badgeGrid'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.display='none';
    });
  }catch(e){}
})();

