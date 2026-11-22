import {REFLECT,chargeDurations,cooldownFor,COMBO,SKILL_ENERGY_BONUS,PHASES,ATTACK_TIME,INPUT_BUFFER} from '../config.js';
import {opponentOf} from '../ecs/entities.js';
import {attack,tickActiveHitbox} from './combatSystem.js';

// Consumes intent.attack: starts a charge, then releases the attack when the charge completes.
export function actionSystem(world,dt){
  const m=world.match;if(!m.running||m.ended)return;
  for(const id of world.query('fighter','intent','attacker','energy')){
    const intent=world.get(id,'intent'),a=world.get(id,'attacker'),e=world.get(id,'energy'),frozen=world.get(id,'status').frozen;
    // PHASE 2 input buffer: a press is either started now or remembered for INPUT_BUFFER seconds (one slot, newest wins).
    const pressed=intent.attack;intent.attack=null;
    if(pressed){
      if(pressed==='ult'&&e.value<100)world.events.emit('ultNotReady',{id});
      else if(!world.get(id,'defense')?.active)a.buffer={tier:pressed,time:world.time};
    }
    if(frozen){if(a.buffer)a.buffer.time+=dt;continue;}   // PHASE 3: hit stop holds the attack/charge/buffer clocks (presses are still recorded above)
    if(a.buffer&&world.time-a.buffer.time>INPUT_BUFFER)a.buffer=null;   // expired inputs never fire late
    if(a.buffer){
      const tier=a.buffer.tier;
      if(world.get(id,'defense')?.active||(tier==='ult'&&e.value<100))a.buffer=null;   // state changed under the buffered press
      else if(canStart(a,tier,world.get(id,'status').stun)){a.buffer=null;startCharge(world,id,tier);}
    }
    tickActiveHitbox(world,id,dt);
    if(a.charge){
      a.charge.time+=dt;
      if(a.charge.time>=a.charge.duration)release(world,id);
    }
    setPhase(world,id,a,phaseOf(world,id,a));
  }
}
// PHASE 4/5 cancel rules. While an attack animation is still running (attackTime>0):
//  - missed attack: nothing may start until it has fully recovered (no unlimited whiff cancelling);
//  - connected attack, in recovery: J may chain into the next J (steps 1-2) and K may be used (combo cancel); L may not.
export function canStart(a,tier,stun=0){
  if(a.charge||stun>0)return false;   // PHASE 6: no attacking while in hit stun (a buffered press fires when it ends)
  const busy=a.attackTime>0;
  const cancelWindow=busy&&a.hitConfirmed&&a.phase==='recovery';
  if(tier==='basic'&&cancelWindow&&a.comboStep>0&&a.comboStep<3)return true;   // J -> J on hit ignores the basic cooldown
  if(a.cooldowns[tier]>0)return false;
  if(!busy)return true;
  return cancelWindow&&tier==='skill';
}
// Six phases: windup -> charge -> strike (arm thrust, still pending) -> impact (hit/launch frame) -> recovery -> idle.
// The hit itself resolves when `strike` ends (see release), i.e. at the start of `impact`.
export function phaseOf(world,id,a){
  const c=a.charge;
  if(c){
    const w=PHASES.windup[c.tier],st=PHASES.strike[c.tier];
    return c.time<w?'windup':c.time<c.duration-st?'charge':'strike';
  }
  if(a.attackTime>0){
    if(world.get(id,'dash'))return 'strike';
    const tier=a.attackStyle||'basic';
    return ATTACK_TIME[tier]-a.attackTime<PHASES.impact[tier]?'impact':'recovery';
  }
  return 'idle';
}
function setPhase(world,id,a,phase){
  if(a.phase===phase)return;
  a.phase=phase;world.events.emit('phase',{id,phase,tier:a.charge?.tier||a.attackStyle});
}
function startCharge(world,id,tier){
  const a=world.get(id,'attacker');
  if(tier==='basic'){a.comboStep=a.comboWindow>0?a.comboStep%3+1:1;}
  const duration=chargeDurations[tier]+(tier==='basic'&&a.comboStep===3?COMBO.step3ChargeBonus:0);
  a.charge={tier,time:0,duration,comboStep:tier==='basic'?a.comboStep:0};
  a.attackTime=0;a.hitConfirmed=false;a.active=null;
  world.events.emit('chargeStart',{id,tier});
}
function release(world,id){
  const a=world.get(id,'attacker'),e=world.get(id,'energy'),c=a.charge;
  a.charge=null;
  const tier=c.tier;
  a.cooldowns[tier]=cooldownFor(world.get(id,'fighter').charId,tier);
  if(tier==='basic'){
    // (re)store the step: the status tick clears comboStep while the window is closed (i.e. during the charge)
    a.comboWindow=COMBO.window;a.comboStep=c.comboStep||1;
    if(world.get(id,'fighter').charId===REFLECT.charId)world.get(id,'status').reflect=REFLECT.duration;
    attack(world,id,'basic',{onHit:()=>comboHit(world,id,c.comboStep||1)});
  } else {
    a.comboWindow=0;a.comboStep=0;
    if(tier==='skill')e.value=Math.min(100,e.value+SKILL_ENERGY_BONUS);else e.value=0;
    attack(world,id,tier);
  }
}
function comboHit(world,id,step){
  const a=world.get(id,'attacker'),tid=opponentOf(world,id),st=world.get(tid,'status'),body=world.get(tid,'body');
  a.comboHits++;
  if(step===2)st.stun=COMBO.step2Stun;
  if(step===3){st.stun=COMBO.step3Stun;body.vy=Math.max(body.vy,COMBO.step3Launch);body.grounded=false;}
  world.events.emit('comboHit',{attackerId:id,targetId:tid,step});
}
