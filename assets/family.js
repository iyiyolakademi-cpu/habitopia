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
const sample=()=>{
 const m=[{id:"me",name:"Sen"},{id:"mom",name:"Anne"},{id:"dad",name:"Baba"}];
 const list=uid();
 return {version:VERSION,demo:true,familyName:"Örnek Aile",members:m,currentMember:"me",shoppingBudget:1200,shoppingMeta:{assignee:"dad",reminderAt:futureInput(0,20)},tasks:[
 {id:uid(),listId:list,listTitle:"Akşam yapılacaklar",title:"Çamaşırları topla",assignee:"me",creator:"mom",dueAt:futureInput(1,20),reminderAt:futureInput(0,20),doneAt:null},
 {id:uid(),listId:list,listTitle:"Akşam yapılacaklar",title:"Odanı düzenle",assignee:"me",creator:"mom",dueAt:futureInput(1,20),reminderAt:futureInput(0,20),doneAt:null},
 {id:uid(),listId:uid(),listTitle:"Ev işleri",title:"Bulaşık makinesini boşalt",assignee:"dad",creator:"mom",dueAt:futureInput(1,19),reminderAt:null,doneAt:null}],
 shopping:[{id:uid(),title:"Süt",qty:2,unit:"adet",price:40,bought:false},{id:uid(),title:"Yumurta",qty:1,unit:"paket",price:95,bought:false},{id:uid(),title:"Ekmek",qty:2,unit:"adet",price:18,bought:true}],
 radar:[{id:uid(),title:"İnternet taahhüdü",cat:"subscription",dueAt:futureInput(11,12),reminderAt:futureInput(7,10),assignee:"dad",creator:"mom",doneAt:null,privateTo:null},{id:uid(),title:"Araç muayenesi",cat:"vehicle",dueAt:futureInput(7,15),reminderAt:futureInput(3,9),assignee:"dad",creator:"dad",doneAt:null,privateTo:null}],
 events:[{id:uid(),title:"Aile kahvaltısı",date:offsetDay(3),time:"10:00",notes:"Birlikte güzel bir kahvaltı",creator:"mom",invitees:["me","mom","dad"],rsvp:{mom:"yes"},privateTo:null}],notified:[]};
};
const blank=(familyName,person)=>({version:VERSION,demo:false,familyName:safeText(familyName,50)||"Ailem",members:[{id:"me",name:safeText(person,40)||"Ben"}],currentMember:"me",shoppingBudget:0,shoppingMeta:{assignee:"me",reminderAt:null},tasks:[],shopping:[],radar:[],events:[],notified:[]});
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
 s.notified=Array.isArray(input.notified)?input.notified.filter(x=>typeof x==="string").slice(-1200):[];
 return s;
}
let state,storageHealthy=true;
try{const data=localStorage.getItem(KEY);state=data?normalize(JSON.parse(data)):sample();}
catch(e){console.error("Habitopia veri okuma",e);state=sample();storageHealthy=false;}
function save(){
 if(!storageHealthy)return;
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch(e){storageHealthy=false;console.error(e);toast("Depolama kullanılamıyor; değişiklikler korunamayabilir.");}
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
const pageTitle={home:"Genel Bakış",tasks:"Aile Görevleri",shopping:"Alışveriş",radar:"Aile Radarı",calendar:"Aile Takvimi",family:"Ailem",settings:"Ayarlar"};
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
 const tasks=state.tasks.filter(t=>!t.doneAt&&targetTask(t)).sort((a,b)=>(a.dueAt||"z").localeCompare(b.dueAt||"z")).slice(0,3);
 const rs=state.radar.filter(x=>!x.doneAt&&shareable(x)).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).slice(0,3);
 const greeting=now().getHours()<11?"Günaydın":now().getHours()<18?"İyi günler":"İyi akşamlar";
 const upcoming=dueCount(),pending=activeTaskCount();
 return '<div class="hero"><div class="hero-copy"><span class="eyebrow">HEP BİRLİKTE, TEK YERDE</span><h1>'+greeting+',<br>'+esc(currentName())+'.</h1><p>'+esc(state.familyName)+' için planlar, görevler ve önemli tarihler artık bir arada.</p><div class="hero-footer"><span>✦ '+pending+' bekleyen görev</span><span>◉ '+upcoming+' yaklaşan Radar kaydı</span></div></div><div class="hero-art" aria-hidden="true"><svg viewBox="0 0 140 140" fill="none"><path d="M28 63 70 28l42 35v51H28V63Z" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M56 115V79h28v36" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="m19 69 51-44 51 44" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></div></div>'+
 '<div class="stats-row"><div class="stat-card"><div class="stat-icon">☑</div><div><strong>'+pending+'</strong><span>Bekleyen görev</span></div></div><div class="stat-card"><div class="stat-icon warm">▤</div><div><strong>'+state.shopping.filter(x=>!x.bought).length+'</strong><span>Alışveriş ürünü</span></div></div><div class="stat-card"><div class="stat-icon cool">◉</div><div><strong>'+upcoming+'</strong><span>Yaklaşan iş</span></div></div></div>'+
 '<div class="section-title"><h2>Ailenin yaşam alanı</h2><span class="subtle">İhtiyacın olan her şey burada</span></div>'+
 '<div class="feature-grid"><button class="feature-tile" data-page="tasks"><span class="feature-arrow">↗</span><span class="feature-glyph">☑</span><strong>Aile Görevleri</strong><small>Görev gönder, takip et</small></button><button class="feature-tile" data-page="shopping"><span class="feature-arrow">↗</span><span class="feature-glyph">▤</span><strong>Alışveriş</strong><small>Ortak liste ve bütçe</small></button><button class="feature-tile" data-page="radar"><span class="feature-arrow">↗</span><span class="feature-glyph">◉</span><strong>Aile Radarı</strong><small>Önemli tarihleri unutma</small></button><button class="feature-tile" data-page="calendar"><span class="feature-arrow">↗</span><span class="feature-glyph">▦</span><strong>Aile Takvimi</strong><small>Birlikte planlayın</small></button></div>'+
 '<div class="panel-grid"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">SANA ATANANLAR</p><h3>Bekleyen görevler</h3></div>'+button("Tümünü gör ↗","goto-tasks","btn-muted btn-small")+'</div><div class="list">'+(tasks.length?tasks.map(taskRow).join(""):empty("✓","Şimdilik görev yok","Yeni liste hazırlayabilir veya aileden görev alabilirsin."))+'</div></section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">HABITOPIA RADAR</p><h3>Yaklaşan tarihler</h3></div>'+button("Radara git ↗","goto-radar","btn-muted btn-small")+'</div><div class="list">'+(rs.length?rs.map(x=>'<div class="list-row"><span class="stat-icon" style="width:33px;height:33px;border-radius:10px;font-size:17px">'+esc(cats[x.cat][1])+'</span><div class="item-info"><strong class="item-title">'+esc(x.title)+'</strong><span class="item-sub">'+stampTime(x.dueAt)+' · '+esc(memberName(x.assignee))+'</span></div></div>').join(""):empty("◉","Radar sakin","Yaklaşan önemli bir kayıt bulunmuyor."))+'</div></section></div>';
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
 return '<article class="event-card"><div class="event-top"><span class="eyebrow">'+esc(stamp(e.date))+' · '+esc(e.time)+'</span>'+pill(e.privateTo?"Özel":"Aile etkinliği",e.privateTo?"purple":"")+'</div><h3>'+esc(e.title)+'</h3><p>'+esc(e.notes||"")+ (e.notes?" · ":"")+'Oluşturan: '+esc(memberName(e.creator))+'</p><p style="margin-top:8px">Davetliler: '+esc(e.invitees.map(memberName).join(", ")||"Yok")+'</p>'+(myInvite?'<div class="rsvp-actions"><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="yes" class="'+(status==="yes"?"active":"")+'">✓ Katılacağım</button><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="maybe" class="'+(status==="maybe"?"active":"")+'">? Belki</button><button data-action="rsvp" data-id="'+esc(e.id)+'" data-value="no" class="'+(status==="no"?"active":"")+'">× Katılamam</button></div>':"")+'<div class="compact-detail"><small class="muted">Yanıtlar: '+esc(e.invitees.map(id=>memberName(id)+": "+({yes:"Katılıyor",no:"Katılamıyor",maybe:"Belki",pending:"Bekliyor"}[e.rsvp[id]||"pending"])).join(" · "))+'</small>'+deleteButton("delete-event",e.id)+'</div></article>';
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
function renderFamily(){
 return header("BİRLİKTE BİR AİLE","Aile Üyeleri","Üyeleri yönet, bu cihazda farklı aile üyelerinin görünümünü dene.",button("＋ Üye ekle","new-member"))+
 '<div class="two-col"><section class="panel"><div class="panel-heading"><h3>'+esc(state.familyName)+'</h3>'+pill(state.members.length+" üye")+'</div>'+state.members.map(m=>'<div class="family-member"><div class="member-avatar">'+esc(m.name[0]?.toUpperCase()||"?")+'</div><div class="member-info"><strong>'+esc(m.name)+'</strong><small>'+(m.id===current()?"Bu cihazda seçili kişi":"Aile üyesi")+'</small></div>'+(m.id!==current()?button("Bu üyeye geç","switch-member","btn-light btn-small",'data-id="'+esc(m.id)+'"'):pill("Aktif"))+'</div>').join("")+'</section><div class="info-rail"><div class="rail-card"><h3>Üyeler arası görev akışı</h3><p>Örneğin Anne rolündeyken oğluna liste hazırlayabilir, sonra bu cihazda oğul rolüne geçerek listeyi görebilirsin. Gerçek telefonlar arasında hesap bağlantısı henüz aktif değildir.</p></div><div class="rail-card"><h3>Gizlilik</h3><p>Sağlık bilgileri ve kişisel etkinlikler varsayılan olarak yalnızca oluşturan kişiye gösterilebilir. Bu sürüm tek cihazlı olduğu için şifreli çoklu hesap güvenliği sağlamaz.</p></div></div></div>';
}
function renderSettings(){
 return header("KONTROL SENDE","Ayarlar ve Veriler","Aile ismini, bildirim iznini ve cihazda kayıtlı bilgilerini yönet.")+
 '<div class="settings-stack"><div class="settings-block"><h3>Aile bilgilerim</h3><p>Bu aile alanının adı: <strong>'+esc(state.familyName)+'</strong></p>'+button("Aile adını değiştir","rename-family","btn-muted")+'</div><div class="settings-block"><h3>Bildirimler</h3><p>Belirlediğin saatlerde uygulama açıkken uyarı gösterebilir. Tarayıcı/telefon tamamen kapalıyken güvenilir otomatik bildirim için sunucu ve mobil bildirim altyapısı gerekir.</p><div class="settings-actions">'+button("Bildirim izni iste","request-permission","btn-light")+button("Bildirimleri gör","show-notifications","btn-muted")+'</div></div><div class="settings-block"><h3>Veriler ve yedek</h3><p>Bu önizlemede tüm bilgiler yalnızca bu cihazın tarayıcısında tutulur. Diğer aile üyelerinin telefonlarıyla otomatik eşitlenmez. Eski Habitopia kayıtları değiştirilmedi.</p><div class="settings-actions">'+button("Verilerimi indir","export","btn-muted")+'<label class="btn btn-muted" style="cursor:pointer">Yedekten yükle <input type="file" id="import-file" accept=".json,application/json" hidden></label>'+button("Yerel veriyi sıfırla","reset","btn-danger")+'</div><p class="archive-note">Yedeği yüklemeden önce mevcut verilerini indir. Gerçek aile kullanımına geçmeden hesap ve güvenli bulut senkronizasyonu tamamlanmalıdır.</p></div></div>';
}
function updateHeader(){
 $("#topbar-heading").textContent=pageTitle[page];$("#topbar-eyebrow").textContent=state.familyName.toLocaleUpperCase("tr-TR").slice(0,30);
 $("#sidebar-family").textContent=state.familyName;$("#current-initial").textContent=currentName().slice(0,1).toLocaleUpperCase("tr-TR");
 $("#today-small").textContent=now().toLocaleDateString("tr-TR",{day:"numeric",month:"long"});
 $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $("#demo-banner").hidden=!state.demo;
 $("#notification-dot").hidden=notificationsForMember().length===0;
}
function render(){
 updateHeader();
 const views={home:renderHome,tasks:renderTasks,shopping:renderShopping,radar:renderRadar,calendar:renderCalendar,family:renderFamily,settings:renderSettings};
 $("#page-content").innerHTML=(views[page]||renderHome)();
 document.title=pageTitle[page]+" — Habitopia Aile";
}
function navigate(next){
 if(!pageTitle[next])return;page=next;closeMenu();render();window.scrollTo({top:0,behavior:"instant"});try{history.replaceState({},"","#"+next)}catch{}
}
function closeMenu(){$("#sidebar").classList.remove("open");$("#mobile-shade").hidden=true;$("#menu-toggle").setAttribute("aria-expanded","false");}
function toggleMenu(){const open=!$("#sidebar").classList.contains("open");$("#sidebar").classList.toggle("open",open);$("#mobile-shade").hidden=!open;$("#menu-toggle").setAttribute("aria-expanded",String(open));}
function openModal(title,description,body,kind){
 const modal=$("#modal");modal.innerHTML='<button type="button" class="modal-close" data-action="close-modal" aria-label="Kapat">×</button><div class="modal-header"><h2 id="modal-title">'+esc(title)+'</h2><p class="modal-intro">'+esc(description)+'</p></div><form data-form="'+kind+'">'+body+'<div class="form-actions"><button type="button" class="btn btn-muted" data-action="close-modal">Vazgeç</button><button type="submit" class="btn btn-primary">Kaydet ve tamamla ↗</button></div></form>';
 $("#overlay").hidden=false;document.body.style.overflow="hidden";modal.querySelector("input,textarea,select")?.focus();
}
function closeModal(){$("#overlay").hidden=true;$("#modal").innerHTML="";document.body.style.overflow="";}
const field=(label,name,type="text",attrs="",value="",extra="")=>'<label class="field"><span>'+esc(label)+'</span><input name="'+name+'" type="'+type+'" '+attrs+' value="'+esc(value)+'">'+extra+'</label>';
const selectField=(label,name,options,selected)=>'<label class="field"><span>'+esc(label)+'</span><select name="'+name+'">'+options.map(([value,text])=>'<option value="'+esc(value)+'" '+(selected===value?"selected":"")+'>'+esc(text)+'</option>').join("")+'</select></label>';
const memberField=(label,name,selected=current())=>selectField(label,name,state.members.map(m=>[m.id,m.name]),selected);
const textareaField=(label,name,placeholder)=>'<label class="field"><span>'+esc(label)+'</span><textarea name="'+name+'" placeholder="'+esc(placeholder)+'" maxlength="3000" required></textarea></label>';
function openForm(name){
 const rem=field("Bildirim tarihi ve saati","reminderAt","datetime-local")+'<span class="field-help">Boş bırakırsan bildirim ayarlanmaz.</span>';
 switch(name){
 case "new-task":openModal("Yeni aile görev listesi","Bir veya daha fazla görevi yaz, sorumlu kişiyi ve bildirim saatini seç.",'<div class="form-grid">'+field("Liste adı","listTitle","text",'required maxlength="90" placeholder="Örn. Akşam işleri"')+' '+memberField("Kime atanacak?","assignee")+'<div class="span-two">'+textareaField("Görevler (her satıra bir görev)","items","Çamaşırları topla\nOdayı düzenle\nÇöpü çıkar")+'</div>'+field("Tamamlanma tarihi","dueAt","datetime-local",'required',futureInput(1,20))+' '+field("Hatırlatma zamanı","reminderAt","datetime-local")+'</div>',name);break;
 case "new-shop":openModal("Alışveriş listesine ekle","Miktarı ve tahmini birim fiyatını yaz.",'<div class="form-grid">'+field("Ürün adı","title","text",'required maxlength="100" placeholder="Örn. Süt"')+' '+field("Miktar","qty","number",'required min="0.01" max="100000" step="0.01"',"1")+selectField("Birim","unit",[["adet","Adet"],["paket","Paket"],["kg","Kilogram"],["lt","Litre"],["kutu","Kutu"],["gram","Gram"]],"adet")+field("Birim fiyatı (TL)","price","number",'min="0" max="100000000" step="0.01"',"0")+'</div>',name);break;
 case "set-budget":openModal("Alışveriş bütçesi","Ortak listeniz için isteğe bağlı bir hedef bütçe belirleyin.",field("Bütçe (TL)","budget","number",'min="0" max="100000000" step="0.01" required',String(state.shoppingBudget)),name);break;
 case "assign-shop":openModal("Alışveriş listesini görevlendir","Alışveriş için aile üyesi ve bildirim zamanı belirle.",'<div class="form-grid">'+memberField("Sorumlu aile üyesi","assignee",state.shoppingMeta.assignee)+field("Bildirim zamanı","reminderAt","datetime-local","",state.shoppingMeta.reminderAt||"")+'</div>',name);break;
 case "new-radar":openModal("Radar'a önemli tarih ekle","Takip türünü, sorumlu kişiyi ve tam hatırlatma saatini belirle.",'<div class="form-grid">'+selectField("Kategori","cat",Object.entries(cats).map(([id,v])=>[id,v[0]]),"bill")+field("Konu / açıklama","title","text",'required maxlength="150" placeholder="Örn. Elektrik faturası"')+memberField("Sorumlu kişi","assignee")+field("Son tarih ve saat","dueAt","datetime-local","required",futureInput(7,17))+field("Hatırlatma tarihi ve saati","reminderAt","datetime-local")+ '<label class="form-check span-two"><input type="checkbox" name="private"> Yalnızca benim görebileceğim özel bir kayıt olsun</label></div>',name);break;
 case "new-event":openModal("Aile etkinliği oluştur","Etkinlik takvimde görünür; davet edilen üyeler katılım yanıtı verebilir.",'<div class="form-grid">'+field("Etkinlik adı","title","text",'required maxlength="150" placeholder="Örn. Aile yemeği"')+field("Tarih","date","date","required",selectedDate)+field("Saat","time","time","required","18:00")+'<div class="field span-two"><span>Davet edilecek aile üyeleri</span><div class="modal-tags">'+state.members.map(m=>'<label class="modal-tag"><input type="checkbox" name="invitees" value="'+esc(m.id)+'" '+(m.id===current()?"checked":"")+'> '+esc(m.name)+'</label>').join("")+'</div></div><label class="field span-two"><span>Not (isteğe bağlı)</span><textarea name="notes" maxlength="500" placeholder="Yer, hazırlık veya küçük bir not"></textarea></label><label class="form-check span-two"><input type="checkbox" name="private"> Yalnızca bana özel etkinlik</label></div>',name);break;
 case "new-member":openModal("Aile üyesi ekle","Bu önizlemede üyeler yalnızca aynı cihazda kullanılabilir.",field("Üyenin adı","name","text",'required maxlength="40" placeholder="Örn. Anne"'),name);break;
 case "rename-family":openModal("Aile ismini değiştir","Aile alanınıza bir ad verin.",field("Aile adı","name","text",'required maxlength="50"',state.familyName),name);break;
 case "create-family":openModal("Kendi aileni oluştur","Örnek veriler kaldırılır; yeni kişisel aile alanın bu cihazda başlar.",'<div class="form-grid">'+field("Ailenin adı","family","text",'required maxlength="50" placeholder="Örn. Yılmaz Ailesi"')+field("Senin adın","name","text",'required maxlength="40" placeholder="Örn. Berke"')+'</div>',name);break;
 }
}
function processForm(form){
 const name=form.dataset.form,fd=new FormData(form),v=k=>safeText(fd.get(k)),datetime=k=>validDate(v(k))?v(k):null;
 if(name==="create-family"){if(!confirm("Örnek aile verilerinin yerine boş bir aile alanı oluşturulsun mu?"))return;state=blank(v("family"),v("name"));taskFilter="mine";save();closeModal();navigate("home");toast("Aile alanın oluşturuldu.");return;}
 if(name==="new-task"){
  const rows=v("items").split(/\r?\n/).map(x=>safeText(x,140)).filter(Boolean).slice(0,40);
  if(!rows.length){toast("En az bir görev yaz.");return;}
  const listId=uid(),dueAt=datetime("dueAt"),reminderAt=datetime("reminderAt");
  if(reminderAt&&dueAt&&new Date(reminderAt)>new Date(dueAt)){toast("Bildirim tarihi son tarihten sonra olamaz.");return;}
  const assignee=v("assignee");
  rows.forEach(title=>state.tasks.push({id:uid(),listId,listTitle:v("listTitle")||"Aile görevleri",title,assignee,creator:current(),dueAt,reminderAt,doneAt:null}));
  taskFilter="all";save();closeModal();navigate("tasks");toast(rows.length+" görev eklendi.");return;
 }
 if(name==="new-shop"){if(!v("title"))return;state.shopping.push({id:uid(),title:v("title"),qty:number(v("qty"))||1,unit:v("unit")||"adet",price:number(v("price")),bought:false});}
 if(name==="set-budget")state.shoppingBudget=number(v("budget"));
 if(name==="assign-shop")state.shoppingMeta={assignee:v("assignee"),reminderAt:datetime("reminderAt")};
 if(name==="new-radar"){
  if(!datetime("dueAt")){toast("Geçerli bir son tarih seç.");return;}
  const rem=datetime("reminderAt"),due=datetime("dueAt");if(rem&&new Date(rem)>new Date(due)){toast("Bildirim son tarihten sonra olamaz.");return;}
  if(fd.has("private")&&v("assignee")!==current()){toast("Özel Radar kaydını yalnızca kendine atayabilirsin.");return;}
  state.radar.push({id:uid(),title:v("title"),cat:cats[v("cat")]?v("cat"):"custom",assignee:v("assignee"),creator:current(),dueAt:due,reminderAt:rem,doneAt:null,privateTo:fd.has("private")?current():null});
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
function act(action,id,value){
 if(action==="close-modal"){closeModal();return}
 if(action==="goto-tasks"||action==="goto-radar"){navigate(action==="goto-tasks"?"tasks":"radar");return}
 if(["new-task","new-shop","set-budget","assign-shop","new-radar","new-event","new-member","rename-family","create-family"].includes(action)){openForm(action);return}
 if(action==="task-filter"){taskFilter=value;render();return}
 if(action==="radar-filter"){radarFilter=value;render();return}
 if(action==="select-date"){selectedDate=value;render();return}
 if(action==="month-prev"||action==="month-next"){calendarMonth.setMonth(calendarMonth.getMonth()+(action==="month-next"?1:-1));calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);render();return}
 if(action==="toggle-task"){const t=state.tasks.find(x=>x.id===id);if(t&&t.assignee===current()){t.doneAt=t.doneAt?null:now().toISOString();save();render();toast(t.doneAt?"Görev tamamlandı.":"Görev yeniden açıldı.");}else toast("Bu görevi tamamlamak için ilgili üyeyi seç.");return}
 if(action==="toggle-shop"){const x=state.shopping.find(t=>t.id===id);if(x){x.bought=!x.bought;save();render();}return}
 if(action==="toggle-radar"){const t=state.radar.find(x=>x.id===id);if(t&&shareable(t)&&t.assignee===current()){t.doneAt=t.doneAt?null:now().toISOString();save();render();toast("Radar durumu güncellendi.");}return}
 const collection={"delete-task":"tasks","delete-shop":"shopping","delete-radar":"radar","delete-event":"events"}[action];
 if(collection){const row=state[collection].find(x=>x.id===id);if(!row||!noConfirm("Bu kaydı silmek istiyor musun?"))return;state[collection]=state[collection].filter(x=>x.id!==id);save();render();toast("Kayıt silindi.");return;}
 if(action==="switch-member"){if(state.members.some(x=>x.id===id)){state.currentMember=id;save();render();toast("Şimdi "+currentName()+" görünümündesin.");}return}
 if(action==="rsvp"){const e=state.events.find(x=>x.id===id);if(e&&e.invitees.includes(current())&&["yes","no","maybe"].includes(value)){e.rsvp[current()]=value;save();render();}return}
 if(action==="export"){const blob=new Blob([JSON.stringify({format:"habitopia-family",version:VERSION,exportedAt:now().toISOString(),data:state},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="habitopia-aile-yedek-"+localDay()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast("Yedek dosyası oluşturuldu.");return}
 if(action==="reset"){if(!noConfirm("Bu cihazdaki Habitopia Aile verilerini silmek istiyor musun? Önce yedek almanı öneririz."))return;state=sample();save();navigate("home");toast("Örnek aileye dönüldü.");return}
 if(action==="request-permission"){if(!("Notification" in window)){toast("Bu tarayıcı bildirimleri desteklemiyor.");return}if(!window.isSecureContext){toast("Bildirimler için güvenli HTTPS gerekir.");return}Notification.requestPermission().then(p=>toast(p==="granted"?"Uygulama açıkken bildirim izni verildi.":"Bildirim izni verilmedi.")).catch(()=>toast("Bildirim izni alınamadı."));return}
 if(action==="show-notifications"){showNotifications();return}
 if(action==="notification-go"){closeModal();navigate(value==="tasks"?"tasks":value==="shopping"?"shopping":"radar");if(value==="tasks"&&id){setTimeout(()=>document.getElementById("list-"+id)?.scrollIntoView({block:"center",behavior:"smooth"}),40);}return}
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
 return out.sort((a,b)=>b.at.localeCompare(a.at));
}
function showNotifications(){
 const notices=notificationsForMember();
 const content='<div class="notice">Bildirimler yalnızca bu cihazdaki seçili kişiye aittir. Uygulama kapalıyken otomatik gönderim henüz etkin değildir.</div>'+
 (notices.length?notices.map(n=>'<div class="notification-card"><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+' · '+stampTime(n.at)+'</p><button type="button" data-action="notification-go" data-id="'+esc(n.group||"")+'" data-value="'+esc(n.type)+'">İlgili listeyi aç ↗</button></div>').join(""):empty("✓","Yeni bildirim yok","Zamanı gelmiş bekleyen hatırlatma görünmüyor."));
 $("#modal").innerHTML='<button type="button" class="modal-close" data-action="close-modal" aria-label="Kapat">×</button><h2 id="modal-title">Bildirimler</h2><p class="modal-intro">Sana ait hatırlatmalar</p>'+content;
 $("#overlay").hidden=false;document.body.style.overflow="hidden";
}
function poll(){
 const notices=notificationsForMember();
 $("#notification-dot").hidden=!notices.length;
 if(!("Notification" in window)||Notification.permission!=="granted"||document.hidden)return;
 let changed=false;
 notices.forEach(n=>{
  if(state.notified.includes(n.id))return;
  try{
   const alert=new Notification(n.title,{body:n.message,tag:n.id,icon:"./family-icon.svg"});
   alert.onclick=()=>{window.focus();navigate(n.type);alert.close();};
   state.notified.push(n.id);changed=true;
  }catch(e){console.warn("Bildirim gösterilemedi",e);}
 });
 if(changed){state.notified=state.notified.slice(-1200);save();}
}
document.addEventListener("click",e=>{
 const pageButton=e.target.closest("[data-page]");
 if(pageButton){e.preventDefault();navigate(pageButton.dataset.page);return;}
 const actionButton=e.target.closest("[data-action]");
 if(actionButton){act(actionButton.dataset.action,actionButton.dataset.id,actionButton.dataset.value);return;}
});
document.addEventListener("submit",e=>{
 const form=e.target.closest("form[data-form]");if(!form)return;e.preventDefault();processForm(form);
});
document.addEventListener("change",async e=>{
 if(e.target.name==="cat"&&e.target.closest('form[data-form="new-radar"]')){const privacy=e.target.closest("form").querySelector('[name="private"]');if(privacy&&e.target.value==="health")privacy.checked=true;return;}
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
 const content='<div class="list">'+state.members.map(m=>'<button type="button" class="list-row" style="width:100%;text-align:left;cursor:pointer" data-action="switch-member-and-close" data-id="'+esc(m.id)+'"><span class="member-avatar">'+esc(m.name[0])+'</span><div class="item-info"><span class="item-title">'+esc(m.name)+'</span><span class="item-sub">'+(m.id===current()?"Şu anda seçili":"Bu cihazda bu üyenin görünümüne geç")+'</span></div></button>').join("")+'</div><p class="archive-note">Üyeler arasında geçiş bir yerel önizlemedir. Gerçek hesap veya farklı telefon bağlantısı değildir.</p>';
 $("#modal").innerHTML='<button type="button" class="modal-close" data-action="close-modal" aria-label="Kapat">×</button><h2 id="modal-title">Aile üyesi seç</h2><p class="modal-intro">Aile görünümünü değiştir</p>'+content;
 $("#overlay").hidden=false;document.body.style.overflow="hidden";
});
$("#modal").addEventListener("click",e=>{const el=e.target.closest('[data-action="switch-member-and-close"]');if(el){act("switch-member",el.dataset.id);closeModal();}});
$("#start-family").addEventListener("click",()=>openForm("create-family"));
window.addEventListener("hashchange",()=>{const p=location.hash.slice(1);if(pageTitle[p])navigate(p)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){poll();render()}});
const initial=location.hash.slice(1);if(pageTitle[initial])page=initial;
if(!storageHealthy)setTimeout(()=>toast("Tarayıcıdaki eski veri okunamadı; üzerine yazılmadı."),100);
render();setInterval(poll,30000);poll();
})();
