import {DEFENSE} from '../config.js';

// I-key exclusive defense. Pure logic: state lives in the `defense` component, visuals subscribe to events
// defenseStart / defenseEnd{broken}. Cooldown begins when the guard ends.
export const isGuarding=(world,id)=>!!world.get(id,'defense')?.active;

export function canDefend(world,id){
  const m=world.match,d=world.get(id,'defense'),s=world.get(id,'status'),a=world.get(id,'attacker'),b=world.get(id,'body');
  return !!d&&m.running&&!m.ended&&!d.active&&d.recovery<=0&&d.cooldown<=0&&s.stun<=0&&s.rootTrap<=0&&s.dodgeTimer<=0&&!a.charge&&b.grounded;
}
export function startDefense(world,id){
  if(!canDefend(world,id))return false;
  const d=world.get(id,'defense'),charId=world.get(id,'fighter').charId;
  d.active=true;d.timer=DEFENSE.duration;d.startup=DEFENSE.startup;d.layers=DEFENSE.layers[charId]||0;d.durability=DEFENSE.durability;d.counter=0;d.perfected=false;
  world.events.emit('defenseStart',{id,charId});
  return true;
}
export function endDefense(world,id,broken=false){
  const d=world.get(id,'defense');if(!d?.active)return;
  d.active=false;d.timer=0;d.startup=0;d.layers=0;d.cooldown=DEFENSE.cooldown*(d.perfected&&!broken?DEFENSE.perfectCooldownMul:1);d.recovery=DEFENSE.recovery;d.counter=0;
  world.events.emit('defenseEnd',{id,broken});
}
export function defenseSystem(world,dt){
  for(const id of world.query('defense','intent')){
    const d=world.get(id,'defense'),it=world.get(id,'intent');
    const want=it.defend;it.defend=false;
    d.recovery=Math.max(0,d.recovery-dt);d.counter=Math.max(0,d.counter-dt);
    if(d.active){
      if(d.startup>0){d.startup=Math.max(0,d.startup-dt);if(d.startup===0)world.events.emit('defenseReady',{id});}
      d.timer-=dt;if(d.timer<=0)endDefense(world,id);
    }
    else{d.cooldown=Math.max(0,d.cooldown-dt);if(want)startDefense(world,id);}
  }
}
// Hook used by resolveHit: how does the target's guard modify an incoming hit?
// -> {blocked, reduced, multiplier, knockbackMult}
export function applyDefense(world,targetId,attackerId,skill){
  const d=world.get(targetId,'defense');
  if(!d?.active||d.startup>0)return {blocked:false,reduced:false,multiplier:1,knockbackMult:1};
  const elapsed=DEFENSE.duration-d.timer;
  if(elapsed<=DEFENSE.startup+DEFENSE.perfect){   // PERFECT GUARD: timed right, nothing gets through (layers are not spent)
    d.perfected=true;d.counter=DEFENSE.counterWindow;
    return {blocked:true,reduced:false,multiplier:0,knockbackMult:0,perfect:true};
  }
  if(d.layers>0){ // layered bubbles: each hit pops one layer and is fully absorbed
    d.layers--;d.counter=DEFENSE.counterWindow;world.events.emit('defenseAbsorb',{id:targetId,layers:d.layers});
    if(d.layers===0)endDefense(world,targetId,true);
    return {blocked:true,reduced:false,multiplier:0,knockbackMult:0};
  }
  if((skill.type==='projectile'||skill.type==='homing')&&skill.blockable){d.counter=DEFENSE.counterWindow;return {blocked:true,reduced:false,multiplier:0,knockbackMult:0};}
  d.durability-=(skill.damage||0)*(DEFENSE.breakMul[skill.tier]||1);   // GUARD BREAK: the guard wears down
  if(d.durability<=0){endDefense(world,targetId,true);return {blocked:false,reduced:false,multiplier:DEFENSE.breakMult,knockbackMult:1,broken:true};}
  d.counter=DEFENSE.counterWindow;
  return {blocked:false,reduced:true,multiplier:1-DEFENSE.reduction,knockbackMult:DEFENSE.knockbackMult};
}
