import * as THREE from 'three';
import {burst,delay,throwProjectile,addFx} from '../vfx/VFXSystem.js';

// ---- helpers ----
const wordTex=new Map();
export const wordSprite=(text,color='#fff7d6',size=.9)=>{
  let tex=wordTex.get(text+color);
  if(!tex){
    const cv=document.createElement('canvas');cv.width=256;cv.height=96;const g=cv.getContext('2d');
    g.font="bold 56px Georgia, 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=10;g.strokeStyle='#2b1d46';g.strokeText(text,128,50);g.fillStyle=color;g.fillText(text,128,50);
    tex=new THREE.CanvasTexture(cv);wordTex.set(text+color,tex);
  }
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));
  sp.scale.set(size*2.67,size,1);return sp;
};
const WORDS=['Read','Learn','Grammar','Vocabulary','Essay','Quiz','Idiom','Phrase','Syntax','Verb','Study','Noun','Reading','Listening','Speaking','Writing'];
const BOOK_COLORS=[0x8d3d50,0x2f5d8a,0x3f7a4f,0xc88a2e,0x6a4a9a,0xb34a3a];
const basicMat=(c,o=.98)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});
// an open book standing on its spine: two cover boards in a V with white pages; every part is its own fx mesh
const openBook=(mesh,pos,yaw,life)=>{
  const parts=[];
  for(const s of [-1,1]){
    const cover=mesh(new THREE.BoxGeometry(.5,.62,.05),0x8d3d50,pos,life,'fade');
    const pages=mesh(new THREE.BoxGeometry(.46,.58,.04),0xf6efd8,pos,life,'fade');
    for(const m of [cover,pages]){m.rotation.set(-.35,yaw+s*.55,0,'YXZ');}
    const off=new THREE.Vector3(Math.sin(yaw+s*.55)*.24,.38,Math.cos(yaw+s*.55)*.24);
    cover.position.add(off);pages.position.add(off).add(new THREE.Vector3(0,0,0));
    parts.push(cover,pages);
  }
  return parts;
};

export function skillMage({fighter,target,forward,origin,center,right,projectile,mesh},type){
  const tp=target.position.clone(),aim=tp.clone().add(new THREE.Vector3(0,1.15,0));
  if(type==='basic'){
    // 開卷有益: 16 English books open from eight directions around the opponent; words fly out of every book and stab the target.
    for(let d=0;d<8;d++){
      const a=d/8*Math.PI*2+.2,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      for(let k=0;k<2;k++){
        const base=tp.clone().addScaledVector(dir,3.0+k*.9).add(new THREE.Vector3(0,.55+k*.5,0));
        openBook(mesh,base,a+Math.PI,1.5);
        burst(base,0xffe08a,4);
        for(let w=0;w<2;w++)delay(()=>{
          const sp=wordSprite(WORDS[(d*4+k*2+w)%WORDS.length]);sp.position.copy(base).add(new THREE.Vector3(0,.4,0));
          const v=aim.clone().sub(sp.position).multiplyScalar(1/.5);throwProjectile(sp,v,.5,0);
          if(w===1&&k===1)burst(aim,0xffe08a,6);
        },160+k*110+w*260+d*25);
      }
    }
    delay(()=>burst(aim,0xffd68b,24),700);
  } else if(type==='skill'){
    // SoR 教學: a heap of English textbooks erupts from the ground, the lecturer pushes it over onto the opponent,
    // then holds up a glowing SoR pyramid whose light shines onto the opponent in three bursts.
    const heap=fighter.position.clone().addScaledVector(forward,1.7);
    const mid=fighter.position.clone().lerp(tp,.5);
    for(let i=0;i<16;i++){
      const p=heap.clone().add(new THREE.Vector3((Math.random()-.5)*1.6,.05,(Math.random()-.5)*1.6)).addScaledVector(right,(Math.random()-.5)*1.2);
      const b=projectile(new THREE.BoxGeometry(.62,.14,.46),BOOK_COLORS[i%BOOK_COLORS.length],p,new THREE.Vector3((Math.random()-.5)*1.2,5+Math.random()*3,(Math.random()-.5)*1.2),.7,(i%2?1:-1)*3,-16);
    }
    mid.y=0;
    burst(heap.clone().add(new THREE.Vector3(0,.4,0)),0xc88a2e,18);
    mesh(new THREE.TorusGeometry(.9,.08,8,28),0xc88a2e,heap.clone().add(new THREE.Vector3(0,.08,0)),.6,'ring',{rotation:[Math.PI/2,0,0]});
    // push: the books topple toward the opponent
    for(let i=0;i<14;i++)delay(()=>{
      const p=heap.clone().add(new THREE.Vector3((Math.random()-.5)*1.4,.4+Math.random()*.6,(Math.random()-.5)*1.4));
      const v=aim.clone().sub(p).multiplyScalar(1/.5).add(new THREE.Vector3(0,1.5,0));
      projectile(new THREE.BoxGeometry(.62,.14,.46),BOOK_COLORS[i%BOOK_COLORS.length],p,v,.55,(i%2?1:-1)*6,-6);
    },380+i*25);
    // the lecturer holds the SoR pyramid over his raised right hand (child of the fighter, so it always stays on him)
    const held=new THREE.Group();held.position.set(.62,2.7,.25);
    const pyrMat=new THREE.MeshBasicMaterial({color:0xffd54a});
    const pyr=new THREE.Mesh(new THREE.ConeGeometry(.42,.66,4),pyrMat);pyr.rotation.y=Math.PI/4;held.add(pyr);
    const wire=new THREE.Mesh(new THREE.ConeGeometry(.47,.72,4),new THREE.MeshBasicMaterial({color:0xfff3b0,wireframe:true}));wire.rotation.y=Math.PI/4;held.add(wire);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.6,12,10),new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:.4,depthWrite:false}));held.add(glow);
    const lab=wordSprite('SoR','#ffffff',.5);lab.position.y=.7;held.add(lab);
    held.visible=false;fighter.add(held);
    const hand=new THREE.Vector3(),headTop=new THREE.Vector3();
    const refresh=()=>{fighter.updateMatrixWorld(true);hand.copy(held.position);fighter.localToWorld(hand);headTop.set(0,2.62,.12);fighter.localToWorld(headTop);};
    delay(()=>{held.visible=true;refresh();burst(hand,0xfff0a0,14);burst(headTop,0xffffff,8);
      mesh(new THREE.SphereGeometry(.3,12,10),0xffffff,headTop,.9,'grow',{opacity:.7});},420);
    let spin=setInterval(()=>{held.rotation.y+=.25;glow.scale.setScalar(1+Math.sin(Date.now()/60)*.15);},30);
    delay(()=>{clearInterval(spin);fighter.remove(held);for(const m of [pyr,wire,glow,lab]){m.geometry.dispose();m.material.dispose();}},1700);
    // three staged lights: pyramid beam + head-reflected beam converge on the opponent
    const Y=new THREE.Vector3(0,1,0);
    const shine=(from,s,color,o)=>{
      const len=from.distanceTo(aim),dirv=aim.clone().sub(from).normalize();
      const beam=mesh(new THREE.CylinderGeometry(.1+s*.1,.3+s*.16,len,10),color,from.clone().lerp(aim,.5),.28,'fade',{opacity:o});
      beam.quaternion.setFromUnitVectors(Y,dirv);
    };
    for(let s=0;s<3;s++)delay(()=>{
      refresh();
      shine(hand,s,s===2?0xffffff:0xfff2a0,.85);
      shine(headTop,s,0xffffff,.6);
      mesh(new THREE.SphereGeometry(.5+s*.3,12,10),0xffffff,aim.clone(),.3,'grow');
      mesh(new THREE.SphereGeometry(.22,10,8),0xffffff,headTop.clone(),.25,'grow');
      burst(aim,0xfff0a0,10+s*6);
    },700+s*230);
  } else {
    // 百年樹人: the ground cracks open under the opponent and ONE giant tree bursts out of the earth, hurling them skyward.
    const green=[0x3f8a3a,0x57a64a,0x2f6b34],at=(x,y,z)=>tp.clone().add(new THREE.Vector3(x,y,z));
    mesh(new THREE.CircleGeometry(2.6,28),0x2a1a10,at(0,.03,0),1.5,'fade',{rotation:[-Math.PI/2,0,0],opacity:.85});   // split earth
    for(let i=0;i<9;i++){   // cracks radiating from the opponent's feet
      const a=i/9*Math.PI*2+.3,len=3.4+(i%3)*.5,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      mesh(new THREE.BoxGeometry(.16,.04,len),0x120a06,tp.clone().addScaledVector(dir,len/2).add(new THREE.Vector3(0,.05,0)),1.5,'fade',{opacity:.95}).rotation.y=a;
    }
    mesh(new THREE.TorusGeometry(1.8,.12,8,30),0x9b7a52,at(0,.08,0),.7,'ring',{rotation:[Math.PI/2,0,0]});
    burst(at(0,.3,0),0x7a5a3a,28);
    // root flare at the base, then the trunk rises section by section
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;
      const r=mesh(new THREE.ConeGeometry(.35,1.4,6),0x5a3d22,at(Math.sin(a)*1.35,.55,Math.cos(a)*1.35),1.3,'fade',{opacity:.97});r.rotation.set(Math.cos(a)*.9,0,-Math.sin(a)*.9);}
    const seg=[[1.5,1.1],[1.3,1.1],[1.1,1.1],[.95,1.1],[.8,1.1]];let y=0;
    seg.forEach(([r,h],i)=>{const cy=y+h/2;y+=h;delay(()=>{
      mesh(new THREE.CylinderGeometry(r*.88,r,h,12),0x6b4a2b,at(0,cy,0),1.3-i*.08,'fade',{opacity:.97});
      burst(at(0,cy,0),0x9b7a52,8);
    },250+i*90);});
    // thick branches and a wide canopy open at the top
    delay(()=>{
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.4,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
        const br=mesh(new THREE.CylinderGeometry(.18,.32,2.0,8),0x6b4a2b,at(dir.x*.9,5.3,dir.z*.9),1.0,'fade',{opacity:.97});br.rotation.set(dir.z*.9,0,-dir.x*.9);}
      for(const [x,yy,z,s] of [[0,6.0,0,1.9],[1.7,5.5,.5,1.3],[-1.7,5.6,-.4,1.3],[.4,5.4,-1.7,1.2],[-.5,5.5,1.6,1.2],[1.0,6.5,-.8,1.1],[-1.0,6.4,.8,1.1]])
        mesh(new THREE.IcosahedronGeometry(s,1),green[(Math.abs(x*7)|0)%3],at(x,yy,z),1.0,'fade',{opacity:.95});
      for(let i=0;i<12;i++)burst(at((Math.random()-.5)*4,5+Math.random()*2,(Math.random()-.5)*4),0x9be07a,3);
      burst(aim,0xffe08a,30);
    },700);
  }
}
