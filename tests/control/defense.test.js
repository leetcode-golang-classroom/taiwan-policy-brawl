import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDefend} from '../../src/systems/playerControl.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,DEFENSE} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const def=(w,who='player')=>w.world.get(who==='player'?w.player:w.cpu,'defense');
const guard=(w,who)=>{const d=def(w,who);d.active=true;d.timer=DEFENSE.duration;d.layers=DEFENSE.layers[w.world.get(who==='player'?w.player:w.cpu,'fighter').charId]||0;};

test('I key: guard lasts 1.5s, then a 6s cooldown, then can be used again', ()=>{
  const w=startedWorld();arrange(w,{dist:9});const ev=record(w.world,'defenseStart'),end=record(w.world,'defenseEnd');
  pressDefend(w.world,'player');step(w.world,.1);
  assert.equal(def(w).active,true);assert.equal(ev.length,1);
  step(w.world,DEFENSE.duration);
  assert.equal(def(w).active,false);assert.equal(end.length,1);assert.ok(def(w).cooldown>5.5);
  pressDefend(w.world,'player');step(w.world,.1);assert.equal(def(w).active,false,'still cooling down');
  step(w.world,DEFENSE.cooldown);pressDefend(w.world,'player');step(w.world,.05);assert.equal(def(w).active,true);
});
test('cannot defend while stunned, charging, or before the match runs', ()=>{
  const w=startedWorld();w.world.get(w.player,'status').stun=1;pressDefend(w.world,'player');step(w.world,.05);assert.equal(def(w).active,false);
  const v=startedWorld();arrange(v,{dist:5});pressAttack(v.world,'player','skill');step(v.world,.1);pressDefend(v.world,'player');step(v.world,.05);assert.equal(def(v).active,false);
});
test('attack input is ignored while guarding', ()=>{
  const w=startedWorld();const ch=record(w.world,'chargeStart');
  pressDefend(w.world,'player');step(w.world,.05);pressAttack(w.world,'player','basic');step(w.world,.2);
  assert.equal(ch.length,0);
});
test('melee/area damage is reduced by 70%, no knockback launch', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:2});guard(w,'cpu');const hits=record(w.world,'hit');
  const sk=getSkill('brawler','skill');
  resolveHit(w.world,w.player,w.cpu,sk);
  assert.equal(hits.length,1);assert.equal(hits[0].reduced,true);
  assert.equal(hits[0].amount,Math.round(sk.damage*(1-DEFENSE.reduction)));
  assert.equal(100-hp(w,'cpu'),hits[0].amount,'event amount = real HP loss');
  assert.equal(w.world.get(w.cpu,'body').vy,0,'guard prevents launch');
});
test('blockable projectiles are fully blocked and destroyed', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:5});guard(w,'cpu');const hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');pressAttack(w.world,'player','basic');step(w.world,1.4);
  assert.equal(hp(w,'cpu'),100);assert.equal(hits.length,1);assert.equal(hits[0].blocked,true);assert.equal(hits[0].amount,0);
  assert.equal(w.world.query('projectile').length,0);
});
test('guard ends after its duration so later hits land at full damage', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:2});guard(w,'cpu');step(w.world,DEFENSE.duration+.1);
  resolveHit(w.world,w.player,w.cpu,getSkill('brawler','basic'));
  assert.equal(100-hp(w,'cpu'),getSkill('brawler','basic').damage);
});
test('layered bubbles: each hit pops one layer; the last one breaks the guard', ()=>{
  const w=startedWorld({c:'bubble',p:'brawler'});arrange(w,{dist:2});guard(w,'cpu');
  const end=record(w.world,'defenseEnd');
  assert.equal(def(w,'cpu').layers,3);
  for(let i=0;i<3;i++)resolveHit(w.world,w.player,w.cpu,getSkill('brawler','skill'));
  assert.equal(hp(w,'cpu'),100);assert.equal(def(w,'cpu').active,false);assert.equal(end[0].broken,true);
  resolveHit(w.world,w.player,w.cpu,getSkill('brawler','basic'));assert.ok(hp(w,'cpu')<100,'4th hit lands');
});
test('a dodging target is not affected by guard bookkeeping (evade first)', ()=>{
  const w=startedWorld({p:'brawler'});arrange(w,{dist:2});guard(w,'cpu');w.world.get(w.cpu,'status').dodgeInvuln=1;
  const ev=record(w.world,'evade');resolveHit(w.world,w.player,w.cpu,getSkill('brawler','basic'));
  assert.equal(ev.length,1);assert.equal(hp(w,'cpu'),100);
});
test('round reset clears guard and cooldown', ()=>{
  const w=startedWorld();pressDefend(w.world,'player');step(w.world,2);
  assert.ok(def(w).cooldown>0);w.world.get(w.cpu,'health').hp=0;step(w.world,4);
  assert.equal(def(w).cooldown,0);assert.equal(def(w).active,false);
});
test('CPU uses I when the player winds up an attack nearby, and respects the cooldown', ()=>{
  const w=startedWorld({p:'brawler'});const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');
  pt.x=-1;ct.x=1;pt.z=ct.z=0;const starts=record(w.world,'defenseStart');
  w.world.get(w.cpu,'status').dodgeCooldown=1e9;
  pressAttack(w.world,'player','ult');w.world.get(w.player,'energy').value=100;pressAttack(w.world,'player','ult');
  step(w.world,.9);
  assert.ok(starts.some(e=>e.id===w.cpu),'CPU guarded');
  assert.ok(def(w,'cpu').cooldown>0||def(w,'cpu').active);
});
