// Match-victory pose data (pure: no Three / DOM, unit-testable). One keyframe track per character, authored with the same
// conventions as the GLB build tools (tools/build-character-0N.mjs): bone rotations are Euler XYZ in radians, absolute
// (arms rest at z = ±.12). UpperArm x < 0 lifts the arm forward / overhead (-2.9 = straight up); UpperArmL z > 0 and UpperArmR z < 0
// swing outward; LowerArm x < 0 bends the elbow. Spine x < 0 leans back. hy = hips height, jump = whole-body hop (world units),
// turn = extra root yaw (rad).
export const BONES=['Hips','Spine','Chest','Neck','Head','UpperArmL','LowerArmL','UpperArmR','LowerArmR','UpLegL','LowLegL','UpLegR','LowLegR'];
export const NEUTRAL=Object.freeze({UpperArmL:[-.04,0,.12],UpperArmR:[-.04,0,-.12],LowerArmL:[-.16,0,0],LowerArmR:[-.16,0,0]});

const A2=(l,r)=>({UpperArmL:l,UpperArmR:r});
const V={ // frequently used arm shapes
  up:{UpperArmL:[-2.9,0,.5],UpperArmR:[-2.9,0,-.5],LowerArmL:[-.2,0,0],LowerArmR:[-.2,0,0]},
  flexL:{UpperArmL:[0,0,1.55],LowerArmL:[-2.4,0,0]},flexR:{UpperArmR:[0,0,-1.55],LowerArmR:[-2.4,0,0]},
  hips:{UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0],UpperArmR:[-.2,0,-.9],LowerArmR:[-1.9,0,0]},
  heart:{UpperArmL:[-1.5,0,-.3],LowerArmL:[-1.9,0,0],UpperArmR:[-1.5,0,.3],LowerArmR:[-1.9,0,0]},
};
const J=(t,p)=>[t,p];

// Each track: dur (seconds of the character animation proper), keyframes [t01, pose], and `beats`: named moments (t01) that effects hook to.
export const VICTORY={
  mech:{dur:4.4,beats:{badge:.3,halo:.55},frames:[ // 01 AI 推廣者: grab the tech badge, hold it up, digital V pose
    J(0,{}),J(.15,{UpperArmR:[-1.2,0,-.5],LowerArmR:[-1.4,0,0],Spine:[0,.3,0]}),
    J(.35,{UpperArmR:[-2.9,0,-.4],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.7],LowerArmL:[-1.2,0,0],Head:[-.15,0,0],hy:.04}),
    J(.6,{...V.up,UpperArmL:[-2.9,0,.7],UpperArmR:[-2.9,0,-.7],Spine:[-.15,0,0],Head:[-.3,0,0],hy:.12}),
    J(.8,{...V.up,UpperArmL:[-2.9,0,.7],UpperArmR:[-2.9,0,-.7],Spine:[-.2,0,.05],Head:[-.3,0,0],hy:.2}),
    J(1,{UpperArmR:[-2.7,0,-.8],UpperArmL:[-.9,0,1.1],LowerArmL:[-.3,0,0],LowerArmR:[-.2,0,0],Spine:[-.12,.2,0],Head:[-.2,.2,0],hy:.04})]},
  leopard:{dur:4.6,beats:{roots:.25,bloom:.8},frames:[ // 02 大樹守護者: arms open, rise slowly, guardian stance
    J(0,{}),J(.25,{UpperArmL:[0,0,1.2],UpperArmR:[0,0,-1.2],Head:[-.1,0,0]}),
    J(.55,{UpperArmL:[-1.2,0,2.2],UpperArmR:[-1.2,0,-2.2],Spine:[-.1,0,0],Head:[-.35,0,0],hy:.05}),
    J(.8,{UpperArmL:[-2.4,0,1],UpperArmR:[-2.4,0,-1],LowerArmL:[-.2,0,0],LowerArmR:[-.2,0,0],Spine:[-.18,0,0],Head:[-.4,0,0],hy:.1}),
    J(1,{UpperArmL:[-.4,0,1.5],UpperArmR:[-.4,0,-1.5],Spine:[-.08,0,0],Head:[-.15,0,0],UpLegL:[0,0,.1],UpLegR:[0,0,-.1]})]},
  admiral:{dur:4.4,beats:{draw:.4,throw:.7},frames:[ // 03 麻將大叔: smug, draw a tile, fling it, smug again
    J(0,{}),J(.2,{...V.hips,Spine:[-.12,0,0],Head:[-.15,0,0]}),
    J(.4,{UpperArmR:[-1.5,0,-.4],LowerArmR:[-1.3,0,0],UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0],Spine:[-.1,.3,0]}),
    J(.55,{UpperArmR:[-.4,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0],Spine:[.12,-.5,0],hy:-.05}),
    J(.7,{UpperArmR:[-2.5,0,-.2],LowerArmR:[0,0,0],UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0],Spine:[-.2,.5,0],hy:.12}),
    J(1,{UpperArmR:[-2.9,0,-.5],LowerArmR:[-.1,0,0],UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0],Spine:[-.2,0,0],Head:[-.25,0,0],hy:.02})]},
  mage:{dur:4.4,beats:{book:.2,flip:.45,rise:.7},frames:[ // 04 教育推廣者: book out, pages flip, book up, point at the sky
    J(0,{}),J(.2,{UpperArmL:[-1.3,0,.3],LowerArmL:[-1.4,0,0],UpperArmR:[-.5,0,-.3]}),
    J(.45,{UpperArmL:[-1.6,0,.1],LowerArmL:[-1,0,0],UpperArmR:[-1.2,0,-.2],LowerArmR:[-1.4,0,0],Head:[.2,0,0]}),
    J(.7,{UpperArmL:[-2.9,0,.3],LowerArmL:[-.3,0,0],UpperArmR:[-.6,0,-.5],Head:[-.3,0,0],Spine:[-.1,0,0]}),
    J(1,{UpperArmL:[-2.9,0,.4],LowerArmL:[-.3,0,0],UpperArmR:[-2.9,0,-.2],LowerArmR:[0,0,0],Head:[-.35,0,0],Spine:[-.18,0,0],hy:.04})]},
  cleric:{dur:4.6,beats:{staff:.25,bless:.8},frames:[ // 05 神職人員: hold the staff, raise it, open arms in blessing
    J(0,{}),J(.25,{UpperArmR:[-1.2,0,-.3],LowerArmR:[-1.2,0,0]}),
    J(.5,{UpperArmR:[-2.2,0,-.4],LowerArmR:[-.3,0,0],UpperArmL:[-.4,0,.6],Head:[-.2,0,0]}),
    J(.8,{UpperArmL:[-1,0,1.8],UpperArmR:[-1,0,-1.8],LowerArmL:[-.3,0,0],LowerArmR:[-.3,0,0],Head:[-.35,0,0],Spine:[-.12,0,0],hy:.08}),
    J(1,{UpperArmL:[-1,0,1.8],UpperArmR:[-1,0,-1.8],LowerArmL:[-.3,0,0],LowerArmR:[-.3,0,0],Head:[-.35,0,0],Spine:[-.12,0,0],hy:.04})]},
  brawler:{dur:4.2,beats:{flex:.4,land:.7},frames:[ // 06 健身肌肉大叔: chest out, double biceps, jump + fist pump, champion pose
    J(0,{}),J(.2,{UpperArmL:[-.3,0,.9],UpperArmR:[-.3,0,-.9],LowerArmL:[-.4,0,0],LowerArmR:[-.4,0,0],Spine:[-.18,0,0],Head:[-.1,0,0]}),
    J(.4,{...V.flexL,...V.flexR,Spine:[-.1,0,0],Head:[-.1,0,0],UpLegL:[0,0,.15],UpLegR:[0,0,-.15]}),
    J(.5,{UpperArmR:[-2.9,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.8],hy:-.1,UpLegL:[-.4,0,.1],LowLegL:[.7,0,0],UpLegR:[-.4,0,-.1],LowLegR:[.7,0,0]}),
    J(.6,{UpperArmR:[-2.9,0,-.3],LowerArmR:[-.2,0,0],UpperArmL:[-.4,0,.8],jump:.9,Spine:[-.15,0,0]}),
    J(.7,{...V.flexL,...V.flexR,hy:-.15,UpLegL:[-.5,0,.2],LowLegL:[.8,0,0],UpLegR:[-.5,0,-.2],LowLegR:[.8,0,0]}),
    J(1,{UpperArmR:[-2.9,0,-.4],LowerArmR:[-.2,0,0],...V.flexL,Spine:[-.12,0,.05],Head:[-.15,0,0],UpLegL:[0,0,.12],UpLegR:[0,0,-.12]})]},
  nun:{dur:4.4,beats:{smash:.5},frames:[ // 07 拆遷王: fist, hammer overhead, smash the ground (cracks), rest it on the shoulder
    J(0,{}),J(.15,{UpperArmR:[-1.4,0,-.3],LowerArmR:[-1.6,0,0],Spine:[0,.2,0]}),
    J(.35,{UpperArmR:[-3,0,-.2],LowerArmR:[-.3,0,0],UpperArmL:[-3,0,.2],LowerArmL:[-.3,0,0],Spine:[-.35,0,0],hy:.1}),
    J(.5,{UpperArmR:[-.6,0,-.2],LowerArmR:[-.2,0,0],UpperArmL:[-.6,0,.2],LowerArmL:[-.2,0,0],Spine:[.55,0,0],hy:-.2,UpLegL:[-.4,0,0],UpLegR:[.3,0,0]}),
    J(.75,{Spine:[.1,0,0],UpperArmR:[-1,0,-.5],LowerArmR:[-1,0,0],UpperArmL:[0,0,.5]}),
    J(1,{UpperArmR:[-.9,0,-.9],LowerArmR:[-1.9,0,0],UpperArmL:[-2.9,0,.4],Spine:[-.1,.2,0],Head:[-.2,0,0],hy:.02})]},
  yu:{dur:4.4,beats:{flag:.4,done:.75},frames:[ // 08 工程總指揮: salute, wave the flag, completion light, commander pose
    J(0,{}),J(.2,{UpperArmR:[-2.4,0,-.5],LowerArmR:[-2.2,0,0]}),J(.4,{UpperArmR:[-2.9,0,-.5],LowerArmR:[-.2,0,0]}),
    J(.55,{UpperArmR:[-2.9,0,-.95],LowerArmR:[-.2,0,0]}),J(.7,{UpperArmR:[-2.9,0,-.2],LowerArmR:[-.2,0,0]}),
    J(.85,{UpperArmR:[-2.9,0,-.7],LowerArmR:[-.2,0,0],UpperArmL:[-.3,0,.5],Spine:[-.15,0,0],hy:.1}),
    J(1,{UpperArmR:[-2.9,0,-.5],LowerArmR:[-.2,0,0],...{UpperArmL:[-.2,0,.9],LowerArmL:[-1.9,0,0]},Spine:[-.12,0,0],Head:[-.15,0,0]})]},
  bubble:{dur:4.2,beats:{heart:.2,hop:.4},frames:[ // 09 家庭計畫推廣員: heart hands, two hops, wave, cute pose
    J(0,{}),J(.2,{...V.heart,Head:[0,0,.15]}),J(.35,{...V.heart,Head:[0,0,.15],hy:-.12,UpLegL:[-.5,0,0],LowLegL:[.8,0,0],UpLegR:[-.5,0,0],LowLegR:[.8,0,0]}),
    J(.45,{...V.heart,Head:[0,0,.15],jump:.55}),J(.55,{...V.heart,hy:-.12,UpLegL:[-.5,0,0],LowLegL:[.8,0,0],UpLegR:[-.5,0,0],LowLegR:[.8,0,0]}),
    J(.65,{...V.heart,Head:[0,0,-.15],jump:.55}),J(.75,{UpperArmR:[-2.9,0,-.7],UpperArmL:[-.3,0,.4],hy:-.1,Head:[0,0,.2]}),
    J(1,{...V.heart,Head:[0,0,.2],Spine:[0,0,.08],UpLegR:[.4,0,0],LowLegR:[.9,0,0]})]},
};
export const VICTORY_IDS=Object.keys(VICTORY);

// Timeline on the real clock: winner banner -> camera turn / push-in -> character animation -> hold (UI buttons appear).
export const TIMELINE={announce:.6,transition:1};
export const victoryDuration=id=>TIMELINE.announce+TIMELINE.transition+(VICTORY[id]?.dur??3);

const sm=x=>x*x*(3-2*x);
const lerp=(a,b,k)=>a+(b-a)*k;
const lerp3=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
/** Pose of `id` at `t` seconds into its animation (t > dur holds the last keyframe with a slow breathing sway). Returns {bone:[x,y,z], hy, jump, turn}. */
export function poseAt(id,t){
  const tr=VICTORY[id]||VICTORY.mech,u=Math.max(0,t)/tr.dur,F=tr.frames;
  let i=0;while(i<F.length-1&&F[i+1][0]<=u)i++;
  const a=F[i],b=F[Math.min(i+1,F.length-1)],k=b[0]>a[0]?sm(Math.min(1,Math.max(0,(u-a[0])/(b[0]-a[0])))):0;
  const out={hy:0,jump:0,turn:0};
  for(const n of BONES){
    const A=a[1][n]||NEUTRAL[n]||[0,0,0],B=b[1][n]||NEUTRAL[n]||[0,0,0];out[n]=lerp3(A,B,k);
  }
  out.hy=lerp(a[1].hy||0,b[1].hy||0,k);out.jump=lerp(a[1].jump||0,b[1].jump||0,k);
  if(u>1){const s=Math.sin((t-tr.dur)*2.2);out.hy+=s*.015;out.Spine=[out.Spine[0]+s*.015,out.Spine[1],out.Spine[2]];}   // held pose breathes
  return out;
}
export const beatTime=(id,name)=>(VICTORY[id]?.beats[name]??0)*(VICTORY[id]?.dur??1);
