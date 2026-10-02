import {handleFeesRequest,logFeesError} from '../api/_fees-handler.js';

export default async function feesRoute(req,res){
  try{
    const protocol=req.headers['x-forwarded-proto']?.split(',')[0]||req.protocol||'http',requestUrl=`${protocol}://${req.headers.host}${req.originalUrl}`,headers=new Headers();
    for(const name of ['cookie','content-type','origin','x-forwarded-for','x-real-ip'])if(req.headers[name])headers.set(name,req.headers[name]);
    const method=req.method,request=new Request(requestUrl,{method,headers,...(['GET','HEAD'].includes(method)?{}:{body:JSON.stringify(req.body||{})})});
    const response=await handleFeesRequest(request);response.headers.forEach((value,name)=>res.setHeader(name,value));res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  }catch(error){logFeesError('Fees Express adapter error:',error);res.status(500).set('cache-control','no-store').json({message:'The fee service is temporarily unavailable.'})}
}
