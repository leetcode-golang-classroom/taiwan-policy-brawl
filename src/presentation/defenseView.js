import * as THREE from 'three';
import {scene} from '../scene.js';
import {burst} from '../vfx/VFXSystem.js';

// Per-character shield visuals for the I-key defense. Read-only: follows the `defense` component via events.
const M=(color,op=.5)=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});m.userData.base=op;return m;};
function label(text,color='#fff',bg='#d4202a'){
  const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
  g.fillStyle=bg;g.beginPath();g.roundRect(8,8,240,112,26);g.fill();g.fillStyle=color;g.font='900 64px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,68);
  const mm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide});mm.userData.base=1;return mm;
}
function stripes(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  for(let i=-4;i<8;i++){g.fillStyle=i%2?'#ffc233':'#222';g.beginPath();g.moveTo(i*24,0);g.lineTo(i*24+24,0);g.lineTo(i*24-40,128);g.lineTo(i*24-64,128);g.fill();}
  const mm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide});mm.userData.base=.9;return mm;
}
const dome=(color,op,r=1.35,y=1.15)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,18),M(color,op));m.position.y=y;return m;};
const ring=(color,r,tube,op=.8)=>new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,40),M(color,op));
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o;};

// 青天白日 emblem (blue disc, white 12-ray sun) drawn on a canvas.
function sunEmblem(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),m=128;
  g.fillStyle='#1d4fa8';g.beginPath();g.arc(m,m,124,0,Math.PI*2);g.fill();
  g.fillStyle='#fff';
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(m+Math.cos(a-.13)*50,m+Math.sin(a-.13)*50);g.lineTo(m+Math.cos(a)*112,m+Math.sin(a)*112);g.lineTo(m+Math.cos(a+.13)*50,m+Math.sin(a+.13)*50);g.closePath();g.fill();}
  g.beginPath();g.arc(m,m,46,0,Math.PI*2);g.fill();
  g.fillStyle='#1d4fa8';g.beginPath();g.arc(m,m,36,0,Math.PI*2);g.fill();
  g.fillStyle='#fff';g.beginPath();g.arc(m,m,30,0,Math.PI*2);g.fill();
  const mm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide});mm.userData.base=.95;return mm;
}
// Each builder returns {group, tick(time,state)}; `spin` parts are animated by tick.
const BUILDERS={
  mech(){ // 旋轉徽章護盾: blue-sky-white-sun emblems orbit the fighter inside a blue dome
    const g=new THREE.Group(),orbit=new THREE.Group();g.add(dome(0x2f6fd0,.14));
    const emblem=sunEmblem();
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2,e=new THREE.Mesh(new THREE.CircleGeometry(.62,40),emblem);e.position.set(Math.cos(a)*1.3,1.2,Math.sin(a)*1.3);e.rotation.y=Math.PI/2-a;orbit.add(e);}
    g.add(orbit);
    const front=new THREE.Mesh(new THREE.CircleGeometry(.5,40),emblem);front.position.set(0,2.45,0);g.add(front);   // emblem hovering above, billboarded
    g.add(at(ring(0x9fc4ff,1.32,.04,.7),0,.15,0).rotateX(Math.PI/2));
    return {group:g,tick:(t,s)=>{orbit.rotation.y=t*4;front.rotation.y=-s.rotY;front.rotation.z=t*2;}};
  },
  leopard(){ // mango-dried barrier
    const g=new THREE.Group(),orb=new THREE.Group();g.add(dome(0xffb347,.16));
    for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.34,14,10),M(0xffaa22,.85));s.scale.set(1,.28,.7);const a=i/8*Math.PI*2;s.position.set(Math.cos(a)*1.25,1.15+Math.sin(i*1.7)*.35,Math.sin(a)*1.25);s.rotation.set(a,a,0);orb.add(s);}
    g.add(orb);const l=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.55),label('芒果乾','#fff','#d4202a'));l.position.set(0,2.25,.1);g.add(l);
    return {group:g,tick:(t,s)=>{orb.rotation.y=t*2.2;l.rotation.y=-s.rotY;}};
  },
  admiral(){ // rotating mahjong wall
    const g=new THREE.Group(),w=new THREE.Group();g.add(dome(0x6fd3a8,.08));
    for(let r=0;r<2;r++)for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const tile=new THREE.Mesh(new THREE.BoxGeometry(.5,.72,.22),M(r?0x2e9b6e:0xf6f1dc,.85));tile.position.set(Math.cos(a)*1.25,.55+r*.78,Math.sin(a)*1.25);tile.rotation.y=-a+Math.PI/2;w.add(tile);}
    g.add(w);return {group:g,tick:t=>{w.rotation.y=t*2.6;}};
  },
  mage(){ // magic barrier: rune circle + vertical seal
    const g=new THREE.Group(),rune=ring(0xb18cff,1.3,.04,.9),seal=new THREE.Group();g.add(dome(0x8c6cff,.13));
    rune.rotation.x=Math.PI/2;rune.position.y=.08;g.add(rune);
    seal.add(ring(0xd2b8ff,1.0,.05,.9));seal.add(ring(0xb18cff,.7,.04,.8));for(let i=0;i<6;i++){const a=i*Math.PI/3,r=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.03),M(0xf0e4ff,.9));r.position.set(Math.cos(a)*.85,Math.sin(a)*.85,0);seal.add(r);}
    seal.position.set(0,1.3,1.0);g.add(seal);
    return {group:g,tick:t=>{rune.rotation.z=t*1.5;seal.rotation.z=-t*1.2;}};
  },
  cleric(){ // holy halo + light column
    const g=new THREE.Group(),halo=ring(0xffe27a,.62,.07,.95);g.add(dome(0xfff3c2,.12));
    halo.rotation.x=Math.PI/2.2;halo.position.y=2.85;g.add(halo);
    const col=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,3.2,28,1,true),M(0xfff0b0,.2));col.position.y=1.6;g.add(col);
    return {group:g,tick:t=>{halo.rotation.z=t*2;halo.position.y=2.85+Math.sin(t*4)*.06;}};
  },
  brawler(){ // golden muscle shield
    const g=new THREE.Group(),core=dome(0xffc83a,.26,1.3);g.add(core);g.add(dome(0xfff0a0,.1,1.5));
    const band=ring(0xffd966,1.2,.06,.9);band.rotation.x=Math.PI/2;band.position.y=1.15;g.add(band);
    return {group:g,tick:t=>{const k=1+Math.sin(t*9)*.03;core.scale.setScalar(k);band.rotation.z=t*3;}};
  },
  nun(){ // steel plate
    const g=new THREE.Group(),plate=new THREE.Mesh(new THREE.BoxGeometry(2.1,2.3,.16),M(0x9aa6b4,.9));plate.position.set(0,1.2,1.0);g.add(plate);
    for(const x of [-.85,.85])for(const y of [.35,2.05]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.06,8),M(0x4f5864,1));b.rotation.x=Math.PI/2;b.position.set(x,y,1.1);g.add(b);}
    const edge=new THREE.Mesh(new THREE.BoxGeometry(2.2,.1,.2),M(0xffb340,.95));edge.position.set(0,2.4,1.0);g.add(edge);g.add(dome(0xb8c4d2,.07));
    return {group:g,tick:t=>{plate.position.z=1.0+Math.sin(t*14)*.01;}};
  },
  yu(){ // construction protective wall: three hazard-striped panels
    const g=new THREE.Group(),panels=[];
    for(let i=-1;i<=1;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.9),stripes());const a=i*.55;p.position.set(Math.sin(a)*1.25,1.0,Math.cos(a)*1.25);p.rotation.y=a;g.add(p);panels.push(p);}
    const top=new THREE.Mesh(new THREE.BoxGeometry(3.4,.1,.12),M(0xffc233,.9));top.position.set(0,2.0,1.15);g.add(top);
    return {group:g,tick:()=>{},shatter:true};
  },
  'bubble'(){ // layered bubbles (one per remaining layer)
    const g=new THREE.Group(),bubbles=[0xffb6e6,0xaee4ff,0xffe9a8].map((c,i)=>{const b=dome(c,.2+i*.02,1.0+i*.25);g.add(b);return b;});
    return {group:g,tick:(t,s)=>{bubbles.forEach((b,i)=>{b.visible=i<s.layers;b.scale.setScalar(1+Math.sin(t*3+i)*.025);});}};
  }
};

export function initDefenseView(world){
  const shields=new Map(); // fighter id -> shield
  const on=(n,f)=>world.events.on(n,f);
  function dispose(s){scene.remove(s.group);s.group.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m){m.map?.dispose();m.dispose();}});}
  function drop(id){const s=shields.get(id);if(s){dispose(s);shields.delete(id);}}
  on('defenseStart',e=>{
    drop(e.id);const b=BUILDERS[e.charId]||BUILDERS.brawler;const {group,tick,shatter}=b();
    const t=world.get(e.id,'transform');group.position.set(t.x,t.y,t.z);group.rotation.y=t.rotY;scene.add(group);
    const mats=[];group.traverse(o=>{if(o.material)mats.push(o.material);});
    shields.set(e.id,{group,tick,shatter,mats,age:0,ending:-1,flash:0});
    burst(new THREE.Vector3(t.x,t.y+1.1,t.z),0x9be4ff,12);
  });
  on('defenseEnd',e=>{
    const s=shields.get(e.id);if(!s)return;s.ending=0;
    if(s.shatter||e.broken){const t=world.get(e.id,'transform');burst(new THREE.Vector3(t.x,t.y+1.1,t.z),e.broken?0xffc8ee:0xffc233,26);}
  });
  on('hit',e=>{
    if(!e.blocked&&!e.reduced)return;
    const s=shields.get(e.targetId);if(!s)return;
    s.flash=.25;const t=world.get(e.targetId,'transform');
    burst(new THREE.Vector3(t.x,t.y+1.2,t.z),0xbfeaff,10);
  });
  on('roundStart',()=>{for(const id of [...shields.keys()])drop(id);});
  on('roundEnd',()=>{for(const id of [...shields.keys()])drop(id);});
  on('matchEnd',()=>{for(const id of [...shields.keys()])drop(id);});
  return function update(dt){
    for(const [id,s] of [...shields]){
      const t=world.get(id,'transform'),d=world.get(id,'defense');
      s.age+=dt;s.flash=Math.max(0,s.flash-dt);
      if(s.ending>=0){s.ending+=dt;if(s.ending>.3){drop(id);continue;}}
      const a=s.ending>=0?1-s.ending/.3:Math.min(1,s.age/.15);
      s.group.position.set(t.x,t.y,t.z);s.group.rotation.y=t.rotY;
      const k=(.6+.4*Math.min(1,s.age/.2))*(1+s.flash*.3);s.group.scale.setScalar(k);
      s.tick(world.time,{layers:d.layers,rotY:t.rotY});
      for(const m of s.mats)m.opacity=Math.min(1,m.userData.base*a*(1+s.flash*2.4));
    }
  };
}
