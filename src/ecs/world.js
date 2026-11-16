import {Match} from './components.js';

// Minimal synchronous event bus. Logic systems emit; presentation (VFX/HUD) subscribes.
export class EventBus{
  constructor(){this.handlers=new Map();}
  on(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);return ()=>this.off(name,fn);}
  off(name,fn){const a=this.handlers.get(name);if(!a)return;const i=a.indexOf(fn);if(i>=0)a.splice(i,1);}
  emit(name,payload){const a=this.handlers.get(name);if(a)for(const fn of [...a])fn(payload);}
}

// ECS world: entities are numeric ids, components are plain data stored per name.
export class World{
  constructor({rng=Math.random}={}){
    this.nextId=1;this.entities=new Set();this.stores=new Map();
    this.events=new EventBus();this.rng=rng;this.time=0;
    this.match=Match(); // singleton resource: round / timer state
  }
  create(components={}){
    const id=this.nextId++;this.entities.add(id);
    for(const [name,data] of Object.entries(components))this.add(id,name,data);
    return id;
  }
  destroy(id){
    if(!this.entities.delete(id))return;
    for(const store of this.stores.values())store.delete(id);
  }
  add(id,name,data){
    if(!this.stores.has(name))this.stores.set(name,new Map());
    this.stores.get(name).set(id,data);return data;
  }
  get(id,name){return this.stores.get(name)?.get(id);}
  has(id,name){return !!this.stores.get(name)?.has(id);}
  remove(id,name){this.stores.get(name)?.delete(id);}
  // ids having ALL the named components (returns a fresh array: safe to destroy while iterating)
  query(...names){
    const first=this.stores.get(names[0]);if(!first)return [];
    const out=[];
    for(const id of first.keys()){if(names.every(n=>this.stores.get(n)?.has(id)))out.push(id);}
    return out;
  }
}
