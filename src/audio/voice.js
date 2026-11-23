// Candidate voice: shouts the NAME of the move being charged (Web Speech API, zh-TW; no audio assets).
// Presentation layer only. A new shout cuts the previous one so calls never pile up. Each character gets its own
// pitch; heavier tiers are louder and slower (a bellowed 必殺技), basic moves are quick and short.
export const voiceState={muted:false};
const PITCH={mech:.7,leopard:1.1,admiral:.8,mage:1.2,cleric:.6,brawler:.5,nun:1.4,yu:.9,bubble:1.0};
let zhVoice=null,loaded=false;
function pickVoice(){
  const list=globalThis.speechSynthesis?.getVoices?.()||[];
  zhVoice=list.find(v=>/zh[-_]TW/i.test(v.lang))||list.find(v=>/^zh/i.test(v.lang))||null;loaded=list.length>0;
}
export function shoutMove(name,{tier='basic',charId}={}){
  const ss=globalThis.speechSynthesis;
  if(voiceState.muted||!ss||!name||typeof globalThis.SpeechSynthesisUtterance!=='function')return;
  if(!loaded)pickVoice();
  const u=new SpeechSynthesisUtterance(tier==='ult'?`${name}！`:name);
  u.lang='zh-TW';if(zhVoice)u.voice=zhVoice;
  u.pitch=Math.min(2,(PITCH[charId]||1)*(tier==='ult'?.85:1));
  u.rate=tier==='ult'?1:tier==='skill'?1.15:1.35;
  u.volume=tier==='ult'?1:tier==='skill'?.9:.75;
  ss.cancel();ss.speak(u);
}
export function stopVoice(){globalThis.speechSynthesis?.cancel?.();}
if(globalThis.speechSynthesis)globalThis.speechSynthesis.onvoiceschanged=()=>{loaded=false;};
