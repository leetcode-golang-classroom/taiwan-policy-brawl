import * as THREE from 'three';
import {$} from '../utils/dom.js';
import {scene,addCameraShake} from '../scene.js';
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
const FIRE=[0xff4a1c,0xff8a1f,0xffc93c];
function fireBurst(c,n=3){for(let i=0;i<n;i++)burst(c,FIRE[i%3],24);}
const TIER_COLOR={ult:0xffd36c,skill:0x72e4d2,basic:0xffb35c};

function disposeOrb(o){scene.remove(o);o.traverse(c=>{c.geometry?.dispose();c.material?.dispose();});}
export function initVfxEvents(world){
  const bound=new Map();   // projectile entity id -> {meshes, orb}
  const rings=new Map();   // fighter id -> charge ring mesh
  const obj=id=>world.get(id,'view')?.obj;
  const side=id=>world.get(id,'fighter').side;
  const charId=id=>world.get(id,'fighter').charId;
  const pos=id=>{const t=world.get(id,'transform');return new THREE.Vector3(t.x,t.y,t.z);};
  const up=(v,y)=>v.clone().add(new THREE.Vector3(0,y,0));
  const on=(n,f)=>world.events.on(n,f);

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
      if(!sink.length){ // projectile without authored visuals: a glowing orb that follows the logical projectile
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
  on('projectileEnd',e=>{
    const entry=bound.get(e.id);if(!entry)return;
    if(e.hit)freezeFx(entry.meshes);
    if(entry.orb){disposeOrb(entry.orb);entry.orb=null;}
    bound.delete(e.id);
  });
  on('hit',e=>{
    syncView(world,e.targetId);
    const T=obj(e.targetId);if(!T)return;
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
    if(e.skill.id==='leopard'&&e.skill.tier==='basic'&&e.amount>0){   // 豹之撲擊: three claw slashes across the target
      const c=up(T.position,1.2);
      for(let i=-1;i<=1;i++){const claw=new THREE.Mesh(new THREE.BoxGeometry(.07,1.25,.05),new THREE.MeshBasicMaterial({color:0xfff0b8,transparent:true,opacity:.95,depthWrite:false}));claw.position.copy(c).add(new THREE.Vector3(i*.22,0,0));claw.rotation.z=.6;addFx(claw,.35,'grow');}
      burst(c,0xe0b35a,16);
      // a grove bursts out of the ground where the pounce landed
      const ground=T.position.clone(),fx=(geo,color,pos,vel)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.98,depthWrite:false}));m.position.copy(pos);throwProjectile(m,vel,.95,0,-3.5);return m;};
      for(let i=0;i<9;i++){
        const a=i*Math.PI*2/9,r=.65+(i%3)*.34,vy=5.8+(i%3)*.35,base=ground.clone().add(new THREE.Vector3(Math.cos(a)*r,.12,Math.sin(a)*r));
        const trunk=fx(new THREE.CylinderGeometry(.12,.2,1.7,8),0x765039,base.clone().add(new THREE.Vector3(0,.72,0)),new THREE.Vector3(0,vy,0));trunk.rotation.z=i%2?-.08:.08;
        fx(new THREE.ConeGeometry(.62,1.15,8),0x4d9d55,base.clone().add(new THREE.Vector3(0,1.55,0)),new THREE.Vector3(0,vy,0));
      }
      const shock=new THREE.Mesh(new THREE.TorusGeometry(1.65,.12,9,40),new THREE.MeshBasicMaterial({color:0x8eea91,transparent:true,opacity:.9,depthWrite:false}));shock.position.copy(ground).y+=.12;shock.rotation.x=Math.PI/2;addFx(shock,.85,'ring');
      burst(ground.clone().add(new THREE.Vector3(0,.4,0)),0x78d77d,36);
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
  });
  on('comboHit',e=>{
    syncView(world,e.targetId);const T=obj(e.targetId);if(!T)return;
    if(e.step===2)burst(up(T.position,1.4),0xffd36c,20);
    if(e.step===3)burst(up(T.position,1.5),0xff8a52,30);
    $('#combo-status').textContent='命中連段 '+e.step+'/3';
  });
  on('dodge',e=>{
    syncView(world,e.id);const F=obj(e.id);if(!F)return;
    const from=new THREE.Vector3(e.from.x,0,e.from.z);
    const trail=new THREE.Mesh(new THREE.BoxGeometry(1.9,.08,.22),new THREE.MeshBasicMaterial({color:0x8feaff,transparent:true,opacity:.9,depthWrite:false}));
    trail.position.copy(from).lerp(F.position,.5).add(new THREE.Vector3(0,.22,0));trail.rotation.y=Math.atan2(e.dir.x,e.dir.z);addFx(trail,.48,'fade');
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.075,8,36),new THREE.MeshBasicMaterial({color:0x9deaff,transparent:true,opacity:.95,depthWrite:false}));
    ring.position.copy(F.position).add(new THREE.Vector3(0,.12,0));ring.rotation.x=Math.PI/2;addFx(ring,.58,'ring');
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
  on('chargeStart',e=>{
    syncView(world,e.id);const F=obj(e.id);if(!F)return;
    const color=TIER_COLOR[e.tier];
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.065,8,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));
    ring.rotation.x=Math.PI/2;scene.add(ring);rings.set(e.id,ring);
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
  return function update(){
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
    for(const [id,entry] of bound){
      if(!entry.orb)continue;const p=world.get(id,'projectile');if(!p)continue;
      const o=entry.orb;o.position.set(p.pos.x,p.pos.y,p.pos.z);
      if(o.userData.update){o.visible=!(p.wait>0);if(o.userData.heading)o.rotation.y=Math.atan2(p.dir.x,p.dir.z);o.userData.update(world.time);}
    }
  };
}
