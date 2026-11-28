// Copies logic Transform -> Three.js object. The only place where ECS data flows into the scene graph.
// Fighters get a visual "jump absorber": when the simulation moves a fighter in one step (dodge, knockback, step-in),
// the view keeps its old position and glides to the new one, so the body never pops. Logic positions are untouched (netplay-safe).
const GLIDE=.22,MIN_JUMP=.45,MAX_JUMP=6;   // seconds to blend, smallest step treated as a jump, largest (bigger = respawn, snap)
let lastNow=0;
export function syncView(world,id,dt=1/60){
  const v=world.get(id,'view');if(!v)return;
  const t=world.get(id,'transform'),o=v.obj;
  if(o.userData.limbs){   // fighter
    const s=(o.userData.glide??=({px:t.x,pz:t.z,ox:0,oz:0}));
    const jx=t.x-s.px,jz=t.z-s.pz,jump=Math.hypot(jx,jz);
    if(world.match?.running&&jump>MIN_JUMP&&jump<MAX_JUMP){s.ox-=jx;s.oz-=jz;}   // keep showing the old spot, then ease out the gap
    else if(jump>=MAX_JUMP||!world.match?.running){s.ox=0;s.oz=0;}
    s.px=t.x;s.pz=t.z;
    const k=Math.exp(-dt*3/GLIDE);s.ox*=k;s.oz*=k;if(Math.abs(s.ox)<1e-3)s.ox=0;if(Math.abs(s.oz)<1e-3)s.oz=0;
    o.position.set(t.x+s.ox,t.y+(o.userData.liftY||0),t.z+s.oz);
  } else o.position.set(t.x,t.y,t.z);
  o.rotation.y=t.rotY+(o.userData.spinY||0);
}
export function syncViews(world){
  const now=performance.now(),dt=lastNow?Math.min(.1,(now-lastNow)/1000):1/60;lastNow=now;
  for(const id of world.query('view','transform'))syncView(world,id,dt);
}
