import {timingSafeEqual} from 'node:crypto';

const allowedClasses=new Set(['7','8','9','10','11','12','Dropper']);
const allowedCourses=new Set(['JEE','NEET','Foundation']);
const text=(value,max=1000)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
const safeEqual=(a,b)=>{const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&timingSafeEqual(left,right)};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({message:'Method not allowed.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  if(text(body.website,200))return res.status(200).json({ok:true});
  const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').map(part=>part.trim().split('=').map(decodeURIComponent)).filter(parts=>parts.length===2));
  if(!safeEqual(cookies.csrf,req.headers['x-csrf-token']))return res.status(403).json({message:'Your form session expired. Refresh and try again.'});
  const lead={
    studentName:text(body.studentName,80),parentName:text(body.parentName,80),email:text(body.email,254),
    mobile:text(body.mobile,18),whatsapp:text(body.whatsapp,18),className:text(body.className,20),exam:text(body.exam,20),
    targetYear:text(body.targetYear,100),currentCoaching:text(body.currentCoaching,100),preferredSubject:text(body.preferredSubject,100),
    city:text(body.city,80),language:text(body.language,100),message:text(body.message,1000)
  };
  if(lead.studentName.length<2||lead.parentName.length<2||!/^\S+@\S+\.\S+$/.test(lead.email)||!/^\+?[0-9 ()-]{8,18}$/.test(lead.mobile)||!allowedClasses.has(lead.className)||!allowedCourses.has(lead.exam)||!lead.city){
    return res.status(400).json({message:'Please check the required fields and try again.'});
  }
  if(process.env.NODE_ENV==='production'&&!process.env.TURNSTILE_SECRET)return res.status(503).json({message:'Form service is temporarily unavailable.'});
  if(process.env.TURNSTILE_SECRET){
    try{
      const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET,response:text(body.turnstileToken,4096),remoteip:String(req.headers['x-forwarded-for']||'').split(',')[0]})});
      if(!(await verify.json()).success)return res.status(400).json({message:'Please complete the security check and try again.'});
    }catch{return res.status(503).json({message:'Form service is temporarily unavailable.'})}
  }
  if(!process.env.RESEND_API_KEY||!process.env.LEADS_FROM_EMAIL)return res.status(503).json({message:'Email delivery is not configured yet. Please call or WhatsApp our counsellor.'});
  const labels={studentName:'Student Name',parentName:'Parent Name',email:'Email',mobile:'Mobile',whatsapp:'WhatsApp',className:'Class',exam:'Course',targetYear:'Target Year',currentCoaching:'Current Coaching',preferredSubject:'Preferred Subject',city:'City',language:'Preferred Language',message:'Message'};
  const lines=Object.entries(labels).filter(([key])=>lead[key]).map(([key,label])=>`${label}: ${lead[key]}`);
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.LEADS_FROM_EMAIL,to:['amyjeementor@gmail.com'],reply_to:lead.email,subject:`New counselling enquiry — ${lead.studentName}`,text:lines.join('\n')})});
    if(!response.ok){const details=await response.json().catch(()=>({}));console.error('Lead email delivery failed:',{status:response.status,message:String(details.message||'Email provider rejected the request').slice(0,300)});return res.status(502).json({message:'Your enquiry could not be emailed right now. Please try again or call/WhatsApp us.'})}
    return res.status(201).json({ok:true});
  }catch(error){console.error('Lead email delivery failed:',{name:String(error?.name||'Error'),message:String(error?.message||'Request failed').slice(0,300)});return res.status(502).json({message:'Your enquiry could not be emailed right now. Please try again or call/WhatsApp us.'})}
}
