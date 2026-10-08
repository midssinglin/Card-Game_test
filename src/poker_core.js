// ENGINE START
// aiRun(kind, args, fallback, done): runs heavy AI/coach work in a background worker when one is
// available (see src/worker.js); otherwise calls fallback() right away. done() always gets the result.
if(typeof remoteTurn!=='function')var remoteTurn=function(){};
if(typeof aiRun!=='function')var aiRun=function(kind,args,fallback,done){done(fallback());};
const RN=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS=['♠','♥','♦','♣'];
const CAT=['高牌','一對','兩對','三條','順子','同花','葫蘆','四條','同花順'];

function straightHigh(mask){
  const m=(mask<<1)|((mask>>12)&1);
  for(let t=13;t>=4;t--){ if(((m>>(t-4))&31)===31) return t-1; }
  return -1;
}
function pack(cat,a){return (cat<<20)|((a[0]||0)<<16)|((a[1]||0)<<12)|((a[2]||0)<<8)|((a[3]||0)<<4)|(a[4]||0);}
function evalScore(cs){
  const rc=new Int8Array(13),sc=[0,0,0,0],sm=[0,0,0,0];let rm=0;
  for(let i=0;i<cs.length;i++){const c=cs[i],r=c%13,s=(c/13)|0;rc[r]++;sc[s]++;sm[s]|=1<<r;rm|=1<<r;}
  let fs=-1;for(let s=0;s<4;s++)if(sc[s]>=5)fs=s;
  if(fs>=0){const h=straightHigh(sm[fs]);if(h>=0)return pack(8,[h]);}
  let q=-1;const T=[],P=[];
  for(let r=12;r>=0;r--){if(rc[r]===4)q=r;else if(rc[r]===3)T.push(r);else if(rc[r]===2)P.push(r);}
  const kick=(ex,n)=>{const o=[];for(let r=12;r>=0&&o.length<n;r--)if(rc[r]&&ex.indexOf(r)<0)o.push(r);return o;};
  if(q>=0)return pack(7,[q,...kick([q],1)]);
  if(T.length&&(T.length>1||P.length)){const pr=Math.max(T.length>1?T[1]:-1,P.length?P[0]:-1);return pack(6,[T[0],pr]);}
  if(fs>=0){const o=[];for(let r=12;r>=0&&o.length<5;r--)if((sm[fs]>>r)&1)o.push(r);return pack(5,o);}
  const sh=straightHigh(rm);if(sh>=0)return pack(4,[sh]);
  if(T.length)return pack(3,[T[0],...kick([T[0]],2)]);
  if(P.length>=2)return pack(2,[P[0],P[1],...kick([P[0],P[1]],1)]);
  if(P.length)return pack(1,[P[0],...kick([P[0]],3)]);
  return pack(0,kick([],5));
}
function handName(score){
  const c=score>>20,a=(score>>16)&15,b=(score>>12)&15;
  switch(c){
    case 8:return a===12?'皇家同花順':`同花順（${RN[a]} 高）`;
    case 7:return `四條 ${RN[a]}`;
    case 6:return `葫蘆（${RN[a]} 帶 ${RN[b]}）`;
    case 5:return `同花（${RN[a]} 高）`;
    case 4:return `順子（${RN[a]} 高）`;
    case 3:return `三條 ${RN[a]}`;
    case 2:return `兩對 ${RN[a]} 與 ${RN[b]}`;
    case 1:return `一對 ${RN[a]}`;
    default:return `高牌 ${RN[a]}`;
  }
}
function bestFive(cs){
  if(cs.length<=5)return {score:evalScore(cs),cards:cs.slice()};
  let best=null;const n=cs.length,pick=[];
  const rec=s=>{
    if(pick.length===5){const sel=pick.map(i=>cs[i]);const v=evalScore(sel);if(!best||v>best.score)best={score:v,cards:sel};return;}
    for(let i=s;i<n;i++){pick.push(i);rec(i+1);pick.pop();}
  };
  rec(0);return best;
}
// Chen formula: quick preflop strength, about -1 (worst) to 20 (AA)
function chen(h){
  const r1=h[0]%13,r2=h[1]%13,hi=Math.max(r1,r2),lo=Math.min(r1,r2);
  const pts=[1,1.5,2,2.5,3,3.5,4,4.5,5,6,7,8,10];
  let s=pts[hi];
  if(r1===r2)return Math.max(5,s*2);
  if(((h[0]/13)|0)===((h[1]/13)|0))s+=2;
  const gap=hi-lo-1;
  s-=gap<=0?0:gap===1?1:gap===2?2:gap===3?4:5;
  if(gap<=1&&hi<10)s+=1;
  return Math.ceil(s);
}
function equity(hole,board,nOpp,iters){
  if(nOpp<1)return 1;
  const used=new Set([...hole,...board]);const deck=[];
  for(let c=0;c<52;c++)if(!used.has(c))deck.push(c);
  const bl=board.length,need=5-bl,k=need+2*nOpp,fb=board.slice(),hc=[hole[0],hole[1],0,0,0,0,0],oc=[0,0,0,0,0,0,0];
  let tot=0;
  for(let it=0;it<iters;it++){
    for(let i=0;i<k;i++){const j=i+Math.floor(Math.random()*(deck.length-i));const t=deck[i];deck[i]=deck[j];deck[j]=t;}
    for(let i=0;i<need;i++)fb[bl+i]=deck[i];
    for(let i=0;i<5;i++){hc[2+i]=fb[i];oc[2+i]=fb[i];}
    const hs=evalScore(hc);let ties=0,lose=false;
    for(let o=0;o<nOpp;o++){oc[0]=deck[need+2*o];oc[1]=deck[need+2*o+1];const os=evalScore(oc);if(os>hs){lose=true;break;}if(os===hs)ties++;}
    if(!lose)tot+=1/(ties+1);
  }
  return tot/iters;
}
// equity where each opponent's hand is drawn from a range: hands with Chen score >= mins[i]
function equityRange(hole,board,mins,iters){
  const n=mins.length;if(n<1)return 1;
  const used=new Set([...hole,...board]);const deck=[];
  for(let c=0;c<52;c++)if(!used.has(c))deck.push(c);
  const L=deck.length,bl=board.length,need=5-bl,fb=board.slice(),hc=[hole[0],hole[1],0,0,0,0,0],oc=[0,0,0,0,0,0,0],oh=[];
  let tot=0;
  for(let it=0;it<iters;it++){
    for(let i=L-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=deck[i];deck[i]=deck[j];deck[j]=t;}
    let idx=0;
    for(let i=0;i<need;i++)fb[bl+i]=deck[idx++];
    for(let o=0;o<n;o++){
      let a=deck[idx],b=deck[idx+1];idx+=2;
      for(let tries=0;tries<12&&mins[o]>0&&idx+1<L&&chen([a,b])<mins[o];tries++){a=deck[idx];b=deck[idx+1];idx+=2;}
      oh[o*2]=a;oh[o*2+1]=b;
    }
    for(let i=0;i<5;i++){hc[2+i]=fb[i];oc[2+i]=fb[i];}
    const hs=evalScore(hc);let ties=0,lose=false;
    for(let o=0;o<n;o++){oc[0]=oh[o*2];oc[1]=oh[o*2+1];const os=evalScore(oc);if(os>hs){lose=true;break;}if(os===hs)ties++;}
    if(!lose)tot+=1/(ties+1);
  }
  return tot/iters;
}
// cards that upgrade your hand by using your hole cards (not cards that only improve the board)
function outsInfo(hole,board){
  if(board.length<3||board.length>=5)return null;
  const mine=[...hole,...board],cur=evalScore(mine)>>20,used=new Set(mine),by={};let total=0;
  for(let c=0;c<52;c++){
    if(used.has(c))continue;
    const nc=evalScore([...mine,c])>>20;
    if(nc<=cur||nc<2)continue;
    const bc=evalScore([...board,c])>>20;
    if(bc>=nc)continue;
    total++;by[nc]=(by[nc]||0)+1;
  }
  const unseen=52-used.size;
  const next=total/unseen;
  const river=board.length===3?1-((unseen-total)/unseen)*((unseen-1-total)/(unseen-1)):next;
  return {total,by,unseen,next,river};
}
function buildPots(players){
  const levels=[...new Set(players.filter(p=>p.total>0).map(p=>p.total))].sort((a,b)=>a-b);
  const pots=[];let prev=0,carry=0;
  for(const L of levels){
    let amt=0;for(const p of players)amt+=Math.min(p.total,L)-Math.min(p.total,prev);
    const elig=players.filter(p=>!p.folded&&!p.out&&p.total>=L);
    if(!elig.length)carry+=amt;else{pots.push({amt:amt+carry,elig});carry=0;}
    prev=L;
  }
  if(carry&&pots.length)pots[pots.length-1].amt+=carry;
  return pots;
}
// ENGINE END

// GAME START
const NAMES=['阿明','小美','老K','阿傑','蘭姐'];
const LVN={easy:'新手',normal:'普通',hard:'高手'};
const BLINDS=[[10,20],[15,30],[25,50],[50,100],[75,150],[100,200],[150,300],[200,400],[300,600],[500,1000],[1000,2000]];
const STREETN={preflop:'翻牌前',flop:'翻牌',turn:'轉牌',river:'河牌',showdown:'攤牌'};
const SPEED={slow:1300,mid:800,fast:420};
// play styles layered on top of the difficulty level
const PK_STYLES={balanced:{name:'平衡',loose:0,aggr:1,bluff:1,sticky:0},tag:{name:'緊兇',loose:-.08,aggr:1.35,bluff:1.1,sticky:-.03},
  lag:{name:'鬆兇',loose:.12,aggr:1.45,bluff:1.8,sticky:.03},station:{name:'跟注站',loose:.15,aggr:.5,bluff:.3,sticky:.15},rock:{name:'保守',loose:-.12,aggr:.7,bluff:.3,sticky:-.06}};
function pickStyle(v,table){const ks=Object.keys(table);return table[v]?v:ks[Math.floor(Math.random()*ks.length)];}
const cfg={get opps(){return SET.poker.opps},get levels(){return SET.poker.levels},get chips(){return SET.poker.chips},get speed(){return SET.speed},get blindUp(){return SET.poker.blindUp},get styles(){return SET.poker.styles},get hint(){return SET.coach&&!(G&&G.online)?SET.hint:'off'}};
let G=null,GEN=0;

const fmtN=n=>Number(n).toLocaleString('en-US');
const pc=x=>Math.round(x*100)+'%';
function delay(f){if(G&&G.ff)return 90;return SPEED[cfg.speed]*(f==null?1:f)*(0.8+Math.random()*0.4);}
function later(fn,f){const g=GEN;setTimeout(()=>{if(g!==GEN)return;if(VIEW!=='poker'&&!G.online){G.resume=fn;return;}fn();},delay(f));}
function addLog(t,k){G.log.unshift({t,k:k||''});if(G.log.length>90)G.log.pop();}
function shuffleDeck(){const d=[];for(let c=0;c<52;c++)d.push(c);for(let i=51;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=d[i];d[i]=d[j];d[j]=t;}return d;}
function cardStr(c){return RN[c%13]+SUITS[(c/13)|0];}
function canAct(p){return !p.out&&!p.folded&&!p.allIn;}
function inHand(p){return !p.out&&!p.folded;}
function potTotal(){return G.players.reduce((s,p)=>s+p.total,0);}
function seatAfter(i,pred){const n=G.players.length;for(let k=1;k<=n;k++){const j=(i+k)%n;if(pred(G.players[j]))return j;}return -1;}
function chipTotal(){return G.players.reduce((s,p)=>s+p.chips+p.total,0);}

// custom (online): {players:[{name,human,remote,uid,level,style}], chips, blindUp}
function newSession(custom){
  GEN++;
  const chips=custom?custom.chips:cfg.chips;
  const players=custom?custom.players.map((q,i)=>Object.assign({id:i,chips,persona:{aggr:.85+Math.random()*.35,bluff:.09+Math.random()*.06}},q))
    :[{id:0,name:'你',human:true,level:'normal',chips:cfg.chips,persona:{aggr:1,bluff:.1}}];
  if(!custom)for(let i=0;i<cfg.opps;i++){
    const lv=cfg.levels[i];
    players.push({id:i+1,name:NAMES[i],human:false,level:lv,chips:cfg.chips,style:pickStyle((cfg.styles||[])[i],PK_STYLES),
      persona:{aggr:.85+Math.random()*.35,bluff:lv==='easy'?.05:lv==='normal'?.07+Math.random()*.06:.12+Math.random()*.08}});
  }
  players.forEach(p=>Object.assign(p,{hole:[],bet:0,total:0,folded:false,out:false,allIn:false,acted:false,last:'',show:false,win:0,best:null}));
  G={players,dealer:Math.floor(Math.random()*players.length),handNo:0,log:[],over:false,won:false,peak:chips,online:!!custom,blindUp:custom?custom.blindUp:null,
     board:[],handOver:true,toAct:-1,street:'preflop',hint:null,decisions:[],review:null,result:'',place:0,ff:false,animFrom:99,sbI:-1,bbI:-1,currentBet:0,minRaise:0,sbAmt:10,bbAmt:20,level:0};
  addLog(`新的一場開始：${players.length} 人桌，每人 ${fmtN(chips)} 籌碼`,'sys');
  startHand();
}

function post(i,amt){const p=G.players[i];const a=Math.min(amt,p.chips);move(p,a);}
function move(p,a){p.chips-=a;p.bet+=a;p.total+=a;if(p.chips===0)p.allIn=true;}

function startHand(){
  if(G.over)return;
  const P=G.players;
  P.forEach(p=>{if(p.chips<=0)p.out=true;});
  G.handNo++;
  const lvl=(G.blindUp!=null?G.blindUp:cfg.blindUp)?Math.min(Math.floor((G.handNo-1)/10),BLINDS.length-1):0;
  const [sb,bb]=BLINDS[lvl];
  G.sbAmt=sb;G.bbAmt=bb;
  P.forEach(p=>Object.assign(p,{pfr:false,pfc:false,hole:[],bet:0,total:0,folded:p.out,allIn:false,acted:false,last:p.out?'已淘汰':'',show:false,win:0,best:null}));
  G.h0start=P[0].chips;G.h0vpip=false;G.h0pfr=false;
  Object.assign(G,{board:[],deck:shuffleDeck(),handOver:false,result:'',hint:null,decisions:[],review:null,ff:false,animFrom:99,dealt:true});
  const alive=P.filter(p=>!p.out);
  G.dealer=seatAfter(G.dealer,p=>!p.out);
  for(let r=0;r<2;r++){let i=G.dealer;for(let k=0;k<alive.length;k++){i=seatAfter(i,p=>!p.out);P[i].hole.push(G.deck.pop());}}
  const sbI=alive.length===2?G.dealer:seatAfter(G.dealer,p=>!p.out);
  const bbI=seatAfter(sbI,p=>!p.out);
  G.sbI=sbI;G.bbI=bbI;
  post(sbI,sb);post(bbI,bb);
  P[sbI].last=`小盲 ${sb}`;P[bbI].last=`大盲 ${bb}`;
  G.currentBet=bb;G.minRaise=bb;G.street='preflop';
  if(lvl>G.level){addLog(`盲注升級為 ${sb}／${bb}`,'sys');}
  G.level=lvl;
  addLog(`第 ${G.handNo} 手：${P[G.dealer].name}是按鈕位，盲注 ${sb}／${bb}`,'street');
  G.toAct=nextActor(bbI);
  if(G.toAct<0||!roundNeeded()){G.toAct=-1;notify();later(endRound,1);return;}
  schedule();
}

function nextActor(from){
  const n=G.players.length;
  for(let k=1;k<=n;k++){const j=(from+k)%n,p=G.players[j];if(canAct(p)&&(!p.acted||p.bet<G.currentBet))return j;}
  return -1;
}
function roundNeeded(){
  if(G.players.filter(inHand).length<2)return false;
  const a=G.players.filter(canAct);
  if(!a.length)return false;
  if(a.length===1&&a[0].bet>=G.currentBet)return false;
  return true;
}

function schedule(){
  notify();
  if(G.over||G.handOver)return;
  const i=G.toAct;if(i<0)return;
  const p=G.players[i];
  if(p.human){if(p.remote)remoteTurn(i);else humanTurn();return;}
  later(()=>{
    if(G.toAct!==i||G.handOver)return;
    const g=GEN,hn=G.handNo;
    aiRun('pokerAI',{i},()=>aiDecide(p),d=>{if(g!==GEN||G.handNo!==hn||G.toAct!==i||G.handOver)return;act(i,d.type,d.to);});
  },1);
}

function act(i,type,to){
  if(G.handOver||G.toAct!==i)return;
  const p=G.players[i],toCall=Math.max(0,G.currentBet-p.bet);
  if(type==='check'&&toCall>0)type='call';
  if(type==='call'&&toCall===0)type='check';
  if(type==='raise'){
    const max=p.bet+p.chips;
    if(!G.players.some(q=>q!==p&&canAct(q))||max<=G.currentBet)type=toCall?'call':'check';
    else to=Math.min(Math.max(Math.round(to||0),G.currentBet+G.minRaise),max);
  }
  if(type==='call'||type==='raise')typeof sfx==='function'&&sfx('chip');
  if(type==='fold'){p.folded=true;p.last='棄牌';addLog(`${p.name} 棄牌`);}
  else if(type==='check'){p.last='過牌';addLog(`${p.name} 過牌`);}
  else if(type==='call'){const a=Math.min(toCall,p.chips);move(p,a);p.last=p.allIn?`全下 ${fmtN(p.bet)}`:`跟注 ${fmtN(a)}`;addLog(`${p.name} ${p.last}`);}
  else{
    const prev=G.currentBet;move(p,to-p.bet);
    const inc=to-prev;if(inc>=G.minRaise)G.minRaise=inc;
    G.currentBet=Math.max(prev,to);
    G.players.forEach(q=>{if(q!==p&&canAct(q))q.acted=false;});
    p.last=p.allIn?`全下 ${fmtN(to)}`:(prev===0?`下注 ${fmtN(to)}`:`加注到 ${fmtN(to)}`);
    addLog(`${p.name} ${p.last}`,'raise');
  }
  if(G.street==='preflop'){if(type==='raise')p.pfr=true;else if(type==='call')p.pfc=true;if(i===0&&(type==='call'||type==='raise'))G.h0vpip=true;if(i===0&&type==='raise')G.h0pfr=true;}
  p.acted=true;
  const ih=G.players.filter(inHand);
  if(ih.length===1){awardFold(ih[0]);return;}
  G.toAct=nextActor(i);
  if(G.toAct<0||!roundNeeded()){G.toAct=-1;notify();later(endRound,.8);return;}
  schedule();
}

function endRound(){
  if(G.handOver)return;
  G.players.forEach(p=>{p.bet=0;p.acted=false;if(inHand(p)&&!p.allIn)p.last='';});
  G.currentBet=0;G.minRaise=G.bbAmt;G.dealt=false;
  if(G.street==='river'){showdown();return;}
  G.deck.pop();
  const n=G.street==='preflop'?3:1;G.animFrom=G.board.length;
  for(let k=0;k<n;k++)G.board.push(G.deck.pop());
  typeof sfx==='function'&&sfx('card');
  G.street=G.street==='preflop'?'flop':G.street==='flop'?'turn':'river';
  G.hint=null;
  addLog(`${STREETN[G.street]}：${G.board.map(cardStr).join(' ')}`,'street');
  if(roundNeeded()){G.toAct=nextActor(G.dealer);if(G.toAct>=0){schedule();return;}}
  G.toAct=-1;notify();later(endRound,1.1);
}

function orderFromDealer(arr){const n=G.players.length;return arr.slice().sort((a,b)=>((a.id-G.dealer-1+n)%n)-((b.id-G.dealer-1+n)%n));}

function showdown(){
  G.street='showdown';G.toAct=-1;
  const P=G.players,ih=orderFromDealer(P.filter(inHand));
  ih.forEach(p=>{const b=bestFive([...p.hole,...G.board]);p.score=b.score;p.best=b.cards;p.show=true;addLog(`${p.name} 亮牌 ${p.hole.map(cardStr).join(' ')}：${handName(b.score)}`);});
  const pots=buildPots(P),msgs=[];
  pots.forEach((pot,k)=>{
    const top=Math.max(...pot.elig.map(p=>p.score));
    const ws=orderFromDealer(pot.elig.filter(p=>p.score===top));
    const share=Math.floor(pot.amt/ws.length),rem=pot.amt-share*ws.length;
    ws.forEach(w=>{w.chips+=share;w.win+=share;});ws[0].chips+=rem;ws[0].win+=rem;
    const nm=pots.length>1?(k===0?'主池':`邊池 ${k}`):'底池';
    if(pot.elig.length===1&&k>0)msgs.push(`${ws[0].name} 取回沒人跟的 ${fmtN(pot.amt)}`);
    else msgs.push(`${ws.map(w=>w.name).join('、')} 以${handName(top)}贏得${nm} ${fmtN(pot.amt)}${ws.length>1?'（平分）':''}`);
  });
  G.result=msgs.join('；');msgs.forEach(m=>addLog(m,'win'));
  endHand();
}

function awardFold(w){
  const amt=potTotal();w.chips+=amt;w.win=amt;
  G.result=`其他人都棄牌，${w.name} 贏得底池 ${fmtN(amt)}`;
  addLog(G.result,'win');
  endHand();
}

function endHand(){
  if(G.players[0].win>0)typeof sfx==='function'&&sfx('win');
  G.handOver=true;G.toAct=-1;G.players.forEach(p=>{p.bet=0;});
  const h=G.players[0];G.peak=Math.max(G.peak,h.chips);
  G.review=buildReview();
  typeof recordPokerHand==='function'&&recordPokerHand();
  G.players.forEach(p=>{if(!p.out&&p.chips===0){p.last='籌碼輸光';if(!p.human)addLog(`${p.name} 籌碼輸光，離開牌桌`,'sys');}});
  const alive=G.players.filter(p=>p.chips>0);
  if(G.online){
    if(alive.length===1||!alive.some(q=>q.human)){G.over=true;G.won=h.chips>0&&alive.length===1;G.place=G.players.slice().sort((a,b)=>b.chips-a.chips).indexOf(h)+1;addLog(alive.length===1?`${alive[0].name} 贏下這一場`:'真人玩家都出局了，這一場結束','sys');}
  }
  else if(h.chips===0){G.over=true;G.won=false;G.place=alive.length+1;addLog('你的籌碼輸光了，這一場結束','sys');}
  else if(!G.online&&alive.length===1){G.over=true;G.won=true;G.place=1;addLog('你贏下了這一場！','win');}
  notify();
  if(G.over)onSessionOver();
}

function mkRaise(p,to){
  const max=p.bet+p.chips,tc=G.currentBet-p.bet;
  if(max<=G.currentBet||!G.players.some(q=>q!==p&&canAct(q)))return {type:tc>0?'call':'check'};
  to=Math.round(to/5)*5;to=Math.max(to,G.currentBet+G.minRaise);if(to>max)to=max;
  return {type:'raise',to};
}

function aiDecide(p){
  const toCall=Math.max(0,G.currentBet-p.bet),pot=potTotal(),bb=G.bbAmt;
  const opp=G.players.filter(q=>q!==p&&inHand(q)).length;
  const post=G.board.length>=3,st=PK_STYLES[p.style]||PK_STYLES.balanced;
  const fair=1/(opp+1),req=Math.max(0,(toCall>0?toCall/(pot+toCall):0)-(toCall>0?st.sticky+(post?0:st.loose):0)),R=Math.random(),per={aggr:p.persona.aggr*st.aggr,bluff:p.persona.bluff*st.bluff};
  const bet=f=>mkRaise(p,G.currentBet+Math.max(bb,f*(pot+toCall)));
  const pass={type:toCall?'call':'check'},fold={type:toCall?'fold':'check'};
  if(p.level==='easy'){
    let s;
    if(!post)s=Math.min(1,Math.max(0,chen(p.hole)/12));
    else s=[.15,.45,.7,.8,.85,.88,.92,.97,1][evalScore([...p.hole,...G.board])>>20];
    s=Math.max(0,Math.min(1,s+st.loose));
    if(!toCall){if(s>.65&&R<.5*per.aggr)return bet(.5);if(R<.06)return bet(.4);return pass;}
    if(s>.8&&R<.35)return mkRaise(p,G.currentBet*2);
    if(toCall>p.chips*.5&&s<.6&&R<.75)return fold;
    if(s>.25||R<.55)return pass;
    return fold;
  }
  const e0=p.level==='hard'
    ?equityRange(p.hole,G.board,G.players.filter(q=>q!==p&&inHand(q)).map(q=>q.pfr?8:q.pfc?5:0),700)
    :equity(p.hole,G.board,opp,350);
  if(p.level==='normal'){
    if(!toCall){if(e0>Math.max(.55,fair*1.5)&&R<.75*per.aggr)return bet(.5+R*.25);if(R<per.bluff)return bet(.5);return pass;}
    if(e0>req+.25&&e0>.6&&R<.6*per.aggr)return bet(.7);
    if(e0>=req+.03)return pass;
    if(R<per.bluff*.5&&toCall<=bb*3)return pass;
    return fold;
  }
  // hard: discounts equity when facing a big bet, slowplays monsters, semi-bluffs draws
  const e=toCall>pot*.6?e0*.93:e0;
  const short=p.chips<bb*10,o=post?outsInfo(p.hole,G.board):null;
  if(!post&&toCall<=bb&&e>fair*1.15)return mkRaise(p,G.currentBet+bb*(R<.5?2:2.5));
  if(!toCall){
    if(post&&e>.85&&R<.25)return pass;
    if(e>Math.max(.5,fair*1.15))return bet(e>.75?.75:.55);
    if(o&&o.total>=8&&G.board.length===3&&R<.55)return bet(.5);
    if(post&&opp<=2&&R<per.bluff*1.5)return bet(.6);
    return pass;
  }
  if(short&&e>Math.max(.42,fair*1.3))return mkRaise(p,p.bet+p.chips);
  if(e>req+.18&&e>Math.max(.58,fair*1.3))return (R<.15&&post)?pass:bet(.75);
  if(e>=req)return pass;
  if(o&&o.total>=8&&e>=req-.06)return pass;
  if(post&&opp===1&&R<per.bluff*.4)return mkRaise(p,G.currentBet*2.5);
  return fold;
}

function computeHint(){
  const p=G.players[0];
  if(!inHand(p)||p.allIn){G.hint=null;return;}
  const toCall=Math.max(0,G.currentBet-p.bet),pot=potTotal();
  const opp=G.players.filter(q=>q!==p&&inHand(q)).length;
  const eq=equity(p.hole,G.board,opp,G.board.length?2000:1500);
  const req=toCall>0?toCall/(pot+toCall):0,fair=1/(opp+1);
  let act,reason,tone,size=0;
  if(!toCall){
    if(eq>Math.max(.5,fair*1.6)){act='raise';size=.66;tone='good';reason=`勝率 ${pc(eq)} 明顯高於 ${opp+1} 人平分的 ${pc(fair)}，下注約三分之二底池，讓較弱的牌付錢跟注。`;}
    else{act='check';tone='neutral';reason=eq>fair?'牌力中等，過牌可以免費看下一張牌，也不會讓底池變太大。':`勝率 ${pc(eq)} 偏低，過牌不必多投入籌碼。`;}
  }else if(eq>req+.2&&eq>Math.max(.55,fair*1.8)){act='raise';size=.75;tone='good';reason=`勝率 ${pc(eq)} 遠高於跟注所需的 ${pc(req)}，加注可以把底池做大。`;}
  else if(eq>=req){act='call';tone='good';reason=`勝率 ${pc(eq)} 高於跟注所需的 ${pc(req)}，長期來看跟注有賺。`;}
  else if(eq>=req-.05){act='call';tone='warn';reason=`勝率 ${pc(eq)} 略低於所需的 ${pc(req)}，是邊緣決定，棄牌也合理。`;}
  else{act='fold';tone='bad';reason=`勝率 ${pc(eq)} 低於跟注所需的 ${pc(req)}，這樣跟注長期會虧。`;}
  G.hint={eq,req,opp,toCall,pot,act,reason,tone,size,marginal:tone==='warn',outs:outsInfo(p.hole,G.board),street:G.street};
  if(typeof pkExplain==='function')try{G.hint.ex=pkExplain(G.hint);}catch(_){G.hint.ex=null;}
}

function humanAct(type,to){
  if(G.toAct!==0||G.handOver)return;
  G.decisions.push({street:G.street,type,hint:G.hint});
  act(0,type,to);
}

function buildReview(){
  const notes=[];
  for(const d of G.decisions){
    const h=d.hint;if(!h)continue;const st=STREETN[d.street];
    if(d.type==='fold'&&h.act!=='fold'&&!h.marginal)notes.push(h.toCall?`${st}：你棄牌，但勝率 ${pc(h.eq)} 高於跟注所需的 ${pc(h.req)}，跟注比較划算。`:`${st}：你棄牌，但當時可以免費過牌。`);
    else if((d.type==='call'||d.type==='raise')&&h.act==='fold')notes.push(`${st}：你${d.type==='call'?'跟注':'加注'}，但勝率 ${pc(h.eq)} 低於所需的 ${pc(h.req)}。`);
    else if(d.type==='check'&&h.act==='raise'&&h.eq>.7)notes.push(`${st}：勝率 ${pc(h.eq)} 很高，可以下注向對手收取價值。`);
  }
  return {count:G.decisions.filter(d=>d.hint).length,notes};
}

function preflopLabel(h){
  const r1=h[0]%13,r2=h[1]%13,suited=((h[0]/13)|0)===((h[1]/13)|0),c=chen(h);
  const kind=r1===r2?'口袋對子':suited?(Math.abs(r1-r2)===1?'同花連張':'同花'):(Math.abs(r1-r2)===1?'連張':'不同花');
  const tier=c>=10?'頂級起手牌':c>=8?'強起手牌':c>=6?'可以玩':c>=4?'邊緣牌':'弱牌';
  return {kind,tier,chen:c};
}
// GAME END