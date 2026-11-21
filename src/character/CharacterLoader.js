import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {assetUrl,hasAssetSlot} from './CharacterRegistry.js';

const loader=new GLTFLoader();
const cache=new Map();   // id -> Promise<{gltf,meta}|null>
let pending=0;
function setLoading(delta){
  pending+=delta;
  if(typeof document==='undefined')return;
  let el=document.getElementById('model-loading');
  if(!el&&pending>0){el=document.createElement('div');el.id='model-loading';el.textContent='載入角色模型中…';el.style.cssText='position:fixed;right:12px;bottom:12px;padding:6px 12px;background:#000a;color:#fff;font:13px sans-serif;border-radius:6px;z-index:50;pointer-events:none';document.body.appendChild(el);}
  if(el)el.style.display=pending>0?'block':'none';
}
async function fetchMeta(url){
  try{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)return null;return await r.json();}catch{return null;}
}
// Resolves {gltf,meta} for a ready model, or null (placeholder/missing/failed) — never rejects, so the game always starts.
export function loadCharacterAsset(id){
  if(!hasAssetSlot(id))return Promise.resolve(null);
  if(cache.has(id))return cache.get(id);
  const p=(async()=>{
    const meta=await fetchMeta(assetUrl(id,'metadata.json'));
    if(!meta||meta.status!=='ready')return null;          // placeholder: no GLB shipped yet, avoids a 404 on fighter.glb
    setLoading(1);
    try{const gltf=await loader.loadAsync(assetUrl(id,meta.model||'fighter.glb'));return {gltf,meta};}
    catch(e){console.warn(`[character ${id}] GLB failed, using placeholder`,e);return null;}
    finally{setLoading(-1);}
  })();
  cache.set(id,p);return p;
}
