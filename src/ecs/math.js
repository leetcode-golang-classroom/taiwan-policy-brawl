// Plain-object vector helpers (no Three.js so logic is testable in Node).
export const v3=(x=0,y=0,z=0)=>({x,y,z});
export const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const length=v=>Math.hypot(v.x,v.y,v.z);
export const horizontalLength=v=>Math.hypot(v.x,v.z);
export const normalize=v=>{const l=length(v);return l>1e-9?{x:v.x/l,y:v.y/l,z:v.z/l}:{x:0,y:0,z:0};};
export const dist=(a,b)=>length(sub(a,b));
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const angleBetween=(a,b)=>{const d=a.x*b.x+a.y*b.y+a.z*b.z;return Math.acos(clamp(d/((length(a)*length(b))||1),-1,1));};
