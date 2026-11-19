import * as THREE from 'three';
import {burst,throwProjectile,addFx} from '../vfx/VFXSystem.js';

// ---- helpers ----
const wordTex=new Map();
const wordSprite=(text,color='#fff7d6',size=.9)=>{
  let tex=wordTex.get(text+color);
  if(!tex){
    const cv=document.createElement('canvas');cv.width=256;cv.height=96;const g=cv.getContext('2d');
    g.font='bold 56px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
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
        for(let w=0;w<2;w++)setTimeout(()=>{
          const sp=wordSprite(WORDS[(d*4+k*2+w)%WORDS.length]);sp.position.copy(base).add(new THREE.Vector3(0,.4,0));
          const v=aim.clone().sub(sp.position).multiplyScalar(1/.5);throwProjectile(sp,v,.5,0);
          if(w===1&&k===1)burst(aim,0xffe08a,6);
        },160+k*110+w*260+d*25);
      }
    }
    setTimeout(()=>burst(aim,0xffd68b,24),700);
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
    for(let i=0;i<14;i++)setTimeout(()=>{
      const p=heap.clone().add(new THREE.Vector3((Math.random()-.5)*1.4,.4+Math.random()*.6,(Math.random()-.5)*1.4));
      const v=aim.clone().sub(p).multiplyScalar(1/.5).add(new THREE.Vector3(0,1.5,0));
      projectile(new THREE.BoxGeometry(.62,.14,.46),BOOK_COLORS[i%BOOK_COLORS.length],p,v,.55,(i%2?1:-1)*6,-6);
    },380+i*25);
    // the SoR pyramid, raised above the lecturer's hand
    const apex=fighter.position.clone().add(new THREE.Vector3(0,3.4,0)).addScaledVector(forward,.4);
    setTimeout(()=>{
      const pyr=mesh(new THREE.ConeGeometry(.62,.95,4),0xffd54a,apex,1.0,'fade',{opacity:.95});pyr.rotation.y=Math.PI/4;
      mesh(new THREE.ConeGeometry(.66,1.0,4),0xfff3b0,apex,1.0,'fade',{wireframe:true}).rotation.y=Math.PI/4;
      mesh(new THREE.SphereGeometry(.17,10,8),0xffffff,apex.clone().add(new THREE.Vector3(0,.05,.3)),1.0,'grow');
      const sp=wordSprite('SoR','#ffffff',.55);sp.position.copy(apex).add(new THREE.Vector3(0,.75,0));addFx(sp,1.0,'fade');
      burst(apex,0xfff0a0,14);
    },420);
    // three staged lights from the pyramid onto the opponent
    const Y=new THREE.Vector3(0,1,0);
    for(let s=0;s<3;s++)setTimeout(()=>{
      const len=apex.distanceTo(aim),dirv=aim.clone().sub(apex).normalize();
      const beam=mesh(new THREE.CylinderGeometry(.12+s*.12,.35+s*.18,len,10),s===2?0xffffff:0xfff2a0,apex.clone().lerp(aim,.5),.28,'fade',{opacity:.85});
      beam.quaternion.setFromUnitVectors(Y,dirv);
      mesh(new THREE.SphereGeometry(.5+s*.3,12,10),0xffffff,aim.clone(),.3,'grow');
      burst(aim,0xfff0a0,10+s*6);
    },700+s*230);
  } else {
    // 百年樹人: vines spiral in from every direction around the opponent and weave into a giant tree that hurls them skyward.
    const green=[0x3f8a3a,0x57a64a,0x2f6b34],Y=new THREE.Vector3(0,1,0);
    for(let i=0;i<12;i++)setTimeout(()=>{
      const a=i/12*Math.PI*2+(i%2)*.2,tw=i%2?1:-1,pt=[];
      for(const [r,h,t] of [[3.6,.05,0],[2.6,.9,.5],[1.5,2.4,1.0],[.5,4.2,1.5]])pt.push(tp.clone().add(new THREE.Vector3(Math.sin(a+tw*t)*r,h,Math.cos(a+tw*t)*r)));
      const tube=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pt),20,.14+(i%3)*.03,6,false),green[i%3],tp,1.7,'fade',{opacity:.95});
      burst(pt[0],0x57a64a,3);
    },i*45);
    // the trunk rises section by section, then the canopy opens
    const seg=[[1.1,.9],[.95,.9],[.8,.9],[.65,.9],[.5,.9]];let y=0;
    seg.forEach(([r,h],i)=>{const cy=y+h/2;y+=h;setTimeout(()=>{
      mesh(new THREE.CylinderGeometry(r*.85,r,h,10),0x6b4a2b,tp.clone().add(new THREE.Vector3(0,cy,0)),1.4-i*.1,'fade',{opacity:.97});
      mesh(new THREE.TorusGeometry(r*1.2,.05,6,16),0x9b7a52,tp.clone().add(new THREE.Vector3(0,cy-h/2,0)),.5,'ring',{rotation:[Math.PI/2,0,0]});
      burst(tp.clone().add(new THREE.Vector3(0,cy,0)),0x9b7a52,6);
    },350+i*90);});
    setTimeout(()=>{
      for(const [x,yy,z,s] of [[0,4.9,0,1.6],[1.1,4.5,.4,1.1],[-1.1,4.6,-.3,1.1],[.3,4.4,-1.1,1.0],[-.4,4.5,1.0,1.0]])
        mesh(new THREE.IcosahedronGeometry(s,1),green[(Math.abs(x*7)|0)%3],tp.clone().add(new THREE.Vector3(x,yy,z)),1.1,'fade',{opacity:.95});
      for(let i=0;i<10;i++)burst(tp.clone().add(new THREE.Vector3((Math.random()-.5)*3,4+Math.random()*1.5,(Math.random()-.5)*3)),0x9be07a,3);
      burst(aim,0xffe08a,30);
    },760);
  }
}
