// Full-session simulations: chips are conserved, no turn gets stuck, every session ends.
const {makeSandbox}=require('./harness');
const assert=(c,m)=>{if(!c){console.error('FAIL:',m);process.exitCode=1;}};
const S=makeSandbox();const ev=s=>require('vm').runInContext(s,S);
// poker
let hands=0;
for(let s=0;s<60;s++){
  ev(`SET.poker.opps=${1+s%5};SET.poker.chips=${[500,1000,2000][s%3]};newSession();`);
  const total=ev('G.players.reduce((a,p)=>a+p.chips+p.total,0)');
  let guard=0;
  while(!ev('G.over')&&guard++<5000){
    S.run('poker',200000);
    if(ev('G.handOver')){assert(ev('G.players.reduce((a,p)=>a+p.chips,0)')===total,'poker chips conserved');hands++;ev('startHand()');}
    else if(!S.Q.length){assert(false,'poker stuck');break;}
  }
  assert(ev('G.over'),'poker session ends');
}
console.log('poker hands simulated',hands);
// mahjong
let mh=0;
for(let s=0;s<16;s++){
  ev(`SET.mj.multiWin=${s%2===1};SET.mj.reserve=${s%3===0?0:16};newMjSession();`);
  const total=ev('M.players.reduce((a,p)=>a+p.chips,0)');
  let guard=0;
  while(!ev('M.over')&&guard++<500){
    S.run('mj',500000);
    if(ev("M.phase==='end'")){assert(ev('M.players.reduce((a,p)=>a+p.chips,0)')===total,'mj chips conserved');mh++;ev('mjStartHand()');}
    else if(!S.Q.length){assert(false,'mj stuck in '+ev('M.phase'));break;}
  }
  assert(ev('M.over'),'mj session ends');
}
console.log('mahjong hands simulated',mh);
// scoring spot checks
const sc=(o)=>ev(`(()=>{const W=s=>mjParse(s);const r=mjScore(Object.assign({melds:[],flowers:[],self:false,seat:1,round:0,last:false,gangkai:false,rob:false,special:null},${o}),MJ_RULE_DEFAULT);return r.tai;})()`);
assert(sc(`{hand:W('123456m 234567p 345s 678s 99s'),win:5}`)===3,'平胡＋門清 = 3');
assert(sc(`{hand:W('11122233345678999m'),win:8,self:true}`)===13,'清一色不求人三暗刻 = 13');
assert(sc(`{hand:W('11m 22m 33p 44p 55s 66s 77z 111z'),win:27,self:true}`)===11,'嚦咕嚦咕不求人 = 11');
console.log(process.exitCode?'ENGINE TESTS FAILED':'engine tests passed');
