import {handleFacultyRequest} from '../api/_faculty-handler.js';

export default async function facultyRoute(req,res){
  try{
    const protocol=req.headers['x-forwarded-proto']?.split(',')[0]||req.protocol||'http';
    const url=`${protocol}://${req.headers.host}${req.originalUrl}`;
    const headers=new Headers();
    for(const name of ['cookie','content-type','origin'])if(req.headers[name])headers.set(name,req.headers[name]);
    const multipart=String(req.headers['content-type']||'').toLowerCase().startsWith('multipart/form-data');
    const request=new Request(url,{
      method:req.method,
      headers,
      ...(req.method==='GET'||req.method==='HEAD'?{}:multipart?{body:req,duplex:'half'}:{body:JSON.stringify(req.body||{})})
    });
    const response=await handleFacultyRequest(request);
    response.headers.forEach((value,name)=>res.setHeader(name,value));
    const bytes=Buffer.from(await response.arrayBuffer());
    res.status(response.status).send(bytes);
  }catch(error){
    console.error('Faculty Express adapter error:',error?.name||'Error');
    res.status(500).set('cache-control','no-store').json({ok:false,code:'SERVICE_ERROR',message:'The faculty service is temporarily unavailable.'});
  }
}
