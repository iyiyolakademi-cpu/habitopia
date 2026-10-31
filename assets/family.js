(()=>{
"use strict";
const KEY="habitopia-family-v1", VERSION=1;
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"h"+Date.now().toString(36)+Math.random().toString(36).slice(2);
const now=()=>new Date();
const localDay=(d=now())=>{const x=new Date(d);return Number.isNaN(x.valueOf())?"":x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const offsetDay=(n)=>{const d=now();d.setDate(d.getDate()+n);return localDay(d)};
const localInput=(d)=>{const x=new Date(d);return Number.isNaN(x.valueOf())?"":localDay(x)+"T"+String(x.getHours()).padStart(2,"0")+":"+String(x.getMinutes()).padStart(2,"0")};
const futureInput=(days=1,h=20)=>{const d=now();d.setDate(d.getDate()+days);d.setHours(h,0,0,0);return localInput(d)};
const validDate=x=>typeof x==="string"&&x.length>=10&&!Number.isNaN(new Date(x.length===10?x+"T12:00:00":x).valueOf());
const stamp=x=>validDate(x)?new Date(x.length===10?x+"T12:00:00":x).toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"}):"Tarih yok";
const stampTime=x=>validDate(x)?new Date(x).toLocaleDateString("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Belirlenmedi";
const money=x=>Number(x||0).toLocaleString("tr-TR",{minimumFractionDigits:0,maximumFractionDigits:2})+" ₺";
const number=x=>Number.isFinite(Number(x))?Math.max(0,Math.min(Number(x),100000000)):0;
const safeText=(x,max=120)=>typeof x==="string"?x.trim().slice(0,max):"";
const cats={bill:["Faturalar ve ödemeler","▣"],subscription:["Abonelik ve taahhütler","↻"],vehicle:["Araç işlemleri","▤"],warranty:["Garanti ve ürün takibi","✧"],home:["Ev bakımı","⌂"],health:["Sağlık randevuları","♡"],school:["Çocukların okul işleri","▥"],custom:["Özel aile hatırlatmaları","✦"]};
const memberName=id=>state.members.find(x=>x.id===id)?.name||"Aile üyesi";
const currentName=()=>memberName(state.currentMember);
const current=()=>state.currentMember;
const shareable=x=>!x.privateTo||x.privateTo===current();
const blank=(familyName,person)=>({version:VERSION,demo:false,familyName:safeText(familyName,50)||"Ailem",members:[{id:"me",name:safeText(person,40)||"Ben"}],currentMember:"me",shoppingBudget:0,shoppingMeta:{assignee:"me",reminderAt:null},tasks:[],shopping:[],radar:[],events:[],assets:[],workflows:[],notified:[]});
function normalize(input){
 if(!input||typeof input!=="object"||input.version!==VERSION||!Array.isArray(input.members)||!Array.isArray(input.tasks)||!Array.isArray(input.shopping)||!Array.isArray(input.radar)||!Array.isArray(input.events))throw Error("Desteklenmeyen yedek biçimi.");
 if(input.members.length<1||input.members.length>30)throw Error("Üye sayısı geçersiz.");
 const s=blank(input.familyName||"Ailem",input.members[0]?.name||"Ben");s.demo=input.demo===true;
 const mids=new Set();
 s.members=input.members.map(x=>({id:safeText(x?.id,90)||uid(),name:safeText(x?.name,40)||"Üye"})).filter(x=>!mids.has(x.id)&&mids.add(x.id));
 if(!s.members.length)throw Error("Geçerli aile üyesi yok.");
 const validMember=id=>s.members.some(m=>m.id===id)?id:s.members[0].id;
 s.currentMember=validMember(input.currentMember);
 const iso=x=>validDate(x)?x:null;
 const taskIds=new Set();
 s.tasks=input.tasks.slice(0,1500).map(t=>({id:safeText(t.id,90)||uid(),listId:safeText(t.listId,90)||uid(),listTitle:safeText(t.listTitle,90)||"Görev listesi",title:safeText(t.title,140),assignee:validMember(t.assignee),creator:validMember(t.creator),dueAt:iso(t.dueAt),reminderAt:iso(t.reminderAt),doneAt:iso(t.doneAt)})).filter(t=>t.title&&!taskIds.has(t.id)&&taskIds.add(t.id));
 const shopIds=new Set();
 s.shopping=input.shopping.slice(0,1000).map(x=>({id:safeText(x.id,90)||uid(),title:safeText(x.title,100),qty:number(x.qty)||1,unit:safeText(x.unit,15)||"adet",price:number(x.price),bought:x.bought===true})).filter(x=>x.title&&!shopIds.has(x.id)&&shopIds.add(x.id));
 s.shoppingBudget=number(input.shoppingBudget);
 s.shoppingMeta={assignee:validMember(input.shoppingMeta?.assignee),reminderAt:iso(input.shoppingMeta?.reminderAt)};
 const radarIds=new Set();
 s.radar=input.radar.slice(0,1000).map(x=>({id:safeText(x.id,90)||uid(),title:safeText(x.title,150),cat:cats[x.cat]?x.cat:"custom",dueAt:iso(x.dueAt),reminderAt:iso(x.reminderAt),assignee:validMember(x.assignee),creator:validMember(x.creator),doneAt:iso(x.doneAt),privateTo:s.members.some(m=>m.id===x.privateTo)?x.privateTo:null})).filter(x=>x.title&&x.dueAt&&!radarIds.has(x.id)&&radarIds.add(x.id));
 const eventIds=new Set();
 s.events=input.events.slice(0,1000).map(x=>({id:safeText(x.id,90)||uid(),title:safeText(x.title,150),date:iso(x.date)?.slice(0,10)||localDay(),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)?x.time:"12:00",notes:safeText(x.notes,500),creator:validMember(x.creator),invitees:Array.isArray(x.invitees)?[...new Set(x.invitees.filter(id=>s.members.some(m=>m.id===id)))]:[validMember(x.creator)],rsvp:Object.fromEntries(Object.entries(x.rsvp||{}).filter(([k,v])=>s.members.some(m=>m.id===k)&&["yes","no","maybe"].includes(v))),privateTo:s.members.some(m=>m.id===x.privateTo)?x.privateTo:null})).filter(x=>x.title&&!eventIds.has(x.id)&&eventIds.add(x.id));
 s.assets=(Array.isArray(input.assets)?input.assets:[]).slice(0,500).map(a=>({
 id:safeText(a.id,90)||uid(),title:safeText(a.title,150)||"Ev eşyası",creator:validMember(a.creator),
 category:safeText(a.category,60)||"Ev eşyası",brand:safeText(a.brand,70),model:safeText(a.model,70),
 serial:safeText(a.serial,100),purchasedAt:iso(a.purchasedAt)||"",warrantyUntil:iso(a.warrantyUntil)||"",
 notes:safeText(a.notes,500),services:Array.isArray(a.services)?a.services.slice(0,100):[],
 privateTo:s.members.some(m=>m.id===a.privateTo)?a.privateTo:null}));
 s.workflows=Array.isArray(input.workflows)?input.workflows.slice(0,200):[];
 s.notified=Array.isArray(input.notified)?input.notified.filter(x=>typeof x==="string").slice(-1200):[];
 return s;
}
let state,storageHealthy=true;
state=blank("","");
 // Previous local demonstration data is deliberately not loaded into the account-based app.
function save(){
 if(!window.HabitopiaCloud?.active){toast("Devam etmek için aile hesabına giriş yap.");return;}
 window.HabitopiaCloud.save(state);
}
const isDemo=()=>state.demo;
const targetTask=t=>t.assignee===current();
const dueCount=()=>state.radar.filter(x=>!x.doneAt&&shareable(x)&&x.dueAt&&new Date(x.dueAt)-now()<1000*60*60*24*14).length;
const activeTaskCount=()=>state.tasks.filter(t=>!t.doneAt&&targetTask(t)).length;
const boughtCount=()=>state.shopping.filter(x=>x.bought).length;
const cost=x=>number(x.price)*number(x.qty);
const estimated=()=>state.shopping.reduce((s,x)=>s+cost(x),0);
const spent=()=>state.shopping.filter(x=>x.bought).reduce((s,x)=>s+cost(x),0);
let page="home",taskFilter="mine",radarFilter="all",calendarMonth=new Date(now().getFullYear(),now().getMonth(),1),selectedDate=localDay(),notificationWindow=null;
const pageTitle={home:"Bugünün Akışı",tasks:"Aile Görevleri",shopping:"Alışveriş",radar:"Aile Radarı",calendar:"Aile Takvimi",assets:"Evim ve Belgeler",family:"Ailem",settings:"Ayarlar"};
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000);}
const header=(label,title,description,actions="")=>'<div class="page-heading"><div><p class="eyebrow">'+esc(label)+'</p><h1>'+esc(title)+'</h1><p class="subcopy">'+esc(description)+'</p></div><div class="page-actions">'+actions+'</div></div>';
const button=(label,action,cls="btn-primary",attrs="")=>'<button type="button" class="btn '+cls+'" data-action="'+action+'" '+attrs+'>'+label+'</button>';
const empty=(symbol,title,desc)=>'<div class="empty"><span class="empty-ico">'+symbol+'</span><strong>'+esc(title)+'</strong>'+esc(desc)+'</div>';
const pill=(label,kind="")=>'<span class="pill '+kind+'">'+esc(label)+'</span>';
const progress=(done,total)=>'<div class="progress-track"><span style="width:'+(total?Math.round(100*done/total):0)+'%"></span></div>';
const checkButton=(kind,item)=>'<button type="button" class="check-control '+((item.doneAt||item.bought)?"is-checked":"")+'" data-action="'+kind+'" data-id="'+esc(item.id)+'" aria-pressed="'+!!(item.doneAt||item.bought)+'" aria-label="'+((item.doneAt||item.bought)?"Tamamlandı işaretini kaldır":"Tamamlandı olarak işaretle")+'">✓</button>';
const deleteButton=(kind,id)=>'<button type="button" class="row-delete" data-action="'+kind+'" data-id="'+esc(id)+'" title="Sil" aria-label="Sil">×</button>';
const taskRow=t=>'<div class="list-row '+(t.doneAt?"done":"")+'">'+checkButton("toggle-task",t)+'<div class="item-info"><span class="item-title">'+esc(t.title)+'</span><span class="item-sub">'+esc(memberName(t.assignee))+' · '+(t.dueAt?stampTime(t.dueAt):"Tarih belirtilmedi")+(t.reminderAt?" · 🔔 "+stampTime(t.reminderAt):"")+'</span></div>'+deleteButton("delete-task",t.id)+'</div>';
const shoppingRow=x=>'<div class="list-row '+(x.bought?"done":"")+'">'+checkButton("toggle-shop",x)+'<div class="item-info"><span class="item-title">'+esc(x.title)+'</span><span class="item-sub">'+esc(x.qty+" "+x.unit)+'</span></div><span class="item-amount">'+money(cost(x))+'</span>'+deleteButton("delete-shop",x.id)+'</div>';
const radarItem=x=>'<div class="radar-card '+(x.doneAt?"done":"")+'"><div class="radar-glyph">'+esc(cats[x.cat]?.[1]||"✦")+'</div><div class="item-info"><span class="item-title">'+esc(x.title)+'</span><span class="item-sub">'+esc(cats[x.cat]?.[0])+' · Sorumlu: '+esc(memberName(x.assignee))+'</span><small>Son tarih: '+stampTime(x.dueAt)+(x.reminderAt?" · 🔔 "+stampTime(x.reminderAt):"")+'</small></div><div class="radar-end">'+pill(x.doneAt?"Tamamlandı":new Date(x.dueAt)<now()?"Gecikti":"Takipte",x.doneAt?"":new Date(x.dueAt)<now()?"danger":"warning")+ (x.assignee===current()?checkButton("toggle-radar",x):"")+deleteButton("delete-radar",x.id)+'</div></div>';
function renderHome(){
 const d=now(),greeting=d.getHours()<11?"Günaydın":d.getHours()<18?"İyi günler":"İyi akşamlar";
 const todayLabel=d.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"});
 const pending=state.tasks.filter(t=>t.assignee===current()&&!t.doneAt).sort((a,b)=>(a.dueAt||"z").localeCompare(b.dueAt||"z"));
 const nextRadars=state.radar.filter(r=>!r.doneAt&&shareable(r)).sort((a,b)=>(a.dueAt||"z").localeCompare(b.dueAt||"z"));
 const upcomingEvents=eventsVisible().filter(e=>e.date>=localDay()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const nextEvent=upcomingEvents[0],upcoming=nextRadars.slice(0,3);
 let week="";
 for(let i=0;i<7;i++){
  const day=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i);
  const date=localDay(day),events=eventsVisible().filter(e=>e.date===date).length;
  week+='<button type="button" class="flow-day '+(i===0?"is-current":"")+'" data-action="go-calendar-date" data-value="'+date+'" aria-label="'+stamp(date)+', '+events+' etkinlik"><span>'+day.toLocaleDateString("tr-TR",{weekday:"short"})+'</span><strong>'+day.getDate()+'</strong><small>'+(events?"●":"·")+'</small></button>';
 }
 const tasksView=pending.length?pending.slice(0,4).map(t=>taskRow(t)).join(""):empty("☑","Bugün elinde bekleyen görev yok","Ailene ilk görev listesini gönderebilirsin.");
 const radarView=upcoming.length?upcoming.map(r=>'<div class="flow-date-item"><span class="flow-date-symbol">'+esc(cats[r.cat]?.[1]||"◉")+'</span><div><strong>'+esc(r.title)+'</strong><small>'+stampTime(r.dueAt)+' · '+esc(memberName(r.assignee))+'</small></div></div>').join(""):empty("◉","Yaklaşan hatırlatma yok","Fatura, garanti veya önemli bir tarih ekle.");
 const nextEventView=nextEvent?'<div class="flow-event-row"><span class="flow-event-date"><strong>'+new Date(nextEvent.date+"T12:00:00").getDate()+'</strong><small>'+new Date(nextEvent.date+"T12:00:00").toLocaleDateString("tr-TR",{month:"short"})+'</small></span><div><strong>'+esc(nextEvent.title)+'</strong><small>'+esc(nextEvent.time)+' · '+esc((nextEvent.invitees||[]).length)+' davetli</small></div></div>':empty("▦","Takvim henüz boş","İlk aile etkinliğini planlayabilirsin.");
 const remainingShopping=state.shopping.filter(x=>!x.bought).length;
 return '<div class="flow-page"><div class="flow-welcome"><div><span class="flow-overline">'+esc(todayLabel.toLocaleUpperCase("tr-TR"))+'</span><h1>'+greeting+', <em>'+esc(currentName())+'.</em></h1><p>'+esc(state.familyName)+' için bugün her şeyi bir arada tutalım.</p></div><div class="flow-family-stamp"><span>⌂</span><strong>'+esc(state.familyName)+'</strong><small>'+state.members.length+' kişi birlikte</small></div></div>'+
 '<div class="flow-layout"><div class="flow-primary"><section class="flow-focus"><div class="flow-focus-top"><span>BUGÜNÜN ÖNCELİĞİ</span><span class="flow-focus-decor">◌</span></div><div class="flow-focus-inner"><div><h2>'+(pending.length?'Birlikte halledeceğiz.':'Günün planı hazır.')+'</h2><p>'+(pending.length?'Seni bekleyen '+pending.length+' görev var. İşleri tamamladıkça herkes durumunu görebilir.':'Henüz sana atanmış bir görev yok. Ailen için yeni bir plan oluşturabilirsin.')+'</p>'+button(pending.length?"Görevlerimi gör ↗":"İlk görevi oluştur ↗",pending.length?"goto-tasks":"new-task","btn flow-focus-button")+'</div><div class="flow-focus-number" aria-hidden="true"><strong>'+pending.length+'</strong><span>GÖREV</span></div></div></section>'+
 '<section class="flow-sheet"><div class="flow-sheet-head"><div><span class="flow-overline">BİRLİKTE YAPILACAKLAR</span><h2>Görevlerim <span class="flow-count">'+pending.length+'</span></h2></div>'+button("Yeni görev ＋","new-task","btn-muted btn-small")+'</div><div class="list flow-task-list">'+tasksView+'</div></section>'+
 '<section class="flow-sheet"><div class="flow-sheet-head"><div><span class="flow-overline">AİLE RADARI</span><h2>Unutulmasın</h2></div>'+button("Tümünü gör ↗","goto-radar","btn-muted btn-small")+'</div><div class="flow-reminders">'+radarView+'</div></section></div>'+
 '<aside class="flow-secondary"><section class="flow-sheet flow-calendar"><div class="flow-sheet-head"><div><span class="flow-overline">AİLE TAKVİMİ</span><h2>Bu hafta</h2></div>'+button("Aç ↗","go-calendar","btn-muted btn-small")+'</div><div class="flow-week">'+week+'</div><div class="flow-mini-heading">Sıradaki buluşma</div>'+nextEventView+'</section>'+
 '<section class="flow-quick"><span class="flow-overline">HIZLI İŞLEMLER</span><h2>Bir şey mi yapacağız?</h2><div class="flow-quick-grid"><button data-action="new-task"><span>☑</span>Görev gönder <b>↗</b></button><button data-action="new-shop"><span>▤</span>Listeye ekle <b>↗</b></button><button data-action="new-radar"><span>◉</span>Hatırlatma kur <b>↗</b></button><button data-action="new-event"><span>▦</span>Etkinlik planla <b>↗</b></button></div></section>'+
 '<section class="flow-mini-shop"><div><span class="flow-overline">ORTAK ALIŞVERİŞ</span><strong>'+remainingShopping+' ürün alınmayı bekliyor</strong><small>Planlanan tutar '+money(estimated())+'</small></div>'+button("Listeyi aç ↗","go-shopping","btn-muted btn-small")+'</section>'+
 '<button type="button" data-page="assets" class="flow-asset-link"><span>⌂</span><div><strong>Evin dijital hafızası</strong><small>Garantiler, servisler ve belgeler</small></div><b>↗</b></button></aside></div></div>';
}
function renderTasks(){
 const all=state.tasks.filter(t=>taskFilter==="all"||taskFilter==="mine"&&t.assignee===current()||taskFilter==="completed"&&!!t.doneAt);
 const groups=new Map();
 all.forEach(t=>{const key=t.listId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t)});
 const output=[...groups.entries()].map(([key,list])=>{const done=list.filter(x=>x.doneAt).length;return '<section class="panel task-list-group" id="list-'+esc(key)+'"><div class="task-list-head"><div><span class="eyebrow">GÖREV LİSTESİ</span><h3>'+esc(list[0].listTitle)+'</h3><small>Hazırlayan: '+esc(memberName(list[0].creator))+'</small></div>'+pill(done+" / "+list.length+" tamamlandı",done===list.length?"":"warning")+'</div>'+progress(done,list.length)+'<div class="list">'+list.map(taskRow).join("")+'</div></section>'}).join("");
 return header("BİRLİKTE YAPALIM","Aile Görevleri","Bir aile üyesi liste hazırlar, sorumlu kişiye ve belirlenen zamanda hatırlatma atanır.",button("＋ Yeni görev listesi","new-task"))+
 '<div class="tabs"><button class="tab '+(taskFilter==="mine"?"active":"")+'" data-action="task-filter" data-value="mine">Bana atananlar</button><button class="tab '+(taskFilter==="all"?"active":"")+'" data-action="task-filter" data-value="all">Tüm görevler</button><button class="tab '+(taskFilter==="completed"?"active":"")+'" data-action="task-filter" data-value="completed">Tamamlananlar</button></div>'+(output||empty("☑","Henüz görev listesi yok","Aile için ilk görev listesini oluştur."));
}
function renderShopping(){
 const budget=state.shoppingBudget, total=estimated(), paid=spent();
 const percent=budget?Math.min(100,Math.round(total/budget*100)):0;
 const warning=budget&&total>budget?'<p class="notice warn">Planlanan toplam alışveriş tutarı bütçeyi '+money(total-budget)+' aşıyor.</p>':"";
 return header("BİRLİKTE ALIŞVERİŞ","Ortak Alışveriş","Ürünleri paylaşın, miktar ve tahmini fiyatları takip edin.",button("＋ Ürün ekle","new-shop")+' '+button("Listeyi görevlendir","assign-shop","btn-muted"))+
 '<div class="two-col"><div><section class="panel"><div class="panel-heading"><div><p class="eyebrow">AİLENİN LİSTESİ</p><h3>Alınacak ürünler</h3></div>'+pill(boughtCount()+" / "+state.shopping.length+" alındı")+'</div><div class="list">'+(state.shopping.length?state.shopping.map(shoppingRow).join(""):empty("▤","Listen henüz boş","İlk alışveriş ürününü ekle."))+'</div></section></div><div class="info-rail"><div class="rail-card"><p class="eyebrow">ALIŞVERİŞ BÜTÇESİ</p><div class="budget-value">'+money(budget)+'</div>'+progress(Math.min(total,budget),budget)+'<div class="budget-meta"><span>Tahmini toplam</span><strong>'+money(total)+'</strong></div><div class="budget-meta"><span>Alınan ürünler</span><strong>'+money(paid)+'</strong></div><div class="budget-meta"><span>Kalan bütçe (tahmini)</span><strong>'+money(Math.max(0,budget-total))+'</strong></div>'+button("Bütçeyi düzenle","set-budget","btn-light btn-small")+'</div><div class="rail-card"><h3>Liste sorumlusu</h3><p>'+esc(memberName(state.shoppingMeta.assignee))+(state.shoppingMeta.reminderAt?" · 🔔 "+stampTime(state.shoppingMeta.reminderAt):" · Hatırlatma yok")+'</p></div>'+warning+'</div></div>';
}
function renderRadar(){
 const all=state.radar.filter(shareable).filter(x=>radarFilter==="all"||radarFilter==="pending"&&!x.doneAt||radarFilter==="done"&&!!x.doneAt||x.cat===radarFilter).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
 return header("ÖNEMLİ TARİHLER GÜVENDE","Aile Radarı","Faturalar, taahhütler, araç, ev, okul ve diğer önemli işler.",button("＋ Radar kaydı","new-radar"))+
 '<div class="notice">🔔 Hatırlatma tarihini ve saatini sen belirlersin. Görevin sorumlusu işi bitirdiğinde tek dokunuşla tamamlar.</div><div class="tabs"><button data-action="radar-filter" data-value="all" class="tab '+(radarFilter==="all"?"active":"")+'">Tümü</button><button data-action="radar-filter" data-value="pending" class="tab '+(radarFilter==="pending"?"active":"")+'">Bekleyen</button><button data-action="radar-filter" data-value="done" class="tab '+(radarFilter==="done"?"active":"")+'">Tamamlanan</button><button data-action="radar-filter" data-value="bill" class="tab '+(radarFilter==="bill"?"active":"")+'">Faturalar</button><button data-action="radar-filter" data-value="vehicle" class="tab '+(radarFilter==="vehicle"?"active":"")+'">Araç</button></div><div class="radar-list">'+(all.length?all.map(radarItem).join(""):empty("◉","Radar kaydı bulunamadı","Yeni bir önemli tarih ekleyebilirsin."))+'</div>';
}
const eventsVisible=()=>state.events.filter(shareable).filter(x=>x.invitees.includes(current())||x.creator===current()||(!x.privateTo));
const eventView=e=>{
 const status=e.rsvp[current()]||"pending",myInvite=e.invitees.includes(current());
 const linked=[...state.tasks,...state.shopping,...state.radar].filter(x=>x.linkedEventId===e.id);
 const linkedHtml=linked.length?'<div class="workflow-timeline">'+linked.slice(0,7).map(x=>'<div class="workflow-row"><span>↳</span><div class="item-info"><strong class="item-title">'+esc(x.title)+'</strong><span class="item-sub">'+(x.doneAt||x.bought?"Tamamlandı":"Bekliyor")+'</span></div></div>').join("")+'</div>':"";
 return '<article class="event-card"><div class="event-top"><span class="eyebrow">'+esc(stamp(e.date))+' · '+esc(e.time)+'</span>'+pill(e.privateTo?"Özel":"Aile etkinliği",e.privateTo?"purple":"")+'</div><h3>'+esc(e.title)+'</h3><p>'+esc(e.notes||"")+ (e.notes?" · ":"")+'Oluşturan: '+esc(memberName(e.creator))+'</p><p style="margin-top:8px">Davetliler: '+esc(e.invitees.map(memberName).join(", ")||"Yok")+'</p>'+linkedHtml+(myInvite?'<div class="rsvp-actions"><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="yes" class="'+(status==="yes"?"active":"")+'">✓ Katılacağım</button><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="maybe" class="'+(status==="maybe"?"active":"")+'">? Belki</button><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="no" class="'+(status==="no"?"active":"")+'">× Katılamam</button></div>':"")+'<div class="compact-detail"><small class="muted">Yanıtlar: '+esc(e.invitees.map(id=>memberName(id)+": "+({yes:"Katılıyor",no:"Katılamıyor",maybe:"Belki",pending:"Bekliyor"}[e.rsvp[id]||"pending"])).join(" · "))+'</small>'+deleteButton("delete-event",e.id)+'</div></article>';
};
function renderCalendar(){
 const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();
 let cells=["Pt","Sa","Ça","Pe","Cu","Ct","Pz"].map(x=>'<span class="weekday">'+x+'</span>').join("");
 for(let i=0;i<start;i++)cells+='<button class="cal-day" disabled aria-hidden="true"></button>';
 for(let i=1;i<=days;i++){const key=y+"-"+String(m+1).padStart(2,"0")+"-"+String(i).padStart(2,"0");const count=eventsVisible().filter(x=>x.date===key).length;
  cells+='<button class="cal-day '+(key===selectedDate?"selected":"")+' '+(key===localDay()?"today":"")+'" data-action="select-date" data-value="'+key+'" aria-label="'+key+(count?" "+count+" etkinlik":"")+'">'+i+'<span class="cal-dots">'+(count?'<i></i>':"")+'</span></button>';
 }
 const todays=eventsVisible().filter(x=>x.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
 return header("AİLENİN ORTAK TAKVİMİ","Aile Takvimi","Etkinlikleri paylaşın, aile üyelerini davet edin ve katılım durumlarını görün.",button("＋ Etkinlik oluştur","new-event"))+
 '<div class="calendar-layout"><section class="panel"><div class="month-head"><button data-action="month-prev" aria-label="Önceki ay">‹</button><h3>'+calendarMonth.toLocaleDateString("tr-TR",{month:"long",year:"numeric"})+'</h3><button data-action="month-next" aria-label="Sonraki ay">›</button></div><div class="month-grid">'+cells+'</div></section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">SEÇİLEN GÜN</p><h3>'+stamp(selectedDate)+'</h3></div>'+pill(todays.length+" etkinlik")+'</div><div class="events-feed">'+(todays.length?todays.map(eventView).join(""):empty("▦","Bu gün boş","Yeni bir aile etkinliği oluşturabilirsin."))+'</div></section></div><section class="section-gap panel"><div class="panel-heading"><h3>Yaklaşan aile etkinlikleri</h3></div><div class="events-feed">'+(eventsVisible().filter(x=>x.date>=localDay()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,6).map(eventView).join("")||empty("◷","Henüz etkinlik yok","Aile üyelerini davet ederek bir etkinlik oluştur."))+'</div></section>';
}

function renderAssets(){
 const assets=state.assets||[];
 const cards=assets.map(a=>{
  const count=state.radar.filter(r=>r.linkedAssetId===a.id&&!r.doneAt).length;
  return '<article class="asset-card"><div class="asset-icon">▣</div><span class="eyebrow">'+esc(a.category||"Ev eşyası")+'</span><h3>'+esc(a.title)+'</h3><p>'+esc(a.brand||"")+(a.model?" · "+esc(a.model):"")+'</p><p>'+ (a.warrantyUntil?"Garanti: "+stamp(a.warrantyUntil):"Garanti tarihi eklenmedi") +'</p><div class="people-row">'+pill((a.services||[]).length+" servis kaydı")+(count?pill(count+" Radar kaydı","warning"):"")+'</div>'+button("Ayrıntıları aç ↗","asset-detail","btn-light btn-small",'data-id="'+esc(a.id)+'"')+'</article>';
 }).join("");
 return header("EVİN DİJİTAL HAFIZASI","Evim ve Belgeler","Garanti, cihaz bilgisi, bakım geçmişi ve belgeler bir arada.",button("＋ Eşya ekle","new-asset"))+
 '<div class="notice">🔒 Özel eşya kayıtları yalnızca sahibine görünür. Hesabınla giriş yapınca belge yükleyebilirsin.</div>'+
 (cards?'<div class="asset-grid">'+cards+'</div>':empty("⌂","Henüz eşya eklenmedi","İlk ev eşyası, telefon, kombi veya araç kaydını oluştur."));
}
async function viewAssetDocuments(id){
 const holder=document.getElementById("asset-doc-list");
 if(!holder)return;
 if(!window.HabitopiaCloud?.active){holder.innerHTML='<p class="muted">Gerçek belge yüklemek için bulut hesabınla giriş yap.</p>';return;}
 try{
  const documents=await window.HabitopiaCloud.listDocuments(id);
  const target=document.getElementById("asset-doc-list");if(!target)return;
  target.innerHTML=documents.length?documents.map(d=>'<div class="list-row"><span class="item-info">'+esc(d.display_name)+'</span>'+button("Belgeyi aç","asset-doc-open","btn-light btn-small",'data-path="'+esc(d.path)+'"')+'</div>').join(""):'<p class="muted">Henüz belge yüklenmedi.</p>';
 }catch(e){holder.textContent="Belgeler yüklenemedi: "+e.message;}
}
function showAsset(id){
 const a=(state.assets||[]).find(x=>x.id===id);if(!a)return;
 const details=[["Kategori",a.category||"Ev eşyası"],["Marka",a.brand||"—"],["Model",a.model||"—"],["Seri / ürün kodu",a.serial||"—"],["Satın alma",a.purchasedAt?stamp(a.purchasedAt):"—"],["Garanti bitişi",a.warrantyUntil?stamp(a.warrantyUntil):"—"]]
  .map(([l,v])=>'<div class="detail-line"><span>'+esc(l)+'</span><strong>'+esc(v)+'</strong></div>').join("");
 const services=(a.services||[]).map(s=>'<div class="list-row"><span class="stat-icon">✧</span><div class="item-info"><span class="item-title">'+esc(s.title||"Servis")+'</span><span class="item-sub">'+stamp(s.date)+' · '+esc(s.notes||"")+'</span></div></div>').join("");
 $("#modal").innerHTML='<button type="button" class="modal-close" data-action="close-modal" aria-label="Kapat">×</button><h2 id="modal-title">'+esc(a.title)+'</h2><p class="modal-intro">Evin dijital hafızası · '+esc(a.category||"")+'</p><div class="asset-detail">'+details+'</div>'+(a.notes?'<p class="notice">'+esc(a.notes)+'</p>':"")+
 '<div class="section-title section-gap"><h2>Servis geçmişi</h2>'+button("＋ Servis ekle","asset-service","btn-light btn-small",'data-id="'+esc(a.id)+'"')+'</div>'+(services||empty("✧","Servis kaydı yok","Bakım ya da tamirat sonrası kayıt ekleyebilirsin."))+
 '<div class="section-title section-gap"><h2>Belgeler ve faturalar</h2></div><div id="asset-doc-list" class="list"><p class="muted">Belgeler kontrol ediliyor…</p></div>'+
 (window.HabitopiaCloud?.active?'<label class="field"><span>PDF veya fotoğraf yükle (en fazla 5 MB)</span><input class="doc-input" type="file" id="asset-doc-upload" data-id="'+esc(a.id)+'" accept="application/pdf,image/png,image/jpeg,image/webp"></label>':"")+
 '<div class="form-actions">'+button("Eşyayı sil","delete-asset","btn-danger",'data-id="'+esc(a.id)+'"')+button("Kapat","close-modal","btn-muted")+'</div>';
 $("#overlay").hidden=false;document.body.style.overflow="hidden";viewAssetDocuments(id);
}

function renderFamily(){
 return header("AİLENİN ORTAK ALANI","Aile Üyeleri","Herkes kendi hesabıyla katılır; birbirinizin görevlerini ve ortak planları görebilirsiniz.",button("Aile davet kodu","show-invite"))+
 '<div class="two-col"><section class="panel"><div class="panel-heading"><h3>'+esc(state.familyName)+'</h3>'+pill(state.members.length+" kişi")+'</div>'+state.members.map(m=>'<div class="family-member"><div class="member-avatar">'+esc(m.name[0]?.toLocaleUpperCase("tr-TR")||"?")+'</div><div class="member-info"><strong>'+esc(m.name)+'</strong><small>'+(m.id===current()?"Senin hesabın":"Aile üyesi")+'</small></div>'+(m.id===current()?pill("Sen"):"")+'</div>').join("")+'</section><div class="info-rail"><div class="rail-card"><h3>Birlikte kullanın</h3><p>Yeni aile üyeleri kendi e-posta adresleriyle kayıt olup davet koduyla katılabilir. Görev listesi gönderdiğinde atanmış kişinin ekranında görünür.</p>'+button("Davet kodunu göster ↗","show-invite","btn-light btn-small")+'</div><div class="rail-card"><h3>Kişisel alanın gizliliği</h3><p>Özel işaretlenen kayıtlar ve sağlık hatırlatmaları diğer aile üyelerinin hesaplarında görünmez. Ortak kayıtları yalnızca bu ailenin üyeleri görebilir.</p></div></div></div>';
}
function renderSettings(){
 return header("KONTROL SENDE","Ayarlar ve Veriler","Bildirimlerini, aile hesabını ve kişisel verilerini yönet.")+
 '<div class="settings-stack"><div class="settings-block"><h3>Aile bilgilerim</h3><p>Aile alanı: <strong>'+esc(state.familyName)+'</strong></p>'+button("Aile adını değiştir","rename-family","btn-muted")+' '+button("Hesabım ve davetler","show-invite","btn-light")+'</div>'+
 '<div class="settings-block push-settings"><div class="push-settings-header"><span class="push-settings-glyph">♧</span><div><span class="eyebrow">TELEFON BİLDİRİMLERİ</span><h3>Önemli işleri kaçırma</h3><p>Aile görevleri ve Radar hatırlatmalarını bildirim izni verdiğin cihazda al.</p></div></div>'+
 '<div class="push-steps"><div><strong>1</strong><span>Uygulamayı telefonunun Ana Ekranı’na ekle (iPhone için gereklidir).</span></div><div><strong>2</strong><span>Aşağıdaki butondan bildirim izni ver.</span></div><div><strong>3</strong><span>Görev veya Radar kaydına hatırlatma tarihi ve saati belirle.</span></div></div>'+
 '<div class="push-status" id="push-status" role="status" aria-live="polite">Bu cihazdaki bildirim durumu kontrol ediliyor…</div>'+
 '<div class="settings-actions push-actions"><button type="button" class="btn btn-primary" id="push-enable" data-action="push-enable">Telefon bildirimlerini aç</button>'+
 button("Bu cihazda kapat","push-disable","btn-muted")+button("Bildirim merkezini aç","show-notifications","btn-light")+'</div>'+
 '<p class="archive-note">iPhone: iOS 16.4 veya üstünde Ana Ekran’a eklediğin uygulamada açılabilir. Bildirimler telefonun internet bağlantısına ve bildirim ayarlarına bağlıdır. Sunucu gönderimi etkinleştirilmeden arka plan push gönderimi başlamaz.</p></div>'+
 '<div class="settings-block"><h3>Verilerim ve yedek</h3><p>Aile bilgileriniz Supabase üzerinde aile üyeliğine göre korunur ve hesaplar arasında eşzamanlanır. Önceki yerel Habitopia kayıtları otomatik taşınmaz.</p><div class="settings-actions">'+button("Bilgilerimi indir","export","btn-muted")+'</div></div></div>';
}
function updateHeader(){
 $("#topbar-heading").textContent=pageTitle[page];
 $("#topbar-eyebrow").textContent=state.familyName.toLocaleUpperCase("tr-TR").slice(0,30);
 $("#sidebar-family").textContent=state.familyName;
 $("#current-initial").textContent=currentName().slice(0,1).toLocaleUpperCase("tr-TR");
 $("#today-small").textContent=now().toLocaleDateString("tr-TR",{day:"numeric",month:"long"});
 $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $$(".mobile-bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 const unread=unreadNotifications().length;
 const badge=$("#notification-count");
 if(badge){badge.textContent=unread>99?"99+":String(unread);badge.hidden=unread===0;}
 const dot=$("#notification-dot");
 if(dot)dot.hidden=unread===0;
 const bell=$("#notification-open");
 if(bell){bell.setAttribute("aria-label",unread?unread+" okunmamış hatırlatma, bildirimleri aç":"Bildirimleri aç");bell.classList.toggle("has-notifications",unread>0);}
 window.HabitopiaPush?.setBadge?.(unread);
}
function render(){
 updateHeader();
 const views={home:renderHome,tasks:renderTasks,shopping:renderShopping,radar:renderRadar,calendar:renderCalendar,assets:renderAssets,family:renderFamily,settings:renderSettings};
 $("#page-content").innerHTML=(views[page]||renderHome)();
 document.title=pageTitle[page]+" — Habitopia Aile";
 if(page==="settings")window.HabitopiaPush?.refresh?.();
}
function navigate(next){
 if(!pageTitle[next])return;page=next;closeMenu();render();window.scrollTo({top:0,behavior:"instant"});try{history.replaceState({},"","#"+next)}catch{}
}
function closeMenu(){
 const sidebar=$("#sidebar"),shade=$("#mobile-shade"),toggle=$("#menu-toggle");
 sidebar.classList.remove("open");
 shade.hidden=true;
 toggle.setAttribute("aria-expanded","false");
 document.documentElement?.classList?.remove("menu-visible");
}
function toggleMenu(){
 const sidebar=$("#sidebar"),shade=$("#mobile-shade"),toggle=$("#menu-toggle");
 const open=!sidebar.classList.contains("open");
 sidebar.classList.toggle("open",open);
 shade.hidden=!open;
 toggle.setAttribute("aria-expanded",String(open));
 document.documentElement?.classList?.toggle("menu-visible",open);
 if(open){sidebar.scrollTop=0;}
}
function openModal(title,description,body,kind){
 closeMenu();
 const overlay=$("#overlay"),modal=$("#modal");
 const isTask=kind==="new-task";
 overlay.classList.toggle("form-fullscreen",isTask);
 overlay.classList.remove("is-notification-screen");
 modal.classList.toggle("modal-create-task",isTask);
 const actionLabel=isTask?"Görev listesini oluştur ✓":"Kaydet ve tamamla ✓";
 modal.innerHTML='<div class="form-screen-top"><button type="button" class="form-back-button" data-action="close-modal" aria-label="Geri dön">←</button><span class="form-logo"><img src="./assets/habitopia-logo-transparent.png" width="32" height="30" alt=""> <strong>habitopia <small>AİLE</small></strong></span><span class="form-top-spacer" aria-hidden="true"></span></div>'+
 '<div class="modal-header"><span class="modal-section-eyebrow">AİLENLE BİRLİKTE PLANLA</span><h2 id="modal-title">'+esc(title)+'</h2><p class="modal-intro">'+esc(description)+'</p></div>'+
 '<form data-form="'+kind+'"><div class="form-screen-fields">'+body+'</div><div class="form-actions"><button type="button" class="btn btn-muted" data-action="close-modal">Vazgeç</button><button type="submit" class="btn btn-primary">'+actionLabel+'</button></div></form>';
 overlay.hidden=false;
 document.body.style.overflow="hidden";
 modal.querySelector("input,textarea,select")?.focus({preventScroll:true});
}
function closeModal(){
 const overlay=$("#overlay");
 overlay.hidden=true;
 overlay.classList.remove("form-fullscreen","is-notification-screen");
 $("#modal").classList.remove("modal-create-task");
 $("#modal").innerHTML="";
 document.body.style.overflow="";
}
const field=(label,name,type="text",attrs="",value="",extra="")=>'<label class="field"><span>'+esc(label)+'</span><input name="'+name+'" type="'+type+'" '+attrs+' value="'+esc(value)+'">'+extra+'</label>';
const selectField=(label,name,options,selected)=>'<label class="field"><span>'+esc(label)+'</span><select name="'+name+'">'+options.map(([value,text])=>'<option value="'+esc(value)+'" '+(selected===value?"selected":"")+'>'+esc(text)+'</option>').join("")+'</select></label>';
const memberField=(label,name,selected=current())=>selectField(label,name,state.members.map(m=>[m.id,m.name]),selected);
const linkedEventField=()=>state.events.length?selectField("Bağlı aile etkinliği (isteğe bağlı)","linkedEventId",[["","Bağımsız iş"],...state.events.filter(shareable).map(x=>[x.id,x.title])],""):"";
let targetAssetId=null;
const textareaField=(label,name,placeholder)=>'<label class="field"><span>'+esc(label)+'</span><textarea name="'+name+'" placeholder="'+esc(placeholder)+'" maxlength="3000" required></textarea></label>';
function openForm(name){
 const rem=field("Bildirim tarihi ve saati","reminderAt","datetime-local")+'<span class="field-help">Boş bırakırsan bildirim ayarlanmaz.</span>';
 switch(name){
 case "new-asset":openModal("Evin dijital hafızasına ekle","Eşyanın garanti, satın alma ve bakım bilgilerini sakla.",'<div class="form-grid">'+field("Eşya adı","title","text",'required maxlength="150" placeholder="Örn. Çamaşır makinesi"')+selectField("Kategori","category",[["Ev eşyası","Ev eşyası"],["Elektronik","Elektronik"],["Araç","Araç"],["Diğer","Diğer"]],"Ev eşyası")+field("Marka","brand","text",'maxlength="70"')+field("Model","model","text",'maxlength="70"')+field("Seri / ürün kodu","serial","text",'maxlength="100"')+field("Satın alma tarihi","purchasedAt","date")+field("Garanti bitişi","warrantyUntil","date")+field("Garanti bildirim tarihi ve saati","reminderAt","datetime-local")+memberField("Garanti hatırlatma sorumlusu","assignee")+'<label class="field span-two"><span>Not</span><textarea name="notes" maxlength="500"></textarea></label><label class="form-check span-two"><input type="checkbox" name="private"> Bu eşya yalnızca bana özel olsun</label></div>',name);break;
 case "asset-service":openModal("Servis ve bakım kaydı","Yapılan işlemi ve tarihi eşya geçmişine ekle.",'<div class="form-grid">'+field("Yapılan işlem","title","text",'required maxlength="100" placeholder="Örn. Yetkili servis bakımı"')+field("Tarih","date","date","required",localDay())+'<label class="field span-two"><span>Not</span><textarea name="notes" maxlength="300"></textarea></label></div>',name);break;
 case "new-task":openModal("Yeni aile görev listesi","Bir veya daha fazla görevi yaz, sorumlu kişiyi ve bildirim saatini seç.",'<div class="form-grid">'+field("Liste adı","listTitle","text",'required maxlength="90" placeholder="Örn. Akşam işleri"')+' '+memberField("Kime atanacak?","assignee")+'<div class="span-two">'+textareaField("Görevler (her satıra bir görev)","items","Çamaşırları topla\nOdayı düzenle\nÇöpü çıkar")+'</div>'+field("Tamamlanma tarihi","dueAt","datetime-local",'required',futureInput(1,20))+' '+field("Hatırlatma zamanı","reminderAt","datetime-local")+linkedEventField()+'</div>',name);break;
 case "new-shop":openModal("Alışveriş listesine ekle","Miktarı ve tahmini birim fiyatını yaz.",'<div class="form-grid">'+field("Ürün adı","title","text",'required maxlength="100" placeholder="Örn. Süt"')+' '+field("Miktar","qty","number",'required min="0.01" max="100000" step="0.01"',"1")+selectField("Birim","unit",[["adet","Adet"],["paket","Paket"],["kg","Kilogram"],["lt","Litre"],["kutu","Kutu"],["gram","Gram"]],"adet")+field("Birim fiyatı (TL)","price","number",'min="0" max="100000000" step="0.01"',"0")+linkedEventField()+'</div>',name);break;
 case "set-budget":openModal("Alışveriş bütçesi","Ortak listeniz için isteğe bağlı bir hedef bütçe belirleyin.",field("Bütçe (TL)","budget","number",'min="0" max="100000000" step="0.01" required',String(state.shoppingBudget)),name);break;
 case "assign-shop":openModal("Alışveriş listesini görevlendir","Alışveriş için aile üyesi ve bildirim zamanı belirle.",'<div class="form-grid">'+memberField("Sorumlu aile üyesi","assignee",state.shoppingMeta.assignee)+field("Bildirim zamanı","reminderAt","datetime-local","",state.shoppingMeta.reminderAt||"")+'</div>',name);break;
 case "new-radar":openModal("Radar'a önemli tarih ekle","Takip türünü, sorumlu kişiyi ve tam hatırlatma saatini belirle.",'<div class="form-grid">'+selectField("Kategori","cat",Object.entries(cats).map(([id,v])=>[id,v[0]]),"bill")+field("Konu / açıklama","title","text",'required maxlength="150" placeholder="Örn. Elektrik faturası"')+memberField("Sorumlu kişi","assignee")+field("Son tarih ve saat","dueAt","datetime-local","required",futureInput(7,17))+field("Hatırlatma tarihi ve saati","reminderAt","datetime-local")+ '<label class="form-check span-two"><input type="checkbox" name="private"> Yalnızca benim görebileceğim özel bir kayıt olsun</label>'+linkedEventField()+'</div>',name);break;
 case "new-event":openModal("Aile etkinliği oluştur","Etkinlik takvimde görünür; davet edilen üyeler katılım yanıtı verebilir.",'<div class="form-grid">'+field("Etkinlik adı","title","text",'required maxlength="150" placeholder="Örn. Aile yemeği"')+field("Tarih","date","date","required",selectedDate)+field("Saat","time","time","required","18:00")+'<div class="field span-two"><span>Davet edilecek aile üyeleri</span><div class="modal-tags">'+state.members.map(m=>'<label class="modal-tag"><input type="checkbox" name="invitees" value="'+esc(m.id)+'" '+(m.id===current()?"checked":"")+'> '+esc(m.name)+'</label>').join("")+'</div></div><label class="field span-two"><span>Not (isteğe bağlı)</span><textarea name="notes" maxlength="500" placeholder="Yer, hazırlık veya küçük bir not"></textarea></label><label class="form-check span-two"><input type="checkbox" name="private"> Yalnızca bana özel etkinlik</label></div>',name);break;
 case "new-member":openModal("Aile üyesi ekle","Bu önizlemede üyeler yalnızca aynı cihazda kullanılabilir.",field("Üyenin adı","name","text",'required maxlength="40" placeholder="Örn. Anne"'),name);break;
 case "rename-family":openModal("Aile ismini değiştir","Aile alanınıza bir ad verin.",field("Aile adı","name","text",'required maxlength="50"',state.familyName),name);break;
 case "create-family":openModal("Kendi aileni oluştur","Örnek veriler kaldırılır; yeni kişisel aile alanın bu cihazda başlar.",'<div class="form-grid">'+field("Ailenin adı","family","text",'required maxlength="50" placeholder="Örn. Yılmaz Ailesi"')+field("Senin adın","name","text",'required maxlength="40" placeholder="Örn. Berke"')+'</div>',name);break;
 }
}
function processForm(form){
 const name=form.dataset.form,fd=new FormData(form),v=k=>safeText(fd.get(k)),datetime=k=>validDate(v(k))?v(k):null;
 if(name==="create-family"&&window.HabitopiaCloud?.user){window.HabitopiaCloud.showFamilies();closeModal();return;}
 if(name==="create-family"){if(!confirm("Örnek aile verilerinin yerine boş bir aile alanı oluşturulsun mu?"))return;state=blank(v("family"),v("name"));taskFilter="mine";save();closeModal();navigate("home");toast("Aile alanın oluşturuldu.");return;}
 if(name==="new-asset"){
  if(!v("title"))return;
  const assetId=uid(),privateTo=fd.has("private")?current():null;
  if(privateTo&&v("assignee")!==current()&&datetime("reminderAt")){toast("Özel eşya hatırlatmasını yalnızca kendine gönderebilirsin.");return;}
  const asset={id:assetId,title:v("title"),category:v("category"),brand:v("brand"),model:v("model"),serial:v("serial"),
    purchasedAt:v("purchasedAt"),warrantyUntil:v("warrantyUntil"),notes:v("notes"),services:[],creator:current(),privateTo};
  (state.assets??=[]).push(asset);
  const reminderAt=datetime("reminderAt"),warrantyUntil=v("warrantyUntil");
  if(warrantyUntil){
   const dueAt=warrantyUntil+"T18:00";
   if(reminderAt&&new Date(reminderAt)>new Date(dueAt)){state.assets.pop();toast("Hatırlatma garanti bitişinden sonra olamaz.");return;}
   state.radar.push({id:uid(),title:asset.title+" garanti bitişi",cat:"warranty",assignee:privateTo?current():v("assignee"),
     creator:current(),dueAt,reminderAt,doneAt:null,privateTo,linkedAssetId:assetId});
  }
  save();closeModal();navigate("assets");toast("Eşya kaydı eklendi.");return;
 }
 if(name==="asset-service"){
  const asset=(state.assets||[]).find(a=>a.id===targetAssetId);
  if(!asset){toast("Eşya bulunamadı.");return;}
  if(window.HabitopiaCloud?.active&&asset.creator!==current()){toast("Servis kaydını yalnızca eşya sahibi ekleyebilir.");return;}
  (asset.services??=[]).push({id:uid(),title:v("title"),date:v("date")||localDay(),notes:v("notes")});
  save();closeModal();showAsset(asset.id);toast("Servis geçmişi güncellendi.");return;
 }
 if(name==="new-task"){
  const rows=v("items").split(/\r?\n/).map(x=>safeText(x,140)).filter(Boolean).slice(0,40);
  if(!rows.length){toast("En az bir görev yaz.");return;}
  const listId=uid(),dueAt=datetime("dueAt"),reminderAt=datetime("reminderAt");
  if(reminderAt&&dueAt&&new Date(reminderAt)>new Date(dueAt)){toast("Bildirim tarihi son tarihten sonra olamaz.");return;}
  const assignee=v("assignee");
  rows.forEach(title=>state.tasks.push({id:uid(),listId,listTitle:v("listTitle")||"Aile görevleri",title,assignee,creator:current(),dueAt,reminderAt,doneAt:null,linkedEventId:v("linkedEventId")||null}));
  taskFilter="all";save();closeModal();navigate("tasks");toast(rows.length+" görev eklendi.");return;
 }
 if(name==="new-shop"){if(!v("title"))return;state.shopping.push({id:uid(),title:v("title"),qty:number(v("qty"))||1,unit:v("unit")||"adet",price:number(v("price")),bought:false,creator:current(),linkedEventId:v("linkedEventId")||null});}
 if(name==="set-budget")state.shoppingBudget=number(v("budget"));
 if(name==="assign-shop")state.shoppingMeta={assignee:v("assignee"),reminderAt:datetime("reminderAt")};
 if(name==="new-radar"){
  if(!datetime("dueAt")){toast("Geçerli bir son tarih seç.");return;}
  const rem=datetime("reminderAt"),due=datetime("dueAt");if(rem&&new Date(rem)>new Date(due)){toast("Bildirim son tarihten sonra olamaz.");return;}
  if(fd.has("private")&&v("assignee")!==current()){toast("Özel Radar kaydını yalnızca kendine atayabilirsin.");return;}
  state.radar.push({id:uid(),title:v("title"),cat:cats[v("cat")]?v("cat"):"custom",assignee:v("assignee"),creator:current(),dueAt:due,reminderAt:rem,doneAt:null,privateTo:fd.has("private")?current():null,linkedEventId:v("linkedEventId")||null});
 }
 if(name==="new-event"){
  if(!validDate(v("date"))){toast("Geçerli tarih seç.");return;}
  const invitations=fd.has("private")?[current()]:fd.getAll("invitees").filter(x=>state.members.some(m=>m.id===x));
  if(!invitations.includes(current()))invitations.push(current());
  const answers={[current()]:"yes"};
  state.events.push({id:uid(),title:v("title"),date:v("date"),time:v("time")||"18:00",notes:v("notes"),creator:current(),invitees:invitations,rsvp:answers,privateTo:fd.has("private")?current():null});
  selectedDate=v("date");calendarMonth=new Date(Number(selectedDate.slice(0,4)),Number(selectedDate.slice(5,7))-1,1);
 }
 if(name==="new-member"){
  if(state.members.length>=30){toast("En fazla 30 üye eklenebilir.");return;}
  state.members.push({id:uid(),name:v("name")});
 }
 if(name==="rename-family")state.familyName=v("name");
 save();closeModal();render();toast("Kaydedildi.");
}
const noConfirm=(msg)=>confirm(msg);
function act(action,id,value,path){
 if(action==="close-modal"){closeModal();return}
 if(action==="show-invite"){window.HabitopiaCloud?.showInvite?.();return;}
 if(action==="push-enable"){window.HabitopiaPush?.enable?.();return;}
 if(action==="push-disable"){window.HabitopiaPush?.disable?.();return;}
 if(action==="go-calendar-date"){selectedDate=value;calendarMonth=new Date(Number(value.slice(0,4)),Number(value.slice(5,7))-1,1);navigate("calendar");return;}
 if(action==="go-calendar"){navigate("calendar");return;}
 if(action==="go-shopping"){navigate("shopping");return;}
 if(action==="goto-assets"){navigate("assets");return;}
 if(action==="goto-tasks"||action==="goto-radar"){navigate(action==="goto-tasks"?"tasks":"radar");return}
 if(action==="new-member"&&window.HabitopiaCloud?.active){window.HabitopiaCloud.showInvite();return;}
 if(["new-task","new-shop","set-budget","assign-shop","new-radar","new-event","new-member","rename-family","create-family","new-asset"].includes(action)){openForm(action);return}
 if(action==="asset-detail"){showAsset(id);return;}
 if(action==="asset-service"){targetAssetId=id;openForm("asset-service");return;}
 if(action==="asset-doc-open"){window.HabitopiaCloud?.openDocument?.(path).catch(e=>toast("Belge açılamadı: "+e.message));return;}
 if(action==="delete-asset"){
  const asset=(state.assets||[]).find(x=>x.id===id);if(!asset)return;
  if(window.HabitopiaCloud?.active&&asset.creator!==current()){toast("Yalnızca eşya sahibi silebilir.");return;}
  if(!confirm("Eşya kaydını silmek istiyor musun? Bağlı Radar hatırlatmaları da silinecek."))return;
  state.radar=state.radar.filter(x=>x.linkedAssetId!==id);state.assets=state.assets.filter(x=>x.id!==id);
  save();closeModal();render();toast("Eşya silindi.");return;
 }
 if(action==="task-filter"){taskFilter=value;render();return}
 if(action==="radar-filter"){radarFilter=value;render();return}
 if(action==="select-date"){selectedDate=value;render();return}
 if(action==="month-prev"||action==="month-next"){calendarMonth.setMonth(calendarMonth.getMonth()+(action==="month-next"?1:-1));calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);render();return}
 if(action==="toggle-task"){const t=state.tasks.find(x=>x.id===id);if(t&&t.assignee===current()){t.doneAt=t.doneAt?null:now().toISOString();save();render();toast(t.doneAt?"Görev tamamlandı.":"Görev yeniden açıldı.");}else toast("Bu görevi tamamlamak için ilgili üyeyi seç.");return}
 if(action==="toggle-shop"){const x=state.shopping.find(t=>t.id===id);if(x){x.bought=!x.bought;x.doneAt=x.bought?now().toISOString():null;save();render();}return}
 if(action==="toggle-radar"){const t=state.radar.find(x=>x.id===id);if(t&&shareable(t)&&t.assignee===current()){t.doneAt=t.doneAt?null:now().toISOString();save();render();toast("Radar durumu güncellendi.");}return}
 const collection={"delete-task":"tasks","delete-shop":"shopping","delete-radar":"radar","delete-event":"events"}[action];
 if(collection){const row=state[collection].find(x=>x.id===id);if(row&&window.HabitopiaCloud?.active&&row.creator!==current()){toast("Kaydı yalnızca oluşturan kişi silebilir.");return;}if(!row||!noConfirm("Bu kaydı silmek istiyor musun?"))return;state[collection]=state[collection].filter(x=>x.id!==id);save();render();toast("Kayıt silindi.");return;}
 if(action==="switch-member"&&window.HabitopiaCloud?.active){toast("Her aile üyesi kendi hesabıyla giriş yapmalıdır.");return;}
 if(action==="switch-member"){if(state.members.some(x=>x.id===id)){state.currentMember=id;save();render();toast("Şimdi "+currentName()+" görünümündesin.");}return}
 if(action==="rsvp"){const e=state.events.find(x=>x.id===id);if(e&&e.invitees.includes(current())&&["yes","no","maybe"].includes(value)){e.rsvp[current()]=value;save();render();}return}
 if(action==="export"){const blob=new Blob([JSON.stringify({format:"habitopia-family",version:VERSION,exportedAt:now().toISOString(),data:state},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="habitopia-aile-yedek-"+localDay()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast("Yedek dosyası oluşturuldu.");return}
 if(action==="reset"&&window.HabitopiaCloud?.active){toast("Buluttaki aile kaydını sıfırlama burada kapalıdır.");return;}
 if(action==="reset"){if(!noConfirm("Bu cihazdaki Habitopia Aile verilerini silmek istiyor musun? Önce yedek almanı öneririz."))return;state=sample();save();navigate("home");toast("Örnek aileye dönüldü.");return}
 if(action==="request-permission"){window.HabitopiaPush?.enable?.();return;}
 if(action==="show-notifications"){showNotifications();return}
 if(action==="mark-notification"){markNotificationRead(id);updateHeader();showNotifications();return;}
 if(action==="notification-go"){closeModal();navigate(value==="tasks"?"tasks":value==="shopping"?"shopping":"radar");if(value==="tasks"&&id){setTimeout(()=>document.getElementById("list-"+id)?.scrollIntoView({block:"center",behavior:"smooth"}),40);}return}
}
function notificationReadKey(){
 return "habitopia-aile-read:"+(window.HabitopiaCloud?.household||"local")+":"+current();
}
function notificationReadIds(){
 try{const ids=JSON.parse(localStorage.getItem(notificationReadKey())||"[]");return new Set(Array.isArray(ids)?ids:[]);}
 catch{return new Set();}
}
function unreadNotifications(){
 const read=notificationReadIds();
 return notificationsForMember().filter(n=>!read.has(n.id));
}
function markNotificationRead(id){
 if(!id)return;
 const seen=notificationReadIds();
 seen.add(id);
 try{localStorage.setItem(notificationReadKey(),JSON.stringify([...seen].slice(-300)));}catch{}
}
function notificationsForMember(){
 const out=[];const ts=Date.now();
 const byList=new Map();
 state.tasks.filter(t=>!t.doneAt&&t.assignee===current()&&t.reminderAt&&new Date(t.reminderAt).getTime()<=ts).forEach(t=>{
  if(!byList.has(t.listId))byList.set(t.listId,{id:"task:"+t.listId,group:t.listId,type:"tasks",title:memberName(t.creator)+" sana bir görev listesi hazırladı",message:t.listTitle+" · Tamamlanmayı bekleyen görevler",at:t.reminderAt});
 });
 out.push(...byList.values());
 state.radar.filter(x=>!x.doneAt&&x.assignee===current()&&shareable(x)&&x.reminderAt&&new Date(x.reminderAt).getTime()<=ts).forEach(x=>out.push({id:"radar:"+x.id,type:"radar",title:"Radar: "+x.title,message:"Son tarih: "+stampTime(x.dueAt),at:x.reminderAt}));
 if(state.shoppingMeta.assignee===current()&&state.shoppingMeta.reminderAt&&state.shopping.some(x=>!x.bought)&&new Date(state.shoppingMeta.reminderAt).getTime()<=ts)out.push({id:"shop:"+state.shoppingMeta.reminderAt,type:"shopping",title:"Aile alışveriş listesi",message:state.shopping.filter(x=>!x.bought).length+" ürün alınmayı bekliyor.",at:state.shoppingMeta.reminderAt});
 const existing=new Set(out.map(x=>x.type+":"+(x.group||x.id.replace(/^(?:task|radar):/,""))));
 (window.HabitopiaCloud?.active?window.HabitopiaCloud.notifications:[]).forEach(n=>{
  const task=state.tasks.find(x=>x.id===n.item_id),radar=state.radar.find(x=>x.id===n.item_id);
  if(!task&&!radar)return;
  const type=task?"tasks":"radar",group=task?.listId||radar?.id;
  if(existing.has(type+":"+group))return;
  out.push({id:"server:"+n.id,serverId:n.id,group,type,title:n.title,message:"Sunucu hatırlatması",at:n.due_at});
 });
 return out.sort((a,b)=>b.at.localeCompare(a.at));
}
function showNotifications(){
 closeMenu();
 const notices=unreadNotifications();
 const noticeIcon='<svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
 const content=(notices.length?notices.map((n,i)=>
 '<article class="notification-entry"><span class="notification-entry-icon">'+noticeIcon+'</span><div class="notification-entry-content"><div class="notification-entry-top"><span class="notification-type">'+(n.type==="tasks"?"Aile görevi":n.type==="shopping"?"Alışveriş":"Aile Radarı")+'</span><time>'+stampTime(n.at)+'</time></div><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+'</p><div class="notification-entry-actions"><button type="button" class="btn btn-light btn-small" data-action="notification-go" data-id="'+esc(n.group||"")+'" data-value="'+esc(n.type)+'" data-notice-id="'+esc(n.id)+'" data-server-id="'+esc(n.serverId||"")+'">Ayrıntıları gör ↗</button>'+
 '<button type="button" class="btn btn-muted btn-small" data-action="mark-notification" data-id="'+esc(n.id)+'" data-server-id="'+esc(n.serverId||"")+'">Okundu</button>'+'</div></div></article>'
 ).join(""):'<div class="notifications-empty"><div class="notifications-empty-icon">'+noticeIcon+'</div><h3>Her şey yolunda!</h3><p>Henüz okunmamış bir hatırlatman yok. Yeni görevler ve önemli tarihler burada görünecek.</p></div>');
 const modal=$("#modal"),overlay=$("#overlay");
 overlay.classList.remove("form-fullscreen");
 overlay.classList.add("is-notification-screen");
 modal.classList.remove("modal-create-task");
 modal.innerHTML='<div class="notification-screen-head"><button type="button" class="form-back-button" data-action="close-modal" aria-label="Bildirimlerden geri dön">←</button><div><span class="modal-section-eyebrow">HABITOPIA AİLE</span><h2 id="modal-title">Bildirimler <span class="notifications-heading-count">'+notices.length+'</span></h2><p>Görevler, alışveriş ve hatırlatmalar tek yerde.</p></div><span class="notification-screen-logo"><img src="./assets/habitopia-logo-transparent.png" width="37" height="35" alt=""></span></div><div class="notification-screen-content"><div class="notification-info">Bildirim saatini sen belirlersin. Uygulama kapalıyken telefonuna push bildirim gönderimi henüz aktif değildir.</div>'+content+'</div>';
 overlay.hidden=false;
 document.body.style.overflow="hidden";
}
function poll(){
 const notices=notificationsForMember();
 $("#notification-dot").hidden=!notices.length;
 if(!("Notification" in window)||Notification.permission!=="granted"||document.hidden||window.HabitopiaPush?.subscribed)return;
 let changed=false;
 notices.forEach(n=>{
  if(state.notified.includes(n.id))return;
  try{
   const alert=new Notification(n.title,{body:n.message,tag:n.id,icon:"./assets/habitopia-logo-transparent.png"});
   alert.onclick=()=>{window.focus();navigate(n.type);alert.close();};
   state.notified.push(n.id);changed=true;
  }catch(e){console.warn("Bildirim gösterilemedi",e);}
 });
 if(changed){state.notified=state.notified.slice(-1200);
   if(window.HabitopiaCloud?.active){try{localStorage.setItem("habitopia-family-notified-"+current(),JSON.stringify(state.notified))}catch{}}
   else save();
  }
}
document.addEventListener("click",e=>{
 const pageButton=e.target.closest("[data-page]");
 if(pageButton){e.preventDefault();navigate(pageButton.dataset.page);return;}
 const actionButton=e.target.closest("[data-action]");
 if(actionButton){if(["mark-notification","notification-go"].includes(actionButton.dataset.action)){markNotificationRead(actionButton.dataset.noticeId||actionButton.dataset.id);if(actionButton.dataset.serverId){window.HabitopiaCloud?.acknowledge?.(actionButton.dataset.serverId).catch(err=>toast("Bildirim güncellenemedi: "+err.message));}}act(actionButton.dataset.action,actionButton.dataset.id,actionButton.dataset.value,actionButton.dataset.path);return;}
});
document.addEventListener("submit",e=>{
 const form=e.target.closest("form[data-form]");if(!form)return;e.preventDefault();processForm(form);
});
document.addEventListener("change",async e=>{
 if(e.target.name==="cat"&&e.target.closest('form[data-form="new-radar"]')){const privacy=e.target.closest("form").querySelector('[name="private"]');if(privacy&&e.target.value==="health")privacy.checked=true;return;}
 if(e.target.id==="asset-doc-upload"){
  const file=e.target.files?.[0],assetId=e.target.dataset.id;e.target.value="";
  if(!file)return;
  try{
   await window.HabitopiaCloud.uploadDocument(assetId,file,"private");
   toast("Belge güvenli alana yüklendi.");await viewAssetDocuments(assetId);
  }catch(err){toast("Belge yüklenemedi: "+err.message);}
  return;
 }
 if(e.target.id==="import-file"&&window.HabitopiaCloud?.active){toast("Bulut oturumundayken yerel yedek yükleme kapalıdır.");e.target.value="";return;}
 if(e.target.id!=="import-file")return;const file=e.target.files?.[0];e.target.value="";if(!file)return;
 if(file.size>1024*1024){toast("Yedek boyutu 1 MB'ı geçemez.");return;}
 try{const raw=JSON.parse(await file.text());if(raw.format!=="habitopia-family"||raw.version!==VERSION)throw Error("Habitopia Aile yedeği değil.");
  const candidate=normalize(raw.data);
  if(!confirm("Bu cihazdaki Habitopia Aile verileri yedekteki verilerle değiştirilsin mi?"))return;
  const old=state;state=candidate;try{localStorage.setItem(KEY,JSON.stringify(state));storageHealthy=true;}catch(e){state=old;throw Error("Yedek kaydedilemedi.");}
  navigate("home");toast("Yedek başarıyla yüklendi.");
 }catch(err){toast("Yedek yüklenemedi: "+(err?.message||"Geçersiz dosya"));}
});
$("#overlay").addEventListener("click",e=>{if(e.target===$("#overlay"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("#overlay").hidden?closeMenu():closeModal()}});
$("#menu-toggle").addEventListener("click",toggleMenu);
$("#mobile-shade").addEventListener("click",closeMenu);
$("#notification-open").addEventListener("click",showNotifications);
$("#user-switch").addEventListener("click",()=>{
 if(window.HabitopiaCloud?.active){window.HabitopiaCloud.showAuth();return;}
 const content='<div class="list">'+state.members.map(m=>'<button type="button" class="list-row" style="width:100%;text-align:left;cursor:pointer" data-action="switch-member-and-close" data-id="'+esc(m.id)+'"><span class="member-avatar">'+esc(m.name[0])+'</span><div class="item-info"><span class="item-title">'+esc(m.name)+'</span><span class="item-sub">'+(m.id===current()?"Şu anda seçili":"Bu cihazda bu üyenin görünümüne geç")+'</span></div></button>').join("")+'</div><p class="archive-note">Üyeler arasında geçiş bir yerel önizlemedir. Gerçek hesap veya farklı telefon bağlantısı değildir.</p>';
 $("#modal").innerHTML='<button type="button" class="modal-close" data-action="close-modal" aria-label="Kapat">×</button><h2 id="modal-title">Aile üyesi seç</h2><p class="modal-intro">Aile görünümünü değiştir</p>'+content;
 $("#overlay").hidden=false;document.body.style.overflow="hidden";
});
$("#modal").addEventListener("click",e=>{const el=e.target.closest('[data-action="switch-member-and-close"]');if(el){act("switch-member",el.dataset.id);closeModal();}});
window.addEventListener("hashchange",()=>{const p=location.hash.slice(1);if(pageTitle[p])navigate(p)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){poll();render()}});
const initial=location.hash.slice(1);if(pageTitle[initial])page=initial;

render();
 window.HabitopiaCloud?.init({
  getState:()=>state,
  setState:s=>{
   try{s.notified=JSON.parse(localStorage.getItem("habitopia-family-notified-"+s.currentMember)||"[]");}
   catch{s.notified=[];}
   state=s;render();
  },
  reset:()=>{state=blank("","");render();}
 });
 window.addEventListener("habitopia-cloud-error",e=>toast("Bulut kaydı başarısız: "+e.detail));
 let notificationsRequested=new URLSearchParams(location.search).get("open")==="notifications";
 const openRequested=()=>{
  if(!window.HabitopiaCloud?.active)return;
  if(notificationsRequested){
    notificationsRequested=false;
    try{history.replaceState({},document.title,location.pathname+location.hash);}catch{}
    showNotifications();
  }
 };
 window.addEventListener("habitopia-family-ready",openRequested);
 window.addEventListener("habitopia-open-notifications",()=>{if(window.HabitopiaCloud?.active)showNotifications();else notificationsRequested=true;});
 if(window.HabitopiaCloud?.active)openRequested();
 setInterval(poll,30000);poll();
})();
