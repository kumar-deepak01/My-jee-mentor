import {handleFeesRequest,logFeesError} from './_fees-handler.js';

export default async function feesHandler(req,res){
  try{
    const protocol=String(req.headers['x-forwarded-proto']||'https').split(',')[0],host=req.headers.host||'localhost';
    const requestUrl=new URL(req.url||'/api/fees',`${protocol}://${host}`).toString(),headers=new Headers();
    for(const name of ['cookie','content-type','origin','x-forwarded-for','x-real-ip'])if(req.headers[name])headers.set(name,req.headers[name]);
    const method=req.method||'GET',hasBody=!['GET','HEAD'].includes(method),parsedBody=req.body;
    const requestBody=parsedBody!==undefined?typeof parsedBody==='string'?parsedBody:JSON.stringify(parsedBody):req;
    const request=new Request(requestUrl,{method,headers,...(hasBody?parsedBody!==undefined?{body:requestBody}:{body:requestBody,duplex:'half'}:{})});
    const response=await handleFeesRequest(request);response.headers.forEach((value,name)=>res.setHeader(name,value));res.statusCode=response.status;res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){logFeesError('Fees API adapter error:',error);res.statusCode=500;res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json; charset=utf-8');res.end(JSON.stringify({message:'The fee service is temporarily unavailable.'}))}
}
