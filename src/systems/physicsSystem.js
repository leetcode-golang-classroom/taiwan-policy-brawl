import {GRAVITY,HIT_REACT} from '../config.js';
import {clampToArena} from './combatSystem.js';

export function physicsSystem(world,dt){
  if(!world.match.running||world.match.ended)return;
  for(const id of world.query('transform','body')){
    const t=world.get(id,'transform'),b=world.get(id,'body');
    if(world.get(id,'status')?.frozen)continue;   // hit stop: hold the arc, still clamp below is skipped (position unchanged)
    if(!b.grounded){
      b.vy-=GRAVITY*dt;t.y+=b.vy*dt;
      if(t.y<=0){t.y=0;b.vy=0;b.grounded=true;const st=world.get(id,'status'),hard=!!st?.airHit;
        if(st){st.airHit=false;if(hard){st.landTimer=HIT_REACT.landTime;st.stun=Math.max(st.stun,HIT_REACT.landTime*.6);}}
        world.events.emit('land',{id,hard});}
    }
    clampToArena(t);
  }
}
