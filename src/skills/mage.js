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
    // the lecturer holds the SoR pyramid up in his hand; its light and his shiny bald head both reflect onto the opponent
    const hand=fighter.position.clone().addScaledVector(right,.8).addScaledVector(forward,.45).add(new THREE.Vector3(0,2.45,0));
    const headTop=fighter.position.clone().addScaledVector(forward,.2).add(new THREE.Vector3(0,2.6,0));
    setTimeout(()=>{
      const pyr=mesh(new THREE.ConeGeometry(.42,.66,4),0xffd54a,hand,1.0,'fade',{opacity:.95});pyr.rotation.y=Math.PI/4;
      mesh(new THREE.ConeGeometry(.46,.7,4),0xfff3b0,hand,1.0,'fade',{wireframe:true}).rotation.y=Math.PI/4;
      mesh(new THREE.SphereGeometry(.13,10,8),0xffffff,hand.clone().add(new THREE.Vector3(0,.05,.2)),1.0,'grow');
      mesh(new THREE.SphereGeometry(.5,12,10),0xfff0a0,hand,.9,'grow',{opacity:.5});          // glow around the pyramid
      mesh(new THREE.SphereGeometry(.3,12,10),0xffffff,headTop,.9,'grow',{opacity:.7});       // glint on the bald head
      const sp=wordSprite('SoR','#ffffff',.5);sp.position.copy(hand).add(new THREE.Vector3(0,.6,0));addFx(sp,1.0,'fade');
      burst(hand,0xfff0a0,14);burst(headTop,0xffffff,8);
    },420);
    // three staged lights: pyramid beam + head-reflected beam converge on the opponent
    const Y=new THREE.Vector3(0,1,0);
    const shine=(from,s,color,o)=>{
      const len=from.distanceTo(aim),dirv=aim.clone().sub(from).normalize();
      const beam=mesh(new THREE.CylinderGeometry(.1+s*.1,.3+s*.16,len,10),color,from.clone().lerp(aim,.5),.28,'fade',{opacity:o});
      beam.quaternion.setFromUnitVectors(Y,dirv);
    };
    for(let s=0;s<3;s++)setTimeout(()=>{
      shine(hand,s,s===2?0xffffff:0xfff2a0,.85);
      shine(headTop,s,0xffffff,.6);
      mesh(new THREE.SphereGeometry(.5+s*.3,12,10),0xffffff,aim.clone(),.3,'grow');
      mesh(new THREE.SphereGeometry(.22,10,8),0xffffff,headTop.clone(),.25,'grow');
      burst(aim,0xfff0a0,10+s*6);
    },700+s*230);
  } else {
    // 百年樹人: the ground cracks open under the opponent, vines burst out of the cracks, weave into a giant tree and hurl them skyward.
    const green=[0x3f8a3a,0x57a64a,0x2f6b34];
    mesh(new THREE.CircleGeometry(2.4,28),0x2a1a10,tp.clone().add(new THREE.Vector3(0,.03,0)),1.6,'fade',{rotation:[-Math.PI/2,0,0],opacity:.85});   // scorched, split earth
    for(let i=0;i<9;i++){   // cracks radiating from the opponent's feet
      const a=i/9*Math.PI*2+.3,len=3.4+(i%3)*.5,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      const c=mesh(new THREE.BoxGeometry(.16,.04,len),0x120a06,tp.clone().addScaledVector(dir,len/2).add(new THREE.Vector3(0,.05,0)),1.6,'fade',{opacity:.95});c.rotation.y=a;
      mesh(new THREE.BoxGeometry(.06,.045,len*.9),0x8bd86a,tp.clone().addScaledVector(dir,len*.45).add(new THREE.Vector3(0,.06,0)),1.2,'fade').rotation.y=a;
    }
    mesh(new THREE.TorusGeometry(1.6,.1,8,30),0x9b7a52,tp.clone().add(new THREE.Vector3(0,.08,0)),.7,'ring',{rotation:[Math.PI/2,0,0]});
    burst(tp.clone().add(new THREE.Vector3(0,.3,0)),0x7a5a3a,26);
    for(let i=0;i<12;i++){   // vines burst up out of the cracks and coil around the opponent
      const a=i/12*Math.PI*2+(i%2)*.25,tw=i%2?1:-1,pt=[];
      for(const [r,h,t] of [[2.6-(i%3)*.4,.02,0],[2.0,1.0,.45],[1.3,2.4,.9],[.6,4.0,1.3],[.2,5.2,1.6]])pt.push(tp.clone().add(new THREE.Vector3(Math.sin(a+tw*t)*r,h,Math.cos(a+tw*t)*r)));
      for(let n=3;n<=pt.length;n++)setTimeout(()=>{   // grows out of the ground section by section
        mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pt.slice(0,n)),14*n,.15+(i%3)*.03,6,false),green[i%3],tp,1.2-(n-3)*.2,'fade',{opacity:.95});
        burst(pt[n-1],0x57a64a,2);
      },120+i*30+(n-3)*130);
    }
    // the trunk rises through the middle section by section, then the canopy opens
    const seg=[[1.0,.9],[.85,.9],[.7,.9],[.55,.9],[.4,.9]];let y=0;
    seg.forEach(([r,h],i)=>{const cy=y+h/2;y+=h;setTimeout(()=>{
      mesh(new THREE.CylinderGeometry(r*.85,r,h,10),0x6b4a2b,tp.clone().add(new THREE.Vector3(0,cy,0)),1.2-i*.1,'fade',{opacity:.97});
      burst(tp.clone().add(new THREE.Vector3(0,cy,0)),0x9b7a52,6);
    },300+i*90);});
    setTimeout(()=>{
      for(const [x,yy,z,s] of [[0,5.1,0,1.5],[1.1,4.7,.4,1.0],[-1.1,4.8,-.3,1.0],[.3,4.6,-1.1,.9],[-.4,4.7,1.0,.9]])
        mesh(new THREE.IcosahedronGeometry(s,1),green[(Math.abs(x*7)|0)%3],tp.clone().add(new THREE.Vector3(x,yy,z)),1.0,'fade',{opacity:.95});
      burst(aim,0xffe08a,30);
    },700);
  }
}
