import {Transform,Body,Health,Energy,Fighter,Status,Attacker,Intent,Brain,Defense,FState,Combo} from './components.js';

export const SPAWN={player:{x:-3,z:1,rotY:0},cpu:{x:3,z:-1,rotY:Math.PI}};
// Per-side energy tuning (player gets slightly faster energy than CPU, as in V3.8).
export const ENERGY={player:{regen:1.2,gain:.65},cpu:{regen:.8,gain:.5}};

// Fighter entity: identical component set for P1 and CPU. Optional `view` is presentation-only.
export function createFighter(world,{side,charId,moveSpeed=5,jumpPower=8.2,view=null}){
  const s=SPAWN[side];
  const comps={
    fighter:Fighter({side,charId}),transform:Transform(s.x,s.z,s.rotY),body:Body({moveSpeed,jumpPower}),
    health:Health(100),energy:Energy(ENERGY[side]),status:Status(),attacker:Attacker(),defense:Defense(),intent:Intent(),fstate:FState(),combo:Combo()
  };
  if(side==='cpu')comps.brain=Brain();
  if(view)comps.view={obj:view};
  return world.create(comps);
}
export const fighterOf=(world,side)=>world.query('fighter').find(id=>world.get(id,'fighter').side===side);
export const opponentOf=(world,id)=>{const me=world.get(id,'fighter').side;return fighterOf(world,me==='player'?'cpu':'player');};
