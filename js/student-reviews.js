const PORTAL='/api/student-reviews';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const placeholders=Array.from({length:5},()=>'<article class="student-review-card review-skeleton" aria-label="Coming soon"><div class="student-review-media skeleton-surface"><span>Coming soon</span></div><div class="student-review-copy"><i></i><i></i></div></article>').join('');

export function homeStudentReviewMarkup(){return `<section class="section student-review-section" data-student-review-home><div class="container"><div class="section-head student-review-heading"><div><span class="eyebrow">STUDENT STORIES</span><h2>Student Reviews</h2><p>Dekho hamare students kya kehte hain</p></div><a class="btn btn-outline" href="/studentreview.html">Sabhi reviews dekho <span aria-hidden="true">→</span></a></div><div class="student-review-carousel"><button class="review-slider-arrow prev" type="button" aria-label="Previous reviews" data-review-prev hidden>‹</button><div class="student-review-track" data-review-track data-review-slider tabindex="0" aria-label="Student review videos">${placeholders}</div><button class="review-slider-arrow next" type="button" aria-label="Next reviews" data-review-next hidden>›</button></div><div class="student-review-dots" data-review-dots hidden></div></div><div class="review-toast" data-review-toast role="status" aria-live="polite"></div></section>`}

export function studentReviewPageMarkup(){return `<section class="page-hero"><div class="container"><span class="eyebrow">STUDENT STORIES</span><h1>Student Reviews</h1><p>Dekho hamare students kya kehte hain</p></div></section><section class="section student-review-library"><div class="container"><label class="review-search">Reviews dhoondo<input type="search" data-review-search placeholder="Student ka naam search karein" autocomplete="off"></label><div class="student-review-grid" data-review-grid>${placeholders}</div><p class="review-empty" data-review-empty hidden>Reviews jald hi aayenge.</p><p class="review-error" data-review-error hidden>Reviews abhi load nahi ho paaye. Thodi der baad try karein.</p></div><div class="review-toast" data-review-toast role="status" aria-live="polite"></div></section>`}

export function facultyStudentReviewMarkup(){return `<section class="faculty-review-manager" aria-labelledby="faculty-review-heading"><div class="faculty-review-heading"><div><span class="eyebrow">STUDENT STORIES</span><h3 id="faculty-review-heading">Student Reviews</h3></div><span class="review-count" data-review-count>0</span></div><p class="resource-drive-instruction">YouTube video public ya unlisted hona chahiye, taaki students use dekh saken.</p><form class="faculty-form student-review-form" data-review-form><label>Title / Student ka naam<input name="title" required maxlength="80" placeholder="Student name or review title"></label><label>YouTube Link<input name="url" type="url" required maxlength="2048" placeholder="https://www.youtube.com/watch?v=..."></label><label>Short description (optional)<input name="description" maxlength="120" placeholder="AIR 245, JEE Main 2026"></label><div class="resource-form-actions"><button class="btn btn-outline" type="button" data-review-test>Link test karo</button><button class="btn btn-primary" type="submit" data-review-submit>Add Review</button><button class="btn btn-outline" type="button" data-review-cancel hidden>Cancel</button></div><p class="faculty-status" data-review-status role="status" aria-live="polite"></p></form><div class="faculty-review-list" data-faculty-reviews></div></section>`}

function reviewCard(review,{share=false}={}){
  const id=escapeHtml(review.id),videoId=escapeHtml(review.videoId),title=escapeHtml(review.title),description=escapeHtml(review.description||'');
  return `<article class="student-review-card review-reveal" data-review-card="${id}" data-video-id="${videoId}" tabindex="0" aria-label="Student review: ${title}"><div class="student-review-media"><div class="review-thumb" data-review-thumb><img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="" loading="lazy" data-review-thumbnail><div class="review-thumb-fallback"></div><button class="review-play-button" type="button" data-review-play="${id}" aria-label="Play ${title}"><span aria-hidden="true">▶</span></button></div></div><div class="student-review-copy"><h3>${title}</h3>${description?`<p>${description}</p>`:''}</div>${share?`<div class="student-review-card-actions"><button type="button" class="review-share-button" data-review-share="${id}">Share</button></div>`:''}</article>`;
}

async function apiRequest(action='',options={}){
  const query=action?`?action=${encodeURIComponent(action)}`:'',response=await fetch(`${PORTAL}${query}`,{credentials:'same-origin',cache:'no-store',...options});
  const result=await response.json().catch(()=>({message:'The service could not be reached.'}));
  if(!response.ok)throw new Error(result.message||'The request could not be completed.');return result;
}

let reviews=[],activeVideoId='',toastTimer=0;
const currentUrl=new URL(location.href),reviewPage=currentUrl.pathname.replace(/\/$/,'').endsWith('/studentreview.html');
const toast=message=>{const el=document.querySelector('[data-review-toast]');if(!el)return;el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2200)};
function removeVideoQuery(){if(!reviewPage)return;const url=new URL(location.href);url.searchParams.delete('v');history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)}
function setReviewQuery(id){if(!reviewPage)return;const url=new URL(location.href);url.searchParams.set('v',id);history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)}
function restoreCard(card,review){
  card.classList.remove('is-playing');const media=card.querySelector('.student-review-media');if(!media)return;
  media.innerHTML=`<div class="review-thumb" data-review-thumb><img src="https://i.ytimg.com/vi/${escapeHtml(review.videoId)}/hqdefault.jpg" alt="" loading="lazy" data-review-thumbnail><div class="review-thumb-fallback"></div><button class="review-play-button" type="button" data-review-play="${escapeHtml(review.id)}" aria-label="Play ${escapeHtml(review.title)}"><span aria-hidden="true">▶</span></button></div>`;
}
function stopPlaying({clearQuery=true}={}){if(!activeVideoId)return;const card=document.querySelector(`[data-review-card="${CSS.escape(activeVideoId)}"]`),review=reviews.find(item=>item.id===activeVideoId);if(card&&review)restoreCard(card,review);activeVideoId='';if(clearQuery)removeVideoQuery()}
function playVideo(review,{updateUrl=true}={}){
  if(!review)return;
  if(activeVideoId&&activeVideoId!==review.id)stopPlaying({clearQuery:false});
  const card=document.querySelector(`[data-review-card="${CSS.escape(review.id)}"]`);if(!card)return;
  if(activeVideoId===review.id){stopPlaying();return}
  const media=card.querySelector('.student-review-media');if(!media)return;
  activeVideoId=review.id;card.classList.add('is-playing');
  const videoId=encodeURIComponent(review.videoId),watchUrl=`https://www.youtube.com/watch?v=${videoId}`;
  media.innerHTML=`<div class="review-inline-player"><iframe title="${escapeHtml(review.title)}" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="review-player-controls"><button type="button" data-review-stop="${escapeHtml(review.id)}" aria-label="Stop video">×</button><a href="${watchUrl}" target="_blank" rel="noopener noreferrer">YouTube par kholo ↗</a></div></div>`;
  if(updateUrl)setReviewQuery(review.videoId);
}
function setupReveal(root){
  const cards=root.querySelectorAll('.review-reveal');if(!cards.length)return;
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  cards.forEach(card=>{
    if(card.dataset.reviewTiltReady)return;card.dataset.reviewTiltReady='true';
    if(reduceMotion)return;
    card.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||card.classList.contains('is-playing'))return;const bounds=card.getBoundingClientRect(),x=(event.clientX-bounds.left)/bounds.width-.5,y=(event.clientY-bounds.top)/bounds.height-.5;card.style.setProperty('--review-tilt-x',`${x*5}deg`);card.style.setProperty('--review-tilt-y',`${-y*4}deg`)});
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--review-tilt-x','0deg');card.style.setProperty('--review-tilt-y','0deg')});
  });
  if(!('IntersectionObserver'in window)){cards.forEach(card=>card.classList.add('is-visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});
  cards.forEach((card,index)=>{card.style.setProperty('--review-delay',`${Math.min(index%6,5)*75}ms`);observer.observe(card)});
}
function renderViews(){
  const homeTrack=document.querySelector('[data-review-slider]'),grid=document.querySelector('[data-review-grid]');
  if(homeTrack)homeTrack.innerHTML=reviews.length?reviews.map(review=>reviewCard(review)).join(''):placeholders;
  if(grid){const query=(document.querySelector('[data-review-search]')?.value||'').trim().toLocaleLowerCase();const filtered=reviews.filter(review=>review.title.toLocaleLowerCase().includes(query));grid.innerHTML=filtered.map(review=>reviewCard(review,{share:true})).join('');const empty=document.querySelector('[data-review-empty]');if(empty){empty.hidden=filtered.length>0;empty.textContent=reviews.length?'Is naam se koi review nahi mila.':'Reviews jald hi aayenge.'}}
  document.querySelectorAll('[data-review-count]').forEach(el=>el.textContent=String(reviews.length));
  document.querySelectorAll('[data-review-thumbnail]').forEach(img=>img.addEventListener('error',()=>img.closest('.review-thumb')?.classList.add('thumbnail-failed'),{once:true}));
  document.querySelectorAll('[data-review-card]').forEach((card,index)=>{const review=reviews.find(item=>item.id===card.dataset.reviewCard);if(review)card.dataset.reviewId=review.id});
  setupReveal(document.querySelector('[data-student-review-home]')||document.querySelector('[data-review-grid]')?.parentElement||document);
  setupHomeSlider();
}
function setupHomeSlider(){
  const track=document.querySelector('[data-review-slider]');if(!track||track.dataset.sliderReady)return;track.dataset.sliderReady='true';
  const section=track.closest('[data-student-review-home]'),prev=section.querySelector('[data-review-prev]'),next=section.querySelector('[data-review-next]'),dots=section.querySelector('[data-review-dots]');
  if(reviews.length<=4){prev.hidden=true;next.hidden=true;dots.hidden=true;return}
  prev.hidden=false;next.hidden=false;dots.hidden=false;let active=0,drag=null,suppressClick=false;
  dots.innerHTML=reviews.map((_,i)=>`<button type="button" data-review-dot="${i}" aria-label="Show review ${i+1}"></button>`).join('');
  const cards=()=>[...track.querySelectorAll('[data-review-card]')];
  const measure=()=>{const list=cards();if(!list.length)return;const center=track.scrollLeft+track.clientWidth/2;active=list.reduce((best,card,index)=>Math.abs(card.offsetLeft+card.offsetWidth/2-center)<Math.abs(list[best].offsetLeft+list[best].offsetWidth/2-center)?index:best,0);list.forEach((card,index)=>{card.classList.toggle('is-centered',index===active);card.classList.toggle('is-neighbor',Math.abs(index-active)===1);card.classList.toggle('is-distant',Math.abs(index-active)>1)});dots.querySelectorAll('button').forEach((dot,index)=>{dot.classList.toggle('active',index===active);dot.setAttribute('aria-current',index===active?'true':'false')});prev.disabled=active===0;next.disabled=active===list.length-1};
  const move=index=>{stopPlaying();const list=cards();index=Math.max(0,Math.min(list.length-1,index));list[index]?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest',inline:'center'})};
  prev.addEventListener('click',()=>move(active-1));next.addEventListener('click',()=>move(active+1));dots.addEventListener('click',event=>{const dot=event.target.closest('[data-review-dot]');if(dot)move(Number(dot.dataset.reviewDot))});
  track.addEventListener('scroll',()=>requestAnimationFrame(measure),{passive:true});
  track.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(active+(event.key==='ArrowRight'?1:-1))}});
  track.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')return;drag={x:event.clientX,left:track.scrollLeft,moved:false};track.classList.add('is-dragging')});
  track.addEventListener('pointermove',event=>{if(!drag)return;const delta=event.clientX-drag.x;if(Math.abs(delta)>5)drag.moved=true;if(drag.moved)track.scrollLeft=drag.left-delta});
  const endDrag=()=>{if(!drag)return;suppressClick=drag.moved;drag=null;track.classList.remove('is-dragging');if(suppressClick)setTimeout(()=>{suppressClick=false},0)};
  track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);track.addEventListener('pointerleave',endDrag);
  track.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation()}},true);
  track.addEventListener('scroll',stopPlaying,{passive:true});window.addEventListener('resize',measure,{passive:true});measure();
}
async function shareReview(review){
  const url=`${location.origin}/studentreview.html?v=${encodeURIComponent(review.videoId)}`;
  if(navigator.share){try{await navigator.share({title:review.title,url});return}catch(error){if(error?.name==='AbortError')return}}
  try{if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(url);toast('Link copy ho gaya');return}catch{}}const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('copy failed');toast('Link copy ho gaya')}
  catch{toast('Link copy nahi ho paaya')}
}
async function loadStudentReviews(){
  try{const result=await apiRequest();reviews=Array.isArray(result.reviews)?result.reviews:[];renderViews();const directId=new URL(location.href).searchParams.get('v');if(reviewPage&&directId){const target=reviews.find(review=>review.videoId===directId);if(target){const card=document.querySelector(`[data-review-card="${CSS.escape(target.id)}"]`);card?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});setTimeout(()=>playVideo(target,{updateUrl:false}),250)}}}
  catch{document.querySelectorAll('[data-review-error]').forEach(node=>node.hidden=false)}
}
export function initStudentReviews(){
  const home=document.querySelector('[data-student-review-home]'),page=document.querySelector('[data-review-grid]');if(!home&&!page)return;
  document.addEventListener('click',event=>{
    const play=event.target.closest('[data-review-play]'),stop=event.target.closest('[data-review-stop]'),share=event.target.closest('[data-review-share]');
    if(stop){event.preventDefault();stopPlaying();return}
    if(play){const review=reviews.find(item=>item.id===play.dataset.reviewPlay);if(review)playVideo(review);return}
    const card=event.target.closest('[data-review-card]');if(card&&!event.target.closest('button,a,iframe')){const review=reviews.find(item=>item.id===card.dataset.reviewCard);if(review)playVideo(review);return}
    if(share){const review=reviews.find(item=>item.id===share.dataset.reviewShare);if(review)shareReview(review)}
  });
  document.addEventListener('keydown',event=>{const card=event.target.closest('[data-review-card]');if(card&&(event.key==='Enter'||event.key===' ')){if(event.target.closest('button,a'))return;event.preventDefault();const review=reviews.find(item=>item.id===card.dataset.reviewCard);if(review)playVideo(review)}});
  document.querySelector('[data-review-search]')?.addEventListener('input',()=>{stopPlaying();renderViews()});
  loadStudentReviews();
}

export function initFacultyStudentReviews(){
  const form=document.querySelector('[data-review-form]'),list=document.querySelector('[data-faculty-reviews]');if(!form||!list)return;
  const title=form.elements.title,url=form.elements.url,description=form.elements.description,submit=form.querySelector('[data-review-submit]'),cancel=form.querySelector('[data-review-cancel]'),status=form.querySelector('[data-review-status]');let items=[],editingId='';
  const message=(text,isError=false)=>{status.textContent=text;status.classList.toggle('is-error',isError);status.classList.toggle('is-success',Boolean(text)&&!isError)};
  const reset=()=>{editingId='';form.reset();submit.textContent='Add Review';cancel.hidden=true};
  const draw=()=>{document.querySelector('[data-review-count]').textContent=String(items.length);list.innerHTML=items.length?items.map(item=>`<article class="faculty-resource-row faculty-review-row"><div class="faculty-resource-row-icon" aria-hidden="true">▶</div><div class="faculty-resource-row-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description||'Student video review')}</span></div><a class="faculty-open-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}" target="_blank" rel="noopener noreferrer">Open ↗</a><button type="button" class="faculty-edit" data-review-edit="${escapeHtml(item.id)}">Edit</button><button type="button" class="faculty-delete" data-review-delete="${escapeHtml(item.id)}">Delete</button></article>`).join(''):'<p class="faculty-empty-list">Abhi koi student review nahi hai.</p>'};
  const refresh=async()=>{const response=await apiRequest();items=Array.isArray(response.reviews)?response.reviews:[];draw()};
  list.addEventListener('click',async event=>{const edit=event.target.closest('[data-review-edit]'),remove=event.target.closest('[data-review-delete]');if(edit){const item=items.find(review=>review.id===edit.dataset.reviewEdit);if(!item)return;editingId=item.id;title.value=item.title;description.value=item.description||'';url.value=`https://www.youtube.com/watch?v=${item.videoId}`;submit.textContent='Update Review';cancel.hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});title.focus({preventScroll:true});return}if(remove){const item=items.find(review=>review.id===remove.dataset.reviewDelete);if(!item||!window.confirm(`Ye review delete karna hai? ${item.title}`))return;remove.disabled=true;message('Deleting review…');try{await apiRequest('delete',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id})});await refresh();message('Review delete ho gaya')}catch(error){message(error.message,true)}finally{remove.disabled=false}}});
  form.querySelector('[data-review-test]').addEventListener('click',()=>{try{const parsed=new URL(url.value.trim());if(parsed.protocol!=='https:'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(parsed.hostname))throw new Error();window.open(parsed.href,'_blank','noopener,noreferrer')}catch{message('Valid HTTPS YouTube video link enter karein.',true)}});
  cancel.addEventListener('click',()=>{reset();message('')});
  form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;cancel.disabled=true;message(editingId?'Updating review…':'Adding review…');const body={title:title.value,url:url.value,description:description.value,...(editingId?{id:editingId}:{})};try{await apiRequest(editingId?'update':'add',{method:editingId?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const updated=Boolean(editingId);reset();await refresh();message(updated?'Review update ho gaya':'Review add ho gaya')}catch(error){message(error.message,true)}finally{submit.disabled=false;cancel.disabled=false}});
  refresh().catch(error=>message(error.message,true));
}
