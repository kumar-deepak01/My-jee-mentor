import {Router} from 'express';
import {body,validationResult} from 'express-validator';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {insertLead} from '../db.js';
const router=Router();
const limiter=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Please wait before submitting another enquiry.'}});
const fields=['studentName','parentName','mobile','whatsapp','className','exam','targetYear','currentCoaching','preferredSubject','city','language','message'];
const sanitize=k=>body(k).customSanitizer(v=>typeof v==='string'?v.trim().replace(/[\u0000-\u001f\u007f]/g,''):v);
router.get('/csrf',(req,res)=>{const token=randomBytes(32).toString('hex');res.cookie('csrf',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:30*60*1000,path:'/'});res.json({token});});
router.post('/leads',limiter,
 ...fields.map(sanitize),
 body('studentName').isLength({min:2,max:80}),body('parentName').isLength({min:2,max:80}),
 body('mobile').matches(/^\+?[0-9 ()-]{8,18}$/),body('whatsapp').optional({checkFalsy:true}).matches(/^\+?[0-9 ()-]{8,18}$/),
 body('className').isIn(['7','8','9','10','11','12','Dropper']),body('exam').isIn(['JEE','NEET','Foundation']),
 ...['targetYear','currentCoaching','preferredSubject','city','language'].map(k=>body(k).optional({checkFalsy:true}).isLength({max:100})),body('message').optional({checkFalsy:true}).isLength({max:1000}),
 async(req,res)=>{
  if(req.body?.website)return res.status(200).json({ok:true});
  const cookie=req.cookies?.csrf,header=req.get('x-csrf-token')||'';
  if(!cookie||cookie.length!==header.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(header)))return res.status(403).json({message:'Your form session expired. Refresh and try again.'});
  const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({message:'Please check the form fields and try again.'});
  if(process.env.NODE_ENV==='production'&&!process.env.TURNSTILE_SECRET)return res.status(503).json({message:'Form service is temporarily unavailable.'});
  if(process.env.TURNSTILE_SECRET){try{const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET,response:String(req.body.turnstileToken||''),remoteip:req.ip})});const result=await verify.json();if(!result.success)return res.status(400).json({message:'Please complete the security check and try again.'});}catch{return res.status(503).json({message:'Form service is temporarily unavailable.'});}}
  const data=Object.fromEntries(fields.map(k=>[k,typeof req.body[k]==='string'?req.body[k].slice(0,1000):'']));
  try{insertLead.run(data);return res.status(201).json({ok:true});}catch{return res.status(500).json({message:'We could not save your enquiry. Please call or WhatsApp us.'});}
 });
export default router;
