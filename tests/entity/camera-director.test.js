import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startedWorld,arrange} from '../helpers.js';
import {createCameraRig,updateCameraRig,cameraEvent,CAM} from '../../src/presentation/cameraDirector.js';

const settle=(rig,w,sec)=>{for(let i=0;i<sec*60;i++)updateCameraRig(rig,w,1/60);};

test('camera radius widens as fighters spread apart and stays within limits',()=>{
  const H=startedWorld(),w=H.world;const rig=createCameraRig();
  arrange(H,{dist:2.5});settle(rig,w,3);const near=rig.radius;
  arrange(H,{dist:12});settle(rig,w,3);const far=rig.radius;
  assert.ok(far>near);assert.ok(far<=CAM.maxRadius&&near>=CAM.minRadius*CAM.closeMul-1e-6);
});
test('ultimate pulls the camera back, then eases home',()=>{
  const H=startedWorld(),w=H.world;const rig=createCameraRig();arrange(H,{dist:5});settle(rig,w,3);const base=rig.radius;
  cameraEvent(rig,'chargeStart',{tier:'ult'});settle(rig,w,1.5);
  assert.ok(rig.radius>base*1.1);assert.ok(rig.yawOff>0);
  settle(rig,w,6);assert.ok(Math.abs(rig.radius-base)<.05);assert.ok(Math.abs(rig.yawOff)<.01);
});
test('blocked hits do not move the camera; skill hits punch in briefly',()=>{
  const H=startedWorld(),w=H.world;const rig=createCameraRig();arrange(H,{dist:5});settle(rig,w,3);
  cameraEvent(rig,'hit',{blocked:true,skill:{tier:'skill'}});assert.equal(rig.power,0);
  cameraEvent(rig,'hit',{skill:{tier:'skill'}});assert.ok(rig.power>0);
});
test('camera never jumps: per-frame change stays small even on a sudden ult',()=>{
  const H=startedWorld(),w=H.world;const rig=createCameraRig();arrange(H,{dist:5});settle(rig,w,2);
  cameraEvent(rig,'chargeStart',{tier:'ult'});let prev=rig.radius,max=0;
  for(let i=0;i<120;i++){updateCameraRig(rig,w,1/60);max=Math.max(max,Math.abs(rig.radius-prev));prev=rig.radius;}
  assert.ok(max<.15,`max step ${max}`);
});
test('launched fighter: focus rides up and the camera widens, then returns when they land',()=>{
  const H=startedWorld(),w=H.world;const rig=createCameraRig();arrange(H,{dist:3});settle(rig,w,3);
  const fy0=rig.fy,r0=rig.radius;
  const t=w.get(H.cpu,'transform');t.y=4;settle(rig,w,2);
  assert.ok(rig.fy>fy0+1,'focus follows the airborne fighter');assert.ok(rig.radius>r0,'widens to keep both in frame');assert.ok(rig.radius<=CAM.airMaxRadius);
  t.y=0;settle(rig,w,5);assert.ok(Math.abs(rig.fy-fy0)<.05&&Math.abs(rig.radius-r0)<.1);
});
test('slam landing punches the camera in',()=>{
  const rig=createCameraRig();cameraEvent(rig,'slamLand',{});assert.ok(rig.power>0);
});
