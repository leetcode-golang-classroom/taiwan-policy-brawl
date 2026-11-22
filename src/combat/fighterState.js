import {HIT_REACT} from '../config.js';
// PHASE 1: unified combat state machine (pure data + pure functions; no Three.js / DOM).
// A fighter is in exactly ONE state at a time. The state is derived each tick from the authoritative gameplay
// components (attacker/status/defense/body) by `deriveState`, then recorded on the `fstate` component
// (name, enteredAt, duration, previous) by fighterStateSystem. Capabilities live in this table, so rules such as
// "can a hit-stunned fighter defend?" are answered in ONE place instead of scattered `if (stun>0 ...)` checks.
//
// cancel: states this state may be cancelled into (explicit transition rules).
// Down / GetUp: the grounded landing after a hard launch (first half Down, second half GetUp; input stays locked via stun).
const S=(o)=>Object.freeze({move:false,attack:false,defend:false,dodge:false,cancel:[],...o});

export const STATES=Object.freeze({
  Idle:S({move:true,attack:true,defend:true,dodge:true,cancel:['Walk','Run','Dash','Jump','AttackStartup','SkillStartup','Ultimate','Defense','Dodge']}),
  Walk:S({move:true,attack:true,defend:true,dodge:true,cancel:['Idle','Run','Dash','Jump','AttackStartup','SkillStartup','Ultimate','Defense','Dodge']}),
  Run:S({move:true,attack:true,defend:true,dodge:true,cancel:['Idle','Walk','Dash','Jump','AttackStartup','SkillStartup','Ultimate','Defense','Dodge']}),
  Dash:S({move:false,attack:false,defend:false,dodge:false,cancel:['Idle','Jump','Airborne','HitStun']}),
  Jump:S({move:true,attack:true,defend:false,dodge:false,cancel:['Idle','Airborne','AttackStartup','SkillStartup','Ultimate','HitStun']}),
  AttackStartup:S({cancel:['AttackActive','HitStun','Dodge']}),
  AttackActive:S({cancel:['AttackRecovery','HitStun']}),
  AttackRecovery:S({cancel:['Idle','AttackStartup','SkillStartup','Dodge','HitStun'],attack:true,dodge:true}),   // attack = combo cancel window
  SkillStartup:S({cancel:['SkillActive','HitStun']}),
  SkillActive:S({cancel:['SkillRecovery','HitStun']}),
  SkillRecovery:S({cancel:['Idle','Dodge','HitStun'],dodge:true}),
  Ultimate:S({cancel:['Idle','HitStun']}),
  Defense:S({move:true,cancel:['Idle','HitStun']}),
  Dodge:S({cancel:['Idle','HitStun']}),
  HitStun:S({dodge:false,cancel:['Idle','Knockback','Airborne','Down']}),
  Knockback:S({cancel:['Idle','Airborne','Down']}),
  Airborne:S({cancel:['Idle','Down','HitStun']}),
  Down:S({cancel:['GetUp']}),
  GetUp:S({cancel:['Idle']}),
  Victory:S({move:true,cancel:['Idle']})
});
export const STATE_NAMES=Object.freeze(Object.keys(STATES));
export const canMove=s=>!!STATES[s]?.move;
export const canAttack=s=>!!STATES[s]?.attack;
export const canDefend=s=>!!STATES[s]?.defend;
export const canDodge=s=>!!STATES[s]?.dodge;
export const canCancel=(from,to)=>!!STATES[from]?.cancel.includes(to);

// attacker.phase (windup|charge|strike|impact|recovery|idle) + tier -> combat state
const ATTACK_STATE={
  basic:{windup:'AttackStartup',charge:'AttackStartup',strike:'AttackActive',impact:'AttackActive',recovery:'AttackRecovery'},
  skill:{windup:'SkillStartup',charge:'SkillStartup',strike:'SkillActive',impact:'SkillActive',recovery:'SkillRecovery'}
};
export function deriveState(world,id){
  const st=world.get(id,'status'),a=world.get(id,'attacker'),b=world.get(id,'body'),m=world.match;
  if(m.ended){const me=world.get(id,'health');if(me.hp>0)return 'Victory';}
  if(b.grounded&&st.landTimer>0&&st.stun>0)return st.landTimer>HIT_REACT.landTime*.5?'Down':'GetUp';
  if(st.stun>0)return !b.grounded?'Airborne':st.kbTime>0?'Knockback':'HitStun';
  if(!b.grounded&&!a.charge&&a.attackTime<=0&&a.phase==='idle')return 'Jump';
  if(st.dodgeTimer>0)return 'Dodge';
  const df=world.get(id,'defense');if(df?.active||df?.recovery>0)return 'Defense';   // startup, active guard and the recovery after it
  const tier=a.charge?.tier||(a.attackTime>0?a.attackStyle:null);
  if(tier==='ult')return 'Ultimate';
  if(tier&&a.phase!=='idle')return ATTACK_STATE[tier][a.phase]||'AttackRecovery';
  if(st.rushTimer>0)return 'Dash';
  if(b.moving)return 'Walk';
  return 'Idle';
}
