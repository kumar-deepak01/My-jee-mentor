import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {parsePhoneNumberFromString} from 'libphonenumber-js';

const COOKIE='mjm_fees_admin',SESSION_SECONDS=4*60*60,loginAttempts=new Map();
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'no-store',...headers}});
class FeesError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
function sanitizedMessage(error){let message=String(error?.message||error||'Unknown error');for(const name of ['ADMIN_PASSWORD','SHEET_SECRET','SHEET_WEBAPP_URL','STUDENTS_SCRIPT_URL','STUDENTS_SECRET'])if(process.env[name])message=message.split(process.env[name]).join('[redacted]');return message.slice(0,500)}

function getFeesAdminPassword(){
  const raw = process.env.ADMIN_PASSWORD;
  return typeof raw === 'string' ? raw.trim() : '';
}

function requireAdminConfig(){
  if(!getFeesAdminPassword())throw new FeesError(503,'FEES_CONFIG_MISSING','Fee service setup is incomplete. Configure ADMIN_PASSWORD on the server.');
  for(const name of ['SHEET_WEBAPP_URL','SHEET_SECRET'])if(!process.env[name])throw new FeesError(503,'FEES_CONFIG_MISSING',`Fee service setup is incomplete. Configure ${name} on the server.`);
}

function sign(payload){
  const password = getFeesAdminPassword();
  return createHmac('sha256',password).update(payload).digest('base64url');
}

function makeCookie(){
  const payload=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})).toString('base64url'),token=`${payload}.${sign(payload)}`;
  const isProd = process.env.NODE_ENV === 'production';
  return`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearCookie(){
  return`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function hasSession(request){
  const password = getFeesAdminPassword();
  if(!password)return false;
  const value=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  if(!value)return false;
  try{
    const[payload,signature,...rest]=decodeURIComponent(value).split('.');
    if(!payload||!signature||rest.length)return false;
    const expected=Buffer.from(sign(payload)),actual=Buffer.from(signature);
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return false;
    return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now()/1000;
  }catch{
    return false;
  }
}

function verifyFeesPassword(candidate){
  if(typeof candidate !== 'string') return false;
  const cand = candidate.trim();
  const pass = getFeesAdminPassword();
  if(!cand || !pass) return false;
  const a = createHash('sha256').update(cand).digest();
  const b = createHash('sha256').update(pass).digest();
  return timingSafeEqual(a, b);
}

function checkOrigin(request){
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new FeesError(403,'ORIGIN_DENIED','This request origin is not allowed.');
}

function requesterKey(request){
  return(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100);
}

function rateLimitLogin(request){
  const key=requesterKey(request),now=Date.now(),entry=loginAttempts.get(key);
  if(entry&&entry.until>now&&entry.count>=10)throw new FeesError(429,'LOGIN_RATE_LIMIT','Too many attempts. Wait 15 minutes and try again.');
  const next=entry&&entry.until>now?entry:{count:0,until:now+15*60*1000};
  next.count++;
  loginAttempts.set(key,next);
  if(loginAttempts.size>5000)for(const stale of loginAttempts.keys())loginAttempts.delete(stale);
}

function clearLoginAttempts(request){
  loginAttempts.delete(requesterKey(request));
}

const text=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
const COURSES=new Set(['JEE','NEET','Foundation']),PAYMENT_MODES=new Set(['Cash','UPI','Card','Bank Transfer']);

export function validateRecord(body){
  const studentName=text(body?.studentName,100),parentName=text(body?.parentName,100),rawPhone=text(body?.phone,30),course=text(body?.course,30),batch=text(body?.batch,80),feePeriod=text(body?.feePeriod,50),collectedBy=text(body?.collectedBy,100),remarks=text(body?.remarks,500),date=text(body?.date,10),paymentMode=text(body?.paymentMode,30),amount=Number(body?.amount),balanceDue=body?.balanceDue===''||body?.balanceDue==null?0:Number(body.balanceDue);
  if(!studentName)throw new FeesError(400,'STUDENT_REQUIRED','Student name is required.');

  const countryIso = text(body?.phoneCountry || body?.countryIso || 'IN', 10).toUpperCase() || 'IN';
  let normalizedPhone = '';
  if (rawPhone) {
    try {
      let parsed = parsePhoneNumberFromString(rawPhone);
      if (!parsed || !parsed.isValid()) {
        parsed = parsePhoneNumberFromString(rawPhone, countryIso);
      }
      if (parsed && parsed.isValid()) {
        normalizedPhone = parsed.format('E.164');
      }
    } catch {}
    if (!normalizedPhone) {
      const digits = (rawPhone.match(/[0-9]/g) || []).length;
      if (/^\+?[0-9\s-]+$/.test(rawPhone) && digits >= 10 && digits <= 15) {
        normalizedPhone = rawPhone.startsWith('+') ? rawPhone.replace(/[\s-]/g, '') : `+91${rawPhone.replace(/[\s-]/g, '')}`;
      }
    }
  }
  if (!normalizedPhone) throw new FeesError(400,'PHONE_INVALID','Enter a valid international phone number with country code (e.g. +91 98765 43210).');
  const phone = normalizedPhone;
  if(!Number.isFinite(amount)||amount<=0||amount>99999999.99)throw new FeesError(400,'AMOUNT_INVALID','Enter a valid amount greater than zero.');
  if(!COURSES.has(course))throw new FeesError(400,'COURSE_INVALID','Select a valid course.');
  if(!PAYMENT_MODES.has(paymentMode))throw new FeesError(400,'PAYMENT_MODE_INVALID','Select a valid payment mode.');
  const parsedDate=new Date(`${date}T00:00:00.000Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==date)throw new FeesError(400,'DATE_INVALID','Select a valid collection date.');
  if(!Number.isFinite(balanceDue)||balanceDue<0||balanceDue>99999999.99)throw new FeesError(400,'BALANCE_INVALID','Enter a valid balance due.');
  return{date,studentName,parentName,phone,course,batch,feePeriod,amount:Number(amount.toFixed(2)),paymentMode,balanceDue:Number(balanceDue.toFixed(2)),collectedBy,remarks};
}

function getSheetUrl(){
  let url;
  try{url=new URL(process.env.SHEET_WEBAPP_URL)}catch{throw new FeesError(503,'SHEET_URL_INVALID','Configure a valid Apps Script web app URL.')};
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.includes('/macros/s/')||!url.pathname.endsWith('/exec'))throw new FeesError(503,'SHEET_URL_INVALID','Configure the HTTPS Apps Script /exec URL.');
  return url;
}

async function callSheet(method,{query={},body}={}){
  const url=getSheetUrl();
  if(method==='GET')url.searchParams.set('secret',process.env.SHEET_SECRET);
  for(const[key,value]of Object.entries(query))if(value)url.searchParams.set(key,value);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{method,headers:method==='POST'?{'content-type':'text/plain;charset=utf-8'}:undefined,body:method==='POST'?JSON.stringify({...body,secret:process.env.SHEET_SECRET}):undefined,signal:controller.signal,redirect:'follow'});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||!payload||payload.ok!==true)throw new FeesError(502,'SHEET_REQUEST_FAILED',payload?.message||'Google Sheets did not confirm the request.');
    return payload;
  }catch(error){
    if(error instanceof FeesError)throw error;
    console.error('Fee Sheet request failed:',{name:String(error?.name||'Error'),message:sanitizedMessage(error)});
    throw new FeesError(502,'SHEET_UNAVAILABLE','Google Sheets is unavailable. No receipt was generated. Try again shortly.');
  }finally{
    clearTimeout(timer);
  }
}

/**
 * Direct read helper for Finance summary calculations.
 * Uses SHEET_SECRET to read fee receipts without user session crossing.
 */
export async function fetchRawFeeRecords(){
  if(!process.env.SHEET_WEBAPP_URL || !process.env.SHEET_SECRET) return [];
  try{
    const result=await callSheet('GET',{query:{}});
    return Array.isArray(result?.records)?result.records:[];
  }catch(err){
    console.warn('fetchRawFeeRecords failed:', err.message);
    return [];
  }
}

let studentsCache = null;
let studentsCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function fetchStudentsFeed(force = false) {
  if (!force && studentsCache && (Date.now() - studentsCacheTime < CACHE_TTL_MS)) {
    return studentsCache;
  }

  const scriptUrl = process.env.STUDENTS_SCRIPT_URL;
  const scriptSecret = process.env.STUDENTS_SECRET;

  if (!scriptUrl || !scriptSecret) {
    if (process.env.DEV_MOCK_STUDENTS === 'true') {
      return { ok: true, count: 0, generatedAt: new Date().toISOString(), students: [], isMock: true };
    }
    return {
      ok: false,
      error: 'STUDENTS_CONFIG_MISSING',
      message: 'Students feed setup is incomplete. Configure STUDENTS_SCRIPT_URL and STUDENTS_SECRET on the server.'
    };
  }

  let url;
  try {
    url = new URL(scriptUrl);
  } catch {
    return { ok: false, error: 'STUDENTS_URL_INVALID', message: 'Configure a valid HTTPS Google Apps Script URL for students feed.' };
  }

  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'students', secret: scriptSecret }),
      signal: controller.signal,
      redirect: 'follow'
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      return {
        ok: false,
        error: payload?.error || 'STUDENTS_FEED_FAILED',
        message: payload?.message || 'Google Sheets students feed did not confirm the request.'
      };
    }
    studentsCache = {
      ok: true,
      count: payload.count || (Array.isArray(payload.students) ? payload.students.length : 0),
      generatedAt: payload.generatedAt || new Date().toISOString(),
      students: Array.isArray(payload.students) ? payload.students : []
    };
    studentsCacheTime = Date.now();
    return studentsCache;
  } catch (error) {
    console.error('Students Sheet feed request failed:', { name: String(error?.name || 'Error'), message: sanitizedMessage(error) });
    return {
      ok: false,
      error: 'STUDENTS_FEED_UNAVAILABLE',
      message: 'Students Google Sheet is temporarily unavailable. Try again shortly.'
    };
  } finally {
    clearTimeout(timer);
  }
}

export function logFeesError(label,error){
  console.error(label,{name:String(error?.name||'Error'),message:sanitizedMessage(error),...(error?.code?{code:String(error.code)}:{}),...(error?.status?{status:Number(error.status)}:{})});
}

export async function handleFeesRequest(request){
  try{
    requireAdminConfig();
    const url=new URL(request.url),method=request.method,action=url.searchParams.get('action')||'';
    if(method==='POST'){
      checkOrigin(request);
      const body=await request.json().catch(()=>{throw new FeesError(400,'INVALID_JSON','The submitted form is invalid.')});
      if(action==='login'){
        rateLimitLogin(request);
        if(!verifyFeesPassword(body?.password))throw new FeesError(401,'LOGIN_FAILED','Password does not match.');
        clearLoginAttempts(request);
        return json({ok:true},200,{'set-cookie':makeCookie()});
      }
      if(action==='logout')return json({ok:true},200,{'set-cookie':clearCookie()});
      if(!hasSession(request))throw new FeesError(401,'LOGIN_REQUIRED','Please enter the admin password again.');
      if(action!=='collect')throw new FeesError(404,'ACTION_NOT_FOUND','This fee action is not available.');
      const record=validateRecord(body);
      let saved;
      try{
        saved=await callSheet('POST',{body:record});
      }catch(sheetErr){
        // If the deployed Apps Script fails on numbers starting with '+' due to cleanCell quote prepending,
        // retry with digits-only phone to guarantee backward-compatibility with live Google Apps Script.
        if(record.phone&&record.phone.startsWith('+')){
          const digitsPhone=record.phone.replace(/\D/g,'');
          try{
            saved=await callSheet('POST',{body:{...record,phone:digitsPhone}});
          }catch(retryErr){
            throw sheetErr;
          }
        }else{
          throw sheetErr;
        }
      }
      if(!saved||!saved.receiptNo||!saved.record)throw new FeesError(502,'SHEET_SAVE_UNCONFIRMED','Google Sheets did not return a saved receipt. No receipt was generated.');
      return json({ok:true,receiptNo:saved.receiptNo,record:{...saved.record,phone:record.phone}},201);
    }
    if(method==='GET'){
      if(!hasSession(request))throw new FeesError(401,'LOGIN_REQUIRED','Enter the admin password to view fee records.');
      if(action==='session')return json({ok:true});
      if(action==='students'){
        const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
        const feed = await fetchStudentsFeed(force);
        if(!feed.ok) return json(feed, feed.error === 'STUDENTS_CONFIG_MISSING' ? 503 : 502);
        return json(feed, 200);
      }
      const search=text(url.searchParams.get('search'),100),date=text(url.searchParams.get('date'),10);
      if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new FeesError(400,'DATE_INVALID','Select a valid date filter.');
      const result=await callSheet('GET',{query:{search,date}});
      return json({ok:true,records:Array.isArray(result?.records)?result.records:[]});
    }
    throw new FeesError(405,'METHOD_NOT_ALLOWED','Method not allowed.');
  }catch(error){
    if(error instanceof FeesError)return json({ok:false,code:error.code,message:error.message},error.status);
    logFeesError('Fees API error:',error);
    return json({ok:false,code:'FEES_SERVICE_ERROR',message:'The fee service is temporarily unavailable.'},500);
  }
}
