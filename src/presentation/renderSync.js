// Copies logic Transform -> Three.js object. The only place where ECS data flows into the scene graph.
export function syncView(world,id){
  const v=world.get(id,'view');if(!v)return;
  const t=world.get(id,'transform');
  v.obj.position.set(t.x,t.y,t.z);v.obj.rotation.y=t.rotY+(v.obj.userData.spinY||0);
}
export function syncViews(world){for(const id of world.query('view','transform'))syncView(world,id);}
