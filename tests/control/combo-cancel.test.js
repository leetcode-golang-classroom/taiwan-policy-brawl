import test from 'node:test';
import assert from 'node:assert/strict';
import {pressAttack} from '../../src/systems/playerControl.js';
import {HITSTOP,ACTIVE_TIME} from '../../src/config.js';
import {startedWorld,step,arrange,record,hp} from '../helpers.js';

const frozenCpu=w=>{const st=w.world.get(w.cpu,'status');st.stun=0;st.dodgeCooldown=1e9;w.world.get(w.cpu,'defense').cooldown=1e9;};
const spam=(w,secs,tier='basic')=>{for(let t=0;t<secs;t+=1/60){if(t%.08<1/60)pressAttack(w.world,'player',tier);step(w.world,1/60);}};

test('hit stop: a damaging hit freezes BOTH fighters for the hit-stop time, then they resume', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.6});frozenCpu(w);
  const hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');step(w.world,.3);
  assert.equal(hits.length,1);assert.equal(hits[0].hitStop,HITSTOP.basic);
  const ps=w.world.get(w.player,'status'),cs=w.world.get(w.cpu,'status');
  assert.ok(ps.hitStop>=0&&cs.hitStop>=0);
});
test('hit stop holds attackTime and stun but not cooldowns or the round clock', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.6});
  const a=w.world.get(w.player,'attacker'),ps=w.world.get(w.player,'status'),cs=w.world.get(w.cpu,'status');
  cs.stun=0;ps.hitStop=.1;a.attackTime=.3;a.cooldowns.skill=2;cs.hitStop=.1;cs.stun=.5;
  const t0=w.world.time;step(w.world,.05);
  assert.equal(a.attackTime,.3,'attack clock frozen');assert.ok(cs.stun>.49,'stun frozen');
  assert.ok(a.cooldowns.skill<1.96,'cooldown still ticks');assert.ok(w.world.time>t0,'world clock runs');
  step(w.world,.1);assert.ok(a.attackTime<.3,'resumes after hit stop');
});
test('the CPU does nothing while frozen by hit stop', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.6});
  const cs=w.world.get(w.cpu,'status'),b=w.world.get(w.cpu,'brain'),it=w.world.get(w.cpu,'intent');
  cs.stun=0;cs.hitStop=.2;b.attackCd=0;
  step(w.world,.1);assert.equal(w.world.get(w.cpu,'attacker').charge,null);assert.equal(it.attack,null);
});
test('one attack hits once even though its hitbox stays active for several frames', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.6});frozenCpu(w);
  const hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');step(w.world,.25+ACTIVE_TIME.basic+.2);
  assert.equal(hits.length,1);
});
test('the hitbox is closed when the attacker is interrupted before it connects', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:9});w.world.get(w.cpu,'defense').cooldown=1e9;
  const a=w.world.get(w.player,'attacker'),hits=record(w.world,'hit');
  pressAttack(w.world,'player','basic');step(w.world,.24);assert.ok(a.active,'live window opened on a whiff');
  w.world.get(w.player,'status').stun=.5;w.world.get(w.cpu,'transform').x=-6.5+1.5;
  step(w.world,.1);assert.equal(a.active,null);assert.equal(hits.length,0);
});
test('on hit, J cancels into the next J during recovery; mashing J reaches step 3', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});frozenCpu(w);
  const steps=[];w.world.events.on('chargeStart',e=>steps.push(w.world.get(w.player,'attacker').charge.comboStep));
  const t=w.world.get(w.cpu,'transform'),keep=()=>{t.x=-6.5+1.5;w.world.get(w.cpu,'status').stun=1e9;};
  for(let i=0;i<150;i++){if(i%5===0)pressAttack(w.world,'player','basic');keep();step(w.world,1/60);}
  assert.deepEqual(steps.slice(0,3),[1,2,3]);
  assert.ok(steps[1]!==undefined);
});
test('J step 3 does not cancel into a 4th J without the normal cooldown, and K may follow a hit', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});frozenCpu(w);
  const a=w.world.get(w.player,'attacker');
  a.hitConfirmed=true;a.attackTime=.2;a.phase='recovery';a.comboStep=3;a.cooldowns.basic=.3;
  pressAttack(w.world,'player','basic');step(w.world,1/60);assert.equal(a.charge,null,'no J4 cancel');
  a.cooldowns.skill=0;pressAttack(w.world,'player','skill');step(w.world,1/60);
  assert.equal(a.charge?.tier,'skill','J -> K cancel on hit');
});
test('L cannot cancel out of an attack in progress', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:1.5});frozenCpu(w);
  const a=w.world.get(w.player,'attacker');
  a.hitConfirmed=true;a.attackTime=.2;a.phase='recovery';w.world.get(w.player,'energy').value=100;
  pressAttack(w.world,'player','ult');step(w.world,1/60);assert.equal(a.charge,null);
});
test('a whiffed J cannot be cancelled into K', ()=>{
  const w=startedWorld({p:'cleric'});arrange(w,{dist:9});frozenCpu(w);
  const a=w.world.get(w.player,'attacker');a.attackTime=.2;a.phase='recovery';a.hitConfirmed=false;
  pressAttack(w.world,'player','skill');step(w.world,1/60);assert.equal(a.charge,null);
});

test('L cancels only from a LANDED J3 (special condition); never from J1/J2, a whiff, or K',async()=>{
  const {canStart}=await import('../../src/systems/actionSystem.js');
  const a=(o)=>({charge:null,attackTime:.3,attackStyle:'basic',hitConfirmed:true,comboStep:3,cooldowns:{basic:0,skill:0,ult:0},...o});
  assert.equal(canStart(a({}),'ult'),true);
  assert.equal(canStart(a({comboStep:2}),'ult'),false);
  assert.equal(canStart(a({hitConfirmed:false}),'ult'),false);
  assert.equal(canStart(a({attackStyle:'skill'}),'ult'),false);
  assert.equal(canStart(a({cooldowns:{basic:0,skill:0,ult:2}}),'ult'),false);
});
test('integration: full energy + J3 hit lets a buffered L fire; without full energy it does not',()=>{
  for(const full of [true,false]){
    const w=startedWorld({p:'cleric'});arrange(w,{dist:1.6});frozenCpu(w);
    w.world.get(w.player,'energy').value=full?100:50;
    const a=w.world.get(w.player,'attacker');let ult=0;w.world.events.on('chargeStart',e=>{if(e.id===w.player&&e.tier==='ult')ult++;});
    for(let t=0;t<2&&!ult;t+=1/60){pressAttack(w.world,'player','basic');if(a.comboStep===3&&a.hitConfirmed&&a.attackTime>0)pressAttack(w.world,'player','ult');step(w.world,1/60);}
    assert.equal(ult>0,full,`energy full=${full}`);
  }
});
