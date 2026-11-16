import * as THREE from 'three';
import {fighterOf} from './ecs/entities.js';
import {mat,toonMat,toonRamp,floorMat,gold,dark,skin,white,black} from './materials.js';
export const mount = document.querySelector('#arena');
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x182449);
scene.fog = new THREE.Fog(0x182449, 16, 38);
export const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc8ddff, 0x28304c, 2.0));
const keyLight = new THREE.DirectionalLight(0xffe0ba, 3.1); keyLight.position.set(-5, 10, 7); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024,1024); scene.add(keyLight);
const rimLight = new THREE.PointLight(0x4a9dff, 22, 18); rimLight.position.set(5,4,-5); scene.add(rimLight);
const floor = new THREE.Mesh(new THREE.CylinderGeometry(9,9,.35,64), floorMat); floor.position.y=-.2; floor.receiveShadow=true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.TorusGeometry(7.7,.055,8,100), gold); ring.rotation.x=Math.PI/2; ring.position.y=.0; scene.add(ring);
const grid = new THREE.GridHelper(18,18,0x6176b4,0x3d4a77); grid.position.y=-.015; scene.add(grid);
// Distant stylized Taiwan city skyline.
for(let i=0;i<24;i++){
  const h=1.2+Math.random()*4.2, w=.45+Math.random()*.65;
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,.7),mat(i%3===0?0x344775:0x26365f,.8));
  b.position.set((i-11.5)*1.25,h/2-0.1,-8.5-Math.random()*2); b.castShadow=true; scene.add(b);
  for(let y=.5;y<h-.2;y+=.55){const win=new THREE.Mesh(new THREE.BoxGeometry(.09,.13,.02),mat(i%2?0x78b9da:0xffc86e,.35,.2));win.position.set(b.position.x-w*.22,y,b.position.z+.36);scene.add(win);}
}
// Landmark silhouette: a deliberately generic, fictional tower, not a precise replica.
const tower = new THREE.Group();
const shaft=new THREE.Mesh(new THREE.BoxGeometry(.65,4.4,.65),mat(0x536b9b,.45,.25));shaft.position.y=2.2;tower.add(shaft);
for(let i=0;i<4;i++){const deck=new THREE.Mesh(new THREE.BoxGeometry(1.05-i*.12,.22,1.05-i*.12),gold);deck.position.y=1.2+i*.85;tower.add(deck);}
tower.position.set(6,0,-7);scene.add(tower);
export function initResize(){
  function resize(){const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(mount);resize();
}
let shake={t:0,dur:1,mag:0},shakeOff=new THREE.Vector3();
export function addCameraShake(mag,dur=.3){if(mag>=shake.mag*Math.max(0,shake.t/shake.dur))shake={t:dur,dur,mag};}
export const camState={yaw:0,pitch:.24,drag:false,last:{x:0,y:0}};
export function updateCamera(world,dt=1/60){
  const a=world.get(fighterOf(world,'player'),'transform'),b=world.get(fighterOf(world,'cpu'),'transform');
  const focus=new THREE.Vector3((a.x+b.x)/2,((a.y+b.y)/2),(a.z+b.z)/2);const radius=13;
  const desired=new THREE.Vector3(focus.x+Math.sin(camState.yaw)*radius,5.2+camState.pitch*5,focus.z+Math.cos(camState.yaw)*radius);
  camera.position.sub(shakeOff);camera.position.lerp(desired,.06);
  shakeOff.set(0,0,0);
  if(shake.t>0){shake.t-=dt;const k=Math.max(0,shake.t/shake.dur)*shake.mag;shakeOff.set((Math.random()-.5)*k,(Math.random()-.5)*k,(Math.random()-.5)*k);}
  camera.position.add(shakeOff);camera.lookAt(focus.x,1.05,focus.z);
}
