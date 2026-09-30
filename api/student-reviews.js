import {handleStudentReviewRequest} from './_student-review-handler.js';
import {logFacultyError} from './_faculty-handler.js';

export default async function studentReviewsHandler(req,res){
  try{
    const protocol=String(req.headers['x-forwarded-proto']||'https').split(',')[0],host=req.headers.host||'localhost';
    const requestUrl=new URL(req.url||'/api/student-reviews',`${protocol}://${host}`).toString();
    const headers=new Headers();
    for(const name of ['cookie','content-type','origin','x-forwarded-for','x-real-ip'])if(req.headers[name])headers.set(name,req.headers[name]);
    const method=req.method||'GET',hasBody=!['GET','HEAD'].includes(method),requestBody=req.body!==undefined?typeof req.body==='string'?req.body:JSON.stringify(req.body):req;
    const request=new Request(requestUrl,{method,headers,...(hasBody?req.body!==undefined?{body:requestBody}:{body:requestBody,duplex:'half'}:{})});
    const response=await handleStudentReviewRequest(request);
    response.headers.forEach((value,name)=>res.setHeader(name,value));res.statusCode=response.status;res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    logFacultyError('Student review API adapter error:',error);res.statusCode=500;res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json; charset=utf-8');res.end(JSON.stringify({message:'Student reviews are temporarily unavailable.',code:'SERVICE_ERROR'}));
  }
}
