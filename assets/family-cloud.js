/* Habitopia Aile 2.0 - account-backed, household-scoped Supabase sync.
 * Public project URL + publishable key only. NEVER embed service/secret keys.
 */
(()=>{
"use strict";
const URL="https://bcrbkrkgsiugsmxmginx.supabase.co";
const KEY="sb_publishable_4A471h4l5pSeHT8HyP_IVA_pmQxfnL6";
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>crypto.randomUUID();
const toIso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
let client=null,auth=null,activeHousehold=null,callbacks=null,householdList=[],unsub=null,tick=null;
let lastSnapshot=null,queuedSnapshot=null,op=Promise.resolve(),reloadTimer=null,busy=0,loading=false,lastError="";
let notifications=[];
const element=()=>document.getElementById("cloud-overlay");
function message(msg,kind=""){
 const n=document.getElementById("cloud-message");
 if(n){n.textContent=msg;n.className="cloud-message "+kind;n.hidden=!msg;}
}
function overlay(content){
 const el=element();el.hidden=false;
 el.innerHTML='<div class="cloud-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-dialog-title"><button class="cloud-exit" type="button" data-cloud="close" aria-label="Kapat">×</button>'+content+'<p id="cloud-message" class="cloud-message" role="status" hidden></p></div>';
 el.querySelector("input")?.focus();
}
function close(){element().hidden=true;element().innerHTML="";}
function label(text,name,type="text",extra=""){return '<label class="field"><span>'+text+'</span><input name="'+name+'" type="'+type+'" '+extra+' required></label>';}
function authView(mode="signin"){
 const signup=mode==="signup";
 overlay('<div class="cloud-mark">⌂</div><h2 id="cloud-dialog-title">'+(signup?"Habitopia Aile'ye katıl":"Aile hesabına giriş yap")+'</h2><p class="cloud-intro">Farklı telefonlarda aynı aileye bağlanmak için kişisel hesabını kullan.</p><form data-cloud-form="'+mode+'" class="cloud-form">'+label("E-posta","email","email",'autocomplete="email" maxlength="200"')+label("Şifre","password","password",'autocomplete="'+(signup?"new-password":"current-password")+'" minlength="8" maxlength="128"')+'<button class="btn btn-primary" type="submit">'+(signup?"Hesap oluştur":"Giriş yap")+'</button></form><button type="button" class="cloud-switch" data-cloud="'+(signup?"signin":"signup")+'">'+(signup?"Zaten hesabın var mı? Giriş yap":"Hesabın yok mu? Ücretsiz kayıt ol")+'</button><p class="cloud-notice">Giriş yaptığında bu cihazın tarayıcısında oturumun açık kalabilir.</p>');
}
function chooseFamily(){
 const list=householdList.map(m=>'<button type="button" class="cloud-family-entry" data-cloud="choose" data-id="'+escapeHtml(m.household_id)+'">⌂ <strong>'+escapeHtml(m.display_name)+'</strong><small>'+escapeHtml(m.household_name||"Ailem")+'</small> ↗</button>').join("");
 overlay('<h2 id="cloud-dialog-title">Aile alanına hoş geldin</h2><p class="cloud-intro">'+escapeHtml(auth?.email||"")+' · Aşağıdan bir aile seç, yeni aile kur veya davet koduyla katıl.</p>'+list+'<div class="cloud-buttons"><button class="btn btn-primary" data-cloud="create" type="button">＋ Aile oluştur</button><button class="btn btn-muted" data-cloud="join" type="button">Davet koduyla katıl</button></div><button type="button" class="cloud-switch" data-cloud="signout">Hesaptan çıkış yap</button>');
}
function familyCreate(){
 overlay('<h2 id="cloud-dialog-title">Yeni aile oluştur</h2><p class="cloud-intro">Ailenin adını belirle. Bir davet kodu oluşturulacak.</p><form data-cloud-form="create" class="cloud-form">'+label("Aile adı","family","text",'maxlength="80" placeholder="Ör. Yılmaz Ailesi"')+label("Görünecek adın","name","text",'maxlength="60" placeholder="Ör. Anne"')+'<button class="btn btn-primary" type="submit">Ailemi oluştur</button></form><button class="cloud-switch" data-cloud="families" type="button">← Geri</button>');
}
function familyJoin(){
 overlay('<h2 id="cloud-dialog-title">Ailene katıl</h2><p class="cloud-intro">Aile yöneticisinin paylaştığı davet kodunu gir.</p><form data-cloud-form="join" class="cloud-form">'+label("Davet kodu","code","text",'placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" minlength="36" maxlength="36"')+label("Ailede görünecek adın","name","text",'maxlength="60" placeholder="Ör. Oğul"')+'<button class="btn btn-primary" type="submit">Aileye katıl</button></form><button class="cloud-switch" data-cloud="families" type="button">← Geri</button>');
}
async function families(){
 if(!client||!auth)return[];
 const {data,error}=await client.from("family_members").select("household_id,display_name,role").eq("user_id",auth.id);
 if(error)throw error;
 let homes=[];
 if(data?.length){const a=await client.from("family_households").select("id,name").in("id",data.map(m=>m.household_id));if(a.error)throw a.error;homes=a.data||[];}
 householdList=(data||[]).map(x=>({...x,household_name:homes.find(h=>h.id===x.household_id)?.name||"Ailem"}));
 return householdList;
}
function rowsFromState(s){
 const rows=[],idToRow=new Map();
 const add=(kind,item,details)=>{
  if(!item.id||typeof item.id!=="string"||!item.id.includes("-"))return;
  const row={id:item.id,household_id:activeHousehold,kind,created_by:item.creator||auth.id,assignee:kind==="shopping"||kind==="event"||kind==="asset"||kind==="workflow"?null:item.assignee||null,
    title:item.title||item.name||"Başlıksız",details,privacy:item.privateTo?"private":"family",due_at:toIso(item.dueAt),
    reminder_at:toIso(item.reminderAt),done_at:toIso(item.doneAt),
    linked_event_id:item.linkedEventId||null};
  if(kind==="asset"||kind==="workflow"||kind==="event"){row.due_at=null;row.reminder_at=null;row.done_at=null;}
  if(kind==="shopping")row.reminder_at=null;
  if(kind==="radar"&&details.cat==="health"){row.privacy="private";row.assignee=auth.id;}
  idToRow.set(row.id,row);rows.push(row);
 };
 (s.tasks||[]).forEach(x=>add("task",x,{listId:x.listId,listTitle:x.listTitle}));
 (s.shopping||[]).forEach(x=>add("shopping",x,{qty:x.qty,unit:x.unit,price:x.price}));
 (s.radar||[]).forEach(x=>add("radar",x,{cat:x.cat,linkedAssetId:x.linkedAssetId||null}));
 (s.events||[]).forEach(x=>add("event",x,{date:x.date,time:x.time,notes:x.notes,invitees:x.invitees}));
 (s.assets||[]).forEach(x=>add("asset",x,{category:x.category,brand:x.brand,model:x.model,serial:x.serial,purchasedAt:x.purchasedAt,warrantyUntil:x.warrantyUntil,notes:x.notes,services:x.services||[]}));
 (s.workflows||[]).forEach(x=>add("workflow",x,{description:x.description||"",steps:x.steps||[]}));
 return idToRow;
}
async function fullLoad(){
 if(!activeHousehold||loading||busy)return;
 loading=true;
 try{
 const [house,members,items]=await Promise.all([
  client.from("family_households").select("*").eq("id",activeHousehold).single(),
  client.from("family_members").select("user_id,display_name,role").eq("household_id",activeHousehold),
  client.from("family_items").select("*").eq("household_id",activeHousehold).order("created_at",{ascending:true}).limit(3000)
 ]);
 for(const x of [house,members,items])if(x.error)throw x.error;
 const events=(items.data||[]).filter(x=>x.kind==="event").map(x=>x.id);
 const [replies,alerts]=await Promise.all([
  events.length?client.from("family_event_responses").select("*").in("event_id",events):Promise.resolve({data:[]}),
  client.from("family_notifications").select("*").eq("household_id",activeHousehold).eq("user_id",auth.id).is("read_at",null).order("created_at",{ascending:false}).limit(50)
 ]);
 if(replies.error)throw replies.error;
 if(alerts.error)throw alerts.error;
 notifications=alerts.data||[];
 const rsvp={};(replies.data||[]).forEach(x=>{(rsvp[x.event_id]??={})[x.user_id]=x.response});
 const s={version:1,demo:false,familyName:house.data.name,currentMember:auth.id,
  members:(members.data||[]).map(m=>({id:m.user_id,name:m.display_name,role:m.role})),
  shoppingBudget:Number(house.data.shopping_budget||0),
  shoppingMeta:{assignee:house.data.shopping_meta?.assignee||auth.id,reminderAt:house.data.shopping_meta?.reminderAt||null},
  tasks:[],shopping:[],radar:[],events:[],assets:[],workflows:[],notified:[]};
 (items.data||[]).forEach(x=>{
  const base={id:x.id,title:x.title,creator:x.created_by,assignee:x.assignee,dueAt:x.due_at,reminderAt:x.reminder_at,doneAt:x.done_at,
   privateTo:x.privacy==="private"?x.created_by:null,linkedEventId:x.linked_event_id};
  const d=x.details||{};
  if(x.kind==="task")s.tasks.push({...base,listId:d.listId||x.id,listTitle:d.listTitle||"Aile görevleri"});
  if(x.kind==="shopping")s.shopping.push({...base,qty:Number(d.qty||1),unit:d.unit||"adet",price:Number(d.price||0),bought:!!x.done_at});
  if(x.kind==="radar")s.radar.push({...base,cat:d.cat||"custom",linkedAssetId:d.linkedAssetId||null});
  if(x.kind==="event")s.events.push({...base,date:d.date||"",time:d.time||"12:00",notes:d.notes||"",invitees:d.invitees||[x.created_by],rsvp:rsvp[x.id]||{}});
  if(x.kind==="asset")s.assets.push({...base,category:d.category||"Ev eşyası",brand:d.brand||"",model:d.model||"",serial:d.serial||"",purchasedAt:d.purchasedAt||"",warrantyUntil:d.warrantyUntil||"",notes:d.notes||"",services:d.services||[]});
  if(x.kind==="workflow")s.workflows.push({...base,description:d.description||"",steps:d.steps||[]});
 });
 lastSnapshot=clone(s);
 callbacks?.setState(s);
 status("Bulutta eşzamanlandı");
 }catch(e){status("Senkronizasyon hatası");console.error("Habitopia cloud load",e);lastError=e.message||"Senkronizasyon hatası";}
 finally{loading=false;}
}
function compare(old,next){return JSON.stringify(old)===JSON.stringify(next)}
async function persist(previous,next){
 if(!activeHousehold||!auth)return;
 const prev=rowsFromState(previous),curr=rowsFromState(next);
 for(const [id,row] of curr){
  const before=prev.get(id);
  if(!before){const q=await client.from("family_items").insert(row);if(q.error)throw q.error;continue;}
  if(compare(before,row))continue;
  if(before.created_by!==auth.id){
   const keys=Object.keys(row).filter(k=>!compare(row[k],before[k]));
   if(keys.length===1&&keys[0]==="done_at"&&["task","shopping","radar"].includes(row.kind)){
    const r=await client.rpc("family_complete",{p_item:id,p_done:!!row.done_at});if(r.error)throw r.error;
   }else throw Error("Bu kaydı yalnızca oluşturan kişi düzenleyebilir.");
  }else{
   const r=await client.from("family_items").update(row).eq("id",id);if(r.error)throw r.error;
  }
 }
 for(const [id,before] of prev){if(curr.has(id))continue;
  if(before.created_by!==auth.id)throw Error("Bu kaydı yalnızca oluşturan kişi silebilir.");
  const r=await client.from("family_items").delete().eq("id",id);if(r.error)throw r.error;
 }
 if(previous.shoppingBudget!==next.shoppingBudget||!compare(previous.shoppingMeta,next.shoppingMeta)){
  const r=await client.rpc("family_set_shopping",{p_household:activeHousehold,p_budget:next.shoppingBudget||0,p_meta:{...next.shoppingMeta,reminderAt:toIso(next.shoppingMeta?.reminderAt)}});if(r.error)throw r.error;
 }
 if(previous.familyName!==next.familyName){
  const r=await client.from("family_households").update({name:next.familyName}).eq("id",activeHousehold);
  if(r.error)throw r.error;
 }
 for(const event of next.events||[]){
  const old=previous.events?.find(e=>e.id===event.id);
  if(!event.rsvp||compare(old?.rsvp||{},event.rsvp))continue;
  const previousResponse=old?.rsvp?.[auth.id];
  const response=event.rsvp?.[auth.id];
  if(response&&response!==previousResponse){
   const r=await client.from("family_event_responses").upsert({event_id:event.id,user_id:auth.id,response},{onConflict:"event_id,user_id"});
   if(r.error)throw r.error;
  }
 }
}
function save(snapshot){
 if(!activeHousehold||!auth||!lastSnapshot)return;
 const next=clone(snapshot),previous=queuedSnapshot||lastSnapshot;
 if(compare(previous,next))return;
 queuedSnapshot=next;busy++;
 status("Kaydediliyor…");
 op=op.then(async()=>{
  await persist(previous,next);
  lastSnapshot=clone(next);
 }).catch(async e=>{
  lastError=e?.message||"Değişiklikler kaydedilemedi";
  console.error("Habitopia cloud write",e);
  status("Kaydetme hatası");
  window.dispatchEvent(new CustomEvent("habitopia-cloud-error",{detail:lastError}));
 }).finally(()=>{
  busy=Math.max(0,busy-1);
  if(!busy){queuedSnapshot=null;queueReload(600);}
 });
}
function queueReload(delay=600){
 if(!activeHousehold)return;
 clearTimeout(reloadTimer);
 reloadTimer=setTimeout(()=>{if(!busy&&!loading)fullLoad();else queueReload(1000);},delay);
}
function subscribe(){
 if(unsub){client.removeChannel(unsub);unsub=null;}
 const id=activeHousehold;
 unsub=client.channel("habitopia-aile-"+id)
  .on("postgres_changes",{event:"*",schema:"public",table:"family_items",filter:"household_id=eq."+id},()=>queueReload())
  .on("postgres_changes",{event:"*",schema:"public",table:"family_members",filter:"household_id=eq."+id},()=>queueReload())
  .on("postgres_changes",{event:"*",schema:"public",table:"family_households",filter:"id=eq."+id},()=>queueReload())
  .on("postgres_changes",{event:"*",schema:"public",table:"family_notifications",filter:"household_id=eq."+id},()=>queueReload())
  .on("postgres_changes",{event:"*",schema:"public",table:"family_event_responses"},()=>queueReload())
  .subscribe();
 clearInterval(tick);tick=setInterval(()=>{if(document.visibilityState==="visible")queueReload(50);},25000);
}
function status(text){
 const x=document.getElementById("sync-indicator");if(x)x.textContent=activeHousehold?text:"Önizleme · Bulut hesabı bağlı değil";
 const b=document.getElementById("cloud-account");if(b)b.textContent=auth?(activeHousehold?"☁ Hesabım":"Aile seç"):"Giriş yap";
}
async function useHousehold(id){
 await op;
 if(!householdList.some(h=>h.household_id===id))throw Error("Bu aileye üye değilsin.");
 activeHousehold=id;sessionStorage.setItem("hbt-family-household",id);
 close();await fullLoad();subscribe();status("Buluta bağlı");
}
async function start(){
 const {data:{session},error}=await client.auth.getSession();
 if(error)throw error;
 auth=session?.user||null;
 if(!auth){activeHousehold=null;status("");return;}
 await families();
 const preferred=sessionStorage.getItem("hbt-family-household");
 if(householdList.length){
  await useHousehold(householdList.some(h=>h.household_id===preferred)?preferred:householdList[0].household_id);
 }else chooseFamily();
}
async function signout(){
 await op;
 if(unsub){client.removeChannel(unsub);unsub=null;}
 if(tick)clearInterval(tick);
 const {error}=await client.auth.signOut();if(error)throw error;
 activeHousehold=null;auth=null;lastSnapshot=null;queuedSnapshot=null;notifications=[];householdList=[];
 sessionStorage.removeItem("hbt-family-household");close();callbacks?.reset();status("");
}
function currentUser(){return auth}
async function uploadDocument(itemId,file,privacy="private"){
 if(!auth||!activeHousehold)throw Error("Önce giriş yap.");
 await op;
 if(!file||file.size>5242880)throw Error("En fazla 5 MB dosya yüklenebilir.");
 if(!["application/pdf","image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Yalnızca PDF veya resim yüklenebilir.");
 const extension=({"application/pdf":".pdf","image/png":".png","image/jpeg":".jpg","image/webp":".webp"})[file.type];
 const path=activeHousehold+"/"+auth.id+"/"+uid()+extension;
 const o=await client.storage.from("habitopia-family-docs").upload(path,file,{upsert:false,contentType:file.type});
 if(o.error)throw o.error;
 const r=await client.from("family_documents").insert({household_id:activeHousehold,item_id:itemId,uploaded_by:auth.id,path,display_name:file.name.slice(0,160),privacy});
 if(r.error){
  await client.storage.from("habitopia-family-docs").remove([path]).catch(()=>{});
  throw r.error;
 }
 return r.data;
}
async function listDocuments(itemId){
 if(!auth||!activeHousehold)return[];
 const r=await client.from("family_documents").select("id,path,display_name,privacy,uploaded_by").eq("item_id",itemId);
 if(r.error)throw r.error;return r.data||[];
}
async function openDocument(path){
 const r=await client.storage.from("habitopia-family-docs").createSignedUrl(path,60);
 if(r.error)throw r.error;
 window.open(r.data.signedUrl,"_blank","noopener,noreferrer");
}
async function acknowledge(id){
 const r=await client.from("family_notifications").update({read_at:new Date().toISOString()}).eq("id",id);
 if(r.error)throw r.error;notifications=notifications.filter(x=>x.id!==id);return true;
}
async function doForm(form){
 const kind=form.dataset.cloudForm,fd=new FormData(form);
 const val=k=>String(fd.get(k)||"").trim();
 message("İşleniyor…");
 try{
  if(kind==="signin"){const r=await client.auth.signInWithPassword({email:val("email"),password:val("password")});if(r.error)throw r.error;await start();return;}
  if(kind==="signup"){
   const r=await client.auth.signUp({email:val("email"),password:val("password"),options:{emailRedirectTo:location.origin+location.pathname}});
   if(r.error)throw r.error;
   if(r.data.session){await start();return;}
   message("E-postana gelen doğrulama bağlantısını aç. Ardından giriş yapabilirsin.","good");return;
  }
  if(kind==="create"){
   const r=await client.rpc("family_create",{p_name:val("family"),p_display_name:val("name")});
   if(r.error)throw r.error;await families();await useHousehold(r.data);return;
  }
  if(kind==="join"){
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val("code")))throw Error("Geçerli bir davet kodu gir.");
   const r=await client.rpc("family_join",{p_code:val("code"),p_display_name:val("name")});
   if(r.error)throw r.error;await families();await useHousehold(r.data);return;
  }
 }catch(e){message(e.message||"İşlem yapılamadı.","bad");console.error(e)}
}
async function onAction(name,id){
 if(name==="close"){close();return}
 if(name==="signin"||name==="signup"){authView(name);return}
 if(!client){message("Bağlantı bileşeni yüklenmedi.","bad");return}
 if(name==="create"){familyCreate();return}
 if(name==="join"){familyJoin();return}
 if(name==="families"){await families();chooseFamily();return}
 if(name==="choose"){try{await useHousehold(id);}catch(e){message(e.message,"bad")}return}
 if(name==="signout"){try{await signout();}catch(e){message(e.message,"bad")}return}
 if(name==="copy"){
  try{
   const r=await client.from("family_households").select("invite_code").eq("id",activeHousehold).single();
   if(r.error)throw r.error;
   await navigator.clipboard.writeText(r.data.invite_code);
   message("Davet kodu kopyalandı. Yalnızca güvendiğin kişilerle paylaş.","good");
  }catch(e){message("Kod kopyalanamadı: "+e.message,"bad")}
  return;
 }
}
function accountView(){
 if(!auth){authView();return;}
 if(!activeHousehold){chooseFamily();return;}
 const members=householdList.find(x=>x.household_id===activeHousehold);
 overlay('<h2 id="cloud-dialog-title">Aile hesabım</h2><p class="cloud-intro">'+escapeHtml(auth.email)+' · '+escapeHtml(members?.household_name||"Ailem")+'</p><div class="notice">Üye davet etmek için aile kodunu kopyala. Her kişi kendi e-postasıyla kayıt olmalı ve davet koduyla katılmalıdır.</div><div class="cloud-buttons"><button data-cloud="copy" class="btn btn-primary" type="button">Davet kodunu kopyala</button><button data-cloud="families" class="btn btn-muted" type="button">Aile değiştir / oluştur</button></div><button data-cloud="signout" type="button" class="cloud-switch">Oturumu kapat</button>');
}
function bootstrap(callback){
 callbacks=callback;
 const s=window.supabase;
 if(!s?.createClient){status("Supabase kütüphanesi yüklenemedi");return;}
 client=s.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:3}}});
 document.getElementById("cloud-account")?.addEventListener("click",accountView);
 element()?.addEventListener("click",e=>{
  if(e.target===element())close();
  const b=e.target.closest("[data-cloud]");
  if(b){e.preventDefault();onAction(b.dataset.cloud,b.dataset.id);}
 });
 element()?.addEventListener("submit",e=>{const f=e.target.closest("form[data-cloud-form]");if(f){e.preventDefault();doForm(f);}});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!element().hidden)close();});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_OUT"&&auth){auth=null;activeHousehold=null;lastSnapshot=null;callbacks?.reset();status("");}
 });
 start().catch(e=>{console.error(e);status("Bulut bağlantısı kurulamadı");});
}
window.HabitopiaCloud={
 init:bootstrap,save,get active(){return !!activeHousehold&&!!auth;},get user(){return auth;},
 get household(){return activeHousehold;},get notifications(){return notifications;},
 showAuth:accountView,showFamilies:()=>auth?chooseFamily():authView(),showInvite:accountView,
 uploadDocument,listDocuments,openDocument,acknowledge,refresh:()=>queueReload(50),get client(){return client;},
 get error(){return lastError;}
};
})();
