import {randomUUID} from 'node:crypto';
import {BlobPreconditionFailedError,get,put} from '@vercel/blob';
import {hasFacultySession,logFacultyError} from './_faculty-handler.js';

const STORE='mjm-data/premium-videos.json';
const ALLOWED_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com']);
class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const cleanText=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
function requireBlobConfig(){if(!process.env.BLOB_READ_WRITE_TOKEN){console.error('Premium video configuration missing: BLOB_READ_WRITE_TOKEN');throw new ApiError(503,'VIDEO_CONFIG_MISSING','Premium video storage is not configured.')}}
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
function validateVideo(body){
  const title=cleanText(body?.title,80),description=cleanText(body?.description,120);
  if(!title||title.length>80)throw new ApiError(400,'INVALID_TITLE','Title is required and must be 80 characters or fewer.');
  if(typeof body?.description==='string'&&body.description.trim().replace(/[\u0000-\u001f\u007f]/g,'').length>120)throw new ApiError(400,'INVALID_DESCRIPTION','Description must be 120 characters or fewer.');
  const videoId=getVideoId(body?.url);
  return{title,description,videoId};
}
async function readVideos(){
  const result=await get(STORE,{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,useCache:false});
  if(!result)return{videos:[],etag:null};
  if(result.statusCode!==200||!result.stream)throw new ApiError(503,'VIDEO_STORE_READ_FAILED','Could not read premium videos.');
  let videos;try{videos=JSON.parse(await new Response(result.stream).text())}catch{throw new ApiError(503,'VIDEO_STORE_INVALID','The stored premium video list is invalid.')}
  if(!Array.isArray(videos))throw new ApiError(503,'VIDEO_STORE_INVALID','The stored premium video list is invalid.');
  return{videos,etag:result.blob.etag};
}
async function writeVideos(videos,etag){
  return put(STORE,JSON.stringify(videos),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,contentType:'application/json; charset=utf-8',allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{})});
}
async function mutateVideos(change){
  for(let attempt=0;attempt<5;attempt++){
    const{videos,etag}=await readVideos(),next=change([...videos]);
    try{await writeVideos(next,etag);return next}
    catch(error){const collision=!etag&&/already.?exists|precondition/i.test(String(error?.name||error?.message));if((error instanceof BlobPreconditionFailedError||collision)&&attempt<4)continue;throw error}
  }
  throw new ApiError(409,'VIDEO_CONFLICT','The video list changed at the same time. Try again.');
}
function publicVideo(video){return{id:video.id,title:video.title,description:video.description||'',videoId:video.videoId,createdAt:video.createdAt,...(video.updatedAt?{updatedAt:video.updatedAt}:{})}}

export async function handlePremiumVideoRequest(request){
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')||'';
    requireBlobConfig();
    if(request.method==='GET'){const{videos}=await readVideos();return json({ok:true,videos:videos.map(publicVideo)})}
    if(!['POST','PATCH','PUT','DELETE'].includes(request.method))return json({ok:false,code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'},405);
    checkOrigin(request);
    if(!hasFacultySession(request))throw new ApiError(401,'LOGIN_REQUIRED','Log in to manage premium videos.');
    const body=await request.json();
    if(action==='add'&&request.method==='POST'){
      const values=validateVideo(body),video={id:randomUUID(),...values,createdAt:new Date().toISOString()};
      const videos=await mutateVideos(current=>{if(current.some(item=>item.videoId===video.videoId))throw new ApiError(409,'DUPLICATE_VIDEO','This video has already been added.');return[video,...current]});
      return json({ok:true,video:publicVideo(videos[0]),videos:videos.map(publicVideo)},201);
    }
    if(action==='update'&&['PATCH','PUT'].includes(request.method)){
      const id=typeof body?.id==='string'?body.id:'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_VIDEO_ID','Video not found.');
      const values=validateVideo(body),updatedAt=new Date().toISOString();
      const videos=await mutateVideos(current=>{if(!current.some(item=>item.id===id))throw new ApiError(404,'VIDEO_NOT_FOUND','Video not found.');if(current.some(item=>item.id!==id&&item.videoId===values.videoId))throw new ApiError(409,'DUPLICATE_VIDEO','This video has already been added.');return current.map(item=>item.id===id?{...item,...values,updatedAt}:item)});
      return json({ok:true,video:publicVideo(videos.find(item=>item.id===id)),videos:videos.map(publicVideo)});
    }
    if(action==='delete'&&request.method==='DELETE'){
      const id=typeof body?.id==='string'?body.id:'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'INVALID_VIDEO_ID','Video not found.');
      let removed=false;const videos=await mutateVideos(current=>current.filter(item=>{if(item.id===id){removed=true;return false}return true}));
      if(!removed)throw new ApiError(404,'VIDEO_NOT_FOUND','Video not found.');
      return json({ok:true,videos:videos.map(publicVideo)});
    }
    throw new ApiError(404,'ACTION_NOT_FOUND','This premium video action is not available.');
  }catch(error){
    if(error instanceof ApiError)return json({ok:false,code:error.code,message:error.message},error.status);
    logFacultyError('Premium video API error:',error);
    return json({ok:false,code:'SERVICE_ERROR',message:'Premium videos are temporarily unavailable.'},500);
  }
}
