// MJ ENGINE START
// Tile kinds: 0-8 萬, 9-17 筒, 18-26 條, 27-30 東南西北, 31-33 中發白, 34-37 春夏秋冬, 38-41 梅蘭竹菊
const MJ_NUM=['一','二','三','四','五','六','七','八','九'];
const MJ_SUIT=['萬','筒','條'];
const MJ_HON=['東','南','西','北','中','發','白'];
const MJ_FLW=['春','夏','秋','冬','梅','蘭','竹','菊'];
const WINDS=['東','南','西','北'];
function tName(k){if(k<27)return MJ_NUM[k%9]+MJ_SUIT[(k/9)|0];if(k<34)return MJ_HON[k-27];return MJ_FLW[k-34];}
function mjCounts(tiles){const c=new Array(34).fill(0);for(const t of tiles)if(t<34)c[t]++;return c;}
function mjWall(){const w=[];for(let k=0;k<34;k++)for(let n=0;n<4;n++)w.push(k);for(let f=34;f<42;f++)w.push(f);for(let i=w.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=w[i];w[i]=w[j];w[j]=t;}return w;}

function mjDecomposable(c,pairUsed){
  let i=0;while(i<34&&c[i]===0)i++;
  if(i===34)return pairUsed;
  if(!pairUsed&&c[i]>=2){c[i]-=2;const ok=mjDecomposable(c,true);c[i]+=2;if(ok)return true;}
  if(c[i]>=3){c[i]-=3;const ok=mjDecomposable(c,pairUsed);c[i]+=3;if(ok)return true;}
  if(i<27&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;const ok=mjDecomposable(c,pairUsed);c[i]++;c[i+1]++;c[i+2]++;if(ok)return true;}
  return false;
}
function mjIsWin(c){let n=0;for(const x of c)n+=x;if(n%3!==2)return false;return mjDecomposable(c,false);}
// 嚦咕嚦咕: 17 concealed tiles = 7 pairs + 1 triplet
function mjIsLigu(c){let n=0,trip=0;for(const x of c){n+=x;if(x===3)trip++;else if(x%2)return false;}return n===17&&trip===1;}
function mjCanWin(c,nMelds){return mjIsWin(c)||(nMelds===0&&mjIsLigu(c));}

function mjDecomps(c){
  const out=[],sets=[];let pair=-1;
  const rec=()=>{
    if(out.length>60)return;
    let i=0;while(i<34&&c[i]===0)i++;
    if(i===34){if(pair>=0)out.push({sets:sets.slice(),pair});return;}
    if(pair<0&&c[i]>=2){c[i]-=2;pair=i;rec();pair=-1;c[i]+=2;}
    if(c[i]>=3){c[i]-=3;sets.push({t:'pung',k:i});rec();sets.pop();c[i]+=3;}
    if(i<27&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;sets.push({t:'chow',k:i});rec();sets.pop();c[i]++;c[i+1]++;c[i+2]++;}
  };
  rec();return out;
}

// Shanten for 5-set hands (16-tile mahjong). Each suit is solved once and cached.
const MJ_MEMO=new Map();
function mjSuitOpts(a,honor){
  const key=(honor?'h':'s')+a.join('');
  const hit=MJ_MEMO.get(key);if(hit)return hit;
  const res=new Set(),L=a.length;
  const rec=(m,t,p)=>{
    let i=0;while(i<L&&a[i]===0)i++;
    if(i===L){res.add(m*100+t*10+p);return;}
    if(a[i]>=3){a[i]-=3;rec(m+1,t,p);a[i]+=3;}
    if(!honor&&i+2<L&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;rec(m+1,t,p);a[i]++;a[i+1]++;a[i+2]++;}
    if(a[i]>=2){a[i]-=2;if(!p)rec(m,t,1);rec(m,t+1,p);a[i]+=2;}
    if(!honor&&i+1<L&&a[i+1]){a[i]--;a[i+1]--;rec(m,t+1,p);a[i]++;a[i+1]++;}
    if(!honor&&i+2<L&&a[i+2]){a[i]--;a[i+2]--;rec(m,t+1,p);a[i]++;a[i+2]++;}
    a[i]--;rec(m,t,p);a[i]++;
  };
  rec(0,0,0);
  const list=[...res].map(v=>[(v/100)|0,((v/10)|0)%10,v%10]);
  const pr=list.filter(x=>!list.some(y=>y!==x&&y[0]>=x[0]&&y[1]>=x[1]&&y[2]>=x[2]&&(y[0]>x[0]||y[1]>x[1]||y[2]>x[2])));
  MJ_MEMO.set(key,pr);return pr;
}
// -1 = complete, 0 = ready (聽牌), n = n tiles away
function mjShanten(c,N){
  const g=[mjSuitOpts(c.slice(0,9)),mjSuitOpts(c.slice(9,18)),mjSuitOpts(c.slice(18,27)),mjSuitOpts(c.slice(27,34),true)];
  let best=99;
  for(const A of g[0])for(const B of g[1]){
    const p1=A[2]+B[2];if(p1>1)continue;
    for(const C of g[2]){const p2=p1+C[2];if(p2>1)continue;
      for(const D of g[3]){const p=p2+D[2];if(p>1)continue;
        const m=Math.min(N,A[0]+B[0]+C[0]+D[0]),t=Math.min(A[1]+B[1]+C[1]+D[1],N-m);
        const s=2*(N-m)-t-p;if(s<best)best=s;}}}
  return best;
}
function mjWaits(c,nMelds){const w=[];for(let k=0;k<34;k++){if(c[k]>=4)continue;c[k]++;if(mjCanWin(c,nMelds))w.push(k);c[k]--;}return w;}

// 台數表: [key, 名稱, 預設台數, 說明]
const MJ_TAI_DEF=[
  ['dealer','莊家',1,'該手有莊家參與輸贏'],
  ['streak','連莊（每連一次）',2,'連 N 拉 N：連一次加 2 台'],
  ['zimo','自摸',1,''],
  ['menqing','門清',1,'沒有吃、碰、明槓'],
  ['buqiuren','不求人',3,'門清自摸，取代門清＋自摸'],
  ['windPung','圈風／門風刻',1,'每組刻子'],
  ['dragonPung','三元牌刻',1,'中、發、白刻子，每組'],
  ['flower','正花',1,'與座位相符的花，每張'],
  ['flowerKong','花槓',2,'集齊一組四張花（含該組正花）'],
  ['duting','獨聽',1,'只聽一種牌'],
  ['haidi','海底撈月／河底撈魚',1,'最後一張自摸，或胡最後一張打出的牌'],
  ['gangkai','槓上開花',1,'槓後補牌自摸'],
  ['qianggang','搶槓',1,'胡別人加槓的那張牌'],
  ['quanqiuren','全求人',2,'全部吃碰，單吊胡別人的牌'],
  ['pinghu','平胡',2,'五組順子，非自摸、非獨聽'],
  ['an3','三暗刻',2,''],['an4','四暗刻',5,''],['an5','五暗刻',8,''],
  ['pengpeng','碰碰胡',4,'全部刻子'],
  ['hunyi','混一色',4,'一種花色＋字牌'],
  ['xiaosanyuan','小三元',4,'三元牌兩刻一對'],
  ['qingyi','清一色',8,'只有一種花色'],
  ['dasanyuan','大三元',8,'三元牌三刻'],
  ['xiaosixi','小四喜',8,'風牌三刻一對'],
  ['qiqiangyi','七搶一',8,'持 7 張花時搶到第 8 張'],
  ['baxian','八仙過海',8,'一人集齊 8 張花'],
  ['ligu','嚦咕嚦咕',8,'7 對＋1 刻'],
  ['ziyi','字一色',16,'全部字牌'],
  ['dasixi','大四喜',16,'風牌四刻'],
  ['dihu','地胡',16,'閒家第一次摸牌就自摸'],
  ['renhu','人胡',16,'閒家第一巡胡別人打的牌'],
  ['tianhu','天胡',24,'莊家配牌就胡'],
];
function mjDefaultTai(){const t={};MJ_TAI_DEF.forEach(([k,,v])=>t[k]=v);return t;}
const MJ_RULE_DEFAULT={levels:['easy','normal','hard'],styles:['random','random','random'],chips:1000,base:50,perTai:20,winds:1,reserve:16,multiWin:false,flowerWin:true,pinghuStrict:true,tai:mjDefaultTai()};

// o: {hand(concealed incl. winning tile), melds, flowers, win, self, seat, round, last, gangkai, rob, special, flowerWin}
function mjScore(o,R){
  const T=R.tai,fi=[];
  const add=(arr,key,name,mult)=>{const v=(T[key]||0)*(mult||1);if(v>0)arr.push({key,name,tai:v});};
  const seasons=o.flowers.filter(f=>f<38),plants=o.flowers.filter(f=>f>=38);
  [[seasons,34,'春夏秋冬'],[plants,38,'梅蘭竹菊']].forEach(([arr,st,nm])=>{
    if(arr.length===4)add(fi,'flowerKong',`花槓（${nm}）`);
    else if(arr.includes(st+o.seat))add(fi,'flower',`正花（${MJ_FLW[st-34+o.seat]}）`);
  });
  const fin=items=>({items,tai:items.reduce((s,x)=>s+x.tai,0)});
  if(o.flowerWin){const it=[];add(it,o.flowerWin,o.flowerWin==='baxian'?'八仙過海':'七搶一');return fin(it.concat(fi));}
  const menq=o.melds.every(m=>m.concealed);
  const c=mjCounts(o.hand);
  const allKinds=[];o.melds.forEach(m=>{if(m.t==='chow')allKinds.push(m.k,m.k+1,m.k+2);else allKinds.push(m.k);});o.hand.forEach(k=>allKinds.push(k));
  const suits=new Set(allKinds.filter(k=>k<27).map(k=>(k/9)|0)),honors=allKinds.some(k=>k>=27);
  const common=it=>{
    if(o.self){if(menq)add(it,'buqiuren','不求人');else add(it,'zimo','自摸');}
    else if(menq)add(it,'menqing','門清');
    if(!suits.size)add(it,'ziyi','字一色');
    else if(suits.size===1){if(honors)add(it,'hunyi','混一色');else add(it,'qingyi','清一色');}
    if(o.last)add(it,'haidi',o.self?'海底撈月':'河底撈魚');
    if(o.gangkai&&o.self)add(it,'gangkai','槓上開花');
    if(o.rob)add(it,'qianggang','搶槓');
    if(o.special)add(it,o.special,{tianhu:'天胡',dihu:'地胡',renhu:'人胡'}[o.special]);
  };
  let best=null;
  const consider=it=>{const r=fin(it.concat(fi));if(!best||r.tai>best.tai)best=r;};
  if(o.melds.length===0&&mjIsLigu(c)){const it=[];add(it,'ligu','嚦咕嚦咕');common(it);consider(it);}
  // waits before the winning tile, for 獨聽
  const before=c.slice();before[o.win]--;
  const nWaits=mjWaits(before,o.melds.length).length;
  for(const d of mjDecomps(c)){
    const it=[];common(it);
    const sets=o.melds.map(m=>({t:m.t==='chow'?'chow':'pung',k:m.k,conc:!!m.concealed}))
      .concat(d.sets.map(s=>({t:s.t,k:s.k,conc:true,hand:true})));
    if(!o.self){
      const inChow=d.sets.some(s=>s.t==='chow'&&o.win>=s.k&&o.win<=s.k+2);
      const pk=sets.find(s=>s.hand&&s.t==='pung'&&s.k===o.win);
      if(pk&&!inChow&&d.pair!==o.win)pk.conc=false;
    }
    const pungs=sets.filter(s=>s.t==='pung'),chows=sets.filter(s=>s.t==='chow');
    const dp=pungs.filter(s=>s.k>=31).length,dPair=d.pair>=31;
    const wp=pungs.filter(s=>s.k>=27&&s.k<=30).length,wPair=d.pair>=27&&d.pair<=30;
    if(dp===3)add(it,'dasanyuan','大三元');
    else if(dp===2&&dPair)add(it,'xiaosanyuan','小三元');
    else if(dp)add(it,'dragonPung',dp>1?`三元牌刻 ×${dp}`:'三元牌刻',dp);
    if(wp===4)add(it,'dasixi','大四喜');
    else if(wp===3&&wPair)add(it,'xiaosixi','小四喜');
    else{
      if(pungs.some(s=>s.k===27+o.round))add(it,'windPung',`圈風（${WINDS[o.round]}）`);
      if(pungs.some(s=>s.k===27+o.seat))add(it,'windPung',`門風（${WINDS[o.seat]}）`);
    }
    if(!chows.length)add(it,'pengpeng','碰碰胡');
    const conc=pungs.filter(s=>s.conc).length;
    if(conc>=5)add(it,'an5','五暗刻');else if(conc===4)add(it,'an4','四暗刻');else if(conc===3)add(it,'an3','三暗刻');
    const allExposed=o.melds.length===5&&o.melds.every(m=>!m.concealed);
    if(allExposed&&!o.self)add(it,'quanqiuren','全求人');
    else if(nWaits===1)add(it,'duting','獨聽');
    if(!pungs.length&&!o.self&&nWaits>1&&!honors&&(!R.pinghuStrict||!o.flowers.length))add(it,'pinghu','平胡');
    consider(it);
  }
  return best||fin(fi);
}
function mjDealerItems(R,streak){
  const it=[];if(R.tai.dealer)it.push({key:'dealer',name:'莊家',tai:R.tai.dealer});
  if(streak&&R.tai.streak)it.push({key:'streak',name:`連${streak}拉${streak}`,tai:R.tai.streak*streak});
  return it;
}
// MJ ENGINE END

// MJ GAME START
const MJ_NAMES=['阿明','小美','老K'];
if(typeof mjRemoteTurn!=='function')var mjRemoteTurn=function(){};
if(typeof mjRemoteClaim!=='function')var mjRemoteClaim=function(){};
const MJ_STYLES={balanced:{name:'平衡',call:0,value:1,defend:1},fast:{name:'速攻',call:1,value:.5,defend:.6},big:{name:'做大牌',call:-1,value:2.5,defend:.9},defend:{name:'防守',call:0,value:1,defend:2.2}};
const MJ_POS=['你','下家','對家','上家'];
let M=null,MGEN=0;
function mjDelay(f){if(M&&M.ff)return 60;return ({slow:1100,mid:650,fast:300}[SET.speed]||650)*(f==null?1:f)*(.8+Math.random()*.4);}
function mjLater(fn,f){const g=MGEN;setTimeout(()=>{if(g!==MGEN)return;if(VIEW!=='mj'&&!M.online){M.resume=fn;return;}fn();},mjDelay(f));}
function mlog(t,k){M.log.unshift({t,k:k||''});if(M.log.length>140)M.log.pop();}
function mjSort(h){h.sort((a,b)=>a-b);}
function seatWind(i){return (i-M.dealer+4)%4;}
function mjRemove(h,k,n){for(let x=0;x<(n||1);x++){const i=h.indexOf(k);if(i<0)throw new Error('tile missing '+k);h.splice(i,1);}}

// custom (online): {rules, players:[4 × {name,human,remote,uid,level,style}]}
function newMjSession(custom){
  MGEN++;
  const R=JSON.parse(JSON.stringify(custom?custom.rules:SET.mj));
  const players=custom?custom.players.map((q,i)=>Object.assign({id:i},q)):[{id:0,name:'你',human:true,level:'normal'}];
  if(!custom)for(let i=0;i<3;i++)players.push({id:i+1,name:MJ_NAMES[i],human:false,level:R.levels[i],style:typeof pickStyle==='function'?pickStyle((R.styles||[])[i],MJ_STYLES):'balanced'});
  players.forEach(p=>{p.chips=R.chips;});
  const d=Math.floor(Math.random()*4);
  M={R,players,dealer:d,startDealer:d,roundWind:0,streak:0,handNo:0,log:[],over:false,peak:R.chips,phase:'end',result:null,ff:false,online:!!custom};
  mlog(`新的一場：底 ${R.base}／每台 ${R.perTai}，每人 ${fmtN(R.chips)} 籌碼，打 ${['','一','兩','三','四'][R.winds]}個風圈`,'sys');
  mjStartHand();
}

function mjStartHand(){
  if(M.over)return;
  M.handNo++;
  M.players.forEach(p=>Object.assign(p,{hand:[],melds:[],flowers:[],river:[]}));
  Object.assign(M,{wall:mjWall(),phase:'deal',turnsTaken:0,noCalls:true,turnsOf:[0,0,0,0],result:null,drawn:null,last:null,afterKong:false,claim:null,decisions:[],review:null,hint:null,ff:false,sel:null,justDrawn:null,resShown:false,wcache:null});
  mlog(`${WINDS[M.roundWind]}風圈 第 ${M.handNo} 局：${M.players[M.dealer].name}坐莊${M.streak?`（連 ${M.streak}）`:''}`,'street');
  for(let r=0;r<4;r++)for(let s=0;s<4;s++){const p=M.players[(M.dealer+s)%4];for(let n=0;n<4;n++)p.hand.push(M.wall.shift());}
  for(let s=0;s<4;s++){if(mjReplaceFlowers((M.dealer+s)%4)==='end')return;}
  M.turn=M.dealer;
  if(mjDraw(M.dealer,false)==='end')return;
  M.players.forEach(p=>mjSort(p.hand));
  mjTurn();
}
function mjReplaceFlowers(i){
  const p=M.players[i];
  for(;;){
    const f=p.hand.findIndex(t=>t>=34);if(f<0)return;
    const t=p.hand.splice(f,1)[0];p.flowers.push(t);
    const fw=mjFlowerCheck(i);if(fw){mjSettleFlower(fw);return 'end';}
    if(M.wall.length<=M.R.reserve){mjExhaust();return 'end';}
    p.hand.push(M.wall.pop());
  }
}
function mjFlowerCheck(i){
  if(!M.R.flowerWin)return null;
  const p=M.players[i];
  if(p.flowers.length===8)return {winner:i,type:'baxian',payer:null};
  for(const q of M.players)if(q!==p&&q.flowers.length===7)return {winner:q.id,type:'qiqiangyi',payer:i};
  return null;
}
// draw for player i; flowers are replaced from the back of the wall
function mjDraw(i,fromBack){
  const p=M.players[i];
  for(;;){
    if(M.wall.length<=M.R.reserve){mjExhaust();return 'end';}
    const t=fromBack?M.wall.pop():M.wall.shift();
    if(t>=34){
      p.flowers.push(t);mlog(`${p.name} 補花 ${tName(t)}`);
      const fw=mjFlowerCheck(i);if(fw){mjSettleFlower(fw);return 'end';}
      fromBack=true;continue;
    }
    p.hand.push(t);M.drawn=t;M.justDrawn=t;return t;
  }
}

function mjTurnOptions(i){
  const p=M.players[i],o={win:false,an:[],jia:[]};
  if(M.drawn==null)return o;
  const c=mjCounts(p.hand);
  o.win=mjCanWin(c,p.melds.length);
  if(M.wall.length>M.R.reserve){
    for(let k=0;k<34;k++)if(c[k]===4)o.an.push(k);
    p.melds.forEach(m=>{if(m.t==='pung'&&c[m.k])o.jia.push(m.k);});
  }
  return o;
}
function mjTurn(){
  if(M.over)return;
  M.phase='turn';
  const i=M.turn,p=M.players[i];
  mjNotify();
  if(p.human){if(p.remote)mjRemoteTurn(i);else mjHumanTurn();return;}
  mjLater(()=>{if(M.phase==='turn'&&M.turn===i)mjAiTurn(i);},1);
}
function mjAiTurnDecide(i){
  const p=M.players[i],o=mjTurnOptions(i);
  if(o.win)return {type:'tsumo'};
  const kc=mjAiKong(p,o);
  if(kc)return {type:kc.type,k:kc.k};
  return {type:'discard',k:mjAiDiscard(p)};
}
function mjApplyTurn(i,d){
  const h=M.players[i].hand;
  if(d.type==='tsumo'&&mjTurnOptions(i).win)mjSelfWin(i);
  else if(d.type==='an'&&h.filter(x=>x===d.k).length===4)mjAnKong(i,d.k);
  else if(d.type==='jia'&&h.includes(d.k))mjJiaGang(i,d.k);
  else if(d.type==='discard'&&h.includes(d.k))mjDiscard(i,d.k);
  else mjDiscard(i,mjAiDiscard(M.players[i]));
}
function mjAiTurn(i){
  const g=MGEN,key=M.handNo+'|'+M.turnsTaken+'|'+M.players[i].hand.length;
  aiRun('mjAITurn',{i},()=>mjAiTurnDecide(i),d=>{
    if(g!==MGEN||M.phase!=='turn'||M.turn!==i||key!==M.handNo+'|'+M.turnsTaken+'|'+M.players[i].hand.length)return;
    mjApplyTurn(i,d);
  });
}

function mjSelfWin(i){
  const p=M.players[i];
  const special=M.noCalls&&M.turnsOf[i]===0?(i===M.dealer?'tianhu':'dihu'):null;
  mjSettle([{i,win:M.drawn,self:true,last:M.wall.length<=M.R.reserve,gangkai:M.afterKong,rob:false,special}],null);
}
function mjAnKong(i,k){
  const p=M.players[i];mjRemove(p.hand,k,4);p.melds.push({t:'kong',k,concealed:true});
  M.noCalls=false;mlog(`${p.name} 暗槓`,'call');
  M.drawn=null;if(mjDraw(i,true)==='end')return;M.afterKong=true;mjSort(p.hand);mjTurn();
}
function mjJiaGang(i,k){
  const p=M.players[i];
  mlog(`${p.name} 加槓 ${tName(k)}`,'call');
  const opts={};
  for(let d=1;d<4;d++){const j=(i+d)%4,q=M.players[j],c=mjCounts(q.hand);c[k]++;if(mjCanWin(c,q.melds.length))opts[j]={win:true};}
  if(!Object.keys(opts).length){mjFinishJia(i,k);return;}
  mjOpenClaim({kind:'rob',k,from:i,opts});
}
function mjFinishJia(i,k){
  const p=M.players[i];mjRemove(p.hand,k);
  const m=p.melds.find(x=>x.t==='pung'&&x.k===k);m.t='kong';m.added=true;
  M.noCalls=false;M.drawn=null;
  if(mjDraw(i,true)==='end')return;M.afterKong=true;mjSort(p.hand);mjTurn();
}

function mjDiscard(i,k){
  const p=M.players[i];
  mjRemove(p.hand,k);mjSort(p.hand);
  p.river.push({k,claimed:false,ts:M.justDrawn===k});typeof sfx==='function'&&sfx('tile');
  M.turnsOf[i]++;M.turnsTaken++;M.last={k,from:i};M.drawn=null;M.justDrawn=null;M.afterKong=false;M.sel=null;
  mlog(`${p.name} 打出 ${tName(k)}`);
  const opts={};
  for(let d=1;d<4;d++){const j=(i+d)%4,o=mjClaimOptions(j,k,i);if(o)opts[j]=o;}
  if(!Object.keys(opts).length){M.phase='between';M.nextDraw=(i+1)%4;mjNotify();mjLater(()=>mjNextDraw(M.nextDraw),.7);return;}
  mjOpenClaim({kind:'discard',k,from:i,opts});
}
function mjClaimOptions(j,k,from){
  const p=M.players[j],c=mjCounts(p.hand),o={};
  c[k]++;if(mjCanWin(c,p.melds.length))o.win=true;c[k]--;
  const canCall=M.wall.length>M.R.reserve;
  if(canCall&&c[k]>=2)o.pong=true;
  if(canCall&&c[k]===3)o.kong=true;
  if(canCall&&j===(from+1)%4&&k<27){
    const v=k%9,ch=[];
    if(v>=2&&c[k-2]&&c[k-1])ch.push(k-2);
    if(v>=1&&v<=7&&c[k-1]&&c[k+1])ch.push(k-1);
    if(v<=6&&c[k+1]&&c[k+2])ch.push(k);
    if(ch.length)o.chow=ch;
  }
  return Object.keys(o).length?o:null;
}
function mjOpenClaim(cl){
  cl.dec={};M.hint=null;M.claim=cl;M.phase='claim';
  const ai=Object.keys(cl.opts).map(Number).filter(j=>!M.players[j].human);
  const g=MGEN;
  const finish=decs=>{
    if(g!==MGEN||M.claim!==cl||M.phase!=='claim')return;
    ai.forEach(j=>{cl.dec[j]=decs&&decs[j]?decs[j]:{type:'pass'};});
    const local=cl.opts[0]&&!cl.dec[0]&&!M.players[0].remote;
    const remotes=Object.keys(cl.opts).map(Number).filter(j=>M.players[j].remote&&!cl.dec[j]);
    if(local||remotes.length){mjNotify();if(local)mjHumanClaim();if(remotes.length)mjRemoteClaim(remotes);return;}
    mjNotify();
    const any=Object.values(cl.dec).some(d=>d.type!=='pass');
    mjLater(mjResolveClaims,any?.8:.7);
  };
  if(!ai.length){finish({});return;}
  aiRun('mjAIClaims',{seats:ai},()=>{const r={};ai.forEach(j=>{r[j]=mjAiClaim(j,cl.opts[j],cl.k);});return r;},finish);
}
function mjResolveClaims(){
  const C=M.claim;if(!C||M.phase!=='claim')return;
  const order=[1,2,3].map(d=>(C.from+d)%4).filter(j=>C.opts[j]);
  const wins=order.filter(j=>C.dec[j]&&C.dec[j].type==='win');
  if(wins.length){
    const ws=M.R.multiWin?wins:[wins[0]];
    const last=M.wall.length<=M.R.reserve;
    mjSettle(ws.map(j=>({i:j,win:C.k,self:false,last:C.kind==='discard'&&last,gangkai:false,rob:C.kind==='rob',
      special:C.kind==='discard'&&M.noCalls&&M.turnsOf[j]===0&&j!==M.dealer?'renhu':null})),C.from);
    return;
  }
  M.claim=null;
  if(C.kind==='rob'){mjFinishJia(C.from,C.k);return;}
  const kp=order.find(j=>C.dec[j]&&(C.dec[j].type==='kong'||C.dec[j].type==='pong'));
  if(kp!=null){mjCall(kp,C,C.dec[kp].type,null);return;}
  const ch=order.find(j=>C.dec[j]&&C.dec[j].type==='chow');
  if(ch!=null){mjCall(ch,C,'chow',C.dec[ch].start);return;}
  mjNextDraw((C.from+1)%4);
}
function mjCall(j,C,type,start){
  const p=M.players[j],k=C.k,src=M.players[C.from];
  src.river[src.river.length-1].claimed=true;
  M.noCalls=false;M.turn=j;M.drawn=null;M.last=null;typeof sfx==='function'&&sfx('claim');
  if(type==='pong'){mjRemove(p.hand,k,2);p.melds.push({t:'pung',k,from:C.from});mlog(`${p.name} 碰 ${tName(k)}`,'call');mjTurn();return;}
  if(type==='kong'){mjRemove(p.hand,k,3);p.melds.push({t:'kong',k,from:C.from});mlog(`${p.name} 槓 ${tName(k)}`,'call');
    if(mjDraw(j,true)==='end')return;M.afterKong=true;mjSort(p.hand);mjTurn();return;}
  for(let x=start;x<start+3;x++)if(x!==k)mjRemove(p.hand,x);
  p.melds.push({t:'chow',k:start,from:C.from,called:k});
  mlog(`${p.name} 吃 ${tName(k)}（${tName(start)}到${tName(start+2)}）`,'call');
  mjTurn();
}
function mjNextDraw(j){
  if(M.over||M.phase==='end')return;
  M.turn=j;M.claim=null;
  if(mjDraw(j,false)==='end')return;
  mjSort(M.players[j].hand);
  mjTurn();
}

function mjExhaust(){
  M.phase='end';M.claim=null;
  M.result={type:'draw'};
  mlog('流局：牌摸完了，沒人胡牌，莊家連莊','sys');
  M.streak++;
  mjEndHand();
}
function mjScoreFor(i,w){
  const p=M.players[i];
  const hand=w.self?p.hand.slice():p.hand.concat([w.win]);
  return mjScore({hand,melds:p.melds,flowers:p.flowers,win:w.win,self:w.self,seat:seatWind(i),round:M.roundWind,last:w.last,gangkai:w.gangkai,rob:w.rob,special:w.special,flowerWin:w.flowerWin},M.R);
}
function mjPay(from,to,amt){const a=Math.min(amt,Math.max(0,M.players[from].chips));M.players[from].chips-=a;M.players[to].chips+=a;return a;}
function mjSettle(ws,payer){
  M.phase='end';M.claim=null;
  const R=M.R,res={type:'win',wins:[],payer};
  for(const w of ws){
    const sc=mjScoreFor(w.i,w);
    const payers=w.self?[0,1,2,3].filter(j=>j!==w.i):[payer];
    const pays=payers.map(j=>{
      const di=(w.i===M.dealer||j===M.dealer)?mjDealerItems(R,M.streak):[];
      const tai=sc.tai+di.reduce((s,x)=>s+x.tai,0);
      const amt=R.base+tai*R.perTai;
      return {j,tai,dealerItems:di,want:amt,paid:mjPay(j,w.i,amt)};
    });
    const p=M.players[w.i];
    res.wins.push({i:w.i,self:w.self,win:w.win,items:sc.items,tai:sc.tai,pays,hand:w.self?p.hand.slice():p.hand.concat([w.win]),melds:p.melds.map(m=>({...m})),flowers:p.flowers.slice(),flowerWin:w.flowerWin});
    const total=pays.reduce((s,x)=>s+x.paid,0);
    mlog(`${p.name}${w.flowerWin?'':w.self?' 自摸':` 胡 ${M.players[payer].name} 的 ${tName(w.win)}`}，${sc.tai} 台，贏 ${fmtN(total)}`,'win');
  }
  M.result=res;if(ws.some(w=>w.i===0))typeof sfx==='function'&&sfx('win');
  if(ws.some(w=>w.i===M.dealer))M.streak++;
  else{M.streak=0;M.dealer=(M.dealer+1)%4;if(M.dealer===M.startDealer)M.roundWind++;}
  mjEndHand();
}
function mjSettleFlower(fw){
  mlog(`${M.players[fw.winner].name} ${fw.type==='baxian'?'八仙過海':'七搶一'}！`,'win');
  mjSettle([{i:fw.winner,win:null,self:fw.payer==null,last:false,gangkai:false,rob:false,special:null,flowerWin:fw.type}],fw.payer);
}
function mjEndHand(){
  M.phase='end';M.claim=null;
  M.review=mjBuildReview();
  typeof recordMjHand==='function'&&recordMjHand();
  const h=M.players[0];M.peak=Math.max(M.peak,h.chips);
  const broke=M.players.filter(p=>p.chips<=0);
  if(broke.length){M.over=true;mlog(`${broke.map(p=>p.name).join('、')} 籌碼輸光，這一場結束`,'sys');}
  else if(M.roundWind>=M.R.winds){M.over=true;mlog('風圈打完，這一場結束','sys');}
  if(M.over){const rank=M.players.slice().sort((a,b)=>b.chips-a.chips);M.place=rank.indexOf(h)+1;}
  mjNotify();
  if(M.over)mjOnSessionOver();
}

// ---------- analysis shared by AI and coach
function mjVisible(viewer){
  const v=new Array(34).fill(0);
  M.players[viewer].hand.forEach(k=>v[k]++);
  M.players.forEach(p=>{
    p.river.forEach(r=>{if(!r.claimed)v[r.k]++;});
    p.melds.forEach(m=>{
      if(m.t==='chow'){v[m.k]++;v[m.k+1]++;v[m.k+2]++;}
      else if(m.concealed&&p.id!==viewer){}
      else v[m.k]+=m.t==='kong'?4:3;
    });
  });
  for(let k=0;k<34;k++)if(v[k]>4)v[k]=4;
  return v;
}
function mjDiscardPref(k){return k>=31?2:k>=27?3:(k%9===0||k%9===8)?1:0;}
function mjAnalysis(i){
  const p=M.players[i],c=mjCounts(p.hand),N=5-p.melds.length,vis=mjVisible(i),res=[];
  for(let k=0;k<34;k++){
    if(!c[k])continue;
    c[k]--;
    const s=mjShanten(c,N);let uk=0;const kinds=[];
    for(let x=0;x<34;x++){const left=4-vis[x];if(left<=0)continue;c[x]++;if(mjShanten(c,N)<s){uk+=left;kinds.push(x);}c[x]--;}
    c[k]++;
    res.push({k,s,uk,kinds});
  }
  res.sort((a,b)=>a.s-b.s||b.uk-a.uk||mjDiscardPref(b.k)-mjDiscardPref(a.k));
  return res;
}
function mjThreat(q){
  if(q.melds.filter(m=>!m.concealed).length>=3)return .9;
  let t=0;const ex=q.melds.filter(m=>!m.concealed).length;
  if(ex>=2)t=.5;
  if(M.wall.length<M.R.reserve+24)t+=.3;
  return Math.min(1,t);
}
function mjDanger(k,q,vis){
  if(q.river.some(r=>r.k===k))return 0;
  if(4-vis[k]<=0)return 0;
  if(k>=27)return vis[k]>=3?.05:vis[k]>=2?.25:.6;
  if(vis[k]>=3)return .25;
  const v=k%9;return v===0||v===8?.55:v===1||v===7?.8:1;
}
// tuning for the hard AI's attack/defence balance (chosen by tests/mj_strength.js)
var MJ_TUNE={k0:3,k1:8,k2:15,kFold:150,foldReady:.7,guardPt:2};
// calibration measured with tests/mj_calibration.js: raw readiness score -> real chance the player is ready,
// danger score -> real chance the tile is a winning tile for a ready player
const mjReadyProb=pt=>Math.max(0,Math.min(.95,.95*pt-.12));
const mjWinTileProb=d=>.006+.105*d;
// ---------- tile reading: how close each opponent is to ready, and how dangerous each tile is against them
function mjReadOpp(i,q,vis){
  const ex=q.melds.filter(m=>!m.concealed),riv=q.river,d=riv.length;
  let pt=d<5?.03:d<8?.1:d<11?.22:d<14?.35:.48;
  pt+=ex.length*.12;
  const left=Math.max(0,M.wall.length-M.R.reserve);
  if(left<20)pt+=.1;
  const recent=riv.slice(-4);
  const still=d>=8&&recent.length>=3&&recent.filter(r=>r.ts).length>=3;
  if(still)pt+=.12;
  const lateMid=d>=9&&riv.slice(-3).some(r=>!r.ts&&r.k<27&&r.k%9>=2&&r.k%9<=6);
  if(lateMid)pt+=.08;
  pt=Math.min(.95,pt);
  const meldSuits=new Set(ex.filter(m=>m.k<27).map(m=>(m.k/9)|0));
  let flush=-1;
  if(ex.length>=2&&meldSuits.size===1)flush=[...meldSuits][0];
  const discSuit=[0,0,0];riv.forEach(r=>{if(r.k<27)discSuit[(r.k/9)|0]++;});
  const discTotal=discSuit[0]+discSuit[1]+discSuit[2];
  let avoided=-1;
  if(flush<0&&d>=8&&discTotal>=6)for(let s2=0;s2<3;s2++)if(discSuit[s2]===0){avoided=s2;flush=s2;}
  const inRiver=new Set(riv.map(r=>r.k));
  const danger=new Array(34).fill(0);
  for(let k=0;k<34;k++){
    if(4-vis[k]<=0)continue;
    let w;
    if(inRiver.has(k))w=.08;
    else if(k>=27){w=vis[k]>=3?.06:vis[k]>=2?.3:.55;if(flush>=0)w*=1.2;}
    else{
      const n=k%9,su=(k/9)|0,base=su*9;
      w=(n===0||n===8)?.55:(n===1||n===7)?.8:1;
      const sides=[];if(n>=3)sides.push(inRiver.has(k-3));if(n<=5)sides.push(inRiver.has(k+3));
      const safe=sides.filter(Boolean).length;
      if(sides.length&&safe===sides.length)w*=.4;else if(safe)w*=.7;
      const nb=x=>x>=base&&x<base+9?vis[x]:4;
      if(nb(k-1)>=4&&nb(k+1)>=4)w*=.35;else if(nb(k-1)>=4||nb(k+1)>=4)w*=.75;
      if(vis[k]>=3)w*=.4;
      if(flush>=0)w*=su===flush?1.5:.35;
    }
    danger[k]=Math.min(1,w);
  }
  return {q,pt,danger,flush,avoided,ex:ex.length,d,still,inRiver};
}
function mjRead(i){
  const vis=mjVisible(i);
  const opps=M.players.filter(q=>q.id!==i).map(q=>mjReadOpp(i,q,vis));
  const map={};let maxT=0;
  opps.forEach(o=>{o.ready=mjReadyProb(o.pt);});
  // map[k] = estimated chance that discarding k deals in to someone
  for(let k=0;k<34;k++){let s2=0;opps.forEach(o=>{s2=1-(1-s2)*(1-o.ready*(o.danger[k]>0?mjWinTileProb(o.danger[k]):0));});map[k]=s2;}
  opps.forEach(o=>{maxT=Math.max(maxT,o.ready);});
  return {map,maxT,threats:opps.filter(o=>o.ready>=.4).map(o=>o.q),opps,calibrated:true};
}
function mjDangerMap(i){
  const vis=mjVisible(i),out={};let maxT=0;
  const qs=M.players.filter(q=>q.id!==i).map(q=>({q,t:mjThreat(q)}));
  qs.forEach(x=>maxT=Math.max(maxT,x.t));
  for(let k=0;k<34;k++){let d=0;qs.forEach(({q,t})=>{if(t>0)d=Math.max(d,t*mjDanger(k,q,vis));});out[k]=d;}
  return {map:out,maxT,threats:qs.filter(x=>x.t>=.5).map(x=>x.q)};
}

function mjAiDiscard(p){
  const an=mjAnalysis(p.id),lv=p.level;
  if(lv==='easy'){
    const c=mjCounts(p.hand);
    const iso=an.filter(a=>c[a.k]===1&&(a.k>=27||![-2,-1,1,2].some(d=>{const x=a.k+d;return x>=0&&x<27&&((x/9)|0)===((a.k/9)|0)&&c[x];})));
    if(iso.length&&Math.random()<.6)return iso[Math.floor(Math.random()*iso.length)].k;
    const sc=an.map(a=>({k:a.k,v:a.s*10-a.uk*.1+Math.random()*9}));sc.sort((a,b)=>a.v-b.v);return sc[0].k;
  }
  const st=MJ_STYLES[p.style]||MJ_STYLES.balanced;
  if(lv==='normal'&&p.style==='balanced')return an[0].k;
  // hard: efficiency + tile reading (attack or defend) + leaning toward one suit
  const reading=lv==='hard'&&!p.readOff;
  const dm=reading?mjRead(p.id):mjDangerMap(p.id),s0=an[0].s;
  const all=p.hand.concat(...p.melds.map(m=>m.t==='chow'?[m.k,m.k+1,m.k+2]:[m.k,m.k,m.k]));
  const sc=[0,0,0];all.forEach(k=>{if(k<27)sc[(k/9)|0]++;});
  const hon=all.filter(k=>k>=27).length,dom=sc.indexOf(Math.max(...sc));
  const leaning=sc[dom]+hon>=all.length-3&&p.melds.every(m=>m.k>=27||((m.k/9)|0)===dom);
  let W=(dm.maxT>=.9?(s0>=2?8:s0===1?3:1):0)*st.defend*(lv==='normal'?.6:1);
  if(reading){
    const T=MJ_TUNE,fold=s0>=2&&dm.maxT>=T.foldReady;
    W=(fold?T.kFold:s0===0?T.k0:s0===1?T.k1:T.k2)*st.defend;
  }
  const c=mjCounts(p.hand);
  let best=null;
  for(const a of an){
    let v=a.s*10-a.uk*.12+dm.map[a.k]*W;
    if(leaning&&sc[dom]+hon>=all.length-1-(st.value>1?2:0)&&(a.k>=27||((a.k/9)|0)===dom))v+=st.value;
    const value=a.k>=31||a.k===27+M.roundWind||a.k===27+seatWind(p.id);
    if(value&&c[a.k]>=2)v+=1.5;
    if(!best||v<best.v)best={k:a.k,v};
  }
  return best.k;
}
function mjAiKong(p,o){
  const lv=p.level,c=mjCounts(p.hand),N=5-p.melds.length;
  if(o.jia.length)return {type:'jia',k:o.jia[0]};
  for(const k of o.an){
    if(lv==='easy')return {type:'an',k};
    let s0=99;for(let x=0;x<34;x++)if(c[x]){c[x]--;s0=Math.min(s0,mjShanten(c,N));c[x]++;}
    c[k]-=4;const s1=mjShanten(c,N-1);c[k]+=4;
    if(s1<=s0)return {type:'an',k};
  }
  return null;
}
function mjAfterCall(c,remove,N){
  const c2=c.slice();remove.forEach(x=>c2[x]--);
  let best=99;for(let x=0;x<34;x++)if(c2[x]){c2[x]--;best=Math.min(best,mjShanten(c2,N-1));c2[x]++;}
  return best;
}
function mjClaimEval(j,o,k){
  const p=M.players[j],c=mjCounts(p.hand),N=5-p.melds.length,s0=mjShanten(c,N);
  const value=k>=31||k===27+M.roundWind||k===27+seatWind(j);
  const menq=p.melds.every(m=>m.concealed);
  const r={s0,value,menq};
  if(o.pong)r.pong=mjAfterCall(c,[k,k],N);
  if(o.kong){c[k]-=3;r.kong=mjShanten(c,N-1);c[k]+=3;}
  if(o.chow){let bs=99,st=null;for(const s of o.chow){const rm=[];let used=false;for(const x of [s,s+1,s+2]){if(x===k&&!used){used=true;continue;}rm.push(x);}const v=mjAfterCall(c,rm,N);if(v<bs){bs=v;st=s;}}r.chow=bs;r.chowStart=st;}
  return r;
}
function mjAiClaim(j,o,k){
  const p=M.players[j],lv=p.level,R=Math.random();
  if(o.win)return {type:'win'};
  const e=mjClaimEval(j,o,k);
  if(o.kong&&(lv==='easy'||e.kong<=e.s0))return {type:'kong'};
  const st=MJ_STYLES[p.style]||MJ_STYLES.balanced;
  let guard=(lv==='hard'&&e.menq&&e.s0===0)||(st.call<0&&e.menq&&e.s0<=2);
  // hard: far from ready while someone looks ready -> keep the hand closed so it can defend
  if(lv==='hard'&&!p.readOff&&e.s0>=2&&!e.value&&mjRead(j).maxT>=MJ_TUNE.guardPt)guard=true;
  if(o.pong){
    if(lv==='easy'){if(R<.75)return {type:'pong'};}
    else if(e.value&&e.pong<=e.s0)return {type:'pong'};
    else if((e.pong<e.s0||(st.call>0&&e.pong<=e.s0))&&!guard)return {type:'pong'};
  }
  if(o.chow){
    if(lv==='easy'){if(R<.55)return {type:'chow',start:e.chowStart};}
    else if((e.chow<e.s0||(st.call>0&&e.chow<=e.s0&&e.s0<=2))&&!guard)return {type:'chow',start:e.chowStart};
  }
  return {type:'pass'};
}

// ---------- coach
function mjPreview(i,w,self){
  const p=M.players[i];
  const hand=p.hand.concat([w]);
  return mjScore({hand,melds:p.melds,flowers:p.flowers,win:w,self,seat:seatWind(i),round:M.roundWind,last:false,gangkai:false,rob:false,special:null},M.R).tai;
}
function mjWaitInfo(i,handTiles){
  const p=M.players[i],c=mjCounts(handTiles),vis=mjVisible(i);
  return mjWaits(c,p.melds.length).map(w=>{
    const save=p.hand;p.hand=handTiles;
    const t1=mjPreview(i,w,false),t2=mjPreview(i,w,true);p.hand=save;
    return {k:w,left:Math.max(0,4-vis[w]),ron:t1,tsumo:t2};
  });
}
function mjComputeHint(){
  const p=M.players[0];
  if(M.phase==='turn'&&M.turn===0){
    const o=mjTurnOptions(0),an=mjAnalysis(0);
    const h={kind:'turn',o,an,cur:an.length?an[0].s:0,dm:mjRead(0)};
    if(o.win){h.winTai=mjScore({hand:p.hand.slice(),melds:p.melds,flowers:p.flowers,win:M.drawn,self:true,seat:seatWind(0),round:M.roundWind,last:M.wall.length<=M.R.reserve,gangkai:M.afterKong,rob:false,special:null},M.R).tai;}
    const top=an[0];
    if(top&&top.s===0){const rest=p.hand.slice();rest.splice(rest.indexOf(top.k),1);h.waits=mjWaitInfo(0,rest);}
    h.anKong=o.an.map(k=>{const c=mjCounts(p.hand),N=5-p.melds.length;c[k]-=4;return {k,s:mjShanten(c,N-1)};});
    if(typeof mjExplainTurn==='function')try{h.ex=mjExplainTurn(h,p);}catch(_){h.ex=null;}
    M.hint=h;return;
  }
  if(M.phase==='claim'&&M.claim&&M.claim.opts[0]){
    const C=M.claim,o=C.opts[0],k=C.k;
    if(o.win){
      const w={i:0,win:k,self:false,last:M.wall.length<=M.R.reserve,gangkai:false,rob:C.kind==='rob',special:null};
      const tai=mjScoreFor(0,w).tai;M.hint={kind:'claim',rec:'win',tai,reason:'可以胡牌！',ex:typeof mjExplainRon==='function'?mjExplainRon(tai):null};return;
    }
    const e=mjClaimEval(0,o,k),pass=mjAiClaim(0,o,k);
    const r={kind:'claim',e,rec:pass.type,start:pass.start};
    const sn=s=>s<=0?'聽牌':`${s} 向聽`;
    const lines=[];
    if(o.kong)lines.push(`槓：向聽 ${sn(e.s0)} → ${sn(e.kong)}，還能多摸一張`);
    if(o.pong)lines.push(`碰：向聽 ${sn(e.s0)} → ${sn(e.pong)}${e.value?'，而且是有台的字牌':''}`);
    if(o.chow)lines.push(`吃：向聽 ${sn(e.s0)} → ${sn(e.chow)}`);
    if(e.menq&&(o.pong||o.chow))lines.push(`吃或碰會失去門清（${M.R.tai.menqing} 台）與不求人的機會`);
    r.lines=lines;
    if(typeof mjExplainClaim==='function')try{r.ex=mjExplainClaim(r,o,k);}catch(_){r.ex=null;}
    M.hint=r;return;
  }
  M.hint=null;
}
function mjHumanDiscard(k){
  if(M.phase!=='turn'||M.turn!==0||!M.players[0].hand.includes(k))return;
  const h=M.hint&&M.hint.kind==='turn'?M.hint:null;
  if(h){const ch=h.an.find(a=>a.k===k);M.decisions.push({no:M.turnsOf[0]+1,k,chosen:ch,best:h.an[0]});}
  mjDiscard(0,k);
}
function mjClaimAllIn(){const C=M.claim;return !!C&&Object.keys(C.opts).every(j=>C.dec[j]);}
function mjHumanClaim2(type,start,seat){
  seat=seat||0;
  if(M.phase!=='claim'||!M.claim||!M.claim.opts[seat]||M.claim.dec[seat])return;
  M.claim.dec[seat]={type,start};
  if(!mjClaimAllIn()){mjNotify();return;}
  if(type!=='pass')mjResolveClaims();else mjLater(mjResolveClaims,.4);
}
function mjBuildReview(){
  const notes=[];
  for(const d of M.decisions){
    if(!d.chosen||!d.best)continue;
    if(d.chosen.s>d.best.s)notes.push(`第 ${d.no} 巡打${tName(d.k)}，向聽數變差（打${tName(d.best.k)}可維持 ${d.best.s<=0?'聽牌':d.best.s+' 向聽'}）。`);
    else if(d.best.uk-d.chosen.uk>=6)notes.push(`第 ${d.no} 巡打${tName(d.k)}，有效進張比打${tName(d.best.k)}少 ${d.best.uk-d.chosen.uk} 張。`);
  }
  const r=M.result;
  if(r&&r.type==='win'&&r.payer===0&&!r.wins.some(w=>w.self))notes.push(`你打的${tName(r.wins[0].win)}放槍給${r.wins.map(w=>M.players[w.i].name).join('、')}。`);
  return {count:M.decisions.length,notes};
}
// MJ GAME END
