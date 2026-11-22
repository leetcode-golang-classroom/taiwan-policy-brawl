import test from 'node:test';
import assert from 'node:assert/strict';
import {aiControl} from '../../src/systems/aiControl.js';
import {startedWorld,step,record,seeded,hp} from '../helpers.js';

const place=(w,dist)=>{const p=w.world.get(w.player,'transform'),c=w.world.get(w.cpu,'transform');p.x=-3;p.z=0;c.x=-3+dist;c.z=0;};

test('AI writes only the CPU intent and does nothing when the match is not running', ()=>{
  const w=startedWorld();place(w,8);w.world.match.running=false;aiControl(w.world,.016);
  const it=w.world.get(w.cpu,'intent');assert.equal(it.moveX,0);assert.equal(it.attack,null);
  assert.equal(w.world.get(w.player,'intent').moveX,0);
});
test('AI chases a distant player (moves toward, faster when far)', ()=>{
  const near=startedWorld({c:'yu'});place(near,3);aiControl(near.world,.016);
  const far=startedWorld({c:'yu'});place(far,8);aiControl(far.world,.016);
  const n=near.world.get(near.cpu,'intent'),f=far.world.get(far.cpu,'intent');
  assert.ok(n.moveX<0&&f.moveX<0);assert.ok(Math.abs(f.moveX)>Math.abs(n.moveX));
});
test('AI stops advancing when close and when stunned', ()=>{
  const w=startedWorld({c:'yu'});place(w,1.5);aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').moveX,0);
  place(w,6);w.world.get(w.cpu,'status').stun=1;aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').moveX,0);
});
test('AI melee: attacks only when in reach and its think-cooldown is ready', ()=>{
  const w=startedWorld({c:'yu'});place(w,2);w.world.get(w.cpu,'brain').attackCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'basic');
  const x=startedWorld({c:'yu'});place(x,5.5);x.world.get(x.cpu,'brain').attackCd=0;x.world.get(x.cpu,'brain').skillCd=99;aiControl(x.world,.016);
  assert.equal(x.world.get(x.cpu,'intent').attack,null);
  const y=startedWorld({c:'yu'});place(y,2);y.world.get(y.cpu,'brain').attackCd=5;y.world.get(y.cpu,'brain').skillCd=99;aiControl(y.world,.016);
  assert.equal(y.world.get(y.cpu,'intent').attack,null);
});
test('AI uses its special at mid range', ()=>{
  const w=startedWorld({c:'yu'});place(w,4);const b=w.world.get(w.cpu,'brain');b.attackCd=99;b.skillCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'skill');
});
test('AI with projectile skills fires from range (not only in melee reach)', ()=>{
  const w=startedWorld({c:'mech'});place(w,5.5);w.world.get(w.cpu,'brain').attackCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'basic');
});
const charging=(w,left=.6)=>{w.world.get(w.player,'attacker').charge={tier:'skill',time:0,duration:left};};
test('AI reacts to a charging move only after a reaction delay (rng-controlled)', ()=>{
  const w=startedWorld({rng:()=>0,c:'yu'});place(w,4);charging(w);
  aiControl(w.world,.016);assert.ok(!w.world.get(w.cpu,'intent').dodge,'no instant reflex');
  w.world.time+=.4;aiControl(w.world,.016);const it=w.world.get(w.cpu,'intent');
  assert.ok(it.dodge);assert.ok(it.dodgeDir.x>0); // away from the player (player is at -x, cpu at +x)
  const n=startedWorld({rng:()=>0.99,c:'yu'});place(n,4);charging(n);
  aiControl(n.world,.016);n.world.time+=.4;aiControl(n.world,.016);assert.ok(!n.world.get(n.cpu,'intent').dodge&&!n.world.get(n.cpu,'intent').defend);
});
test('AI makes ONE reaction decision per threat, not one roll per frame', ()=>{
  const w=startedWorld({rng:()=>0,c:'yu'});place(w,4);charging(w,5);
  aiControl(w.world,.016);w.world.time+=.4;aiControl(w.world,.016);
  w.world.get(w.cpu,'intent').dodge=false;w.world.time+=.1;aiControl(w.world,.016);
  assert.ok(!w.world.get(w.cpu,'intent').dodge,'already decided for this threat');
});
test('AI falls back to guarding when its dodge is on cooldown', ()=>{
  const w=startedWorld({rng:()=>0,c:'yu'});place(w,4);charging(w);w.world.get(w.cpu,'status').dodgeCooldown=5;
  aiControl(w.world,.016);w.world.time+=.4;aiControl(w.world,.016);assert.ok(w.world.get(w.cpu,'intent').defend);
});
test('AI does not blindly attack into the strike frame of the player; it attacks once the threat is read', ()=>{
  const w=startedWorld({rng:()=>.9,c:'yu'});place(w,2);w.world.get(w.cpu,'brain').attackCd=0;charging(w,.1);
  w.world.get(w.player,'attacker').charge.time=.05;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,null);
});
test('AI respects real cooldowns and uses its ultimate only with full energy, after a think delay', ()=>{
  const w=startedWorld({c:'yu'});place(w,3);const b=w.world.get(w.cpu,'brain'),a=w.world.get(w.cpu,'attacker');
  b.attackCd=0;a.cooldowns.basic=1;aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').attack,null,'basic still on cooldown');
  const u=startedWorld({c:'yu'});place(u,3);u.world.get(u.cpu,'brain').attackCd=99;u.world.get(u.cpu,'brain').skillCd=99;
  aiControl(u.world,.016);assert.equal(u.world.get(u.cpu,'intent').attack,null,'no energy');
  u.world.get(u.cpu,'energy').value=100;aiControl(u.world,.016);assert.equal(u.world.get(u.cpu,'intent').attack,null,'thinking...');
  u.world.time+=1.5;aiControl(u.world,.016);assert.equal(u.world.get(u.cpu,'intent').attack,'ult');
});
test('after attacking the CPU backs off for a moment instead of pressing again', ()=>{
  const w=startedWorld({c:'yu'});place(w,2);const b=w.world.get(w.cpu,'brain');b.attackCd=0;aiControl(w.world,.016);
  assert.equal(w.world.get(w.cpu,'intent').attack,'basic');assert.ok(b.recoverUntil>w.world.time);
  w.world.get(w.cpu,'intent').attack=null;aiControl(w.world,.016);
  assert.equal(b.mode,'retreat');assert.ok(w.world.get(w.cpu,'intent').moveX>0,'steps away from the player');
});
test('a ranged CPU keeps its distance; a CPU at a comfortable range circles instead of standing still', ()=>{
  const r=startedWorld({c:'mech'});place(r,1.6);aiControl(r.world,.016);assert.equal(r.world.get(r.cpu,'brain').mode,'retreat');
  const s=startedWorld({c:'yu'});place(s,2.1);aiControl(s.world,.016);
  const it=s.world.get(s.cpu,'intent');assert.equal(s.world.get(s.cpu,'brain').mode,'strafe');assert.ok(Math.abs(it.moveZ)>0&&Math.abs(it.moveX)<1e-9);
});
test('AI will not queue a new attack while it is already charging', ()=>{
  const w=startedWorld({c:'yu'});place(w,2);w.world.get(w.cpu,'brain').attackCd=0;w.world.get(w.cpu,'attacker').charge={tier:'basic',time:0,duration:.2};
  aiControl(w.world,.016);assert.equal(w.world.get(w.cpu,'intent').attack,null);
});
test('CPU control is deterministic for a given seed', ()=>{
  const run=seed=>{const w=startedWorld({p:'yu',c:'mech',rng:seeded(seed)});const log=[];w.world.events.on('hit',e=>log.push([e.targetId,e.amount]));step(w.world,20);return JSON.stringify([log,hp(w,'player'),hp(w,'cpu')]);};
  assert.equal(run(3),run(3));
});
test('full AI-controlled duel keeps every invariant (bounds, finite numbers, HP range, single winner)', ()=>{
  for(const [p,c] of [['mech','nun'],['cleric','admiral'],['brawler','mage'],['yu','leopard']]){
    const w=startedWorld({p,c,rng:seeded(11)});
    // give P1 a scripted control so both sides fight: spam attacks toward the CPU
    const me=record(w.world,'matchEnd');
    for(let i=0;i<60*120&&!w.world.match.ended;i++){
      const it=w.world.get(w.player,'intent');it.moveX=.6;if(i%20===0)it.attack=['basic','skill','ult'][(i/20)%3|0];
      step(w.world,1/60);
      for(const id of w.world.query('transform')){const t=w.world.get(id,'transform');
        assert.ok(Number.isFinite(t.x+t.y+t.z+t.rotY));assert.ok(Math.abs(t.x)<=7+1e-6&&Math.abs(t.z)<=5+1e-6&&t.y>=0);}
      for(const id of w.world.query('health')){const h=w.world.get(id,'health');assert.ok(h.hp>=0&&h.hp<=h.max);}
    }
    assert.ok(w.world.match.ended,`${p} vs ${c} should finish within 2 minutes`);assert.equal(me.length,1);
  }
});
test('a CPU vs idle P1 duel has rhythm: it attacks regularly, not every frame, and never stands still for long', ()=>{
  const w=startedWorld({p:'yu',c:'yu',rng:seeded(5)});const starts=[];w.world.events.on('chargeStart',e=>{if(e.id===w.cpu)starts.push(w.world.time);});
  w.world.get(w.player,'status').dodgeCooldown=1e9;
  let still=0,maxStill=0,prev=null;const t=w.world.get(w.cpu,'transform');
  for(let i=0;i<60*20&&!w.world.match.ended;i++){
    w.world.get(w.player,'health').hp=100;step(w.world,1/60);   // P1 is a punching bag that never dies
    if(prev&&Math.hypot(t.x-prev.x,t.z-prev.z)<1e-5)still++;else still=0;maxStill=Math.max(maxStill,still);prev={x:t.x,z:t.z};
  }
  assert.ok(starts.length>=4,'attacks regularly: '+starts.length);assert.ok(starts.length<=20*2,'not spamming');
  for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=.4,'a gap between attacks');
  assert.ok(maxStill<60*2,'never idle for 2+ seconds');
});
test('a CPU circling the player never grinds against the arena wall', ()=>{
  const w=startedWorld({p:'yu',c:'yu',rng:seeded(2)});const t=w.world.get(w.cpu,'transform'),p=w.world.get(w.player,'transform');
  p.x=5.5;p.z=0;t.x=6.9;t.z=0.2;w.world.get(w.player,'status').stun=1e9;
  let atWall=0;for(let i=0;i<60*10;i++){w.world.get(w.cpu,'brain').attackCd=1e9;w.world.get(w.cpu,'brain').skillCd=1e9;
    step(w.world,1/60);if(Math.abs(t.x)>=7-1e-6||Math.abs(t.z)>=5-1e-6)atWall++;}
  assert.ok(atWall<60*2,'only briefly touches the wall: '+atWall/60+'s');
});
test('a melee CPU closes in until its basic is really in reach (so it can attack)', ()=>{
  const w=startedWorld({p:'yu',c:'yu',rng:seeded(4)});const hits=record(w.world,'hit');
  w.world.get(w.player,'status').dodgeCooldown=1e9;w.world.get(w.player,'defense').cooldown=1e9;
  for(let i=0;i<60*8;i++){w.world.get(w.player,'health').hp=100;step(w.world,1/60);}
  assert.ok(hits.some(h=>h.attackerId===w.cpu&&h.amount>0),'the CPU lands hits');
});
