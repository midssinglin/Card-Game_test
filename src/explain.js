// EXPLAIN START
// Plain-language coach explanations. Each returns {summary, why, logic, risk, alt} (strings / string lists).
// These run inside computeHint / mjComputeHint, so they also work in the background worker.
const xpct=x=>Math.round(x*100)+'%';
const xpct1=x=>x<.01?(x<.002?'不到 0.2%':(x*100).toFixed(1)+'%'):Math.round(x*100)+'%';
const xnum=n=>Number(n).toLocaleString('en-US');
const xs=s=>s<0?'胡牌':s===0?'聽牌':`${s} 向聽`;

// ================= poker
function pkStory(hole,board){
  const R=c=>c%13,Su=c=>(c/13)|0,name=r=>RN[r];
  if(board.length<3){
    const pl=preflopLabel(hole),hi=Math.max(R(hole[0]),R(hole[1])),lo=Math.min(R(hole[0]),R(hole[1]));
    let t=`你拿到 ${hole.map(cardStr).join(' ')}（${pl.kind}），屬於${pl.tier}。`;
    if(pl.kind==='口袋對子')t+=hi>=9?'大對子本身就常常是最好的牌。':'小對子主要靠翻牌中三條（約 12% 機會）才會變強。';
    else if(hi>=11&&lo>=9)t+='兩張都是大牌，配中時常常是最大的對子。';
    else if(pl.kind==='同花'||pl.kind==='同花連張')t+='同花讓它多了湊成同花的機會，但機率不高（約 6%）。';
    return {text:t,cat:-1,pairKind:null};
  }
  const sc=evalScore(hole.concat(board)),cat=sc>>20,bsc=evalScore(board),bcat=bsc>>20;
  const br=board.map(R).sort((a,b)=>b-a),top=br[0];
  let text,pairKind=null;
  if(cat>=2&&cat>bcat)text=`你組成了${handName(sc)}，這在大多數牌面都算強牌。`;
  else if(cat>=2)text=`牌面本身就有${handName(bsc)}，大家共用；你自己的牌幫助不大，要比的是剩下的牌。`;
  else if(cat===1){
    const pr=(sc>>16)&15;
    if(bcat===1&&!hole.some(c=>R(c)===pr)){text='牌面上有一對，但那是大家共用的，你自己沒配中，實際上只有高牌。';pairKind='board';}
    else if(R(hole[0])===R(hole[1])){
      if(pr>top){text=`你有口袋對子 ${name(pr)}，比牌面上的牌都大（超對）。`;pairKind='over';}
      else{text=`你有口袋對子 ${name(pr)}，但牌面上有更大的 ${name(top)}，對手配中它就贏你。`;pairKind='under';}
    }else if(pr===top){
      const kick=Math.max(...hole.map(R).filter(r=>r!==pr));
      text=`你配中了牌面最大的牌（頂對 ${name(pr)}），另一張是 ${name(kick)}${kick>=10?'，算不錯':'，比較弱，同樣頂對的對手可能比你大'}。`;pairKind=kick>=10?'topgood':'topweak';
    }else{text=`你配中了 ${name(pr)} 的對子，但牌面上有更大的 ${name(top)}（中對或底對），容易被比下去。`;pairKind='mid';}
  }else{text='你目前只有高牌，沒有配中牌面。';pairKind='none';}
  return {text,cat,pairKind};
}
function pkDraws(o){
  if(!o||!o.total)return [];
  const d=[];
  if((o.by[5]||0)>=8)d.push(`同花聽牌（還有 ${o.by[5]} 張能湊成同花）`);
  if((o.by[4]||0)>=8)d.push(`兩頭順子聽牌（${o.by[4]} 張能成順）`);
  else if((o.by[4]||0)>=4)d.push(`卡順聽牌（只有 ${o.by[4]} 張能成順）`);
  return d;
}
function pkTexture(hole,board){
  const out=[];if(board.length<3)return out;
  const suits=[0,0,0,0];board.forEach(c=>suits[(c/13)|0]++);
  const maxS=Math.max(...suits),fs=suits.indexOf(maxS),mine=hole.filter(c=>((c/13)|0)===fs).length;
  const myCat=evalScore(hole.concat(board))>>20;
  if(maxS>=3&&myCat<5&&mine===0)out.push(`牌面已有 ${maxS} 張${SUITS[fs]}，對手手上只要有${maxS>=4?'一':'兩'}張${SUITS[fs]}就是同花。`);
  else if(maxS===2&&board.length<5&&mine<2)out.push(`牌面有兩張${SUITS[fs]}，對手可能在等同花（之後再出${SUITS[fs]}就要小心）。`);
  const rs=[...new Set(board.map(c=>c%13))];if(rs.includes(12))rs.push(-1);
  if(myCat<4&&rs.some(x=>rs.filter(y=>y>=x&&y<=x+4).length>=3))out.push('牌面的點數很接近，可能有人已經成順或在等順子。');
  if(new Set(board.map(c=>c%13)).size<board.length&&myCat<6)out.push('牌面有對子，對手可能拿到三條，甚至葫蘆。');
  return out;
}
function pkExplain(h){
  const p=G.players[0],hole=p.hole,board=G.board,ex={summary:'',why:[],logic:[],risk:[],alt:[]};
  const story=pkStory(hole,board),draws=pkDraws(h.outs),tex=pkTexture(hole,board);
  const pot=h.pot,tc=h.toCall,evCall=tc?h.eq*pot-(1-h.eq)*tc:0;
  const opps=G.players.filter(q=>q!==p&&inHand(q));
  const raiser=opps.filter(q=>q.pfr).map(q=>q.name);
  const last=G.dealer===0&&board.length>=3;
  const betAmt=Math.max(G.bbAmt,Math.round((G.currentBet+h.size*(pot+tc))/5)*5);
  const stackPct=tc?tc/(p.chips+p.bet):0;
  // summary + motive
  const act=h.act;
  if(act==='fold'){
    ex.summary=`建議棄牌：要再付 ${xnum(tc)} 才能繼續，但你贏的機會約 ${xpct(h.eq)}，不夠付這個價錢。`;
    ex.why.push('少輸就是賺：這手牌繼續玩下去，平均下來會讓你輸更多籌碼。');
    if(evCall<0)ex.why.push(`以現在的底池計算，跟注一次平均虧約 ${xnum(Math.round(-evCall))} 籌碼。`);
  }else if(act==='call'){
    ex.summary=h.marginal?`可跟可棄：贏的機會約 ${xpct(h.eq)}，和跟注需要的 ${xpct(h.req)} 差不多。`
      :`建議跟注：花 ${xnum(tc)} 去搶 ${xnum(pot+tc)} 的底池，你約有 ${xpct(h.eq)} 會贏，划算。`;
    ex.why.push(h.marginal?'跟或棄長期差不多，可以依對手的習慣決定：對手常詐唬就跟，對手很保守就棄。':'價錢合理：你贏的機會比「打平所需」還高，長期跟注會賺。');
    if(draws.length)ex.why.push(`你有${draws.join('、')}，就算現在落後，下一張也可能翻盤。`);
  }else if(act==='check'){
    ex.summary=h.eq>h.req&&h.eq>1/(h.opp+1)?'建議過牌：牌力中等，不用下注也能免費看下一張牌。':'建議過牌：牌不強，不必多投入籌碼，能免費看牌就看。';
    ex.why.push('過牌不花錢：保留看下一張牌的機會，也不會讓底池變大。');
    if(story.pairKind==='mid'||story.pairKind==='under'||story.pairKind==='topweak')ex.why.push('中等牌下注，通常只有比你強的牌會跟，弱牌會直接棄掉，下注反而不划算。');
  }else{
    ex.summary=tc?`建議加注：你的牌很可能領先（贏的機會約 ${xpct(h.eq)}），加注把底池做大。`:`建議下注約 ${xnum(betAmt)}：你的牌很可能領先，讓比較弱的牌付錢。`;
    const semi=(story.pairKind==='none'||story.pairKind==='board')&&draws.length;
    if(semi){
      ex.why.push('這是「半詐唬」：你現在還不是最大的牌，但有很多張牌能讓你變強。');
      ex.why.push('下注有兩種贏法：對手棄牌，你直接拿下底池；對手跟注，你還有機會在後面湊成牌。');
    }else{
      ex.why.push('有好牌時要主動下注收錢：對手跟注的牌多半比你弱，每次跟注你都在賺。');
      if(tex.length)ex.why.push('也是在保護你的牌：讓還在等同花、順子的對手付出代價，不給他們免費看牌。');
    }
    ex.why.push(`下注大小約底池的 ${Math.round(h.size*100)}%：夠大讓聽牌的對手不划算（同花聽牌到下一張只有約 20%），又不會大到只剩更強的牌跟。`);
  }
  // reasoning
  ex.logic.push(story.text);
  if(draws.length&&act!=='call')ex.logic.push(`你還有${draws.join('、')}。`);
  ex.logic.push(`電腦模擬：對 ${h.opp} 位對手，你最後贏的機會約 ${xpct(h.eq)}（${h.opp+1} 個人平分的話是 ${xpct(1/(h.opp+1))}）。`);
  if(tc)ex.logic.push(`要付 ${xnum(tc)} 搶 ${xnum(pot+tc)}，所以至少要贏 ${xpct(h.req)} 的機會才打平；你有 ${xpct(h.eq)}，${h.eq>=h.req?'夠了':'不夠'}。`);
  if(tc&&Math.abs(evCall)>=1)ex.logic.push(`換算成籌碼：這次跟注平均${evCall>=0?'賺':'虧'}約 ${xnum(Math.round(Math.abs(evCall)))}（如果同樣的情況打 100 次，總共${evCall>=0?'多贏':'多輸'}約 ${xnum(Math.round(Math.abs(evCall)*100))}）。`);
  if(h.outs&&h.outs.total&&board.length<5)ex.logic.push(`能讓你變強的牌有 ${h.outs.total} 張，下一張就中的機會約 ${xpct(h.outs.next)}${board.length===3?`，到河牌前約 ${xpct(h.outs.river)}`:''}。`);
  if(board.length>=3)ex.logic.push(last?'你在按鈕位，每一輪都最後行動，能先看完對手的動作再決定，這是優勢。':'你不是最後行動的人，後面的對手看完你的動作才決定，選擇要保守一點。');
  if(raiser.length&&board.length>=3)ex.logic.push(`${raiser.join('、')} 翻牌前加注過，通常代表牌比較強，要把這點算進去。`);
  // risks
  tex.forEach(t=>ex.risk.push(t));
  if(story.pairKind==='topweak')ex.risk.push('頂對但另一張小：如果對手也配中同一張，通常是他的另一張比較大。');
  if(story.pairKind==='under'||story.pairKind==='mid')ex.risk.push('牌面上有比你的對子更大的牌，對手只要配中它就領先。');
  if(act==='call'&&board.length<5)ex.risk.push('跟注之後，下一輪對手可能再下注，到時候要再付一次錢。');
  if(stackPct>=.3)ex.risk.push(`這次要投入你約 ${xpct(stackPct)} 的籌碼，輸了會大傷元氣。`);
  if((act==='raise'||act==='call')&&opps.length>=3)ex.risk.push(`還有 ${opps.length} 位對手，人越多，有人拿到更強牌的機會越高。`);
  if(act==='fold'&&tc)ex.risk.push(`棄牌就放棄底池裡已有的 ${xnum(pot)}；如果對手其實在詐唬，你會錯過這些籌碼，但長期來看棄牌仍然比較好。`);
  if(act==='raise'&&!tex.length)ex.risk.push('牌面很安全時，下注太大會把弱牌都嚇跑，反而收不到錢。');
  if(!ex.risk.length)ex.risk.push('目前沒有特別的危險訊號。');
  // alternatives
  if(act!=='fold'&&tc)ex.alt.push(`棄牌：不再花錢，但放棄${evCall>0?`期望值為正（平均 +${xnum(Math.round(evCall))}）的`:''}這個底池。`);
  if(act!=='call'&&tc)ex.alt.push(h.eq>=h.req?'只跟注：也有賺，但收不到對手更多的錢。':`跟注：每次平均虧約 ${xnum(Math.round(-evCall))}，除非你很確定對手在詐唬。`);
  if(act!=='check'&&!tc)ex.alt.push('過牌：讓對手免費看牌，可能讓聽牌的人追上；但可以誘使對手下注（慢打）。');
  if(act!=='raise')ex.alt.push(tc?(h.eq>.6?'加注：你很可能領先，加注能讓底池更大。':'加注：只會讓比你強的牌留下來，風險高。'):(h.eq>.6?'下注：你很可能領先，可以下注收錢。':'下注：中等或較弱的牌下注，跟你的多半比你強。'));
  return ex;
}

// ================= mahjong: hand shape
const MJ_BMEMO=new Map();
function mjSuitBlocks(a,honor,base){
  const key=(honor?'h':'s')+base+a.join('');
  const hit=MJ_BMEMO.get(key);if(hit)return hit;
  const best={},L=a.length,bl=[];
  const rec=(m,t,p,q)=>{
    let i=0;while(i<L&&a[i]===0)i++;
    if(i===L){const k=m*100+t*10+p;if(!best[k]||best[k].q<q)best[k]={m,t,p,q,blocks:bl.slice()};return;}
    const push=(b,f)=>{bl.push(b);f();bl.pop();};
    if(a[i]>=3){a[i]-=3;push({t:'set',tiles:[base+i,base+i,base+i]},()=>rec(m+1,t,p,q+3));a[i]+=3;}
    if(!honor&&i+2<L&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;push({t:'set',tiles:[base+i,base+i+1,base+i+2]},()=>rec(m+1,t,p,q+3));a[i]++;a[i+1]++;a[i+2]++;}
    if(a[i]>=2){a[i]-=2;if(!p)push({t:'pair',tiles:[base+i,base+i]},()=>rec(m,t,1,q+2));push({t:'pairp',tiles:[base+i,base+i]},()=>rec(m,t+1,p,q+2));a[i]+=2;}
    if(!honor&&i+1<L&&a[i+1]){a[i]--;a[i+1]--;const edge=i===0||i===7;push({t:edge?'penchan':'ryanmen',tiles:[base+i,base+i+1]},()=>rec(m,t+1,p,q+(edge?1:2.5)));a[i]++;a[i+1]++;}
    if(!honor&&i+2<L&&a[i+2]){a[i]--;a[i+2]--;push({t:'kanchan',tiles:[base+i,base+i+2]},()=>rec(m,t+1,p,q+1.2));a[i]++;a[i+2]++;}
    a[i]--;push({t:'single',tiles:[base+i]},()=>rec(m,t,p,q));a[i]++;
  };
  rec(0,0,0,0);
  const out=Object.values(best);MJ_BMEMO.set(key,out);return out;
}
function mjShape(c,N){
  const g=[mjSuitBlocks(c.slice(0,9),false,0),mjSuitBlocks(c.slice(9,18),false,9),mjSuitBlocks(c.slice(18,27),false,18),mjSuitBlocks(c.slice(27,34),true,27)];
  let best=null;
  for(const A of g[0])for(const B of g[1]){if(A.p+B.p>1)continue;for(const C of g[2]){if(A.p+B.p+C.p>1)continue;for(const D of g[3]){
    const p=A.p+B.p+C.p+D.p;if(p>1)continue;
    const M0=A.m+B.m+C.m+D.m,T0=A.t+B.t+C.t+D.t,m=Math.min(N,M0),t=Math.min(T0,N-m),s=2*(N-m)-t-p,q=A.q+B.q+C.q+D.q;
    if(!best||s<best.s||(s===best.s&&q>best.q))best={s,q,m:M0,t:T0,p,blocks:A.blocks.concat(B.blocks,C.blocks,D.blocks)};
  }}}
  return best;
}
const MJ_BLOCK_NAME={ryanmen:'兩面搭子',penchan:'邊張搭子',kanchan:'嵌張搭子',pairp:'對子',pair:'對子（當眼）',set:'面子',single:'孤張'};
function mjBlockWaits(b){
  const [x,y]=b.tiles;
  if(b.t==='ryanmen')return `${tName(x-1)}或${tName(y+1)}`;
  if(b.t==='penchan')return x%9===0?tName(y+1):tName(x-1);
  if(b.t==='kanchan')return tName(x+1);
  if(b.t==='pairp'||b.t==='pair')return `第三張${tName(x)}`;
  return '';
}
function mjTilesStr(ts){return ts.map(tName).join('');}

// ================= mahjong: discard explanation
function mjOppReasons(o){
  const r=[];
  if(o.ex)r.push(`已經吃碰 ${o.ex} 組`);
  r.push(`打了 ${o.d} 張牌`);
  if(o.still)r.push('最近幾張都是摸什麼打什麼（手牌沒在變，可能已經聽了）');
  if(o.avoided>=0)r.push(`一直沒打過${MJ_SUIT[o.avoided]}子，可能在做${MJ_SUIT[o.avoided]}子`);
  else if(o.flush>=0)r.push(`吃碰的都是${MJ_SUIT[o.flush]}子，可能在做${MJ_SUIT[o.flush]}子一色`);
  return r.join('、');
}
function mjExplainTurn(h,p){
  const ex={summary:'',why:[],logic:[],risk:[],alt:[]};
  const an=h.an,top=an[0];if(!top)return ex;
  const c=mjCounts(p.hand),N=5-p.melds.length,shape=mjShape(c,N),rd=h.dm,vis=mjVisible(0);
  const k=top.k,risk=rd.map[k]||0;
  if(h.o.win){
    ex.summary=`可以自摸胡牌（預估 ${h.winTai} 台），直接胡。`;
    ex.why.push('胡牌就是這一局的目標；自摸時三家都要付錢給你。');
    ex.logic.push(`每家付：底 ${M.R.base} ＋ ${h.winTai} 台 × ${M.R.perTai}${M.R.tai.dealer?'，有莊家參與時再加莊家台':''}。`);
    ex.logic.push('想做更大的牌而不胡，要冒著別人先胡的風險，通常不划算。');
    ex.risk.push('自摸不會放槍，沒有風險。');
    ex.alt.push('不胡繼續打：只有在差一點就能湊成大牌型（例如清一色）時才考慮。');
    return ex;
  }
  // role of the suggested tile in the hand
  const blk=shape&&shape.blocks.find(b=>b.t==='single'&&b.tiles[0]===k)||shape&&shape.blocks.find(b=>b.t!=='set'&&b.tiles.includes(k))||null;
  const needPartials=Math.max(0,N-(shape?Math.min(N,shape.m):0));
  const partials=shape?shape.blocks.filter(b=>b.t==='ryanmen'||b.t==='penchan'||b.t==='kanchan'||b.t==='pairp').length:0;
  const pairs=shape?shape.blocks.filter(b=>b.t==='pair'||b.t==='pairp').length:0;
  let role='',short='';
  if(!blk||blk.t==='single'){
    if(k>=27){const seen=vis[k]-c[k];role=`${tName(k)}是單張字牌，手上沒有第二張${seen>=2?`，場上也已經出現 ${seen} 張`:''}，很難湊成刻子。`;short='單張字牌，最難用上';}
    else if(k%9===0||k%9===8){role=`${tName(k)}是孤張，又在最邊邊，只能和相鄰的牌連，用處最小。`;short='邊邊的孤張，用處最小';}
    else{role=`${tName(k)}是孤張，跟手上其他牌都連不起來。`;short='孤張，連不起來';}
  }else if(blk.t==='pair'||blk.t==='pairp'){
    role=`你有 ${pairs} 組對子，胡牌只需要一對當眼，多的對子可以拆一張。`;short='對子太多，拆一組';
  }else{
    role=`你需要 ${needPartials} 個搭子來湊面子，現在有 ${partials} 個，已經夠了；${mjTilesStr(blk.tiles)}是比較弱的${MJ_BLOCK_NAME[blk.t]}（只等${mjBlockWaits(blk)}），拆掉它損失最小。`;short=`拆掉最弱的${MJ_BLOCK_NAME[blk.t]}`;
  }
  ex.summary=`建議打${tName(k)}（${short||'用處最小的牌'}）${top.s===0?'，打完就聽牌':''}。`;
  ex.head=`${short||'用處最小的牌'}${top.s===0?'，打完就聽牌':''}。`;
  ex.why.push(role);
  ex.why.push(top.s===0?'打掉後就聽牌，下一張對的牌就胡。':`打掉後是 ${top.s} 向聽，這是目前最快接近胡牌的打法。`);
  // reasoning
  if(shape){
    const cnt=t=>shape.blocks.filter(b=>b.t===t).length;
    ex.logic.push(`你的手牌（含剛摸的牌）：${shape.m} 組完成的面子、兩面搭子 ${cnt('ryanmen')} 個、嵌張或邊張 ${cnt('kanchan')+cnt('penchan')} 個、對子 ${pairs} 組、孤張 ${cnt('single')} 張；胡牌要 ${N} 組面子加一對眼。`);
  }
  if(top.kinds.length)ex.logic.push(`打${tName(k)}之後，摸到這些牌會更接近胡牌：${top.kinds.slice(0,10).map(tName).join('、')}${top.kinds.length>10?' 等':''}，共 ${top.kinds.length} 種、場上還看不到的有 ${top.uk} 張。`);
  const second=an.find(a=>a.k!==k);
  if(second)ex.logic.push(second.s>top.s?`其他打法都比較慢，例如打${tName(second.k)}會變成 ${xs(second.s)}。`:top.uk>second.uk?`第二好的是打${tName(second.k)}：一樣 ${xs(second.s)}，但有用的牌少 ${top.uk-second.uk} 張。`:`打${tName(second.k)}也一樣好（${xs(second.s)}、有用的牌一樣多），兩張選哪張都可以。`);
  const menq=p.melds.every(m=>m.concealed);
  if(menq)ex.logic.push(`你還沒吃碰（門清）：胡牌多 ${M.R.tai.menqing} 台，自摸算不求人 ${M.R.tai.buqiuren} 台。能不吃碰就盡量不要。`);
  const all=p.hand.concat(...p.melds.map(m=>m.t==='chow'?[m.k,m.k+1,m.k+2]:[m.k,m.k,m.k]));
  const su=[0,0,0];all.forEach(x=>{if(x<27)su[(x/9)|0]++;});const dom=su.indexOf(Math.max(...su)),hon=all.filter(x=>x>=27).length;
  if(su[dom]+hon>=all.length-3&&su[dom]>=8)ex.logic.push(`你的${MJ_SUIT[dom]}子很多，再整理一下有機會做混一色（${M.R.tai.hunyi} 台）${hon?'':`或清一色（${M.R.tai.qingyi} 台）`}。`);
  const valuePair=[31,32,33,27+M.roundWind,27+seatWind(0)].filter((x,i,a)=>a.indexOf(x)===i&&c[x]===2&&x!==k);
  if(valuePair.length)ex.logic.push(`${valuePair.map(tName).join('、')}是對子，湊成刻子就有台，值得留著。`);
  // risks
  const threats=rd.opps.filter(o=>o.ready>=.25).sort((a,b)=>b.ready-a.ready);
  if(risk>=.005){
    const by=rd.opps.map(o=>({o,v:o.ready*mjWinTileProb(o.danger[k])})).sort((a,b)=>b.v-a.v)[0];
    ex.risk.push(`打出${tName(k)}估計約 ${xpct1(risk)} 會放槍${by&&by.v>.003?`，主要是怕 ${by.o.q.name}`:''}。`);
  }else ex.risk.push(`打出${tName(k)}幾乎不會放槍（估計 ${xpct1(risk)}）。`);
  threats.forEach(o=>ex.risk.push(`${o.q.name}：${mjOppReasons(o)}，估計約 ${xpct(o.ready)} 已經聽牌。${o.flush>=0?`${MJ_SUIT[o.flush]}子和字牌對他比較危險。`:''}`));
  const safest=an.slice().sort((a,b)=>(rd.map[a.k]||0)-(rd.map[b.k]||0))[0];
  if(threats.length&&safest&&safest.k!==k&&(rd.map[safest.k]||0)<risk*.5){
    const cost=safest.s>top.s?`會變成 ${xs(safest.s)}，慢 ${safest.s-top.s} 步`:`一樣 ${xs(safest.s)}，有用的牌少 ${top.uk-safest.uk} 張`;
    ex.alt.push(`想保守的話打${tName(safest.k)}（放槍約 ${xpct1(rd.map[safest.k]||0)}）：${cost}。${top.s>=2?'你離聽牌還遠，被追上時防守通常比較划算。':'你已經接近聽牌，衝一下通常比較划算。'}`);
  }
  if(top.s===0&&risk>=.03)ex.risk.push('你已經聽牌了，只要放槍機率不是很高，繼續衝通常比較划算。');
  if(!threats.length)ex.risk.push('目前沒有人看起來快聽牌，可以專心做自己的牌。');
  if(second&&!ex.alt.length)ex.alt.push(`打${tName(second.k)}：${second.s>top.s?`會慢一步（${xs(second.s)}）`:top.uk>second.uk?`差不多，但有用的牌少 ${top.uk-second.uk} 張`:'效果一樣，可以依喜好選'}。`);
  return ex;
}
function mjExplainRon(tai){
  return {summary:`可以胡牌（預估 ${tai} 台），直接胡。`,why:['胡牌就是這一局的目標；打出這張的人要付錢給你。'],
    logic:[`放槍的人付：底 ${M.R.base} ＋ ${tai} 台 × ${M.R.perTai}${M.R.tai.dealer?'，有莊家參與時再加莊家台':''}。`],
    risk:['沒有風險，胡了這一局就結束。'],alt:['不胡：只有差一點就能湊成大牌型時才考慮，通常不划算。']};
}
// ================= mahjong: claim explanation
function mjExplainClaim(r,o,k){
  const ex={summary:'',why:[],logic:[],risk:[],alt:[]},e=r.e,sn=s=>s<=0?'聽牌':`${s} 向聽`;
  const valueHonor=k>=31||k===27+M.roundWind||k===27+seatWind(0);
  const after=r.rec==='pong'?e.pong:r.rec==='kong'?e.kong:r.rec==='chow'?e.chow:null;
  const name={pass:'過',pong:'碰',kong:'槓',chow:'吃'}[r.rec];
  if(r.rec==='pass'){
    ex.summary=`建議過：${o.pong||o.chow?'吃碰之後沒有比較快':'這張對你沒用'}，留著門清比較好。`;
    ex.why.push(e.menq?`你還是門清，自己摸到胡牌可以算不求人（${M.R.tai.buqiuren} 台），吃碰就沒有了。`:'吃碰後手牌變少，沒有加快就不值得。');
  }else{
    ex.summary=`建議${name}：${after<e.s0?`可以從 ${sn(e.s0)} 變成 ${sn(after)}，加快胡牌`:valueHonor?`${tName(k)}的刻子有台`:'讓手牌更好整理'}。`;
    if(after<e.s0)ex.why.push(`${name}了之後，離胡牌少一步（${sn(e.s0)} → ${sn(after)}）。`);
    if(valueHonor&&r.rec!=='chow')ex.why.push(`${tName(k)}是有台的字牌，湊成刻子就多 1 台。`);
    if(r.rec==='kong')ex.why.push('槓了還能從牌尾多補一張牌，槓完自摸算槓上開花。');
  }
  ex.logic.push(e.s0<=0?'你現在已經聽牌。':`你現在是 ${sn(e.s0)}。`);
  const res=(a)=>a<e.s0?`會變成 ${sn(a)}（快一步）`:a>e.s0?`反而變成 ${sn(a)}（慢一步）`:`還是 ${sn(a)}，沒有比較快`;
  if(o.pong)ex.logic.push(`碰：${res(e.pong)}。`);
  if(o.chow)ex.logic.push(`吃：最好的吃法${res(e.chow)}。`);
  if(o.kong)ex.logic.push(`槓：${res(e.kong)}，還能多摸一張。`);
  if(e.menq&&r.rec!=='pass'&&r.rec!=='kong')ex.risk.push(`會失去門清（${M.R.tai.menqing} 台）和不求人（${M.R.tai.buqiuren} 台）的機會。`);
  if(r.rec!=='pass'){ex.risk.push('吃碰的牌會亮在桌上，別人能看出你在做什麼牌、你在等什麼。');ex.risk.push('手牌變少，之後如果要防守，能挑的安全牌也變少。');}
  if(r.rec==='pass'&&(o.pong||o.chow))ex.risk.push('不吃不碰可能會慢一點，要靠自己摸。');
  if(r.rec!=='pass')ex.alt.push(`過：保留門清，但速度${after<e.s0?'比較慢':'差不多'}。`);
  else if(o.pong)ex.alt.push(`碰：${e.pong<e.s0?'會快一步，但失去門清':'沒有比較快，還失去門清'}。`);
  return ex;
}
// EXPLAIN END
