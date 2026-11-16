import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {getSkill} from '../../src/config.js';
import {roster} from '../../src/roster.js';
import {startedWorld,step,arrange,hp} from '../helpers.js';

test('豹之撲擊 is a dash attack and replaces the old tree basic', ()=>{
  const sk=getSkill('leopard','basic');
  assert.equal(sk.type,'dash');assert.ok(sk.dashMax>=3);
  assert.equal(roster.find(r=>r.id==='leopard').basic,'豹之撲擊');
});
test('pounce leaps across a gap, lands next to the target and hits once', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:4.5});
  const pt=w.world.get(w.player,'transform'),ct=w.world.get(w.cpu,'transform');const x0=pt.x;
  pressAttack(w.world,'player','basic');pressAttack(w.world,'player','basic');step(w.world,1.2);
  assert.ok(Math.abs(pt.x-x0)>1.5);   // the leopard itself travelled
  assert.equal(hp(w,'cpu'),91);
});
test('pounce cannot reach a target beyond dashMax + range', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:9});
  pressAttack(w.world,'player','basic');pressAttack(w.world,'player','basic');step(w.world,1.2);
  assert.equal(hp(w,'cpu'),100);
});
