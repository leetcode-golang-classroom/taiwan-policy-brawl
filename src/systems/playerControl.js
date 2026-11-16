import {fighterOf} from '../ecs/entities.js';
import {RUSH} from '../config.js';

// CONTROL (player): turns raw input into the player's Intent component. No DOM here: the DOM layer only fills `keys`.
// WASD is camera-relative: `keys.camYaw` (set by the DOM layer) rotates the input so W is always "into the screen".
export function moveFromKeys(keys){
  const x=(keys.KeyD?1:0)-(keys.KeyA?1:0),z=(keys.KeyS?1:0)-(keys.KeyW?1:0);
  const l=Math.hypot(x,z);if(!l)return {x:0,z:0};
  const nx=x/l,nz=z/l,y=keys.camYaw||0,c=Math.cos(y),s=Math.sin(y);
  return {x:nx*c+nz*s,z:-nx*s+nz*c};
}
const DIR_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD']);
export function playerControl(world,keys){
  const id=fighterOf(world,'player');if(id===undefined)return;
  const it=world.get(id,'intent'),mv=moveFromKeys(keys);it.moveX=mv.x;it.moveZ=mv.z;
}
// Edge-triggered commands (called from keydown handlers)
export function pressAttack(world,side,tier){world.get(fighterOf(world,side),'intent').attack=tier;}
export function pressJump(world,side){world.get(fighterOf(world,side),'intent').jump=true;}
export function pressDodge(world,side,keys={}){
  const it=world.get(fighterOf(world,side),'intent'),mv=moveFromKeys(keys);
  it.dodge=true;it.dodgeDir=(mv.x||mv.z)?mv:null;
}
// Double-tap a direction key within RUSH.doubleTap seconds -> rush in that direction (keys must already include this key).
export function pressMoveKey(world,side,code,keys={}){
  if(!DIR_KEYS.has(code))return false;
  const it=world.get(fighterOf(world,side),'intent'),now=world.time,tap=it.lastTap;
  const double=tap.code===code&&now-tap.time<=RUSH.doubleTap;
  it.lastTap={code,time:now};
  if(!double)return false;
  const single={camYaw:keys.camYaw,[code]:true};   // direction of that one key, not of the whole held set
  it.rush=moveFromKeys(single);it.lastTap={code:null,time:-9};return true;
}
export function pressDefend(world,side){world.get(fighterOf(world,side),'intent').defend=true;}
