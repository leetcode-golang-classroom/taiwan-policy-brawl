import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {getSkill,ACTIVE_TIME} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const calm=(w)=>{const d=w.world.get(w.cpu,'defense');d.cooldown=1e9;w.world.get(w.cpu,'status').dodgeCooldown=1e9;};
const guard=(w)=>{const d=w.world.get(w.cpu,'defense');d.active=true;d.timer=5;d.startup=0;};

test('projectile: has a speed, flies a bounded distance and disappears without hitting when nothing is there', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:13});calm(w);const sk=getSkill('leopard','skill'),ends=record(w.world,'projectileEnd');
  pressAttack(w.world,'player','skill');step(w.world,.9);
  const pid=w.world.query('projectile')[0];assert.ok(pid!==undefined,'in flight');
  const p=w.world.get(pid,'projectile'),x0=p.pos.x;for(let i=0;i<6;i++)step(w.world,1/60,{},1/60);   // exactly 6 frames = 0.1 s
  assert.ok(Math.abs((p.pos.x-x0)-sk.speed*.1)<.05,'moves at its speed: '+(p.pos.x-x0));
  step(w.world,2);assert.equal(ends.length,1);assert.equal(ends[0].hit,false);assert.equal(hp(w,'cpu'),100);
  assert.equal(w.world.query('projectile').length,0);
});
test('projectile: collides with the target and damages exactly once', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:4});calm(w);const hits=record(w.world,'hit'),ends=record(w.world,'projectileEnd');
  pressAttack(w.world,'player','skill');step(w.world,2);
  assert.equal(hits.length,1);assert.equal(ends.length,1);assert.equal(ends[0].hit,true);assert.equal(100-hp(w,'cpu'),getSkill('leopard','skill').damage);
});
test('projectile: a raised guard blocks it completely (no damage, no combo)', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:4});calm(w);guard(w);const combo=record(w.world,'combo'),hits=record(w.world,'hit');
  pressAttack(w.world,'player','skill');step(w.world,2);
  assert.equal(hp(w,'cpu'),100);assert.equal(combo.length,0);assert.ok(hits.every(h=>h.blocked));
});
test('projectile: passes a dodging target without hitting and reports the evade once', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:4});calm(w);w.world.get(w.cpu,'status').dodgeInvuln=3;
  const ev=record(w.world,'evade');pressAttack(w.world,'player','skill');step(w.world,2);
  assert.equal(hp(w,'cpu'),100);assert.equal(ev.length,1);
});
test('dash attack: closes the distance and hits once on arrival', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:5});calm(w);const hits=record(w.world,'hit'),x0=w.world.get(w.player,'transform').x;
  pressAttack(w.world,'player','skill');step(w.world,2);
  assert.equal(hits.length,1);assert.ok(w.world.get(w.player,'transform').x>x0+1.5,'travelled toward the target');
  assert.equal(w.world.get(w.player,'dash'),undefined,'dash ended');
});
test('dash attack: a stunned dasher is interrupted and deals no damage', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:5});calm(w);
  pressAttack(w.world,'player','skill');step(w.world,.8);w.world.get(w.player,'status').stun=.5;step(w.world,1);
  assert.equal(hp(w,'cpu'),100);
});
test('area / melee hitbox is closed once its Active window has passed (no late hit)', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:9});calm(w);const hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');step(w.world,.22+ACTIVE_TIME.basic+.1);
  w.world.get(w.cpu,'transform').x=-6.5+1.5;step(w.world,.5);
  assert.equal(hits.length,0,'walking into the spot after the window does not hit');
});
test('launch: a launching hit lifts the victim, who falls back under gravity', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:2});calm(w);const t=w.world.get(w.cpu,'transform');let peak=0;
  pressAttack(w.world,'player','skill');
  for(let i=0;i<150;i++){step(w.world,1/60);peak=Math.max(peak,t.y);}
  assert.ok(peak>.8,'was lifted: '+peak);assert.equal(t.y,0);assert.equal(w.world.get(w.cpu,'body').grounded,true);
});
