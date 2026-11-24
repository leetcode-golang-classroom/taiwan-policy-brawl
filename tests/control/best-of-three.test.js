import test from 'node:test';
import assert from 'node:assert/strict';
import {startedWorld,step,record} from '../helpers.js';
import {startMatch,endRound} from '../../src/systems/roundSystem.js';

// A full KO round: the chosen side wins by knockout, then wait out the cinematic (+ the next-round countdown unless the match is over).
function koRound(w,winner){
  const loser=winner==='player'?w.cpu:w.player;w.world.get(loser,'health').hp=0;
  step(w.world,4.4);
  if(!w.world.match.ended)step(w.world,3);
}
const setup=()=>{const w=startedWorld(),r=record(w.world,'roundEnd'),m=record(w.world,'matchEnd'),k=record(w.world,'ko');return {w,r,m,k};};

test('1-0: a round win is only a ROUND_RESULT; the match goes on', ()=>{
  const {w,r,m}=setup();w.world.get(w.cpu,'health').hp=0;step(w.world,4.4);
  assert.equal(w.world.match.phase,'ROUND_RESULT');assert.equal(w.world.match.ended,false);
  assert.equal(r.length,1);assert.equal(m.length,0);assert.deepEqual([w.world.match.playerRounds,w.world.match.cpuRounds],[1,0]);
  step(w.world,3);assert.equal(w.world.match.phase,'NORMAL_FIGHT');assert.equal(w.world.match.roundNumber,2);
});
test('2-0: second win triggers MATCH_VICTORY once', ()=>{
  const {w,r,m,k}=setup();koRound(w,'player');koRound(w,'player');
  assert.equal(m.length,1);assert.equal(m[0].winner,'player');assert.deepEqual([m[0].playerRounds,m[0].cpuRounds],[2,0]);
  assert.equal(r.length,1,'only the first round produced a roundEnd');assert.equal(k.length,2);
  assert.equal(w.world.match.phase,'MATCH_VICTORY');assert.equal(w.world.match.ended,true);
  step(w.world,10);endRound(w.world,'cpu','x');assert.equal(m.length,1);assert.deepEqual([w.world.match.playerRounds,w.world.match.cpuRounds],[2,0]);
});
test('1-1 goes to a third round, 2-1 then ends the match', ()=>{
  const {w,m}=setup();koRound(w,'player');koRound(w,'cpu');
  assert.deepEqual([w.world.match.playerRounds,w.world.match.cpuRounds],[1,1]);assert.equal(m.length,0);assert.equal(w.world.match.roundNumber,3);
  koRound(w,'player');assert.equal(m.length,1);assert.deepEqual([m[0].playerRounds,m[0].cpuRounds],[2,1]);assert.equal(m[0].winner,'player');
});
test('1-2: the CPU / opponent wins the match', ()=>{
  const {w,m}=setup();koRound(w,'player');koRound(w,'cpu');koRound(w,'cpu');
  assert.equal(m.length,1);assert.equal(m[0].winner,'cpu');assert.deepEqual([m[0].playerRounds,m[0].cpuRounds],[1,2]);
});
test('time-up rounds follow the same rules (no KO cinematic, still no early champion)', ()=>{
  const {w,m,k}=setup();w.world.match.timeLeft=.01;step(w.world,.1);
  assert.equal(k.length,0);assert.equal(m.length,0);assert.equal(w.world.match.phase,'ROUND_RESULT');
});
test('rematch resets score, phase and fighters; leaving mid-KO leaves a clean state', ()=>{
  const {w}=setup();koRound(w,'player');koRound(w,'player');assert.equal(w.world.match.ended,true);
  startMatch(w.world);const m=w.world.match;
  assert.deepEqual([m.playerRounds,m.cpuRounds,m.roundNumber,m.ended,m.running,m.phase,m.ko],[0,0,1,false,true,'NORMAL_FIGHT',null]);
  assert.equal(w.world.get(w.cpu,'health').hp,100);
  w.world.get(w.cpu,'health').hp=0;step(w.world,.1);assert.equal(m.phase,'KO_TRIGGER');
  startMatch(w.world);assert.equal(m.phase,'NORMAL_FIGHT');assert.equal(m.running,true);   // restart while the cinematic is running
  step(w.world,5);assert.deepEqual([m.playerRounds,m.cpuRounds],[0,0],'the abandoned KO never scores');
});
test('a guest follows the host verdict: final flag decides match vs round', ()=>{
  const w=startedWorld();w.world.net={role:'guest'};
  w.world.match.playerRounds=0;endRound(w.world,'player','KO',{final:false});assert.equal(w.world.match.phase,'ROUND_RESULT');
});
