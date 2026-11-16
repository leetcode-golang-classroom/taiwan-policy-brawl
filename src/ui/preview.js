import * as THREE from 'three';
import {makeFighter} from '../characters/makeFighter.js';

// Character-select 3D showcase: its own small renderer/scene, showing both sides' chosen fighters on turntables.
// Models are built once per (side,id) and re-parented from the battle scene (makeFighter adds to it), then cached.
export function initPreview(mount){
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  mount.prepend(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x182449);
  const camera=new THREE.PerspectiveCamera(36,1,.1,50);camera.position.set(0,2.3,10.5);camera.lookAt(0,1.15,0);
  scene.add(new THREE.HemisphereLight(0xc8ddff,0x28304c,2.2));
  const key=new THREE.DirectionalLight(0xffe0ba,3);key.position.set(-3,6,5);scene.add(key);
  const rim=new THREE.PointLight(0x4a9dff,18,14);rim.position.set(3,3,-3);scene.add(rim);
  const slots={};
  for(const [side,x] of [['player',-1.7],['cpu',1.7]]){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.12,40),new THREE.MeshBasicMaterial({color:0x3d4a77}));
    base.position.set(x,-.06,0);base.visible=false;scene.add(base);
    slots[side]={x,base,obj:null};
  }
  const cache=new Map();
  function resize(){const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(mount);resize();
  let t=0,last=performance.now(),active='player';
  (function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(!mount.clientWidth)return;                  // select screen hidden: skip rendering
    t+=dt;
    for(const [side,s] of Object.entries(slots)){
      if(s.obj){s.obj.rotation.y=t*.9+(side==='cpu'?Math.PI/3:0);s.obj.position.y=Math.sin(t*2+s.x)*.03;}
      s.base.material.color.set(side===active?0xffc15c:0x3d4a77);
    }
    renderer.render(scene,camera);
  })(performance.now());
  return {
    show(side,profile){
      const s=slots[side];if(s.obj)s.obj.visible=false;
      if(!profile){s.obj=null;s.base.visible=false;return;}
      const key=side+':'+profile.id;let obj=cache.get(key);
      if(!obj){obj=makeFighter(profile);scene.add(obj);cache.set(key,obj);}
      obj.position.set(s.x,0,0);obj.visible=true;s.obj=obj;s.base.visible=true;
    },
    setActive(side){active=side;}
  };
}
