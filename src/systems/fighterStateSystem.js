import {deriveState} from '../combat/fighterState.js';

// Typical duration (s) of timed states, recorded for HUD/AI/animation consumers. 0 = open ended.
function durationOf(world,id,state){
  const st=world.get(id,'status'),a=world.get(id,'attacker');
  switch(state){
    case 'HitStun':case 'Knockback':case 'Airborne':return st.stun;
    case 'Dodge':return st.dodgeTimer;
    case 'Dash':return st.rushTimer;
    case 'Defense':return world.get(id,'defense').timer;
    case 'AttackStartup':case 'SkillStartup':case 'Ultimate':return a.charge?a.charge.duration-a.charge.time:0;
    case 'AttackRecovery':case 'SkillRecovery':return a.attackTime;
    default:return 0;
  }
}
// Records the derived state + entry time on the `fstate` component; emits 'stateChange' on every transition.
// Runs LAST in the tick so it observes the final result of every other system.
export function fighterStateSystem(world){
  for(const id of world.query('fighter','fstate')){
    const fs=world.get(id,'fstate'),next=deriveState(world,id);
    if(next===fs.name)continue;
    const prev=fs.name;
    fs.prev=prev;fs.name=next;fs.enteredAt=world.time;fs.duration=durationOf(world,id,next);
    world.events.emit('stateChange',{id,from:prev,to:next,time:world.time});
  }
}
export const stateOf=(world,id)=>world.get(id,'fstate').name;
