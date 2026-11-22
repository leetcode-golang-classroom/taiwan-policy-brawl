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
