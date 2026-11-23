import {downloadReceiptPdf,formatFeeDate} from './fee-receipt.js';
import {renderFeeAnalyticsMarkup,initFeeAnalytics,updateFeeAnalyticsData,updateDueBadge} from './fee-analytics.js';
import {renderPhoneFieldMarkup,initPhoneComponent} from './intl-phone.js';
import {renderDueTrackerMarkup,initDueTracker} from './fee-due.js';

const ENDPOINT='/api/fees';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localDate=()=>{const now=new Date();return`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`};
const formatMoney=value=>new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);

const formatWaNumber=phone=>{
  if(!phone)return'';
  const digits=String(phone).replace(/\D/g,'');
  if(!digits)return'';
  if(digits.length===10)return'91'+digits;
  return digits;
};

export function feesPageMarkup(){
  return `
    <section class="fees-portal">
      <div class="container">
        <!-- Admin Login Panel -->
        <section class="fees-panel fees-login-panel" data-fees-auth>
          <span class="eyebrow">ADMIN LOGIN</span>
          <h2>Enter admin password</h2>
          <form data-fees-login>
            <label for="feesPassword">Admin password</label>
            <div class="fees-login-row">
              <input id="feesPassword" name="password" type="password" required autocomplete="current-password" maxlength="300">
              <button class="btn btn-primary" type="submit" data-fees-login-button>Unlock</button>
            </div>
            <p class="fees-status" data-fees-login-status role="status" aria-live="polite"></p>
          </form>
        </section>

        <!-- Authenticated Dashboard -->
        <section class="fees-dashboard" data-fees-dashboard hidden>
          <!-- Dashboard Top Bar -->
          <div class="fees-dashboard-head" data-fees-dashboard-head>
            <div>
              <span class="eyebrow">PRIVATE FEE REGISTER</span>
              <h2>Fee Collection &amp; Receipt</h2>
            </div>
            <button class="btn btn-outline" type="button" data-fees-logout>Logout</button>
          </div>

          <!-- Dedicated Fee Due Tracker View (toggled via Due Fees button or /fees/due) -->
          ${renderDueTrackerMarkup()}

          <!-- Main Analytics & Collection View -->
          <div class="fees-main-view" data-fees-main-view>
            ${renderFeeAnalyticsMarkup()}

            <!-- Record Fee Payment Form Panel -->
            <section class="fees-panel" data-fees-form-panel>
              <h3>Record a fee payment</h3>
              <p class="fees-help">A receipt downloads only after the payment record is saved to the fee sheet.</p>
              <form class="fees-form" data-fees-form>
                <input type="hidden" name="studentId" data-student-id>
                <label>Student Name *<input name="studentName" required maxlength="100" autocomplete="name"></label>
                <label>Parent Name<input name="parentName" maxlength="100"></label>
                ${renderPhoneFieldMarkup()}
                <label>Course *<select name="course" required><option value="">Select course</option><option>JEE</option><option>NEET</option><option>Foundation</option></select></label>
                <label>Batch<input name="batch" maxlength="80" placeholder="e.g. Class 11 Evening"></label>
                <label>Fee Period<input name="feePeriod" maxlength="50" placeholder="e.g. October 2026"></label>
                <label>Amount (₹) *<input name="amount" type="number" required min="0.01" max="99999999.99" step="0.01" inputmode="decimal"></label>
                <label>Payment Mode *<select name="paymentMode" required><option value="">Select payment mode</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select></label>
                <label>Balance Due (₹)<input name="balanceDue" type="number" min="0" max="99999999.99" step="0.01" inputmode="decimal" placeholder="0.00"></label>
                <label>Collected By<input name="collectedBy" maxlength="100"></label>
                <label>Date *<input name="date" type="date" required></label>
                <label class="fees-full-field">Remarks<textarea name="remarks" rows="3" maxlength="500"></textarea></label>
                <div class="fees-form-footer fees-full-field">
                  <p class="fees-status" data-fees-form-status role="status" aria-live="polite"></p>
                  <button class="btn btn-primary" type="submit" data-fees-save>Save &amp; Download Receipt</button>
                </div>
              </form>
            </section>

            <!-- Receipt History Panel -->
            <section class="fees-panel fees-history-panel">
              <div class="fees-history-heading">
                <div>
                  <span class="eyebrow">SAVED IN GOOGLE SHEETS</span>
                  <h3>Receipt History</h3>
                </div>
                <button class="btn btn-outline fees-refresh" type="button" data-fees-refresh>Refresh</button>
              </div>
              <form class="fees-filters" data-fees-filters>
                <label>Search name, phone or receipt no.<input name="search" type="search" maxlength="100" placeholder="Search fee records"></label>
                <label>Collection date<input name="date" type="date"></label>
                <button class="btn btn-primary" type="submit">Search</button>
                <button class="btn btn-outline" type="reset" data-fees-clear>Clear</button>
              </form>
              <p class="fees-status" data-fees-history-status role="status" aria-live="polite"></p>
              <div class="fees-table-wrap">
                <table class="fees-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Course / Batch</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody data-fees-rows>
                    <tr><td colspan="7">Enter the admin password to load records.</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>
  `;
}

async function api(action,options={}){
  const{query,...fetchOptions}=options,url=new URL(ENDPOINT,location.origin);
  if(action)url.searchParams.set('action',action);
  for(const[key,value]of Object.entries(query||{}))if(value)url.searchParams.set(key,value);
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...fetchOptions}),payload=await response.json().catch(()=>({message:'The fee service returned an invalid response.'}));
  if(!response.ok)throw Object.assign(new Error(payload.message||'Fee request failed.'),{status:response.status});
  return payload;
}

export function initFeesPage(){
  const auth=document.querySelector('[data-fees-auth]'),dashboard=document.querySelector('[data-fees-dashboard]');
  if(!auth||!dashboard)return;

  const loginForm=auth.querySelector('[data-fees-login]'),loginStatus=auth.querySelector('[data-fees-login-status]'),loginButton=auth.querySelector('[data-fees-login-button]');
  const mainHead=dashboard.querySelector('[data-fees-dashboard-head]'),mainView=dashboard.querySelector('[data-fees-main-view]');
  const feeForm=dashboard.querySelector('[data-fees-form]'),feeStatus=dashboard.querySelector('[data-fees-form-status]'),saveButton=dashboard.querySelector('[data-fees-save]');
  const historyStatus=dashboard.querySelector('[data-fees-history-status]'),rows=dashboard.querySelector('[data-fees-rows]'),filters=dashboard.querySelector('[data-fees-filters]');
  const studentIdInput=feeForm.querySelector('[data-student-id]');

  let records=[];
  let allRecords=[];
  let students=[];
  let dueTracker=null;

  const setStatus=(node,message,error=false)=>{
    if(!node)return;
    node.textContent=message;
    node.classList.toggle('is-error',error);
    node.classList.toggle('is-success',Boolean(message)&&!error);
  };

  const showDueTrackerView=(updateHistory=true)=>{
    if(mainView)mainView.hidden=true;
    if(mainHead)mainHead.hidden=true;
    if(dueTracker)dueTracker.show();
    if(updateHistory&&location.pathname!=='/fees/due'){
      try{history.pushState(null,'','/fees/due')}catch{}
    }
  };

  const showMainAnalyticsView=(updateHistory=true)=>{
    if(dueTracker)dueTracker.hide();
    if(mainView)mainView.hidden=false;
    if(mainHead)mainHead.hidden=false;
    if(updateHistory&&location.pathname!=='/fees'&&location.pathname!=='/fees.html'){
      try{history.pushState(null,'','/fees')}catch{}
    }
  };

  const handleCollectStudent=(student)=>{
    showMainAnalyticsView(false);

    // Prefill form
    if(feeForm.elements.studentName)feeForm.elements.studentName.value=student.studentName||'';
    if(feeForm.elements.parentName)feeForm.elements.parentName.value=student.parentName||'';

    const phone=student.studentMobile||student.parentMobile||'';
    if(phoneComp){
      phoneComp.setRawNumber(phone);
    }else if(feeForm.elements.phone){
      feeForm.elements.phone.value=phone;
    }

    const academicText=[student.studentClass,student.batch,student.subject].join(' ').toUpperCase();
    let detectedCourse='JEE';
    if(academicText.includes('NEET')||academicText.includes('BIO')||academicText.includes('PCB')){
      detectedCourse='NEET';
    }else if(academicText.includes('FOUNDATION')||academicText.includes('CLASS 9')||academicText.includes('CLASS 10')||academicText.includes('CLASS 8')||academicText.includes('CLASS 7')){
      detectedCourse='Foundation';
    }
    if(feeForm.elements.course)feeForm.elements.course.value=detectedCourse;

    if(feeForm.elements.batch)feeForm.elements.batch.value=student.batch||'';
    if(feeForm.elements.feePeriod)feeForm.elements.feePeriod.value=student.oldestUnpaidMonth||formatFeeDate(new Date());
    if(feeForm.elements.amount)feeForm.elements.amount.value=student.outstanding>0?student.outstanding:student.monthlyFee;
    if(feeForm.elements.balanceDue)feeForm.elements.balanceDue.value='0';
    if(feeForm.elements.date)feeForm.elements.date.value=localDate();
    if(feeForm.elements.remarks)feeForm.elements.remarks.value=`[${student.studentId}] Monthly fee collection`;
    if(studentIdInput)studentIdInput.value=student.studentId||'';

    setStatus(feeStatus,`Prefilled collection for ${student.studentName} (${student.studentId}). Amount: ₹${student.outstanding>0?student.outstanding:student.monthlyFee}.`);
    feeForm.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>feeForm.elements.amount?.focus(),300);
  };

  dueTracker=initDueTracker({
    onCollect:handleCollectStudent,
    onBackToAnalytics:()=>showMainAnalyticsView(true),
    onSyncRequested:()=>loadHistory(true)
  });

  initFeeAnalytics({
    onRefreshRequested:()=>loadHistory(true),
    onOpenDueTracker:()=>showDueTrackerView(true)
  });

  window.addEventListener('mjm:open-due-tracker',()=>showDueTrackerView(true));

  window.addEventListener('popstate',()=>{
    const isDueRoute=location.pathname.replace(/\/$/,'')==='/fees/due';
    if(isDueRoute){
      showDueTrackerView(false);
    }else{
      showMainAnalyticsView(false);
    }
  });

  feeForm.elements.date.value=localDate();
  const phoneComp=initPhoneComponent(feeForm);
  feeForm.addEventListener('reset',()=>setTimeout(()=>{
    if(studentIdInput)studentIdInput.value='';
    if(phoneComp)phoneComp.selectCountry({iso2:'IN',name:'India',dialCode:'+91',flag:'🇮🇳'},false);
  },0));

  const showDashboard=()=>{
    auth.hidden=true;
    dashboard.hidden=false;
    const isDuePath=location.pathname.replace(/\/$/,'')==='/fees/due';
    if(isDuePath){
      showDueTrackerView(false);
    }else{
      showMainAnalyticsView(false);
    }
    loadHistory();
  };

  const showLogin=message=>{
    dashboard.hidden=true;
    auth.hidden=false;
    if(message)setStatus(loginStatus,message,true);
  };

  const drawRows=()=>{
    rows.innerHTML=records.length?records.map((record,index)=>{
      const wa=formatWaNumber(record.phone);
      return `<tr>
        <td><strong>${escapeHtml(record.receiptNo)}</strong></td>
        <td>${escapeHtml(formatFeeDate(record.date))}</td>
        <td>
          <div class="fees-student-cell">
            <strong>${escapeHtml(record.studentName)}</strong>
            ${record.parentName?`<small class="fees-parent-name">${escapeHtml(record.parentName)}</small>`:''}
            ${record.phone?`
              <div class="fees-phone-cell-links">
                <a href="tel:${escapeHtml(record.phone)}" class="fees-phone-link" title="Call ${escapeHtml(record.phone)}">
                  <span>📞</span> ${escapeHtml(record.phone)}
                </a>
                ${wa?`<a href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer" class="fees-wa-link" title="Chat on WhatsApp">
                  <span>💬</span> WhatsApp
                </a>`:''}
              </div>`:''}
          </div>
        </td>
        <td>${escapeHtml(record.course)}${record.batch?`<small>${escapeHtml(record.batch)}</small>`:''}</td>
        <td>₹${escapeHtml(formatMoney(record.amount))}</td>
        <td>${escapeHtml(record.paymentMode)}</td>
        <td><button type="button" class="fees-download-again" data-fees-download="${index}">Download PDF Again</button></td>
      </tr>`;
    }).join(''):'<tr><td colspan="7" class="fees-empty-row">No fee records match this search.</td></tr>';
  };

  const loadHistory=async(forceFull=false)=>{
    setStatus(historyStatus,'Loading fee records…');
    rows.innerHTML='<tr><td colspan="7">Loading from Google Sheets…</td></tr>';
    if(forceFull)filters.reset();
    const data=new FormData(filters),query=forceFull?{}:Object.fromEntries([...data].map(([key,value])=>[key,String(value).trim()]).filter(([,value])=>value));
    try{
      const result=await api('',{method:'GET',query});
      records=Array.isArray(result.records)?result.records:[];
      if(Array.isArray(result.students)&&result.students.length){
        students=result.students;
      }
      drawRows();
      setStatus(historyStatus,`${records.length} record${records.length===1?'':'s'} loaded.`);
      if(Object.keys(query).length===0){
        allRecords=records;
        updateFeeAnalyticsData(allRecords);
      }
      if(dueTracker){
        dueTracker.updateData(students,allRecords.length?allRecords:records);
        const attentionCount=dueTracker.getAttentionCount();
        updateDueBadge(attentionCount);
      }
    }catch(error){
      if(error.status===401){showLogin('Session expired. Please sign in again.');return}
      rows.innerHTML='<tr><td colspan="7">Fee history could not be loaded.</td></tr>';
      setStatus(historyStatus,error.message||'Google Sheets is unavailable. Try again.',true);
    }
  };

  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    loginButton.disabled=true;
    setStatus(loginStatus,'Checking password…');
    try{
      await api('login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:loginForm.elements.password.value})});
      loginForm.reset();
      setStatus(loginStatus,'');
      showDashboard();
    }catch(error){
      setStatus(loginStatus,error.message,true);
    }finally{
      loginButton.disabled=false;
    }
  });

  dashboard.addEventListener('click',async event=>{
    const download=event.target.closest('[data-fees-download]');
    if(download){
      const record=records[Number(download.dataset.feesDownload)];
      if(!record)return;
      download.disabled=true;
      try{await downloadReceiptPdf(record)}catch(error){setStatus(historyStatus,error.message,true)}finally{download.disabled=false}
      return;
    }
    if(event.target.closest('[data-fees-refresh]'))loadHistory(true);
    if(event.target.closest('[data-fees-logout]')){
      try{await api('logout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})})}catch{}
      showLogin('You have been logged out.');
    }
  });

  filters.addEventListener('submit',event=>{event.preventDefault();loadHistory()});
  filters.addEventListener('reset',()=>setTimeout(loadHistory,0));

  let isSubmitting = false;

  feeForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(isSubmitting) return;

    // 1. Trim text inputs
    for(const el of feeForm.elements){
      if(typeof el.value==='string'&&el.type!=='password'&&el.type!=='file'){
        el.value=el.value.trim();
      }
    }

    // 2. Validate Student Name
    const studentName=feeForm.elements.studentName?.value.trim();
    if(!studentName){
      feeForm.elements.studentName?.focus();
      setStatus(feeStatus,'Student name is required.',true);
      return;
    }

    // 3. Validate Phone with international component
    let validatedE164='';
    if(phoneComp){
      const phoneRes=phoneComp.validate();
      if(!phoneRes.isValid){
        feeForm.elements.phone?.focus();
        setStatus(feeStatus,phoneRes.error||'Please enter a valid phone number.',true);
        return;
      }
      validatedE164=phoneRes.e164||phoneComp.getE164();
    }

    // 4. Validate Amount
    const amountVal=Number(feeForm.elements.amount?.value);
    if(!Number.isFinite(amountVal)||amountVal<=0){
      feeForm.elements.amount?.focus();
      setStatus(feeStatus,'Enter a valid payment amount greater than zero.',true);
      return;
    }

    // 5. Validate Course
    if(!feeForm.elements.course?.value){
      feeForm.elements.course?.focus();
      setStatus(feeStatus,'Please select a course.',true);
      return;
    }

    // 6. Validate Payment Mode
    if(!feeForm.elements.paymentMode?.value){
      feeForm.elements.paymentMode?.focus();
      setStatus(feeStatus,'Please select a payment mode.',true);
      return;
    }

    // 7. Validate Date
    if(!feeForm.elements.date?.value){
      feeForm.elements.date?.focus();
      setStatus(feeStatus,'Please select a payment date.',true);
      return;
    }

    // 8. Balance Due
    const rawBalance=feeForm.elements.balanceDue?.value;
    const balanceDueVal=rawBalance===''||rawBalance==null?0:Number(rawBalance);
    if(!Number.isFinite(balanceDueVal)||balanceDueVal<0){
      feeForm.elements.balanceDue?.focus();
      setStatus(feeStatus,'Enter a valid balance due (0 or greater).',true);
      return;
    }

    if(!feeForm.reportValidity())return;

    isSubmitting=true;
    saveButton.disabled=true;
    setStatus(feeStatus,'Saving payment to Google Sheets…');

    const data=Object.fromEntries(new FormData(feeForm));
    if(validatedE164){
      data.phone=validatedE164;
    }
    if(phoneComp){
      data.phoneCountry=phoneComp.getCountry().iso2;
      data.phoneDialCode=phoneComp.getCountry().dialCode;
    }
    if(studentIdInput?.value){
      data.studentId=studentIdInput.value;
    }

    try{
      const saved=await api('collect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      if(!saved.receiptNo||!saved.record)throw new Error('Google Sheets did not confirm the save. No receipt was generated.');
      setStatus(feeStatus,`Saved as ${saved.receiptNo}. Preparing receipt…`);
      try{
        await downloadReceiptPdf(saved.record);
        setStatus(feeStatus,`Payment saved. Receipt ${saved.receiptNo} downloaded.`);
      }catch(error){
        setStatus(feeStatus,`Payment saved as ${saved.receiptNo}, but the PDF could not be generated: ${error.message}`,true);
      }
      feeForm.reset();
      if(studentIdInput)studentIdInput.value='';
      feeForm.elements.date.value=localDate();
      loadHistory(true);
    }catch(error){
      if(error.status===401){showLogin('Session expired. Please sign in again.');return}
      setStatus(feeStatus,error.message||'Payment was not saved. No receipt was generated.',true);
    }finally{
      isSubmitting=false;
      saveButton.disabled=false;
    }
  });

  api('session').then(showDashboard).catch(()=>{});
}
