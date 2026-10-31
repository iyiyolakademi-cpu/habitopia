/* Habitopia Aile — real, opt-in PWA push device registration.
 * Public VAPID key is safe to ship; private VAPID key stays in Supabase Vault.
 */
(()=>{
"use strict";
const VAPID_PUBLIC="BJlHc5l7xYoIeJmrpo0rvl6HTSNCw4i45uGWnVOmEx_8xXOaL_i8JnSTDU65A8vbSEoVnw2IvnnahFdXiqKGoDQ";
let registration=null,bound=false,enabled=false,busy=false;
const db=()=>window.HabitopiaCloud?.client;
const member=()=>window.HabitopiaCloud?.user?.id;
const family=()=>window.HabitopiaCloud?.household;
const supported=()=>!!(window.isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window);
const installed=()=>!!(window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone);
const isiOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1;
const publicKey=()=>{
 const raw=atob(VAPID_PUBLIC.replaceAll("-","+").replaceAll("_","/").padEnd(Math.ceil(VAPID_PUBLIC.length/4)*4,"="));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
const statusElement=()=>document.getElementById("push-status");
function report(text,type=""){
 const target=statusElement();if(!target)return;
 target.textContent=text;
 target.className="push-status "+(type||"");
}
function guidance(){
 if(!supported())return "Bu tarayıcıda Web Push desteklenmiyor. Android'de güncel Chrome, iPhone'da iOS 16.4 veya üstü kullan.";
 if(isiOS()&&!installed())return "iPhone: Safari'de Paylaş → Ana Ekrana Ekle. Habitopia'yı Ana Ekran simgesinden açıp bildirimleri etkinleştir.";
 if(Notification.permission==="denied")return "Bildirimler bu cihazda engellenmiş. Telefonun tarayıcı / uygulama bildirim ayarlarından izin ver.";
 return "Bu telefona uygulama kapalıyken bildirim gelebilmesi için bildirimleri etkinleştir.";
}
async function sw(){
 if(!supported())throw Error(guidance());
 if(registration)return registration;
 registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
 return registration;
}
async function refresh(){
 const btn=document.getElementById("push-enable");
 if(btn)btn.disabled=busy;
 if(!supported()){report(guidance(),"warn");enabled=false;return;}
 if(!member()||!family()){report("Önce aile hesabına giriş yap.","warn");enabled=false;return;}
 if(isiOS()&&!installed()){report(guidance(),"warn");enabled=false;return;}
 if(Notification.permission==="denied"){report(guidance(),"warn");enabled=false;return;}
 try{
   const r=await sw();
   const sub=await r.pushManager.getSubscription();
   enabled=!!sub&&Notification.permission==="granted";
   report(enabled?"Bu cihazda bildirimler açık. Görev ve Radar hatırlatmaları telefonuna gönderilebilir.":guidance(),enabled?"ok":"");
 }catch(e){enabled=false;report("Bildirim durumu kontrol edilemedi: "+String(e.message||e),"warn");}
 if(btn)btn.textContent=enabled?"Bildirimler açık ✓":"Telefon bildirimlerini aç";
}
async function enable(){
 if(busy)return;
 if(!member()||!family()){report("Önce hesabına giriş yap.","warn");return;}
 if(!supported()||(isiOS()&&!installed())){report(guidance(),"warn");return;}
 // Keep the permission prompt directly within the user-initiated click.
 const asked=Notification.permission==="default"?Notification.requestPermission():Promise.resolve(Notification.permission);
 busy=true;const btn=document.getElementById("push-enable");if(btn){btn.disabled=true;btn.textContent="Bağlanıyor…";}
 try{
   const permission=await asked;
   if(permission!=="granted"){report(guidance(),"warn");return;}
   const r=await sw();
   let sub=await r.pushManager.getSubscription();
   if(!sub)sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey()});
   const details=sub.toJSON(),keys=details.keys;
   if(!keys?.p256dh||!keys?.auth||!sub.endpoint)throw Error("Cihazın bildirim anahtarları alınamadı.");
   const api=db();if(!api)throw Error("Sunucu bağlantısı kurulamadı.");
   const {error}=await api.from("family_push_subscriptions").upsert({
     household_id:family(),user_id:member(),endpoint:sub.endpoint,
     p256dh:keys.p256dh,auth:keys.auth,user_agent:navigator.userAgent.slice(0,255)
   },{onConflict:"household_id,user_id,endpoint"});
   if(error)throw error;
   enabled=true;
   report("Bu cihaz bildirimlere bağlandı. Önemli işler için telefon izinlerini açık tut.","ok");
 }catch(e){
   enabled=false;report("Bildirim bağlantısı başarısız: "+String(e.message||e),"warn");
 }finally{busy=false;await refresh();}
}
async function disable(){
 if(busy||!supported())return;
 busy=true;
 try{
   const r=await sw(),sub=await r.pushManager.getSubscription();
   if(sub&&db()&&member()&&family()){
     const {error}=await db().from("family_push_subscriptions").delete()
      .eq("household_id",family()).eq("user_id",member()).eq("endpoint",sub.endpoint);
     if(error)throw error;
   }
   if(sub)await sub.unsubscribe();
   enabled=false;report("Bu cihazdaki bildirim aboneliği kapatıldı.");
 }catch(e){report("Bildirim kapatılamadı: "+String(e.message||e),"warn");}
 finally{busy=false;await refresh();}
}
function setBadge(count){
 if(!("setAppBadge" in navigator)||Notification.permission!=="granted")return;
 const n=Math.min(99,Math.max(0,Number(count)||0));
 try{if(n)navigator.setAppBadge(n).catch?.(()=>{});else navigator.clearAppBadge?.().catch?.(()=>{});}catch{}
}
function init(){
 if(bound)return;bound=true;
 if(supported()){sw().catch(()=>{});}
 window.addEventListener("habitopia-family-ready",refresh);
 window.addEventListener("habitopia-family-updated",refresh);
 navigator.serviceWorker?.addEventListener("message",event=>{
   if(event.data?.type==="HABITOPIA_OPEN_NOTIFICATIONS")window.dispatchEvent(new Event("habitopia-open-notifications"));
 });
}
window.HabitopiaPush={init,enable,disable,refresh,setBadge,guidance,get subscribed(){return enabled;}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
