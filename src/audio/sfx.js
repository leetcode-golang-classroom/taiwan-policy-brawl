// Procedural combat SFX (WebAudio; no asset files). The AudioContext is created lazily on the first key press
// (browsers block audio before a user gesture). Presentation layer only: never touches gameplay state.
let ctx=null,master=null,noiseBuf=null;
export const sfxState={muted:false};
function ensure(){
  if(ctx)return ctx;
  const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;
  ctx=new AC();master=ctx.createGain();master.gain.value=.5;master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*.4,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ctx;
}
export function unlockAudio(){const c=ensure();if(c&&c.state==='suspended')c.resume();}
function env(g,t,a,peak,dur){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.001,t+dur);}
function tone(type,f0,f1,dur,peak){
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  env(g,t,.004,peak,dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,peak,freq,q=1,type='bandpass',sweepTo=null){
  const t=ctx.currentTime,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noiseBuf;f.type=type;f.frequency.setValueAtTime(freq,t);f.Q.value=q;
  if(sweepTo)f.frequency.exponentialRampToValueAtTime(sweepTo,t+dur);
  env(g,t,.003,peak,dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.02);
}
// Swing whoosh: heavier tiers are lower and longer.
export function playSwing(tier){
  if(sfxState.muted||!ensure())return;
  if(tier==='ult'){noise(.55,.5,300,.8,'bandpass',1800);tone('sawtooth',90,420,.5,.18);}
  else if(tier==='skill'){noise(.3,.38,500,1,'bandpass',2200);}
  else noise(.14,.26,900,1.2,'bandpass',2600);
}
// Impact: thump (sine drop) + crack (noise) scaled by tier; blocks are a metallic clank.
export function playHit(tier,{blocked=false,launched=false,combo=1}={}){
  if(sfxState.muted||!ensure())return;
  if(blocked){tone('square',720,380,.09,.14);noise(.08,.25,3200,2,'highpass');return;}
  const pitch=1+Math.min(.5,(combo-1)*.04);   // rises slightly through a combo
  if(tier==='ult'){tone('sine',130*pitch,38,.5,.9);noise(.4,.6,700,.7,'lowpass');tone('triangle',60,30,.6,.5);}
  else if(tier==='skill'||launched){tone('sine',170*pitch,50,.3,.75);noise(.22,.5,1400,.9,'bandpass');}
  else{tone('sine',210*pitch,80,.13,.55);noise(.09,.4,2200,1.1,'bandpass');}
}
export function playLand(){if(sfxState.muted||!ensure())return;tone('sine',90,35,.25,.7);noise(.18,.3,300,.8,'lowpass');}
