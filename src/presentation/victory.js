import * as THREE from 'three';
import {scene,camera,addCameraShake,camRig,camState} from '../scene.js';
import {fighterOf} from '../ecs/entities.js';
import {burst} from '../vfx/VFXSystem.js';
import {closeShoulders,resetShoulders} from '../character/shoulders.js';
import {BONES,TIMELINE,VICTORY,poseAt,beatTime,victoryDuration} from './victoryPoses.js';

// Match victory (presentation only). Starts on the host-decided 'matchEnd' (so only a real match winner celebrates, exactly once),
// turns the winner to the camera, pushes the camera in, plays a character-specific bone animation with props / particles,
// then holds the last pose. Everything created here is tracked and disposed on cleanup (next match, back to select).
const sm=x=>x*x*(3-2*x);
const mkMat=(color,op=1)=>new THREE.MeshBasicMaterial({color,transparent:op<1,opacity:op,depthWrite:op>=1});
const mesh=(geo,color,op)=>new THREE.Mesh(geo,mkMat(color,op));
const heartShape=()=>{const s=new THREE.Shape();s.moveTo(0,-.5);s.bezierCurveTo(-.9,.1,-.5,.8,0,.35);s.bezierCurveTo(.5,.8,.9,.1,0,-.5);return new THREE.ShapeGeometry(s);};
const disposeTree=o=>{o.parent?.remove(o);o.traverse(c=>{c.geometry?.dispose();c.material?.map?.dispose();c.material?.dispose?.();});};

export function initVictory(world){
  let st=null;   // {side,id,t,f,props:[],ended,tick,phase,r0,fired:Set}
  const on=(n,f)=>world.events.on(n,f);
  const wpos=()=>{const t=world.get(st.fid,'transform');return new THREE.Vector3(t.x,t.y,t.z);};
  const track=(o,parent=scene)=>{parent.add(o);st.props.push(o);return o;};

  function nodes(f){   // GLB bones (cached) or the procedural placeholder rig
    const u=f.userData;
    if(u.model&&!u.bones){u.bones={};u.model.traverse(o=>{if(o.isBone)u.bones[o.name]=o;});}
    return u.bones&&u.bones.Hips?u.bones:null;
  }
  function applyPose(f,p){
    const b=nodes(f),e=new THREE.Euler();
    if(b){
      for(const n of BONES){if(n==='Hips'||!b[n])continue;e.set(...p[n]);b[n].quaternion.setFromEuler(e);}
      b.Hips.position.set(0,1+p.hy*.8,0);
      closeShoulders(b,st.id);   // keep sleeves joined to the torso when the arms swing out
    }else{   // placeholder rig: arms / body / head only
      const u=f.userData,L=u.limbs;
      L[0].rotation.set(p.UpperArmL[0],0,p.UpperArmL[2]);L[2].rotation.set(p.UpperArmR[0],0,p.UpperArmR[2]);
      u.body.rotation.set(p.Spine[0],p.Spine[1],p.Spine[2]);u.head.rotation.set(p.Head[0],p.Head[1],p.Head[2]);
      L[1].rotation.set(p.UpLegL[0],0,p.UpLegL[2]);L[3].rotation.set(p.UpLegR[0],0,p.UpLegR[2]);
    }
  }
  // Hand anchor: a prop parented here follows the swing. Its +Y runs along the arm, away from the shoulder.
  function hand(f,side){
    const b=nodes(f),n=b?.[side==='R'?'LowerArmR':'LowerArmL'];
    if(n){const g=new THREE.Group();g.position.set(0,-.42,0);g.rotation.x=Math.PI;g.scale.setScalar(1/(f.userData.model.scale.x||1));n.add(g);st.props.push(g);return g;}
    const l=f.userData.limbs[side==='R'?2:0],g=new THREE.Group();g.position.set(0,-.72,.05);g.rotation.x=Math.PI;l.add(g);st.props.push(g);return g;
  }
  const ring=(r,color,y,op=.8)=>{const m=mesh(new THREE.TorusGeometry(r,.04,8,48),color,op);m.rotation.x=Math.PI/2;m.position.copy(wpos()).y+=y;return track(m);};
  const spark=(color,n=1,spread=.9,y=1.6)=>{const c=wpos();c.y+=y;burst(c,color,n);void spread;};

  // ---- per-character props / effects: build(f) returns tick(pt,dt) ----
  const FX={
    mech(f){ // tech badge on the right hand, spinning digital halo rings
      const g=hand(f,'R'),badge=mesh(new THREE.CylinderGeometry(.2,.2,.05,6),0x58e6ff);badge.position.y=.2;badge.rotation.x=Math.PI/2;g.add(badge);g.visible=false;
      const r1=ring(1.1,0x58e6ff,2.9),r2=ring(.8,0xffd36c,3.1);r1.visible=r2.visible=false;
      return (pt,dt)=>{g.visible=pt>beatTime('mech','badge')-.4;badge.rotation.z+=dt*5;const on=pt>beatTime('mech','halo');r1.visible=r2.visible=on;
        const c=wpos();r1.position.set(c.x,c.y+2.9+Math.sin(pt*3)*.05,c.z);r2.position.set(c.x,c.y+3.15,c.z);r1.rotation.z+=dt*2;r2.rotation.z-=dt*3;r1.rotation.x=Math.PI/2+Math.sin(pt*2)*.25;
        if(on&&Math.random()<.5)spark(Math.random()<.5?0x58e6ff:0xffffff,2,1,2+Math.random()*1.4);};
    },
    leopard(f){ // roots creep out of the ground, leaves orbit, green aura
      const roots=[];for(let i=0;i<8;i++){const m=mesh(new THREE.ConeGeometry(.09,1.6,5),0x3f8f4a);m.rotation.set(0,0,0);track(m);roots.push(m);}
      const leaves=[];for(let i=0;i<7;i++){const m=mesh(new THREE.OctahedronGeometry(.16),0x9bdb78,.9);m.scale.set(1,.3,.6);track(m);leaves.push(m);}
      const r=ring(1.3,0x9bdb78,.08,.6);
      return (pt,dt)=>{const c=wpos(),k=Math.min(1,Math.max(0,(pt-beatTime('leopard','roots'))/1.6));
        roots.forEach((m,i)=>{const a=i/8*Math.PI*2,d=.5+k*1.7;m.visible=k>0;m.position.set(c.x+Math.cos(a)*d,.1,c.z+Math.sin(a)*d);m.rotation.set(0,-a,Math.PI/2+.25);m.scale.set(1,Math.max(.01,k),1);});   // cones lying on the floor, reaching outward
        const lk=Math.min(1,Math.max(0,(pt-beatTime('leopard','bloom')+.8)/.8));
        leaves.forEach((m,i)=>{const a=pt*1.4+i/7*Math.PI*2;m.visible=lk>0;m.position.set(c.x+Math.cos(a)*1.3,c.y+.8+((pt*.5+i*.3)%2)*1.1,c.z+Math.sin(a)*1.3);m.rotation.y+=dt*4;m.scale.set(lk,.3*lk,.6*lk);});
        r.position.set(c.x,.08,c.z);r.scale.setScalar(.6+k*.9);if(lk>0&&Math.random()<.35)spark(0x9bdb78,2,1,.4+Math.random()*2);};
    },
    admiral(f){ // mahjong tile drawn from the sleeve, flung up, then three tiles orbit
      const mk=()=>{const g=new THREE.Group();g.add(mesh(new THREE.BoxGeometry(.3,.42,.14),0xf4f0dc));const b=mesh(new THREE.BoxGeometry(.3,.42,.04),0x2f8f5a);b.position.z=-.09;g.add(b);const face=mesh(new THREE.BoxGeometry(.14,.2,.02),0xd63a3a);face.position.z=.08;g.add(face);return g;};
      const h=hand(f,'R'),tile=mk();tile.position.y=.3;h.add(tile);h.visible=false;
      const fl=[mk(),mk(),mk()];fl.forEach(t=>{t.visible=false;track(t);});let thrown=false;
      return (pt,dt)=>{h.visible=pt>beatTime('admiral','draw')-.3&&pt<beatTime('admiral','throw')+.05;tile.rotation.y+=dt*3;
        const T=beatTime('admiral','throw');
        if(pt>=T&&!thrown){thrown=true;spark(0xffd36c,18,1,2.4);addCameraShake(.15,.2);}
        const c=wpos();fl.forEach((t,i)=>{const k=Math.min(1,Math.max(0,(pt-T-i*.12)/.7));t.visible=k>0;const a=pt*2+i*2.1;
          t.position.set(c.x+Math.cos(a)*(.4+k*.7),c.y+1.4+k*1.6+Math.sin(pt*3+i)*.08,c.z+Math.sin(a)*(.4+k*.7));t.rotation.y=a+Math.PI/2;});};
    },
    mage(f){ // book in the left hand, pages flapping, letters floating up
      const h=hand(f,'L'),book=new THREE.Group();book.add(mesh(new THREE.BoxGeometry(.5,.07,.38),0x3a5fa8));const pg=mesh(new THREE.BoxGeometry(.46,.06,.34),0xfaf6e6);pg.position.y=.04;book.add(pg);book.position.y=.28;book.rotation.set(Math.PI/2,0,0);h.add(book);h.visible=false;
      const pages=[];for(let i=0;i<4;i++){const p=mesh(new THREE.PlaneGeometry(.3,.4),0xffffff,.95);p.material.side=THREE.DoubleSide;track(p);pages.push(p);}
      const letters=[];
      for(const ch of ['A','B','C','π','Σ','E']){const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');c.fillStyle='#ffe38a';c.font='bold 48px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(ch,32,34);
        const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true}));s.scale.setScalar(.5);s.visible=false;track(s);letters.push(s);}
      return (pt,dt)=>{h.visible=pt>beatTime('mage','book')-.2;const c=wpos(),fl=pt>beatTime('mage','flip')&&pt<beatTime('mage','rise')+1.2;
        pages.forEach((p,i)=>{p.visible=fl;const a=pt*9+i*1.6;p.position.set(c.x-.35+Math.sin(a)*.25,c.y+1.5+Math.abs(Math.sin(a*.7))*.5+i*.12,c.z+.5+Math.cos(a)*.15);p.rotation.set(a,a*.5,0);});
        const lk=pt>beatTime('mage','rise');letters.forEach((s,i)=>{s.visible=lk;s.position.set(c.x+Math.cos(i*1.05+pt)*1.1,c.y+1.2+((pt*.45+i*.37)%1.6)*1.6,c.z+Math.sin(i*1.05+pt)*.9);s.material.opacity=1-((pt*.45+i*.37)%1.6)/1.6;});
        if(lk&&Math.random()<.4)spark(0xffe38a,2,1,2.6+Math.random());};
    },
    cleric(f){ // staff, golden halo, soft light cone
      const h=hand(f,'R'),staff=new THREE.Group();staff.add(mesh(new THREE.CylinderGeometry(.03,.03,1.5,6),0xcdb26a));const top=mesh(new THREE.TorusGeometry(.14,.03,6,16),0xffe9a8);top.position.y=.8;staff.add(top);staff.position.y=.2;h.add(staff);h.visible=false;
      const halo=ring(.45,0xfff1a8,2.9,.9),cone=mesh(new THREE.ConeGeometry(1.6,5,24,1,true),0xfff1b8,.18);cone.material.side=THREE.DoubleSide;track(cone);
      return (pt,dt)=>{h.visible=pt>beatTime('cleric','staff')-.3;const c=wpos(),k=Math.min(1,Math.max(0,(pt-beatTime('cleric','bless')+.8)/.8));
        halo.position.set(c.x,c.y+2.95+Math.sin(pt*2)*.04,c.z);halo.rotation.z+=dt;halo.scale.setScalar(.2+k);cone.position.set(c.x,c.y+2.5,c.z);cone.rotation.x=Math.PI;cone.scale.set(k||.01,1,k||.01);
        if(k>0&&Math.random()<.5)spark(0xfff1a8,2,1,.5+Math.random()*2.5);};
    },
    brawler(f){ // gold medal on the chest, shockwave when he lands
      const b=nodes(f),medal=mesh(new THREE.CylinderGeometry(.14,.14,.03,16),0xffd34d);medal.rotation.x=Math.PI/2;
      if(b?.Chest){medal.position.set(0,.05,.34);medal.scale.setScalar(1/(f.userData.model.scale.x||1));b.Chest.add(medal);st.props.push(medal);}
      let landed=false;
      return (pt)=>{const T=beatTime('brawler','land');if(pt>=T&&!landed){landed=true;addCameraShake(.35,.3);spark(0xffffff,26,1,.2);spark(0xffd34d,26,1,.3);
        const r=ring(.6,0xffd34d,.06,.9);r.userData.born=pt;}
        for(const o of st.props)if(o.userData?.born!==undefined){const k=pt-o.userData.born;o.scale.setScalar(1+k*5);o.material.opacity=Math.max(0,.9-k*1.2);}
        if(pt>beatTime('brawler','flex')&&Math.random()<.25)spark(0xdff6ff,1,1,1.2+Math.random()*1.2);};
    },
    nun(f){ // hammer, ground cracks + dust on the smash
      const h=hand(f,'R'),ham=new THREE.Group();ham.add(mesh(new THREE.CylinderGeometry(.04,.04,1.1,6),0x8b6b3a));const hd=mesh(new THREE.BoxGeometry(.5,.28,.28),0x9aa3b3);hd.position.y=.6;ham.add(hd);ham.position.y=.25;h.add(ham);h.visible=false;
      let hit=false;
      return (pt)=>{h.visible=pt>.1;const T=beatTime('nun','smash');
        if(pt>=T&&!hit){hit=true;addCameraShake(.5,.4);const c=wpos(),fw=new THREE.Vector3(Math.sin(world.get(st.fid,'transform').rotY),0,Math.cos(world.get(st.fid,'transform').rotY));
          const o=c.clone().addScaledVector(fw,.9);spark(0xc9a773,40,1,.15);spark(0xe8dcc0,24,1,.2);
          for(let i=0;i<9;i++){const a=i/9*Math.PI*2+Math.random()*.3,len=1+Math.random()*1.6,m=mesh(new THREE.BoxGeometry(.07,.02,len),0x1b1b24,.95);m.position.set(o.x+Math.sin(a)*len/2,.02,o.z+Math.cos(a)*len/2);m.rotation.y=a;track(m);}}
        if(hit&&pt<T+1&&Math.random()<.3)spark(0xc9a773,2,1,.2);};
    },
    yu(f){ // command flag + completion light
      const h=hand(f,'R'),flag=new THREE.Group();flag.add(mesh(new THREE.CylinderGeometry(.025,.025,1.5,6),0x8b8b95));const cloth=mesh(new THREE.PlaneGeometry(.7,.45),0xff9a3c);cloth.material.side=THREE.DoubleSide;cloth.position.set(.38,.55,0);flag.add(cloth);flag.position.y=.3;h.add(flag);h.visible=false;
      const beam=mesh(new THREE.CylinderGeometry(.5,.8,6,20,1,true),0xffe27a,.0);beam.material.side=THREE.DoubleSide;track(beam);let done=false;
      return (pt,dt)=>{h.visible=pt>beatTime('yu','flag')-.25;cloth.rotation.y=Math.sin(pt*9)*.5;cloth.scale.x=1+Math.sin(pt*9+1)*.1;
        const T=beatTime('yu','done');if(pt>=T&&!done){done=true;addCameraShake(.2,.25);spark(0xffe27a,40,1,2.2);spark(0xffffff,20,1,2.6);}
        const c=wpos();beam.position.set(c.x,c.y+3,c.z);beam.material.opacity=done?Math.max(.1,.45-(pt-T)*.12):0;if(done&&Math.random()<.4)spark(0xffd36c,2,1,.3+Math.random()*3);};
    },
    bubble(f){ // hearts rise in a stream
      const geo=heartShape(),hearts=[];for(let i=0;i<12;i++){const m=mesh(geo,i%2?0xff7aa8:0xffb3cf,.95);m.material.side=THREE.DoubleSide;m.scale.setScalar(.3);m.visible=false;track(m);hearts.push(m);}
      return (pt)=>{const c=wpos(),on=pt>beatTime('bubble','heart');hearts.forEach((m,i)=>{const k=((pt*.55+i/12)%1);m.visible=on;m.position.set(c.x+Math.sin(i*2.1+pt)*.9,c.y+1.5+k*2.4,c.z+.4+Math.cos(i*1.7)*.4);m.scale.setScalar(.15+.25*Math.sin(k*Math.PI));m.rotation.y=pt*2+i;m.lookAt(camera.position);});
        if(on&&Math.random()<.3)spark(0xffb3cf,2,1,1+Math.random()*2);};
    },
  };

  function start(e){
    cleanup();
    const side=e.winner,fid=fighterOf(world,side),f=world.get(fid,'view')?.obj,id=world.get(fid,'fighter').charId;
    if(!f)return;
    st={side,fid,f,id,t:0,props:[],ended:false,phase:'announce',r0:camRig.radius,turn:0};
    st.tick=(FX[id]||FX.mech)(f);
    world.events.emit('victoryStart',{winner:side,charId:id});
  }
  function cleanup(){
    if(!st)return;
    for(const o of st.props)disposeTree(o);
    const b=st.f.userData.bones;if(b&&b.Hips){b.Hips.position.set(0,1,0);resetShoulders(b);}   // the mixer takes the skeleton back
    st=null;camRig.ko=null;
  }
  on('matchEnd',start);
  on('roundStart',cleanup);

  return {
    active:()=>!!st,
    /** Call once per rendered frame, AFTER updateAnimations (it overrides the bones) and BEFORE the camera update. */
    update(dt){
      const m=world.match;
      if(st&&m.phase!=='MATCH_VICTORY'){cleanup();return;}   // rematch / back to select
      if(!st)return;
      st.t+=dt;const A=TIMELINE.announce,B=TIMELINE.transition,pt=Math.max(0,st.t-A-B*.5);   // the pose starts blending in while the camera is still turning
      const phase=st.t<A?'announce':st.t<A+B?'transition':st.t<victoryDuration(st.id)?'celebrate':'hold';
      if(phase!==st.phase){st.phase=phase;world.events.emit('victoryPhase',{phase,winner:st.side});}
      if(phase==='hold'&&!st.ended){st.ended=true;world.events.emit('victoryEnd',{winner:st.side,charId:st.id});}
      const f=st.f,t=world.get(st.fid,'transform'),p=poseAt(st.id,pt);
      applyPose(f,p);
      // turn to the camera, hop offsets
      const camYaw=camState.yaw+camRig.yawOff;let d=camYaw-t.rotY;d=Math.atan2(Math.sin(d),Math.cos(d));
      st.turn=sm(Math.min(1,Math.max(0,(st.t-A)/B)));f.rotation.y=t.rotY+d*st.turn;f.position.y=t.y+p.jump;
      // camera: ease toward the winner, push in, slightly low angle
      const k=sm(Math.min(1,Math.max(0,(st.t-A*.5)/(A+B)))),R=7.4;
      camRig.ko={x:t.x,y:t.y+1.35,z:t.z,radius:st.r0+(R-st.r0)*k,yaw:.18*k*(st.side==='player'?1:-1),pitch:-.32*k};
      st.tick(pt,dt);
    },
  };
}
