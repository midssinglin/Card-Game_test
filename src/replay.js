// REPLAY START
// Every change during a hand is kept as a frame; after the hand you can step back through them.
const REPLAY={on:false,game:null,idx:0,reveal:true,saved:null,frames:{poker:[],mj:[]}};
function recordFrame(kind){
  if(REPLAY.on)return;
  const st=kind==='poker'?G:M;if(!st||!st.players)return;
  const fr=REPLAY.frames[kind];
  if(fr.length&&fr[0].handNo!==st.handNo)fr.length=0;
  const key=JSON.stringify(kind==='poker'?[st.log.length,st.toAct,st.street,!!st.hint,st.handOver]:[st.log.length,st.phase,st.turn,!!st.hint,st.claim?Object.keys(st.claim.dec).length:-1]);
  if(fr.length&&fr[fr.length-1].__key===key)return;
  const c=JSON.parse(JSON.stringify(Object.assign({},st,{resume:null,wcache:null,deck:kind==='poker'?[]:undefined})));
  c.__key=key;fr.push(c);if(fr.length>500)fr.shift();
}
function replayAvailable(kind){return REPLAY.frames[kind].length>1;}
function startReplay(kind){
  if(!replayAvailable(kind))return;
  REPLAY.on=true;REPLAY.game=kind;REPLAY.idx=0;
  REPLAY.saved=kind==='poker'?G:M;
  $('#ov-mjres').hidden=true;$('#ov-over').hidden=true;
  showFrame();
}
function showFrame(){
  const f=REPLAY.frames[REPLAY.game][REPLAY.idx];
  const c=JSON.parse(JSON.stringify(f));c.resShown=true;
  if(REPLAY.game==='poker'){G=c;render();}else{M=c;renderMj();}
}
function stopReplay(){
  if(!REPLAY.on)return;
  if(REPLAY.game==='poker'){G=REPLAY.saved;REPLAY.on=false;render();}
  else{M=REPLAY.saved;REPLAY.on=false;renderMj();}
  REPLAY.saved=null;
}
function replayControlsHTML(){
  const fr=REPLAY.frames[REPLAY.game],n=fr.length,f=fr[REPLAY.idx];
  const cap=f.log&&f.log[0]?f.log[0].t:'';
  return `<div class="replay">
    <div class="rp-cap"><b>重播 ${REPLAY.idx+1}／${n}</b><span>${esc(cap)}</span></div>
    <input type="range" id="rp-slider" min="0" max="${n-1}" value="${REPLAY.idx}" aria-label="重播進度">
    <div class="arow">
      <button class="btn" data-rp="first" aria-label="回到開頭">⏮</button>
      <button class="btn" data-rp="prev">上一步</button>
      <button class="btn primary" data-rp="next">下一步</button>
      <button class="btn" data-rp="last" aria-label="跳到最後">⏭</button>
    </div>
    <div class="arow">
      <label class="check"><input type="checkbox" id="rp-reveal" ${REPLAY.reveal?'checked':''}> 顯示所有人的牌</label>
      <button class="ghost" data-rp="exit">離開重播</button>
    </div></div>`;
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-replay]');if(s){startReplay(s.dataset.replay);return;}
  const b=e.target.closest('[data-rp]');if(!b||!REPLAY.on)return;
  const n=REPLAY.frames[REPLAY.game].length,a=b.dataset.rp;
  if(a==='exit'){stopReplay();return;}
  REPLAY.idx=a==='first'?0:a==='last'?n-1:a==='prev'?Math.max(0,REPLAY.idx-1):Math.min(n-1,REPLAY.idx+1);
  showFrame();
});
document.addEventListener('input',e=>{if(e.target.id==='rp-slider'&&REPLAY.on){REPLAY.idx=Number(e.target.value);showFrame();}});
document.addEventListener('change',e=>{if(e.target.id==='rp-reveal'){REPLAY.reveal=e.target.checked;if(REPLAY.on)showFrame();}});
// REPLAY END
