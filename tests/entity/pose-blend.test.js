import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendPose,blendRate,BLEND} from '../../src/presentation/poseBlend.js';

const node=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
const rig=()=>({body:node(),head:node(),limbs:[node(),node(),node(),node()],grounded:true,phase:'idle',moving:false});

test('a pose change is eased in over several frames, not snapped',()=>{
  const u=rig(),st={};blendPose(u,1/60,st);
  u.limbs[0].rotation.x=1;blendPose(u,1/60,st);
  assert.ok(u.limbs[0].rotation.x>0&&u.limbs[0].rotation.x<.5);
  for(let i=0;i<60;i++){u.limbs[0].rotation.x=1;blendPose(u,1/60,st);}
  assert.ok(u.limbs[0].rotation.x>.99);
});
test('blending is frame-rate independent',()=>{
  const run=hz=>{const u=rig(),st={};blendPose(u,1/hz,st);for(let i=0;i<hz*.2;i++){u.body.rotation.z=1;blendPose(u,1/hz,st);}return u.body.rotation.z;};
  assert.ok(Math.abs(run(30)-run(120))<.01);
});
test('combat and hit states blend faster than idle or walking',()=>{
  const base=rig();
  assert.equal(blendRate({...base}),BLEND.idle);
  assert.equal(blendRate({...base,moving:true}),BLEND.move);
  assert.equal(blendRate({...base,phase:'strike'}),BLEND.combat);
  assert.equal(blendRate({...base,hitReact:.2}),BLEND.reaction);
  assert.ok(BLEND.combat>BLEND.idle&&BLEND.reaction>BLEND.move);
});
test('an attack pose still reaches ~95% within 3 frames of the strike phase',()=>{
  const u=rig(),st={};blendPose(u,1/60,st);u.phase='strike';
  for(let i=0;i<3;i++){u.limbs[2].rotation.x=-1.5;blendPose(u,1/60,st);}
  assert.ok(u.limbs[2].rotation.x<-1.5*.9);
});
test('a huge pose flip (round reset) snaps instead of whipping through the blend',()=>{
  const u=rig(),st={};blendPose(u,1/60,st);u.body.rotation.y=Math.PI;blendPose(u,1/60,st);
  assert.equal(u.body.rotation.y,Math.PI);
});

import {stepRunBlend,RUN_BLEND} from '../../src/presentation/poseBlend.js';
test('runBlend eases 0->1 over a few frames and back down more slowly, never leaving [0,1]',()=>{
  let v=0;v=stepRunBlend(v,true,1/60);assert.ok(v>0&&v<.5,'not a snap: '+v);
  for(let i=0;i<30;i++)v=stepRunBlend(v,true,1/60);assert.equal(v,1);
  let d=stepRunBlend(1,false,1/60);assert.ok(d<1&&d>.8,'eases down: '+d);
  for(let i=0;i<120;i++)d=stepRunBlend(d,false,1/60);assert.equal(d,0);
  assert.ok(RUN_BLEND.up>RUN_BLEND.down);
  assert.ok(Math.abs(stepRunBlend(0,true,1/30)-(1-Math.exp(-RUN_BLEND.up/30)))<1e-9,'frame-rate independent form');
});

import {brakePose,BRAKE} from '../../src/presentation/poseBlend.js';
test('brakePose scales with weight: zero at 0, full at 1, clamped, leaning back with the lead foot forward',()=>{
  const z=brakePose(0);assert.ok(Object.values(z).every(v=>v===0));
  const f=brakePose(1);assert.equal(f.bodyX,BRAKE.lean);assert.ok(f.bodyX<0&&f.legL<0&&f.legR>0&&f.arms<0);
  assert.deepEqual(brakePose(7),f);assert.deepEqual(brakePose(-2),z);
  assert.ok(Math.abs(brakePose(.5).bodyX-BRAKE.lean/2)<1e-12);
});
