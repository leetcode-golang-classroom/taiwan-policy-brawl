// PHASE 11: combo tracking in the LOGIC layer (combat clock, not wall-clock; no DOM).
// A combo = consecutive effective hits by one fighter on the same victim, while the victim has not yet recovered.
// - registerComboHit is called once per resolved hit (resolveHit), so one attack can never count twice.
// - blocked / reduced (defended) hits and dodged hits never reach it.
// - the combo ends when the victim is back in control (no stun, grounded), on round end, or when the victim changes.
export function registerComboHit(world,attackerId,targetId,dealt){
  const c=world.get(attackerId,'combo');if(!c||!(dealt>0))return;
  if(c.hits>0&&c.targetId===targetId){c.hits++;c.damage+=dealt;}
  else{if(c.hits>0)endCombo(world,attackerId);c.hits=1;c.damage=dealt;c.targetId=targetId;}
  c.lastHit=world.time;
  world.events.emit('combo',{attackerId,targetId,hits:c.hits,damage:c.damage});
}
export function endCombo(world,attackerId){
  const c=world.get(attackerId,'combo');if(!c||c.hits===0)return;
  const e={attackerId,targetId:c.targetId,hits:c.hits,damage:c.damage};
  c.hits=0;c.damage=0;c.chases=0;c.targetId=null;
  world.events.emit('comboEnd',e);
}
export function comboSystem(world){
  const m=world.match;
  for(const id of world.query('combo')){
    const c=world.get(id,'combo');if(c.hits===0)continue;
    const st=world.get(c.targetId,'status'),b=world.get(c.targetId,'body');
    const victimFree=st.stun<=0&&b.grounded&&!st.frozen;
    if(!m.running||m.ended||victimFree)endCombo(world,id);
  }
}
