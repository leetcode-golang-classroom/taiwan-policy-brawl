// Battle BGM: one looping <audio> element (streamed, so the ~1 MB file is not decoded into RAM). Presentation layer only.
// Plays on the battle screen, stops on character select; the volume fades in/out so cuts never click.
// Default volume is moderate (0.22 was too quiet); B toggles mute, the choice is kept in localStorage.
const SRC=`${import.meta.env.BASE_URL}audio/bgm/battle.mp3`;
const KEY='pb.bgm.v2',DEFAULT_VOL=.45,FADE=.9;   // FADE: seconds
export const bgmState={muted:false,volume:DEFAULT_VOL};
try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');if(typeof s.muted==='boolean')bgmState.muted=s.muted;if(Number.isFinite(s.volume))bgmState.volume=Math.min(1,Math.max(0,s.volume));}catch{}
let el=null,want=false,fade=0,raf=0,last=0;   // fade: 0 (silent) .. 1 (full)
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(bgmState));}catch{}};
function ensure(){
  if(el)return el;
  el=new Audio();el.src=SRC;el.loop=true;el.preload='none';el.volume=0;   // lazy: nothing is downloaded until a match starts
  return el;
}
function tick(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  fade=Math.min(1,Math.max(0,fade+(want&&!bgmState.muted?dt:-dt)/FADE));
  el.volume=bgmState.volume*fade*fade;
  if(fade===0&&(!want||bgmState.muted)){el.pause();raf=0;return;}
  if(fade===1&&want&&!bgmState.muted){raf=0;return;}
  raf=requestAnimationFrame(tick);
}
function kick(){if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
export function startBgm(){
  want=true;if(bgmState.muted)return;
  const a=ensure();
  if(a.paused)a.play().catch(()=>{});   // autoplay blocked or file missing: stay silent, never break the game
  kick();
}
export function stopBgm(){want=false;if(el)kick();}
export function toggleBgmMute(){
  bgmState.muted=!bgmState.muted;save();
  if(bgmState.muted)kick();else if(want)startBgm();
  return bgmState.muted;
}
export function setBgmVolume(v){bgmState.volume=Math.min(1,Math.max(0,v));save();}
