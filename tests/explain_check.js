// Coach explanations: generated for every hint without errors; prints a few samples to read.
const {makeSandbox}=require('./harness');
const S=makeSandbox();const ev=s=>require('vm').runInContext(s,S);
const show=process.argv.includes('--show');
ev(`var XS={pk:[],mjT:[],mjC:[]},XN={pk:0,pkNull:0,mjT:0,mjTNull:0,mjC:0,mjCNull:0};
const _ch=computeHint;computeHint=function(){_ch();if(G.hint){XN.pk++;if(!G.hint.ex)XN.pkNull++;else if(XS.pk.length<400)XS.pk.push(G.hint.ex);}};
const _mh=mjComputeHint;mjComputeHint=function(){_mh();const h=M.hint;if(!h)return;if(h.kind==='turn'){XN.mjT++;if(!h.ex)XN.mjTNull++;else if(XS.mjT.length<400)XS.mjT.push(h.ex);}else{XN.mjC++;if(!h.ex)XN.mjCNull++;else if(XS.mjC.length<200)XS.mjC.push(h.ex);}};`);
for(let s=0;s<20;s++){ev(`{SET.poker.opps=3;newSession();}`);let g=0;while(!ev('G.over')&&g++<60){S.run('poker',200000);if(ev('G.handOver'))ev('startHand()');else if(!S.Q.length)break;}}
for(let s=0;s<8;s++){ev(`{SET.mj.levels=['normal','hard','hard'];newMjSession();}`);let g=0;while(!ev('M.over')&&g++<60){S.run('mj',500000);if(ev("M.phase==='end'"))ev('mjStartHand()');else if(!S.Q.length)break;}}
const N=JSON.parse(ev('JSON.stringify(XN)'));console.log('counts',JSON.stringify(N));
let bad=N.pkNull+N.mjTNull+N.mjCNull;
const X=JSON.parse(ev('JSON.stringify(XS)'));
for(const k of ['pk','mjT','mjC'])X[k].forEach(e=>{if(!e.summary||!e.logic.length||!e.risk.length||/undefined|NaN|null/.test(JSON.stringify(e)))bad++;});
console.log('problems',bad);
if(show){const pick=(a,n)=>a.filter((_,i)=>i%Math.max(1,Math.floor(a.length/n))===0).slice(0,n);
  for(const [k,n] of [['pk',4],['mjT',3],['mjC',2]])pick(X[k],n).forEach(e=>{console.log('\n['+k+'] '+e.summary);['why','logic','risk','alt'].forEach(f=>e[f].forEach(t=>console.log('  '+f+': '+t)));});}
if(bad)process.exit(1);
