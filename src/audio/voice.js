// Candidate voice: shouts the NAME of the move being charged (Web Speech API, zh-TW; no audio assets).
// Presentation layer only. A new shout cuts the previous one so calls never pile up. Each character gets its own
// pitch; heavier tiers are louder and slower (a bellowed 必殺技), basic moves are quick and short.
export const voiceState={muted:false};
const PITCH={mech:.2,leopard:.4,admiral:.25,mage:.45,cleric:.15,brawler:.1,nun:.5,yu:.3,bubble:.35};   // low register: high pitches sounded thin and shrill
let lastAt=0;
let zhVoice=null,loaded=false;
function pickVoice(){
  const list=globalThis.speechSynthesis?.getVoices?.()||[];
  const zh=list.filter(v=>/^zh/i.test(v.lang)),tw=zh.filter(v=>/zh[-_]TW/i.test(v.lang));
  const male=v=>/zhiwei|male|男|danny|kangkang|yunjian|yunyang/i.test(v.name)&&!/female/i.test(v.name);   // a male voice is naturally thicker
  zhVoice=tw.find(male)||zh.find(male)||tw[0]||zh[0]||null;loaded=list.length>0;
}
export function shoutMove(name,{tier='basic',charId}={}){
  const ss=globalThis.speechSynthesis;
  if(tier==='basic')return;   // J is far too frequent: only skills and ultimates are called out
  if(voiceState.muted||!ss||!name||typeof globalThis.SpeechSynthesisUtterance!=='function')return;
  const now=Date.now();if(now-lastAt<1200&&tier!=='ult')return;lastAt=now;   // never nag: at most one call per 1.2 s
  if(!loaded)pickVoice();
  const u=new SpeechSynthesisUtterance(tier==='ult'?`${name}！`:name);
  u.lang='zh-TW';if(zhVoice)u.voice=zhVoice;
  u.pitch=Math.max(.1,(PITCH[charId]||.6)*(tier==='ult'?.8:1));
  u.rate=tier==='ult'?.75:.85;
  u.volume=tier==='ult'?1:.85;
  ss.cancel();ss.speak(u);
}
export function stopVoice(){globalThis.speechSynthesis?.cancel?.();}
if(globalThis.speechSynthesis)globalThis.speechSynthesis.onvoiceschanged=()=>{loaded=false;};
