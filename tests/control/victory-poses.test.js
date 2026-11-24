import test from 'node:test';
import assert from 'node:assert/strict';
import {VICTORY,VICTORY_IDS,BONES,poseAt,victoryDuration,beatTime,TIMELINE} from '../../src/presentation/victoryPoses.js';
import {roster} from '../../src/roster.js';

test('all nine roster characters have their own victory animation', ()=>{
  assert.deepEqual([...VICTORY_IDS].sort(),roster.map(r=>r.id).sort());
});
test('every pose is finite for every bone across the whole animation and the hold', ()=>{
  for(const id of VICTORY_IDS)for(let t=0;t<=VICTORY[id].dur+3;t+=.05){
    const p=poseAt(id,t);
    for(const b of BONES){assert.equal(p[b].length,3);assert.ok(p[b].every(Number.isFinite),`${id} ${b} @${t}`);}
    assert.ok(Number.isFinite(p.hy)&&Number.isFinite(p.jump)&&p.jump>=0,`${id} hy/jump @${t}`);
  }
});
test('animations differ per character and end in a held pose (not idle, not identical)', ()=>{
  const finals=VICTORY_IDS.map(id=>JSON.stringify(poseAt(id,VICTORY[id].dur)));
  assert.equal(new Set(finals).size,9,'nine distinct final poses');
  for(const id of VICTORY_IDS){
    const a=poseAt(id,VICTORY[id].dur);
    const arm=Math.min(a.UpperArmL[0],a.UpperArmR[0],a.UpperArmL[2]*-1,a.LowerArmL[0]);assert.ok(arm<-.3||a.UpperArmL[2]>.8,`${id} final pose is not an idle pose`);
  }
});
test('starts from the fighting/idle arms, beats lie inside the animation, total time is announce + turn + animation', ()=>{
  for(const id of VICTORY_IDS){
    const p=poseAt(id,0);assert.ok(Math.abs(p.UpperArmR[2]+.12)<1e-9);
    for(const n of Object.keys(VICTORY[id].beats))assert.ok(beatTime(id,n)>0&&beatTime(id,n)<VICTORY[id].dur);
    assert.equal(victoryDuration(id),TIMELINE.announce+TIMELINE.transition+VICTORY[id].dur);
  }
});
