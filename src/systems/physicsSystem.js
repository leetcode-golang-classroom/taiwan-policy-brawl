import {AIR,GRAVITY,HIT_REACT,KNOCK} from '../config.js';
import {clampToArena,damage} from './combatSystem.js';
import {registerComboHit} from './comboSystem.js';

export function physicsSystem(world,dt){
  // No running/ended guard: a fighter airborne at the KO (launched or mid-jump) must still fall and land, otherwise it hangs
  // in the air through the round transition and forever after the last round. Standing fighters are a no-op here.
  for(const id of world.query('transform','body')){
    const t=world.get(id,'transform'),b=world.get(id,'body'),st=world.get(id,'status');
    if(st?.frozen)continue;   // hit stop: hold position and arc
    if(st?.kbTime>0){   // knockback: velocity decays linearly, so it eases out instead of popping
      const h=Math.min(dt,st.kbTime),f=(st.kbTime-h/2)/st.kbDur;   // midpoint of this step: the integral of the linear ramp is exact, whatever the frame rate
      t.x+=st.kbVx*f*h;t.z+=st.kbVz*f*h;
      st.kbTime=Math.max(0,st.kbTime-dt);if(st.kbTime===0){st.kbVx=0;st.kbVz=0;}
    }
    if(!b.grounded){
      if(st?.chaseTimer>0){clampToArena(t);continue;}   // chase glide: chaseSystem owns the height
      const cb=world.get(id,'combo'),hover=cb?.hits>0&&!world.get(cb.targetId,'body')?.grounded;   // attacker juggling an airborne victim floats so the air combo can connect
      b.vy-=GRAVITY*(hover?AIR.hoverGravity:st?.airHits>0&&st.stun>0&&st.slamBy==null?AIR.juggleGravity:1)*dt;t.y+=b.vy*dt;
      if(t.y<=0){t.y=0;b.vy=0;b.grounded=true;const hard=!!st?.airHit;
        if(st){st.airHit=false;if(hard){st.landTimer=HIT_REACT.landTime;st.stun=Math.max(st.stun,HIT_REACT.landTime);}}
        let slam=false;
        if(st?.slamBy!=null){   // ground slam impact: bonus damage, counts in the attacker's combo
          slam=true;const by=st.slamBy;st.slamBy=null;
          const dealt=damage(world,id,AIR.slamDamage,by);st.stun=Math.max(st.stun,AIR.slamStun*.6);st.hitStop=Math.max(st.hitStop,AIR.slamHitStop);
          registerComboHit(world,by,id,dealt);
          world.events.emit('slamLand',{attackerId:by,targetId:id,amount:dealt});
        }
        if(st)st.airHits=0;
        world.events.emit('land',{id,hard,slam});}
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
