// Loads the game engines from src/ into a sandbox with a synchronous timer queue,
// so whole sessions can be simulated in Node without a browser.
const fs=require('fs'),vm=require('vm'),path=require('path');
const SRC=path.join(__dirname,'..','src');
function part(file,start,end){const s=fs.readFileSync(path.join(SRC,file),'utf8');if(!start)return s;const a=s.indexOf(start),b=end?s.indexOf(end):s.length;if(a<0||b<0)throw new Error('marker missing in '+file);return s.slice(a,b);}
function makeSandbox(){
  const Q=[];
  const ctx={console,Math,JSON,Date,Set,Map,Array,Object,Number,String,Int8Array,Promise,
    setTimeout:fn=>{Q.push(fn);},Q,
    document:{addEventListener(){}},window:{},localStorage:{_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}}};
  vm.createContext(ctx);
  const code=[
    part('poker_core.js'),part('mj.js'),part('explain.js'),
    part('learn.js','// LEARN DATA START','// LEARN DATA END'),
    part('stats.js','// STATS START','// STATS END'),
    `var VIEW='test';var REPLAY={on:false};var LDONE=new Set();
     var SET={coach:true,hint:'full',speed:'fast',sound:false,
       poker:{opps:3,levels:['easy','normal','hard','normal','hard'],styles:['random','random','random','random','random'],chips:1000,blindUp:true},
       mj:JSON.parse(JSON.stringify(MJ_RULE_DEFAULT))};
     function notify(){} function onSessionOver(){} function mjNotify(){} function mjOnSessionOver(){}
     function humanTurn(){computeHint();const d=aiDecide(G.players[0]);Q.push(()=>humanAct(d.type,d.to));}
     function mjHumanTurn(){mjComputeHint();Q.push(()=>{if(M.phase!=='turn'||M.turn!==0)return;const o=mjTurnOptions(0);if(o.win)return mjSelfWin(0);const kc=mjAiKong(M.players[0],o);if(kc){if(kc.type==='an')mjAnKong(0,kc.k);else mjJiaGang(0,kc.k);return;}mjHumanDiscard(mjAiDiscard(M.players[0]));});}
     function mjHumanClaim(){mjComputeHint();const d=mjAiClaim(0,M.claim.opts[0],M.claim.k);Q.push(()=>mjHumanClaim2(d.type,d.start));}
     VIEW='poker';`
  ].join('\n');
  vm.runInContext(code,ctx);
  // the engines check VIEW for pausing; make both games run
  vm.runInContext("VIEW='poker';",ctx);
  ctx.run=(game,maxSteps)=>{let n=0;while(Q.length&&n<(maxSteps||1e7)){vm.runInContext("VIEW="+JSON.stringify(game),ctx);Q.shift()();n++;}return n;};
  return ctx;
}
module.exports={makeSandbox};
