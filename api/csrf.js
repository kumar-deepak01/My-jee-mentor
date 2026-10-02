import {randomBytes} from 'node:crypto';

export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({message:'Method not allowed.'});
  const token=randomBytes(32).toString('hex');
  res.setHeader('Set-Cookie',`csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${process.env.NODE_ENV==='production'?'; Secure':''}`);
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({token});
}
