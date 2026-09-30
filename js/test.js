(function(){
  const $=id=>document.getElementById(id);
  const stage=$('stage'),kid=$('kid'),kidSvg=kid.querySelector('svg'),arm=$('armFront'),shoulder=$('shoulder');
  const card=$('card'),beamGroup=$('beamGroup'),poly=$('beamPoly'),clipPoly=$('clipPoly'),tipC=$('tipCircle'),grad=$('beamGrad'),dust=$('dust');
  const enterBtn=$('enterBtn');
  let timers=[],raf=0,geometry=null,settled=false,held=0;
  const svgNS='http://www.w3.org/2000/svg';
  const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
  const normalizeAngle=angle=>{while(angle>Math.PI)angle-=2*Math.PI;while(angle<-Math.PI)angle+=2*Math.PI;return angle};

  function buildDust(){
    const bounds=stage.getBoundingClientRect();
    dust.replaceChildren();
    const count=bounds.width<720?28:52;
    for(let index=0;index<count;index+=1){
      const particle=document.createElementNS(svgNS,'circle');
      particle.setAttribute('cx',Math.random()*bounds.width);
      particle.setAttribute('cy',Math.random()*bounds.height);
      particle.setAttribute('r',(0.8+Math.random()*1.6).toFixed(2));
      particle.style.animationDuration=`${(5+Math.random()*7).toFixed(1)}s`;
      particle.style.animationDelay=`-${(Math.random()*8).toFixed(1)}s`;
      dust.append(particle);
    }
  }

  function measure(){
    const bounds=stage.getBoundingClientRect(),shoulderBounds=shoulder.getBoundingClientRect(),cardBounds=card.getBoundingClientRect();
    const sx=shoulderBounds.left+shoulderBounds.width/2,sy=shoulderBounds.top+shoulderBounds.height/2;
    const length=47*kidSvg.getBoundingClientRect().width/120;
    const cx=cardBounds.left+cardBounds.width/2,cy=cardBounds.top+cardBounds.height/2,pad=18;
    let angle=Math.atan2(cy-sy,cx-sx),tx,ty;
    for(let index=0;index<3;index+=1){tx=sx+Math.cos(angle)*length;ty=sy+Math.sin(angle)*length;angle=Math.atan2(cy-ty,cx-tx)}
    const corners=[[cardBounds.left-pad,cardBounds.top-pad],[cardBounds.right+pad,cardBounds.top-pad],[cardBounds.right+pad,cardBounds.bottom+pad],[cardBounds.left-pad,cardBounds.bottom+pad]];
    let half=0,far=0;
    corners.forEach(([x,y])=>{half=Math.max(half,Math.abs(normalizeAngle(Math.atan2(y-ty,x-tx)-angle)));far=Math.max(far,Math.hypot(x-tx,y-ty))});
    geometry={sx:sx-bounds.left,sy:sy-bounds.top,length,target:angle,half:Math.min(half+.03,.9),far:far*1.08};
  }

  function draw(angle){
    const tx=geometry.sx+Math.cos(angle)*geometry.length,ty=geometry.sy+Math.sin(angle)*geometry.length;
    const x1=tx+Math.cos(angle-geometry.half)*geometry.far,y1=ty+Math.sin(angle-geometry.half)*geometry.far;
    const x2=tx+Math.cos(angle+geometry.half)*geometry.far,y2=ty+Math.sin(angle+geometry.half)*geometry.far;
    const points=`${tx},${ty} ${x1},${y1} ${x2},${y2}`;
    poly.setAttribute('points',points);clipPoly.setAttribute('points',points);tipC.setAttribute('cx',tx);tipC.setAttribute('cy',ty);
    grad.setAttribute('x1',tx);grad.setAttribute('y1',ty);grad.setAttribute('x2',tx+Math.cos(angle)*geometry.far);grad.setAttribute('y2',ty+Math.sin(angle)*geometry.far);
    arm.style.transform=`rotate(${angle*180/Math.PI}deg)`;
  }

  function finish(){
    draw(geometry.target);card.style.opacity='';card.style.transition='';card.classList.add('lit');card.removeAttribute('inert');
    beamGroup.classList.add('idle');settled=true;
  }

  function sweep(){
    const offset=.85,duration=2.4,started=performance.now();
    arm.style.transition='none';card.style.transition='none';
    (function step(now){
      const elapsed=(now-started)/1000,oscillation=offset*Math.exp(-2.4*elapsed)*Math.cos(7.5*elapsed);
      draw(geometry.target+oscillation);
      const distance=Math.abs(oscillation),half=geometry.half*.5,brightness=distance<=half?1:Math.max(0,1-(distance-half)/(geometry.half*1.5));
      held=Math.max(held,brightness);card.style.opacity=(.035+.965*held).toFixed(3);
      if(elapsed<duration)raf=requestAnimationFrame(step);else finish();
    })(started);
  }

  function play(){
    timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);settled=false;held=0;
    beamGroup.classList.remove('on','idle');card.classList.remove('lit');card.setAttribute('inert','');card.style.opacity='';card.style.transition='';
    kid.classList.remove('walking','jump');arm.style.transition='';arm.style.transform='rotate(82deg)';
    kid.style.transition='none';kid.style.transform='translateX(0)';
    const kidBounds=kid.getBoundingClientRect();kid.style.transform=`translateX(${-kidBounds.right-30}px)`;void kid.offsetWidth;
    kid.style.transition='transform 2.7s cubic-bezier(.25,.55,.4,1)';kid.style.transform='translateX(0)';kid.classList.add('walking');
    later(()=>kid.classList.remove('walking'),2700);
    later(()=>{measure();buildDust();arm.style.transition='transform .55s cubic-bezier(.3,1.3,.5,1)';draw(geometry.target+.85)},3100);
    later(()=>beamGroup.classList.add('on'),3800);
    later(sweep,4550);
    later(()=>{if(!settled){cancelAnimationFrame(raf);finish()}},8500);
  }

  enterBtn.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const destination=enterBtn.href;
    try{
      window.setTimeout(()=>{window.location.href=destination},500);
      event.preventDefault();
      enterBtn.querySelector('span:first-child').textContent='Opening…';
      kid.classList.remove('jump');void kid.offsetWidth;kid.classList.add('jump');
    }catch{window.location.href=destination}
  });
  window.addEventListener('resize',()=>{if(!geometry)return;measure();buildDust();if(settled){arm.style.transition='none';draw(geometry.target)}});
  $('replay').addEventListener('click',play);kidSvg.addEventListener('click',play);
  play();
})();
