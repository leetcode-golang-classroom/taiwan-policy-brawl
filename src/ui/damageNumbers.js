import * as THREE from 'three';
import {camera,mount} from '../scene.js';

// Floating damage numbers. The value shown is the logic layer's `hit.amount` (HP actually lost), never a recomputed guess.
const layer=document.createElement('div');layer.id='damage-layer';
mount.parentElement.appendChild(layer);
const v=new THREE.Vector3();
const recent=new Map();   // targetId -> timestamps of numbers spawned lately, used to stagger overlapping numbers

export function damageTier(amount,launched){
  if(launched||amount>=30)return 'huge';
  if(amount>=15)return 'big';
  if(amount>=9)return 'mid';
  return 'small';
}
export function initDamageNumbers(world){
  world.events.on('hit',e=>{
    if(!(e.amount>0))return;
    const t=world.get(e.targetId,'transform');if(!t)return;
    v.set(t.x,t.y+2.1,t.z).project(camera);
    if(v.z>1)return;
    const now=performance.now(),list=(recent.get(e.targetId)||[]).filter(x=>now-x<700);list.push(now);recent.set(e.targetId,list);
    const stack=list.length-1,w=layer.clientWidth,h=layer.clientHeight;
    const el=document.createElement('div');
    el.className=`damage-number ${damageTier(e.amount,e.launched)} ${world.get(e.targetId,'fighter').side}${e.reduced?' reduced':''}`;
    el.textContent=`${e.roll?`🎲${e.roll} `:''}-${Math.round(e.amount)}`;
    el.style.left=`${(v.x*.5+.5)*w+(stack%2?1:-1)*Math.ceil(stack/2)*22}px`;
    el.style.top=`${(-v.y*.5+.5)*h-stack*18}px`;
    layer.appendChild(el);
    setTimeout(()=>el.remove(),1000);
  });
}
