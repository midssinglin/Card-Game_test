// STATS START
// Personal statistics kept in this browser, plus the daily practice set.
const STATS_KEY='ptx-stats',DAILY_KEY='ptx-daily';
function blankStats(){return {
  poker:{hands:0,vpip:0,pfr:0,won:0,showdowns:0,net:0,dec:0,foldGood:0,callBad:0,missValue:0},
  mj:{hands:0,wins:0,tsumo:0,dealin:0,tai:0,disc:0,discOk:0},
  quiz:{tut:[0,0],daily:[0,0]}};}
function loadStats(){try{const s=JSON.parse(localStorage.getItem(STATS_KEY)||'null');return s?deepMergeAll(blankStats(),s):blankStats();}catch(_){return blankStats();}}
function deepMergeAll(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object')deepMergeAll(a[k],b[k]);else if(k in a)a[k]=b[k];}return a;}
let STATS=loadStats();
function saveStats(){try{localStorage.setItem(STATS_KEY,JSON.stringify(STATS));}catch(_){}}
function statQuiz(kind,right){const q=STATS.quiz[kind];q[1]++;if(right)q[0]++;saveStats();}

function recordPokerHand(){
  if(!G||G.online||REPLAY.on)return;
  const p=G.players[0],s=STATS.poker;
  if(p.out&&p.chips===0&&!p.hole.length)return;
  s.hands++;if(G.h0vpip)s.vpip++;if(G.h0pfr)s.pfr++;
  if(p.win>0)s.won++;
  if(G.street==='showdown'&&inHand(p))s.showdowns++;
  s.net+=p.chips-(G.h0start||0);
  for(const d of G.decisions){
    const h=d.hint;if(!h)continue;s.dec++;
    if(d.type==='fold'&&h.act!=='fold'&&!h.marginal)s.foldGood++;
    else if((d.type==='call'||d.type==='raise')&&h.act==='fold')s.callBad++;
    else if(d.type==='check'&&h.act==='raise'&&h.eq>.7)s.missValue++;
  }
  saveStats();
}
function recordMjHand(){
  if(!M||M.online||REPLAY.on)return;
  const s=STATS.mj,r=M.result;s.hands++;
  if(r&&r.type==='win'){
    const w=r.wins.find(x=>x.i===0);
    if(w){s.wins++;if(w.self)s.tsumo++;s.tai+=w.tai;}
    if(r.payer===0&&!w)s.dealin++;
  }
  for(const d of M.decisions){if(!d.chosen||!d.best)continue;s.disc++;if(d.chosen.s<=d.best.s&&d.best.uk-d.chosen.uk<6)s.discOk++;}
  saveStats();
}
const ratio=(a,b)=>b?a/b:0;
// rules that turn the numbers into advice; each points at a lesson
function weaknessReport(){
  const P=STATS.poker,J=STATS.mj,out=[];
  if(P.hands>=30){
    const v=ratio(P.vpip,P.hands);
    if(v>.45)out.push({g:'poker',t:'入池太鬆',d:`你有 ${pct(v)} 的手牌在翻牌前就投入籌碼，一般建議約 20–30%。弱牌在前面位置就棄掉。`,l:'p3'});
    else if(v<.12)out.push({g:'poker',t:'玩得太保守',d:`你只玩 ${pct(v)} 的手牌，對手很容易讀出你的牌力。按鈕位附近可以多玩一些。`,l:'p3'});
    if(P.vpip>=10&&ratio(P.pfr,P.vpip)<.3)out.push({g:'poker',t:'跟注多、加注少',d:`入池時只有 ${pct(ratio(P.pfr,P.vpip))} 是加注。好牌主動加注，才能拿到價值、讓對手犯錯。`,l:'p5'});
  }
  if(P.dec>=15){
    if(ratio(P.callBad,P.dec)>.2)out.push({g:'poker',t:'勝率不夠還跟注',d:`${pct(ratio(P.callBad,P.dec))} 的決定是在勝率低於所需時跟注。跟注前先看「跟注所需」。`,l:'p4'});
    if(ratio(P.foldGood,P.dec)>.15)out.push({g:'poker',t:'該跟的時候棄牌',d:`${pct(ratio(P.foldGood,P.dec))} 的決定是勝率夠卻棄牌，長期會少賺。`,l:'p4'});
    if(P.missValue>=3)out.push({g:'poker',t:'好牌沒有下注',d:`有 ${P.missValue} 次勝率超過七成卻過牌。強牌要下注收錢。`,l:'p5'});
  }
  if(J.hands>=15){
    if(ratio(J.dealin,J.hands)>.2)out.push({g:'mj',t:'放槍偏多',d:`每 100 局放槍約 ${Math.round(ratio(J.dealin,J.hands)*100)} 次。別家吃碰很多時，留意教練的「注意防守」，優先打對方打過的安全牌。`,l:'m4'});
    if(ratio(J.wins,J.hands)<.18)out.push({g:'mj',t:'胡牌率偏低',d:`胡牌率 ${pct(ratio(J.wins,J.hands))}，四人平均約 25%。先求快聽牌，再求大牌。`,l:'m2'});
    if(J.wins>=5&&ratio(J.tai,J.wins)<3)out.push({g:'mj',t:'胡得比較小',d:`平均每次胡 ${(J.tai/J.wins).toFixed(1)} 台。門清、自摸、字牌刻子都能加台。`,l:'m6'});
  }
  if(J.disc>=40&&ratio(J.discOk,J.disc)<.7)out.push({g:'mj',t:'打牌效率',d:`${pct(ratio(J.discOk,J.disc))} 的出牌和最佳選擇一樣。多看教練列的「有效進張」。`,l:'m4'});
  const undone=[...LESSONS.poker,...LESSONS.mj].filter(l=>!LDONE.has(l.id));
  if(undone.length&&undone.length<11)out.push({g:'learn',t:'還有教學沒完成',d:`剩 ${undone.length} 關，下一關是「${undone[0].title}」。`,l:undone[0].id});
  return out;
}
function renderStats(){
  const P=STATS.poker,J=STATS.mj,Q=STATS.quiz,tile=(k,v,sub)=>`<div class="metric"><span class="k">${k}</span><span class="v">${v}</span>${sub?`<span class="sub">${sub}</span>`:''}</div>`;
  const rep=weaknessReport();
  $('#stats-root').innerHTML=`<div class="hero-home"><p class="eyebrow">我的統計</p><h2 class="display small">打得怎麼樣</h2><p class="lede">數字只記在這台裝置上的單機牌局。手數越多，下面的建議越準。</p></div>
  <section class="panel"><div class="ph"><h2>弱點與建議</h2></div>
    ${rep.length?`<div class="ana">${rep.map(r=>`<div class="weak"><div><b>${r.t}</b><p>${r.d}</p></div>${r.l?`<button class="btn" data-lesson="${r.l}">看教學</button>`:''}</div>`).join('')}</div>`:`<p class="note">${P.hands<30&&J.hands<15?'再多打幾手（撲克 30 手、麻將 15 局以上），這裡就會出現分析。':'目前沒有明顯弱點，繼續保持！'}</p>`}
  </section>
  <div class="stat-cols">
  <section class="panel"><div class="ph"><h2>德州撲克</h2><span class="note">${P.hands} 手</span></div><div class="metrics">
    ${tile('入池率',P.hands?pct(ratio(P.vpip,P.hands)):'—','翻牌前主動投入籌碼')}
    ${tile('加注率',P.hands?pct(ratio(P.pfr,P.hands)):'—','翻牌前加注')}
    ${tile('贏下底池',P.hands?pct(ratio(P.won,P.hands)):'—',`${P.won} 手`)}
    ${tile('累計輸贏',(P.net>0?'+':'')+fmtN(P.net),'籌碼')}
    ${tile('和教練一致',P.dec?pct(1-ratio(P.callBad+P.foldGood+P.missValue,P.dec)):'—',`${P.dec} 次決定`)}
    ${tile('攤牌次數',P.showdowns,'')}
  </div></section>
  <section class="panel"><div class="ph"><h2>台灣麻將</h2><span class="note">${J.hands} 局</span></div><div class="metrics">
    ${tile('胡牌率',J.hands?pct(ratio(J.wins,J.hands)):'—',`${J.wins} 次，其中自摸 ${J.tsumo}`)}
    ${tile('放槍率',J.hands?pct(ratio(J.dealin,J.hands)):'—',`${J.dealin} 次`)}
    ${tile('平均台數',J.wins?(J.tai/J.wins).toFixed(1):'—','每次胡牌')}
    ${tile('打牌效率',J.disc?pct(ratio(J.discOk,J.disc)):'—',`${J.disc} 次出牌`)}
  </div></section>
  <section class="panel"><div class="ph"><h2>題目</h2></div><div class="metrics">
    ${tile('教學題',Q.tut[1]?pct(ratio(Q.tut[0],Q.tut[1])):'—',`第一次答對 ${Q.tut[0]}／${Q.tut[1]}`)}
    ${tile('每日練習',Q.daily[1]?pct(ratio(Q.daily[0],Q.daily[1])):'—',`連續 ${dailyStreak()} 天`)}
  </div></section>
  </div>
  <div class="set-foot"><span class="note" id="reset-note"></span><button class="ghost" id="stats-reset">清除統計</button></div>`;
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#stats-reset'))return;
  const b=e.target.closest('#stats-reset');
  if(b.dataset.armed){STATS=blankStats();saveStats();renderStats();return;}
  b.dataset.armed='1';b.textContent='再按一次確認清除';$('#reset-note').textContent='清除後無法復原。';
});

// ---------- daily practice: same 3 questions for everyone on the same date
function todayStr(d){d=d||new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function seedRng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}let a=h>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function withSeed(rng,fn){const o=Math.random;Math.random=rng;try{return fn();}finally{Math.random=o;}}
function loadDaily(){try{return JSON.parse(localStorage.getItem(DAILY_KEY)||'{}')||{};}catch(_){return {};}}
function dailyStreak(){
  const D=loadDaily();let n=0;const d=new Date();
  if(!D[todayStr(d)])d.setDate(d.getDate()-1);
  while(D[todayStr(d)]){n++;d.setDate(d.getDate()-1);}
  return n;
}
function mjHandAnalysis(hand){
  const c=mjCounts(hand),N=5,res=[];
  for(let k=0;k<34;k++){
    if(!c[k])continue;c[k]--;
    const s=mjShanten(c,N);let uk=0;const kinds=[];
    for(let x=0;x<34;x++){const left=4-c[x]-(x===k?1:0);if(left<=0)continue;c[x]++;if(mjShanten(c,N)<s){uk+=left;kinds.push(x);}c[x]--;}
    c[k]++;res.push({k,s,uk,kinds});
  }
  res.sort((a,b)=>a.s-b.s||b.uk-a.uk);return res;
}
function dqPokerCall(){
  for(let n=0;n<60;n++){
    const d=shuffleDeck(),hole=[d[0],d[1]],board=d.slice(2,2+(Math.random()<.5?3:4)),opp=Math.random()<.6?1:2;
    const pot=pick([60,80,100,140,200,260]),bet=pick([20,40,60,80,120]);
    const eq=equity(hole,board,opp,3000),req=bet/(pot+bet+bet);
    if(Math.abs(eq-req)<.08)continue;
    const ans=eq>=req?'跟注':'棄牌';
    const opts=['跟注','棄牌'];
    return {q:`對手 ${opp} 人，底池（含對手下注）${pot+bet}，你要跟 ${bet}。該跟注還是棄牌？`,show:{cards:hole.concat(board),split:2},choices:opts.map(l=>({label:l})),answer:opts.indexOf(ans),
      explain:`你的勝率約 ${pct(eq)}，跟注需要 ${bet} ÷（${pot+bet}＋${bet}）≈ ${pct(req)}。${eq>=req?'勝率較高，跟注長期有賺。':'勝率不夠，棄牌比較好。'}`};
  }
  return pkPotOdds();
}
function dqMjDiscard(){
  for(let n=0;n<400;n++){
    const w=mjWall().filter(k=>k<34),hand=w.slice(0,17).sort((a,b)=>a-b);
    const an=mjHandAnalysis(hand);
    if(an[0].s<1||an[0].s>3)continue;
    if(!(an[1].s>an[0].s||an[0].uk-an[1].uk>=4))continue;
    const worse=shuf(an.slice(1).filter(a=>a.s>an[0].s||an[0].uk-a.uk>=4)).slice(0,3);
    if(worse.length<3)continue;
    const best=an[0];
    return mkQuiz('這手 17 張，該打哪一張？',{tiles:hand},{label:'',show:{tiles:[best.k]}},worse.map(a=>({label:'',show:{tiles:[a.k]}})),
      `打${tName(best.k)}後是 ${best.s===0?'聽牌':best.s+' 向聽'}，有效進張 ${best.uk} 張；${worse.map(a=>`打${tName(a.k)}是 ${a.s===0?'聽牌':a.s+' 向聽'}、${a.uk} 張`).join('；')}。`);
  }
  return mjNameTile();
}
let DAILY_CACHE=null;
function dailyQuestions(){
  const day=todayStr();
  if(DAILY_CACHE&&DAILY_CACHE.day===day)return DAILY_CACHE.qs;
  const rng=seedRng('ptx-'+day);
  const rot=[pkCompare,mjWaitQuiz,pkBestOf7,()=>mjTaiQuiz(Math.floor(Math.random()*3))];
  const qs=withSeed(rng,()=>{const a=dqPokerCall(),b=dqMjDiscard();const c=rot[Math.floor(rng()*rot.length)]();return [a,b,c];});
  DAILY_CACHE={day,qs};return qs;
}
function openDaily(){
  const qs=dailyQuestions();
  const L={id:'daily',title:'今日練習',daily:true,steps:qs.map(q=>({t:'quiz',gen:()=>JSON.parse(JSON.stringify(q))}))};
  LCUR={L,step:0,q:null,picked:[],ok:false,first:0,total:0,done:false,daily:true};
  prepStep();if(VIEW!=='learn')go('learn');else renderLearn();
}
function finishDaily(){
  const D=loadDaily(),day=todayStr();
  if(!D[day]){D[day]={score:LCUR.first,total:LCUR.total};try{localStorage.setItem(DAILY_KEY,JSON.stringify(D));}catch(_){}}
}
function dailyStatus(){const D=loadDaily()[todayStr()];return D?`今天答對 ${D.score}／${D.total} · 連續 ${dailyStreak()} 天`:`今天的 3 題還沒做${dailyStreak()?` · 已連續 ${dailyStreak()} 天`:''}`;}
// STATS END
