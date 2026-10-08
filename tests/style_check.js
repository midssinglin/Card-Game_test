// Play styles should change behaviour: poker entry rate, mahjong call rate.
const {makeSandbox}=require('./harness');
const S=makeSandbox();const ev=s=>require('vm').runInContext(s,S);
ev(`var VP={};const _act=act;act=function(i,type,to){const p=G.players[i];if(!p.human&&G.street==='preflop'){const k=p.style;VP[k]=VP[k]||[0,0];if(!p._seen){p._seen=1;VP[k][1]++;}if((type==='call'||type==='raise')&&!p._in){p._in=1;VP[k][0]++;}}return _act(i,type,to);};
const _sh=startHand;startHand=function(){G&&G.players.forEach(p=>{p._seen=0;p._in=0;});return _sh();};`);
for(const st of ['tag','lag','station','rock']){
  for(let s=0;s<12;s++){ev(`SET.poker.opps=3;SET.poker.levels=['normal','normal','normal'];SET.poker.styles=['${st}','${st}','${st}'];SET.poker.chips=2000;newSession();`);
    let g=0;while(!ev('G.over')&&g++<300){S.run('poker',200000);if(ev('G.handOver'))ev('startHand()');else if(!S.Q.length)break;}}
}
const vp=JSON.parse(ev('JSON.stringify(VP)'));
for(const k in vp)console.log('poker',k,'entry rate',(vp[k][0]/vp[k][1]*100).toFixed(0)+'%','('+vp[k][1]+' hands)');
ev(`var CL={};const _call=mjCall;mjCall=function(j,C,type,start){const k=M.players[j].style;CL[k]=(CL[k]||0)+1;return _call(j,C,type,start);};var HN={};`);
for(const st of ['fast','big','defend','balanced']){
  for(let s=0;s<6;s++){ev(`SET.mj.levels=['normal','normal','normal'];SET.mj.styles=['${st}','${st}','${st}'];SET.mj.winds=2;SET.mj.chips=5000;newMjSession();`);
    let g=0;while(!ev('M.over')&&g++<200){S.run('mj',500000);if(ev("M.phase==='end'")){ev(`HN['${st}']=(HN['${st}']||0)+1`);ev('mjStartHand()');}else if(!S.Q.length)break;}}
}
const cl=JSON.parse(ev('JSON.stringify(CL)')),hn=JSON.parse(ev('JSON.stringify(HN)'));
for(const k of ['fast','balanced','big','defend'])console.log('mahjong',k,'calls per hand (3 AIs)',((cl[k]||0)/hn[k]).toFixed(2));
