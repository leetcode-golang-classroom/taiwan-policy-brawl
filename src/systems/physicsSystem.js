import {GRAVITY,HIT_REACT,KNOCK} from '../config.js';
import {clampToArena} from './combatSystem.js';

export function physicsSystem(world,dt){
  if(!world.match.running||world.match.ended)return;
  for(const id of world.query('transform','body')){
    const t=world.get(id,'transform'),b=world.get(id,'body'),st=world.get(id,'status');
    if(st?.frozen)continue;   // hit stop: hold position and arc
    if(st?.kbTime>0){   // knockback: velocity decays linearly, so it eases out instead of popping
      const h=Math.min(dt,st.kbTime),f=(st.kbTime-h/2)/st.kbDur;   // midpoint of this step: the integral of the linear ramp is exact, whatever the frame rate
      t.x+=st.kbVx*f*h;t.z+=st.kbVz*f*h;
      st.kbTime=Math.max(0,st.kbTime-dt);if(st.kbTime===0){st.kbVx=0;st.kbVz=0;}
    }
    if(!b.grounded){
      b.vy-=GRAVITY*dt;t.y+=b.vy*dt;
      if(t.y<=0){t.y=0;b.vy=0;b.grounded=true;const hard=!!st?.airHit;
        if(st){st.airHit=false;if(hard){st.landTimer=HIT_REACT.landTime;st.stun=Math.max(st.stun,HIT_REACT.landTime);}}
        world.events.emit('land',{id,hard});}
    }
    clampToArena(t);
  }
  separateFighters(world);
}
// Two fighters on (nearly) the same height can never overlap: both are pushed apart along the line between them.
function separateFighters(world){
  const ids=world.query('fighter','transform');if(ids.length<2)return;
  const [a,b]=ids.map(i=>world.get(i,'transform')),fa=world.get(ids[0],'status'),fb=world.get(ids[1],'status');
  if(fa?.frozen||fb?.frozen||Math.abs(a.y-b.y)>KNOCK.sepHeight)return;   // airborne fighters may pass over
  let dx=b.x-a.x,dz=b.z-a.z;const d=Math.hypot(dx,dz);
  if(d>=KNOCK.minSep)return;
  if(d<1e-4){dx=1;dz=0;}else{dx/=d;dz/=d;}
  const push=(KNOCK.minSep-d)/2;
  a.x-=dx*push;a.z-=dz*push;b.x+=dx*push;b.z+=dz*push;clampToArena(a);clampToArena(b);
}
