// Generates public/assets/characters/character-03/fighter.glb: a skinned, animated humanoid (Q-version suited mahjong-culture fighter).
// Run: npm run build:character-03   (a prototype GLB built procedurally; replace with an artist-made model later, same bone/clip names)
import * as THREE from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';

globalThis.FileReader=class{
  readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}
  readAsDataURL(b){b.arrayBuffer().then(r=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}
};

// ---------- skeleton (rest pose: T-less, arms hanging; faces +z; character's left = +x) ----------
const HIPY=1.3,HIPQ=1.0;   // HIPQ: hips height after the Q-version remap
const SPEC=[ // modelled realistic, then remapped to Q proportions (~2.8 heads); name,parent,local position
['Hips',null,[0,HIPY,0]],['Spine','Hips',[0,.2,0]],['Chest','Spine',[0,.35,0]],['Neck','Chest',[0,.37,0]],['Head','Neck',[0,.25,0]],
['UpperArmL','Chest',[.34,.33,0]],['LowerArmL','UpperArmL',[0,-.38,0]],['UpperArmR','Chest',[-.34,.33,0]],['LowerArmR','UpperArmR',[0,-.38,0]],
['UpLegL','Hips',[.15,0,0]],['LowLegL','UpLegL',[0,-.55,0]],['FootL','LowLegL',[0,-.67,0]],
['UpLegR','Hips',[-.15,0,0]],['LowLegR','UpLegR',[0,-.55,0]],['FootR','LowLegR',[0,-.67,0]]];
const bones=SPEC.map(([n,,p])=>{const b=new THREE.Bone();b.name=n;b.position.set(...p);return b;});
const idx=Object.fromEntries(SPEC.map(([n],i)=>[n,i]));
SPEC.forEach(([,par],i)=>{if(par)bones[idx[par]].add(bones[i]);});
const root=new THREE.Group();root.name='Character03';root.add(bones[0]);root.updateMatrixWorld(true);

// ---------- materials ----------
const M=(c,r=.6,m=0,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...extra});
const MATS={suit:M(0x1f2f52,.75),shine:M(0x2f4372,.5),dark:M(0x15151a,.5),frame:M(0x23232b,.35,.4),shirt:M(0xf6f7fb,.55),skin:M(0xe9bd9d,.55),face:M(0xffffff,.5,0,{vertexColors:true}),hairg:M(0xffffff,.4,.1,{side:THREE.DoubleSide,vertexColors:true}),hair:M(0x1b1b21,.4,.1,{side:THREE.DoubleSide}),gray:M(0x9a9ea8,.45,.1,{side:THREE.DoubleSide}),white:M(0xf6f7fb,.5),orange:M(0xe9e6dc,.7),
  gold:M(0xe8b84a,.35,.4,{emissive:0x7a5200}),tie:M(0x1f6b4a,.5),sclera:M(0xfffbf6,.3),iris:M(0x4a2f1c,.4),pupil:M(0x15131c,.3),mouth:M(0x9b5362,.5),pants:M(0x1f2f52,.8)};
const parts={}; // material -> geometries
function part(bone,mat,geo,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
  geo=geo.index?geo.toNonIndexed():geo;
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(...scale)));
  const n=geo.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
  for(let i=0;i<n;i++){si[i*4]=idx[bone];sw[i*4]=1;}
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
  geo.deleteAttribute('uv');
  if(mat==='hairg'){ // root-to-tip gradient: black on the crown, white at the ends; the temples/sides turn grey earlier
    const P=geo.attributes.position,col=new Float32Array(n*3),sm=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
    for(let i=0;i<n;i++){const y=P.getY(i)-HY,xx=P.getX(i),zz=P.getZ(i),x=Math.abs(xx),az=Math.atan2(xx,zz+.03);
      const strand=(Math.sin(az*19+y*9)+Math.sin(az*37-y*5+1.3)*.6)/1.6;                 // soft strand-like streaking
      let t=(.055-y+x*.22)/.19;t+=strand*.13*(.35+4*Math.max(0,t)*Math.max(0,1-t));t=Math.pow(sm(t),1.25);
      const g=.025+t*.84;col[i*3]=g;col[i*3+1]=g;col[i*3+2]=g+.02*t;}
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));}
  (parts[mat]??=[]).push(geo);
}
const cap=(r,l)=>new THREE.CapsuleGeometry(r,l,5,12),sph=(r,w=16,h=12)=>new THREE.SphereGeometry(r,w,h),box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
const ell=(rx,ry,rz)=>{const g=new THREE.SphereGeometry(1,24,16);g.scale(rx,ry,rz);return g;};
const both=f=>[-1,1].forEach(f);

// ---------- continuous clothed body: lathed cloth surfaces skinned with smooth joint blending (no rigid robot parts) ----------
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// chain: bones top->bottom, bounds: joint heights between consecutive bones, w: half width of the blend zone
function blend(mat,geo,chain,bounds,w=.08){
  geo.deleteAttribute('uv');const pos=geo.attributes.position,n=pos.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
  for(let i=0;i<n;i++){const y=pos.getY(i),t=bounds.map(b=>sstep(b+w,b-w,y));
    for(let k=0;k<chain.length;k++){si[i*4+k]=idx[chain[k]];sw[i*4+k]=(k===0?1:t[k-1])-(k===chain.length-1?0:t[k]);}}
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
  (parts[mat]??=[]).push(geo);
}
const lathe=(pts,seg=32,zs=1,off=[0,0,0])=>{const g=new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...off),new THREE.Quaternion(),new THREE.Vector3(1,1,zs)));return g;};
const interp=(tab,y)=>{for(let i=1;i<tab.length;i++)if(y<=tab[i][1]){const [r0,y0]=tab[i-1],[r1,y1]=tab[i];return r0+(r1-r0)*(y-y0)/(y1-y0);}return tab[tab.length-1][0];};
const TORSO=[[.28,1.08],[.292,1.16],[.265,1.4],[.245,1.6],[.268,1.8],[.32,2.0],[.335,2.08],[.3,2.15],[.21,2.22],[.09,2.27],[.0,2.29]];   // sloping, relaxed shoulder line
const torsoZ=y=>interp(TORSO,y)*.7;
const TB=['Chest','Spine','Hips'],TBOUND=[1.85,1.5];   // blend() wants bones top->bottom with descending bounds
blend('suit',lathe(TORSO,40,.7),TB,TBOUND,.1);                                           // jacket body
// flat cloth strips that follow the torso surface (shirt, tie, lapels)
const strip=(mat,w,y0,y1,xc,thick,slope=0)=>{const g=new THREE.BoxGeometry(w,y1-y0,thick,1,18,1);g.translate(xc,(y0+y1)/2,0);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i);p.setZ(i,p.getZ(i)+torsoZ(y)+thick/2-.004);p.setX(i,p.getX(i)+slope*(y-(y0+y1)/2));}g.computeVertexNormals();blend(mat,g,TB,TBOUND,.1);};
// business suit: white shirt front, burgundy tie (ends mid-chest), lapels
strip('shirt',.13,1.66,2.2,0,.016);strip('tie',.05,1.62,2.12,0,.034);
both(x=>strip('shine',.075,1.78,2.17,x*.125,.026,x*-.12));
for(let i=0;i<2;i++){const y=1.5-i*.14,b=sph(.014,10,8);b.scale(1,1,.5);b.translate(0,y,torsoZ(y)+.02);blend('shine',b,TB,TBOUND,.1);}
{const pq=box(.09,.035,.012);pq.rotateZ(.15);pq.translate(-.17,1.98,torsoZ(1.98)+.03);blend('white',pq,TB,TBOUND,.1);}
// pelvis / trousers waist
blend('pants',lathe([[.19,1.0],[.235,1.12],[.245,1.3]],36,.66),['Hips'],[],.1);
// neck + collar
blend('skin',lathe([[.074,2.2],[.07,2.3],[.066,2.4]],20),['Head','Neck'],[2.45],.05);
blend('shirt',lathe([[.092,2.2],[.098,2.26],[.088,2.3]],24),['Neck'],[],.05);
// legs: trouser cloth that bends smoothly at hip / knee / ankle, with side stripe and sneakers
const LEG=[[.062,.1],[.058,.12],[.07,.28],[.088,.5],[.085,.7],[.095,.8],[.12,1.0],[.13,1.2],[.135,1.4]].map(([r,y])=>[r*1.28*(y>1.0?1-(y-1.0)*.9:1),y]);   // thigh tops taper so they stay inside the jacket hem   // chunkier Q legs
both(x=>{const s=x>0?'L':'R',cx=x*.15,chain=['Hips','UpLeg'+s,'LowLeg'+s,'Foot'+s],bounds=[1.3,.75,.08];
  blend('pants',lathe(LEG,28,1,[cx,0,0]),chain,bounds,.09);
  const shoe=ell(.07,.06,.17);shoe.translate(cx,.075,.065);part('Foot'+s,'dark',shoe);
  const toe=ell(.062,.04,.07);toe.translate(cx,.055,.17);part('Foot'+s,'dark',toe);
  const sole=box(.135,.025,.37);sole.translate(cx,.0125,.07);part('Foot'+s,'dark',sole);
  const heel=ell(.05,.05,.05);heel.translate(cx,.1,-.07);part('Foot'+s,'dark',heel);});
// arms: jacket sleeves with an elbow bulge, shirt cuff, sport wristband and a real hand
const ARM=[[.05,1.46],[.056,1.52],[.062,1.64],[.07,1.78],[.073,1.9],[.082,2.0],[.075,2.07],[.05,2.12],[.0,2.14]];   // no raised shoulder cap: the arm tucks into the sloping torso
both(x=>{const s=x>0?'L':'R',cx=x*.325,chain=['Chest','UpperArm'+s,'LowerArm'+s],bounds=[2.2,1.8];
  blend('suit',lathe(ARM,24,1,[cx,0,0]),chain,bounds,.08);
  blend('shirt',lathe([[.052,1.41],[.058,1.455],[.054,1.5]],20,1,[cx,0,0]),['LowerArm'+s],[],.05);   // shirt cuff
  // relaxed fist: palm faces the thigh, four fingers curl loosely into the palm, thumb rests across the fingers
  const FIST=1.7,hand=(g,pos,rot=[0,0,0],k=FIST)=>{g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(1,1,1)));g.applyMatrix4(new THREE.Matrix4().makeScale(k,k,k));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(x*(-Math.PI/2+.65)));part('LowerArm'+s,'skin',g,[cx,1.31,0]);};
  hand(new THREE.CylinderGeometry(.036,.042,.1,16),[0,.09,0],[0,0,0],1);                                                          // wrist
  hand(ell(.05,.056,.046),[0,.004,0]);                                                                                      // palm / back of hand
  [[-1.5,.07,.058],[-.5,.08,.064],[.5,.076,.06],[1.5,.066,.052]].forEach(([k,L1,L2])=>{                                // fingers: knuckle -> proximal -> curled middle/tip
    const K=new THREE.Vector3(k*.032,-.012,.03),u1=new THREE.Vector3(0,-Math.cos(.55),Math.sin(.55)),u2=new THREE.Vector3(0,-Math.cos(2.6),Math.sin(2.6));
    const e1=K.clone().addScaledVector(u1,L1),c1=K.clone().addScaledVector(u1,L1/2),c2=e1.clone().addScaledVector(u2,L2/2);
    hand(cap(.0185,L1-.037),c1.toArray(),[Math.atan2(u1.z,u1.y),0,0]);hand(cap(.0175,L2-.035),c2.toArray(),[Math.atan2(u2.z,u2.y),0,0]);});
  hand(cap(.02,.06),[0,-.015,.06],[0,0,Math.PI/2]);                                                                   // thumb folded over the fingers
});

// ---------- sculpted head (metres, head centre at y=2.5; built from a high-res sphere shaped by anatomical bumps/dents) ----------
const HY=2.5,RX=.155,RY=.2,RZ=.185;
const G=(p,c,sg,a)=>{const dx=(p.x-c[0])/sg[0],dy=(p.y-c[1])/sg[1],dz=(p.z-c[2])/sg[2];return a*Math.exp(-(dx*dx+dy*dy+dz*dz)/2);};
function sculptHead(){
  const g=new THREE.SphereGeometry(1,168,126,Math.PI*1.5,Math.PI*2),pos=g.attributes.position,n=pos.count,col=new Float32Array(n*3);
  const cSkin=new THREE.Color(0xf0c3a3),cLip=new THREE.Color(0x9a4650),cBrow=new THREE.Color(0x1c1511),cTmp=new THREE.Color(),cStub=new THREE.Color(0x6b5547);
  const v=new THREE.Vector3();
  for(let i=0;i<n;i++){
    v.fromBufferAttribute(pos,i);
    let p={x:v.x*RX,y:v.y*RY,z:v.z*RZ};
    const t=sstep(.04,-.2,p.y),cr=sstep(.0,.12,p.y);p.x*=(1-.09*t)*(1+.09*cr);p.z*=(1-.04*t)*(1+.03*cr);   // egg head: broad rounded cranium tapering smoothly to a rounded chin          // jaw tapers to a firm, fairly square chin
    p.y=Math.max(p.y,-.2);
    const nm=new THREE.Vector3(p.x/(RX*RX),p.y/(RY*RY),p.z/(RZ*RZ)).normalize();
    let d=0,lip=0,brow=0,sock=0;
    for(const sx of [-1,1]){
      d+=G(p,[sx*.058,.012,.158],[.036,.03,.03],-.012);sock+=G(p,[sx*.058,-.004,.152],[.034,.03,.04],1);   // soft eye sockets (big anime eyes sit here)
      d+=G(p,[sx*.1,-.1,.07],[.04,.04,.06],.004);                                                            // gentle jaw line, slim chin
      d+=G(p,[sx*.036,-.098,.17],[.012,.012,.03],.003);                                                       // small smile corners
      d+=G(p,[sx*.085,-.06,.12],[.04,.03,.05],-.004);
                                                              // thin, straight, slightly thick brows (front.jpg)
                                                        // dark upper-lid line
    }
    d+=G(p,[0,-.01,.185],[.008,.03,.03],.005);d+=G(p,[0,-.05,.192],[.012,.01,.03],.009);                      // tiny nose
    d+=G(p,[0,-.098,.17],[.02,.006,.04],.003);d+=G(p,[0,-.112,.17],[.02,.007,.04],.004);                      // small lips
    d+=G(p,[0,-.102,.17],[.026,.0022,.05],-.004);                     // small smiling mouth
    d+=G(p,[0,-.19,.1],[.026,.02,.04],.005);                                                                   // rounded chin
    p.x+=nm.x*d;p.y+=nm.y*d;p.z+=nm.z*d;
    pos.setXYZ(i,p.x,p.y,p.z);
    cTmp.copy(cSkin).multiplyScalar(1-.14*Math.min(1,sock)).lerp(cLip,Math.min(1,lip)).lerp(cBrow,Math.min(1,brow)*.95).lerp(cStub,sstep(-.07,-.17,p.y)*sstep(.02,.1,p.z)*.32);
    col[i*3]=cTmp.r;col[i*3+1]=cTmp.g;col[i*3+2]=cTmp.b;
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.deleteAttribute('uv');g.computeVertexNormals();return g;
}
const faceGeo=sculptHead();
const surfZ=(x,y)=>{const pos=faceGeo.attributes.position;let best=1e9,z=0;for(let i=0;i<pos.count;i++){if(pos.getZ(i)<0)continue;const d=(pos.getX(i)-x)**2+(pos.getY(i)-HY-y)**2;if(d<best){best=d;z=pos.getZ(i);}}return z;};
{const geo=faceGeo,n=geo.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
 geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0,HY,0));
 for(let i=0;i<n;i++){si[i*4]=idx.Head;sw[i*4]=1;}
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));(parts.face??=[]).push(geo);}
const hl=(mat,geo,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>part('Head',mat,geo,[pos[0],HY+pos[1],pos[2]],rot,scale);
part('Neck','skin',new THREE.CylinderGeometry(.072,.088,.2,16),[0,2.27,0]);
{const my=-.09,mz=surfZ(0,-.1)+.003;   // broad closed smile (no teeth), round-ended
 const arc=new THREE.TorusGeometry(.042,.0048,6,28,Math.PI*.7);arc.rotateZ(Math.PI*1.5-Math.PI*.35);arc.scale(1,.42,.6);hl('mouth',arc,[0,my+.009,mz]);
 for(const sx of [-1,1])hl('mouth',sph(.004,12,8),[sx*.0371,my+.0014,mz],[0,0,0],[.9,.55,.65]);}
{const gz=surfZ(0,.0)+.03;hl('frame',cap(.0035,.04),[0,.008,gz],[0,0,Math.PI/2]);}   // bridge
both(x=>{
  const ex=x*.058,ey=-.004,ez=surfZ(ex,ey)-.012;
  hl('sclera',sph(.03,20,16),[ex,ey,ez],[0,0,0],[1.05,1.2,.7]);                               // big anime eye
  hl('iris',sph(.024,20,16),[ex,ey-.002,ez+.012],[0,0,0],[1,1.12,.5]);hl('pupil',sph(.0135,14,12),[ex,ey-.002,ez+.0185],[0,0,0],[1,1.1,.45]);
  hl('white',sph(.0075,10,8),[ex+x*.008,ey+.011,ez+.0225]);hl('white',sph(.0035,8,6),[ex-x*.008,ey-.011,ez+.022]);   // highlights
  {const bx=x*.066,by=.06,bz=surfZ(bx,by)+.002;hl('dark',cap(.0085,.05),[bx,by,bz],[0,x*.12,Math.PI/2+x*.12]);                    // crisp thick straight brow
   const lx=x*.058,ly=.03,lz=surfZ(lx,ly)+.002;hl('dark',cap(.0042,.052),[lx,ly,lz],[0,x*.1,Math.PI/2-x*.06]);}                  // upper lash line
  hl('skin',ell(.011,.026,.018),[x*.157,-.02,-.005],[0,x*.25,0]);                              // ears
  {const gz=surfZ(ex,ey)+.026;hl('frame',new THREE.TorusGeometry(.049,.0045,8,40),[ex,ey,gz],[0,x*.12,0]);             // round dark-frame glasses
   hl('frame',cap(.0038,.095),[x*.106,ey+.012,gz-.05],[Math.PI/2,0,0]);}                                  // temple arm


});
// hair: ordinary middle-aged fluffy hairstyle — black at the roots/crown fading smoothly to white at the ends (vertex-colour gradient) — one smooth voluminous mass with a soft side-swept top, no protrusions
{const capg=new THREE.SphereGeometry(1,48,28,0,Math.PI*2,0,Math.PI*.58);capg.scale(RX*1.09,RY*1.08,RZ*1.1);hl('hairg',capg,[0,.03,-.03],[-.3,0,0]);
 // layered volume: nested shells, each slightly larger and covering a smaller area, so steps are shallow and blend into the cap
 [[1.12,.44,"hairg"],[1.135,.34,"hairg"],[1.15,.22,"hairg"]].forEach(([k,sp,m])=>{const g=new THREE.SphereGeometry(1,48,36,0,Math.PI*2,0,Math.PI*sp);g.scale(RX*k,RY*k,RZ*k);hl('hairg',g,[0,.03,-.04],[-.3,0,0]);});
 hl('hairg',ell(.07,.03,.08),[-.04,.2,-.03],[-.5,0,.45]);
 hl('hairg',ell(.12,.032,.045),[0,.12,.14],[-1.0,0,0]);                                                                      // gentle fringe roll hugging the hairline
 both(x=>{hl('hairg',ell(.03,.07,.075),[x*.148,.045,-.02],[0,0,x*.12]);                                                     // sides over the ears
   hl('hairg',ell(.02,.05,.035),[x*.152,.0,.03],[0,0,0]);});                                                                // sideburns
}
// mahjong red-dragon tile pin on the left lapel
{const tile=box(.05,.065,.014);tile.translate(.15,1.93,torsoZ(1.93)+.03);blend('white',tile,TB,TBOUND,.1);
 const mark=box(.026,.036,.008);mark.translate(.15,1.93,torsoZ(1.93)+.04);blend('orange',mark,TB,TBOUND,.1);}

// ---------- Q-version proportions: realistic sculpt is remapped to a ~2.8-head chibi (big head, short limbs, face features kept) ----------
const QS=1.9,QCHIN=1.74,QF=[[0,0],[1.3,1.0],[2.2,1.67],[2.3,1.74]];
const fy=y=>{if(y>=2.3)return QCHIN+(y-2.3)*.6;for(let i=1;i<QF.length;i++)if(y<=QF[i][0]){const [a,b]=QF[i-1],[c,d]=QF[i];return d-(d-b)*(c-y)/(c-a);}return QCHIN;};
const hy=y=>QCHIN+(y-2.3)*QS;
{const wp=bones.map(b=>b.getWorldPosition(new THREE.Vector3())),np=wp.map((p,i)=>new THREE.Vector3(p.x,SPEC[i][0]==='Head'?hy(p.y):fy(p.y),p.z));
 bones.forEach((b,i)=>{const par=SPEC[i][1];b.position.copy(np[i]).sub(par?np[idx[par]]:new THREE.Vector3());});root.updateMatrixWorld(true);
 for(const geos of Object.values(parts))for(const g of geos){const pos=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  for(let i=0;i<pos.count;i++){let wH=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===idx.Head)wH+=sw.array[i*4+k];
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,x*(1-wH+wH*QS),(1-wH)*fy(y)+wH*hy(y),z*(1-wH+wH*QS));}
  g.computeVertexNormals();}}
const meshes=[];
for(const [mat,geos] of Object.entries(parts)){
  const anyNon=geos.some(g=>!g.index);const m=new THREE.SkinnedMesh(mergeGeometries(anyNon?geos.map(g=>g.index?g.toNonIndexed():g):geos),MATS[mat]);m.name='Body_'+mat;meshes.push(m);root.add(m);
}
const skeleton=new THREE.Skeleton(bones);
for(const m of meshes)m.bind(skeleton,new THREE.Matrix4());

// ---------- animations ----------
const REST={UpperArmL:[0,0,.12],UpperArmR:[0,0,-.12]};
const sideOf=n=>n.endsWith('L')?1:-1;
function clip(name,dur,frames){ // frames: [[t01,{Bone:[x,y,z],hy,hx,hz}]]
  const times=frames.map(f=>f[0]*dur),tracks=[];
  for(const b of SPEC){const n=b[0],vals=[];
    for(const [,p] of frames){const r=p[n]||REST[n]||[0,0,0];const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));vals.push(q.x,q.y,q.z,q.w);}
    tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`,times,vals));}
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,frames.flatMap(([,p])=>[p.hx||0,HIPQ+(p.hy||0)*.8,(p.hz||0)*.8])));
  return new THREE.AnimationClip(name,dur,tracks);
}
const gait=(A,sw,bob,lean,dir=1,splay=0)=>Array.from({length:9},(_,k)=>{const p=k/8*Math.PI*2,s=Math.sin(p)*dir,c=Math.cos(p);
  return [k/8,{hy:-Math.abs(Math.sin(p))*bob,Spine:[lean,splay?s*.2:0,0],
    UpLegL:[-s*A,0,splay*(.2+.2*s)],LowLegL:[Math.max(0,-c*dir)*A*1.1,0,0],UpLegR:[s*A,0,-splay*(.2-.2*s)],LowLegR:[Math.max(0,c*dir)*A*1.1,0,0],
    UpperArmL:[s*sw,0,.12],LowerArmL:[-.35-Math.abs(s)*.4,0,0],UpperArmR:[-s*sw,0,-.12],LowerArmR:[-.35-Math.abs(s)*.4,0,0]}];});
const idle=Array.from({length:5},(_,k)=>{const b=Math.sin(k/4*Math.PI*2);return [k/4,{hy:b*.02,Spine:[b*.02,0,0],Head:[-b*.015,0,0],UpperArmL:[-.04,0,.12],LowerArmL:[-.16,0,0],UpperArmR:[-.04,0,-.12],LowerArmR:[-.16,0,0]}];});   // relaxed standing: arms hang naturally
const fight={UpperArmL:[-.9,0,.1],LowerArmL:[-1.6,0,0],UpperArmR:[-.8,0,-.1],LowerArmR:[-1.5,0,0]};
const clips=[
  clip('Idle',2,idle),
  clip('WalkForward',.9,gait(.55,.5,.06,.04)),clip('WalkBackward',.9,gait(.5,.4,.05,-.03,-1)),
  clip('WalkLeft',.9,gait(.35,.25,.05,0,1,1)),clip('WalkRight',.9,gait(.35,.25,.05,0,1,-1)),
  clip('Run',.55,gait(.95,.9,.12,.22)),clip('Dash',.45,gait(1.1,1,.1,.5)),
  clip('DodgeLeft',.5,[[0,{}],[.4,{hy:-.15,Spine:[0,0,-.4],UpperArmL:[0,0,1.1],UpperArmR:[0,0,-.4]}],[1,{}]]),
  clip('DodgeRight',.5,[[0,{}],[.4,{hy:-.15,Spine:[0,0,.4],UpperArmL:[0,0,.4],UpperArmR:[0,0,-1.1]}],[1,{}]]),
  clip('Jump',.7,[[0,{hy:-.25,UpLegL:[-.6,0,0],LowLegL:[1,0,0],UpLegR:[-.6,0,0],LowLegR:[1,0,0]}],[.35,{hy:.3,UpLegL:[-.5,0,0],LowLegL:[.9,0,0],UpLegR:[-.2,0,0],LowLegR:[.4,0,0],UpperArmL:[-.5,0,1],UpperArmR:[-.5,0,-1]}],[1,{hy:.15,UpLegL:[-.2,0,0],UpLegR:[-.2,0,0],UpperArmL:[0,0,.8],UpperArmR:[0,0,-.8]}]]),
  clip('Landing',.35,[[0,{hy:-.3,Spine:[.3,0,0],UpLegL:[-.7,0,0],LowLegL:[1.2,0,0],UpLegR:[-.7,0,0],LowLegR:[1.2,0,0],UpperArmL:[0,0,1.1],UpperArmR:[0,0,-1.1]}],[1,{}]]),
  clip('Punch',.5,[[0,{...fight}],[.25,{Spine:[0,-.5,0],UpperArmR:[.9,0,-.5],LowerArmR:[-1.8,0,0],UpperArmL:[-1.1,0,.1],LowerArmL:[-1.6,0,0]}],[.45,{Spine:[.15,.6,0],UpperArmR:[-1.6,0,-.1],LowerArmR:[0,0,0],UpperArmL:[-.5,0,.7],LowerArmL:[-1.6,0,0],UpLegL:[.4,0,0],UpLegR:[-.45,0,0]}],[1,{...fight}]]),
  clip('Kick',.6,[[0,{...fight}],[.3,{Spine:[-.15,0,0],UpLegR:[-.3,0,0],LowLegR:[1.4,0,0],...fight}],[.55,{Spine:[-.3,0,0],hy:.02,UpLegR:[-1.6,0,0],LowLegR:[0,0,0],UpperArmL:[0,0,1.3],UpperArmR:[-.5,0,-.8]}],[1,{...fight}]]),
  clip('Skill',.9,[[0,{...fight}],[.4,{Spine:[0,-.5,0],UpperArmL:[-1.2,0,1.0],UpperArmR:[-.4,0,-.4],LowerArmL:[-.4,0,0]}],[.7,{Spine:[-.12,.5,0],UpperArmL:[-1.5,0,1.75],UpperArmR:[-1.5,0,-1.75],LowerArmL:[0,0,0],LowerArmR:[0,0,0]}],[1,{...fight}]]),
  clip('Ultimate',1.3,[[0,{...fight}],[.35,{hy:-.2,Spine:[.2,0,0],UpperArmL:[.9,0,.3],UpperArmR:[.9,0,-.3],UpLegL:[-.7,0,0],LowLegL:[1,0,0]}],[.6,{hy:.1,Spine:[-.28,0,0],UpperArmL:[-3,0,.2],UpperArmR:[-3,0,-.2]}],[.8,{hy:-.1,Spine:[.32,0,0],UpperArmL:[-1.6,0,.1],UpperArmR:[-1.6,0,-.1]}],[1,{...fight}]]),
  clip('Block',1,[[0,{hy:-.05,Spine:[-.08,0,0],UpperArmL:[-1.2,0,-.9],LowerArmL:[-1.8,0,0],UpperArmR:[-1.2,0,.9],LowerArmR:[-1.8,0,0]}],[.5,{hy:-.07,Spine:[-.08,0,0],UpperArmL:[-1.25,0,-.95],LowerArmL:[-1.8,0,0],UpperArmR:[-1.25,0,.95],LowerArmR:[-1.8,0,0]}],[1,{hy:-.05,Spine:[-.08,0,0],UpperArmL:[-1.2,0,-.9],LowerArmL:[-1.8,0,0],UpperArmR:[-1.2,0,.9],LowerArmR:[-1.8,0,0]}]]),
  clip('Hit',.4,[[0,{}],[.25,{Spine:[-.35,0,0],Head:[-.35,0,.15],UpperArmL:[0,0,1.2],UpperArmR:[0,0,-1.2]}],[1,{}]]),
  clip('Knockback',.8,[[0,{}],[.3,{hy:.35,Spine:[-.6,0,0],Head:[-.3,0,0],UpperArmL:[0,0,1.9],UpperArmR:[0,0,-1.9],UpLegL:[.5,0,0],UpLegR:[-.4,0,0]}],[1,{hy:.1,Spine:[-.5,0,0],UpperArmL:[0,0,1.6],UpperArmR:[0,0,-1.6]}]]),
  clip('Fall',.7,[[0,{Spine:[-.4,0,0]}],[.6,{hy:-.55,hz:-.5,Hips:[-1.3,0,0],Spine:[-.1,0,0],UpperArmL:[0,0,1.2],UpperArmR:[0,0,-1.2]}],[1,{hy:-.6,hz:-.5,Hips:[-1.35,0,0],UpperArmL:[0,0,1.3],UpperArmR:[0,0,-1.3]}]]),
  clip('GetUp',.9,[[0,{hy:-.6,hz:-.5,Hips:[-1.35,0,0]}],[.5,{hy:-.35,hz:-.2,Hips:[-.6,0,0],Spine:[.5,0,0],UpLegL:[-1.2,0,0],LowLegL:[1.6,0,0]}],[1,{...fight}]]),
  clip('Victory',1.6,[[0,{UpperArmR:[-2.9,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.5],LowerArmL:[-1.2,0,0]}],[.25,{hy:.05,Spine:[0,0,.05],UpperArmR:[-2.9,0,-.7],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.5],LowerArmL:[-1.2,0,0]}],[.5,{UpperArmR:[-2.9,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.5],LowerArmL:[-1.2,0,0]}],[.75,{hy:.05,Spine:[0,0,-.05],UpperArmR:[-2.9,0,-.7],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.5],LowerArmL:[-1.2,0,0]}],[1,{UpperArmR:[-2.9,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.5],LowerArmL:[-1.2,0,0]}]])
];
const out=new URL('../public/assets/characters/character-03/fighter.glb',import.meta.url);
const glb=await new Promise((res,rej)=>new GLTFExporter().parse(root,res,rej,{binary:true,animations:clips,onlyVisible:false}));
fs.writeFileSync(out,Buffer.from(glb));
console.log('wrote',out.pathname,(glb.byteLength/1024).toFixed(0)+' KB,',clips.length,'clips,',bones.length,'bones');
