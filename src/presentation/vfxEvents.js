import * as THREE from 'three';
import {$} from '../utils/dom.js';
import {scene,addCameraShake,camRig} from '../scene.js';
import {cameraEvent} from './cameraDirector.js';
import {burst,addFx,hitBurst,freezeFx,throwProjectile} from '../vfx/VFXSystem.js';
import {slashEffect} from '../skills/slashEffect.js';
import {showCombatFeedback,showMoveName} from '../ui/hud.js';
import {syncView} from './renderSync.js';
import {createSkillContext} from '../skills/context.js';
import {taiChiDisc} from '../skills/yu.js';
import {buildDie,buildZhongTile} from '../skills/admiral.js';

// Presentation layer: subscribes to logic events and turns them into effects.
// Nothing here changes gameplay state; it only reads components and creates Three.js/DOM output.
const DODGE_COLORS={mech:0x8beaff,leopard:0x8eea9a,admiral:0xffd36c,mage:0xffc4a5,cleric:0xfff1c7,brawler:0xffbd69,nun:0xffa34a,yu:0x9dc7ef,'bubble':0xe8b6dc};
const LAUNCHER_COLOR={cleric:0xfff1c7,mech:0x8beaff,leopard:0x8eea9a,nun:0xffa34a,yu:0x9dc7ef,brawler:0xffbd69,bubble:0xe8b6dc,admiral:0xffd36c,mage:0xffc4a5};   // J3 launcher light pillar per character
const FIRE=[0xff4a1c,0xff8a1f,0xffc93c];
function fireBurst(c,n=3){for(let i=0;i<n;i++)burst(c,FIRE[i%3],24);}
const TIER_COLOR={ult:0xffd36c,skill:0x72e4d2,basic:0xffb35c};

// 神選之人: the caster glows, sits in meditation, spins and floats; a colossal gilded Buddha appears behind and a solid Buddha palm is thrown.
const goldMat=(c,o,w=false)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,wireframe:w});
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
// Gilded, lit material (the arena has real lights); `mats` collects them so the caller can fade the whole statue.
const gild=(c,o,mats,em=0x6a4410)=>{const m=new THREE.MeshPhongMaterial({color:c,emissive:em,shininess:70,specular:0xfff2c0,transparent:true,opacity:o});m.userData={o};mats?.push(m);return m;};
const part=(parent,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const k=new THREE.Mesh(geo,mat);k.position.set(x,y,z);k.scale.set(sx,sy,sz);k.rotation.set(rx,ry,rz);parent.add(k);return k;};
// A finger / thumb: chained rounded capsules (smooth round tips), each phalange curling slightly toward the palm side.
function finger(parent,mat,x,y,len,r,rz,curl){
  const root=new THREE.Group();root.position.set(x,y,0);root.rotation.z=rz;parent.add(root);
  let node=root;
  [[.46,1],[.33,.9],[.27,.82]].forEach(([f,rf],i)=>{const L=len*f,rr=r*rf,seg=new THREE.Group();seg.rotation.x=i?curl:curl*.4;node.add(seg);
    part(seg,new THREE.CapsuleGeometry(rr,L,6,14),mat,0,L/2,0);   // capsule caps make the knuckles and the fingertip round
    const next=new THREE.Group();next.position.y=L;seg.add(next);node=next;});
}
// A realistic open human hand, palm facing +z (the push direction), fingers up: wrist, domed palm, four tapered fingers, a thumb.
function buildBuddhaPalm(){
  const g=new THREE.Group(),hand=new THREE.Group(),skin=gild(0xffd57a,.97,null,0x7a5518),pad=gild(0xffe9b0,.97,null,0x8a6a28);hand.position.y=-.2;g.add(hand);
  part(hand,new THREE.CylinderGeometry(.5,.58,.9,20),skin,0,-1.15,0);                         // wrist
  part(hand,new THREE.SphereGeometry(1,24,18),skin,0,0,0,.92,1.0,.42);                         // palm body
  part(hand,new THREE.SphereGeometry(1,20,14),pad,-.45,-.2,.3,.42,.5,.2);part(hand,new THREE.SphereGeometry(1,20,14),pad,.35,-.55,.3,.45,.3,.16);   // thenar / hypothenar pads
  [[-.62,.82,1.15,.2],[-.21,.95,1.4,.2],[.21,.92,1.32,.2],[.6,.8,1.0,.18]].forEach(([x,y,l,r],i)=>finger(hand,skin,x,y,l,r,(i-1.5)*-.07,.14));   // index, middle, ring, little
  finger(hand,skin,-.78,-.3,.9,.23,.95,-.1);                                                    // thumb splayed outward
  const mark=part(hand,new THREE.CircleGeometry(.34,24),goldMat(0xffffff,.9),0,.05,.44);        // glowing lotus mark on the palm
  const rings=[],halo=new THREE.Group();g.add(halo);
  for(const [r,z,o] of [[1.9,-.5,.7],[2.4,-1.0,.5],[2.9,-1.5,.35]]){rings.push(part(halo,new THREE.TorusGeometry(r,.05,8,48),goldMat(0xfff1a8,o),0,.4,z));}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;part(g,new THREE.ConeGeometry(.12,1.6,8),goldMat(0xffc93c,.45),Math.cos(a)*1.2,.4+Math.sin(a)*1.2,-1.8,1,1,1,-Math.PI/2);}   // energy streaks behind the hand
  g.userData.heading=true;g.userData.lift=1.6;g.userData.update=t=>{rings.forEach((r,i)=>r.scale.setScalar(1+Math.sin(t*18-i*1.2)*.06));mark.scale.setScalar(1+Math.sin(t*14)*.15);};
  return g;
}
// A gilded seated Buddha in the style of a Taiwanese temple Shakyamuni: full, rounded 福相 face with closed eyes and a gentle smile, tight snail-shell
// curls, ushnisha with a jewel, long ears, a robe draped over one shoulder, left hand in the lap and right hand resting on the knee, seated
// in full lotus on a tiered lotus throne with a flaming halo. Fully solid 3D; `mats` are faded together by the caller.
function buildTathagata(mats){
  const g=new THREE.Group(),gold=gild(0xffcf4a,.82,mats),light=gild(0xffe48a,.85,mats),deep=gild(0xd99a22,.85,mats),robe=gild(0xd8522a,.8,mats,0x5a1a08),glow=goldMat(0xfff3b8,.22);mats.push(glow);glow.userData={o:.22};
  // tiered lotus throne: round base, stacked petal rings
  part(g,new THREE.CylinderGeometry(3.3,3.6,.6,40),deep,0,.3,0);part(g,new THREE.CylinderGeometry(2.9,3.2,.35,40),gold,0,.78,0);
  for(const [R,y,n,sz,tilt] of [[3.0,1.05,18,.62,.55],[2.55,1.25,14,.55,.4]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2;
    const pt=part(g,new THREE.SphereGeometry(1,12,10),light,Math.cos(a)*R,y,Math.sin(a)*R,.3,.1+sz*.25,sz*.55);pt.rotation.set(0,-a+Math.PI/2,0);pt.rotateX(-tilt);}   // lotus petal, tilted outward
  part(g,new THREE.CylinderGeometry(2.3,2.5,.3,40),gold,0,1.3,0);
  // crossed legs: a broad flattened ellipsoid with two round knees and folded robe hem
  part(g,new THREE.SphereGeometry(1,28,18),gold,0,1.95,.05,2.6,.85,1.5);
  part(g,new THREE.SphereGeometry(1,20,14),gold,-2.0,2.05,.65,.85,.62,.78);part(g,new THREE.SphereGeometry(1,20,14),gold,2.0,2.05,.65,.85,.62,.78);
  part(g,new THREE.TorusGeometry(2.15,.12,8,40,Math.PI),robe,0,2.1,.95,1,.35,1,Math.PI/2,0,0);                    // hem draped over the lap
  // torso: full, rounded, slightly tapering up to broad shoulders
  const prof=[[0,0],[1.5,.0],[1.75,.9],[1.65,1.9],[1.9,2.9],[1.5,3.45],[.8,3.7],[0,3.75]].map(p=>new THREE.Vector2(p[0],p[1]));
  part(g,new THREE.LatheGeometry(prof,36),gold,0,2.35,0,1,1,.78);
  part(g,new THREE.SphereGeometry(1,20,14),gold,-1.9,5.2,0,.62,.55,.55);part(g,new THREE.SphereGeometry(1,20,14),gold,1.9,5.2,0,.62,.55,.55);   // rounded shoulders
  // robe over the left shoulder, crossing the chest diagonally, with the right shoulder bare
  part(g,new THREE.TorusGeometry(1.75,.2,10,40,Math.PI*.95),robe,.1,4.0,.55,1,1.15,.55,0,0,Math.PI*.55);
  part(g,new THREE.CylinderGeometry(.75,.95,.35,24),robe,-1.2,5.2,.0,1,1,.75,0,0,.25);
  for(let i=0;i<3;i++)part(g,new THREE.TorusGeometry(1.5-i*.12,.05,6,30,Math.PI*.8),deep,0,3.0+i*.55,.78,1,.5,.35,0,0,Math.PI*1.1);   // chest folds
  // arms: left hand rests palm-up in the lap (meditation mudra), right hand rests on the right knee
  part(g,new THREE.CapsuleGeometry(.34,1.6,6,12),gold,-2.05,4.1,.15,1,1,1,0,0,.12);part(g,new THREE.CapsuleGeometry(.34,1.6,6,12),gold,2.1,4.05,.2,1,1,1,0,0,-.12);
  part(g,new THREE.CapsuleGeometry(.3,1.1,6,12),gold,-1.55,2.85,.95,1,1,1,1.0,0,-.55);                                  // left forearm into the lap
  part(g,new THREE.SphereGeometry(1,20,14),light,-.5,2.8,1.45,.75,.2,.5);                                                // left palm up in the lap
  part(g,new THREE.CapsuleGeometry(.3,1.0,6,12),gold,2.35,3.0,.7,1,1,1,.7,0,-.2);                                       // right forearm toward the knee
  part(g,new THREE.SphereGeometry(1,20,14),light,2.3,2.65,1.35,.42,.3,.55);                                              // right hand on the knee
  // head: full round face, neck, long ears, features
  part(g,new THREE.CylinderGeometry(.55,.7,.6,16),gold,0,5.55,0);
  part(g,new THREE.SphereGeometry(1,32,24),gold,0,6.5,.05,1.12,1.18,1.05);
  for(const sd of [-1,1]){part(g,new THREE.CapsuleGeometry(.17,.95,6,10),light,sd*1.2,6.2,.05,1,1,.6,0,0,sd*.08);}       // long earlobes
  for(const sd of [-1,1])part(g,new THREE.TorusGeometry(.2,.04,6,14,Math.PI),deep,sd*.42,6.5,1.07,1.1,.5,1,0,0,Math.PI);    // closed, downcast eyes
  part(g,new THREE.SphereGeometry(.07,10,8),light,0,6.95,1.12);                                                           // 白毫 (urna)
  part(g,new THREE.SphereGeometry(1,14,10),gold,0,6.45,1.12,.12,.2,.14);                                                  // nose
  part(g,new THREE.TorusGeometry(.26,.04,6,16,Math.PI),deep,0,6.05,1.07,1,.55,1,0,0,Math.PI);                              // gentle smile
  // snail-shell curls over the crown (Fibonacci spread on the upper hemisphere) + ushnisha with a jewel
  const curl=new THREE.SphereGeometry(.13,8,6);
  for(let i=0;i<120;i++){const y=.12+.88*i/119,r=Math.sqrt(1-y*y),a=i*2.39996;part(g,curl,deep,Math.cos(a)*r*1.12,6.5+y*1.2,.05+Math.sin(a)*r*1.05+.0,1,1,1);}
  part(g,new THREE.SphereGeometry(1,20,14),gold,0,7.85,.05,.55,.45,.55);part(g,new THREE.SphereGeometry(.14,10,8),light,0,8.3,.05);   // ushnisha and jewel
  // flaming halo behind the head + body mandorla glow
  part(g,new THREE.TorusGeometry(2.6,.09,10,60),light,0,6.7,-1.3);part(g,new THREE.TorusGeometry(2.25,.06,8,60),gold,0,6.7,-1.3);
  part(g,new THREE.CircleGeometry(2.55,48),glow,0,6.7,-1.35);part(g,new THREE.CircleGeometry(4.8,48),glow,0,4.2,-1.6);
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2,rr=2.9+(i%2)*.4;part(g,new THREE.ConeGeometry(.16,.9+(i%2)*.4,8),light,Math.cos(a)*rr,6.7+Math.sin(a)*rr,-1.3,1,1,1,0,0,a-Math.PI/2);}   // flame tongues
  return g;
}
function disposeOrb(o){scene.remove(o);o.traverse(c=>{c.geometry?.dispose();c.material?.dispose();});}
export function initVfxEvents(world){
  const bodyFlash=new Map();   // fighter id -> {start,dur,peak}: white-hot body tint right after a hit
  const bound=new Map();   // projectile entity id -> {meshes, orb}
  const rings=new Map();   // fighter id -> charge ring mesh
  const obj=id=>world.get(id,'view')?.obj;
  const side=id=>world.get(id,'fighter').side;
  const charId=id=>world.get(id,'fighter').charId;
  const pos=id=>{const t=world.get(id,'transform');return new THREE.Vector3(t.x,t.y,t.z);};
  const up=(v,y)=>v.clone().add(new THREE.Vector3(0,y,0));
  const on=(n,f)=>world.events.on(n,f);
  for(const n of ['hit','chargeStart','slamLand'])on(n,e=>cameraEvent(camRig,n,e));   // Phase 10: combat camera

  on('koFlash',e=>bodyFlash.set(e.id,{start:world.time,dur:e.dur,peak:e.peak}));   // KO impact freeze: the loser glows white until the defeat animation fades it
  on('attackStart',e=>{
    syncView(world,e.attackerId);syncView(world,e.targetId);
    showMoveName(side(e.attackerId),e.tier,charId(e.attackerId));
    const A=obj(e.attackerId),T=obj(e.targetId);if(!A||!T)return;
    // 乾坤一擲 (die) and 紅中旋風 (tiles): visuals follow the logical projectile(s) every frame.
    if(charId(e.attackerId)==='admiral'&&e.tier!=='ult'&&e.projectileId!=null){
      const ids=e.projectileIds||[e.projectileId];
      ids.forEach((pid,i)=>{
        const g=e.tier==='basic'?buildDie():buildZhongTile(i),p=world.get(pid,'projectile');
        g.position.set(p.pos.x,p.pos.y,p.pos.z);g.visible=false;scene.add(g);bound.set(pid,{meshes:[],orb:g});
      });
      burst(up(A.position,1.1),0xffd36c,14);
    } else {
    const sink=[];
    slashEffect(A,T,e.tier,sink,{noBeam:e.skill.type==='homing'});
    if(e.projectileId!=null){
      const entry={meshes:sink,orb:null};
      if(e.skill.id==='cleric'&&e.tier==='basic'){   // 神選之人 fist follows the logical projectile
        const p=world.get(e.projectileId,'projectile');entry.orb=buildBuddhaPalm();entry.orb.position.set(p.pos.x,p.pos.y,p.pos.z);scene.add(entry.orb);
        burst(up(A.position,1.2),0xfff1a8,26);
      } else if(!sink.length){ // projectile without authored visuals: a glowing orb that follows the logical projectile
        const p=world.get(e.projectileId,'projectile');
        entry.orb=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.25,e.skill.radius*.5),14,12),new THREE.MeshBasicMaterial({color:e.skill.id==='cleric'?0xfff1a8:0xffd36c,transparent:true,opacity:.95}));
        entry.orb.position.set(p.pos.x,p.pos.y,p.pos.z);scene.add(entry.orb);
      }
      bound.set(e.projectileId,entry);
    }
    }
    if(e.tier==='skill'&&charId(e.attackerId)==='leopard'){   // 工人隊: two claw rakes in front of the leopard
      const fw=new THREE.Vector3(Math.sin(A.rotation.y),0,Math.cos(A.rotation.y)),rt=new THREE.Vector3(fw.z,0,-fw.x);
      for(const sd of [-1,1])for(let i=-1;i<=1;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(.06,.9,.04),new THREE.MeshBasicMaterial({color:0xfff0b8,transparent:true,opacity:.9,depthWrite:false}));c.position.copy(A.position).addScaledVector(fw,1.3).addScaledVector(rt,sd*.5+i*.16).add(new THREE.Vector3(0,1.2,0));c.rotation.y=A.rotation.y;c.rotation.z=sd*.7;addFx(c,.35,'grow');}
    }
    if(e.tier==='skill')burst(up(A.position,1),side(e.attackerId)==='player'?0x63b9ff:0x8de8a9,side(e.attackerId)==='player'?30:20);
    if(e.tier==='ult'){addCameraShake(.45,.55);if(side(e.attackerId)==='player')burst(up(T.position,1),0xffdc70,65);}
  });
  on('reflect',e=>{   // 乾坤之動: tai-chi disc flashes at the reflector; a reflected projectile turns into a returning orb
    const R=obj(e.targetId),O=obj(e.attackerId);if(!R||!O)return;
    const ctx=createSkillContext(R,O),dir=O.position.clone().sub(R.position).setY(0).normalize();
    taiChiDisc(ctx.mesh,up(R.position,1.3).addScaledVector(dir,1),Math.atan2(dir.x,dir.z),.5);
    burst(up(R.position,1.3),0xffe9a8,24);addCameraShake(.12,.15);
    if(e.projectileId!=null){
      const entry=bound.get(e.projectileId);if(!entry)return;
      freezeFx(entry.meshes);entry.meshes=[];
      if(entry.orb){disposeOrb(entry.orb);entry.orb=null;}
      const p=world.get(e.projectileId,'projectile');
      entry.orb=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.3,e.skill.radius*.55),14,12),new THREE.MeshBasicMaterial({color:0xf4f4f4,transparent:true,opacity:.95}));
      entry.orb.position.set(p.pos.x,p.pos.y,p.pos.z);scene.add(entry.orb);
    }
  });
  on('guardCounter',e=>{showCombatFeedback(side(e.id),'counter');const A=obj(e.id);if(A)burst(up(A.position,1.2),0x7dff9a,26);});
  on('comboBreak',e=>{   // 空中斷招: a shockwave ring + white burst where the victim tore free
    syncView(world,e.id);const T=obj(e.id);if(!T)return;
    showCombatFeedback(side(e.id),'evade');burst(up(T.position,.9),0xffffff,26);burst(up(T.position,.9),0x8cdcff,18);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.08,8,28),new THREE.MeshBasicMaterial({color:0xcff4ff,transparent:true,opacity:.9,depthWrite:false}));
    ring.position.copy(T.position).add(new THREE.Vector3(0,.9,0));ring.rotation.x=Math.PI/2;addFx(ring,.4,'ring');
  });
  on('comboHit',e=>{   // J3 launcher: a pillar of light in the character's colour under the target (聖光升擊 / 數位升擊)
    const col=LAUNCHER_COLOR[charId(e.attackerId)];if(e.step!==3||col==null)return;const T=obj(e.targetId);if(!T)return;
      const c=up(T.position,.1);burst(c,col,34);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.09,8,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.95,depthWrite:false}));ring.position.copy(c);ring.rotation.x=Math.PI/2;addFx(ring,.45,'ring');
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,4,16,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));beam.position.copy(c).add(new THREE.Vector3(0,2,0));addFx(beam,.4,'fade');
      });
  on('chase',e=>{const A=obj(e.id);if(!A)return;burst(up(A.position,1),0xbfe8ff,22);addCameraShake(.06,.12);});   // chase dash: air-streak burst
  on('slamLand',e=>{   // ground slam impact: shockwave ring, dust, heavy shake
    const T=obj(e.targetId);if(!T)return;
    const c=up(T.position,.15);burst(c,0xd9c9a3,40);burst(c,0xffe08a,20);addCameraShake(.5,.4);
    const r=new THREE.Mesh(new THREE.TorusGeometry(1.1,.1,8,36),new THREE.MeshBasicMaterial({color:0xffe9b0,transparent:true,opacity:.95,depthWrite:false}));r.position.copy(c);r.rotation.x=Math.PI/2;addFx(r,.5,'ring');
  });
  on('projectileEnd',e=>{
    const entry=bound.get(e.id);if(!entry)return;
    if(e.hit)freezeFx(entry.meshes);
    if(entry.orb){disposeOrb(entry.orb);entry.orb=null;}
    bound.delete(e.id);
  });
  on('hit',e=>{
    syncView(world,e.targetId);
    const T=obj(e.targetId);if(!T)return;
    if(e.amount>0)bodyFlash.set(e.targetId,{start:world.time,dur:e.skill.tier==='ult'?.26:e.launched||e.skill.tier==='skill'?.2:.13,peak:e.skill.tier==='ult'?1.6:e.launched||e.skill.tier==='skill'?1.1:.8});
    if(e.perfect){showCombatFeedback(side(e.targetId),'perfect');addCameraShake(.2,.2);burst(up(T.position,1.3),0xffe36b,40);return;}
    if(e.broken){showCombatFeedback(side(e.targetId),'break');addCameraShake(.35,.3);burst(up(T.position,1.3),0xff5a5a,36);}
    if(e.blocked){showCombatFeedback(side(e.targetId),'block');addCameraShake(.06,.12);return;}
    if(e.reduced)showCombatFeedback(side(e.targetId),'block');
    if(e.amount>0){
      addCameraShake(e.skill.tier==='ult'?.5:e.launched?.28:.1,e.skill.tier==='ult'?.5:.18);
      showCombatFeedback(side(e.targetId),'hit');
      burst(up(T.position,1.3),side(e.targetId)==='cpu'?0xffc15c:0x8de8a9,18);
      const flash=$('#hit-flash');flash.classList.remove('active');void flash.offsetWidth;flash.classList.add('active');
      hitBurst(T,e.skill.tier);
    }
    if(e.skill.id==='cleric'&&e.amount>0){   // 神的啟示 / 火箭工程 impact: burning blast
      const c=up(T.position,1.2);fireBurst(c,e.skill.tier==='ult'?5:3);
      if(e.skill.tier==='ult'){
        for(let i=0;i<10;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.2+Math.random()*.15,8,6),new THREE.MeshBasicMaterial({color:FIRE[i%3],transparent:true,opacity:.95,depthWrite:false}));f.position.copy(up(T.position,4+Math.random()*2));throwProjectile(f,new THREE.Vector3((Math.random()-.5)*6,(Math.random()-.2)*4,(Math.random()-.5)*6),.9,0,-2);}
        addCameraShake(.6,.5);
      } else {
        for(let i=0;i<6;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.16,.6,6),new THREE.MeshBasicMaterial({color:FIRE[i%3],transparent:true,opacity:.9,depthWrite:false}));f.position.copy(up(T.position,.4+Math.random()*1.6)).add(new THREE.Vector3((Math.random()-.5)*.8,0,(Math.random()-.5)*.8));throwProjectile(f,new THREE.Vector3((Math.random()-.5)*.6,1.6,(Math.random()-.5)*.6),1.6,0,0);}
      }
    }
    if(e.skill.id==='nun'&&e.skill.tier==='skill'){   // 電光火球 impact: electric blast
      const c=up(T.position,1.2);burst(c,0x9fe8ff,34);burst(c,0xffa63d,22);addCameraShake(.3,.3);
      const r=new THREE.Mesh(new THREE.TorusGeometry(.9,.09,8,32),new THREE.MeshBasicMaterial({color:0x9fe8ff,transparent:true,opacity:.95,depthWrite:false}));r.position.copy(c);r.rotation.x=Math.PI/2;addFx(r,.5,'ring');
      for(let i=0;i<6;i++){const bolt=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,1.6),new THREE.MeshBasicMaterial({color:0xeaffff,transparent:true,opacity:.95,depthWrite:false}));bolt.position.copy(c);bolt.rotation.set(Math.random()*3,Math.random()*6,0);addFx(bolt,.3,'fade');}
    }
    if(e.skill.id==='leopard'&&e.skill.tier==='basic'&&e.amount>0){   // 都市縫合: walls slam shut on the target, dust and a stitched seam
      const c=up(T.position,1.1);burst(c,0xc9a773,30);burst(c,0xe8dcc0,14);addCameraShake(.22,.25);
      const seam=new THREE.Mesh(new THREE.TorusGeometry(.8,.07,8,32),new THREE.MeshBasicMaterial({color:0xf4ecd4,transparent:true,opacity:.9,depthWrite:false}));seam.position.copy(c);seam.rotation.x=Math.PI/2;addFx(seam,.5,'ring');
    }
    if(e.skill.id==='leopard'&&e.skill.tier==='ult'){   // 大海: roar shockwave around the leopard's slam
      const A=obj(e.attackerId);if(A){const g=up(A.position,.15);
        for(const [r,o] of [[1.2,0],[2.2,.12]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.1,8,40),new THREE.MeshBasicMaterial({color:0x8ee6ff,transparent:true,opacity:.9,depthWrite:false}));ring.position.copy(g);ring.position.y+=o;ring.rotation.x=Math.PI/2;addFx(ring,.6,'ring');}
        burst(g,0x8ee6ff,30);}
    }
    if(e.launched)burst(up(T.position,.18),charId(e.attackerId)==='leopard'?0x82dc83:0xffc36b,22);
  });
  on('evade',e=>{
    syncView(world,e.targetId);const T=obj(e.targetId);if(!T)return;
    showCombatFeedback(side(e.targetId),'evade');burst(up(T.position,.8),0x8cdcff,18);
    // afterimage: a few fading ghosts trailing behind the evader (cheap capsules, no model clones)
    const back=new THREE.Vector3(-(world.get(e.targetId,'status').dodgeDir?.x||0),0,-(world.get(e.targetId,'status').dodgeDir?.z||0));
    for(let i=0;i<3;i++){
      const g=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.0,4,10),new THREE.MeshBasicMaterial({color:0x8feaff,transparent:true,opacity:.42-i*.1,depthWrite:false}));
      g.position.copy(T.position).addScaledVector(back,.55*(i+1)).add(new THREE.Vector3(0,1.15,0));addFx(g,.45+i*.08,'fade');
    }
  });
  on('comboHit',e=>{
    syncView(world,e.targetId);const T=obj(e.targetId);if(!T)return;
    if(e.step===2)burst(up(T.position,1.4),0xffd36c,20);
    if(e.step===3)burst(up(T.position,1.5),0xff8a52,30);
    $('#combo-status').textContent='命中連段 '+e.step+'/3';
  });
  on('dodge',e=>{
    syncView(world,e.id);const F=obj(e.id);if(!F)return;
    const from=new THREE.Vector3(e.from.x,0,e.from.z),to=new THREE.Vector3(e.to.x,0,e.to.z);   // the body is still at `from` (it slides)
    const trail=new THREE.Mesh(new THREE.BoxGeometry(1.9,.08,.22),new THREE.MeshBasicMaterial({color:0x8feaff,transparent:true,opacity:.9,depthWrite:false}));
    trail.position.copy(from).lerp(to,.5).add(new THREE.Vector3(0,.22,0));trail.rotation.y=Math.atan2(e.dir.x,e.dir.z);addFx(trail,.48,'fade');
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.075,8,36),new THREE.MeshBasicMaterial({color:0x9deaff,transparent:true,opacity:.95,depthWrite:false}));
    ring.position.copy(from).add(new THREE.Vector3(0,.12,0));ring.rotation.x=Math.PI/2;addFx(ring,.58,'ring');
    burst(up(F.position,.55),DODGE_COLORS[charId(e.id)]||0x8cdcff,charId(e.id)==='nun'?18:11);
  });
  on('jump',e=>{syncView(world,e.id);burst(up(obj(e.id).position,.12),0x9ddcff,9);});
  on('land',e=>{
    syncView(world,e.id);burst(up(obj(e.id).position,.08),0x91a9dc,e.hard?14:5);
    if(e.hard){addCameraShake(.12,.15);const F=obj(e.id),r=new THREE.Mesh(new THREE.TorusGeometry(.6,.05,8,32),new THREE.MeshBasicMaterial({color:0xb7c6ee,transparent:true,opacity:.8,depthWrite:false}));r.position.copy(F.position).add(new THREE.Vector3(0,.06,0));r.rotation.x=Math.PI/2;addFx(r,.4,'ring');}
  });
  on('rush',e=>{   // dust puff at the feet + a low streak behind the fighter
    syncView(world,e.id);const F=obj(e.id);if(!F)return;
    burst(up(F.position,.1),0xc9d3f0,8);
    const streak=new THREE.Mesh(new THREE.BoxGeometry(.12,.06,1.4),new THREE.MeshBasicMaterial({color:0xbfe6ff,transparent:true,opacity:.7,depthWrite:false}));
    streak.position.copy(F.position).add(new THREE.Vector3(-e.dir.x*.7,.2,-e.dir.z*.7));streak.rotation.y=Math.atan2(e.dir.x,e.dir.z);addFx(streak,.3,'fade');
  });
  const shields=[];   // transient presentation: {g,F(parent),t0,dur,shell,core,mats}
  function godShield(F,id){   // body radiates golden light, and a giant Tathagata rises behind the caster
    const g=new THREE.Group(),shell=new THREE.Mesh(new THREE.SphereGeometry(1.25,20,14),goldMat(0xff9d1a,.16)),core=new THREE.Mesh(new THREE.SphereGeometry(.8,16,12),goldMat(0xffc850,.14));shell.material.blending=core.material.blending=THREE.AdditiveBlending;
    g.add(shell,core);g.position.y=1.15;F.add(g);shields.push({g,F,t0:world.time,dur:.9,shell,core});
    const mats=[],bud=buildTathagata(mats),fw=new THREE.Vector3(Math.sin(F.rotation.y),0,Math.cos(F.rotation.y));
    bud.position.copy(F.position).addScaledVector(fw,-1.5);bud.position.y=1.3;bud.rotation.y=F.rotation.y;bud.scale.setScalar(.34);scene.add(bud);
    shields.push({g:bud,F:scene,t0:world.time,dur:1.3,mats});
    burst(up(F.position,1.1),0xfff1a8,22);addCameraShake(.25,.3);
  }
  on('chargeStart',e=>{
    syncView(world,e.id);const F=obj(e.id);if(!F)return;
    const color=TIER_COLOR[e.tier];
    dropRing(e.id);   // a new charge can start before update() has dropped the previous one (chained J, cancels): never orphan the old ring
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.065,8,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));
    ring.rotation.x=Math.PI/2;scene.add(ring);rings.set(e.id,ring);
    if(charId(e.id)==='cleric'&&e.tier==='basic')godShield(F,e.id);
    showMoveName(side(e.id),e.tier,charId(e.id));
    $('#move-callout-type').textContent='蓄力中 · '+(e.tier==='ult'?'必殺技':e.tier==='skill'?'特殊招式':'普通攻擊');
    burst(up(F.position,1),color,e.tier==='ult'?18:10);
    if(charId(e.id)==='mech'&&e.tier==='skill'){   // a staircase rises out of the ground in front of the fighter and is climbed during the charge
      const O=obj(e.id);
      const ctx=createSkillContext(O,O),steps=7;
      for(let i=0;i<steps;i++){
        const h=(i+1)*.28,p=O.position.clone().addScaledVector(ctx.forward,.9+i*.3+.15);p.y=h/2;
        const step=ctx.mesh(new THREE.BoxGeometry(1.5,h,.3),0xd5dbe6,p,1.25,'fade');step.rotation.y=O.rotation.y;
        const nose=ctx.mesh(new THREE.BoxGeometry(1.52,.05,.08),0xf8b61c,p.clone().add(new THREE.Vector3(0,h/2+.01,0)).addScaledVector(ctx.forward,-.1),1.25,'fade');nose.rotation.y=O.rotation.y;
      }
      burst(up(O.position,.1).addScaledVector(ctx.forward,1.8),0xd5dbe6,14);
    }
  });
  on('ultNotReady',e=>{if(side(e.id)==='player')$('#player-status').textContent='必殺技需要 100% 能量';});
  on('roundStart',()=>{for(const id of [...rings.keys()])dropRing(id);for(const id of [...arcs.keys()])dropArc(id);});

  function dropRing(id){const r=rings.get(id);if(!r)return;scene.remove(r);r.geometry.dispose();r.material.dispose();rings.delete(id);}
  // per-frame visuals that follow logic state
  const arcs=new Map();   // 電光火球 charge: electric arc between the hands, ball forms as charge completes
  function arcFor(id){let g=arcs.get(id);if(g)return g;g=new THREE.Group();
    const core=new THREE.Mesh(new THREE.SphereGeometry(.3,14,10),new THREE.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:.9}));g.add(core);g.userData.core=core;
    g.userData.bolts=[];for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.04,.04,1),new THREE.MeshBasicMaterial({color:0xcff6ff}));g.add(b);g.userData.bolts.push(b);}
    scene.add(g);arcs.set(id,g);return g;}
  function dropArc(id){const g=arcs.get(id);if(!g)return;scene.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});arcs.delete(id);}
  // Body hit flash: tint every emissive material of the victim white, fading out; originals are restored exactly.
  const flashMats=new Map();   // material -> {color,intensity}
  function applyFlash(id,k){
    const root=obj(id);if(!root)return;
    root.traverse(m=>{
      if(!m.isMesh||!m.material||!('emissive' in m.material))return;
      if(!m.userData.flashCloned){m.material=m.material.clone();m.userData.flashCloned=true;}
      const mat=m.material;let o=flashMats.get(mat);
      if(!o){o={color:mat.emissive.clone(),intensity:mat.emissiveIntensity};flashMats.set(mat,o);}
      if(k>0){mat.emissive.set(0xffffff);mat.emissiveIntensity=k;}
      else{mat.emissive.copy(o.color);mat.emissiveIntensity=o.intensity;flashMats.delete(mat);}
    });
  }
  return function update(){
    for(const [id,f] of bodyFlash){
      const k=1-(world.time-f.start)/f.dur;
      if(k<=0){applyFlash(id,0);bodyFlash.delete(id);}else applyFlash(id,f.peak*k);
    }
    for(const id of world.query('attacker','fighter')){
      const ch=world.get(id,'attacker').charge;
      if(!(ch&&ch.tier==='skill'&&charId(id)==='nun')){dropArc(id);continue;}
      const g=arcFor(id),t=world.get(id,'transform'),q=Math.min(1,ch.time/ch.duration),fx=Math.sin(t.rotY),fz=Math.cos(t.rotY),rx=Math.cos(t.rotY),rz=-Math.sin(t.rotY);
      g.position.set(t.x+fx*.9,t.y+1.2,t.z+fz*.9);
      const w=.7*(1-q*.7);   // hands close in as the ball forms
      g.userData.core.scale.setScalar(.2+q*1.5);
      g.userData.bolts.forEach((b,i)=>{b.scale.z=w*2;b.position.set(rx*(Math.random()-.5)*.1,(Math.random()-.5)*.35,rz*(Math.random()-.5)*.1);b.rotation.set(0,Math.atan2(rx,rz)+Math.PI/2+(Math.random()-.5)*.5,(Math.random()-.5)*.8);b.visible=Math.random()>.2;});
    }
    for(const [id,ring] of [...rings]){
      const ch=world.get(id,'attacker').charge,t=world.get(id,'transform');
      if(!ch){dropRing(id);continue;}
      const q=Math.min(1,ch.time/ch.duration);
      ring.position.set(t.x,t.y+.12+q*.18,t.z);ring.scale.setScalar(.8+q*1.25);ring.material.opacity=.45+q*.5;
    }
    for(let i=shields.length-1;i>=0;i--){
      const sh=shields[i],q=(world.time-sh.t0)/sh.dur;
      if(q>=1){sh.F.remove(sh.g);sh.g.traverse(c=>{c.geometry?.dispose();c.material?.dispose();});shields.splice(i,1);continue;}
      if(sh.mats){const k=Math.min(1,q*5)*(q>.65?(1-q)/.35:1);for(const m of sh.mats)m.opacity=m.userData.o*k;sh.g.position.y=1.3+q*.2;continue;}
      const pulse=1+Math.sin(world.time*26)*.06;
      sh.shell.scale.setScalar((.9+q*.5)*pulse);sh.shell.material.opacity=.2*(1-q*.7);sh.core.scale.setScalar(pulse*(1+q*.4));sh.core.material.opacity=.16*(1-q*.8);
    }
    for(const [id,entry] of bound){
      if(!entry.orb)continue;const p=world.get(id,'projectile');if(!p)continue;
      const o=entry.orb;o.position.set(p.pos.x,p.pos.y+(o.userData.lift?o.userData.lift*Math.max(0,1-p.travelled/3.5):0),p.pos.z);
      if(o.userData.update){o.visible=!(p.wait>0);if(o.userData.heading)o.rotation.y=Math.atan2(p.dir.x,p.dir.z);o.userData.update(world.time);}
    }
  };
}
