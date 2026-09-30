import {handleFacultyRequest} from '../api/_faculty-handler.js';

export default async function facultyRoute(req,res){
  try{
    const protocol=req.headers['x-forwarded-proto']?.split(',')[0]||req.protocol||'http';
    const url=`${protocol}://${req.headers.host}${req.originalUrl}`;
    const headers=new Headers();
    for(const name of ['cookie','content-type','origin','x-forwarded-for','x-real-ip'])if(req.headers[name])headers.set(name,req.headers[name]);
    const request=new Request(url,{method:req.method,headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:JSON.stringify(req.body||{})})});
    const response=await handleFacultyRequest(request);
    response.headers.forEach((value,name)=>res.setHeader(name,value));
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    console.error('Faculty Express adapter error:',error?.name||'Error');
    res.status(500).set('cache-control','no-store').json({ok:false,code:'SERVICE_ERROR',message:'The faculty service is temporarily unavailable.'});
  }
}
