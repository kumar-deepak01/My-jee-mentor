import {randomUUID} from 'node:crypto';
import {BlobPreconditionFailedError,get,put} from '@vercel/blob';
import {hasFacultySession,logFacultyError} from './_faculty-handler.js';

const STORE='mjm-data/student-reviews.json';
const ALLOWED_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com']);
class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const cleanText=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
function requireBlobConfig(){if(!process.env.BLOB_READ_WRITE_TOKEN){console.error('Student review configuration missing: BLOB_READ_WRITE_TOKEN');throw new ApiError(503,'REVIEW_CONFIG_MISSING','Student review storage is not configured.')}}
function checkOrigin(request){const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new ApiError(403,'ORIGIN_DENIED','Request origin is not allowed.')}
function getVideoId(value){
  if(typeof value!=='string'||value.length>2048)throw new ApiError(400,'INVALID_VIDEO_LINK','Enter a valid YouTube video link.');
  let url;try{url=new URL(value.trim())}catch{throw new ApiError(400,'INVALID_VIDEO_LINK','Enter a valid YouTube video link.')}
  if(url.protocol!=='https:'||!ALLOWED_HOSTS.has(url.hostname)||url.username||url.password||url.port||url.searchParams.has('list'))throw new ApiError(400,'INVALID_VIDEO_LINK','Use an https YouTube video link. Playlist and channel links are not accepted.');
  const segments=url.pathname.split('/').filter(Boolean);let id='';
  if(url.hostname==='youtu.be'){if(segments.length===1)id=segments[0]}
  else if(url.hostname==='youtube-nocookie.com'){if(segments.length===2&&segments[0]==='embed')id=segments[1]}
  else if(url.pathname==='/watch'){id=url.searchParams.get('v')||''}
  else if(segments.length===2&&['shorts','embed','live'].includes(segments[0]))id=segments[1];
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new ApiError(400,'INVALID_VIDEO_LINK','This is not a supported YouTube video link. Paste a video link, not a playlist or channel link.');
  return id;
}
function validateReview(body){
  const title=cleanText(body?.title,80),description=cleanText(body?.description,120);
  if(!title||title.length>80)throw new ApiError(400,'INVALID_TITLE','Student name or title is required and must be 80 characters or fewer.');
  if(typeof body?.description==='string'&&body.description.trim().replace(/[\u0000-\u001f\u007f]/g,'').length>120)throw new ApiError(400,'INVALID_DESCRIPTION','Description must be 120 characters or fewer.');
  return{title,description,videoId:getVideoId(body?.url)};
}
async function readReviews(){
  const result=await get(STORE,{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,useCache:false});
  if(!result)return{reviews:[],etag:null};
  if(result.statusCode!==200||!result.stream)throw new ApiError(503,'REVIEW_STORE_READ_FAILED','Could not read student reviews.');
  let reviews;try{reviews=JSON.parse(await new Response(result.stream).text())}catch{throw new ApiError(503,'REVIEW_STORE_INVALID','The stored student review list is invalid.')}
  if(!Array.isArray(reviews))throw new ApiError(503,'REVIEW_STORE_INVALID','The stored student review list is invalid.');
  return{reviews,etag:result.blob.etag};
}
async function writeReviews(reviews,etag){return put(STORE,JSON.stringify(reviews),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,contentType:'application/json; charset=utf-8',allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{})})}
async function mutateReviews(change){
  for(let attempt=0;attempt<5;attempt++){
    const{reviews,etag}=await readReviews(),next=change([...reviews]);
    try{await writeReviews(next,etag);return next}
    catch(error){const collision=!etag&&/already.?exists|precondition/i.test(String(error?.name||error?.message));if((error instanceof BlobPreconditionFailedError||collision)&&attempt<4)continue;throw error}
  }
  throw new ApiError(409,'REVIEW_CONFLICT','The review list changed at the same time. Try again.');
}
function publicReview(item){return{id:item.id,title:item.title,description:item.description||'',videoId:item.videoId,createdAt:item.createdAt,...(item.updatedAt?{updatedAt:item.updatedAt}:{})}}
export async function handleStudentReviewRequest(request){
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')||'';
    requireBlobConfig();
    if(request.method==='GET'){const{reviews}=await readReviews();return json({reviews:reviews.map(publicReview)})}
    if(!['POST','PATCH','PUT','DELETE'].includes(request.method))return json({message:'Method not allowed.'},405);
    checkOrigin(request);
    if(!hasFacultySession(request))throw new ApiError(401,'LOGIN_REQUIRED','Log in to manage student reviews.');
    const body=await request.json();
    if(action==='add'&&request.method==='POST'){
      const values=validateReview(body),review={id:randomUUID(),...values,createdAt:new Date().toISOString()};
      const reviews=await mutateReviews(current=>{if(current.some(item=>item.videoId===review.videoId))throw new ApiError(409,'DUPLICATE_REVIEW','This video has already been added.');return[review,...current]});
      return json({review:publicReview(reviews[0]),reviews:reviews.map(publicReview)},201);
    }
    if(action==='update'&&['PATCH','PUT'].includes(request.method)){
      const id=typeof body?.id==='string'?body.id:'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_REVIEW_ID','Review not found.');
      const values=validateReview(body),updatedAt=new Date().toISOString();
      const reviews=await mutateReviews(current=>{if(!current.some(item=>item.id===id))throw new ApiError(404,'REVIEW_NOT_FOUND','Review not found.');if(current.some(item=>item.id!==id&&item.videoId===values.videoId))throw new ApiError(409,'DUPLICATE_REVIEW','This video has already been added.');return current.map(item=>item.id===id?{...item,...values,updatedAt}:item)});
      return json({review:publicReview(reviews.find(item=>item.id===id)),reviews:reviews.map(publicReview)});
    }
    if(action==='delete'&&request.method==='DELETE'){
      const id=typeof body?.id==='string'?body.id:'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_REVIEW_ID','Review not found.');
      let removed=false;const reviews=await mutateReviews(current=>current.filter(item=>{if(item.id===id){removed=true;return false}return true}));
      if(!removed)throw new ApiError(404,'REVIEW_NOT_FOUND','Review not found.');
      return json({reviews:reviews.map(publicReview)});
    }
    throw new ApiError(404,'ACTION_NOT_FOUND','This student review action is not available.');
  }catch(error){
    if(error instanceof ApiError)return json({message:error.message,code:error.code},error.status);
    logFacultyError('Student review API error:',error);
    return json({message:'Student reviews are temporarily unavailable.',code:'SERVICE_ERROR'},500);
  }
}
