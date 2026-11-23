import {renderer,camState} from '../scene.js';
import * as ctl from '../systems/playerControl.js';
import {fighterOf} from '../ecs/entities.js';

// DOM -> Control layer. Only records raw input; all decisions are made by the Control systems.
export function initInput(world){
  const keys={};
  // Local actions: act on the local side and, in an online match, forward the command to the peer.
  const side=()=>ctl.localSide(world),send=c=>world.net?.send({t:'cmd',...c});
  const intent=()=>world.get(fighterOf(world,side()),'intent');
  const pressAttack=(w,_s,tier)=>{ctl.pressAttack(world,side(),tier);send({k:'a',v:tier});};
  const pressJump=()=>{ctl.pressJump(world,side());send({k:'j'});};
  const pressDefend=()=>{ctl.pressDefend(world,side());send({k:'f'});};
  const pressDodge=(w,_s,k)=>{ctl.pressDodge(world,side(),k);const it=intent();send({k:'d',dir:it.dodgeDir});};
  const pressMoveKey=(w,_s,code,k)=>{if(ctl.pressMoveKey(world,side(),code,k)){const r=intent().rush;if(r)send({k:'r',dir:r});}};
  const attackKeys={KeyJ:'basic',KeyK:'skill',KeyL:'ult'};
  window.addEventListener('keydown',e=>{
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;   // typing a connection code
    keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    pressMoveKey(world,'player',e.code,keys);
    if(attackKeys[e.code])pressAttack(world,'player',attackKeys[e.code]);
    if(e.code==='KeyI')pressDefend(world,'player');
    if(e.code==='Space')pressJump(world,'player');
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')pressDodge(world,'player',keys);
  });
  window.addEventListener('keyup',e=>keys[e.code]=false);
  // Touch / mouse: the skill cards are buttons that feed the same Control entry points as the keys.
  const cardActions={'card-basic':()=>pressAttack(world,'player','basic'),'card-skill':()=>pressAttack(world,'player','skill'),'card-ult':()=>pressAttack(world,'player','ult'),'card-defense':()=>pressDefend(world,'player')};
  for(const [id,fn] of Object.entries(cardActions)){
    const card=document.getElementById(id);if(!card)continue;
    card.addEventListener('pointerdown',e=>{e.preventDefault();fn();});
  }
  // On-screen d-pad / jump / dodge: same entry points as the keyboard (hold = key down, so double-tap rush still works).
  // Ring joystick: drag the knob; the offset is quantised to W/A/S/D (8 directions) and fed as held keys.
  const stick=document.getElementById('stick'),knob=document.getElementById('stick-knob');
  if(stick&&knob){
    const dirs={KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};
    const release=()=>{for(const c in dirs)keys[c]=false;knob.style.transform='translate(-50%,-50%)';};
    const drive=e=>{
      const r=stick.getBoundingClientRect(),R=r.width/2;
      let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);const l=Math.hypot(dx,dy);
      if(l>R){dx*=R/l;dy*=R/l;}
      knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      const t=R*.3;
      const want={KeyW:dy<-t,KeyS:dy>t,KeyA:dx<-t,KeyD:dx>t};
      for(const c in dirs){const was=!!keys[c];keys[c]=want[c];if(want[c]&&!was)pressMoveKey(world,'player',c,keys);}
    };
    stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);drive(e);});
    stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))drive(e);});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(ev,release);
  }
  // On-screen attack buttons reuse the card actions and mirror each card's state (cooling / available / guarding).
  for(const b of document.querySelectorAll('#touch-pad [data-card]')){
    const card=document.getElementById(b.dataset.card),fn=cardActions[b.dataset.card];if(!card)continue;
    b.addEventListener('pointerdown',e=>{e.preventDefault();fn();});
    const sync=()=>{for(const c of ['cooling','available','guarding'])b.classList.toggle(c,card.classList.contains(c));};
    new MutationObserver(sync).observe(card,{attributes:true,attributeFilter:['class']});sync();
  }
  for(const b of document.querySelectorAll('#touch-pad [data-act]')){
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.dataset.act==='jump')pressJump(world,'player');else pressDodge(world,'player',keys);});
  }
  // iOS Safari ignores user-scalable=no: block pinch (gesture*) and double-tap zoom explicitly.
  for(const g of ['gesturestart','gesturechange','gestureend'])document.addEventListener(g,e=>e.preventDefault());
  let lastTouchEnd=0;
  document.addEventListener('touchend',e=>{
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
    const now=Date.now();if(now-lastTouchEnd<300&&e.cancelable)e.preventDefault();lastTouchEnd=now;
  },{passive:false});
  document.addEventListener('contextmenu',e=>{if(e.target.closest?.('.arena-wrap,.skill-row'))e.preventDefault();});
  const el=renderer.domElement;
  let camPointer=null;   // only one finger may drag the camera; a second finger (attack button) must not rotate it
  el.addEventListener('pointerdown',e=>{if(!e.isPrimary||camPointer!==null)return;camPointer=e.pointerId;camState.drag=true;camState.last={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!camState.drag)return;camState.yaw-=(e.clientX-camState.last.x)*.004;camState.pitch=Math.max(-.05,Math.min(.65,camState.pitch+(e.clientY-camState.last.y)*.002));camState.last={x:e.clientX,y:e.clientY};keys.camYaw=camState.yaw;});
  const endDrag=e=>{if(e.pointerId!==camPointer)return;camPointer=null;camState.drag=false;};
  el.addEventListener('pointerup',endDrag);el.addEventListener('pointercancel',endDrag);
  return keys;
}
