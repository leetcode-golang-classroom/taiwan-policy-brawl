import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDefend} from '../../src/systems/playerControl.js';
import {getSkill,cooldownFor} from '../../src/config.js';
import {roster} from '../../src/roster.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const fire=w=>pressAttack(w.world,'player','skill');

test('電光火球 matches spec 6.2 data', ()=>{
  const s=getSkill('nun','skill');
  assert.deepEqual([s.type,s.damage,s.range,s.speed,s.radius,s.knockback,s.tracking,s.blockable],['projectile',10,15,12,1.2,5,false,true]);
  assert.equal(cooldownFor('nun','skill'),5);assert.equal(cooldownFor('mech','skill'),3.4);
  assert.equal(roster.find(r=>r.id==='nun').skill,'電光火球');
});
test('電光火球 is a real projectile: flies at speed 12, hits for 10 and pushes the target back', ()=>{
  const w=startedWorld({p:'nun'});arrange(w,{dist:9});const hits=record(w.world,'hit');
  const x0=w.world.get(w.cpu,'transform').x;
  fire(w);step(w.world,.2);assert.equal(hp(w,'cpu'),100,'still charging');
  step(w.world,.5);const ids=w.world.query('projectile');assert.equal(ids.length,1);
  const p0=w.world.get(ids[0],'projectile').pos.x;step(w.world,.1);
  const moved=w.world.get(ids[0],'projectile').pos.x-p0;assert.ok(moved>1.1&&moved<1.5,'moves ~speed*dt (12/s)');
  step(w.world,1.5);
  assert.equal(hp(w,'cpu'),90);assert.equal(hits.length,1);assert.equal(hits[0].amount,10);
  assert.ok(w.world.get(w.cpu,'transform').x>x0+1,'knocked back');
});
test('電光火球 crosses the whole 14-unit arena (range 15) and the projectile is cleaned up', ()=>{
  const w=startedWorld({p:'nun'});arrange(w,{dist:13.5});fire(w);step(w.world,3);
  assert.equal(hp(w,'cpu'),90);assert.equal(w.world.query('projectile').length,0);
});
test('電光火球 is blocked by the I-key defense', ()=>{
  const w=startedWorld({p:'nun'});arrange(w,{dist:8});
  const d=w.world.get(w.cpu,'defense');d.active=true;d.timer=3;
  fire(w);step(w.world,2);assert.equal(hp(w,'cpu'),100);
});
test('電光火球 cooldown is 5s (and used by the action system)', ()=>{
  const w=startedWorld({p:'nun'});arrange(w,{dist:9});fire(w);step(w.world,.8);
  const cd=w.world.get(w.player,'attacker').cooldowns.skill;assert.ok(cd>4&&cd<=5);
});
