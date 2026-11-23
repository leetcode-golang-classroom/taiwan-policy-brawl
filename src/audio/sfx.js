// KOF-style power-charge ("集氣") sound, synthesised with WebAudio (no assets). Presentation layer only.
// While a move is charged: a rising energy hum (detuned saws + sub rumble) whose pitch climbs, an airy noise swell
// sweeping upward, and a crackle of ki sparks (amplitude-chopped noise) that speeds up as the charge fills.
// On a completed charge a bright "ting" snap marks the release. An interrupted charge just fades out.
let ctx=null,master=null,noiseBuf=null;
export const sfxState={muted:false};
function ensure(){
  if(ctx)return ctx;
  const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;
  ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*1,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ctx;
}
export function unlockAudio(){const c=ensure();if(c&&c.state==='suspended')c.resume();}
const TIER={basic:{f:140,climb:2.2,vol:.16,crackle:10},skill:{f:100,climb:3.4,vol:.26,crackle:16},ult:{f:70,climb:5.5,vol:.42,crackle:26}};
export function playCharge(tier,duration){
  if(sfxState.muted||!ensure())return ()=>{};
  const P=TIER[tier]||TIER.basic,t=ctx.currentTime,d=Math.max(.15,duration),end=t+d;
  const out=ctx.createGain();out.gain.setValueAtTime(.001,t);out.gain.exponentialRampToValueAtTime(P.vol,t+d*.85);out.connect(master);
  const nodes=[];
  // energy hum: two detuned saws + a sine an octave down, all gliding upward
  for(const [type,mul,det] of [['sawtooth',1,-9],['sawtooth',1.005,9],['sine',.5,0]]){
    const o=ctx.createOscillator();o.type=type;o.detune.value=det;
    o.frequency.setValueAtTime(P.f*mul,t);o.frequency.exponentialRampToValueAtTime(P.f*mul*P.climb,end);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(500,t);lp.frequency.exponentialRampToValueAtTime(4200,end);
    o.connect(lp);lp.connect(out);o.start(t);nodes.push(o);
  }
  // airy swell: band-passed noise sweeping up
  const n=ctx.createBufferSource();n.buffer=noiseBuf;n.loop=true;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.8;bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(5200,end);
  const ng=ctx.createGain();ng.gain.value=.7;n.connect(bp);bp.connect(ng);ng.connect(out);n.start(t);nodes.push(n);
  // ki crackle: high noise chopped by an LFO whose rate speeds up with the charge
  const c=ctx.createBufferSource();c.buffer=noiseBuf;c.loop=true;
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=3500;
  const chop=ctx.createGain();chop.gain.value=0;
  const lfo=ctx.createOscillator();lfo.type='square';lfo.frequency.setValueAtTime(P.crackle*.5,t);lfo.frequency.linearRampToValueAtTime(P.crackle*2,end);
  const depth=ctx.createGain();depth.gain.value=.5;lfo.connect(depth);depth.connect(chop.gain);
  c.connect(hp);hp.connect(chop);chop.connect(out);c.start(t);lfo.start(t);nodes.push(c,lfo);
  let done=false;
  const stopAll=at=>{for(const x of nodes)try{x.stop(at);}catch{}};
  const stop=(completed=false)=>{
    if(done)return;done=true;const now=ctx.currentTime;
    out.gain.cancelScheduledValues(now);out.gain.setValueAtTime(Math.max(.001,out.gain.value),now);out.gain.exponentialRampToValueAtTime(.001,now+.07);stopAll(now+.09);
    if(completed){   // release snap
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';
      o.frequency.setValueAtTime(P.f*P.climb*2,now);o.frequency.exponentialRampToValueAtTime(P.f*P.climb*.6,now+.18);
      g.gain.setValueAtTime(P.vol*1.6,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);o.connect(g);g.connect(master);o.start(now);o.stop(now+.22);
    }
  };
  return stop;
}
