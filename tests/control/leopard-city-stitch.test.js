import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {getSkill} from '../../src/config.js';
import {roster} from '../../src/roster.js';
import {startedWorld,step,arrange,hp} from '../helpers.js';

test('都市縫合 is an instant area attack and replaces the pounce', ()=>{
  const sk=getSkill('leopard','basic');
  assert.equal(sk.type,'area');assert.ok(sk.range>=5);
  assert.equal(roster.find(r=>r.id==='leopard').basic,'都市縫合');
});
test('都市縫合 hits a target within range from a distance without moving the caster', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:4.5});
  const pt=w.world.get(w.player,'transform');const x0=pt.x;
  pressAttack(w.world,'player','basic');pressAttack(w.world,'player','basic');step(w.world,1.2);
  assert.ok(Math.abs(pt.x-x0)<.5);
  assert.ok(hp(w,'cpu')<100);
});
test('都市縫合 cannot reach a target beyond its range', ()=>{
  const w=startedWorld({p:'leopard'});arrange(w,{dist:12});
  pressAttack(w.world,'player','basic');pressAttack(w.world,'player','basic');step(w.world,1.2);
  assert.equal(hp(w,'cpu'),100);
});
