const labels={studentName:'Student Name',parentName:'Parent Name',email:'Email',mobile:'Mobile',whatsapp:'WhatsApp',className:'Class',exam:'Course',targetYear:'Target Year',currentCoaching:'Current Coaching',preferredSubject:'Preferred Subject',city:'City',language:'Preferred Language',message:'Message'};

export async function sendLeadEmail(lead){
  if(!process.env.RESEND_API_KEY||!process.env.LEADS_FROM_EMAIL)throw new Error('Lead email is not configured.');
  const text=Object.entries(labels).filter(([key])=>lead[key]).map(([key,label])=>`${label}: ${lead[key]}`).join('\n');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.LEADS_FROM_EMAIL,to:['amyjeementor@gmail.com'],reply_to:lead.email,subject:`New counselling enquiry — ${lead.studentName}`,text})});
  if(!response.ok){const details=await response.json().catch(()=>({}));console.error('Lead email delivery failed:',{status:response.status,message:String(details.message||'Email provider rejected the request').slice(0,300)});throw new Error('The email provider could not send the enquiry.');}
}
