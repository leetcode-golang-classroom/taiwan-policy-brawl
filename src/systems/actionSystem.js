import {DEFENSE,airFor,comboStepsFor,COMBO_STEPS,DODGE,REFLECT,chargeDurations,cooldownFor,COMBO,SKILL_ENERGY_BONUS,PHASES,ATTACK_TIME,INPUT_BUFFER} from '../config.js';
import {opponentOf} from '../ecs/entities.js';
import {attack,tickActiveHitbox} from './combatSystem.js';
import {endDefense} from './defenseSystem.js';

// Consumes intent.attack: starts a charge, then releases the attack when the charge completes.
export function actionSystem(world,dt){
  const m=world.match;if(!m.running||m.ended)return;
  for(const id of world.query('fighter','intent','attacker','energy')){
    const intent=world.get(id,'intent'),a=world.get(id,'attacker'),e=world.get(id,'energy'),frozen=world.get(id,'status').frozen;
    // PHASE 2 input buffer: a press is either started now or remembered for INPUT_BUFFER seconds (one slot, newest wins).
    const pressed=intent.attack;intent.attack=null;
    if(pressed){
      if(pressed==='ult'&&e.value<100)world.events.emit('ultNotReady',{id});
      else if(world.get(id,'defense')?.active&&pressed==='basic'&&world.get(id,'defense').counter>0){   // GUARD COUNTER: cancel the guard into a boosted J
        const d=world.get(id,'defense');endDefense(world,id);d.recovery=0;d.cooldown*=.5;a.counterBoost=DEFENSE.counterBoost;
        world.events.emit('guardCounter',{id});a.buffer={tier:pressed,time:world.time};
      }
      else if(!world.get(id,'defense')?.active)a.buffer={tier:pressed,time:world.time};
    }
    if(frozen){if(a.buffer)a.buffer.time+=dt;continue;}   // PHASE 3: hit stop holds the attack/charge/buffer clocks (presses are still recorded above)
    if(a.buffer&&world.time-a.buffer.time>INPUT_BUFFER)a.buffer=null;   // expired inputs never fire late
    if(a.buffer){
      const tier=a.buffer.tier;
      if(world.get(id,'defense')?.active||(tier==='ult'&&e.value<100))a.buffer=null;   // state changed under the buffered press
      else if(canStart(a,tier,actionLocked(world,id),comboStepsFor(world.get(id,'fighter').charId))){a.buffer=null;startCharge(world,id,tier);}
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
//  - connected attack: J may chain into the next J (steps 1-2) and K may be used (combo cancel); L may not.
// Why a fighter cannot START an attack right now (a buffered press fires when the lock ends):
// hit stun (PHASE 6), guard recovery and the committed part of a dodge (PHASE 12).
export function actionLocked(world,id){
  const st=world.get(id,'status'),d=world.get(id,'defense');
  return st.stun>0||(d?.recovery>0)||(st.dodgeTimer>0&&DODGE.duration-st.dodgeTimer<DODGE.attackAfter);
}
export function canStart(a,tier,locked=false,steps=COMBO_STEPS){
  if(a.charge||locked)return false;
  const busy=a.attackTime>0;
  const cancelWindow=busy&&a.hitConfirmed;   // opens as soon as the hit connects (hit stop already delays it); a whiff never opens it
  const cancels=steps[a.comboStep-1]?.cancels||[];
  if(tier==='basic'&&cancelWindow&&cancels.includes('J'))return true;   // J -> J on hit ignores the basic cooldown
  if(a.cooldowns[tier]>0)return false;
  if(!busy)return true;
  if(tier==='ult')return cancelWindow&&a.attackStyle==='basic'&&cancels.includes('L');   // special condition: a landed J3 may cancel into a full-energy L (energy is checked by the caller)
  return cancelWindow&&tier==='skill'&&(a.attackStyle!=='basic'||cancels.includes('K'));
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
  const duration=chargeDurations[tier]+(tier==='basic'?comboStepsFor(world.get(id,'fighter').charId)[a.comboStep-1].chargeBonus:0);
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
  const charId=world.get(id,'fighter').charId,d=comboStepsFor(charId)[step-1],AIR=airFor(charId);
  if(d.stun)st.stun=d.stun;
  const tt=world.get(tid,'transform');
  if(d.launch&&!(tt.y>AIR.minHeight&&st.airHits>=AIR.maxHits)){body.vy=Math.max(body.vy,d.launch);body.grounded=false;st.airHit=true;}   // airHit: hard landing (Down) + slower juggle fall
  world.events.emit('comboHit',{attackerId:id,targetId:tid,step});
}
