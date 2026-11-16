import {renderer,camState} from '../scene.js';
import {pressAttack,pressJump,pressDodge,pressDefend,pressMoveKey} from '../systems/playerControl.js';

// DOM -> Control layer. Only records raw input; all decisions are made by the Control systems.
export function initInput(world){
  const keys={};
  const attackKeys={KeyJ:'basic',KeyK:'skill',KeyL:'ult'};
  window.addEventListener('keydown',e=>{
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
  const el=renderer.domElement;
  el.addEventListener('pointerdown',e=>{camState.drag=true;camState.last={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!camState.drag)return;camState.yaw-=(e.clientX-camState.last.x)*.004;camState.pitch=Math.max(-.05,Math.min(.65,camState.pitch+(e.clientY-camState.last.y)*.002));camState.last={x:e.clientX,y:e.clientY};keys.camYaw=camState.yaw;});
  el.addEventListener('pointerup',()=>camState.drag=false);el.addEventListener('pointercancel',()=>camState.drag=false);
  return keys;
}
