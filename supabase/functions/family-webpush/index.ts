import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

/* No private VAPID material in source or browser.
 * Private settings are read through a service_role-only RPC from Vault.
 * Payload-free Web Push avoids exposing family task details on lock screens.
 */
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
function b64url(bytes:Uint8Array):string {
  let s="";for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}
function asBytes(input:string):Uint8Array{
  const raw=atob(input.replaceAll("-","+").replaceAll("_","/").padEnd(Math.ceil(input.length/4)*4,"="));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function publicVapid(key:{x:string,y:string}):string{
  const x=asBytes(key.x),y=asBytes(key.y);
  if(x.length!==32||y.length!==32)throw Error("Invalid VAPID public key");
  const point=new Uint8Array(65);point[0]=4;point.set(x,1);point.set(y,33);
  return b64url(point);
}
function equal(a:string,b:string):boolean{
  const aBytes=new TextEncoder().encode(a),bBytes=new TextEncoder().encode(b);
  let acc=aBytes.length^bBytes.length;
  for(let i=0;i<Math.max(aBytes.length,bBytes.length);i++)acc|=(aBytes[i]||0)^(bBytes[i]||0);
  return acc===0;
}
async function authorization(endpoint:string,jwk:{kty:string,crv:string,x:string,y:string,d:string}){
  const origin=new URL(endpoint).origin;
  const payload=b64url(new TextEncoder().encode(JSON.stringify({
    aud:origin,exp:Math.floor(Date.now()/1000)+3600,sub:"mailto:iyiyolakademi@gmail.com"
  })));
  const header=b64url(new TextEncoder().encode(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const input=header+"."+payload;
  const key=await crypto.subtle.importKey("jwk",{...jwk,key_ops:["sign"],ext:true},
    {name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const signature=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,new TextEncoder().encode(input)));
  return "vapid t="+input+"."+b64url(signature)+", k="+publicVapid(jwk);
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return json({error:"Server not configured"},503);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const settings=await db.rpc("family_get_push_settings");
  if(settings.error||!settings.data)return json({error:"Internal settings unavailable"},503);
  const supplied=req.headers.get("x-habitopia-dispatch")||"";
  if(!supplied||!equal(supplied,settings.data.dispatch_token))return json({error:"Unauthorized"},401);
  const vapid=settings.data.vapid as {kty:string,crv:string,x:string,y:string,d:string};
  const since=new Date(Date.now()-24*60*60*1000).toISOString();
  const ns=await db.from("family_notifications")
    .select("id,household_id,user_id,due_at,created_at")
    .is("read_at",null).gte("due_at",since).lte("due_at",new Date().toISOString())
    .order("created_at",{ascending:true}).limit(35);
  if(ns.error)return json({error:"Unable to load notification queue"},500);
  const notifications=ns.data||[];
  if(!notifications.length)return json({attempted:0,sent:0,failed:0});
  const userIds=[...new Set(notifications.map(n=>n.user_id))];
  const subscriptions=await db.from("family_push_subscriptions")
     .select("id,household_id,user_id,endpoint,p256dh,auth").in("user_id",userIds).limit(300);
  if(subscriptions.error)return json({error:"Unable to load subscriptions"},500);
  let attempted=0,sent=0,failed=0;
  const work: Array<{notification:any,subscription:any}>=[];
  for(const n of notifications)for(const s of subscriptions.data||[]){
    if(s.household_id===n.household_id&&s.user_id===n.user_id)
       work.push({notification:n,subscription:s});
  }
  const authCache=new Map<string,string>();
  let cursor=0;
  const workers=Array.from({length:Math.min(6,work.length)},()=> (async()=>{
    for(;;){
      const i=cursor++;if(i>=work.length)break;
      const {notification:n,subscription:s}=work[i];
      const claimed=await db.rpc("family_claim_push_delivery",{p_notification:n.id,p_subscription:s.id});
      if(claimed.error||!claimed.data)continue;
      attempted++;
      let code=0,state="retry";
      try{
        const u=new URL(s.endpoint);
        if(u.protocol!=="https:"||s.endpoint.length>2048)throw Error("Invalid endpoint");
        let signed=authCache.get(u.origin);
        if(!signed){signed=await authorization(s.endpoint,vapid);authCache.set(u.origin,signed);}
        const response=await fetch(s.endpoint,{method:"POST",headers:{
          "TTL":"240","Urgency":"normal","Authorization":signed
        },signal:AbortSignal.timeout(12000)});
        code=response.status;
        state=response.ok?"sent":(code===404||code===410)?"gone":"retry";
        if(response.ok)sent++;else failed++;
      }catch(e){failed++;console.warn("web push delivery failed",String(e).slice(0,160));}
      await db.from("family_push_deliveries")
        .update({state,http_status:code||null}).eq("notification_id",n.id).eq("subscription_id",s.id);
      if(state==="gone")await db.from("family_push_subscriptions").delete().eq("id",s.id);
    }
  })());
  await Promise.all(workers);
  return json({attempted,sent,failed});
});