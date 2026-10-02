import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

const COOKIE='mjm_fees_admin',SESSION_SECONDS=4*60*60,loginAttempts=new Map();
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'no-store',...headers}});
class FeesError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
function sanitizedMessage(error){let message=String(error?.message||error||'Unknown error');for(const name of ['ADMIN_PASSWORD','SHEET_SECRET','SHEET_WEBAPP_URL'])if(process.env[name])message=message.split(process.env[name]).join('[redacted]');return message.slice(0,500)}
const safeEqual=(left,right)=>{const a=createHash('sha256').update(String(left)).digest(),b=createHash('sha256').update(String(right)).digest();return timingSafeEqual(a,b)&&String(left).length===String(right).length};
function requireAdminConfig(){for(const name of ['ADMIN_PASSWORD','SHEET_WEBAPP_URL','SHEET_SECRET'])if(!process.env[name])throw new FeesError(503,'FEES_CONFIG_MISSING',`Fee service setup is incomplete. Configure ${name} on the server.`)}
function sign(payload){return createHmac('sha256',process.env.ADMIN_PASSWORD).update(payload).digest('base64url')}
function makeCookie(){const payload=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})).toString('base64url'),token=`${payload}.${sign(payload)}`;return`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`}
function clearCookie(){return`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
function hasSession(request){if(!process.env.ADMIN_PASSWORD)return false;const value=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);if(!value)return false;try{const[payload,signature,...rest]=decodeURIComponent(value).split('.');if(!payload||!signature||rest.length)return false;const expected=Buffer.from(sign(payload)),actual=Buffer.from(signature);if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return false;return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now()/1000}catch{return false}}
function checkOrigin(request){const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new FeesError(403,'ORIGIN_DENIED','This request origin is not allowed.')}
function requesterKey(request){return(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100)}
function rateLimitLogin(request){const key=requesterKey(request),now=Date.now(),entry=loginAttempts.get(key);if(entry&&entry.until>now&&entry.count>=10)throw new FeesError(429,'LOGIN_RATE_LIMIT','Too many attempts. Wait 15 minutes and try again.');const next=entry&&entry.until>now?entry:{count:0,until:now+15*60*1000};next.count++;loginAttempts.set(key,next);if(loginAttempts.size>5000)for(const stale of loginAttempts.keys())loginAttempts.delete(stale)}
function clearLoginAttempts(request){loginAttempts.delete(requesterKey(request))}
const text=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
const COURSES=new Set(['JEE','NEET','Foundation']),PAYMENT_MODES=new Set(['Cash','UPI','Card','Bank Transfer']);
function validateRecord(body){
  const studentName=text(body?.studentName,100),parentName=text(body?.parentName,100),phone=text(body?.phone,30),course=text(body?.course,30),batch=text(body?.batch,80),feePeriod=text(body?.feePeriod,50),collectedBy=text(body?.collectedBy,100),remarks=text(body?.remarks,500),date=text(body?.date,10),paymentMode=text(body?.paymentMode,30),amount=Number(body?.amount),balanceDue=body?.balanceDue===''||body?.balanceDue==null?0:Number(body.balanceDue);
  if(!studentName)throw new FeesError(400,'STUDENT_REQUIRED','Student name is required.');
  const phoneDigits=(phone.match(/[0-9]/g)||[]).length;if(!/^\+?[0-9-]+$/.test(phone)||phoneDigits<10||phoneDigits>15)throw new FeesError(400,'PHONE_INVALID','Enter 10 to 15 digits; only a leading + and hyphens are allowed.');
  if(!Number.isFinite(amount)||amount<=0||amount>99999999.99)throw new FeesError(400,'AMOUNT_INVALID','Enter a valid amount greater than zero.');
  if(!COURSES.has(course))throw new FeesError(400,'COURSE_INVALID','Select a valid course.');
  if(!PAYMENT_MODES.has(paymentMode))throw new FeesError(400,'PAYMENT_MODE_INVALID','Select a valid payment mode.');
  const parsedDate=new Date(`${date}T00:00:00.000Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==date)throw new FeesError(400,'DATE_INVALID','Select a valid collection date.');
  if(!Number.isFinite(balanceDue)||balanceDue<0||balanceDue>99999999.99)throw new FeesError(400,'BALANCE_INVALID','Enter a valid balance due.');
  return{date,studentName,parentName,phone,course,batch,feePeriod,amount:Number(amount.toFixed(2)),paymentMode,balanceDue:Number(balanceDue.toFixed(2)),collectedBy,remarks};
}
function getSheetUrl(){let url;try{url=new URL(process.env.SHEET_WEBAPP_URL)}catch{throw new FeesError(503,'SHEET_URL_INVALID','Configure a valid Apps Script web app URL.')};if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.includes('/macros/s/')||!url.pathname.endsWith('/exec'))throw new FeesError(503,'SHEET_URL_INVALID','Configure the HTTPS Apps Script /exec URL.');return url}
async function callSheet(method,{query={},body}={}){
  const url=getSheetUrl();if(method==='GET')url.searchParams.set('secret',process.env.SHEET_SECRET);for(const[key,value]of Object.entries(query))if(value)url.searchParams.set(key,value);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{method,headers:method==='POST'?{'content-type':'text/plain;charset=utf-8'}:undefined,body:method==='POST'?JSON.stringify({...body,secret:process.env.SHEET_SECRET}):undefined,signal:controller.signal,redirect:'follow'});
    const payload=await response.json().catch(()=>null);if(!response.ok||!payload||payload.ok!==true)throw new FeesError(502,'SHEET_REQUEST_FAILED',payload?.message||'Google Sheets did not confirm the request.');return payload;
  }catch(error){if(error instanceof FeesError)throw error;console.error('Fee Sheet request failed:',{name:String(error?.name||'Error'),message:sanitizedMessage(error)});throw new FeesError(502,'SHEET_UNAVAILABLE','Google Sheets is unavailable. No receipt was generated. Try again shortly.')}
  finally{clearTimeout(timer)}
}
export function logFeesError(label,error){console.error(label,{name:String(error?.name||'Error'),message:sanitizedMessage(error),...(error?.code?{code:String(error.code)}:{}),...(error?.status?{status:Number(error.status)}:{})})}
export async function handleFeesRequest(request){
  try{
    requireAdminConfig();const url=new URL(request.url),method=request.method,action=url.searchParams.get('action')||'';
    if(method==='POST'){
      checkOrigin(request);const body=await request.json().catch(()=>{throw new FeesError(400,'INVALID_JSON','The submitted form is invalid.')});
      if(action==='login'){
        rateLimitLogin(request);if(!safeEqual(body?.password,process.env.ADMIN_PASSWORD))throw new FeesError(401,'LOGIN_FAILED','Password does not match.');clearLoginAttempts(request);return json({ok:true},200,{'set-cookie':makeCookie()})
      }
      if(action==='logout')return json({ok:true},200,{'set-cookie':clearCookie()});
      if(!hasSession(request))throw new FeesError(401,'LOGIN_REQUIRED','Please enter the admin password again.');
      if(action!=='collect')throw new FeesError(404,'ACTION_NOT_FOUND','This fee action is not available.');
      const record=validateRecord(body),saved=await callSheet('POST',{body:record});if(!saved.receiptNo||!saved.record)throw new FeesError(502,'SHEET_SAVE_UNCONFIRMED','Google Sheets did not return a saved receipt. No receipt was generated.');return json({ok:true,receiptNo:saved.receiptNo,record:saved.record},201)
    }
    if(method==='GET'){
      if(!hasSession(request))throw new FeesError(401,'LOGIN_REQUIRED','Enter the admin password to view fee records.');
      if(action==='session')return json({ok:true});
      const search=text(url.searchParams.get('search'),100),date=text(url.searchParams.get('date'),10);if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new FeesError(400,'DATE_INVALID','Select a valid date filter.');const result=await callSheet('GET',{query:{search,date}});return json({ok:true,records:Array.isArray(result.records)?result.records:[]})
    }
    throw new FeesError(405,'METHOD_NOT_ALLOWED','Method not allowed.');
  }catch(error){if(error instanceof FeesError)return json({ok:false,code:error.code,message:error.message},error.status);logFeesError('Fees API error:',error);return json({ok:false,code:'FEES_SERVICE_ERROR',message:'The fee service is temporarily unavailable.'},500)}
}
