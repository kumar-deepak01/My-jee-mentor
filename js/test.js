const form=document.querySelector('.login-form');
const userId=document.querySelector('#user-id');
const password=document.querySelector('#password');
const userField=document.querySelector('#user-field');
const passwordField=document.querySelector('#password-field');
const message=document.querySelector('.login-message');
const submitZone=document.querySelector('.submit-zone');
const submitButton=document.querySelector('.login-submit');
let hasInvalidAttempt=false;

function moveButton(){
  const zone=submitZone.getBoundingClientRect();
  const button=submitButton.getBoundingClientRect();
  const horizontalRoom=Math.max(0,(zone.width-button.width)/2-4);
  const verticalRoom=Math.max(0,zone.height-button.height-4);
  const x=(Math.random()*2-1)*Math.min(horizontalRoom,34);
  const y=Math.random()*verticalRoom;
  submitButton.style.setProperty('--dodge-x',`${Math.round(x)}px`);
  submitButton.style.setProperty('--dodge-y',`${Math.round(y)}px`);
}

function setFieldError(field,input,hasError){
  field.classList.toggle('has-error',hasError);
  input.setAttribute('aria-invalid',String(hasError));
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  const userMissing=!userId.value.trim();
  const passwordMissing=!password.value;
  setFieldError(userField,userId,userMissing);
  setFieldError(passwordField,password,passwordMissing);

  if(userMissing||passwordMissing){
    hasInvalidAttempt=true;
    message.textContent='User ID aur password dono enter karein.';
    moveButton();
    (userMissing?userId:password).focus();
    return;
  }

  message.textContent='User ID ya password galat hai. Dobara check karke try karein.';
  hasInvalidAttempt=true;
  setFieldError(userField,userId,true);
  setFieldError(passwordField,password,true);
  moveButton();
});

[[userId,userField],[password,passwordField]].forEach(([input,field])=>{
  input.addEventListener('input',()=>{
    setFieldError(field,input,false);
    if(!userField.classList.contains('has-error')&&!passwordField.classList.contains('has-error'))message.textContent='';
  });
});

submitButton.addEventListener('pointerenter',()=>{
  if(hasInvalidAttempt)moveButton();
});
