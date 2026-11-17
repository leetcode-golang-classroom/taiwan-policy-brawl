// Serverless WebRTC signalling: the offer / answer SDP is squeezed into a short text code that players
// exchange by hand (copy & paste) or by QR code. No server: STUN only (public), data goes peer-to-peer.
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const CODE_RE=/PB1([OA])\.([A-Za-z0-9_-]+)/;

const toB64u=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const fromB64u=t=>{const s=atob(t.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((t.length+3)%4));return Uint8Array.from(s,c=>c.charCodeAt(0));};
async function pipe(bytes,stream){const w=stream.writable.getWriter();w.write(bytes);w.close();return new Uint8Array(await new Response(stream.readable).arrayBuffer());}

// Drop what the other side does not need (TCP candidates, trickle leftovers) so the code stays short.
function slim(sdp){
  return sdp.split(/\r?\n/).filter(l=>l&&!/^a=(end-of-candidates|extmap-allow-mixed|msid-semantic)/.test(l)&&!(/^a=candidate/.test(l)&&/ tcp /i.test(l))).join('\n')+'\n';
}
export async function encodeCode(kind,sdp){return `PB1${kind}.`+toB64u(await pipe(new TextEncoder().encode(slim(sdp)),new CompressionStream('deflate-raw')));}
// Accepts a bare code, a join URL (#join=CODE) or text with surrounding noise. Returns {kind,sdp}.
export async function decodeCode(text){
  const m=CODE_RE.exec(String(text||'').trim());
  if(!m)throw new Error('這不是有效的連線碼');
  try{
    const sdp=new TextDecoder().decode(await pipe(fromB64u(m[2]),new DecompressionStream('deflate-raw')));
    return {kind:m[1],sdp:sdp.replace(/\r?\n/g,'\r\n')};
  }catch{throw new Error('連線碼損毀或不完整，請重新複製');}
}
export const extractCode=text=>CODE_RE.exec(String(text||''))?.[0]||null;

function gathered(pc,timeout=4000){
  return new Promise(res=>{
    if(pc.iceGatheringState==='complete')return res();
    const done=()=>{pc.removeEventListener('icegatheringstatechange',on);clearTimeout(t);res();};
    const on=()=>{if(pc.iceGatheringState==='complete')done();};
    const t=setTimeout(done,timeout);pc.addEventListener('icegatheringstatechange',on);
  });
}

// Peer: `ctl` = reliable ordered channel (picks, commands, round events); `snap` = unordered, no retransmit (state snapshots).
function makePeer(pc){
  const ctl=pc.createDataChannel('ctl',{negotiated:true,id:0}),snap=pc.createDataChannel('snap',{negotiated:true,id:1,ordered:false,maxRetransmits:0});
  const handlers=[],closers=[];let closed=false;
  const parse=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}for(const h of handlers)h(m);};
  ctl.onmessage=parse;snap.onmessage=parse;
  const fire=()=>{if(closed)return;closed=true;for(const c of closers)c();};
  ctl.onclose=fire;
  pc.addEventListener('connectionstatechange',()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))setTimeout(()=>{if(pc.connectionState!=='connected')fire();},pc.connectionState==='disconnected'?4000:0);});
  const opened=new Promise((res,rej)=>{
    ctl.onopen=()=>res();
    pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='failed')rej(new Error('連線失敗（可能是防火牆或 NAT 限制）'));});
  });
  return {
    pc,opened,
    send:m=>{if(ctl.readyState==='open')ctl.send(JSON.stringify(m));},
    sendFast:m=>{if(snap.readyState==='open')snap.send(JSON.stringify(m));},
    onMessage:fn=>handlers.push(fn),
    onClose:fn=>closers.push(fn),
    close:()=>{fire();try{pc.close();}catch{}},
  };
}

// Host: create the offer code, later feed it the guest's answer code.
export async function hostCreate(){
  const pc=new RTCPeerConnection({iceServers:ICE}),peer=makePeer(pc);
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const code=await encodeCode('O',pc.localDescription.sdp);
  const accept=async text=>{
    const d=await decodeCode(text);
    if(d.kind!=='A')throw new Error('這是邀請碼，請貼上對方產生的「回覆碼」');
    await pc.setRemoteDescription({type:'answer',sdp:d.sdp});
  };
  return {peer,code,accept};
}
// Guest: take the host's offer code, produce the answer code.
export async function guestJoin(text){
  const d=await decodeCode(text);
  if(d.kind!=='O')throw new Error('這是回覆碼，請貼上房主的「邀請碼」');
  const pc=new RTCPeerConnection({iceServers:ICE}),peer=makePeer(pc);
  await pc.setRemoteDescription({type:'offer',sdp:d.sdp});
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return {peer,code:await encodeCode('A',pc.localDescription.sdp)};
}
