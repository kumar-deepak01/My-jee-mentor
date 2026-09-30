import {handleFacultyRequest} from './_faculty-handler.js';

export default async function facultyHandler(req,res){
  try{
    const protocol=String(req.headers['x-forwarded-proto']||'https').split(',')[0];
    const host=req.headers.host||'localhost';
    const requestUrl=new URL(req.url||'/api/faculty',`${protocol}://${host}`).toString();
    const headers=new Headers();
    for(const name of ['cookie','content-type','origin'])if(req.headers[name])headers.set(name,req.headers[name]);
    const hasBody=!['GET','HEAD'].includes(req.method||'GET');
    const request=new Request(requestUrl,{method:req.method||'GET',headers,...(hasBody?{body:req,duplex:'half'}:{})});
    const response=await handleFacultyRequest(request);
    response.headers.forEach((value,name)=>res.setHeader(name,value));
    res.statusCode=response.status;
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    console.error('Faculty API adapter error:',error?.name||'Error');
    res.statusCode=500;res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json; charset=utf-8');
    res.end(JSON.stringify({ok:false,code:'SERVICE_ERROR',message:'The faculty service is temporarily unavailable.'}));
  }
}
