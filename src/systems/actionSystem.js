import {REFLECT,chargeDurations,cooldownFor,COMBO,SKILL_ENERGY_BONUS,PHASES,ATTACK_TIME} from '../config.js';
import {opponentOf} from '../ecs/entities.js';
import {attack} from './combatSystem.js';

// Consumes intent.attack: starts a charge, then releases the attack when the charge completes.
export function actionSystem(world,dt){
  const m=world.match;if(!m.running||m.ended)return;
  for(const id of world.query('fighter','intent','attacker','energy')){
    const intent=world.get(id,'intent'),a=world.get(id,'attacker'),e=world.get(id,'energy');
    const tier=intent.attack;intent.attack=null;
    if(tier&&!a.charge&&!world.get(id,'defense')?.active){
      if(a.cooldowns[tier]>0){}
      else if(tier==='ult'&&e.value<100)world.events.emit('ultNotReady',{id});
      else startCharge(world,id,tier);
    }
    if(a.charge){
      a.charge.time+=dt;
      if(a.charge.time>=a.charge.duration)release(world,id);
    }
    setPhase(world,id,a,phaseOf(world,id,a));
  }
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
  a.attackTime=0;
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
