// Combat camera director (pure data, no three/DOM): turns fight state + events into a smoothed camera rig.
// scene.updateCamera applies the rig. Every value eases toward its target with an exponential, frame-rate-independent filter.
import {fighterOf} from '../ecs/entities.js';

export const CAM={
  baseRadius:12, spreadRadius:.7, minRadius:12, maxRadius:19,   // frame both fighters: radius grows with their distance
  closeDist:3.2, closeMul:.86,        // melee range: pull in a little
  powerMul:.9, powerTime:.45, powerYaw:.07,   // skill / launch hit: brief punch-in + small angle nudge
  ultMul:1.22, ultTime:2.2, ultYaw:.18, ultPitch:.06, ultFocusY:.25,   // ultimate: pull back, tilt, hold, then ease home
  rate:{radius:3.2, yaw:3, focus:5, pitch:3},   // 1/s smoothing rates
};
const ease=(rate,dt)=>1-Math.exp(-rate*dt);

export function createCameraRig(){return{radius:13,yawOff:0,pitchOff:0,fx:0,fz:0,fy:1.05,power:0,ult:0,yawDir:1,init:false};}

export function cameraEvent(rig,name,e){
  if(name==='hit'&&!e.blocked){
    const t=e.skill?.tier;
    if(t==='ult')rig.ult=Math.max(rig.ult,CAM.ultTime);
    else if(t==='skill'||e.launched){rig.power=CAM.powerTime;rig.yawDir=-rig.yawDir;}
  }else if(name==='chargeStart'&&e.tier==='ult')rig.ult=Math.max(rig.ult,CAM.ultTime);
}

// Advances the rig by dt and returns the target-follow values used by the renderer.
export function updateCameraRig(rig,world,dt){
  const a=world.get(fighterOf(world,'player'),'transform'),b=world.get(fighterOf(world,'cpu'),'transform');
  const fx=(a.x+b.x)/2,fz=(a.z+b.z)/2,fy=(a.y+b.y)/2*.5+1.05;
  const dist=Math.hypot(a.x-b.x,a.z-b.z);
  rig.power=Math.max(0,rig.power-dt);rig.ult=Math.max(0,rig.ult-dt);
  let radius=Math.min(CAM.maxRadius,Math.max(CAM.minRadius,CAM.baseRadius+dist*CAM.spreadRadius-3));
  if(dist<CAM.closeDist)radius*=CAM.closeMul;
  let yaw=0,pitch=0,fyT=fy;
  if(rig.power>0){radius*=CAM.powerMul;yaw=CAM.powerYaw*rig.yawDir;}
  if(rig.ult>0){radius*=CAM.ultMul;yaw=CAM.ultYaw;pitch=CAM.ultPitch;fyT+=CAM.ultFocusY;}
  if(!rig.init){Object.assign(rig,{radius,yawOff:yaw,pitchOff:pitch,fx,fz,fy:fyT,init:true});}
  else{
    const k=r=>ease(r,dt);
    rig.radius+=(radius-rig.radius)*k(CAM.rate.radius);
    rig.yawOff+=(yaw-rig.yawOff)*k(CAM.rate.yaw);
    rig.pitchOff+=(pitch-rig.pitchOff)*k(CAM.rate.pitch);
    rig.fx+=(fx-rig.fx)*k(CAM.rate.focus);rig.fz+=(fz-rig.fz)*k(CAM.rate.focus);rig.fy+=(fyT-rig.fy)*k(CAM.rate.focus);
  }
  return rig;
}
