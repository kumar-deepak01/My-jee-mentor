// Load animation libraries only for pointer devices that have not requested reduced motion.
if(matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  Promise.all([
    import('https://cdn.jsdelivr.net/npm/gsap@3.12.7/+esm'),
    import('https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm'),
    import('https://cdn.jsdelivr.net/npm/vanilla-tilt@1.8.1/+esm')
  ]).then(([gsapModule,LenisModule,tiltModule])=>{
    const gsap=gsapModule.gsap||gsapModule.default;
    const Lenis=LenisModule.default;
    const Tilt=tiltModule.default;
    if(Lenis){const lenis=new Lenis({smoothWheel:true,duration:1.05});const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)};requestAnimationFrame(raf);}
    if(Tilt?.init)Tilt.init(document.querySelectorAll('[data-tilt]'),{max:4,speed:450,glare:true,'max-glare':.12});
    document.querySelectorAll('.magnetic').forEach(el=>{el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.14,y:(e.clientY-r.top-r.height/2)*.14,duration:.22,ease:'power2.out'})});el.addEventListener('mouseleave',()=>gsap.to(el,{x:0,y:0,duration:.7,ease:'elastic.out(1,.35)'}))});
    if(gsap?.ScrollTrigger){gsap.registerPlugin(gsap.ScrollTrigger);gsap.utils.toArray('.step').forEach(el=>gsap.from(el,{opacity:0,y:18,duration:.55,scrollTrigger:{trigger:el,start:'top 90%'}}));}
  }).catch(()=>{});
}
