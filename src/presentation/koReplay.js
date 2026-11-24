// KO replay buffer (pure data, no Three / DOM). The "replay" is a visual re-enactment, never a re-simulation:
// every logic frame the fighters' animation-driving components are copied into a preallocated ring (no per-frame allocation after warm-up);
// during the KO the last `clip` seconds are written back into those components as a blend of two neighbouring frames.
// Health, energy, combo, score and events are never touched, so a replay cannot damage, score, hit or voice anything.
import {fighterOf} from '../ecs/entities.js';
import {KO} from '../config.js';

const SIDES=['player','cpu'];
const COMPONENTS=['transform','body','status','attacker','defense'];

function copyInto(dst,src){
  for(const k in src){
    const v=src[k];
    if(v&&typeof v==='object'){const d=dst[k]&&typeof dst[k]==='object'?dst[k]:(dst[k]={});for(const kk in v)d[kk]=v[kk];}   // one level deep; deeper refs (skill configs) are shared
    else dst[k]=v;
  }
}
export function createReplayBuffer(size=120){
  return {size,head:0,count:0,slots:Array.from({length:size},()=>({time:0,f:{player:{},cpu:{}}}))};
}
export function recordFrame(buf,world){
  const s=buf.slots[buf.head];s.time=world.time;
  for(const side of SIDES){const id=fighterOf(world,side);for(const c of COMPONENTS){const src=world.get(id,c);if(src)copyInto(s.f[side][c]??={},src);}}
  buf.head=(buf.head+1)%buf.size;buf.count=Math.min(buf.size,buf.count+1);
}
export function clearBuffer(buf){buf.head=0;buf.count=0;}
/** Frames of the last `seconds` of recorded play, oldest first (the newest is the lethal-hit frame). */
export function clipFrames(buf,seconds){
  const out=[];if(!buf.count)return out;
  const newest=buf.slots[(buf.head-1+buf.size)%buf.size].time;
  for(let i=buf.count;i>=1;i--){const s=buf.slots[(buf.head-i+buf.size)%buf.size];if(s.time>=newest-seconds-1e-9)out.push(s);}
  return out;
}
function blendInto(dst,A,B,k,depth=0){
  for(const key in A){
    const v=A[key],w=B?.[key];
    if(typeof v==='number'){dst[key]=k>0&&typeof w==='number'?v+(w-v)*k:v;}
    else if(v&&typeof v==='object'){
      if(depth>0){dst[key]=v;continue;}
      const d=dst[key]&&typeof dst[key]==='object'?dst[key]:(dst[key]={});
      blendInto(d,v,w&&typeof w==='object'?w:null,k,1);
    }else dst[key]=v;
  }
}
/** Write the state at clip time `t` (between two recorded frames) into the fighters' components. */
export function applyClipTime(world,clip,t){
  if(!clip.length)return;
  let i=0;while(i<clip.length-1&&clip[i+1].time<=t)i++;
  const a=clip[i],b=clip[Math.min(i+1,clip.length-1)],span=b.time-a.time,k=span>1e-9?Math.min(1,Math.max(0,(t-a.time)/span)):0;
  for(const side of SIDES){const id=fighterOf(world,side);for(const c of COMPONENTS){
    const dst=world.get(id,c),A=a.f[side][c];if(dst&&A)blendInto(dst,A,b.f[side][c],k);
  }}
}
export const clipLength=clip=>clip.length>1?clip[clip.length-1].time-clip[0].time:0;

const NORMAL={logic:1,anim:1,vfx:1},scratch={logic:0,anim:0,vfx:0};
/** Per-phase time scales: fighters/physics (logic), their animation clock (anim) and particles (vfx). Everything else stays on real time. */
export function timeScaleFor(phase,clipLen=0){
  const s=KO.scale[phase];if(!s)return NORMAL;
  scratch.logic=s.logic;scratch.vfx=s.vfx;scratch.anim=s.anim??(clipLen>0?clipLen/KO.replay:s.vfx);
  return scratch;
}
