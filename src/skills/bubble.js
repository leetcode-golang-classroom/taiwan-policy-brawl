import * as THREE from 'three';
import {burst,throwProjectile} from '../vfx/VFXSystem.js';
import {scene} from '../scene.js';
import {wordSprite} from './mage.js';

// ---- little crowd figures (own lifecycle: not routed through addFx, so they can walk and swing their arms) ----
const FEMALE=new Set(['nun']);                      // character ids drawn as women; everyone else is treated as a man
const B=(c)=>new THREE.MeshBasicMaterial({color:c});
const box=(w,h,d,c,x,y,z,parent)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),B(c));m.position.set(x,y,z);parent.add(m);return m;};
// kind: 'woman'|'man'|'police'|'fbi'|'young'|'elder'|'homeless'
function human(kind){
  const g=new THREE.Group(),S={woman:[0xe58aa8,0x7a4a6a],man:[0x4a78c2,0x3a3f55],police:[0x1f3b78,0x15254d],fbi:[0x15151b,0x15151b],young:[0xff7a3d,0x3b5f9a],elder:[0x8a6f4d,0x5a5a60],homeless:[0x6b5a44,0x4a4033]}[kind];
  const SKIN=0xf3c9a8;
  box(.52,.62,.3,S[0],0,1.0,0,g);                                              // torso
  const legs=[-1,1].map(x=>{const l=new THREE.Group();l.position.set(x*.12,.7,0);g.add(l);box(.17,.7,.2,S[1],0,-.35,0,l);return l;});
  const arms=[-1,1].map(x=>{const a=new THREE.Group();a.position.set(x*.34,1.27,0);g.add(a);box(.14,.52,.14,S[0],0,-.25,0,a);box(.13,.13,.13,SKIN,0,-.56,0,a);return a;});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),B(SKIN));head.position.y=1.52;g.add(head);
  const cap=(c,r=.215)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8,0,Math.PI*2,0,Math.PI/2),B(c));m.position.y=1.55;g.add(m);return m;};
  if(kind==='woman'){cap(0x3a2418,.225);box(.42,.55,.1,0x3a2418,0,1.35,-.15,g);const sk=new THREE.Mesh(new THREE.ConeGeometry(.45,.6,12),B(S[0]));sk.position.y=.62;g.add(sk);}
  if(kind==='man'){cap(0x2a2a2a);}
  if(kind==='police'){cap(0x1f3b78);box(.4,.04,.22,0x111a33,0,1.56,.17,g);box(.08,.08,.03,0xffd54a,0,1.62,.22,g);box(.54,.07,.32,0x222222,0,.76,0,g);box(.1,.1,.03,0xffd54a,.13,1.2,.16,g);}
  if(kind==='fbi'){cap(0x111111,.21);box(.3,.07,.04,0x000000,0,1.56,.2,g);box(.14,.4,.03,0xf2f2f2,0,1.08,.16,g);box(.3,.16,.03,0xffd54a,.0,1.08,.17,g).scale.set(.6,.6,1);}
  if(kind==='young'){cap(0x22262e);box(.4,.34,.16,0x2f6f8f,0,1.1,-.22,g);}
  if(kind==='elder'){cap(0xf2f2f6,.22);box(.04,.9,.04,0x6b4a2b,.42,.5,.25,g);arms[1].rotation.x=-.4;g.userData.stoop=.18;}
  if(kind==='homeless'){const hat=cap(0x4a4a58,.23);hat.position.y=1.58;box(.34,.14,.1,0x8f8f98,0,1.36,.18,g);box(.4,.5,.1,0x8a8f55,.32,.6,-.12,g);}
  g.scale.setScalar(1.7);
  g.userData.parts={arms,legs,head};
  return g;
}
function place(g,pos,faceTo){g.position.copy(pos);g.lookAt(faceTo.x,pos.y,faceTo.z);scene.add(g);}
function dispose(g){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.map?.dispose?.();o.material.dispose();}});}
const tween=(dur,fn,done)=>{const t0=performance.now();const f=()=>{const t=Math.min(1,(performance.now()-t0)/dur);fn(t);if(t<1)requestAnimationFrame(f);else done?.();};requestAnimationFrame(f);};
const later=(ms,fn)=>setTimeout(fn,ms);
const pop=(txt,pos,color='#ffffff',size=.8)=>{const sp=wordSprite(txt,color,size);sp.position.copy(pos);scene.add(sp);let life=.6;const t0=performance.now();const f=()=>{const t=(performance.now()-t0)/1000/life;if(t>=1){scene.remove(sp);sp.material.dispose();return;}sp.position.y+=.012;sp.material.opacity=1-t;requestAnimationFrame(f);};requestAnimationFrame(f);};

// move a figure toward `aim` (stopping `gap` short), swing, come back; calls `hit` at the moment of contact
function lunge(g,aim,gap,swing,hit){
  const from=g.position.clone(),dir=aim.clone().setY(from.y).sub(from),len=Math.max(0,dir.length()-gap);dir.normalize();
  const {arms,legs}=g.userData.parts;
  tween(220,t=>{g.position.copy(from).addScaledVector(dir,len*t);legs[0].rotation.x=Math.sin(t*9)*.7;legs[1].rotation.x=-Math.sin(t*9)*.7;},()=>{
    swing(arms,legs);hit();
    tween(260,t=>{g.position.copy(from).addScaledVector(dir,len*(1-t));if(t>.5)arms.forEach(a=>{a.rotation.x*=.8;a.rotation.z*=.8;});},()=>{arms.forEach(a=>a.rotation.set(0,0,0));legs.forEach(l=>l.rotation.set(0,0,0));});
  });
}
const punch=(arms)=>{arms[1].rotation.x=-1.55;arms[0].rotation.x=.4;};
const kick=(arms,legs)=>{legs[1].rotation.x=-1.4;arms.forEach(a=>a.rotation.z=a.position.x>0?.8:-.8);};
const slapSwing=(arms)=>{arms[1].rotation.set(-1.45,0,-1.3);};

export function skillBubble({fighter,target,forward,origin,center,right,projectile,mesh},type){
  const tp=target.position.clone(),aim=tp.clone().add(new THREE.Vector3(0,1.4,0));
  const ring=(r=1.2,c=0xffffff)=>mesh(new THREE.TorusGeometry(r,.07,8,28),c,tp.clone().add(new THREE.Vector3(0,.1,0)),.5,'ring',{rotation:[Math.PI/2,0,0]});
  if(type==='basic'){
    // 生育大改革: two people of the OPPOSITE sex to the target appear at RANDOM positions around them and slap them in random order.
    const kind=FEMALE.has(target.userData.id)?'man':'woman';
    pop('❤',fighter.position.clone().addScaledVector(forward,.9).add(new THREE.Vector3(0,1.7,0)),'#ff5d8f',1.2);   // heart made with both hands
    const a0=Math.random()*Math.PI*2,a1=a0+Math.PI*(.5+Math.random());      // two random, clearly separated bearings
    const dirs=[a0,a1].map(a=>new THREE.Vector3(Math.sin(a),0,Math.cos(a)));
    const figs=dirs.map(d=>{const g=human(kind);place(g,tp.clone().addScaledVector(d,2.8+Math.random()*1.4),tp);burst(g.position.clone().add(new THREE.Vector3(0,.5,0)),0xe8b6dc,8);return g;});
    const order=Math.random()<.5?[0,1]:[1,0];
    const slaps=[];for(let n=0;n<4;n++)slaps.push(order[n%2]);          // alternating slaps, random who starts
    slaps.forEach((i,n)=>later(200+n*260+Math.random()*90,()=>lunge(figs[i],aim,1.15,slapSwing,()=>{
      const d=dirs[i];burst(aim.clone().addScaledVector(d,.3),0xffd0b8,10);
      pop('啪！',aim.clone().addScaledVector(d,.6).add(new THREE.Vector3(0,.5+n*.1,0)),'#ffe08a',.9);
      mesh(new THREE.SphereGeometry(.55,12,10),0xffffff,aim.clone().addScaledVector(d,.3),.18,'grow',{opacity:.7});
    })));
    later(1500,()=>figs.forEach(dispose));
  } else if(type==='skill'){
    // 市警大升級: police officers and FBI agents surround the opponent from every direction and strike in three stages (gunfire or martial arts).
    const N=12,figs=[];
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2+.15,g=human(i%2?'fbi':'police');
      later(i*45,()=>{place(g,tp.clone().add(new THREE.Vector3(Math.sin(a)*4.4,0,Math.cos(a)*4.4)),tp);burst(g.position.clone().add(new THREE.Vector3(0,.5,0)),i%2?0x888899:0x4a78e0,5);});
      figs.push(g);
    }
    const shoot=(g)=>{
      const p=g.position.clone().add(new THREE.Vector3(0,1.9,0)),d=aim.clone().sub(p),dist=d.length();d.normalize();
      g.userData.parts.arms[1].rotation.x=-1.5;
      box(.1,.1,.4,0x222222,.34,1.1,.3,g);setTimeout(()=>{const gm=g.children.pop();gm.geometry.dispose();gm.material.dispose();},260);
      const mf=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:.95}));mf.position.copy(p).addScaledVector(d,.7);throwProjectile(mf,new THREE.Vector3(),.12,0);
      const tr=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.9),new THREE.MeshBasicMaterial({color:0xfff7b0,transparent:true,opacity:.98,depthWrite:false}));tr.position.copy(p);tr.rotation.y=Math.atan2(d.x,d.z);tr.rotation.x=-Math.asin(d.y);throwProjectile(tr,d.clone().multiplyScalar(dist/.16),.16,0);
      later(160,()=>{burst(aim,0xffe08a,5);});
    };
    const stages=[[450,'gun'],[1000,'arts'],[1550,'mix']];
    stages.forEach(([t,mode],s)=>later(t,()=>{
      figs.forEach((g,i)=>later(i*20,()=>{
        const useGun=mode==='gun'||(mode==='mix'&&i%2===0);
        if(useGun){shoot(g);pop(['砰！','砰砰！','啪！'][s%3],g.position.clone().add(new THREE.Vector3(0,3.5,0)),'#fff0a0',.55);}
        else lunge(g,aim,1.2,(i+s)%2?punch:kick,()=>{burst(aim,0xffffff,4);if(i%4===0)pop('哈！',aim.clone().add(new THREE.Vector3(Math.random()-.5,.8,Math.random()-.5)),'#ffffff',.7);});
      }));
      ring(1.2+s*.4,s===2?0xffffff:0x7fb0ff);burst(aim,0xffe08a,14+s*6);
    }));
    later(2500,()=>figs.forEach(dispose));
  } else {
    // 警局長照護: young people, elders and homeless people pour in from every direction and attack the opponent.
    const kinds=['young','elder','homeless'],N=15,figs=[],label={young:'青年',elder:'老人',homeless:'遊民'};
    for(let i=0;i<N;i++){
      const k=kinds[i%3],a=i/N*Math.PI*2+Math.random()*.2,g=human(k);
      const start=tp.clone().add(new THREE.Vector3(Math.sin(a)*6.2,0,Math.cos(a)*6.2));
      later(i*50,()=>{place(g,start,tp);burst(start.clone().add(new THREE.Vector3(0,.5,0)),0xffffff,4);
        if(i<6){const sp=wordSprite(label[k],'#ffe08a',.6);sp.position.set(0,2.9,0);sp.scale.multiplyScalar(1/1.7);g.add(sp);}   // little role tag
      });
      figs.push({g,k});
    }
    const hitAt=(g,k,n)=>{
      lunge(g,aim,1.2,k==='elder'?(arms=>{arms[1].rotation.set(-2.2,0,0);}):k==='young'?kick:punch,()=>{
        burst(aim,k==='homeless'?0xb59a6a:k==='elder'?0xffffff:0xffa060,6);
        if(n%3===0)pop(k==='elder'?'拐杖！':k==='young'?'哇！':'嘿！',aim.clone().add(new THREE.Vector3(Math.random()-.5,.8,Math.random()-.5)),'#ffe08a',.65);
      });
    };
    for(let r=0;r<3;r++)figs.forEach(({g,k},i)=>later(500+r*520+i*25,()=>hitAt(g,k,i+r)));
    later(650,()=>ring(1.5,0xffd36c));later(1170,()=>ring(2.1,0xffd36c));later(1690,()=>{ring(2.8,0xffffff);burst(aim,0xffe08a,34);});
    later(2500,()=>figs.forEach(({g})=>dispose(g)));
  }
}
