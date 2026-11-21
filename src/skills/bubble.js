import * as THREE from 'three';
import {burst,throwProjectile} from '../vfx/VFXSystem.js';
import {scene} from '../scene.js';
import {wordSprite} from './mage.js';

// ---- little crowd figures (own lifecycle: not routed through addFx, so they can walk and swing their arms) ----
const FEMALE=new Set(['nun']);                      // character ids drawn as women; everyone else is treated as a man
const B=(c)=>new THREE.MeshBasicMaterial({color:c});
const box=(w,h,d,c,x,y,z,parent)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),B(c));m.position.set(x,y,z);parent.add(m);return m;};
// ---- nicer Q-version man / woman for 生育大改革: lathed body, big sculpted-style head with face, hair, articulated arms and legs ----
const LM=(c)=>new THREE.MeshLambertMaterial({color:c});
const gm=(geo,c,x,y,z,parent,sc=[1,1,1],rot=[0,0,0])=>{const m=new THREE.Mesh(geo,LM(c));m.position.set(x,y,z);m.scale.set(...sc);m.rotation.set(...rot);parent.add(m);return m;};
const lathe=(pts,seg=20)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
const LOOK={ // top/bottom clothes, hair colour, tie colour (null = none)
  woman:{top:0xe9709a,bot:0xb04877,hair:0x2f1a12},man:{top:0x3f6fc0,bot:0x2f3447,hair:0x232326,tie:0xd8403a},
  police:{top:0x2a4a95,bot:0x18285a,hair:0x232326,tie:0x111111},fbi:{top:0x1a1a22,bot:0x1a1a22,hair:0x111114,tie:0x111111},
  aunt:{top:0xd8335f,bot:0x7a4a3a,hair:0xb9b9c4},young:{top:0xff7a3d,bot:0x3b5f9a,hair:0x2a2e38},elder:{top:0x9a7c55,bot:0x5a5a60,hair:0xf2f2f6},homeless:{top:0x6b5a44,bot:0x4a4033,hair:0x4a4a58}};
export function humanQ(kind,opts={}){
  const g=new THREE.Group(),woman=kind==='woman',aunt=kind==='aunt',lady=woman||aunt,SKIN=kind==='homeless'?0xe2b996:0xf6d0b2,{top:TOP0,bot:BOT,hair:HAIR,tie:TIE}=LOOK[kind],TOP=opts.dress??TOP0;
  const hat=kind==='police'||kind==='homeless';
  // torso: soft lathe; woman gets a flared skirt, everyone else a shirt/jacket over trousers
  if(aunt){gm(lathe([[.0,.3],[.2,.32],[.2,.5],[.18,.7],[.21,.92],[.25,1.04],[.15,1.16],[.0,1.18]],24),TOP,0,0,0,g);   // tight dress: slim hem, fuller chest
    for(let k=0;k<7;k++){const a=k*2.4,y=.42+(k%4)*.2;gm(new THREE.SphereGeometry(.035,6,5),k%2?0xfff0a8:0xffe2ec,Math.sin(a)*.2,y,Math.cos(a)*.2,g);}   // flower dots
    gm(new THREE.SphereGeometry(.035,6,5),0xfff0a8,.1,.95,.23,g);}
  else if(woman){gm(lathe([[.0,.34],[.34,.36],[.27,.55],[.17,.7],[.2,.9],[.22,1.06],[.15,1.16],[.0,1.18]],24),TOP,0,0,0,g);
    gm(lathe([[.0,.62],[.2,.64],[.2,.7],[.0,.7]]),0xffffff,0,0,0,g);                                        // waist sash
    gm(new THREE.SphereGeometry(.07,8,6),0xffe36b,0,.9,.2,g);}                                               // brooch
  else{gm(lathe([[.0,.58],[.2,.6],[.19,.8],[.22,1.0],[.23,1.1],[.14,1.18],[.0,1.2]],24),TOP,0,0,0,g);
    if(TIE!==undefined){if(kind!=='police')gm(new THREE.BoxGeometry(.16,.4,.03),0xf4f4f4,0,.95,.205,g);      // white shirt front
      gm(new THREE.BoxGeometry(.07,.34,.03),TIE,0,.92,.215,g);gm(new THREE.BoxGeometry(.2,.06,.03),0xffffff,0,1.12,.19,g);}}
  if(kind==='police'||kind==='fbi'){gm(lathe([[.215,.58],[.215,.66],[.205,.66]],24),0x151515,0,.0,0,g);      // belt
    gm(new THREE.CylinderGeometry(.06,.06,.02,6),0xffd54a,.12,.96,.215,g,[1,1,1],[Math.PI/2,0,0]);}           // badge
  // legs: pivot at hip
  const legs=[-1,1].map(x=>{const l=new THREE.Group();l.position.set(x*.1,.62,0);g.add(l);
    gm(new THREE.CapsuleGeometry(.075,.34,4,10),lady?SKIN:BOT,0,-.28,0,l);
    gm(new THREE.SphereGeometry(.1,10,8),lady?0x6a3a52:kind==='young'?0xffffff:kind==='police'||kind==='fbi'?0x101010:kind==='homeless'?0x3a3228:0xf4f4f4,0,-.52,.05,l,[1,.6,1.5]);return l;});
  // arms: pivot at shoulder, sleeve + hand
  const arms=[-1,1].map(x=>{const a=new THREE.Group();a.position.set(x*.29,1.04,0);g.add(a);
    gm(new THREE.CapsuleGeometry(.065,.28,4,10),TOP,0,-.2,0,a);gm(new THREE.SphereGeometry(.07,10,8),SKIN,0,-.44,0,a);return a;});
  // head: big round head with face
  const head=new THREE.Group();head.position.y=1.45;g.add(head);
  gm(new THREE.SphereGeometry(.3,24,18),SKIN,0,0,0,head,[1,.96,.95]);
  gm(new THREE.SphereGeometry(.05,8,6),SKIN,0,-.02,.28,head,[1,1,.8]);                                       // nose
  both2(x=>{
    if(kind!=='fbi'){gm(new THREE.SphereGeometry(.045,10,8),0x1b1418,x*.115,.02,.255,head,[.8,1.2,.5]);
      gm(new THREE.SphereGeometry(.014,6,5),0xffffff,x*.115+.012,.045,.285,head);}
    gm(new THREE.SphereGeometry(.055,8,6),0xf59a9a,x*.18,-.08,.22,head,[1,.6,.4]);                            // blush
    if(lady)gm(new THREE.CapsuleGeometry(.007,.05,3,5),0x1b1418,x*.15,.075,.265,head,[1,1,1],[0,0,Math.PI/2-x*.45]);   // lashes
    else gm(new THREE.CapsuleGeometry(.009,.07,3,5),kind==='elder'?0xdcdce2:HAIR,x*.115,.1,.27,head,[1,1,1],[0,0,Math.PI/2]);   // brows
    gm(new THREE.SphereGeometry(.04,8,6),SKIN,x*.3,-.01,0,head,[.5,1,.8]);});                                 // ears
  gm(new THREE.TorusGeometry(.045,.01,6,12,Math.PI),lady?(aunt?0xc2162e:0xc2415f):0x8a4a40,0,-.12,.265,head,[1,.7,1],[0,0,Math.PI]);   // smile
  // hair
  gm(new THREE.SphereGeometry(.325,24,14,0,Math.PI*2,0,Math.PI*.56),HAIR,0,.01,-.03,head,[1,1,1],[-.25,0,0]);
  gm(new THREE.SphereGeometry(.31,24,16),HAIR,0,.015,-.075,head,[1,.95,.95]);                                 // back of the head
  if(woman){
    gm(lathe([[.0,.0],[.3,-.05],[.3,-.4],[.2,-.62],[.0,-.66]],18),HAIR,0,.1,-.12,head,[1,1,.55]);            // long hair behind
    both2(x=>gm(new THREE.CapsuleGeometry(.05,.34,4,8),HAIR,x*.285,-.15,.05,head));                           // side locks
    gm(new THREE.TorusGeometry(.3,.025,6,24,Math.PI),0xffd0e0,0,.02,-.02,head,[1,1,1],[.3,0,0]);               // hair band
    gm(new THREE.SphereGeometry(.06,8,6),0xff5d8f,.2,.27,.1,head,[1.6,1,.6]);gm(new THREE.SphereGeometry(.06,8,6),0xff5d8f,.32,.27,.1,head,[1.6,1,.6]);   // ribbon
  }else if(!hat)gm(new THREE.SphereGeometry(.2,14,8),HAIR,.03,.2,.17,head,[1.15,.42,.55],[.5,0,-.12]);       // fringe
  if(aunt){                                                                                                    // heavy rouge, red lips, grey perm, scarf, handbag, hanky
    both2(x=>{gm(new THREE.SphereGeometry(.07,8,6),0xe9707f,x*.19,-.07,.21,head,[1,.7,.4]);
      for(let k=0;k<4;k++){const a=k/4*Math.PI;gm(new THREE.SphereGeometry(.085,8,6),0xcfcfd8,x*(.2+Math.cos(a)*.12),.04+Math.sin(a)*.14,.0-.0,head);}});
    for(let k=0;k<7;k++){const a=k/7*Math.PI*2;gm(new THREE.SphereGeometry(.09,8,6),0xcfcfd8,Math.cos(a)*.25,.14+Math.sin(a)*.04,Math.sin(a)*.25-.04,head);}   // perm curls
    gm(new THREE.SphereGeometry(.06,8,6),0xc2162e,0,-.12,.27,head,[1.6,.6,.5]);                                  // lipstick
    gm(new THREE.TorusGeometry(.3,.03,6,24),opts.dress===0xd8335f?0xffd65c:0xd8335f,0,.1,-.02,head,[1,1,1],[Math.PI/2-.2,0,0]);   // hair scarf
    gm(new THREE.BoxGeometry(.2,.15,.08),0x7a3b2a,0,-.52,.1,arms[0],[1,1,1]);                                    // handbag in one hand
    gm(new THREE.BoxGeometry(.16,.015,.16),0xff7fb0,0,-.5,.02,arms[1],[1,1,1],[0,0,.4]);}                        // waving hanky
  // role props
  if(kind==='police'){gm(new THREE.SphereGeometry(.345,24,12,0,Math.PI*2,0,Math.PI*.5),0x1f3b78,0,.07,-.02,head,[1,.8,1],[-.12,0,0]);   // peaked cap
    gm(new THREE.CylinderGeometry(.34,.34,.05,24),0x172c5a,0,.07,-.02,head);gm(new THREE.BoxGeometry(.36,.025,.2),0x0e1630,0,.06,.31,head);
    gm(new THREE.CylinderGeometry(.06,.06,.02,6),0xffd54a,0,.2,.32,head,[1,1,1],[Math.PI/2,0,0]);}
  if(kind==='police'){gm(new THREE.BoxGeometry(.5,.82,.05),0x9fd0ee,-.2,.8,.34,g);                           // riot shield: clear plate, dark frame, POLICE band, handle
    gm(new THREE.BoxGeometry(.54,.05,.07),0x1b2a55,-.2,1.22,.34,g);gm(new THREE.BoxGeometry(.54,.05,.07),0x1b2a55,-.2,.38,.34,g);
    both2(x=>gm(new THREE.BoxGeometry(.05,.86,.07),0x1b2a55,-.2+x*.26,.8,.34,g));
    gm(new THREE.BoxGeometry(.4,.12,.06),0xf2f2f2,-.2,.8,.36,g);gm(new THREE.BoxGeometry(.32,.05,.07),0x1f3b78,-.2,.8,.375,g);
    gm(new THREE.BoxGeometry(.05,.05,.1),0x222222,-.2,.8,.28,g);}
  if(kind==='fbi'){gm(new THREE.BoxGeometry(.5,.08,.05),0x050505,0,.03,.28,head);                              // sunglasses
    both2(x=>gm(new THREE.BoxGeometry(.2,.1,.05),0x050505,x*.115,.025,.285,head));
    gm(new THREE.CapsuleGeometry(.012,.3,3,5),0x050505,.31,-.03,.05,head);                                     // earpiece wire
    gm(new THREE.BoxGeometry(.12,.07,.02),0xffd54a,-.13,.98,.225,g);}                                              // ID badge
  if(kind==='young'){gm(new THREE.BoxGeometry(.34,.36,.14),0x2f8fa8,0,.95,-.25,g);                              // backpack
    both2(x=>gm(new THREE.BoxGeometry(.05,.4,.03),0x1f6a7c,x*.13,.98,.2,g));}
  if(kind==='elder'){gm(new THREE.CylinderGeometry(.025,.025,.9,8),0x6b4a2b,.42,.45,.25,g);gm(new THREE.TorusGeometry(.05,.015,6,10,Math.PI*1.2),0x6b4a2b,.45,.9,.25,g,[1,1,1],[0,0,Math.PI*.4]);   // cane
    both2(x=>gm(new THREE.TorusGeometry(.065,.01,6,16),0x333333,x*.115,.02,.285,head));gm(new THREE.CapsuleGeometry(.008,.1,3,5),0x333333,0,.03,.285,head,[1,1,1],[0,0,Math.PI/2]);   // round glasses
    arms[1].rotation.x=-.4;g.userData.stoop=.18;}
  if(kind==='homeless'){gm(new THREE.SphereGeometry(.345,24,12,0,Math.PI*2,0,Math.PI*.55),0x4a4a58,0,.04,-.02,head,[1,.95,1],[-.15,0,0]);   // beanie
    gm(new THREE.SphereGeometry(.07,8,6),0x8f8f98,0,.34,-.02,head);gm(new THREE.TorusGeometry(.3,.04,8,24),0x8f8f98,0,.05,-.02,head,[1,1,1],[Math.PI/2-.15,0,0]);
    gm(new THREE.TorusGeometry(.17,.05,8,16),0x8f8f98,0,1.17,.02,g,[1,1,1],[Math.PI/2,0,0]);                    // scarf
    gm(new THREE.BoxGeometry(.4,.45,.16),0x8a8f55,.34,.55,-.1,g);}                                             // sack
  g.scale.setScalar(1.7);
  g.userData.parts={arms,legs,head};
  return g;
}
const both2=f=>[-1,1].forEach(f);
export function place(g,pos,faceTo){g.position.copy(pos);g.lookAt(faceTo.x,pos.y,faceTo.z);scene.add(g);}
export function dispose(g){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.map?.dispose?.();o.material.dispose();}});}
export const tween=(dur,fn,done)=>{const t0=performance.now();const f=()=>{const t=Math.min(1,(performance.now()-t0)/dur);fn(t);if(t<1)requestAnimationFrame(f);else done?.();};requestAnimationFrame(f);};
export const later=(ms,fn)=>setTimeout(fn,ms);
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
    const figs=dirs.map(d=>{const g=humanQ(kind);place(g,tp.clone().addScaledVector(d,2.8+Math.random()*1.4),tp);burst(g.position.clone().add(new THREE.Vector3(0,.5,0)),0xe8b6dc,8);return g;});
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
    const N=16,figs=[];
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2+.15,g=humanQ(i%2?'fbi':'police');
      later(i*45,()=>{place(g,tp.clone().add(new THREE.Vector3(Math.sin(a)*4.6,0,Math.cos(a)*4.6)),tp);burst(g.position.clone().add(new THREE.Vector3(0,.5,0)),i%2?0x888899:0x4a78e0,5);});
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
      const k=kinds[i%3],a=i/N*Math.PI*2+Math.random()*.2,g=humanQ(k);
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
