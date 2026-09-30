import {createHmac,randomBytes,randomInt,randomUUID,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import nodemailer from 'nodemailer';
import {del,put} from '@vercel/blob';

const scrypt=promisify(scryptCallback);
const SESSION_COOKIE='mjm_faculty_session';
const SESSION_TTL=7*24*60*60;
const OTP_TTL_MS=10*60*1000;
const MAX_FILE_BYTES=4*1024*1024;
const allowedTypes={
  '.pdf':'application/pdf',
  '.ppt':'application/vnd.ms-powerpoint',
  '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.png':'image/png'
};
const rateWindow=new Map();
let pool;
let schemaPromise;
let mailer;

class HttpError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'no-store',...headers}});
const normalizeEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
const safeFilename=value=>String(value||'resource').normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'resource';

function envReady(){
  if(!process.env.DATABASE_URL)throw new HttpError(503,'DATABASE_NOT_CONFIGURED','Faculty storage is not configured yet.');
  if(!process.env.FACULTY_SESSION_SECRET||process.env.FACULTY_SESSION_SECRET.length<32)throw new HttpError(503,'SESSION_NOT_CONFIGURED','Faculty login is not configured yet.');
}

async function db(){
  envReady();
  if(!pool){
    const PoolCtor=(await import('pg')).Pool;
    pool=new PoolCtor({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:10000});
  }
  schemaPromise??=pool.query(`
    CREATE TABLE IF NOT EXISTS faculty_users(
      id BIGSERIAL PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS faculty_otps(
      email TEXT PRIMARY KEY,otp_hash TEXT NOT NULL,password_hash TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS faculty_resources(
      id UUID PRIMARY KEY,title TEXT NOT NULL,file_url TEXT NOT NULL,file_name TEXT NOT NULL,mime_type TEXT NOT NULL,file_size BIGINT NOT NULL,source TEXT NOT NULL,created_by TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS faculty_resources_created_idx ON faculty_resources(created_at DESC);
  `).catch(error=>{schemaPromise=undefined;throw error});
  await schemaPromise;
  return pool;
}

function enforceOrigin(request){
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new HttpError(403,'ORIGIN_NOT_ALLOWED','Request origin was not accepted.');
}

function rateLimit(key,limit,windowMs){
  const now=Date.now();let item=rateWindow.get(key);
  if(!item||item.until<=now){item={count:0,until:now+windowMs};rateWindow.set(key,item)}
  if(item.count>=limit)throw new HttpError(429,'RATE_LIMITED','Too many attempts. Please wait and try again.');
  item.count+=1;
  if(rateWindow.size>3000)for(const [stored,value] of rateWindow)if(value.until<=now)rateWindow.delete(stored);
}

function requiredEmail(value){
  const email=normalizeEmail(value);
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'INVALID_EMAIL','Enter a valid email address.');
  const allowed=(process.env.FACULTY_ALLOWED_EMAILS||'').split(',').map(normalizeEmail).filter(Boolean);
  if(process.env.NODE_ENV==='production'&&!allowed.length)throw new HttpError(503,'FACULTY_ALLOWLIST_REQUIRED','Faculty email access has not been configured yet. Contact the site administrator.');if(allowed.length&&!allowed.includes(email))throw new HttpError(403,'EMAIL_NOT_ALLOWED','This email is not approved for faculty access.');
  return email;
}

function requiredPassword(value){
  if(typeof value!=='string'||value.length<10||value.length>128)throw new HttpError(400,'INVALID_PASSWORD','Password must be 10 to 128 characters long.');
  return value;
}

async function hashPassword(password){
  const salt=randomBytes(16).toString('hex');
  const derived=await scrypt(password,salt,64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
}

async function verifyPassword(password,stored){
  const [salt,hash]=String(stored||'').split(':');
  if(!salt||!hash)return false;
  const derived=Buffer.from(await scrypt(password,salt,64));
  const expected=Buffer.from(hash,'hex');
  return expected.length===derived.length&&timingSafeEqual(expected,derived);
}

function otpDigest(email,code){return createHmac('sha256',process.env.FACULTY_SESSION_SECRET).update(`${email}:${code}`).digest('hex')}
function makeSession(email){
  const payload=Buffer.from(JSON.stringify({email,exp:Math.floor(Date.now()/1000)+SESSION_TTL})).toString('base64url');
  const signature=createHmac('sha256',process.env.FACULTY_SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readCookie(request,name){
  const cookies=request.headers.get('cookie')||'';
  const match=cookies.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${name}=`));
  return match?decodeURIComponent(match.slice(name.length+1)):'';
}

function facultySession(request){
  envReady();
  const [payload,signature,...rest]=readCookie(request,SESSION_COOKIE).split('.');
  if(!payload||!signature||rest.length)return null;
  const expected=createHmac('sha256',process.env.FACULTY_SESSION_SECRET).update(payload).digest();
  let received;
  try{received=Buffer.from(signature,'base64url')}catch{return null}
  if(received.length!==expected.length||!timingSafeEqual(received,expected))return null;
  try{const decoded=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(decoded.exp<=Date.now()/1000)return null;return{email:decoded.email}}catch{return null}
}

function sessionCookie(request,token,maxAge=SESSION_TTL){
  const secure=new URL(request.url).protocol==='https:'||process.env.NODE_ENV==='production';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}

function getMailer(){
  const user=process.env.SMTP_USER||'';
  const password=process.env.SMTP_PASS||'';
  if(!user||!password)throw new HttpError(503,'EMAIL_NOT_CONFIGURED','Faculty email verification is not configured yet.');
  mailer??=nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.gmail.com',port:Number(process.env.SMTP_PORT)||465,secure:(process.env.SMTP_SECURE||'true').toLowerCase()==='true',auth:{user,pass:password},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000});
  return mailer;
}

async function sendSignupOtp(email,passwordHash){
  rateLimit(`signup:${email}`,3,60*60*1000);
  const database=await db();
  const exists=await database.query('SELECT id FROM faculty_users WHERE email=$1',[email]);
  if(exists.rowCount)throw new HttpError(409,'ACCOUNT_EXISTS','An account already exists. Please log in.');
  const code=String(randomInt(100000,1000000));
  await database.query(`INSERT INTO faculty_otps(email,otp_hash,password_hash,expires_at,attempts,created_at)
    VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes',0,NOW())
    ON CONFLICT(email) DO UPDATE SET otp_hash=EXCLUDED.otp_hash,password_hash=EXCLUDED.password_hash,expires_at=EXCLUDED.expires_at,attempts=0,created_at=NOW()`,[email,otpDigest(email,code),passwordHash]);
  try{
    await getMailer().sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:email,subject:'My JEE Mentor faculty email verification',text:`Your faculty account verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,html:`<div style="font-family:Arial,sans-serif;color:#202633"><h2>Verify your faculty email</h2><p>Use this one-time code to create your My JEE Mentor faculty account:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px;color:#c94d00">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`});
  }catch(error){await database.query('DELETE FROM faculty_otps WHERE email=$1',[email]);console.error('Faculty verification email failed:',error?.name||'Error');throw new HttpError(503,'EMAIL_DELIVERY_FAILED','Could not send the verification email. Check the email service setup.');}
}

async function verifySignupOtp(email,code,request){
  if(!/^\d{6}$/.test(String(code||'')))throw new HttpError(400,'INVALID_OTP','Enter the 6-digit code from your email.');
  const database=await db();
  const result=await database.query('SELECT otp_hash,password_hash,expires_at,attempts FROM faculty_otps WHERE email=$1',[email]);
  const row=result.rows[0];
  if(!row)throw new HttpError(400,'OTP_EXPIRED','Request a new verification code.');
  if(new Date(row.expires_at).getTime()<Date.now()){await database.query('DELETE FROM faculty_otps WHERE email=$1',[email]);throw new HttpError(400,'OTP_EXPIRED','Verification code expired. Request a new one.');}
  if(row.attempts>=5){await database.query('DELETE FROM faculty_otps WHERE email=$1',[email]);throw new HttpError(429,'OTP_ATTEMPTS_EXCEEDED','Too many incorrect codes. Request a new one.');}
  const expected=Buffer.from(row.otp_hash,'hex'),provided=Buffer.from(otpDigest(email,String(code)),'hex');
  if(expected.length!==provided.length||!timingSafeEqual(expected,provided)){
    await database.query('UPDATE faculty_otps SET attempts=attempts+1 WHERE email=$1',[email]);
    throw new HttpError(400,'INVALID_OTP','That verification code is not correct.');
  }
  await database.query('INSERT INTO faculty_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[email,row.password_hash]);
  await database.query('DELETE FROM faculty_otps WHERE email=$1',[email]);
  return json({ok:true,email},200,{'set-cookie':sessionCookie(request,makeSession(email))});
}

async function login(email,password,request){
  const database=await db();
  const result=await database.query('SELECT password_hash FROM faculty_users WHERE email=$1',[email]);
  if(!result.rowCount||!await verifyPassword(password,result.rows[0].password_hash))throw new HttpError(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
  return json({ok:true,email},200,{'set-cookie':sessionCookie(request,makeSession(email))});
}

function validateTitle(value){
  const title=typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,120):'';
  if(title.length<2)throw new HttpError(400,'INVALID_TITLE','Enter a title with at least 2 characters.');
  return title;
}

function validateDriveUrl(value){
  let url;try{url=new URL(String(value||''))}catch{throw new HttpError(400,'INVALID_DRIVE_URL','Paste a valid Google Drive share link.')}
  if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname)||url.username||url.password)throw new HttpError(400,'INVALID_DRIVE_URL','Use a Google Drive or Google Docs share link.');
  return url.toString();
}

function publicResource(row){return{id:row.id,title:row.title,url:row.file_url,fileName:row.file_name,mimeType:row.mime_type,fileSize:Number(row.file_size),source:row.source,createdAt:row.created_at}}

async function saveDriveResource(request,form){
  const session=facultySession(request);if(!session)throw new HttpError(401,'UNAUTHORIZED','Please log in to publish a resource.');
  const title=validateTitle(form.title),url=validateDriveUrl(form.url),database=await db(),id=randomUUID();
  const result=await database.query(`INSERT INTO faculty_resources(id,title,file_url,file_name,mime_type,file_size,source,created_by)
    VALUES($1,$2,$3,$4,$5,0,'drive',$6) RETURNING *`,[id,title,url,title,'application/vnd.google-apps.document',session.email]);
  return json({ok:true,resource:publicResource(result.rows[0])},201);
}

async function uploadLocalResource(request,form){
  const session=facultySession(request);if(!session)throw new HttpError(401,'UNAUTHORIZED','Please log in to upload a resource.');
  const file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function')throw new HttpError(400,'FILE_REQUIRED','Choose a PDF, PowerPoint, JPEG or PNG file.');
  if(!file.size||file.size>MAX_FILE_BYTES)throw new HttpError(413,'FILE_TOO_LARGE','Files must be smaller than 4 MB.');
  const fileName=safeFilename(file.name),extension=fileName.slice(fileName.lastIndexOf('.')).toLowerCase(),mimeType=allowedTypes[extension];
  if(!mimeType||file.type&&file.type!==mimeType)throw new HttpError(415,'FILE_TYPE_NOT_ALLOWED','Only PDF, PPT, PPTX, JPEG and PNG files are allowed.');
  const title=validateTitle(form.get('title'));
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new HttpError(503,'BLOB_NOT_CONFIGURED','File storage is not configured yet.');
  const id=randomUUID();
  const blob=await put(`faculty-resources/${id}-${fileName}`,new Uint8Array(await file.arrayBuffer()),{access:'public',addRandomSuffix:true,contentType:mimeType,token:process.env.BLOB_READ_WRITE_TOKEN});
  try{
    const database=await db();
    const result=await database.query(`INSERT INTO faculty_resources(id,title,file_url,file_name,mime_type,file_size,source,created_by)
      VALUES($1,$2,$3,$4,$5,$6,'upload',$7) RETURNING *`,[id,title,blob.url,fileName,mimeType,file.size,session.email]);
    return json({ok:true,resource:publicResource(result.rows[0])},201);
  }catch(error){try{await del(blob.url,{token:process.env.BLOB_READ_WRITE_TOKEN})}catch{}throw error}
}

async function listResources(){
  const database=await db();
  const result=await database.query('SELECT id,title,file_url,file_name,mime_type,file_size,source,created_at FROM faculty_resources ORDER BY created_at DESC LIMIT 100');
  return json({ok:true,resources:result.rows.map(publicResource)});
}

export async function handleFacultyRequest(request){
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')||'';
    if(request.method==='GET'&&action==='resources')return await listResources();
    if(request.method==='GET'&&action==='me'){
      const session=facultySession(request);return json({ok:Boolean(session),email:session?.email||null});
    }
    if(request.method!=='POST')return json({ok:false,code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'},405);
    enforceOrigin(request);
    if(action==='logout')return json({ok:true},200,{'set-cookie':sessionCookie(request,'',0)});
    if(action==='signup-request'){
      const body=await request.json(),email=requiredEmail(body.email),password=requiredPassword(body.password),passwordHash=await hashPassword(password);
      await sendSignupOtp(email,passwordHash);return json({ok:true,message:'Verification code sent.'},202);
    }
    if(action==='signup-verify'){
      const body=await request.json(),email=requiredEmail(body.email);rateLimit(`verify:${email}`,12,10*60*1000);return await verifySignupOtp(email,body.code,request);
    }
    if(action==='login'){
      const body=await request.json(),email=requiredEmail(body.email),password=requiredPassword(body.password);rateLimit(`login:${email}`,10,15*60*1000);return await login(email,password,request);
    }
    if(action==='upload'){
      if(!facultySession(request))throw new HttpError(401,'UNAUTHORIZED','Please log in to upload a resource.');
      const form=await request.formData();return await uploadLocalResource(request,form);
    }
    if(action==='publish-drive'){
      const body=await request.json();return await saveDriveResource(request,body);
    }
    throw new HttpError(404,'ACTION_NOT_FOUND','This faculty action is not available.');
  }catch(error){
    if(error instanceof HttpError)return json({ok:false,code:error.code,message:error.message},error.status);
    console.error('Faculty API error:',error?.name||'Error');
    return json({ok:false,code:'SERVICE_ERROR',message:'The faculty service is temporarily unavailable.'},500);
  }
}
