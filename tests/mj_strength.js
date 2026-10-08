// Strength check for the mahjong AI: hard with tile reading vs hard without it vs normal.
// Usage: node tests/mj_strength.js [sessions]
const {makeSandbox}=require('./harness');
const S=makeSandbox();const ev=s=>require('vm').runInContext(s,S);
const N=Number(process.argv[2]||40);
const tags=['read','noread','normal','normal2'];
ev(`var AGG={},HANDS=0;`);
if(process.env.TUNE)ev('Object.assign(MJ_TUNE,'+process.env.TUNE+')');
for(let s=0;s<N;s++){
  const rot=s%4;
  ev(`{SET.mj.winds=2;SET.mj.chips=20000;SET.mj.levels=['normal','normal','normal'];newMjSession();
    const tags=${JSON.stringify(tags)};
    M.players.forEach((p,i)=>{const t=tags[(i+${rot})%4];p.tag=t;p.level=t==='read'||t==='noread'?'hard':'normal';p.readOff=t==='noread';p.style='balanced';});}`);
  let g=0;
  while(!ev('M.over')&&g++<400){
    S.run('mj',800000);
    if(ev("M.phase==='end'")){
      ev(`{HANDS++;const r=M.result;if(r&&r.type==='win'){r.wins.forEach(w=>{const t=M.players[w.i].tag;AGG[t]=AGG[t]||{win:0,dealin:0,net:0};AGG[t].win++;});
        if(r.payer!=null&&!r.wins.some(w=>w.self)){const t=M.players[r.payer].tag;AGG[t]=AGG[t]||{win:0,dealin:0,net:0};AGG[t].dealin++;}}}`);
      ev('mjStartHand()');
    }else if(!S.Q.length)break;
  }
  if(s&&s%60===0)report();
  ev(`M.players.forEach(p=>{AGG[p.tag]=AGG[p.tag]||{win:0,dealin:0,net:0};AGG[p.tag].net+=p.chips-20000;});`);
}
function report(){
const A=JSON.parse(ev('JSON.stringify(AGG)')),H=ev('HANDS');
const n2=A.normal2||{win:0,dealin:0,net:0};const nm=A.normal;nm.win+=n2.win;nm.dealin+=n2.dealin;nm.net+=n2.net;
for(const t of ['read','noread','normal']){const a=A[t],div=t==='normal'?2:1;
  console.log(t.padEnd(7),'wins/100',(a.win/H*100/div).toFixed(1),'deal-ins/100',(a.dealin/H*100/div).toFixed(1),'net/hand',(a.net/H/div).toFixed(1));}
console.log('hands',H);}
report();
