import {$} from '../utils/dom.js';

// Counts consecutive damaging hits by one side; resets after a quiet gap or a new round.
const GAP=2200;
export function initComboCounter(world){
  const st={player:{n:0,at:0},cpu:{n:0,at:0}};
  const sideOf=id=>world.get(id,'fighter').side;
  const render=side=>{
    const el=$('#combo-counter-'+side),s=st[side];
    el.classList.toggle('show',s.n>=2);
    if(s.n>=2){el.innerHTML=`<b>${s.n}</b> HIT`;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
  };
  world.events.on('hit',e=>{
    if(!(e.amount>0))return;
    const side=sideOf(e.attackerId),s=st[side],now=performance.now();
    s.n=now-s.at<GAP?s.n+1:1;s.at=now;render(side);
  });
  world.events.on('roundStart',()=>{for(const k of ['player','cpu']){st[k].n=0;render(k);}});
  return function update(){
    const now=performance.now();
    for(const k of ['player','cpu'])if(st[k].n&&now-st[k].at>GAP){st[k].n=0;render(k);}
  };
}
