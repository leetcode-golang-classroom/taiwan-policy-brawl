import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill} from '../../src/config.js';
import {startedWorld,step,arrange,record} from '../helpers.js';

const setup=()=>{const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});w.world.get(w.cpu,'defense').cooldown=1e9;return w;};
const hit=(w)=>resolveHit(w.world,w.player,w.cpu,getSkill('cleric','basic'));

test('each effective hit adds one to the combo and accumulates total damage', ()=>{
  const w=setup(),ev=record(w.world,'combo');
  hit(w);hit(w);hit(w);
  assert.deepEqual(ev.map(e=>e.hits),[1,2,3]);assert.equal(ev[2].damage,27);
});
test('a dodged hit and a blocked hit never count', ()=>{
  const w=setup(),ev=record(w.world,'combo');
  w.world.get(w.cpu,'status').dodgeInvuln=1;hit(w);
  w.world.get(w.cpu,'status').dodgeInvuln=0;
  const d=w.world.get(w.cpu,'defense');d.active=true;d.timer=1;hit(w);   // guarded: reduced damage, not a clean hit
  assert.equal(ev.length,0);
});
test('the combo ends (comboEnd) when the victim recovers, and the next hit restarts at 1', ()=>{
  const w=setup(),ev=record(w.world,'combo'),end=record(w.world,'comboEnd');
  hit(w);hit(w);
  const cs=w.world.get(w.cpu,'status');cs.stun=0;cs.hitStop=0;step(w.world,1/60);
  assert.equal(end.length,1);assert.equal(end[0].hits,2);
  hit(w);assert.equal(ev.at(-1).hits,1);
});
test('one attack resolves once, so a long active window cannot inflate the count', ()=>{
  const w=setup(),ev=record(w.world,'combo');
  w.world.get(w.player,'attacker').buffer={tier:'basic',time:w.world.time};
  step(w.world,.6);
  assert.equal(ev.length,1);
});
