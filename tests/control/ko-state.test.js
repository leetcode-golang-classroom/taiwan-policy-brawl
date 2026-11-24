import test from 'node:test';
import assert from 'node:assert/strict';
import {startedWorld,step,record,hp} from '../helpers.js';
import {triggerKO,endRound} from '../../src/systems/roundSystem.js';

const kill=w=>{w.world.get(w.cpu,'health').hp=0;};
test('KO enters the state machine once: no scoring until the cinematic ends', ()=>{
  const w=startedWorld(),ko=record(w.world,'ko'),re=record(w.world,'roundEnd');
  assert.equal(w.world.match.phase,'NORMAL_FIGHT');
  kill(w);step(w.world,.05);
  assert.equal(w.world.match.phase,'KO_TRIGGER');assert.equal(w.world.match.running,false);
  assert.equal(ko.length,1);assert.equal(w.world.match.playerRounds,0);
  const seen=[];w.world.events.on('phase_change',e=>seen.push(e.phase));
  step(w.world,4.4);
  assert.deepEqual(seen.slice(0,4),['KO_REPLAY','KO_FREEZE','DEFEAT_ANIMATION','ROUND_RESULT']);
  assert.equal(ko.length,1,'KO fired once');assert.equal(re.length,1);assert.equal(w.world.match.playerRounds,1);
});
test('KO / endRound cannot double-count the same round', ()=>{
  const w=startedWorld();kill(w);step(w.world,.05);
  assert.equal(triggerKO(w.world,'cpu'),false,'second KO ignored');
  w.world.get(w.player,'health').hp=0;step(w.world,.5);assert.equal(w.world.match.ko.winner,'player');
  step(w.world,4.4);endRound(w.world,'cpu','x');endRound(w.world,'player','x');
  assert.equal(w.world.match.playerRounds+w.world.match.cpuRounds,1);
});
test('1-0 is a round result only; the next round starts in NORMAL_FIGHT', ()=>{
  const w=startedWorld();kill(w);step(w.world,4.4);
  assert.equal(w.world.match.phase,'ROUND_RESULT');assert.equal(w.world.match.ended,false);
  step(w.world,3);assert.equal(w.world.match.phase,'NORMAL_FIGHT');assert.equal(w.world.match.ko,null);assert.equal(hp(w,'cpu'),100);
});
test('time-up skips the KO cinematic and still scores once', ()=>{
  const w=startedWorld(),ko=record(w.world,'ko');w.world.match.timeLeft=.01;step(w.world,.2);
  assert.equal(ko.length,0);assert.equal(w.world.match.phase,'ROUND_RESULT');assert.equal(w.world.match.playerRounds+w.world.match.cpuRounds,1);
});
