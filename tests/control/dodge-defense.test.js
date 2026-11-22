import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDefend,pressDodge} from '../../src/systems/playerControl.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,DEFENSE,DODGE} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const calm=w=>{const c=w.world.get(w.cpu,'defense');c.cooldown=1e9;const s=w.world.get(w.cpu,'status');s.dodgeCooldown=1e9;};

test('defense: startup is NOT protective, then the guard works, then a recovery with no actions', ()=>{
  const w=startedWorld({p:'cleric',c:'cleric'});arrange(w,{dist:1.5});const cs=w.world.get(w.cpu,'status');
  const d=w.world.get(w.cpu,'defense');d.active=true;d.timer=DEFENSE.duration;d.startup=DEFENSE.startup;
  const h0=hp(w,'cpu');resolveHit(w.world,w.player,w.cpu,getSkill('cleric','basic'));
  assert.equal(h0-hp(w,'cpu'),9,'full damage during startup');
  cs.hitStop=0;d.startup=0;const h1=hp(w,'cpu');resolveHit(w.world,w.player,w.cpu,getSkill('cleric','basic'));
  assert.ok(h1-hp(w,'cpu')<9,'reduced once the guard is up');
});
test('defense: startup then ready event, ends with a recovery that blocks attacking and re-guarding', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const ready=record(w.world,'defenseReady'),d=w.world.get(w.player,'defense');
  pressDefend(w.world,'player');step(w.world,1/60);assert.ok(d.startup>0);assert.equal(ready.length,0);
  step(w.world,DEFENSE.startup+.03);assert.equal(ready.length,1);
  step(w.world,DEFENSE.duration);assert.equal(d.active,false);assert.ok(d.recovery>0||d.cooldown>0);
  d.recovery=.15;const starts=record(w.world,'chargeStart');pressAttack(w.world,'player','basic');step(w.world,.05);
  assert.equal(starts.length,0,'cannot attack during guard recovery');
  step(w.world,.2);assert.equal(starts.length,1,'the buffered press fires right after the recovery');
});
test('defense: projectile is blocked only once the guard is up; cooldown starts when it ends', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const d=w.world.get(w.player,'defense');
  pressDefend(w.world,'player');step(w.world,.02);
  step(w.world,DEFENSE.duration+.05);assert.ok(d.cooldown>DEFENSE.cooldown-.3);
});
test('dodge: invulnerable window, then a vulnerable recovery that still ends the dodge', ()=>{
  const w=startedWorld({p:'cleric',c:'cleric'});arrange(w,{dist:1.5});calm(w);
  w.world.get(w.cpu,'status').stun=0;const ps=w.world.get(w.player,'status');
  const evades=record(w.world,'evade');
  pressDodge(w.world,'player',{KeyS:true});step(w.world,.05);
  const h0=hp(w,'player');resolveHit(w.world,w.cpu,w.player,getSkill('cleric','basic'));
  assert.equal(hp(w,'player'),h0,'no damage during the invulnerable window');assert.equal(evades.length,1);
  assert.equal(w.world.get(w.cpu,'attacker').hitConfirmed,false,'an evaded attack is not a confirmed hit');
  step(w.world,DODGE.invuln+.05);assert.equal(ps.dodgeInvuln,0);assert.ok(ps.dodgeTimer>0,'still recovering');
  const h1=hp(w,'player');resolveHit(w.world,w.cpu,w.player,getSkill('cleric','basic'));assert.ok(hp(w,'player')<h1,'vulnerable in recovery');
  step(w.world,DODGE.duration);assert.equal(ps.dodgeTimer,0);
});
test('dodge: slides over time, bounded distance, no permanent invulnerability (cooldown > invuln)', ()=>{
  const w=startedWorld();arrange(w,{dist:5});calm(w);const t=w.world.get(w.player,'transform'),x0=t.x,z0=t.z;
  pressDodge(w.world,'player',{KeyW:true});step(w.world,1/60);
  const first=Math.hypot(t.x-x0,t.z-z0);assert.ok(first<.5,'no teleport on the first frame: '+first);
  step(w.world,.4);assert.ok(Math.hypot(t.x-x0,t.z-z0)<=3,'bounded');
  assert.ok(DODGE.cooldown>DODGE.invuln,'cannot chain invulnerability back-to-back');
});
test('dodge cancels the recovery of a released attack but never the startup (no free feint)', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});calm(w);const a=w.world.get(w.player,'attacker');
  pressAttack(w.world,'player','basic');step(w.world,.1);assert.ok(a.charge);
  pressDodge(w.world,'player',{KeyS:true});step(w.world,.02);
  assert.equal(w.world.get(w.player,'status').dodgeTimer,0,'refused during startup');
  assert.ok(w.world.get(w.player,'status').dodgeBuf,'...but remembered, so it fires the moment the attack is released');
  w.world.get(w.player,'status').dodgeBuf=null;step(w.world,.3);assert.ok(a.attackTime>0,'now in recovery');
  w.world.get(w.player,'status').dodgeCooldown=0;pressDodge(w.world,'player',{KeyS:true});step(w.world,.02);
  assert.ok(w.world.get(w.player,'status').dodgeTimer>0,'dodge cancels the recovery');assert.equal(a.attackTime,0);
});
test('a dodge pressed just before it is possible is buffered; attacks are locked early in the dodge', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});calm(w);const s=w.world.get(w.player,'status');
  s.dodgeCooldown=.1;pressDodge(w.world,'player',{KeyS:true});step(w.world,1/60);assert.equal(s.dodgeTimer,0);
  step(w.world,.15);assert.ok(s.dodgeTimer>0,'fired when the cooldown ended');
  const starts=record(w.world,'chargeStart');pressAttack(w.world,'player','basic');step(w.world,.1);
  assert.equal(starts.length,0,'no attack in the committed part of the dodge');
  step(w.world,DODGE.attackAfter);assert.equal(starts.length,0,'the early press expired (180 ms buffer)');
  pressAttack(w.world,'player','basic');step(w.world,.05);assert.equal(starts.length,1,'a counter-attack works later in the dodge');
});
