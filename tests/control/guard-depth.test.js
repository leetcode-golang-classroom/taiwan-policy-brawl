import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressDefend} from '../../src/systems/playerControl.js';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,DEFENSE} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const def=w=>w.world.get(w.cpu,'defense');
const raise=(w,age)=>{const d=def(w);d.active=true;d.timer=DEFENSE.duration-age;d.startup=0;d.layers=0;d.durability=DEFENSE.durability;d.counter=0;d.perfected=false;};
const setup=()=>{const w=startedWorld({p:'brawler'});arrange(w,{dist:2});w.world.get(w.cpu,'status').stun=0;return w;};

test('perfect guard: a hit right after raising the guard does 0 damage, staggers the attacker, rewards energy, refunds cooldown',()=>{
  const w=setup();raise(w,DEFENSE.startup+.05);const hits=record(w.world,'hit');
  resolveHit(w.world,w.player,w.cpu,getSkill('brawler','skill'));
  assert.equal(hits[0].perfect,true);assert.equal(hp(w,'cpu'),100);
  assert.ok(w.world.get(w.player,'status').stun>=DEFENSE.perfectStun,'attacker staggered');
  assert.ok(w.world.get(w.cpu,'energy').value>=DEFENSE.perfectEnergy);
  assert.ok(def(w).counter>0,'counter window opens');
});
test('a late block is a normal block (reduced damage), not perfect',()=>{
  const w=setup();raise(w,DEFENSE.startup+DEFENSE.perfect+.3);const hits=record(w.world,'hit');
  resolveHit(w.world,w.player,w.cpu,getSkill('brawler','skill'));
  assert.equal(hits[0].perfect,false);assert.equal(hits[0].reduced,true);assert.ok(hp(w,'cpu')<100);
});
test('guard break: enough guarded damage breaks the guard and stuns the defender',()=>{
  const w=setup();raise(w,.6);const hits=record(w.world,'hit'),ends=record(w.world,'defenseEnd');
  const ult=getSkill('brawler','ult');
  for(let i=0;i<4&&!ends.length;i++){w.world.get(w.cpu,'status').hitStop=0;resolveHit(w.world,w.player,w.cpu,ult);}
  assert.equal(ends.length,1);assert.equal(ends[0].broken,true);
  assert.ok(hits.some(h=>h.broken));assert.ok(w.world.get(w.cpu,'status').stun>=.9);
});
test('guard counter: J after a block cancels the guard into a boosted hit; without a block there is no counter',()=>{
  const w=startedWorld({p:'brawler',c:'leopard'});arrange(w,{dist:2});
  const st=w.world.get(w.player,'status');st.stun=0;
  const d=w.world.get(w.player,'defense');d.active=true;d.timer=1;d.startup=0;d.counter=0;
  pressAttack(w.world,'player','basic');step(w.world,.05);
  assert.equal(d.active,true,'no block yet: attacks are still ignored while guarding');
  d.counter=DEFENSE.counterWindow;const ev=record(w.world,'guardCounter');
  pressAttack(w.world,'player','basic');step(w.world,.05);
  assert.equal(ev.length,1);assert.equal(d.active,false);
  assert.ok(w.world.get(w.player,'attacker').counterBoost>0||w.world.get(w.player,'attacker').charge);
});
