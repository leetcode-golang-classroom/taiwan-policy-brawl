// Ticks all timers (status effects, cooldowns, combo window, attack animation time) and energy regen.
export function statusSystem(world,dt){
  world.time+=dt;
  for(const id of world.query('status')){
    const s=world.get(id,'status');
    s.dodgeTimer=Math.max(0,s.dodgeTimer-dt);s.dodgeInvuln=Math.max(0,s.dodgeInvuln-dt);
    s.dodgeCooldown=Math.max(0,s.dodgeCooldown-dt);s.hitReact=Math.max(0,s.hitReact-dt);s.stun=Math.max(0,s.stun-dt);
    s.rushTimer=Math.max(0,s.rushTimer-dt);s.rushCooldown=Math.max(0,s.rushCooldown-dt);s.landTimer=Math.max(0,s.landTimer-dt);
  }
  for(const id of world.query('attacker')){
    const a=world.get(id,'attacker');
    for(const k of Object.keys(a.cooldowns))a.cooldowns[k]=Math.max(0,a.cooldowns[k]-dt);
    a.comboWindow=Math.max(0,a.comboWindow-dt);if(a.comboWindow===0&&a.comboStep>0)a.comboStep=0;
    a.attackTime=Math.max(0,a.attackTime-dt);
  }
  const m=world.match;
  if(m.running&&!m.ended)for(const id of world.query('energy')){const e=world.get(id,'energy');e.value=Math.min(100,e.value+dt*e.regen);}
}
