import {handleStudentReviewRequest} from '../api/_student-review-handler.js';
import {logFacultyError} from '../api/_faculty-handler.js';

export default async function studentReviewRoute(req,res){
  try{
    const protocol=req.headers['x-forwarded-proto']?.split(',')[0]||req.protocol||'http',url=`${protocol}://${req.headers.host}${req.originalUrl}`;
    const headers=new Headers();for(const name of ['cookie','content-type','origin','x-forwarded-for','x-real-ip'])if(req.headers[name])headers.set(name,req.headers[name]);
    const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:JSON.stringify(req.body||{})})});
    const response=await handleStudentReviewRequest(request);response.headers.forEach((value,name)=>res.setHeader(name,value));res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  }catch(error){logFacultyError('Student review Express adapter error:',error);res.status(500).set('cache-control','no-store').json({message:'Student reviews are temporarily unavailable.',code:'SERVICE_ERROR'})}
}
