export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({turnstileSiteKey:process.env.TURNSTILE_SITE_KEY||''});
}
