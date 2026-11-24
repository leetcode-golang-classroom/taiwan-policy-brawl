// HUD: SFX volume slider + mute button (index.html #sfx-*). Separate from the BGM settings; saved in localStorage by soundManager.
import {bgmState,toggleBgmMute,onBgmChange} from '../audio/bgm.js';
import {sfxState,setSfxVolume,toggleSfxMute,onSfxChange,unlockAudio} from '../audio/soundManager.js';
export function initSfxControls(){
  const btn=document.getElementById('sfx-mute'),sl=document.getElementById('sfx-volume'),out=document.getElementById('sfx-volume-label');
  if(!btn||!sl)return;
  const box=btn.closest('.sfx-ctl');
  const paint=()=>{sl.value=Math.round(sfxState.volume*100);out.textContent=sl.value;btn.textContent=sfxState.muted?'🔇 音效關':'🔊 音效開';btn.setAttribute('aria-pressed',String(sfxState.muted));box.classList.toggle('muted',sfxState.muted);};
  sl.addEventListener('input',()=>{unlockAudio();setSfxVolume(sl.value/100);});   // takes effect immediately
  sl.addEventListener('change',()=>sl.blur());sl.addEventListener('pointerup',()=>sl.blur());   // a focused slider would swallow the game keys
  btn.addEventListener('click',()=>{unlockAudio();toggleSfxMute();btn.blur();});
  onSfxChange(paint);paint();
  // BGM on/off button (same look); B key and this button share toggleBgmMute, so the label follows either
  const bb=document.getElementById('bgm-mute'),bbox=document.getElementById('bgm-ctl');
  if(bb){const bp=()=>{bb.textContent=bgmState.muted?'🔇 音樂關':'🎵 音樂開';bb.setAttribute('aria-pressed',String(bgmState.muted));bbox.classList.toggle('muted',bgmState.muted);};
    bb.addEventListener('click',()=>{toggleBgmMute();bb.blur();});onBgmChange(bp);bp();}
}
