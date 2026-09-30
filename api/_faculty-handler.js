import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {BlobPreconditionFailedError,get,put} from '@vercel/blob';

const COOKIE='mjm_faculty_session';
const SESSION_SECONDS=7*24*60*60;
const RESOURCE_PATH='mjm-data/faculty-resources.json';
const LOGIN_LOCK_PATH='mjm-data/faculty-login-locks.json';
const TYPES=new Set(['PDF','PPT','Image','Doc']);

class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'cache-control':'no-store',...headers}});

function requireConfig(names){const missing=names.filter(name=>!process.env[name]||(name==='FACULTY_SESSION_SECRET'&&process.env[name].length<32));for(const name of missing)console.error(`Faculty configuration missing: ${name}`);if(missing.length)throw new ApiError(503,'FACULTY_CONFIG_MISSING','Faculty service is not configured yet.')}
function blobConfig(){requireConfig(['BLOB_READ_WRITE_TOKEN'])}
function facultyConfig(){requireConfig(['FACULTY_ID','FACULTY_PASSWORD','FACULTY_SESSION_SECRET','BLOB_READ_WRITE_TOKEN'])}
function sanitizedErrorMessage(error){let message=String(error?.message||error||'Unknown error');for(const name of ['BLOB_READ_WRITE_TOKEN','FACULTY_ID','FACULTY_PASSWORD','FACULTY_SESSION_SECRET']){const secret=process.env[name];if(secret)message=message.split(secret).join('[redacted]')}return message.slice(0,1000)}
export function logFacultyError(label,error){console.error(label,{name:String(error?.name||'Error'),message:sanitizedErrorMessage(error),...(error?.code?{code:String(error.code)}:{}),...(error?.status?{status:Number(error.status)}:{})})}
function safeEqual(left,right){
  const a=createHash('sha256').update(String(left)).digest(),b=createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(a,b)&&String(left).length===String(right).length;
}
function encode(value){return Buffer.from(value).toString('base64url')}
function sign(payload){return createHmac('sha256',process.env.FACULTY_SESSION_SECRET).update(payload).digest('base64url')}
function makeSession(){const payload=encode(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_SECONDS}));return `${payload}.${sign(payload)}`}
function cookie(token,age=SESSION_SECONDS){return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
function readSession(request){
  if(!process.env.FACULTY_SESSION_SECRET)return false;
  const cookieValue=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  if(!cookieValue)return false;
  let token;try{token=decodeURIComponent(cookieValue)}catch{return false}
  const [payload,signature,...extra]=token.split('.');if(!payload||!signature||extra.length)return false;
  const expected=Buffer.from(sign(payload)),received=Buffer.from(signature);
  if(expected.length!==received.length||!timingSafeEqual(expected,received))return false;
  try{return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now()/1000}catch{return false}
}
function requireSession(request){if(!readSession(request))throw new ApiError(401,'LOGIN_REQUIRED','Log in to manage resources.')}
function enforceOrigin(request){const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new ApiError(403,'ORIGIN_DENIED','Request origin is not allowed.')}
function requesterIp(request){return(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100)}
function lockKey(ip,id){return createHmac('sha256',process.env.FACULTY_SESSION_SECRET).update(`${ip}\0${id}`).digest('hex')}
async function updateLoginAttempt(key,valid){
  for(let attempt=0;attempt<5;attempt++){
    const stored=await get(LOGIN_LOCK_PATH,{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,useCache:false});let locks={},etag=null;
    if(stored){if(stored.statusCode!==200||!stored.stream)throw new ApiError(503,'LOGIN_LOCK_READ_FAILED','Could not verify the login attempt limit.');try{locks=JSON.parse(await new Response(stored.stream).text())}catch{throw new ApiError(503,'LOGIN_LOCK_DATA_INVALID','Login protection data is invalid.')}if(!locks||Array.isArray(locks)||typeof locks!=='object')throw new ApiError(503,'LOGIN_LOCK_DATA_INVALID','Login protection data is invalid.');etag=stored.blob.etag}
    const now=Date.now();for(const[entryKey,entry]of Object.entries(locks))if(!entry||entry.expiresAt<now)delete locks[entryKey];
    const current=locks[key];if(current?.lockedUntil>now)return{locked:true};
    if(valid){delete locks[key];if(!current)return{locked:false};}
    else{
      const entry=current&&current.windowUntil>now?current:{count:0,windowUntil:now+15*60*1000,lockedUntil:0,expiresAt:now+15*60*1000};
      entry.count++;entry.expiresAt=entry.count>=5?now+15*60*1000:entry.windowUntil;
      if(entry.count>=5)entry.lockedUntil=entry.expiresAt;
      locks[key]=entry;
    }
    if(Object.keys(locks).length>5000)for(const oldKey of Object.keys(locks).slice(0,Object.keys(locks).length-5000))delete locks[oldKey];
    try{await put(LOGIN_LOCK_PATH,JSON.stringify(locks),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60,allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{})});return{locked:false,blocked:Boolean(!valid&&locks[key]?.lockedUntil>now)}}
    catch(error){const collision=!etag&&/already.?exists|precondition/i.test(String(error?.name||error?.message));if((error instanceof BlobPreconditionFailedError||collision)&&attempt<4)continue;throw error}
  }
  throw new ApiError(409,'LOGIN_LOCK_CONFLICT','Could not safely update the login attempt limit. Try again.');
}
function validateDriveLink(value){
  if(typeof value!=='string'||value.length>2048)throw new ApiError(400,'INVALID_LINK','Enter a valid Google Drive link.');
  let parsed;try{parsed=new URL(value.trim())}catch{throw new ApiError(400,'INVALID_LINK','Enter a valid Google Drive link.')}
  if(parsed.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(parsed.hostname)||parsed.username||parsed.password||parsed.port)throw new ApiError(400,'INVALID_LINK','Only https links from drive.google.com or docs.google.com are allowed.');
  const match=parsed.pathname.match(/\/(?:file\/d|(?:presentation|document|spreadsheets)\/d|drive\/(?:u\/\d+\/)?folders)\/([A-Za-z0-9_-]+)/);
  const driveId=match?.[1]||parsed.searchParams.get('id')||null;
  if(driveId&&!/^[A-Za-z0-9_-]{1,200}$/.test(driveId))throw new ApiError(400,'INVALID_LINK','The Drive file ID is not valid.');
  const folderOnly=/\/drive\/(?:u\/\d+\/)?folders\//.test(parsed.pathname)||(!driveId&&/\/drive\/(?:my-drive|shared-with-me)/.test(parsed.pathname));
  if(!driveId&&!folderOnly)throw new ApiError(400,'INVALID_LINK','This Drive link does not contain a supported file or folder ID.');
  return{url:parsed.toString(),driveId,folderOnly};
}
function validateResource(body){
  const title=typeof body?.title==='string'?body.title.trim().replace(/[\u0000-\u001f\u007f]/g,''):'';
  if(!title||title.length>80)throw new ApiError(400,'INVALID_TITLE','Title is required and must be 80 characters or fewer.');
  const type=String(body?.type||'');if(!TYPES.has(type))throw new ApiError(400,'INVALID_TYPE','Choose PDF, PPT, Image or Doc.');
  const link=validateDriveLink(body?.url);
  return{id:randomUUID(),title,type,driveId:link.driveId,url:link.url,createdAt:new Date().toISOString(),folderOnly:link.folderOnly};
}
async function readResources(){
  const stored=await get(RESOURCE_PATH,{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,useCache:false});
  if(!stored)return{items:[],etag:null};
  if(stored.statusCode!==200||!stored.stream)throw new ApiError(503,'RESOURCE_STORE_READ_FAILED','Could not read the resource list.');
  let items;try{items=JSON.parse(await new Response(stored.stream).text())}catch{throw new ApiError(503,'RESOURCE_STORE_INVALID','The stored resource list is invalid.')}
  if(!Array.isArray(items))throw new ApiError(503,'RESOURCE_STORE_INVALID','The stored resource list is invalid.');
  return{items,etag:stored.blob.etag};
}
async function writeResources(items,etag){
  return put(RESOURCE_PATH,JSON.stringify(items),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60,allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{})});
}
async function mutateResources(mutator){
  for(let attempt=0;attempt<5;attempt++){
    const{items,etag}=await readResources(),next=mutator([...items]);
    try{await writeResources(next,etag);return next}
    catch(error){const collision=!etag&&/already.?exists|precondition/i.test(String(error?.name||error?.message));if((error instanceof BlobPreconditionFailedError||collision)&&attempt<4)continue;throw error}
  }
  throw new ApiError(409,'RESOURCE_CONFLICT','The list changed at the same time. Please try again.');
}
function publicResource(item){return{...item,previewUrl:item.folderOnly?null:`https://drive.google.com/file/d/${encodeURIComponent(item.driveId)}/preview`,thumbnailUrl:item.folderOnly?null:`https://drive.google.com/thumbnail?id=${encodeURIComponent(item.driveId)}&sz=w400`}}

export async function handleFacultyRequest(request){
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')||'';
    if(request.method==='GET'&&action==='resources'){blobConfig();const{items}=await readResources();return json({ok:true,resources:items.map(publicResource)});}
    if(request.method==='GET'&&action==='me')return json({ok:readSession(request)});
    if(!['POST','PUT','PATCH'].includes(request.method))return json({ok:false,code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'},405);
    enforceOrigin(request);
    if(action==='logout'&&request.method==='POST')return json({ok:true},200,{'set-cookie':cookie('',0)});
    facultyConfig();
    if(action==='login'&&request.method==='POST'){
      const body=await request.json(),id=typeof body?.id==='string'?body.id.slice(0,200):'',password=typeof body?.password==='string'?body.password.slice(0,500):'';
      const key=lockKey(requesterIp(request),id);
      const idOk=safeEqual(id,process.env.FACULTY_ID),passwordOk=safeEqual(password,process.env.FACULTY_PASSWORD),valid=idOk&&passwordOk;
      const throttle=await updateLoginAttempt(key,valid);
      if(throttle.locked||throttle.blocked)throw new ApiError(429,'LOGIN_LOCKED','Five incorrect attempts. Try again in 15 minutes.');
      if(!valid)throw new ApiError(401,'INVALID_CREDENTIALS','ID or password is incorrect.');
      return json({ok:true},200,{'set-cookie':cookie(makeSession())});
    }
    requireSession(request);
    if(action==='add'&&request.method==='POST'){
      const item=validateResource(await request.json());
      const items=await mutateResources(current=>{
        if(current.some(existing=>existing.driveId&&item.driveId?existing.driveId===item.driveId:existing.url===item.url))throw new ApiError(409,'DUPLICATE_RESOURCE','This Drive link has already been added.');
        return[item,...current];
      });
      return json({ok:true,resource:publicResource(items[0]),resources:items.map(publicResource)},201);
    }
    if(action==='delete'&&request.method==='POST'){
      const body=await request.json(),id=typeof body?.id==='string'?body.id:'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_RESOURCE_ID','Resource not found.');
      let removed=false;const items=await mutateResources(current=>current.filter(item=>{if(item.id===id){removed=true;return false}return true}));
      if(!removed)throw new ApiError(404,'RESOURCE_NOT_FOUND','Resource not found.');
      return json({ok:true,resources:items.map(publicResource)});
    }
    if(action==='update'&&['PUT','PATCH'].includes(request.method)){
      const body=await request.json(),id=typeof body?.id==='string'?body.id:'';
      if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_RESOURCE_ID','Resource not found.');
      const validated=validateResource(body),updatedAt=new Date().toISOString();
      let updated=false;
      const items=await mutateResources(current=>{
        const existing=current.find(item=>item.id===id);
        if(!existing)throw new ApiError(404,'RESOURCE_NOT_FOUND','Resource not found.');
        if(current.some(item=>item.id!==id&&(item.driveId&&validated.driveId?item.driveId===validated.driveId:item.url===validated.url)))throw new ApiError(409,'DUPLICATE_RESOURCE','This Drive link has already been added.');
        updated=true;
        return current.map(item=>item.id===id?{...item,title:validated.title,type:validated.type,driveId:validated.driveId,url:validated.url,folderOnly:validated.folderOnly,updatedAt}:item);
      });
      if(!updated)throw new ApiError(404,'RESOURCE_NOT_FOUND','Resource not found.');
      return json({ok:true,resource:publicResource(items.find(item=>item.id===id)),resources:items.map(publicResource)});
    }
    throw new ApiError(404,'ACTION_NOT_FOUND','This faculty action is not available.');
  }catch(error){
    if(error instanceof ApiError)return json({ok:false,code:error.code,message:error.message},error.status);
    logFacultyError('Faculty resource API error:',error);
    return json({ok:false,code:'SERVICE_ERROR',message:'The faculty service is temporarily unavailable.'},500);
  }
}
