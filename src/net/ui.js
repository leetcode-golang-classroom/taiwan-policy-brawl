import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import {hostCreate,guestJoin,extractCode} from './signal.js';
const hint=i=>i.relay?'':i.srflx?'（未設定 TURN：行動網路或嚴格 NAT 可能連不上）':'⚠ 沒取得公網位址（STUN 被擋），只有同一個區網能連線';

// Online-connection dialog: host shows an invite code (text + QR), guest answers with a reply code (text + QR).
// Either code can be moved by copy & paste or by scanning the QR with the camera. Result: onConnect(peer,role).
function qrSvg(text){
  const q=qrcode(0,'L');q.addData(text);q.make();
  return q.createSvgTag({cellSize:4,margin:3,scalable:true});
}
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

export function initNetUI({onConnect}){
  const ov=document.createElement('div');ov.className='net-overlay';ov.hidden=true;
  ov.innerHTML='<div class="net-dialog" role="dialog" aria-modal="true"><button class="net-x" type="button" aria-label="關閉">✕</button><div class="net-body"></div></div>';
  document.body.appendChild(ov);
  const body=ov.querySelector('.net-body');
  let stopScan=null,pending=null;   // pending = a half-open connection to clean up when the dialog closes

  const close=()=>{stopScan?.();ov.hidden=true;if(pending){pending.close();pending=null;}};
  ov.querySelector('.net-x').addEventListener('click',close);
  ov.addEventListener('pointerdown',e=>{if(e.target===ov)close();});

  const copy=async(text,btn)=>{
    try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
    const old=btn.textContent;btn.textContent='已複製 ✓';setTimeout(()=>btn.textContent=old,1400);
  };
  const status=(msg,bad)=>{const s=body.querySelector('.net-status');if(s){s.textContent=msg||'';s.classList.toggle('bad',!!bad);}};

  // Camera scanner (jsQR): resolves with the first connection code seen, or null when cancelled.
  function scan(){
    return new Promise(async resolve=>{
      const box=document.createElement('div');box.className='net-scan';
      box.innerHTML='<video playsinline muted></video><p>把對方螢幕上的 QR code 對準鏡頭</p><button type="button" class="net-btn ghost">取消掃描</button>';
      body.appendChild(box);
      const video=box.querySelector('video');let stream,alive=true;
      const finish=v=>{if(!alive)return;alive=false;stopScan=null;stream?.getTracks().forEach(t=>t.stop());box.remove();resolve(v);};
      stopScan=()=>finish(null);
      box.querySelector('button').addEventListener('click',()=>finish(null));
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});}
      catch{status('無法開啟相機（請允許相機權限，或改用複製貼上）',true);return finish(null);}
      if(!alive){stream.getTracks().forEach(t=>t.stop());return;}
      video.srcObject=stream;await video.play().catch(()=>{});
      const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
      const tick=()=>{
        if(!alive)return;
        if(video.videoWidth){
          const sc=Math.min(1,720/video.videoWidth);cv.width=video.videoWidth*sc;cv.height=video.videoHeight*sc;
          cx.drawImage(video,0,0,cv.width,cv.height);
          const img=cx.getImageData(0,0,cv.width,cv.height),r=jsQR(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'});
          const code=r&&extractCode(r.data);if(code)return finish(code);
        }
        setTimeout(tick,120);
      };
      tick();
    });
  }

  const codeBlock=(code,label,withLink)=>`
    <div class="net-code">
      <div class="net-qr">${qrSvg(withLink?withLink(code):code)}</div>
      <div class="net-code-side"><b>${label}</b><textarea readonly rows="4">${esc(code)}</textarea>
        <div class="net-row"><button type="button" class="net-btn" data-copy="code">複製連線碼</button>${withLink?'<button type="button" class="net-btn ghost" data-copy="link">複製邀請連結</button>':''}</div></div>
    </div>`;

  function menu(){
    body.innerHTML=`<h3>🌐 與人連線對戰</h3>
      <p class="net-hint">不需要伺服器：兩台電腦（或手機）互相交換一組連線碼，就能直接連線。可以複製貼上，也可以掃 QR code。</p>
      <div class="net-menu"><button type="button" class="net-btn big" data-a="host">🏠 建立房間<small>我是房主（P1 左側）</small></button><button type="button" class="net-btn big" data-a="join">🔗 加入房間<small>我有房主給的邀請碼（P2 右側）</small></button></div>
      <p class="net-status"></p>`;
    body.querySelector('[data-a=host]').addEventListener('click',host);
    body.querySelector('[data-a=join]').addEventListener('click',()=>join());
  }

  async function host(){
    body.innerHTML='<h3>🏠 建立房間</h3><p class="net-status">正在產生邀請碼…</p>';
    let h;
    try{h=await hostCreate();}catch(e){return fail(e);}
    pending=h.peer;
    const link=code=>location.href.split('#')[0]+'#join='+code;
    body.innerHTML=`<h3>🏠 建立房間</h3>
      <ol class="net-steps"><li>把「邀請碼」傳給對方（貼給他，或讓他掃 QR；手機相機掃到會直接開啟遊戲）</li><li>對方產生「回覆碼」後，貼到下方或掃描他的 QR</li></ol>
      ${codeBlock(h.code,'① 你的邀請碼',link)}
      <div class="net-reply"><b>② 對方的回覆碼</b><textarea class="net-in" rows="3" placeholder="貼上對方的回覆碼（PB1A.…）"></textarea>
        <div class="net-row"><button type="button" class="net-btn" data-a="go">連線</button><button type="button" class="net-btn ghost" data-a="scan">📷 掃描對方 QR</button></div></div>
      <p class="net-status"></p>`;
    status(hint(h.info));
    const box=body.querySelector('.net-code'),inp=body.querySelector('.net-in');
    box.querySelector('[data-copy=code]').addEventListener('click',e=>copy(h.code,e.target));
    box.querySelector('[data-copy=link]').addEventListener('click',e=>copy(link(h.code),e.target));
    let busy=false;
    const go=async text=>{
      if(busy)return;busy=true;status('連線中…（約 5～15 秒）');
      try{await h.accept(text);await h.peer.opened;done(h.peer,'host');}
      catch(e){busy=false;status(e.message||'連線失敗',true);}
    };
    body.querySelector('[data-a=go]').addEventListener('click',()=>go(inp.value));
    inp.addEventListener('paste',()=>setTimeout(()=>{if(extractCode(inp.value))go(inp.value);},0));   // pasting a whole code connects right away
    body.querySelector('[data-a=scan]').addEventListener('click',async()=>{const c=await scan();if(c){inp.value=c;go(c);}});
  }

  async function join(prefill=''){
    body.innerHTML=`<h3>🔗 加入房間</h3>
      <ol class="net-steps"><li>貼上房主的「邀請碼」，或掃描房主螢幕上的 QR</li><li>按「產生回覆碼」，再把回覆碼傳回給房主（貼給他或讓他掃）</li></ol>
      <textarea class="net-in" rows="3" placeholder="貼上房主的邀請碼（PB1O.…）">${esc(prefill)}</textarea>
      <div class="net-row"><button type="button" class="net-btn" data-a="make">產生回覆碼</button><button type="button" class="net-btn ghost" data-a="scan">📷 掃描房主 QR</button></div>
      <div class="net-out"></div><p class="net-status"></p>`;
    const inp=body.querySelector('.net-in');let busy=false;
    const make=async text=>{
      if(busy)return;busy=true;status('正在產生回覆碼…');
      try{
        const g=await guestJoin(text);pending=g.peer;
        body.querySelector('.net-out').innerHTML=codeBlock(g.code,'你的回覆碼（傳給房主）');
        const box=body.querySelector('.net-code');box.querySelector('[data-copy=code]').addEventListener('click',e=>copy(g.code,e.target));
        body.querySelector('[data-a=make]').disabled=true;
        status('等待房主輸入你的回覆碼…連線成功會自動進入遊戲 '+hint(g.info));
        await g.peer.opened;done(g.peer,'guest');
      }catch(e){busy=false;status(e.message||'連線失敗',true);}
    };
    body.querySelector('[data-a=make]').addEventListener('click',()=>make(inp.value));
    body.querySelector('[data-a=scan]').addEventListener('click',async()=>{const c=await scan();if(c){inp.value=c;make(c);}});
    if(prefill)make(prefill);
  }

  function done(peer,role){pending=null;stopScan?.();ov.hidden=true;onConnect(peer,role);}
  function fail(e){body.innerHTML=`<h3>連線失敗</h3><p class="net-status bad">${esc(e.message||String(e))}</p><button type="button" class="net-btn" data-a="back">返回</button>`;body.querySelector('[data-a=back]').addEventListener('click',menu);}

  // Opened from an invite link (#join=CODE): jump straight to the guest step.
  function fromLink(){
    const code=extractCode(location.hash);if(!code)return false;
    history.replaceState(null,'',location.pathname+location.search);
    ov.hidden=false;join(code);return true;
  }
  return {open(){ov.hidden=false;menu();},close,fromLink};
}
