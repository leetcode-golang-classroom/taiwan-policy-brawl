import {World} from '../src/ecs/world.js';
import {createFighter,fighterOf} from '../src/ecs/entities.js';
import {startMatch} from '../src/systems/roundSystem.js';
import {stepWorld} from '../src/systems/index.js';

// Deterministic rng (mulberry32) so AI tests are reproducible.
export function seeded(seed=1){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function makeWorld({p='mech',c='leopard',rng=seeded(7)}={}){
  const world=new World({rng});
  const player=createFighter(world,{side:'player',charId:p});
  const cpu=createFighter(world,{side:'cpu',charId:c});
  return {world,player,cpu};
}
export function startedWorld(opts){const w=makeWorld(opts);startMatch(w.world);return w;}
// Put P1 at x=-6.5 and the CPU `dist` units away on the x axis; freeze the CPU's own control so only P1 acts.
export function arrange(w,{dist,cpuY=0}={}){
  const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');
  pt.x=-6.5;pt.z=0;pt.rotY=Math.PI/2;ct.x=-6.5+dist;ct.z=0;ct.y=cpuY;
  const brain=w.world.get(w.cpu,'brain');brain.attackCd=brain.skillCd=brain.jumpCd=1e9;
  const st=w.world.get(w.cpu,'status');st.stun=1e9;st.dodgeCooldown=1e9; // CPU can neither move nor dodge during the scenario
}
export function step(world,seconds,keys={},dt=1/60){for(let t=0;t<seconds;t+=dt)stepWorld(world,dt,keys);}
export function record(world,name){const list=[];world.events.on(name,e=>list.push(e));return list;}
export const hp=(w,who)=>w.world.get(who==='player'?w.player:w.cpu,'health').hp;
export {fighterOf};
