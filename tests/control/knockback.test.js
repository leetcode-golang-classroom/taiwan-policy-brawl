import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHit} from '../../src/systems/combatSystem.js';
import {getSkill,ARENA,KNOCK,WEIGHT} from '../../src/config.js';
import {startedWorld,step,arrange} from '../helpers.js';

const setup=(c='cleric',dist=3)=>{const w=startedWorld({p:'cleric',c});arrange(w,{dist});const st=w.world.get(w.cpu,'status');st.stun=0;st.dodgeCooldown=1e9;w.world.get(w.cpu,'defense').cooldown=1e9;return w;};
const cx=w=>w.world.get(w.cpu,'transform');

test('knockback is a velocity: no position pop on the hit frame, total distance matches the skill', ()=>{
  const w=setup('cleric',2),x0=cx(w).x,skill=getSkill('cleric','basic');
  resolveHit(w.world,w.player,w.cpu,skill);
  assert.equal(cx(w).x,x0,'nothing moves in the same instant');
  w.world.get(w.cpu,'status').hitStop=0;w.world.get(w.player,'status').hitStop=0;
  step(w.world,1/60);assert.ok(cx(w).x-x0>0&&cx(w).x-x0<skill.knockback*.5,'moves a little per frame');
  step(w.world,.2);   // push lasts .16s; the victim is still stunned, so the CPU has not walked back yet
  assert.ok(Math.abs(cx(w).x-x0-skill.knockback/WEIGHT.cleric)<.06,'ends at ~distance: '+(cx(w).x-x0));
});
test('hit stop delays the push until the freeze is over', ()=>{
  const w=setup('cleric',2),x0=cx(w).x;
  resolveHit(w.world,w.player,w.cpu,getSkill('cleric','skill'));
  step(w.world,.05);assert.equal(cx(w).x,x0,'frozen during hit stop');
  step(w.world,.3);assert.ok(cx(w).x>x0);
});
test('heavier fighters are pushed less far', ()=>{
  const run=c=>{const w=setup(c,2),x0=cx(w).x;resolveHit(w.world,w.player,w.cpu,getSkill('cleric','skill'));step(w.world,1);return cx(w).x-x0;};
  assert.ok(WEIGHT.mech>WEIGHT.mage);assert.ok(run('mech')<run('mage'));
});
test('a knocked fighter stops at the arena wall and never leaves it', ()=>{
  const w=setup('cleric',2);cx(w).x=ARENA.halfX-.3;w.world.get(w.player,'transform').x=cx(w).x-2;
  for(let i=0;i<5;i++){resolveHit(w.world,w.player,w.cpu,getSkill('cleric','ult'));step(w.world,.8);}
  assert.ok(cx(w).x<=ARENA.halfX+1e-9);
  assert.ok(Math.abs(cx(w).z)<=ARENA.halfZ+1e-9);assert.ok(cx(w).y>=0);
});
test('fighters on the ground cannot overlap; an airborne fighter may pass over', ()=>{
  const w=setup('cleric',3);const p=w.world.get(w.player,'transform');
  cx(w).x=p.x+.2;step(w.world,1/60);
  assert.ok(Math.hypot(cx(w).x-p.x,cx(w).z-p.z)>=KNOCK.minSep-1e-6,'pushed apart');
  cx(w).x=p.x+.2;cx(w).y=2.5;w.world.get(w.cpu,'body').grounded=false;step(w.world,1/60);
  assert.ok(Math.hypot(cx(w).x-p.x,cx(w).z-p.z)<KNOCK.minSep,'jump-over is allowed');
});
test('launched victims fall with gravity, land, and the Knockback state is reported', ()=>{
  const w=setup('cleric',2),seq=[];
  w.world.events.on('stateChange',e=>{if(e.id===w.cpu)seq.push(e.to);});
  const lands=[];w.world.events.on('land',e=>lands.push(e));
  resolveHit(w.world,w.player,w.cpu,getSkill('cleric','skill'));
  for(let i=0;i<240;i++)step(w.world,1/60);
  assert.ok(lands.length>=1);assert.ok(seq.includes('Airborne'));assert.equal(cx(w).y,0);
});
