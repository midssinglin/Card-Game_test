// UI START
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let VIEW='home';
const SET_DEFAULT={coach:true,hint:'full',speed:'mid',sound:true,
  poker:{opps:3,levels:['easy','normal','hard','normal','hard'],styles:['random','random','random','random','random'],chips:1000,blindUp:true},
  mj:JSON.parse(JSON.stringify(MJ_RULE_DEFAULT))};
function deepMerge(a,b){for(const k in b){if(!(k in a))continue;if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object')deepMerge(a[k],b[k]);else if(typeof b[k]===typeof a[k])a[k]=b[k];}return a;}
let SET=JSON.parse(JSON.stringify(SET_DEFAULT));
try{const s=JSON.parse(localStorage.getItem('ptx-settings')||'null');if(s)deepMerge(SET,s);}catch(_){}
function saveSet(){try{localStorage.setItem('ptx-settings',JSON.stringify(SET));}catch(_){}}
// the coach is switched off in online games
const onlineNow=()=>(VIEW==='poker'&&G&&G.online)||(VIEW==='mj'&&M&&M.online);
const hintMode=()=>SET.coach&&!onlineNow()?SET.hint:'off';
// level badge, or who is behind a seat in an online game
function seatBadge(p){if(p.uid)return p.away?'<span class="lv lv-away">電腦代打</span>':'<span class="lv lv-human">真人</span>';return `<span class="lv lv-${p.level}">${LVN[p.level]}${p.style&&MJ_STYLES[p.style]&&VIEW==='mj'?` · ${MJ_STYLES[p.style].name}`:''}</span>`;}
// detailed coach explanation: motive, reasoning, risks, alternatives
let XOPEN=true;try{XOPEN=localStorage.getItem('ptx-explain-open')!=='0';}catch(_){}
document.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('explain')){XOPEN=e.target.open;try{localStorage.setItem('ptx-explain-open',XOPEN?'1':'0');}catch(_){}}},true);
function explainHTML(ex,mode){
  if(!ex)return '';
  const full=mode==='full';
  const sec=(t,arr,cls)=>arr&&arr.length?`<div class="xsec ${cls}"><h4>${t}</h4><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';
  return `<details class="explain" ${XOPEN?'open':''}><summary>${full?'為什麼？看詳細分析':'詳細分析'}</summary>${full?sec('為什麼這樣打',ex.why,'why'):''}${sec('怎麼想的',ex.logic,'logic')}${sec('要注意的風險',ex.risk,'risk')}${full?sec('其他選擇',ex.alt,'alt'):''}</details>`;
}
let TOAST_T=null;
function toast(msg,ms){const t=$('#toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(TOAST_T);TOAST_T=setTimeout(()=>{t.hidden=true;},ms||3500);}
// only touch the DOM when a region's markup actually changed
function setHTML(el,html){if(el.__h!==html){el.innerHTML=html;el.__h=html;return true;}return false;}

// ---------- navigation
function go(v){
  if(REPLAY.on)stopReplay();
  VIEW=v;
  ['home','learn','stats','online','poker','mj'].forEach(x=>{$('#view-'+x).hidden=x!==v;});
  document.querySelectorAll('.tab[data-go]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.go===v)));
  $('#btn-rules').hidden=!(v==='poker'||v==='mj');
  if(v==='poker'){if(!G)newSession();else if(G.needResume){G.needResume=false;render();pokerResume();}else{render();if(G.resume){const f=G.resume;G.resume=null;f();}}}
  if(v==='mj'){if(!M)newMjSession();else if(M.needResume){M.needResume=false;renderMj();mjResume();}else{renderMj();if(M.resume){const f=M.resume;M.resume=null;f();}}}
  if(v==='home')renderHome();
  if(v==='learn')renderLearn();
  if(v==='stats')renderStats();
  if(v==='online')renderOnline();
  updateOnlineChrome();
  updateMeta();
  window.scrollTo(0,0);
}
function updateMeta(){
  const el=$('#meta');
  const on=ONLINE.meta&&ONLINE.rid?`線上 ${ONLINE.meta.code} · `:'';
  if(VIEW==='poker'&&G)el.textContent=`${G.online?on:''}第 ${G.handNo} 手 · 盲注 ${G.sbAmt}／${G.bbAmt}`;
  else if(VIEW==='mj'&&M)el.textContent=`${M.online?on:''}${WINDS[Math.min(M.roundWind,3)]}風圈 第 ${M.handNo} 局`;
  else el.textContent='';
}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return;}
  const c=e.target.closest('[data-close]');if(c){$('#'+c.dataset.close).hidden=true;}
  const o=e.target.closest('[data-open]');if(o){$('#'+o.dataset.open).hidden=false;}
});
function syncCoachBtn(){const b=$('#btn-coach');b.setAttribute('aria-pressed',String(SET.coach));b.textContent=SET.coach?'教練 開':'教練 關';}
$('#btn-coach').onclick=()=>{SET.coach=!SET.coach;saveSet();syncCoachBtn();if(VIEW==='poker'&&G)render();else if(VIEW==='mj'&&M)renderMj();else renderSettings();};
$('#btn-rules').onclick=()=>{if(VIEW==='poker')$('#ov-rules').hidden=false;else if(VIEW==='mj'){renderMjRules();$('#ov-mjrules').hidden=false;}};
document.addEventListener('keydown',e=>{if(e.key==='Escape')['ov-rules','ov-mjrules','ov-about'].forEach(id=>$('#'+id).hidden=true);});

// ---------- home
function renderHome(){
  const P=SET.poker,J=SET.mj,lvn=a=>a.map(l=>LVN[l]).join('／');
  const pActive=G&&!G.over,mActive=M&&!M.over;
  $('#games').innerHTML=`
  <div class="game-card poker">
    <div class="gc-art">${cardHTML(12)}${cardHTML(24)}</div>
    <h3 class="gc-title">德州撲克</h3>
    <p class="gc-sub">無限注 · ${P.opps+1} 人桌 · 對手 ${lvn(P.levels.slice(0,P.opps))} · 起始 ${fmtN(P.chips)}</p>
    <p class="gc-status">${pActive?`${G.needResume?'上次的牌局':'進行中'}：第 ${G.handNo} 手，你有 ${fmtN(G.players[0].chips)} 籌碼`:'還沒開始'}</p>
    <div class="gc-btns">
      <button class="btn primary" data-play="poker">${pActive?'繼續牌局':'開始'}</button>
      ${pActive?'<button class="btn" data-restart="poker">重新開一場</button>':''}
    </div>
  </div>
  <div class="game-card mj">
    <div class="gc-art">${mjTileHTML(31)}${mjTileHTML(32)}${mjTileHTML(33)}${mjTileHTML(4)}</div>
    <h3 class="gc-title">台灣麻將</h3>
    <p class="gc-sub">16 張 · 四人 · 底 ${J.base}／每台 ${J.perTai} · ${['','一','兩','','四'][J.winds]}個風圈 · 對手 ${lvn(J.levels)}</p>
    <p class="gc-status">${mActive?`${M.needResume?'上次的牌局':'進行中'}：${WINDS[Math.min(M.roundWind,3)]}風圈第 ${M.handNo} 局，你有 ${fmtN(M.players[0].chips)} 籌碼`:'還沒開始'}</p>
    <div class="gc-btns">
      <button class="btn primary" data-play="mj">${mActive?'繼續牌局':'開始'}</button>
      ${mActive?'<button class="btn" data-restart="mj">重新開一場</button>':''}
    </div>
  </div>`;
  const d=LDONE,pk=LESSONS.poker.filter(l=>d.has(l.id)).length,mk=LESSONS.mj.filter(l=>d.has(l.id)).length;
  const nextL=[...LESSONS.poker,...LESSONS.mj].find(l=>!d.has(l.id));
  $('#learn-card').innerHTML=`<div class="ph"><h2>新手教學</h2><span class="note">德州撲克 ${pk}／5 關 · 台灣麻將 ${mk}／6 關</span></div>
    <p class="note">每關幾分鐘，先看說明再答題；題目由規則引擎出題，麻將算台題照你的台數設定。</p>
    <div class="gc-btns"><button class="btn primary" data-go="learn">看所有關卡</button>${nextL?`<button class="btn" data-lesson="${nextL.id}">繼續：${nextL.title}</button>`:''}</div>`;
  const rp=weaknessReport().filter(r=>r.g!=='learn');
  $('#daily-card').innerHTML=`<div class="ph"><h2>今日練習</h2></div><p class="note">${dailyStatus()}</p>
    <p class="note">每天 3 題：該不該跟注、該打哪張牌，再加一題輪替題型。</p>
    <div class="gc-btns"><button class="btn primary" data-daily>${loadDaily()[todayStr()]?'再看一次':'開始今天的題目'}</button></div>`;
  $('#stats-card').innerHTML=`<div class="ph"><h2>我的統計</h2></div>
    <p class="note">撲克 ${STATS.poker.hands} 手 · 麻將 ${STATS.mj.hands} 局${rp.length?` · 找到 ${rp.length} 個可以加強的地方`:''}</p>
    <p class="note">${rp.length?`最需要注意：${rp[0].t}`:'多打幾手後，這裡會告訴你哪裡可以加強。'}</p>
    <div class="gc-btns"><button class="btn" data-go="stats">看統計與建議</button></div>`;
  renderSettings();
}
$('#games').addEventListener('click',e=>{
  const p=e.target.closest('[data-play]');if(p){go(p.dataset.play);return;}
  const r=e.target.closest('[data-restart]');
  if(r){const g=r.dataset.restart;VIEW=g;if(g==='poker')newSession();else newMjSession();go(g);}
});

// ---------- settings
let STAB='common';
const opt=(v,l,cur)=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${l}</option>`;
const sel=(path,cur,opts,num)=>`<select data-set="${path}" ${num?'data-num':''}>${opts.map(([v,l])=>opt(v,l,cur)).join('')}</select>`;
const LVOPTS=[['easy','新手'],['normal','普通'],['hard','高手']];
function renderSettings(){
  const tabs=[['common','共通'],['poker','德州撲克'],['mj','台灣麻將']];
  let h=`<div class="stabs" role="tablist" aria-label="設定分類">${tabs.map(([k,n])=>`<button class="tab" role="tab" data-stab="${k}" aria-selected="${STAB===k}">${n}</button>`).join('')}</div>`;
  if(STAB==='common'){
    h+=`<div class="set-grid">
      <label class="field"><span>教練面板</span>${sel('coach',SET.coach,[['true','開啟'],['false','關閉']])}</label>
      <label class="field"><span>教練顯示內容</span>${sel('hint',SET.hint,[['full','完整建議（數據＋出牌建議）'],['data','只看數據（不給建議）']])}</label>
      <label class="field"><span>電腦出牌速度</span>${sel('speed',SET.speed,[['slow','慢'],['mid','中'],['fast','快']])}</label>
      <label class="field"><span>音效</span>${sel('sound',SET.sound,[['true','開啟'],['false','關閉']])}</label>
    </div>
    <p class="note">牌局中也可以用右上角的「教練」按鈕隨時開關面板。</p>`;
  }else if(STAB==='poker'){
    const P=SET.poker;
    h+=`<div class="set-grid">
      <label class="field"><span>對手人數</span>${sel('poker.opps',P.opps,[[1,'1 人（單挑）'],[2,'2 人'],[3,'3 人'],[4,'4 人'],[5,'5 人']],1)}</label>
      <label class="field"><span>起始籌碼</span>${sel('poker.chips',P.chips,[[500,'500'],[1000,'1,000'],[2000,'2,000']],1)}</label>
      ${P.levels.slice(0,P.opps).map((l,i)=>`<label class="field"><span>${NAMES[i]}的難度</span>${sel('poker.levels.'+i,l,LVOPTS)}</label><label class="field"><span>${NAMES[i]}的打法</span>${sel('poker.styles.'+i,P.styles[i],[['random','隨機'],...Object.entries(PK_STYLES).map(([k,v])=>[k,v.name])])}</label>`).join('')}
    </div>
    <label class="check"><input type="checkbox" data-set="poker.blindUp" ${P.blindUp?'checked':''}> 盲注每 10 手升一級</label>`;
  }else{
    const J=SET.mj,D=MJ_RULE_DEFAULT;
    h+=`<h3>對手與籌碼</h3><div class="set-grid">
      ${J.levels.map((l,i)=>`<label class="field"><span>${MJ_NAMES[i]}（${MJ_POS[i+1]}）難度</span>${sel('mj.levels.'+i,l,LVOPTS)}</label><label class="field"><span>${MJ_NAMES[i]}的打法</span>${sel('mj.styles.'+i,J.styles[i],[['random','隨機'],...Object.entries(MJ_STYLES).map(([k,v])=>[k,v.name])])}</label>`).join('')}
      <label class="field"><span>起始籌碼</span>${sel('mj.chips',J.chips,[[500,'500'],[1000,'1,000'],[2000,'2,000'],[3000,'3,000']],1)}</label>
      <label class="field"><span>底</span>${sel('mj.base',J.base,[[20,'20'],[30,'30'],[50,'50'],[100,'100']],1)}</label>
      <label class="field"><span>每台</span>${sel('mj.perTai',J.perTai,[[10,'10'],[20,'20'],[30,'30'],[50,'50']],1)}</label>
      <label class="field"><span>一場打幾個風圈</span>${sel('mj.winds',J.winds,[[1,'一風圈（東）'],[2,'兩風圈（東南）'],[4,'一將（東南西北）']],1)}</label>
    </div>
    <h3>有爭議的規則</h3><div class="set-grid">
      <label class="field"><span>留牌（海底）</span>${sel('mj.reserve',J.reserve,[[16,'留 16 張'],[0,'不留，摸到最後一張']],1)}</label>
      <label class="field"><span>同一張牌多人可胡</span>${sel('mj.multiWin',J.multiWin,[['false','截胡：下家優先'],['true','一炮多響：都可以胡']])}</label>
      <label class="field"><span>七搶一、八仙過海</span>${sel('mj.flowerWin',J.flowerWin,[['true','算胡牌'],['false','不算']])}</label>
      <label class="field"><span>平胡條件</span>${sel('mj.pinghuStrict',J.pinghuStrict,[['true','無字、無花才算'],['false','無字即可，有花也算']])}</label>
    </div>
    <h3>台數表</h3><p class="note">填 0 代表不計這個台型；被改過的數字會以黃色標示。</p>
    <div class="tai-table">${MJ_TAI_DEF.map(([k,n,d,note])=>`<label class="tai-row ${J.tai[k]!==D.tai[k]?'changed':''}"><span class="n">${n}<span class="d">${note||'&nbsp;'}${J.tai[k]!==D.tai[k]?` · 預設 ${d}`:''}</span></span><input type="number" min="0" max="64" step="1" inputmode="numeric" data-set="mj.tai.${k}" data-num value="${J.tai[k]}" aria-label="${n}台數"></label>`).join('')}</div>`;
  }
  h+=`<div class="set-foot"><span class="note">${STAB==='common'?'':'改動會在下一場套用。'}</span><button class="ghost" data-reset="${STAB}">恢復${STAB==='common'?'共通':STAB==='poker'?'德州撲克':'麻將'}預設值</button></div>`;
  $('#set-body').innerHTML=h;
}
function setPath(path,val){const ks=path.split('.');let o=SET;for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks[ks.length-1]]=val;}
function getPath(path){return path.split('.').reduce((o,k)=>o[k],SET);}
$('#set-body').addEventListener('change',e=>{
  const el=e.target.closest('[data-set]');if(!el)return;
  const path=el.dataset.set,cur=getPath(path);
  let v;
  if(el.type==='checkbox')v=el.checked;
  else if(el.hasAttribute('data-num')){v=Math.round(Number(el.value));if(!isFinite(v)||v<0)v=0;if(el.type==='number')v=Math.min(64,v);}
  else if(typeof cur==='boolean')v=el.value==='true';
  else v=el.value;
  setPath(path,v);saveSet();
  if(path==='coach')syncCoachBtn();
  renderHome();
});
$('#set-body').addEventListener('click',e=>{
  const t=e.target.closest('[data-stab]');if(t){STAB=t.dataset.stab;renderSettings();return;}
  const r=e.target.closest('[data-reset]');
  if(r){const k=r.dataset.reset,D=JSON.parse(JSON.stringify(SET_DEFAULT));
    if(k==='common'){SET.coach=D.coach;SET.hint=D.hint;SET.speed=D.speed;SET.sound=D.sound;syncCoachBtn();}
    else SET[k]=D[k];
    saveSet();renderHome();}
});

// ---------- generic end-of-session sheet
let OVER={again:null,setup:null};
function showOverSheet(title,body,again,setupTab,labels){
  $('#over-h').textContent=title;$('#over-body').innerHTML=body;
  labels=labels||{};
  $('#over-again').textContent=labels.again||'再來一場';$('#over-setup').textContent=labels.setup||'調整設定';
  $('#over-again').hidden=labels.again===false;
  OVER={again,setupTab,setup:labels.setupFn};$('#ov-over').hidden=false;
}
$('#over-again').onclick=()=>{$('#ov-over').hidden=true;OVER.again&&OVER.again();};
$('#over-setup').onclick=()=>{$('#ov-over').hidden=true;if(OVER.setup){OVER.setup();return;}STAB=OVER.setupTab||'common';go('home');document.querySelector('.settings').scrollIntoView();};
function onlineOverLabels(){return ONLINE.role==='host'?{again:'同一批人再來一場',setup:'離開房間',setupFn:onlineLeave}:{again:false,setup:'離開房間',setupFn:onlineLeave};}

// ================= POKER UI
function cardHTML(c,cls){
  if(c==null)return `<span class="card back ${cls||''}" aria-label="牌背"></span>`;
  const r=c%13,s=(c/13)|0;
  return `<span class="card ${s===1||s===2?'red':''} ${cls||''}" aria-label="${cardStr(c)}"><b>${RN[r]}</b><i>${SUITS[s]}</i></span>`;
}
function marks(i){
  const out=[];
  if(i===G.dealer)out.push('<span class="mk d" title="按鈕位">D</span>');
  if(i===G.sbI&&G.players.filter(p=>!p.out).length>2)out.push('<span class="mk">小盲</span>');
  if(i===G.bbI)out.push('<span class="mk">大盲</span>');
  return out.join('');
}
function heroBest(){
  const p=G.players[0];
  if(!p.hole.length||G.board.length<3||cfg.hint==='off')return null;
  return bestFive([...p.hole,...G.board]);
}
function render(){
  if(!G||VIEW!=='poker')return;
  const P=G.players;
  updateMeta();
  setHTML($('#opps'),P.slice(1).map(p=>{
    const i=p.id,turn=G.toAct===i&&!G.handOver,win=G.handOver&&p.win>0;
    const cls=['seat',turn?'turn':'',p.out?'out':p.folded?'folded':'',win?'win':''].join(' ');
    let cards='';
    if(!p.out&&p.hole.length)cards=(p.show||(REPLAY.on&&REPLAY.reveal))?p.hole.map(c=>cardHTML(c,p.best&&p.best.includes(c)&&win?'hl':'')).join(''):cardHTML(null)+cardHTML(null);
    const status=turn?'思考中…':p.show&&p.score!=null?handName(p.score):p.last;
    return `<div class="${cls}">
      <div class="marks">${marks(i)}</div>
      <div class="who"><span class="nm">${esc(p.name)}</span>${seatBadge(p)}</div>
      ${p.style&&PK_STYLES[p.style]&&!p.uid?`<div class="style">${PK_STYLES[p.style].name}</div>`:''}
      <div class="hand" style="gap:3px">${cards}</div>
      <div class="stack">${p.out?'—':fmtN(p.chips)}</div>
      ${p.bet>0?`<span class="betchip">${fmtN(p.bet)}</span>`:''}
      <div class="act">${esc(status||'')}${win?` <span style="color:var(--good)">+${fmtN(p.win)}</span>`:''}</div>
    </div>`;
  }).join(''));
  $('#street').textContent=STREETN[G.street]||'';
  $('#pot').innerHTML=`底池 <b>${fmtN(potTotal())}</b>`;
  const hb=heroBest(),hl=new Set(hb&&!G.handOver?hb.cards:[]),winHL=new Set();
  if(G.handOver&&G.street==='showdown')P.forEach(p=>{if(p.win>0&&p.best)p.best.forEach(c=>winHL.add(c));});
  let b='';
  for(let k=0;k<5;k++){const c=G.board[k];b+=c==null?'<span class="card slot"></span>':cardHTML(c,[(hl.has(c)||winHL.has(c))?'hl':'',k>=G.animFrom?'new':''].join(' '));}
  $('#board').innerHTML=b;G.animFrom=99;
  $('#msg').textContent=G.result||'';
  const h=P[0],hturn=G.toAct===0&&!G.handOver,hwin=G.handOver&&h.win>0;
  const hero=$('#hero');
  hero.className=['hero',hturn?'turn':'',h.folded&&!h.out?'folded':'',hwin?'win':''].join(' ');
  let label='';
  if(h.hole.length&&!h.out){
    if(G.board.length>=3)label=handName(evalScore([...h.hole,...G.board]));
    else{const pl=preflopLabel(h.hole);label=`${pl.kind} · ${pl.tier}`;}
  }
  const hcards=h.hole.length&&!h.out?h.hole.map(c=>cardHTML(c,(hl.has(c)||(hwin&&winHL.has(c)))?'hl':'')).join(''):'';
  hero.innerHTML=`<div class="hand">${hcards}</div>
    <div class="hinfo">
      <div class="row"><span class="nm">你</span><span class="marks">${marks(0)}</span></div>
      <div class="row"><span class="stack">籌碼 ${fmtN(h.chips)}</span>${h.bet>0?`<span class="betchip">${fmtN(h.bet)}</span>`:''}</div>
      ${label?`<div class="hlabel">${esc(label)}</div>`:''}
      <div class="act" style="text-align:left">${hwin?`<span style="color:var(--good)">贏得 ${fmtN(h.win)}</span>`:esc(h.last||'')}</div>
    </div>`;
  renderActions();renderCoach();renderLog();
}
function raiseBounds(){const p=G.players[0];const max=p.bet+p.chips,min=Math.min(G.currentBet+G.minRaise,max);return {min,max};}
function renderActions(){
  const el=$('#actions'),p=G.players[0];
  if(REPLAY.on&&REPLAY.game==='poker'){setHTML(el,replayControlsHTML());return;}
  if(G.over){setHTML(el,G.online?`<div class="waiting"><span>這一場已經結束。</span>${ONLINE.role==='host'?'<button class="btn primary" data-a="again" style="flex:0 1 220px">同一批人再來一場</button>':'<span class="note">等房主決定是否再來一場。</span>'}</div>`:`<div class="waiting"><span>這一場已經結束。</span><button class="btn primary" data-a="again" style="flex:0 1 220px">再來一場（籌碼重置）</button></div>`);return;}
  if(G.handOver&&G.mirror){setHTML(el,`<div class="waiting"><span>下一手會由房主自動發牌。</span>${replayAvailable('poker')?'<button class="ghost" data-replay="poker">重播本手</button>':''}</div>`);return;}
  if(G.handOver){setHTML(el,`<div class="arow">${replayAvailable('poker')?'<button class="btn" data-replay="poker">重播本手</button>':''}<button class="btn primary" data-a="next">發下一手</button></div>${G.online?`<p class="note">${ON_NEXT_SEC.poker} 秒後自動發下一手。</p>`:''}`);return;}
  if(G.toAct!==0){
    const who=G.toAct>=0?G.players[G.toAct]:null,watching=!inHand(p)||p.allIn;
    setHTML(el,`<div class="waiting"><span class="${who?'dots':''}">${who?`等待 ${esc(who.name)} 行動`:'發牌中'}</span>${watching?'<button class="ghost" data-a="ff">快轉本手</button>':''}</div>`);return;
  }
  const toCall=Math.max(0,G.currentBet-p.bet),hint=cfg.hint==='full'?G.hint:null,sug=hint?hint.act:null;
  const others=G.players.some(q=>q!==p&&canAct(q)),canRaise=p.chips>toCall&&others;
  const callLabel=toCall===0?'過牌':toCall>=p.chips?`全下跟注 ${fmtN(p.chips)}`:`跟注 ${fmtN(toCall)}`;
  let html=`<div class="arow">
    <button class="btn fold ${sug==='fold'?'suggested':''}" data-a="fold">棄牌</button>
    <button class="btn ${sug===(toCall?'call':'check')?'suggested':''}" data-a="call">${callLabel}</button></div>`;
  if(canRaise){
    const {min,max}=raiseBounds(),pot=potTotal();let def=min;
    if(hint&&hint.act==='raise')def=Math.round((G.currentBet+hint.size*(pot+toCall))/5)*5;
    def=Math.min(Math.max(def,min),max);
    html+=`<div class="raise">
      <div class="presets"><button class="chipbtn" data-p="min">最小</button><button class="chipbtn" data-p=".5">½ 底池</button><button class="chipbtn" data-p="1">1 倍底池</button><button class="chipbtn" data-p="all">全下</button></div>
      <div class="slider"><input type="range" id="raise-amt" min="${min}" max="${max}" step="${Math.max(5,G.bbAmt/2)}" value="${def}" aria-label="加注金額"><output id="raise-out">${fmtN(def)}</output></div>
      <button class="btn primary ${sug==='raise'?'suggested':''}" data-a="raise" id="raise-btn">${raiseLabel(def)}</button></div>`;
  }
  el.innerHTML=html;
}
function raiseLabel(v){const {max}=raiseBounds();if(v>=max)return `全下 ${fmtN(v)}`;return G.currentBet===0?`下注 ${fmtN(v)}`:`加注到 ${fmtN(v)}`;}
function setRaise(v){const {min,max}=raiseBounds();v=Math.min(Math.max(Math.round(v/5)*5,min),max);const r=$('#raise-amt');if(!r)return;r.value=v;$('#raise-out').textContent=fmtN(v);$('#raise-btn').textContent=raiseLabel(v);}
function segHTML(){return `<div class="seg" role="group" aria-label="教練顯示內容"><button data-h="full" aria-pressed="${SET.hint==='full'}">完整建議</button><button data-h="data" aria-pressed="${SET.hint==='data'}">只看數據</button></div>`;}
function renderCoach(){
  const el=$('#coach'),p=G.players[0];
  el.hidden=!SET.coach||!!G.online;if(el.hidden)return;
  let body='';
  if(!p.hole.length||p.out)body='<p class="note">發牌後會顯示你的牌型與勝率。</p>';
  else{
    let line;
    if(G.board.length>=3)line=`<span class="k">目前牌型</span><span class="v">${handName(evalScore([...p.hole,...G.board]))}</span>`;
    else{const pl=preflopLabel(p.hole);line=`<span class="k">起手牌</span><span class="v">${p.hole.map(cardStr).join(' ')} · ${pl.kind}</span>，${pl.tier}（強度 ${pl.chen}／20）`;}
    body+=`<div class="handline">${line}</div>`;
    const h=G.hint;
    if(G.handOver){
      const rv=G.review;
      body+=rv&&rv.count?`<div class="review"><h3>本手回顧</h3>${rv.notes.length?`<ul>${rv.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:'<p class="note" style="color:var(--text)">你這手的決定都和建議一致。</p>'}</div>`:(G.mirror?'<p class="note">下一手會由房主自動發牌。</p>':'<p class="note">按「發下一手」繼續。</p>');
    }else if(G.toAct===0&&!h)body+=REPLAY.on?'<p class="note">這一步沒有教練分析。</p>':'<p class="note dots">計算勝率中</p>';
    else if(h&&h.street===G.street){
      const reqPct=Math.round(h.req*100);
      body+=`<div class="metrics">
        <div class="metric"><span class="k">勝率</span><span class="v">${pc(h.eq)}</span><div class="bar"><span style="width:${Math.round(h.eq*100)}%"></span>${h.toCall?`<i style="left:${reqPct}%"></i>`:''}</div><span class="sub">對 ${h.opp} 名對手</span></div>
        <div class="metric"><span class="k">跟注所需</span><span class="v">${h.toCall?pc(h.req):'—'}</span><span class="sub">${h.toCall?`跟 ${fmtN(h.toCall)} 搶 ${fmtN(h.pot+h.toCall)}`:'不用跟注，可免費過牌'}</span></div></div>`;
      if(SET.hint==='full'){
        const nm={fold:'建議 棄牌',check:'建議 過牌',call:h.marginal?'可跟可棄':'建議 跟注',raise:h.toCall?'建議 加注':'建議 下注'}[h.act];
        body+=`<div class="advice tone-${h.tone}"><span class="tag">${nm}</span><p>${esc(h.ex?h.ex.summary:h.reason)}</p></div>`;
      }
      body+=explainHTML(h.ex,SET.hint);
      if(h.outs){
        const o=h.outs,parts=Object.keys(o.by).sort((a,b)=>b-a).map(c=>`${CAT[c]} ${o.by[c]} 張`).join('、');
        body+=o.total?`<p class="outs"><span class="k">改良張</span> ${o.total} 張（${parts}）。下一張中的機率 ${pc(o.next)}${G.board.length===3?`，到河牌 ${pc(o.river)}（4 與 2 法則估 ${Math.min(100,o.total*4)}%）`:`（4 與 2 法則估 ${o.total*2}%）`}。</p>`:'<p class="outs"><span class="k">改良張</span> 目前沒有能明顯升級牌型的牌。</p>';
      }
      body+=`<details class="how"><summary>這些數字怎麼算？</summary><p>勝率：電腦把對手的底牌和還沒發的公牌隨機補完，模擬 ${G.board.length?'2,000':'1,500'} 次，統計你贏（平手算一半）的比例。</p><p>跟注所需：跟注額 ÷（底池＋跟注額）。勝率高於它，長期跟注就有賺。</p><button class="linkbtn" data-lesson="p4">看教學：底池賠率</button></details>`;
    }else body+=`<p class="note">${inHand(p)?'輪到你時會顯示勝率與建議。':'你這手已棄牌，正在觀看。'}</p>`;
  }
  setHTML(el,`<div class="ph"><h2>教練</h2>${segHTML()}</div>${body}`);
}
function renderLog(){setHTML($('#log'),G.log.slice(0,60).map(l=>`<li class="${l.k}">${esc(l.t)}</li>`).join(''));}
function notify(){saveGame('poker');recordFrame('poker');render();}
function humanTurn(){
  G.hint=null;notify();
  if(G.online)return;
  const g=GEN,hn=G.handNo,st=G.street;
  setTimeout(()=>{
    if(REPLAY.on||G.toAct!==0||G.handOver)return;
    aiRun('pokerHint',{},()=>{computeHint();return G.hint;},h=>{if(g!==GEN||REPLAY.on||G.handNo!==hn||G.street!==st||G.toAct!==0||G.handOver)return;G.hint=h;recordFrame('poker');render();});
  },40);
}
function onSessionOver(){setTimeout(showOver,900);}
function showOver(){
  if(!G.over)return;
  const n=G.players.length;
  showOverSheet(G.online?(G.place===1?'你拿下這一場第一名':`這一場你排第 ${G.place} 名`):G.won?'你贏下了這一場':'這一場你被淘汰了',`<div class="metrics">
    <div class="metric"><span class="k">名次</span><span class="v">${G.place}／${n}</span></div>
    <div class="metric"><span class="k">打了</span><span class="v">${G.handNo} 手</span></div>
    <div class="metric"><span class="k">最高籌碼</span><span class="v">${fmtN(G.peak)}</span></div>
    <div class="metric"><span class="k">最後盲注</span><span class="v" style="font-size:20px">${G.sbAmt}／${G.bbAmt}</span></div>
  </div><p class="note" style="margin-top:12px">再來一場時，所有人的籌碼都會重置為起始值。</p>`,G.online?onlineRestart:()=>{VIEW='poker';newSession();},'poker',G.online?onlineOverLabels():null);
}
$('#actions').addEventListener('click',e=>{
  if(REPLAY.on)return;
  const t=e.target.closest('[data-a],[data-p]');if(!t)return;
  if(t.dataset.p){const p=G.players[0],toCall=Math.max(0,G.currentBet-p.bet),pot=potTotal(),{min,max}=raiseBounds(),v=t.dataset.p;setRaise(v==='min'?min:v==='all'?max:G.currentBet+Number(v)*(pot+toCall));return;}
  const a=t.dataset.a;
  if(a==='next')startHand();
  else if(a==='again'){$('#ov-over').hidden=true;if(G.online)onlineRestart();else newSession();}
  else if(a==='ff')G.ff=true;
  else if(a==='fold')humanAct('fold');
  else if(a==='call'){const p=G.players[0];humanAct(G.currentBet>p.bet?'call':'check');}
  else if(a==='raise')humanAct('raise',Number($('#raise-amt').value));
});
$('#actions').addEventListener('input',e=>{if(e.target.id==='raise-amt')setRaise(Number(e.target.value));});
document.addEventListener('click',e=>{const b=e.target.closest('.coach [data-h]');if(!b)return;SET.hint=b.dataset.h;saveSet();if(VIEW==='poker')render();else renderMj();});
const EX=[['皇家同花順','同花順裡最大的',[12,11,10,9,8]],['同花順','同花色的順子',[20,19,18,17,16]],['四條','四張同點數',[11,24,37,50,27]],['葫蘆','三條＋一對',[10,23,36,5,18]],['同花','五張同花色',[38,35,32,30,27]],['順子','五張連續點數',[6,18,30,42,2]],['三條','三張同點數',[7,20,33,11,39]],['兩對','兩組對子',[9,22,2,15,38]],['一對','一組對子',[8,21,38,45,1]],['高牌','以上皆非，比最大張',[51,23,7,30,40]]];
$('#ranks').innerHTML=EX.map(([n,d,cs])=>`<div class="rk"><div class="name">${n}<small>${d}</small></div><div class="cards">${cs.map(c=>cardHTML(c)).join('')}</div></div>`).join('');

// ================= MAHJONG UI
function mjTileHTML(k,cls,tag,attrs){
  tag=tag||'span';
  if(k==null)return `<${tag} class="tile back ${cls||''}" aria-label="牌背" ${attrs||''}></${tag}>`;
  let inner,sc;
  if(k<27){sc=['wan','tong','tiao'][(k/9)|0];inner=`<b>${MJ_NUM[k%9]}</b><i>${MJ_SUIT[(k/9)|0]}</i>`;}
  else if(k<34){sc=k===31?'zhong':k===32?'fa':k===33?'bai':'wind';inner=`<b class="one">${MJ_HON[k-27]}</b>`;}
  else{sc=k<38?'season':'plant';inner=`<b class="one">${MJ_FLW[k-34]}</b><i class="fn">${(k-34)%4+1}</i>`;}
  return `<${tag} class="tile t-${sc} ${cls||''}" aria-label="${tName(k)}" ${attrs||''}>${inner}</${tag}>`;
}
function mjMeldsHTML(p,reveal){
  return p.melds.map(m=>{
    let t;
    if(m.t==='chow')t=[m.k,m.k+1,m.k+2].map(k=>mjTileHTML(k)).join('');
    else if(m.t==='pung')t=mjTileHTML(m.k).repeat(3);
    else if(m.concealed&&!reveal)t=mjTileHTML(null).repeat(4);
    else if(m.concealed)t=mjTileHTML(null)+mjTileHTML(m.k)+mjTileHTML(m.k)+mjTileHTML(null);
    else t=mjTileHTML(m.k).repeat(4);
    return `<span class="meld" title="${{chow:'吃',pung:'碰',kong:m.concealed?'暗槓':'槓'}[m.t]}">${t}</span>`;
  }).join('');
}
function mjRiverHTML(p){
  return p.river.map((r,ix)=>mjTileHTML(r.k,[r.claimed?'gone':'',M.last&&M.last.from===p.id&&ix===p.river.length-1&&!r.claimed?'lastd':''].join(' '))).join('');
}
function mjSeatHTML(i){
  const p=M.players[i],w=seatWind(i),turn=M.phase!=='end'&&M.turn===i&&M.phase==='turn';
  const win=M.phase==='end'&&M.result&&M.result.type==='win'&&M.result.wins.some(x=>x.i===i);
  const end=M.phase==='end'||(REPLAY.on&&REPLAY.reveal);
  return `<div class="mjseat ${turn?'turn':''} ${win?'win':''}">
    <div class="ms-head"><span class="wind ${i===M.dealer?'dealer':''}" title="${WINDS[w]}家">${WINDS[w]}</span><span class="nm">${esc(p.name)}</span>${seatBadge(p)}<span class="pos">${MJ_POS[i]}</span>${i===M.dealer?`<span class="zhuang">莊${M.streak?` 連${M.streak}`:''}</span>`:''}<span class="stack">${fmtN(p.chips)}</span></div>
    <div class="ms-row">${end?`<span class="hand-reveal">${p.hand.map(k=>mjTileHTML(k)).join('')}</span>`:`<span class="cnt">手牌 ${p.hand.length} 張</span>`}${mjMeldsHTML(p,end)}${p.flowers.length?`<span class="flw">${p.flowers.map(f=>mjTileHTML(f)).join('')}</span>`:''}</div>
    <div class="river" aria-label="${esc(p.name)}打過的牌">${mjRiverHTML(p)}</div>
  </div>`;
}
const sName=s=>s<0?'胡牌':s===0?'聽牌':`${s} 向聽`;
function mjDisplayHand(){
  const p=M.players[0],h=p.hand.slice().sort((a,b)=>a-b);
  let drawn=null;
  if(M.phase==='turn'&&M.turn===0&&M.justDrawn!=null&&h.includes(M.justDrawn)){h.splice(h.indexOf(M.justDrawn),1);drawn=M.justDrawn;h.push(drawn);}
  return {h,drawn};
}
function renderMj(){
  if(!M||VIEW!=='mj')return;
  updateMeta();
  const opps=$('#mj-opps'),moved=[];
  if(opps.children.length!==3)opps.innerHTML='<div class="seatwrap"></div><div class="seatwrap"></div><div class="seatwrap"></div>';
  [3,2,1].forEach((i,ix)=>{if(setHTML(opps.children[ix],mjSeatHTML(i)))moved.push(opps.children[ix]);});
  // center
  const left=Math.max(0,M.wall.length-M.R.reserve);
  let cap='',tile='';
  if(M.phase==='end'){
    const r=M.result;
    if(r&&r.type==='void')cap='這一局作廢，重新發牌';
    else if(!r||r.type==='draw')cap='流局，莊家連莊';
    else cap=r.wins.map(w=>`${M.players[w.i].name}${w.flowerWin?(w.flowerWin==='baxian'?' 八仙過海':' 七搶一'):w.self?' 自摸':' 胡牌'} · ${w.tai} 台`).join('；');
  }else if(M.phase==='claim'&&M.claim){tile=mjTileHTML(M.claim.k);cap=`${M.players[M.claim.from].name} ${M.claim.kind==='rob'?'加槓':'打出'}${M.claim.opts[0]&&!M.claim.dec[0]?'<br>你可以宣告':''}`;}
  else if(M.last){tile=mjTileHTML(M.last.k);cap=`${M.players[M.last.from].name} 打出`;}
  setHTML($('#mj-center'),`<div class="mc-info"><b>${WINDS[Math.min(M.roundWind,3)]}風圈 · 第 ${M.handNo} 局</b><span>莊家 ${esc(M.players[M.dealer].name)}${M.streak?` 連 ${M.streak}`:''}</span><span>牌牆剩 <span class="num">${left}</span> 張</span></div><div class="mc-last">${tile}<span class="cap">${cap}</span></div>`);
  // me
  const p=M.players[0],myTurn=M.phase==='turn'&&M.turn===0;
  const win=M.phase==='end'&&M.result&&M.result.type==='win'&&M.result.wins.some(x=>x.i===0);
  const me=$('#mj-me');me.className=`mj-me ${myTurn?'turn':''} ${win?'win':''}`;
  const hm=hintMode(),hint=M.hint;
  const sugK=hm==='full'&&myTurn&&hint&&hint.kind==='turn'&&!hint.o.win&&hint.an[0]?hint.an[0].k:null;
  const dm=hm==='full'&&myTurn&&hint&&hint.kind==='turn'&&hint.dm.maxT>=.4?hint.dm.map:null;
  const {h,drawn}=mjDisplayHand();
  let sugDone=false,selDone=false;
  const handHTML=h.map((k,ix)=>{
    const cls=[];
    if(drawn!=null&&ix===h.length-1)cls.push('drawn');
    if(M.sel===k&&!selDone){cls.push('sel');selDone=true;}
    if(sugK===k&&!sugDone&&M.sel!==k){cls.push('sug');sugDone=true;}
    if(dm){if(dm[k]>=.04)cls.push('dz-hi');else if(dm[k]<.005)cls.push('dz-safe');}
    return mjTileHTML(k,cls.join(' '),'button',`data-k="${k}" ${myTurn?'':'disabled'} type="button"`);
  }).join('');
  if(me.children.length!==4)me.innerHTML='<div class="ms-head"></div><div class="river" aria-label="你打過的牌"></div><div class="me-melds"></div><div class="handwrap"><div class="mj-hand" role="group" aria-label="你的手牌"></div></div>';
  setHTML(me.children[0],`<span class="wind ${M.dealer===0?'dealer':''}">${WINDS[seatWind(0)]}</span><span class="nm">你</span>${M.dealer===0?`<span class="zhuang">莊${M.streak?` 連${M.streak}`:''}</span>`:''}<span class="stack">籌碼 ${fmtN(p.chips)}</span>`);
  setHTML(me.children[1],mjRiverHTML(p));
  setHTML(me.children[2],p.melds.length||p.flowers.length?`<div class="ms-row">${mjMeldsHTML(p,true)}${p.flowers.length?`<span class="flw">${p.flowers.map(f=>mjTileHTML(f)).join('')}</span>`:''}</div>`:'');
  setHTML(me.querySelector('.mj-hand'),handHTML);
  if(moved.length)requestAnimationFrame(()=>moved.forEach(w=>{const r=w.querySelector('.river');if(r)r.scrollLeft=r.scrollWidth;}));
  renderMjActions();renderMjCoach();
  setHTML($('#mj-log'),M.log.slice(0,60).map(l=>`<li class="${l.k==='call'?'raise':l.k}">${esc(l.t)}</li>`).join(''));
  if(M.phase==='end'&&!M.resShown&&!REPLAY.on){M.resShown=true;const g=MGEN;setTimeout(()=>{if(g===MGEN&&VIEW==='mj')openMjResult();},650);}
}
function chowLabel(s){return `吃 ${MJ_NUM[s%9]}${MJ_NUM[s%9+1]}${MJ_NUM[s%9+2]}${MJ_SUIT[(s/9)|0]}`;}
function renderMjActions(){
  const el=$('#mj-actions'),hm=hintMode(),hint=M.hint;
  if(REPLAY.on&&REPLAY.game==='mj'){setHTML(el,replayControlsHTML());return;}
  if(M.over&&M.online){setHTML(el,`<div class="waiting"><span>這一場已經結束。</span><button class="btn primary" data-ma="result" style="flex:0 1 200px">看結算</button></div>`);return;}
  if(M.phase==='end'&&M.mirror){setHTML(el,`<div class="arow"><button class="btn" data-ma="result">看結算</button>${replayAvailable('mj')?'<button class="btn" data-replay="mj">重播這局</button>':''}</div><p class="note">下一局會由房主自動開始。</p>`);return;}
  if(M.over){setHTML(el,`<div class="waiting"><span>這一場已經結束。</span><button class="btn primary" data-ma="result" style="flex:0 1 200px">看結算</button></div>`);return;}
  if(M.phase==='end'){setHTML(el,`<div class="arow"><button class="btn" data-ma="result">看結算</button>${replayAvailable('mj')?'<button class="btn" data-replay="mj">重播這局</button>':''}<button class="btn primary" data-ma="next">下一局</button></div>`);return;}
  if(M.phase==='turn'&&M.turn===0){
    const o=mjTurnOptions(0),s=M.sel;
    let b='';
    if(o.win)b+=`<button class="btn primary ${hm==='full'?'suggested':''}" data-ma="tsumo">自摸 胡牌</button>`;
    o.an.forEach(k=>b+=`<button class="btn" data-ma="an" data-mk="${k}">暗槓 ${tName(k)}</button>`);
    o.jia.forEach(k=>b+=`<button class="btn" data-ma="jia" data-mk="${k}">加槓 ${tName(k)}</button>`);
    b+=`<button class="btn ${o.win?'':'primary'}" data-ma="discard" ${s==null?'disabled':''}>${s==null?'先選一張牌':`打出 ${tName(s)}`}</button>`;
    setHTML(el,`<div class="arow">${b}</div><p class="note">點一下選牌，再點一次同一張就直接打出。</p>`);return;
  }
  if(M.phase==='claim'&&M.claim&&M.claim.opts[0]&&!M.claim.dec[0]){
    const o=M.claim.opts[0],rec=hm==='full'&&hint&&hint.kind==='claim'?hint.rec:null;
    let b='';
    if(o.win)b+=`<button class="btn primary ${rec==='win'?'suggested':''}" data-ma="win">胡牌</button>`;
    if(o.kong)b+=`<button class="btn ${rec==='kong'?'suggested':''}" data-ma="kong">槓</button>`;
    if(o.pong)b+=`<button class="btn ${rec==='pong'?'suggested':''}" data-ma="pong">碰</button>`;
    (o.chow||[]).forEach(s=>b+=`<button class="btn ${rec==='chow'&&hint.start===s?'suggested':''}" data-ma="chow" data-mk="${s}">${chowLabel(s)}</button>`);
    b+=`<button class="btn ${rec==='pass'?'suggested':''}" data-ma="pass">過</button>`;
    setHTML(el,`<div class="arow">${b}</div>`);return;
  }
  const who=M.players[M.turn];
  setHTML(el,`<div class="waiting"><span class="dots">${M.phase==='sent'?'已送出，等待同步':M.phase==='claim'?'等待其他家決定':M.phase==='between'?'下一家摸牌中':`等待 ${esc(who.name)} 出牌`}</span></div>`);
}
function waitsHTML(ws){
  if(!ws.length)return '';
  const dealerNote=M.R.tai.dealer?'（不含莊家台）':'';
  return `<div class="waits">${ws.map(w=>`<span class="wait">${mjTileHTML(w.k)}<span>剩 <b>${w.left}</b> · 胡 <b>${w.ron}</b> 台／自摸 <b>${w.tsumo}</b> 台</span></span>`).join('')}</div><p class="note">台數為預估${dealerNote}。</p>`;
}
function renderMjCoach(){
  const el=$('#mj-coach'),p=M.players[0];
  el.hidden=!SET.coach||!!M.online;if(el.hidden)return;
  const hm=SET.hint,h=M.hint;let body='';
  if(M.phase==='end'){
    const rv=M.review;
    body=rv&&(rv.count||rv.notes.length)?`<div class="review"><h3>本局回顧</h3>${rv.notes.length?`<ul>${rv.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:'<p class="note" style="color:var(--text)">你這局的打牌選擇都和建議一致。</p>'}</div>`:(M.mirror?'<p class="note">下一局會由房主自動開始。</p>':'<p class="note">按「下一局」繼續。</p>');
  }else if(M.phase==='turn'&&M.turn===0){
    if(!h||h.kind!=='turn')body=REPLAY.on?'<p class="note">這一步沒有教練分析。</p>':'<p class="note dots">分析手牌中</p>';
    else{
      if(h.o.win)body+=`<div class="advice tone-good"><span class="tag">可以自摸</span><p>這張讓你胡牌，預估 ${h.winTai} 台${M.R.tai.dealer?'（不含莊家台）':''}。</p></div>${explainHTML(h.ex,hm)}`;
      const top=h.an[0];
      body+=`<div class="handline"><span class="k">目前</span><span class="big-s">${sName(top.s)}</span></div>`;
      const rows=h.an.slice(0,3).map((a,ix)=>`<div class="ana-row">${mjTileHTML(a.k)}<span class="t">打${tName(a.k)}後 ${sName(a.s)}<small>有效進張 ${a.kinds.length} 種 ${a.uk} 張</small></span>${ix===0&&hm==='full'?'<span class="tag">建議</span>':'<span></span>'}</div>`).join('');
      body+=`<div class="ana">${rows}</div>`;
      if(h.waits&&h.waits.length)body+=`<p class="outs"><span class="k">打${tName(top.k)}後聽：</span></p>${waitsHTML(h.waits)}`;
      h.anKong.forEach(a=>{body+=`<p class="outs"><span class="k">暗槓 ${tName(a.k)}</span>：槓後 ${sName(a.s)}，還能從牌尾補一張。</p>`;});
      if(!h.o.win){
        if(hm==='full'&&h.ex)body+=`<div class="advice tone-good"><span class="tag">建議 打${tName(top.k)}</span><p>${esc(h.ex.head||h.ex.summary)}</p></div>`;
        const th=(h.dm.opps||[]).filter(o=>o.ready>=.4).sort((a,b)=>b.ready-a.ready);
        if(th.length)body+=`<div class="advice tone-warn"><span class="tag">注意防守</span><p>${th.map(o=>`${esc(o.q.name)}（約 ${Math.round(o.ready*100)}% 已聽牌）`).join('、')}。${hm==='full'?'手牌下緣有紅線的牌放槍機率較高，有綠點的幾乎安全。':''}</p></div>`;
        body+=explainHTML(h.ex,hm);
      }
    }
  }else if(M.phase==='claim'&&M.claim&&M.claim.opts[0]&&!M.claim.dec[0]){
    if(!h||h.kind!=='claim')body=REPLAY.on?'<p class="note">這一步沒有教練分析。</p>':'<p class="note dots">分析中</p>';
    else if(h.rec==='win'||h.tai!=null)body=`<div class="advice tone-good"><span class="tag">可以胡牌</span><p>胡這張預估 ${h.tai} 台${M.R.tai.dealer?'（不含莊家台）':''}。</p></div>${explainHTML(h.ex,hm)}`;
    else{
      const nm={pass:'建議 過',pong:'建議 碰',kong:'建議 槓',chow:'建議 吃'}[h.rec];
      body+=`<div class="handline"><span class="k">現在</span><span class="big-s">${sName(h.e.s0)}</span></div>`;
      if(hm==='full')body+=`<div class="advice tone-${h.rec==='pass'?'neutral':'good'}"><span class="tag">${nm}</span><p>${esc(h.ex?h.ex.summary:(h.rec==='pass'?'吃碰之後沒有比較接近胡牌，留著門清機會比較好。':'這樣做能讓你更接近聽牌。'))}</p></div>`;
      body+=h.ex?explainHTML(h.ex,hm):`<ul class="steps">${h.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`;
    }
  }else{
    // between turns: show whether you are ready, and what you wait on
    const key=M.handNo+'|'+p.hand.join(',')+'|'+p.melds.length+'|'+p.flowers.length;
    if(!M.wcache||M.wcache.key!==key){
      let info={key,s:null,waits:[]};
      if(p.hand.length%3===1){const c=mjCounts(p.hand);info.s=mjShanten(c,5-p.melds.length);if(info.s===0)info.waits=mjWaitInfo(0,p.hand.slice());}
      M.wcache=info;
    }
    const w=M.wcache;
    if(w.s!=null)body+=`<div class="handline"><span class="k">你的手牌</span><span class="big-s">${sName(w.s)}</span></div>`;
    if(w.waits.length)body+=`<p class="outs"><span class="k">你在聽：</span></p>${waitsHTML(w.waits)}`;
    else body+='<p class="note">輪到你時會顯示打牌建議。</p>';
  }
  body+=`<details class="how"><summary>向聽、進張是什麼？</summary><p>向聽數：還差幾張有用的牌才會聽牌。「聽牌」代表再來一張對的牌就能胡。</p><p>有效進張：摸到後能讓向聽數減少的牌，數字是場上還看不到的張數，越多越容易進步。</p><button class="linkbtn" data-lesson="m4">看教學：聽牌</button> <button class="linkbtn" data-lesson="m6">看教學：算台</button></details>`;
  setHTML(el,`<div class="ph"><h2>教練</h2>${segHTML()}</div>${body}`);
}
function mjNotify(){saveGame('mj');recordFrame('mj');renderMj();}
function revealHand(){
  if(innerWidth>640||REPLAY.on)return;
  requestAnimationFrame(()=>{const h=document.querySelector('#mj-me .handwrap'),a=$('#mj-actions');if(!h)return;
    const r=h.getBoundingClientRect(),limit=innerHeight-a.offsetHeight-8;
    if(r.bottom>limit||r.top<0)window.scrollBy({top:r.bottom-limit,behavior:'smooth'});});
}
function mjHumanTurn(){
  M.hint=null;M.sel=null;mjNotify();revealHand();
  if(M.online)return;
  const g=MGEN;
  const key=M.handNo+'|'+M.turnsTaken+'|'+M.players[0].hand.length;
  setTimeout(()=>{
    if(g!==MGEN||REPLAY.on||M.phase!=='turn'||M.turn!==0)return;
    aiRun('mjHint',{},()=>{mjComputeHint();return M.hint;},h=>{if(g!==MGEN||REPLAY.on||M.phase!=='turn'||M.turn!==0||key!==M.handNo+'|'+M.turnsTaken+'|'+M.players[0].hand.length)return;M.hint=h;recordFrame('mj');renderMj();});
  },30);
}
function mjHumanClaim(){
  M.hint=null;mjNotify();
  if(M.online)return;
  const g=MGEN;
  const cl=M.claim;
  setTimeout(()=>{
    if(g!==MGEN||REPLAY.on||M.phase!=='claim'||M.claim!==cl||!cl.opts[0])return;
    aiRun('mjHint',{},()=>{mjComputeHint();return M.hint;},h=>{if(g!==MGEN||REPLAY.on||M.claim!==cl||M.phase!=='claim')return;M.hint=h;recordFrame('mj');renderMj();});
  },30);
}
function mjOnSessionOver(){}
$('#mj-me').addEventListener('click',e=>{
  if(REPLAY.on)return;
  const t=e.target.closest('[data-k]');if(!t||t.disabled)return;
  const k=Number(t.dataset.k);
  if(M.phase!=='turn'||M.turn!==0)return;
  if(M.sel===k){mjHumanDiscard(k);return;}
  M.sel=k;renderMj();
});
$('#mj-actions').addEventListener('click',e=>{
  if(REPLAY.on)return;
  const t=e.target.closest('[data-ma]');if(!t||t.disabled)return;
  const a=t.dataset.ma,k=t.dataset.mk!=null?Number(t.dataset.mk):null;
  if(a==='next'){$('#ov-mjres').hidden=true;mjStartHand();}
  else if(a==='result')openMjResult();
  else if(a==='discard'&&M.sel!=null)mjHumanDiscard(M.sel);
  else if(a==='tsumo'){if(M.phase==='turn'&&M.turn===0)mjSelfWin(0);}
  else if(a==='an'){if(M.phase==='turn'&&M.turn===0)mjAnKong(0,k);}
  else if(a==='jia'){if(M.phase==='turn'&&M.turn===0)mjJiaGang(0,k);}
  else if(['win','pong','kong','pass'].includes(a))mjHumanClaim2(a);
  else if(a==='chow')mjHumanClaim2('chow',k);
});
function openMjResult(){
  const r=M.result;if(!r)return;
  let title,body='';
  if(r.type==='void'){title='本局作廢';body='<p>房主連線中斷，這一局不算，籌碼沒有變動，會用同樣的莊家重新發牌。</p>';}
  else if(r.type==='draw'){title='流局';body='<p>牌牆摸到留牌處仍沒有人胡牌，莊家連莊，不用付籌碼。</p>';}
  else{
    title=r.wins.map(w=>{const nm=M.players[w.i].name;return w.flowerWin?`${nm} ${w.flowerWin==='baxian'?'八仙過海':'七搶一'}`:w.self?`${nm} 自摸`:`${nm} 胡牌`;}).join('、');
    r.wins.forEach(w=>{
      const nm=M.players[w.i].name;
      const conc=w.hand.slice().sort((a,b)=>a-b);
      if(w.win!=null&&!w.flowerWin){conc.splice(conc.indexOf(w.win),1);}
      const how=w.flowerWin?'集齊花牌':w.self?`自摸 ${tName(w.win)}`:`胡 ${M.players[r.payer].name} 打的 ${tName(w.win)}`;
      body+=`<h3 style="margin:0;font-size:14px">${esc(nm)} · ${how}</h3>
      <div class="res-hand">${mjMeldsHTML({melds:w.melds},true)}<span class="meld">${conc.map(k=>mjTileHTML(k)).join('')}</span>${w.win!=null&&!w.flowerWin?`<span class="meld">${mjTileHTML(w.win,'hi')}</span>`:''}${w.flowers.length?`<span class="flw">${w.flowers.map(f=>mjTileHTML(f)).join('')}</span>`:''}</div>
      <table class="res-tab"><tbody>${w.items.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.tai} 台</td></tr>`).join('')||'<tr><td>沒有台型（只算底）</td><td>0 台</td></tr>'}
      <tr class="total"><td>牌型合計</td><td>${w.tai} 台</td></tr></tbody></table>
      <ul class="pays">${w.pays.map(x=>`<li>${esc(M.players[x.j].name)} 付 ${fmtN(x.paid)}（底 ${M.R.base}＋${x.tai} 台 × ${M.R.perTai}${x.dealerItems.length?`，含${x.dealerItems.map(d=>d.name+' '+d.tai+' 台').join('、')}`:''}）${x.paid<x.want?'，籌碼不足':''}</li>`).join('')}</ul>`;
    });
  }
  $('#mjres-h').textContent=title;$('#mjres-body').innerHTML=body;
  const btn=$('#mjres-next');btn.textContent=M.over?'看最終排名':M.mirror?'關閉（下一局自動開始）':M.online?'馬上開下一局':'下一局';
  $('#ov-mjres').hidden=false;
}
$('#mjres-next').onclick=()=>{
  $('#ov-mjres').hidden=true;
  if(M.over){
    const rank=M.players.slice().sort((a,b)=>b.chips-a.chips);
    showOverSheet(M.place===1?'你拿下這一場第一名':`這一場你排第 ${M.place} 名`,
      `<ol class="rank">${rank.map(p=>`<li class="${p.human?'me':''}"><span>${esc(p.name)}${p.human?'':`（${LVN[p.level]}）`}</span><span>${fmtN(p.chips)}</span></li>`).join('')}</ol>
      <p class="note" style="margin-top:12px">共打了 ${M.handNo} 局。再來一場時，所有人的籌碼都會重置為 ${fmtN(SET.mj.chips)}。</p>`,
      M.online?onlineRestart:()=>{VIEW='mj';newMjSession();},'mj',M.online?onlineOverLabels():null);
  }else if(M.phase==='end')mjStartHand();
};
function renderMjRules(){
  const R=M?M.R:SET.mj;
  const legend=[[0,'萬子'],[13,'筒子'],[22,'條子'],[27,'風牌'],[31,'三元牌'],[34,'花牌']];
  $('#mjr-body').innerHTML=`
  <ol class="steps">
    <li>每人 16 張，莊家多拿 1 張先打。花牌一摸到就亮出並從牌尾補牌。</li>
    <li>輪流摸一張、打一張。別人打出的牌可以宣告：胡 &gt; 碰／槓 &gt; 吃（只有下家能吃）。</li>
    <li>湊成 5 組（順子或刻子）加 1 對眼就胡牌。自摸由三家付，放槍由打出那張的人付。</li>
    <li>每手籌碼 ＝ 底 ${R.base} ＋ 台數 × ${R.perTai}。莊家胡或莊家輸時，另外加莊家台與連莊台。</li>
    <li>${R.reserve?`牌牆剩 ${R.reserve} 張時流局`:'牌牆摸完時流局'}；莊家胡牌或流局就連莊。</li>
  </ol>
  <div class="legend">${legend.map(([k,n])=>`<figure>${mjTileHTML(k)}<figcaption>${n}</figcaption></figure>`).join('')}</div>
  <h3>${M?'這一場使用的台數表':'目前的台數表'}</h3>
  <table class="res-tab"><tbody>${MJ_TAI_DEF.filter(([k])=>R.tai[k]>0).map(([k,n,,note])=>`<tr><td>${n}${note?`<span class="note" style="display:block;font-size:11.5px">${note}</span>`:''}</td><td>${R.tai[k]} 台</td></tr>`).join('')}</tbody></table>
  <p class="note">台數、留牌、一炮多響等規則都可以在首頁的系統設定修改。</p>`;
}

