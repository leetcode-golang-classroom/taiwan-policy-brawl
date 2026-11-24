import * as THREE from 'three';
import {camera,mount,addCameraShake,camRig} from '../scene.js';
import {$} from '../utils/dom.js';
import {KO} from '../config.js';
import {burst,addFx} from '../vfx/VFXSystem.js';
import {isKoPhase} from '../systems/roundSystem.js';
import {createReplayBuffer,recordFrame,clearBuffer,clipFrames,applyClipTime,clipLength,timeScaleFor} from './koReplay.js';

// KO cinematic (presentation only): K.O. banner, slow-motion replay of the lethal hit, impact freeze and the camera push-in.
// The state machine itself lives in systems/roundSystem.js (match.phase); this module only reads it and drives visuals.
const TOTAL=KO.trigger+KO.replay+KO.freeze+KO.defeat,CAM_END=KO.trigger+KO.replay+KO.freeze;
const smooth=x=>x*x*(3-2*x);

export function initKoCinematic(world){
  const buf=createReplayBuffer(120);
  let clip=[],r0=12;
  const layer=document.createElement('div');layer.id='ko-fx';
  layer.innerHTML='<div class="ko-vignette"></div><div class="ko-banner">K.O.</div><div class="ko-sub" id="ko-sub"></div><div class="ko-replay">▶ REPLAY</div>';
  mount.parentElement.appendChild(layer);
  const sub=layer.querySelector('#ko-sub');
  const pulse=()=>{const f=$('#hit-flash');f.classList.remove('active');void f.offsetWidth;f.classList.add('active');};
  const hitPos=()=>{const p=world.match.ko?.hit?.pos;return p?new THREE.Vector3(p.x,p.y,p.z):new THREE.Vector3();};
  const on=(n,f)=>world.events.on(n,f);

  on('roundStart',()=>{clearBuffer(buf);layer.removeAttribute('data-phase');camRig.ko=null;});
  on('ko',e=>{
    recordFrame(buf,world);   // the exact frame the blow landed (logic is mid-tick, the hit is resolved)
    clip=clipFrames(buf,KO.clip);r0=camRig.radius;
    const k=world.match.ko;k.camera={pos:camera.position.toArray(),rot:[camera.rotation.x,camera.rotation.y,camera.rotation.z]};   // saved with the last-hit record
    const c=hitPos();burst(c,0xffffff,34);burst(c,0xffc15c,22);addCameraShake(.45,.4);pulse();
    sub.textContent='';
  });
  on('phase_change',e=>{
    if(!isKoPhase(e.phase))return layer.removeAttribute('data-phase');
    layer.dataset.phase=e.phase;
    if(e.phase==='KO_FREEZE'){   // impact freeze: shockwave + strong flash on the lethal frame
      const c=hitPos(),h=world.match.ko?.hit;
      burst(c,0xfff2b8,40);burst(c,0xff8f5a,24);
      for(const [r,life] of [[.7,.7],[1.4,.9]]){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.08,8,44),new THREE.MeshBasicMaterial({color:0xfff2b8,transparent:true,opacity:.95,depthWrite:false}));
        ring.position.copy(c);ring.lookAt(camera.position);addFx(ring,life,'ring');
      }
      addCameraShake(.55,.3);pulse();
      if(h)sub.textContent=`最後一擊 -${Math.round(h.amount)}`;
      world.events.emit('koFlash',{id:world.match.ko.loser,dur:.5,peak:1.5});
      world.events.emit('koImpact',{winner:world.match.ko.winner,loser:world.match.ko.loser,hit:h});
    }
  });

  return {
    /** Call after every logic step: keeps the last frames of normal play. */
    record(){if(world.match.phase==='NORMAL_FIGHT'&&world.match.running)recordFrame(buf,world);},
    scale(){return timeScaleFor(world.match.phase,clipLength(clip));},
    /** Call once per rendered frame with REAL dt: replays the clip, freezes the impact, pushes the camera in. */
    update(){
      const m=world.match,k=m.ko;
      if(!isKoPhase(m.phase)&&layer.hasAttribute('data-phase'))layer.removeAttribute('data-phase');   // e.g. left the battle mid-KO
      if(!k||!isKoPhase(m.phase)){camRig.ko=null;return;}
      if(m.phase==='KO_REPLAY'&&clip.length>1){   // visual re-enactment: components follow the recorded clip, nothing is simulated
        const p=Math.min(1,Math.max(0,(k.t-KO.trigger)/KO.replay));
        applyClipTime(world,clip,clip[0].time+p*clipLength(clip));
      }else if(m.phase==='KO_FREEZE'&&clip.length)applyClipTime(world,clip,clip[clip.length-1].time);
      if(m.phase==='DEFEAT_ANIMATION'){camRig.ko=null;return;}   // camera eases back to the normal fight view
      const u=smooth(Math.min(1,k.t/CAM_END)),p=k.hit?.pos||{x:0,y:1.2,z:0},C=KO.cam;
      camRig.ko={x:p.x,y:p.y,z:p.z,radius:r0+(C.radius*(m.phase==='KO_FREEZE'?.93:1)-r0)*u,yaw:C.yaw*u*(world.match.ko.winner==='player'?1:-1),pitch:C.pitch*u};
    },
  };
}
