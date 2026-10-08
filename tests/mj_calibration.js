// How well does the tile reading match reality? Buckets the estimated "ready" chance against actual ready
// hands, and the estimated danger of discards against actually dealing in.
const {makeSandbox}=require('./harness');
const S=makeSandbox();const ev=s=>require('vm').runInContext(s,S);
const N=Number(process.argv[2]||40);
ev(`var CAL={pt:{},dz:{}};
const _disc=mjDiscard;mjDiscard=function(i,k){
  const rd=mjRead(i);
  rd.opps.forEach(o=>{const q=o.q;const c=mjCounts(q.hand);const ready=mjShanten(c,5-q.melds.length)<=0;
    const b=Math.min(9,Math.floor(o.pt*10));CAL.pt[b]=CAL.pt[b]||[0,0];CAL.pt[b][0]++;if(ready)CAL.pt[b][1]++;
    if(ready){const waits=mjWaits(c,q.melds.length);const hit=waits.includes(k);const d=Math.min(9,Math.floor(o.danger[k]*10));CAL.dz[d]=CAL.dz[d]||[0,0];CAL.dz[d][0]++;if(hit)CAL.dz[d][1]++;}
  });
  return _disc(i,k);};`);
for(let s=0;s<N;s++){
  ev(`{SET.mj.winds=2;SET.mj.chips=20000;SET.mj.levels=['normal','hard','normal'];newMjSession();}`);
  let g=0;while(!ev('M.over')&&g++<400){S.run('mj',800000);if(ev("M.phase==='end'"))ev('mjStartHand()');else if(!S.Q.length)break;}
}
const C=JSON.parse(ev('JSON.stringify(CAL)'));
console.log('estimated ready chance -> actually ready');
Object.keys(C.pt).sort((a,b)=>a-b).forEach(b=>console.log(`  ${b*10}-${b*10+10}%: ${(C.pt[b][1]/C.pt[b][0]*100).toFixed(0)}% of ${C.pt[b][0]}`));
console.log('danger score (vs a ready player) -> tile was a winning tile');
Object.keys(C.dz).sort((a,b)=>a-b).forEach(b=>console.log(`  ${b/10}-${(b/10+.1).toFixed(1)}: ${(C.dz[b][1]/C.dz[b][0]*100).toFixed(1)}% of ${C.dz[b][0]}`));
