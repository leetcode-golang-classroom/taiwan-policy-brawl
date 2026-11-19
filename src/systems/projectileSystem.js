import {sub,normalize,angleBetween,dist} from '../ecs/math.js';
import {Projectile} from '../ecs/components.js';
import {resolveHit,bodyCenter} from './combatSystem.js';

const BODY_RADIUS=.55;

// Logical flying object: speed, max range, collision, optional homing. Visuals are bound by the presentation layer.
export function spawnProjectile(world,{ownerId,targetId,skill,pos,dir,onHit}){
  return world.create({projectile:Projectile({ownerId,targetId,skill,pos,dir:normalize(dir),onHit})});
}
function finish(world,id,hit){
  const p=world.get(id,'projectile');
  world.events.emit('projectileEnd',{id,hit,pos:{...p.pos}});
  world.destroy(id);
}
export function projectileSystem(world,dt){
  if(!world.match.running)return;
  for(const id of world.query('projectile')){
    const p=world.get(id,'projectile'),s=p.skill;
    const center=bodyCenter(world,p.targetId);
    if(s.tracking&&dist(p.pos,center)<=s.trackRange){
      const want=normalize(sub(center,p.pos)),ang=angleBetween(p.dir,want),maxTurn=s.turnRate*dt;
      if(ang>1e-4){const k=Math.min(1,maxTurn/ang);p.dir=normalize({x:p.dir.x+(want.x-p.dir.x)*k,y:p.dir.y+(want.y-p.dir.y)*k,z:p.dir.z+(want.z-p.dir.z)*k});}
    }
    const step=s.speed*dt;p.pos.x+=p.dir.x*step;p.pos.y+=p.dir.y*step;p.pos.z+=p.dir.z*step;p.travelled+=step;
    if(dist(p.pos,center)<s.radius+BODY_RADIUS){
      const st=world.get(p.targetId,'status');
      if(st.dodgeInvuln>0){ // dodging: pass through, report once
        if(!p.evaded){p.evaded=true;world.events.emit('evade',{attackerId:p.ownerId,targetId:p.targetId,skill:s});}
      } else if(st.reflect>0){ // 乾坤之動: the projectile is sent back at its owner
        const owner=p.ownerId,oc=bodyCenter(world,owner);
        p.ownerId=p.targetId;p.targetId=owner;p.dir=normalize(sub(oc,p.pos));p.travelled=0;p.onHit=undefined;
        world.events.emit('reflect',{attackerId:owner,targetId:p.ownerId,skill:s,projectileId:id});
        continue;
      } else {
        resolveHit(world,p.ownerId,p.targetId,s,{dir:p.dir,onHit:p.onHit});
        finish(world,id,true);continue;
      }
    }
    if(p.travelled>=s.range)finish(world,id,false);
  }
}
export function clearProjectiles(world){for(const id of world.query('projectile'))finish(world,id,false);}
