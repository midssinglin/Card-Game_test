// ONLINE START
// Online play. The room's host runs the game engine in their browser; everyone else is a client.
// Database layout (Firebase Realtime Database, see firebase/database.rules.json):
//   lobby/{game}/{rid}        open public rooms for quick match {n, max, t}
//   codes/{code}              6-letter room code -> rid
//   rooms/{rid}/meta          {game, code, host, public, status, max, bots, level, created, rules}
//   rooms/{rid}/seats/{i}     {uid, name}  (host is seat 0)
//   rooms/{rid}/presence/{uid}
//   rooms/{rid}/state/public  table everyone can see (JSON string)
//   rooms/{rid}/state/priv/{uid}  that player's hidden cards (JSON string, readable only by them)
//   rooms/{rid}/inbox/{id}    client moves for the host {uid, m}
const ONLINE={role:null,mode:null,rid:null,meta:null,seats:{},presence:{},game:null,unsubs:[],csubs:[],hsubs:[],seatOf:{},migT:null,pendingHost:false,
  pub:null,priv:null,lastPriv:{},pubT:null,ver:0,nextT:null,nextKey:'',turnT:null,startT:null,goneT:{},hintKey:'',
  localG:null,localM:null,msg:'',busy:false,lastOver:false,opts:{max:6,bots:true,level:'normal',public:false}};
const ON_TURN_SEC=40,ON_CLAIM_SEC=15,ON_NEXT_SEC={poker:7,mj:10},ON_QUICK_WAIT=25,ON_AWAY_SEC=8,ON_HOST_GRACE=10;
// what this device remembers about the room it is in, so a reload or a new tab can go back to the same seat
const ON_REC='ptx-online',ON_SNAP='ptx-online-host';
// kept per tab (survives a reload) and per device (survives closing the tab)
function saveRecord(extra){const r=JSON.stringify(Object.assign(loadRecord()||{},extra||{},{t:Date.now()}));try{sessionStorage.setItem(ON_REC,r);}catch(_){}try{localStorage.setItem(ON_REC,r);}catch(_){}}
function loadRecord(){for(const st of [()=>sessionStorage,()=>localStorage]){try{const v=JSON.parse(st().getItem(ON_REC)||'null');if(v)return v;}catch(_){}}return null;}
function clearRecord(){try{sessionStorage.removeItem(ON_REC);}catch(_){}try{const l=JSON.parse(localStorage.getItem(ON_REC)||'null');if(!l||!ONLINE.rid||l.rid===ONLINE.rid)localStorage.removeItem(ON_REC);localStorage.removeItem(ON_SNAP);}catch(_){}}
function seatKey(){const a=new Uint8Array(12);(window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.random()*256|0);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('');}
function seatName(uid){const s=Object.values(ONLINE.seats||{}).find(x=>x&&x.uid===uid);return s?s.name:'';}
const CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function onNick(){try{return localStorage.getItem('ptx-nick')||'';}catch(_){return '';}}
function onSetNick(v){try{localStorage.setItem('ptx-nick',v);}catch(_){}}
function roomPath(p){return `rooms/${ONLINE.rid}/${p}`;}
function onMsg(t){ONLINE.msg=t;if(VIEW==='online')renderOnline();}

// ---------- lobby / room screens
function renderOnline(){
  const root=$('#online-root');
  if(ONLINE.rid&&ONLINE.meta){root.innerHTML=roomHTML();return;}
  const fb=firebaseConfigured(),game=ONLINE.game||'poker',o=ONLINE.opts;
  const nick=esc(onNick());
  root.innerHTML=`<div class="hero-home"><p class="eyebrow">線上對戰</p><h2 class="display small">和朋友一起玩</h2>
    <p class="lede">快速配對會找正在等人的公開房間，找不到就幫你開一間；人不夠時由電腦補位。也可以開私人房間，把 6 碼房號傳給朋友。</p></div>
  <section class="panel online-panel">
    <div class="set-grid">
      <label class="field"><span>你的暱稱</span><input id="on-name" maxlength="12" value="${nick}" placeholder="例如：小明" autocomplete="nickname"></label>
      <label class="field"><span>遊戲</span><select id="on-game">${[['poker','德州撲克'],['mj','台灣麻將']].map(([v,l])=>`<option value="${v}" ${game===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>連線方式</span><select id="on-mode">
        ${fb?'<option value="firebase">網路連線（Firebase）</option>':''}
        <option value="local" ${!fb?'selected':''}>本機測試：同一台裝置的分頁之間</option></select></label>
    </div>
    ${fb?'':`<p class="note">網路連線還沒設定，現在只能用「本機測試」：在同一個瀏覽器開兩個分頁就能互相對戰。設定方法見專案 README 的「線上對戰設定」。</p>`}
    <div class="gc-btns">
      <button class="btn primary" data-on="quick">快速配對</button>
      <button class="btn" data-on="create">建立房間</button>
    </div>
    <div class="join-row">
      <input id="on-code" maxlength="6" placeholder="6 碼房號" autocapitalize="characters" aria-label="房號">
      <button class="btn" data-on="join">加入房間</button>
    </div>
    <p class="note on-msg" role="status">${esc(ONLINE.msg||'')}</p>
  </section>
  <section class="panel">
    <div class="ph"><h2>建立房間的選項</h2></div>
    <div class="set-grid">
      <label class="field"><span>人數上限</span><select id="on-max">${(game==='mj'?[4]:[2,3,4,5,6]).map(n=>`<option value="${n}" ${(game==='mj'?4:o.max)===n?'selected':''}>${n} 人</option>`).join('')}</select></label>
      <label class="field"><span>空位由電腦補上</span><select id="on-bots"><option value="true" ${o.bots?'selected':''}>是</option><option value="false" ${!o.bots?'selected':''}>否（${game==='mj'?'麻將一定要 4 人，仍會補位':'只和真人玩'}）</option></select></label>
      <label class="field"><span>補位電腦的難度</span><select id="on-level">${LVOPTS.map(([v,l])=>`<option value="${v}" ${o.level===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>開放快速配對</span><select id="on-public"><option value="false" ${!o.public?'selected':''}>否，只有拿到房號的人能加入</option><option value="true" ${o.public?'selected':''}>是，陌生人也可能加入</option></select></label>
    </div>
    <p class="note">${game==='mj'?'麻將使用你在首頁設定的台數與家規。':'撲克使用你在首頁設定的起始籌碼與盲注升級。'}輪到某位玩家時，${ON_TURN_SEC} 秒沒動作會自動過牌或打出摸到的牌；斷線的玩家由電腦代打。</p>
  </section>`;
}
function roomHTML(){
  const m=ONLINE.meta,host=ONLINE.role==='host',seats=ONLINE.seats||{},n=Object.keys(seats).length;
  const list=[];for(let i=0;i<m.max;i++){const s=seats[i];list.push(`<li class="${s&&s.uid===NET.uid?'me':''}"><span>${s?esc(s.name):'<span class="note">空位'+(m.bots?'（會由電腦補上）':'')+'</span>'}</span><span>${i===0?'房主':s?'已加入':''}</span></li>`);}
  const wait=ONLINE.startAt?Math.max(0,Math.ceil((ONLINE.startAt-Date.now())/1000)):0;
  return `<div class="hero-home"><p class="eyebrow">${m.game==='mj'?'台灣麻將':'德州撲克'} · ${m.public?'公開房間':'私人房間'}</p><h2 class="display small">房號 <span class="code">${esc(m.code)}</span></h2>
    <p class="lede">把房號傳給朋友，在「線上」頁輸入就能加入。${NET.backend==='local'?'（本機測試：在同一個瀏覽器開新分頁加入）':''}</p></div>
  <section class="panel">
    <div class="ph"><h2>座位</h2><span class="note">${n}／${m.max} 人</span></div>
    <ol class="rank">${list.join('')}</ol>
    ${host?`<p class="note">${m.status==='waiting'?(wait?`${wait} 秒後自動開始（空位由電腦補上）。`:'人到齊後按「開始牌局」。'):''}</p>`:'<p class="note">等待房主開始牌局…</p>'}
    <div class="gc-btns">
      <button class="btn" data-on="copy">複製房號</button>
      ${host?`<button class="btn primary" data-on="start" ${n<2&&!m.bots&&m.game==='poker'?'disabled':''}>開始牌局</button>`:''}
      <button class="btn" data-on="leave">離開房間</button>
    </div>
    <p class="note on-msg" role="status">${esc(ONLINE.msg||'')}</p>
  </section>`;
}
document.addEventListener('change',e=>{
  if(VIEW!=='online')return;
  const id=e.target.id;
  if(id==='on-name')onSetNick(e.target.value.trim().slice(0,12));
  if(id==='on-game'){ONLINE.game=e.target.value;renderOnline();}
  if(id==='on-max')ONLINE.opts.max=Number(e.target.value);
  if(id==='on-bots')ONLINE.opts.bots=e.target.value==='true';
  if(id==='on-level')ONLINE.opts.level=e.target.value;
  if(id==='on-public')ONLINE.opts.public=e.target.value==='true';
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-on]');if(!b)return;
  const a=b.dataset.on;
  if(a==='copy'){const c=ONLINE.meta&&ONLINE.meta.code;try{await navigator.clipboard.writeText(c);onMsg('房號已複製：'+c);}catch(_){onMsg('請手動複製房號：'+c);}return;}
  if(a==='leave'){onlineLeave();return;}
  if(a==='start'){onlineStart();return;}
  if(ONLINE.busy)return;
  const name=($('#on-name')&&$('#on-name').value.trim())||onNick();
  if(!name){onMsg('先輸入一個暱稱。');$('#on-name')&&$('#on-name').focus();return;}
  onSetNick(name.slice(0,12));
  const game=$('#on-game').value,mode=$('#on-mode').value,code=(($('#on-code')&&$('#on-code').value)||'').trim().toUpperCase();ONLINE.game=game;
  ONLINE.busy=true;onMsg('連線中…');
  try{
    await netInit(mode);ONLINE.mode=mode;
    if(a==='quick')await onlineQuick(game);
    else if(a==='create')await onlineCreate({game,max:game==='mj'?4:ONLINE.opts.max,bots:game==='mj'?true:ONLINE.opts.bots,level:ONLINE.opts.level,public:ONLINE.opts.public,quick:false});
    else if(a==='join'){
      if(code.length!==6)throw new Error('房號是 6 個英數字。');
      const rid=await ref('codes/'+code).get();
      if(!rid)throw new Error('找不到這個房號，請確認有沒有打錯。');
      await onlineJoin(rid);
    }
  }catch(err){onMsg(String(err&&err.message||err));}
  ONLINE.busy=false;
});

// ---------- creating / joining
async function onlineCreate(o){
  const rid='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  let code=null;
  for(let t=0;t<12&&!code;t++){let c='';for(let i=0;i<6;i++)c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];if(await ref('codes/'+c).claim(rid))code=c;}
  if(!code)throw new Error('暫時無法產生房號，請再試一次。');
  const rules=o.game==='mj'?JSON.parse(JSON.stringify(SET.mj)):{chips:SET.poker.chips,blindUp:SET.poker.blindUp};
  const meta={game:o.game,code,host:NET.uid,public:!!o.public,status:'waiting',max:o.max,bots:!!o.bots,level:o.level,created:Date.now(),rules:JSON.stringify(rules)};
  ONLINE.rid=rid;
  await ref(roomPath('meta')).set(meta);
  await ref(roomPath('seats/0')).set({uid:NET.uid,name:onNick()});
  await ref(roomPath('members/'+NET.uid)).set(true);
  const key=seatKey();await ref(roomPath('keys/0')).set(key);
  saveRecord({rid,code,mode:NET.backend,seat:0,key,game:o.game});
  if(o.public){await ref(`lobby/${o.game}/${rid}`).set({n:1,max:o.max,t:Date.now()});await ref(`lobby/${o.game}/${rid}`).onDisconnectRemove();}
  await enterRoom(rid,'host',o.quick);
}
async function onlineJoin(rid){
  const meta=await ref(`rooms/${rid}/meta`).get();
  if(!meta||meta.status!=='waiting')throw new Error(meta&&meta.status==='playing'?'這個房間已經開始了。':'房間不存在或已結束。');
  let seat=-1;
  for(let i=1;i<meta.max&&seat<0;i++){if(await ref(`rooms/${rid}/seats/${i}`).claim({uid:NET.uid,name:onNick()}))seat=i;}
  if(seat<0)throw new Error('房間已滿。');
  ONLINE.rid=rid;
  await ref(roomPath('members/'+NET.uid)).set(true);
  const key=seatKey();await ref(roomPath('keys/'+seat)).set(key);
  saveRecord({rid,code:meta.code,mode:NET.backend,seat,key,game:meta.game});
  await enterRoom(rid,'client',false);
}
async function onlineQuick(game){
  const lob=(await ref('lobby/'+game).get())||{};
  const cands=Object.entries(lob).filter(([,v])=>v&&v.n<v.max&&Date.now()-v.t<180000).sort((a,b)=>b[1].n-a[1].n);
  for(const [rid] of cands){try{await onlineJoin(rid);return;}catch(_){}}
  await onlineCreate({game,max:game==='mj'?4:6,bots:true,level:'normal',public:true,quick:true});
}
function subscribeClient(){
  ONLINE.csubs.push(ref(roomPath('state/public')).on(v=>{ONLINE.pub=v;clientApply();}));
  ONLINE.csubs.push(ref(roomPath('state/priv/'+NET.uid)).on(v=>{ONLINE.priv=v;clientApply();}));
}
function subscribeHost(){ONLINE.hsubs.push(ref(roomPath('inbox')).onAdd((k,v)=>hostInbox(k,v)));}
function dropSubs(list){(ONLINE[list]||[]).forEach(u=>{try{u();}catch(_){}});ONLINE[list]=[];}
async function enterRoom(rid,role,quick,opt){
  opt=opt||{};
  ONLINE.role=role;ONLINE.rid=rid;ONLINE.msg='';ONLINE.lastOver=false;ONLINE.hintKey='';ONLINE.lastPriv={};ONLINE.csubs=[];ONLINE.hsubs=[];
  // presence is written again after every reconnect (phones drop the connection in the background)
  ONLINE.unsubs.push(netOnConnected(()=>{const pr=ref(roomPath('presence/'+NET.uid));pr.onDisconnectRemove();pr.set(true);}));
  ONLINE.unsubs.push(ref(roomPath('meta')).on(m=>onMeta(m)));
  ONLINE.unsubs.push(ref(roomPath('seats')).on(s=>{ONLINE.seats=s||{};if(ONLINE.role==='host')hostSeatsChanged();else maybeMigrate();if(VIEW==='online')renderOnline();}));
  ONLINE.unsubs.push(ref(roomPath('presence')).on(p=>{ONLINE.presence=p||{};presenceChanged();}));
  if(role==='client')subscribeClient();
  else if(opt.resume&&opt.status==='playing'){
    if(opt.snap&&restoreHostSnap(opt.snap)){subscribeHost();toast('已回到牌局，你仍是房主。');return;}
    // no saved copy of the game on this device: rebuild it from the public table and replay the hand
    ONLINE.role='client';ONLINE.pendingHost=true;subscribeClient();return;
  }
  else{
    subscribeHost();
    if(quick){ONLINE.startAt=Date.now()+ON_QUICK_WAIT*1000;ONLINE.startT=setInterval(()=>{if(!ONLINE.meta||ONLINE.meta.status!=='waiting'){clearInterval(ONLINE.startT);return;}if(Date.now()>=ONLINE.startAt)onlineStart();else if(VIEW==='online')renderOnline();},1000);}
  }
  if(!opt.resume)go('online');
}
function onMeta(m){
  const prev=ONLINE.meta;ONLINE.meta=m;
  if(!m||m.status==='ended'){
    if(ONLINE.role==='client'&&ONLINE.rid){clearRecord();onlineCleanup();ONLINE.msg='房主已結束房間。';go('online');}
    return;
  }
  if(prev&&prev.host!==m.host){
    if(ONLINE.role==='host'&&m.host!==NET.uid)demoteToClient();
    else if(m.host!==NET.uid)toast(`${seatName(m.host)||'另一位玩家'} 接手當房主，牌局繼續。`);
  }
  if(VIEW==='online')renderOnline();
  if(ONLINE.role==='client'&&m.status==='playing'&&(!prev||prev.status!=='playing'))onMsg('牌局開始了！');
  maybeMigrate();
}
function hostSeatsChanged(){
  const m=ONLINE.meta;if(!m||m.status!=='waiting')return;
  const n=Object.keys(ONLINE.seats).length;
  if(m.public)ref(`lobby/${m.game}/${ONLINE.rid}`).update({n,t:Date.now()});
  if(n>=m.max)onlineStart();
}
function presenceChanged(){
  if(ONLINE.role==='host'&&ONLINE.meta&&ONLINE.meta.status==='playing'){
    const st=ONLINE.meta.game==='poker'?G:M;if(!st||!st.online)return;
    st.players.forEach((p,i)=>{
      if(!p.uid||p.uid===NET.uid)return;
      if(ONLINE.presence[p.uid]){clearTimeout(ONLINE.goneT[p.uid]);delete ONLINE.goneT[p.uid];if(p.away)playerBack(i);return;}
      if(!p.away&&!ONLINE.goneT[p.uid])ONLINE.goneT[p.uid]=setTimeout(()=>playerAway(p.uid),ON_AWAY_SEC*1000);
    });
  }
  maybeMigrate();
  if(VIEW==='online')renderOnline();
}
// a client checks whether the host is gone; the first present player in seat order takes over
function maybeMigrate(){
  const m=ONLINE.meta;
  if(ONLINE.role!=='client'||!ONLINE.rid||!m||m.status==='ended')return;
  if(ONLINE.presence[m.host]){if(ONLINE.migT){clearTimeout(ONLINE.migT);ONLINE.migT=null;toast('房主已重新連線。');}return;}
  if(ONLINE.migT||!Object.keys(ONLINE.presence).length)return;
  const cands=Object.keys(ONLINE.seats).map(Number).sort((a,b)=>a-b).map(k=>ONLINE.seats[k])
    .filter(x=>x&&x.uid&&x.uid!==m.host&&ONLINE.presence[x.uid]).map(x=>x.uid);
  const rank=cands.indexOf(NET.uid);if(rank<0)return;
  const old=m.host;
  toast('房主連線中斷，等待重新連線…',ON_HOST_GRACE*1000);
  ONLINE.migT=setTimeout(()=>{ONLINE.migT=null;const mm=ONLINE.meta;if(!mm||mm.host!==old||ONLINE.presence[old]||ONLINE.role!=='client')return;becomeHost(old);},(ON_HOST_GRACE+rank*5)*1000);
}
// seat flags after a change of host: who is played by this device, who is remote, who is away
function seatFlags(st){
  st.players.forEach(p=>{
    if(!p.uid)return;
    p.remote=p.uid!==NET.uid;
    p.away=p.uid===NET.uid?false:!ONLINE.presence[p.uid];
    p.human=!p.away;
    p.level=p.level||'normal';p.style=p.style||'balanced';p.persona=p.persona||{aggr:1,bluff:.1};
  });
}
async function becomeHost(oldHost,already){
  const m=ONLINE.meta;if(!m)return;
  if(!already){let ok=false;try{ok=await ref(roomPath('meta/host')).swap(oldHost,NET.uid);}catch(_){}if(!ok)return;}
  dropSubs('csubs');ONLINE.role='host';ONLINE.pendingHost=false;
  if(m.status==='waiting'){subscribeHost();saveRecord({});toast('你成為新房主。');renderOnline();return;}
  const game=m.game,st=game==='poker'?G:M;
  if(!st||!st.mirror){try{await ref(roomPath('meta/status')).set('ended');}catch(_){}clearRecord();onlineCleanup();onMsg('房主斷線，牌局無法繼續。');go('online');return;}
  if(game==='poker'){
    GEN++;
    if(!G.handOver&&!G.over){
      G.players.forEach(p=>{p.chips+=p.total||0;p.total=0;p.bet=0;p.allIn=false;});
      G.handOver=true;G.toAct=-1;G.result='房主連線中斷，這一手作廢，下注已退回。';addLog(G.result,'sys');
    }
    G.players.forEach(p=>{if((p.hole||[]).some(c=>c<0))p.hole=[];});
    Object.assign(G,{mirror:false,deck:[],hint:null,decisions:[]});
  }else{
    MGEN++;
    if(M.phase!=='end'&&!M.over){M.handNo--;M.phase='end';M.result={type:'void'};M.claim=null;M.last=null;mlog('房主連線中斷，這一局作廢，重新發牌','sys');}
    M.players.forEach(p=>{if((p.hand||[]).some(k=>k<0))p.hand=[];});
    Object.assign(M,{mirror:false,hint:null,decisions:[],resShown:true,sel:null});
  }
  seatFlags(st);
  ONLINE.seatOf={};st.players.forEach((p,i)=>{if(p.uid)ONLINE.seatOf[p.uid]=i;});
  ONLINE.lastPriv={};ONLINE.nextKey='';
  try{await ref(roomPath('inbox')).remove();}catch(_){}
  subscribeHost();
  toast('原房主斷線，你接手當房主，牌局繼續。');
  if(game==='poker')notify();else mjNotify();
}
function demoteToClient(){
  dropSubs('hsubs');
  [ONLINE.pubT,ONLINE.nextT,ONLINE.turnT].forEach(t=>clearTimeout(t));
  Object.values(ONLINE.goneT).forEach(t=>clearTimeout(t));ONLINE.goneT={};
  if(G&&G.online)GEN++;if(M&&M.online)MGEN++;
  try{localStorage.removeItem(ON_SNAP);}catch(_){}
  ONLINE.role='client';subscribeClient();
  toast('連線中斷期間，另一位玩家接手當了房主。');
}
function restoreHostSnap(snap){
  if(!snap||snap.rid!==ONLINE.rid||!snap.state)return false;
  const st=snap.state;st.online=true;st.mirror=false;st.resume=null;st.needResume=false;
  ONLINE.seatOf=snap.seatOf||{};ONLINE.ver=snap.ver||0;
  if(snap.game==='poker'){GEN++;G=st;go('poker');pokerResume();}
  else{MGEN++;M=st;M.resShown=true;go('mj');mjResume();}
  return true;
}

// ---------- host: start, publish, apply moves
function onlineStart(){
  const m=ONLINE.meta;if(ONLINE.role!=='host'||!m||m.status!=='waiting')return;
  clearInterval(ONLINE.startT);ONLINE.startAt=0;
  const seats=Object.keys(ONLINE.seats).map(Number).sort((a,b)=>a-b).map(i=>ONLINE.seats[i]).filter(x=>x&&(x.uid===NET.uid||ONLINE.presence[x.uid]));
  const rules=JSON.parse(m.rules);
  const humans=seats.map(s=>({name:s.name,human:true,remote:s.uid!==NET.uid,uid:s.uid,level:'normal',style:'balanced'}));
  const want=m.game==='mj'?4:(m.bots?m.max:Math.max(2,humans.length));
  const botNames=['阿明','小美','老K','阿傑','蘭姐'];
  const bots=[];for(let i=humans.length;i<want;i++)bots.push({name:botNames[i-1]||('電腦'+i),human:false,level:m.level,style:'random'});
  const players=humans.concat(bots).map(p=>Object.assign(p,{style:p.human?'balanced':pickStyle(p.style,m.game==='mj'?MJ_STYLES:PK_STYLES)}));
  ONLINE.seatOf={};players.forEach((p,i)=>{if(p.uid)ONLINE.seatOf[p.uid]=i;});
  ref(roomPath('meta/status')).set('playing');
  if(m.public)ref(`lobby/${m.game}/${ONLINE.rid}`).remove();
  if(m.game==='poker'){ONLINE.localG=G;newSession({players,chips:rules.chips,blindUp:rules.blindUp});go('poker');}
  else{ONLINE.localM=M;players.forEach(p=>{p.chips=rules.chips;});newMjSession({rules,players});go('mj');}
}
function hostPublishSoon(){if(ONLINE.role!=='host'||!ONLINE.rid)return;clearTimeout(ONLINE.pubT);ONLINE.pubT=setTimeout(hostPublish,40);}
function hostPublish(){
  const game=ONLINE.meta&&ONLINE.meta.game;if(!game)return;
  const st=game==='poker'?G:M;if(!st||!st.online)return;
  let pub;
  if(game==='poker'){
    pub=JSON.parse(JSON.stringify(Object.assign({},st,{deck:[],hint:null,decisions:[],review:null,resume:null,log:st.log.slice(0,40)})));
    pub.players.forEach(p=>{if(!p.show)p.hole=p.hole.map(()=>-1);});
  }else{
    pub=JSON.parse(JSON.stringify(Object.assign({},st,{wall:[],hint:null,wcache:null,decisions:[],review:null,resume:null,drawn:null,justDrawn:null,sel:null,log:st.log.slice(0,40)})));
    pub.wallLen=st.wall.length;
    pub.players.forEach(p=>{p.handCount=p.hand.length;if(st.phase!=='end')p.hand=[];});
    if(pub.claim)pub.claim={kind:pub.claim.kind,k:pub.claim.k,from:pub.claim.from,opts:{},dec:{}};
  }
  pub.nextAt=ONLINE.nextAt||0;pub.v=++ONLINE.ver;
  try{localStorage.setItem(ON_SNAP,JSON.stringify({rid:ONLINE.rid,game,ver:ONLINE.ver,seatOf:ONLINE.seatOf,state:Object.assign({},st,{resume:null,log:st.log.slice(0,40)})}));}catch(_){}
  if(!ONLINE.recT||Date.now()-ONLINE.recT>30000){ONLINE.recT=Date.now();saveRecord({});}
  ref(roomPath('state/public')).set({json:JSON.stringify(pub),v:pub.v});
  st.players.forEach((p,i)=>{
    if(!p.remote)return;
    const pv=game==='poker'?{hole:p.hole}:{hand:p.hand,drawn:st.turn===i?st.drawn:null,justDrawn:st.turn===i?st.justDrawn:null,
      claimOpts:st.claim&&st.claim.opts[i]||null,claimDec:st.claim&&st.claim.dec[i]||null};
    const s=JSON.stringify(pv);
    if(ONLINE.lastPriv[p.uid]!==s){ONLINE.lastPriv[p.uid]=s;ref(roomPath('state/priv/'+p.uid)).set({json:s});}
  });
  hostAutoNext(game,st);
}
function hostAutoNext(game,st){
  const ended=game==='poker'?st.handOver:st.phase==='end';
  const key=st.handNo+'|'+ended+'|'+st.over;
  if(key===ONLINE.nextKey)return;
  ONLINE.nextKey=key;clearTimeout(ONLINE.nextT);ONLINE.nextAt=0;
  if(!ended||st.over)return;
  ONLINE.nextAt=Date.now()+ON_NEXT_SEC[game]*1000;
  const hn=st.handNo;
  ONLINE.nextT=setTimeout(()=>{
    const s=game==='poker'?G:M;
    if(!s||!s.online||s.handNo!==hn||s.over)return;
    $('#ov-mjres').hidden=true;
    if(game==='poker'&&s.handOver)startHand();else if(game==='mj'&&s.phase==='end')mjStartHand();
  },ON_NEXT_SEC[game]*1000);
}
function armTurnTimer(sec,key,fn){clearTimeout(ONLINE.turnT);ONLINE.turnT=setTimeout(()=>{if(key()===ONLINE.turnKey)fn();},sec*1000);ONLINE.turnKey=key();}
remoteTurn=function(i){
  notify();
  const key=()=>G.handNo+'|'+G.street+'|'+G.toAct+'|'+G.log.length;
  armTurnTimer(ON_TURN_SEC,key,()=>{if(G.toAct===i&&!G.handOver){const p=G.players[i];act(i,G.currentBet>p.bet?'fold':'check');}});
};
mjRemoteTurn=function(i){
  mjNotify();
  const key=()=>M.handNo+'|'+M.turnsTaken+'|'+M.turn+'|'+M.phase+'|'+M.players[i].hand.length;
  armTurnTimer(ON_TURN_SEC,key,()=>{if(M.phase==='turn'&&M.turn===i){const d=mjAiTurnDecide(i);mjApplyTurn(i,d.type==='tsumo'?d:{type:'discard',k:M.drawn!=null&&M.players[i].hand.includes(M.drawn)?M.drawn:d.k});}});
};
mjRemoteClaim=function(seats){
  const cl=M.claim;
  setTimeout(()=>{if(M.claim===cl&&M.phase==='claim')seats.forEach(j=>{if(!cl.dec[j])mjHumanClaim2('pass',null,j);});},ON_CLAIM_SEC*1000);
};
function hostInbox(key,val){
  ref(roomPath('inbox/'+key)).remove();
  if(!val||!val.m)return;
  let msg;try{msg=JSON.parse(val.m);}catch(_){return;}
  if(msg.a==='reclaim'){hostReclaim(val.uid,msg);return;}
  const i=ONLINE.seatOf[val.uid];if(i==null)return;
  if(msg.g==='poker'&&G&&G.online){
    if(msg.a==='act'&&G.toAct===i&&!G.handOver&&['fold','check','call','raise'].includes(msg.type))act(i,msg.type,Number(msg.to)||0);
    return;
  }
  if(msg.g==='mj'&&M&&M.online){
    const p=M.players[i];
    if(msg.a==='turn'&&M.phase==='turn'&&M.turn===i){
      const o=mjTurnOptions(i),k=Number(msg.k);
      if(msg.type==='tsumo'&&o.win)mjSelfWin(i);
      else if(msg.type==='an'&&o.an.includes(k))mjAnKong(i,k);
      else if(msg.type==='jia'&&o.jia.includes(k))mjJiaGang(i,k);
      else if(msg.type==='discard'&&p.hand.includes(k))mjDiscard(i,k);
    }else if(msg.a==='claim'&&M.phase==='claim'&&M.claim&&M.claim.opts[i]&&!M.claim.dec[i]){
      const o=M.claim.opts[i],t=msg.type;
      const ok=t==='pass'||(t==='win'&&o.win)||(t==='pong'&&o.pong)||(t==='kong'&&o.kong)||(t==='chow'&&o.chow&&o.chow.includes(Number(msg.start)));
      if(ok)mjHumanClaim2(t,t==='chow'?Number(msg.start):undefined,i);
    }
  }
}
// a player who drops out is played by the computer until they come back
function playerAway(uid){
  delete ONLINE.goneT[uid];
  const game=ONLINE.meta&&ONLINE.meta.game,st=game==='poker'?G:M;if(!st||!st.online)return;
  const i=ONLINE.seatOf[uid];if(i==null)return;
  const p=st.players[i];if(!p.remote||p.away)return;
  Object.assign(p,{away:true,human:false,level:p.level||'normal',style:p.style||'balanced',persona:p.persona||{aggr:1,bluff:.1}});
  if(game==='poker'){addLog(`${p.name} 斷線了，暫由電腦代打`,'sys');if(G.toAct===i&&!G.handOver)schedule();else notify();}
  else{
    mlog(`${p.name} 斷線了，暫由電腦代打`,'sys');
    if(M.phase==='turn'&&M.turn===i)mjTurn();
    else if(M.phase==='claim'&&M.claim&&M.claim.opts[i]&&!M.claim.dec[i]){const d=mjAiClaim(i,M.claim.opts[i],M.claim.k);mjHumanClaim2(d.type,d.start,i);}
    else mjNotify();
  }
}
function playerBack(i){
  const game=ONLINE.meta.game,st=game==='poker'?G:M,p=st.players[i];
  Object.assign(p,{away:false,human:true,remote:true});
  delete ONLINE.lastPriv[p.uid];
  if(game==='poker'){addLog(`${p.name} 回來了`,'sys');notify();}else{mlog(`${p.name} 回來了`,'sys');mjNotify();}
}
// a returning player with a new login proves the seat is theirs with the key saved on their device
async function hostReclaim(newUid,msg){
  const s=Number(msg.seat),seat=ONLINE.seats[s];if(!seat||!msg.key)return;
  let key=null;try{key=await ref(roomPath('keys/'+s)).get();}catch(_){}
  if(!key||key!==msg.key)return;
  const old=seat.uid;if(old===newUid||ONLINE.presence[old])return;
  try{await ref(roomPath('seats/'+s)).set({uid:newUid,name:seat.name});await ref(roomPath('members/'+newUid)).set(true);}catch(_){return;}
  const game=ONLINE.meta.game,st=game==='poker'?G:M;
  if(st&&st.online){
    const i=st.players.findIndex(p=>p.uid===old);
    if(i>=0){
      st.players[i].uid=newUid;delete ONLINE.seatOf[old];ONLINE.seatOf[newUid]=i;delete ONLINE.lastPriv[old];
      clearTimeout(ONLINE.goneT[old]);delete ONLINE.goneT[old];
      if(ONLINE.presence[newUid]&&st.players[i].away)playerBack(i);else hostPublishSoon();
    }
  }
}

// ---------- client: rebuild the table from what the host published, with my seat at the bottom
function rotateIdx(i,me,n){return i==null||i<0?i:(i-me+n)%n;}
function clientApply(){
  if(ONLINE.role!=='client'||!ONLINE.pub||!ONLINE.meta)return;
  if(!ONLINE.recT||Date.now()-ONLINE.recT>30000){ONLINE.recT=Date.now();saveRecord({});}
  let st;try{st=JSON.parse(ONLINE.pub.json);}catch(_){return;}
  const pv=ONLINE.priv&&ONLINE.priv.json?JSON.parse(ONLINE.priv.json):{};
  const me=st.players.findIndex(p=>p.uid===NET.uid);if(me<0)return;
  const n=st.players.length,r=i=>rotateIdx(i,me,n);
  const rot=a=>a.slice(me).concat(a.slice(0,me));
  if(ONLINE.meta.game==='poker'){
    if(pv.hole)st.players[me].hole=pv.hole;
    st.players=rot(st.players);st.players.forEach((p,i)=>{p.id=i;});
    ['dealer','sbI','bbI','toAct'].forEach(k=>{st[k]=r(st[k]);});
    st.online=true;st.mirror=true;st.hint=null;st.decisions=[];
    const key=st.handNo+'|'+st.street+'|'+st.currentBet+'|'+st.players[0].bet;
    if(G&&G.mirror&&st.toAct===0&&key===ONLINE.hintKey)st.hint=G.hint;
    if(!ONLINE.localG&&G&&!G.mirror&&!G.online)ONLINE.localG=G;
    G=st;
    if(VIEW!=='poker'&&VIEW!=='online')return;
    if(VIEW==='online')go('poker');
    recordFrame('poker');render();
    if(G.toAct===0&&!G.handOver&&key!==ONLINE.hintKey){ONLINE.hintKey=key;humanTurn();}
    if(G.over&&!ONLINE.lastOver){ONLINE.lastOver=true;setTimeout(showOver,900);}
    if(!G.over)ONLINE.lastOver=false;
    if(ONLINE.pendingHost){ONLINE.pendingHost=false;becomeHost(NET.uid,true);}
  }else{
    st.wall=new Array(st.wallLen||0).fill(0);
    st.players.forEach((p,i)=>{if(i===me)p.hand=pv.hand||[];else if(st.phase!=='end')p.hand=new Array(p.handCount||0).fill(-1);});
    st.drawn=pv.drawn!=null?pv.drawn:null;st.justDrawn=pv.justDrawn!=null?pv.justDrawn:null;
    if(st.claim){st.claim.opts=pv.claimOpts?{[me]:pv.claimOpts}:{};st.claim.dec=pv.claimDec?{[me]:pv.claimDec}:{};}
    st.players=rot(st.players);st.players.forEach((p,i)=>{p.id=i;p.melds.forEach(m=>{if(m.from!=null)m.from=r(m.from);});});
    ['dealer','startDealer','turn','nextDraw'].forEach(k=>{st[k]=r(st[k]);});
    if(st.turnsOf)st.turnsOf=rot(st.turnsOf);
    if(st.last)st.last.from=r(st.last.from);
    if(st.claim){st.claim.from=r(st.claim.from);const o={},d={};Object.keys(st.claim.opts).forEach(j=>{o[r(Number(j))]=st.claim.opts[j];});Object.keys(st.claim.dec).forEach(j=>{d[r(Number(j))]=st.claim.dec[j];});st.claim.opts=o;st.claim.dec=d;}
    if(st.result&&st.result.wins){st.result.payer=r(st.result.payer);st.result.wins.forEach(w=>{w.i=r(w.i);w.pays.forEach(x=>{x.j=r(x.j);});});}
    st.online=true;st.mirror=true;st.hint=null;st.decisions=[];
    const myTurn=st.phase==='turn'&&st.turn===0,myClaim=st.phase==='claim'&&st.claim&&st.claim.opts[0]&&!st.claim.dec[0];
    const key=st.handNo+'|'+st.turnsTaken+'|'+st.phase+'|'+(st.players[0].hand||[]).length+'|'+(st.claim?st.claim.k+'/'+st.claim.from:'');
    if(M&&M.mirror&&key===ONLINE.hintKey){st.hint=M.hint;st.sel=M.sel;}
    if(M&&M.mirror&&M.handNo===st.handNo&&M.resShown)st.resShown=true;
    if(!ONLINE.localM&&M&&!M.mirror&&!M.online)ONLINE.localM=M;
    M=st;
    if(VIEW!=='mj'&&VIEW!=='online')return;
    if(VIEW==='online')go('mj');
    recordFrame('mj');renderMj();
    if((myTurn||myClaim)&&key!==ONLINE.hintKey){ONLINE.hintKey=key;if(myTurn)mjHumanTurn();else mjHumanClaim();}
    if(M.over&&!ONLINE.lastOver){ONLINE.lastOver=true;}
    if(!M.over)ONLINE.lastOver=false;
    if(ONLINE.pendingHost){ONLINE.pendingHost=false;becomeHost(NET.uid,true);}
  }
}
function onlineSend(msg){if(!ONLINE.rid)return;ref(roomPath('inbox')).push({uid:NET.uid,m:JSON.stringify(msg),t:Date.now()});}
// UI actions are redirected to the host while this browser is a client
const _humanAct=humanAct;
humanAct=function(type,to){if(ONLINE.role==='client'&&G&&G.mirror){if(G.toAct!==0)return;onlineSend({g:'poker',a:'act',type,to});G.toAct=-1;render();return;}return _humanAct(type,to);};
const _startHand=startHand;
startHand=function(){if(G&&G.mirror)return;return _startHand();};
const _mjHumanDiscard=mjHumanDiscard;
mjHumanDiscard=function(k){if(M&&M.mirror){if(M.phase!=='turn'||M.turn!==0)return;onlineSend({g:'mj',a:'turn',type:'discard',k});M.phase='sent';M.sel=null;renderMj();return;}return _mjHumanDiscard(k);};
const _mjSelfWin=mjSelfWin,_mjAnKong=mjAnKong,_mjJiaGang=mjJiaGang;
mjSelfWin=function(i){if(M&&M.mirror){onlineSend({g:'mj',a:'turn',type:'tsumo'});M.phase='sent';renderMj();return;}return _mjSelfWin(i);};
mjAnKong=function(i,k){if(M&&M.mirror){onlineSend({g:'mj',a:'turn',type:'an',k});M.phase='sent';renderMj();return;}return _mjAnKong(i,k);};
mjJiaGang=function(i,k){if(M&&M.mirror){onlineSend({g:'mj',a:'turn',type:'jia',k});M.phase='sent';renderMj();return;}return _mjJiaGang(i,k);};
const _mjHumanClaim2=mjHumanClaim2;
mjHumanClaim2=function(type,start,seat){if(M&&M.mirror){if(!M.claim||M.claim.dec[0])return;onlineSend({g:'mj',a:'claim',type,start});M.claim.dec[0]={type,start};renderMj();return;}return _mjHumanClaim2(type,start,seat);};
const _mjStartHand=mjStartHand;
mjStartHand=function(){if(M&&M.mirror)return;return _mjStartHand();};
// host: publish after every change
const _notify=notify,_mjNotify=mjNotify;
notify=function(){_notify();if(G&&G.online)hostPublishSoon();};
mjNotify=function(){_mjNotify();if(M&&M.online)hostPublishSoon();};

// ---------- leaving
function onlineCleanup(){
  ['unsubs','csubs','hsubs'].forEach(dropSubs);
  [ONLINE.pubT,ONLINE.nextT,ONLINE.turnT,ONLINE.migT].forEach(t=>clearTimeout(t));clearInterval(ONLINE.startT);ONLINE.migT=null;ONLINE.pendingHost=false;
  Object.values(ONLINE.goneT).forEach(t=>clearTimeout(t));ONLINE.goneT={};
  if(G&&G.online){GEN++;G=ONLINE.localG||null;if(G)G.needResume=true;}
  if(M&&M.online){MGEN++;M=ONLINE.localM||null;if(M)M.needResume=true;}
  ONLINE.localG=ONLINE.localM=null;
  Object.assign(ONLINE,{role:null,rid:null,meta:null,seats:{},presence:{},pub:null,priv:null,seatOf:{},startAt:0,nextAt:0,nextKey:'',hintKey:''});
  $('#ov-over').hidden=true;$('#ov-mjres').hidden=true;
  updateOnlineChrome();
}
async function onlineLeave(){
  const rid=ONLINE.rid,role=ONLINE.role,m=ONLINE.meta;
  if(!rid){go('online');return;}
  clearRecord();
  try{
    if(role==='host'){
      await ref(roomPath('meta/status')).set('ended');
      if(m){await ref('codes/'+m.code).remove();if(m.public)await ref(`lobby/${m.game}/${rid}`).remove();}
      const r=ref(`rooms/${rid}`);setTimeout(()=>r.remove(),3000);
    }else{
      await ref(roomPath('presence/'+NET.uid)).remove();
      if(m&&m.status==='waiting'){const s=Object.keys(ONLINE.seats).find(k=>ONLINE.seats[k]&&ONLINE.seats[k].uid===NET.uid);if(s!=null)await ref(roomPath('seats/'+s)).remove();}
    }
  }catch(_){}
  onlineCleanup();ONLINE.msg='已離開房間。';go('online');
}
function onlineRestart(){
  if(ONLINE.role!=='host')return;
  const game=ONLINE.meta.game,st=game==='poker'?G:M,rules=JSON.parse(ONLINE.meta.rules);
  const players=st.players.map(p=>({name:p.name,human:p.human,remote:p.remote,away:p.away,uid:p.uid,level:p.level,style:p.style}));
  if(game==='poker')newSession({players,chips:rules.chips,blindUp:rules.blindUp});
  else{players.forEach(p=>{p.chips=rules.chips;});newMjSession({rules,players});}
}
function updateOnlineChrome(){
  const b=$('#btn-leave');if(b)b.hidden=!ONLINE.rid;
  const c=$('#btn-coach');if(c)c.hidden=onlineNow();
  const t=$('#tab-online');if(t)t.textContent=ONLINE.rid?'線上 ●':'線上';
}
// on start-up: go back to the room this device was in, if it is still running
async function onlineResume(){
  const r=loadRecord();if(!r||!r.rid)return;
  if(Date.now()-(r.t||0)>3*3600e3){clearRecord();return;}
  if(r.mode==='firebase'&&!firebaseConfigured())return;
  try{
    toast('正在回到上次的線上房間…',4000);
    await netInit(r.mode);ONLINE.mode=r.mode;
    const meta=await ref(`rooms/${r.rid}/meta`).get();
    if(!meta||meta.status==='ended'){clearRecord();toast('上次的線上房間已經結束了。');return;}
    const seat=await ref(`rooms/${r.rid}/seats/${r.seat}`).get();
    // the seat is still in use by another tab of this device: leave it alone
    if(seat&&seat.uid!==NET.uid&&await ref(`rooms/${r.rid}/presence/${seat.uid}`).get()){const t=$('#toast');if(t)t.hidden=true;return;}
    ONLINE.rid=r.rid;
    if(meta.host===NET.uid){
      let snap=null;try{snap=JSON.parse(localStorage.getItem(ON_SNAP)||'null');}catch(_){}
      await enterRoom(r.rid,'host',false,{resume:true,status:meta.status,snap});
      if(VIEW!=='poker'&&VIEW!=='mj')go('online');
    }else{
      await enterRoom(r.rid,'client',false,{resume:true});
      if(!seat||seat.uid!==NET.uid)onlineSend({a:'reclaim',seat:r.seat,key:r.key});
      go('online');
      toast('已回到線上房間。');
    }
  }catch(e){toast('無法回到上次的房間：'+(e&&e.message||e));ONLINE.rid=null;}
}
// ONLINE END
