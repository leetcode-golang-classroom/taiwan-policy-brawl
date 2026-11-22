import * as THREE from 'three';
import {blendPose} from './poseBlend.js';
import {updateRealModel} from '../character/CharacterController.js';
import {chargeDurations,ATTACK_TIME,PHASES,HIT_REACT} from '../config.js';

// Maps ECS components onto a read-only "state" layer in front of the rig (limbs/head/body...) stored on the view.
function stateOf(world,id,f){
  const u=Object.create(f.userData),st=world.get(id,'status'),b=world.get(id,'body'),at=world.get(id,'attacker'),ch=at.charge;
  u.stun=st.stun;u.hitReact=st.hitReact;u.hitSide=st.hitSide;u.dodgeTimer=st.dodgeTimer;u.dodgeDirection=st.dodgeDir;
  u.grounded=b.grounded;u.movePhase=b.movePhase;u.chargeFwd=b.chargeFwd;u.chargeSide=b.chargeSide;u.stepPhase=b.stepPhase;u.moving=b.moving;
  u.guarding=!!world.get(id,'defense')?.active;
  u.phase=at.phase;u.moveFwd=b.moveFwd;u.moveSide=b.moveSide;u.rushTimer=st.rushTimer;u.hitDir=st.hitDir;u.hitPower=st.hitPower;u.airHit=st.airHit;u.landTimer=st.landTimer;
  u.rotY=world.get(id,'transform').rotY;u.speedRatio=Math.min(1,Math.hypot(b.vx||0,b.vz||0)/(b.moveSpeed||1));
  u.attackTime=at.attackTime;u.attackStyle=at.attackStyle;u.chargeTime=ch?ch.time:0;u.chargeStyle=ch?ch.tier:undefined;
  return u;
}
// Weapon / energy-focus feedback (spec 7): rotates while charging, glows progressively, flashes on impact; a pooled PointLight (1 per fighter) follows it.
const TIER_GLOW={basic:2.5,skill:5,ult:9};
function updateGlow(u,time,dt){
  const ph=u.phase,tier=(ph==='strike'||ph==='windup'||ph==='charge'?u.chargeStyle:u.attackStyle)||'basic';
  const q=ph==='charge'?Math.min(1,u.chargeTime/(chargeDurations[tier]||.5)):ph==='strike'?1:ph==='windup'?.1:0;
  const flash=ph==='impact'?1:ph==='recovery'?.35:0;
  const level=Math.max(q,flash);
  u.chargeRig.visible=u.chargeTime>0||ph==='impact';
  if(u.chargeRig.visible){
    u.chargeRig.rotation.y+=dt*(2.8+level*9);u.chargeRig.rotation.z=Math.sin(time*5)*.08;u.chargeHalo.rotation.z+=dt*(4+level*10);u.chargeCore.rotation.x+=dt*2.4;u.chargeCore.rotation.y+=dt*3.2;
    u.chargeRig.scale.setScalar(1+Math.sin(time*8)*.055+level*.5);u.chargeCore.material.emissiveIntensity=.45+level*2.4;
  }
  for(const w of u.parts?.weapons||[]){   // weapon props: spin faster as the charge builds, glow with the level
    w.obj.rotation[w.axis]+=dt*w.speed*(.5+level*7);
    if(w.bob){w.base??=w.obj.position.y;w.obj.position.y=w.base+Math.sin(time*2.4)*w.bob;}
    const m=w.obj.material;if(m&&'emissiveIntensity' in m)m.emissiveIntensity=.25+level*2.2;
  }
  if(u.parts?.tail)u.parts.tail.rotation.y=Math.sin(time*3)*.35+(u.moving?Math.sin(u.movePhase)*.2:0);
  if(u.glowLight){u.glowLight.intensity=THREE.MathUtils.damp(u.glowLight.intensity,level*TIER_GLOW[tier],18,dt);}
}
const SIGNATURE={
  admiral:{basic:[[-1.4,-.15,-1.4,.15,-.1],[-1.6,-.1,-1.6,.1,-.15]],skill:[[-1.2,-1.0,-.4,.4,.05],[-.4,-.4,-1.4,.9,-.1]],ult:[[-2.6,-.6,-2.6,.6,-.2],[-.8,-1.6,-.8,1.6,.2]]},
  mage:{basic:[[-.3,-.3,-1.6,.15,-.05],[-.3,-.3,-1.7,.1,-.1]],skill:[[-.5,-.3,-2.9,.25,-.1],[-.5,-.3,-2.6,.25,-.1]],ult:[[-3,-.4,-3,.4,-.25],[-1.2,-.2,-1.2,.2,.3]]},
  cleric:{basic:[[-1.2,-.1,-1.2,.1,-.05],[-1.4,-.05,-1.4,.05,-.1]],skill:[[.3,-.5,.3,.5,.12],[-2.2,-1.6,-2.2,1.6,-.25]],ult:[[-.2,-.6,-3.1,.3,.05],[-.2,-.6,-3.1,.1,-.3]]},
  nun:{basic:[[-1.2,-.3,-1.2,.3,-.1],[-1.5,-.2,-1.5,.2,-.15]],skill:[[-.5,-.5,-2.9,.2,.1],[-.5,-.5,-1.5,.15,-.25]],ult:[[-3,-.5,-3,.5,-.2],[-1.1,-.3,-1.1,.3,.35]]},
  yu:{basic:[[-.3,-.3,-2.9,.2,.1],[-.3,-.3,-.7,.2,.3]],skill:[[-1.5,-.8,-1.5,.8,-.1],[-1.5,-.3,-1.5,.3,-.2]],ult:[[-3,-.8,-3,.8,-.2],[-1.6,-.2,-1.6,.2,.3]]},
  bubble:{basic:[[-1.35,.55,-1.35,-.55,-.05],[-1.3,.5,-1.3,-.5,-.05]],skill:[[-2.75,.5,.2,.15,0],[-2.7,.5,.1,.1,0]],ult:[[-1.2,.35,-1.57,0,-.05],[-1.2,.3,-1.57,0,-.05]]}   // basic: hands together in a heart; skill: left-hand salute; ult: finger-gun pointing at the target
};
export function updateAnimations(world,dt){
  for(const id of world.query('view','fighter','status','body','attacker')){const f=world.get(id,'view').obj;const u=stateOf(world,id,f);
    if(!(u.dodgeTimer>0&&u.id==='cleric'))f.userData.spinY=0;const phase=world.time*5+(world.get(id,'fighter').side==='cpu'?1:0),dodging=u.dodgeTimer>0,walking=u.moving&&u.stun<=0&&!dodging;const gait=u.movePhase,step=walking&&u.grounded?Math.sin(gait):0,alt=walking&&u.grounded?Math.cos(gait):0;u.head.position.z=0;u.limbs[0].position.y=1.72;u.limbs[2].position.y=1.72;u.limbs[1].position.y=.85;u.limbs[3].position.y=.85;u.head.position.y=2.12+Math.sin(phase)*.025;u.body.position.y=1.25+(u.grounded?Math.abs(Math.sin(phase))*.025:0);u.aura.material.opacity=dodging?1:.7;u.aura.scale.setScalar(u.grounded?(dodging?1.28:1):1.18);
    // Character-specific walk cycles. Limb order: left arm, left leg, right arm, right leg.
    if(u.limbs.length>=4){const arms=[u.limbs[0],u.limbs[2]],legs=[u.limbs[1],u.limbs[3]];let stride=.58,bob=0,lean=0,armSwing=.55,sway=1;   // sway scales the sideways wobble (leg splay, torso roll)
      switch(u.id){
        case 'mech': stride=.78;bob=Math.abs(step)*.105;lean=-.07;armSwing=.72;legs[0].rotation.z=-.06;legs[1].rotation.z=.06;break; // brisk high-knee tech promoter
        case 'leopard': stride=.85;bob=Math.abs(step)*.06;lean=Math.sin(gait)*.05;armSwing=.8;break; // leopard: low, stalking, diagonal-pair gait (body pitched forward below)
        case 'admiral': stride=.34;bob=Math.abs(step)*.15;lean=Math.sin(gait)*.09;armSwing=.24;legs[0].rotation.z=-.09;legs[1].rotation.z=.09;break; // broad mahjong-uncle waddle
        case 'mage': stride=.28;bob=Math.abs(step)*.04;lean=0;armSwing=.3;sway=.25;arms[0].rotation.z=-.9+alt*.12;arms[1].rotation.z=.18+step*.18;break; // teacher's brisk march and pointer hand
        case 'cleric': stride=.5;bob=Math.abs(step)*.04;lean=Math.sin(gait)*.045;armSwing=.2;arms[0].rotation.z=-.38+alt*.08;arms[1].rotation.z=.38-alt*.08;break; // dignified ceremonial procession
        case 'brawler': stride=.82;bob=Math.abs(step)*.16;lean=-.1;armSwing=.88;legs[0].rotation.z=-.13;legs[1].rotation.z=.13;break; // bodybuilder power stomp
        case 'nun': stride=.8;bob=Math.abs(step)*.06;lean=0;armSwing=.5;sway=.25;arms[0].rotation.z=-.15+alt*.08;arms[1].rotation.z=.3-step*.1;break; // demolition-site heavy boots
        case 'yu': stride=.34;bob=Math.abs(step)*.018;lean=0;armSwing=.2;arms[0].rotation.z=-.22+alt*.1;arms[1].rotation.z=.22-alt*.1;break; // measured engineer walk
        case 'bubble': stride=.24;bob=Math.abs(step)*.025;lean=Math.sin(gait)*.02;armSwing=.18;sway=.3;arms[0].rotation.z=-.55+alt*.1;arms[1].rotation.z=.12-step*.12;break; // careful presentation walk
        default: break;
      }
      if(walking&&u.grounded){
        // Direction-aware gait: backing off reverses the stride, strafing shortens it and splays the legs, a rush is a low forward sprint.
        const sgn=u.moveFwd<-.25?-1:1,sd=u.moveSide,rushing=u.rushTimer>0;stride*=(1-.4*Math.abs(sd))*(rushing?1.3:.6+.4*u.speedRatio);armSwing*=rushing?1.4:1;
        legs[0].rotation.x=step*stride*sgn;legs[1].rotation.x=-step*stride*sgn;arms[0].rotation.x=-step*armSwing*sgn+(rushing?.9:0);arms[1].rotation.x=step*armSwing*sgn+(rushing?.9:0);
        legs[0].rotation.z+=sd*(.2+.2*step)*sway;legs[1].rotation.z+=sd*(.2-.2*step)*sway;
        u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,lean+(Math.sin(gait)*.025+sd*.14)*sway,12,dt);
        u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,(rushing?.42*Math.max(0,u.moveFwd)-(u.moveFwd<-.25?.1:0):0)+(u.id==='leopard'?.22:0),12,dt);   // lean into a forward rush
        u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,-sd*.38,10,dt);u.head.rotation.y=THREE.MathUtils.damp(u.head.rotation.y,-sd*.2,10,dt); // torso turns toward the move direction, head follows a little
        u.body.position.y=1.25+bob-(rushing?.1:0);u.head.position.y=2.12+bob*.72-(rushing?.08:0);
        if(u.id==='leopard'){ // quadruped gait: forelimbs reach forward, the head rides on the pitched shoulders, a rush becomes a bounding gallop
          const pitch=u.body.rotation.x,g=Math.sin(gait),sw=rushing?.95:.6;
          if(rushing){ // fast bound: left/right limbs always alternate, hind legs lag the forelimbs
            const hind=Math.sin(gait+Math.PI*.8)*sw*1.1;
            arms[0].rotation.x=-1.15+g*sw;arms[1].rotation.x=-1.15-g*sw;legs[0].rotation.x=hind*sgn;legs[1].rotation.x=-hind*sgn;
            u.body.position.y=1.2+Math.abs(g)*.2;
          } else {     // trot: forelimbs carried forward, diagonal pairs
            arms[0].rotation.x=-.75-step*sw*sgn;arms[1].rotation.x=-.75+step*sw*sgn;
          }
          u.head.position.set(0,1.25+Math.cos(pitch)*.87+(u.body.position.y-1.25)*.9,Math.sin(pitch)*.87);u.head.rotation.x=THREE.MathUtils.damp(u.head.rotation.x,-pitch*.7,12,dt);
        }
      }
      else if(u.grounded){u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,0,10,dt);legs[0].rotation.x=THREE.MathUtils.damp(legs[0].rotation.x,0,12,dt);legs[1].rotation.x=THREE.MathUtils.damp(legs[1].rotation.x,0,12,dt);arms[0].rotation.x=THREE.MathUtils.damp(arms[0].rotation.x,0,12,dt);arms[1].rotation.x=THREE.MathUtils.damp(arms[1].rotation.x,0,12,dt);arms[0].rotation.z=THREE.MathUtils.damp(arms[0].rotation.z,-.12,12,dt);arms[1].rotation.z=THREE.MathUtils.damp(arms[1].rotation.z,.12,12,dt);legs[0].rotation.z=THREE.MathUtils.damp(legs[0].rotation.z,0,12,dt);legs[1].rotation.z=THREE.MathUtils.damp(legs[1].rotation.z,0,12,dt);u.head.rotation.z=THREE.MathUtils.damp(u.head.rotation.z,0,12,dt);u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,0,10,dt);}
    }
    if(u.guarding&&!dodging){ // guard pose: lin crosses his arms, everyone else raises a forearm guard
      u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,-.08,16,dt);u.body.position.y=1.2;
      const lin=u.id==='brawler';
      u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,lin?-2.35:-1.7,16,dt);u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,lin?2.35:1.7,16,dt);
      u.limbs[0].rotation.x=THREE.MathUtils.damp(u.limbs[0].rotation.x,lin?-.9:-.5,16,dt);u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,lin?-.9:-.5,16,dt);
    } else if(dodging){
      const t=1-u.dodgeTimer/.68,side=Math.sin(t*Math.PI),dir=u.dodgeDirection;
      // Nine readable evasions: dash, float, duck, sidestep, spin, shoulder roll, heavy lean, guard-backstep, hop-back.
      u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,({mech:-.22,leopard:.08,admiral:.48,mage:-.12,cleric:.18,brawler:-.42,nun:.3,yu:-.08,'bubble':.12}[u.id]||0),18,dt);
      if(u.id==='mech'){u.body.rotation.x=-.28;u.limbs[0].rotation.z=-1.15;u.limbs[1].rotation.z=1.05;u.limbs[1].rotation.x=-.8;}
      else if(u.id==='leopard'){u.body.position.y=1.0+side*.35;u.body.rotation.x=.55;u.head.position.y=1.85+side*.3;u.limbs[0].rotation.x=-1.4;u.limbs[2].rotation.x=-1.4;u.limbs[1].rotation.x=.9;u.limbs[3].rotation.x=.9;}   // leopard side-leap: crouch, forelegs reach, hind legs kick
      else if(u.id==='admiral'){u.body.position.y=.92;u.head.position.y=1.82;u.body.rotation.x=.35;u.limbs[0].rotation.z=-.45;u.limbs[2].rotation.z=.45;}
      else if(u.id==='mage'){u.body.rotation.x=-.12;u.limbs[0].rotation.z=-1.55;u.limbs[2].rotation.z=.75;u.head.rotation.y=side*.32;}
      else if(u.id==='cleric'){f.userData.spinY=(f.userData.spinY||0)+dt*10;u.body.rotation.x=.12;u.limbs[0].rotation.z=-.9;u.limbs[2].rotation.z=.9;}
      else if(u.id==='brawler'){u.body.rotation.x=-.42;u.limbs[0].rotation.z=-1.9;u.limbs[2].rotation.z=1.45;u.body.position.y=1.18;}
      else if(u.id==='nun'){u.body.rotation.x=.25;u.limbs[0].rotation.z=-1.25;u.limbs[2].rotation.z=.9;u.body.position.y=1.08;}
      else if(u.id==='yu'){u.body.rotation.x=.18;u.limbs[0].rotation.z=-1.15;u.limbs[2].rotation.z=1.15;u.limbs[1].rotation.x=.35;}
      else {u.body.rotation.x=-.18;u.limbs[0].rotation.z=-1.25;u.limbs[2].rotation.z=1.05;u.head.rotation.y=-side*.22;}
    }else if(u.landTimer>0&&u.grounded){ // landing reaction after being launched: crouch, arms out, then recover
      const q=u.landTimer/HIT_REACT.landTime,k=Math.sin(Math.min(1,q)*Math.PI*.5);
      u.body.position.y=THREE.MathUtils.damp(u.body.position.y,1.25-.32*k,22,dt);u.head.position.y=2.12-.3*k;u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,.3*k,18,dt);
      u.limbs[1].rotation.x=-.55*k;u.limbs[3].rotation.x=-.55*k;u.limbs[0].rotation.z=-1.1*k;u.limbs[2].rotation.z=1.1*k;
    }else if(!u.grounded&&u.airHit){ // launched: body whips toward the push direction and tumbles slightly, limbs flail
      const pz=u.hitDir.x*Math.sin(u.rotY)+u.hitDir.z*Math.cos(u.rotY);
      u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,pz*HIT_REACT.airborneSpin,10,dt);u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,0,10,dt);
      u.limbs[0].rotation.z=-1.9+Math.sin(world.time*18)*.25;u.limbs[2].rotation.z=1.9-Math.sin(world.time*18)*.25;u.limbs[1].rotation.x=.5;u.limbs[3].rotation.x=-.4;
    }else if(u.hitReact>0){ // flinch away from the attack: lean along the push direction (forward/back and sideways), harder hits lean further
      const q=u.hitReact/.38,pz=u.hitDir.x*Math.sin(u.rotY)+u.hitDir.z*Math.cos(u.rotY),px=u.hitDir.x*Math.cos(u.rotY)-u.hitDir.z*Math.sin(u.rotY),mag=(.28+.6*u.hitPower)*q;
      u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,pz*mag,20,dt);u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,-px*mag*.8,20,dt);
      const fl=(1+u.hitPower*.8)*q;u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,-1.2*fl,18,dt);u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,1.2*fl,18,dt);
      u.head.rotation.x=THREE.MathUtils.damp(u.head.rotation.x,pz*.3*q,18,dt);u.head.rotation.z=THREE.MathUtils.damp(u.head.rotation.z,-u.hitSide*.18*q,18,dt);}
    else if(u.rushTimer>0&&u.phase==='idle'){} // rush pose is produced by the directional gait above
    else if(u.phase==='windup'){ // 1. ready stance: crouch and coil the torso, hand drawn back
      u.body.position.y=1.2;u.head.position.y=2.07;u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,-.28,16,dt);u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,.06,14,dt);
      u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,.7,16,dt);u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,-.5,14,dt);
      u.limbs[1].rotation.x=THREE.MathUtils.damp(u.limbs[1].rotation.x,-.18,14,dt);u.limbs[3].rotation.x=THREE.MathUtils.damp(u.limbs[3].rotation.x,.18,14,dt);
    }
    else if(u.phase==='charge'){ // 2. charge: planted feet, glowing weapon/energy focus gathers power
      const q=Math.min(1,u.chargeTime/(chargeDurations[u.chargeStyle]||.5));
      u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,-.035-q*.055,10,dt);
      u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,0,10,dt);u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,-.15,10,dt);
      u.body.position.y=1.25;u.head.position.y=2.12;
      u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,-.42-q*.16,12,dt);
      u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,.34+q*.13,12,dt);
      {const D=THREE.MathUtils.damp,cm=u.chargeFwd!==0||u.chargeSide!==0,cs=Math.sin(u.stepPhase);   // planted feet; held direction adds a small alternating shuffle
       u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,cm?cs*.22:0,14,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,cm?-cs*.22:0,14,dt);}
      if(u.id==='leopard'){ // leopard gathers power: belly low, shoulders up, forepaws planted ahead, quivering
        const D=THREE.MathUtils.damp,sh=Math.sin(world.time*38)*.012*q;
        u.body.position.y=1.0-q*.12+sh;u.head.position.y=1.7-q*.1;u.body.rotation.x=D(u.body.rotation.x,.62+q*.2,12,dt);u.head.rotation.x=D(u.head.rotation.x,-.5,12,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,-1.2-q*.3,12,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,-1.2-q*.3,12,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,-.15,12,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,.15,12,dt);
        // crouch with one foot forward and one back; held direction shuffles the feet (reversed stance when backing off) and splays them sideways
        const cm=u.chargeFwd!==0||u.chargeSide!==0,cs=cm?Math.sin(u.stepPhase)*.35:0,dir=u.chargeFwd<-.25?-1:1,base=-.8*dir;
        u.limbs[1].position.y=.6;u.limbs[3].position.y=.6;u.limbs[0].position.y=1.47;u.limbs[2].position.y=1.47;
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,base+cs,16,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,-base-cs,16,dt);
        u.limbs[1].rotation.z=D(u.limbs[1].rotation.z,u.chargeSide*.3,14,dt);u.limbs[3].rotation.z=D(u.limbs[3].rotation.z,u.chargeSide*.3,14,dt);
      }
      if(u.id==='mech'&&u.chargeStyle==='basic'){ // 揮拳: right fist cocked far back, torso wound up, left hand guarding
        const D=THREE.MathUtils.damp;
        u.body.rotation.y=D(u.body.rotation.y,-.55,16,dt);u.body.rotation.x=D(u.body.rotation.x,.08,14,dt);
        u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,.9,18,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,.55,18,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,-1.1,18,dt);u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,-.25,18,dt);
      }
      if(u.id==='mech'&&u.chargeStyle==='skill'){ // 階梯往上爬: alternating knee lifts and arm pumps while the body climbs
        const D=THREE.MathUtils.damp,sw=Math.sin(world.time*16);
        u.body.rotation.x=D(u.body.rotation.x,-.18,14,dt);u.body.rotation.y=D(u.body.rotation.y,0,14,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,-.5-sw*.8,22,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,-.5+sw*.8,22,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,sw*.9-.3,22,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,-sw*.9-.3,22,dt);
      }
      if(u.id==='mech'&&u.chargeStyle==='ult'){ // 由下往上拋: deep crouch, both arms swung low behind the knees
        const D=THREE.MathUtils.damp;
        u.body.position.y=1.0;u.head.position.y=1.9;u.body.rotation.x=D(u.body.rotation.x,.4,14,dt);u.body.rotation.y=D(u.body.rotation.y,0,14,dt);
        u.limbs[0].position.y=1.5;u.limbs[2].position.y=1.5;u.limbs[1].position.y=.7;u.limbs[3].position.y=.7;
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,.9,16,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,.9,16,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,-.3,16,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,.3,16,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,-.7,16,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,.5,16,dt);
      }
    }
    else if(u.phase==='strike'||u.phase==='impact'){ // 3. strike (arm snaps out) and 4. impact (hit / launch frame, held)
      const tier=(u.phase==='strike'?u.chargeStyle:u.attackStyle)||'basic';
      const t=u.phase==='strike'?0:1-u.attackTime/ATTACK_TIME[tier];
      const reach=u.phase==='impact'?1:.6;      // the arm is fully extended on the impact frame
      u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,tier==='skill'?.5:tier==='ult'?0:.3,24,dt);
      u.body.position.y=u.phase==='impact'&&tier==='ult'?1.1:1.25;
      if(tier==='basic'){ // jab: lead arm thrusts straight ahead
        u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,-1.55*reach,28,dt);u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,.2,20,dt);
        u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,-.18,20,dt);
      } else if(tier==='skill'){ // sweep: both arms open wide while the torso twists through
        u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,-1.75*reach,24,dt);u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,1.75*reach,24,dt);
        u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,-.6*reach,24,dt);u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,-.12,20,dt);
      } else { // ultimate: both arms raised overhead, then slammed forward on impact
        const slam=u.phase==='impact'?1:0;
        u.limbs[0].rotation.z=THREE.MathUtils.damp(u.limbs[0].rotation.z,-2.7+slam*.9,24,dt);u.limbs[2].rotation.z=THREE.MathUtils.damp(u.limbs[2].rotation.z,2.7-slam*.9,24,dt);
        u.limbs[0].rotation.x=THREE.MathUtils.damp(u.limbs[0].rotation.x,-slam*1.2,24,dt);u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,-slam*1.2,24,dt);
        u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,slam?.32:-.28,20,dt);
      }
      if(u.id==='brawler'&&tier==='basic'){ // 重拳出擊: alternating straight punches, torso twisting into each one
        const D=THREE.MathUtils.damp,first=u.phase==='strike';
        u.body.position.y=1.2;u.body.rotation.y=D(u.body.rotation.y,first?.45:-.45,28,dt);u.body.rotation.x=D(u.body.rotation.x,-.25,22,dt);
        u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,first?-1.75:-.5,34,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,first?.1:.7,28,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,first?-.5:-1.75,34,dt);u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,first?-.7:-.1,28,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,.3,22,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,-.3,22,dt);
      }
      if(u.id==='leopard'&&tier==='basic'){ // 都市縫合: arms sweep wide (windup), then clap together in front (strike)
        const clap=u.phase==='strike',D=THREE.MathUtils.damp;
        u.body.position.y=1.15;u.body.rotation.x=D(u.body.rotation.x,clap?.15:-.1,24,dt);u.body.rotation.y=D(u.body.rotation.y,0,24,dt);
        u.head.rotation.x=D(u.head.rotation.x,0,20,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,clap?-1.5:-.35,30,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,clap?-1.5:-.35,30,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,clap?-.25:-1.4,30,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,clap?.25:1.4,30,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,clap?.3:0,22,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,clap?-.3:0,22,dt);
      }
      if(u.id==='leopard'&&tier==='skill'){ // 工人隊: low double paw rake, left then right, as the pack is sent forward
        const D=THREE.MathUtils.damp,air=u.phase==='strike';
        u.body.position.y=1.1;u.body.rotation.x=D(u.body.rotation.x,.55,24,dt);u.body.rotation.y=D(u.body.rotation.y,air?.5:-.5,22,dt);u.head.rotation.x=D(u.head.rotation.x,-.3,20,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,air?-2.3:-1.0,28,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,air?-1.0:-2.4,28,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,air?-.7:-.15,26,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,air?.15:.7,26,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,.5,22,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,-.3,22,dt);
      }
      if(u.id==='leopard'&&tier==='ult'){ // 大海: rear up on the hind legs and roar, then slam down on all fours
        const D=THREE.MathUtils.damp,up=u.phase==='strike';
        u.body.position.y=up?1.5:.95;u.body.rotation.x=D(u.body.rotation.x,up?-.5:.85,up?20:30,dt);u.body.rotation.y=D(u.body.rotation.y,0,20,dt);
        u.head.position.y=up?2.2:1.65;u.head.rotation.x=D(u.head.rotation.x,up?-.7:-.2,20,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,up?-3:-1.5,26,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,up?-3:-1.5,26,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,up?-.9:-.2,24,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,up?.9:.2,24,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,up?-.2:.6,24,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,up?-.2:.6,24,dt);
      }
      if(u.id==='mech'&&tier==='basic'){ // 揮拳: full-body cross punch, hips and shoulders unwinding into a straight right fist
        const D=THREE.MathUtils.damp;
        u.body.rotation.y=D(u.body.rotation.y,.6,30,dt);u.body.rotation.x=D(u.body.rotation.x,-.22,24,dt);u.body.position.y=1.2;
        u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,-1.62,36,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,.08,30,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,-.5,28,dt);u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,-.7,28,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,.4,24,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,-.45,24,dt);
      }
      if(u.id==='mech'&&tier==='skill'){ // 階梯往上爬: final big step up — rear knee driven high, arms reaching upward
        const D=THREE.MathUtils.damp,top=u.phase==='impact';
        void top;
        u.body.rotation.x=D(u.body.rotation.x,-.2,22,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,-1.15,26,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,.35,26,dt);
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,-2.3,26,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,-2.3,26,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,-.3,24,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,.3,24,dt);
      }
      if(u.id==='mech'&&tier==='ult'){ // 由下往上拋: legs drive up, both arms scoop from low to high and release overhead
        const D=THREE.MathUtils.damp,rel=u.phase==='impact';
        u.body.position.y=rel?1.4:1.15;u.head.position.y=rel?2.3:2.0;u.body.rotation.x=D(u.body.rotation.x,rel?-.38:-.1,24,dt);
        u.limbs[0].position.y=rel?1.85:1.6;u.limbs[2].position.y=rel?1.85:1.6;
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,rel?-3.0:-1.8,26,dt);u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,rel?-3.0:-1.8,26,dt);
        u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,rel?-.25:-.1,24,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,rel?.25:.1,24,dt);
        u.limbs[1].rotation.x=D(u.limbs[1].rotation.x,0,22,dt);u.limbs[3].rotation.x=D(u.limbs[3].rotation.x,0,22,dt);
      }
      // Signature strike poses per character: [leftArmX,leftArmZ,rightArmX,rightArmZ,bodyLean]. x<0 raises the arm forward/up; z<0 (left) and z>0 (right) swing outward.
      const sig=SIGNATURE[u.id]?.[tier];
      if(sig){const P=sig[u.phase==='strike'?0:1],D=THREE.MathUtils.damp;
        u.limbs[0].rotation.x=D(u.limbs[0].rotation.x,P[0],26,dt);u.limbs[0].rotation.z=D(u.limbs[0].rotation.z,P[1],26,dt);
        u.limbs[2].rotation.x=D(u.limbs[2].rotation.x,P[2],26,dt);u.limbs[2].rotation.z=D(u.limbs[2].rotation.z,P[3],26,dt);
        u.body.rotation.x=D(u.body.rotation.x,P[4],22,dt);}
      // per-character flavour on top of the tier pose (kept from V3.8)
      if(u.id==='nun')u.body.rotation.z=Math.sin(t*Math.PI)*.35;
      if(u.id==='brawler'||u.id==='admiral')u.body.position.y-=.06;
    }
    else if(u.phase==='recovery'){ // 5. recovery: weight settles, arms drop back (limbs relax via the idle damping above)
      const tier=u.attackStyle||'basic',t=Math.min(1,(ATTACK_TIME[tier]-PHASES.impact[tier]-Math.max(0,u.attackTime-0))/(ATTACK_TIME[tier]-PHASES.impact[tier]));
      u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,-.08*(1-t),10,dt);u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,0,9,dt);u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,0,9,dt);
      u.limbs[2].rotation.x=THREE.MathUtils.damp(u.limbs[2].rotation.x,0,9,dt);u.limbs[0].rotation.x=THREE.MathUtils.damp(u.limbs[0].rotation.x,0,9,dt);
    }else{u.body.rotation.x=THREE.MathUtils.damp(u.body.rotation.x,0,12,dt);u.body.rotation.z=THREE.MathUtils.damp(u.body.rotation.z,0,12,dt);u.head.rotation.y=THREE.MathUtils.damp(u.head.rotation.y,0,12,dt);u.head.rotation.x=THREE.MathUtils.damp(u.head.rotation.x,0,12,dt);u.body.rotation.y=THREE.MathUtils.damp(u.body.rotation.y,0,12,dt);}
    if(u.id==='mech'){ // 階梯往上爬: the whole fighter really walks up the 7-step staircase during the charge, holds at the top for the strike, then drops back down
      const ud=f.userData,STEPS=7,RISE=.28,DEPTH=.3;
      const climbing=u.phase==='charge'&&u.chargeStyle==='skill',top=(u.phase==='strike'||u.phase==='impact')&&(u.phase==='strike'?u.chargeStyle:u.attackStyle)==='skill';
      if(climbing)ud.climb=Math.min(1,u.chargeTime/chargeDurations.skill)*STEPS;else if(top)ud.climb=STEPS;else ud.climb=THREE.MathUtils.damp(ud.climb||0,0,10,dt);
      const c=ud.climb||0;
      if(c>.001){
        const t=Math.max(0,(c-.75)*STEPS/(STEPS-.75)),fl=Math.floor(t),fr=t-fl,e=fr*fr*(3-2*fr);
        const fwd=c*DEPTH+Math.min(1,c)*.6,h=Math.min(STEPS,fl+e)*RISE;
        f.position.x+=Math.sin(f.rotation.y)*fwd;f.position.z+=Math.cos(f.rotation.y)*fwd;f.position.y+=h;
      }
    }
    blendPose(u,dt,f.userData.poseBlend||(f.userData.poseBlend={}));
    updateRealModel(f,u,dt);
    updateGlow(u,world.time,dt);}
}
