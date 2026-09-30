// Integration seam for the premium assessment platform.
// Later, adapt its official authentication SDK/API here; never hard-code student passwords.
export async function authenticateExam(credentials){
  const provider=window.MyJeeExamProvider;
  if(!provider||typeof provider.authenticate!=='function')return{status:'not_configured'};
  return provider.authenticate({userId:credentials.userId,password:credentials.password});
}
