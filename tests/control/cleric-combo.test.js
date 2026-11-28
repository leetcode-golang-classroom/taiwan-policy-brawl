import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack,pressJump} from '../../src/systems/playerControl.js';
import {airFor,AIR,comboStepsFor,COMBO_STEPS} from '../../src/config.js';
import {canStart} from '../../src/systems/actionSystem.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

test('data: cleric has its own route (higher launcher, longer juggle, harder slam); other characters are unchanged',()=>{
  assert.notEqual(comboStepsFor('cleric'),COMBO_STEPS);assert.equal(comboStepsFor('nobody'),COMBO_STEPS);
  assert.ok(comboStepsFor('cleric')[2].launch>COMBO_STEPS[2].launch);
  assert.ok(airFor('cleric').maxHits>AIR.maxHits&&airFor('cleric').slamDamage>AIR.slamDamage);
  assert.equal(airFor('nobody'),AIR);
});
test('cancel path: only the launcher (J3) cancels into K/L; J1/J2 cancel into J or K',()=>{
  const st=comboStepsFor('cleric'),a=(step,o={})=>({charge:null,attackTime:.2,hitConfirmed:true,comboStep:step,attackStyle:'basic',cooldowns:{basic:0,skill:0,ult:0},...o});
  assert.equal(canStart(a(1),'basic',false,st),true);assert.equal(canStart(a(1),'skill',false,st),true);
  assert.equal(canStart(a(3),'basic',false,st),false,'no J after the launcher');
  assert.equal(canStart(a(3),'skill',false,st),true);
  assert.equal(canStart(a(1,{hitConfirmed:false}),'basic',false,st),false,'a whiff never cancels');
});
test('full route: J J J launcher -> chase -> air J hits (decaying) -> air K slam, with the combo counted end to end',()=>{
  const w=startedWorld({p:'mech',c:'leopard'});arrange(w,{dist:1.6});
  const W=w.world,cpu=w.cpu,keep=()=>{const br=W.get(cpu,'brain');br.attackCd=br.skillCd=br.jumpCd=1e9;br.ultAt=null;br.counterAt=null;const s=W.get(cpu,'status');s.dodgeCooldown=1e9;W.get(cpu,'defense').cooldown=1e9;};
  const hits=record(W,'hit'),launch=record(W,'comboHit'),chases=record(W,'chase'),slams=record(W,'slamLand'),combos=record(W,'combo');
  // 1) ground chain into the launcher
  for(let i=0;i<3;i++){keep();pressAttack(W,'player','basic');for(let f=0;f<60&&hits.length<i+1;f++){keep();step(W,1/60);}}   // press the next J the moment the last one connects
  const ground=hits.filter(h=>h.attackerId===w.player);
  assert.equal(ground.length,3,'J1 J2 J3 all connect');assert.equal(launch.filter(e=>e.step===3).length,1,'J3 is the launcher step');
  const cb=W.get(cpu,'body');step(W,.1);assert.ok(!cb.grounded,'victim is airborne after the launcher');
  // 2) chase
  keep();W.get(w.player,'status').stun=0;pressJump(W,'player');step(W,.3);
  assert.equal(chases.length,1,'chase dash fired');
  // 3) air combo: keep the victim up in the window (sim of a juggle) and hit
  let air=[];
  for(let i=0;i<4;i++){
    keep();W.get(w.player,'status').stun=0;const t=W.get(cpu,'transform');if(t.y<1){t.y=2;cb.grounded=false;cb.vy=2;}W.get(cpu,'status').stun=Math.max(W.get(cpu,'status').stun,.8);
    const pt=W.get(w.player,'transform');if(pt.y<1){pt.y=2;W.get(w.player,'body').grounded=false;W.get(w.player,'body').vy=1;}
    t.y=pt.y;const n=hits.length;pressAttack(W,'player','basic');step(W,.7);air.push(...hits.slice(n).filter(h=>h.attackerId===w.player));
  }
  assert.ok(air.length>=2,'air hits connect');assert.ok(air[1].amount<=air[0].amount,'air damage decays');
  // 4) finisher
  keep();const t=W.get(cpu,'transform');t.y=2;cb.grounded=false;cb.vy=3;W.get(cpu,'status').stun=1;W.get(cpu,'status').airHits=Math.max(1,W.get(cpu,'status').airHits);
  const pt=W.get(w.player,'transform');pt.y=2;W.get(w.player,'body').grounded=false;W.get(w.player,'body').vy=3;
  W.get(w.player,'status').stun=0;pressAttack(W,'player','skill');step(W,1.6);
  assert.equal(slams.length,1,'ground slam finisher lands');
  assert.ok(combos[combos.length-1].hits>=6,`combo counts the whole route (${combos[combos.length-1].hits})`);
  assert.ok(hp(w,'cpu')<100-ground.reduce((s,h)=>s+h.amount,0),'route did more than the ground chain');
});
