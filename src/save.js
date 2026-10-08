// SAVE START
// Games in progress are kept in this browser so a closed tab can pick up where it left off.
const SAVE_KEYS={poker:'ptx-save-poker',mj:'ptx-save-mj'};
function saveGame(kind){
  const st=kind==='poker'?G:M;
  if(!st||st.online||REPLAY.on)return;
  try{
    if(st.over){localStorage.removeItem(SAVE_KEYS[kind]);return;}
    const copy=Object.assign({},st,{resume:null,ff:false,needResume:false});
    if(kind==='mj'){copy.hint=null;copy.wcache=null;}
    localStorage.setItem(SAVE_KEYS[kind],JSON.stringify(copy));
  }catch(_){}
}
function clearSave(kind){try{localStorage.removeItem(SAVE_KEYS[kind]);}catch(_){}}
function loadGame(kind){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEYS[kind])||'null');
    if(!s||s.over||!Array.isArray(s.players))return null;
    s.needResume=true;s.resume=null;s.ff=false;
    return s;
  }catch(_){return null;}
}
function pokerResume(){
  if(G.over||G.handOver){render();return;}
  if(G.toAct>=0)schedule();else{notify();later(endRound,1);}
}
function mjResume(){
  if(M.over||M.phase==='end'){renderMj();return;}
  if(M.phase==='turn')mjTurn();
  else if(M.phase==='between'){mjNotify();mjLater(()=>mjNextDraw(M.nextDraw),.5);}
  else if(M.phase==='claim'&&M.claim){if(M.claim.opts[0]&&!M.claim.dec[0])mjHumanClaim();else{mjNotify();mjLater(mjResolveClaims,.5);}}
  else mjStartHand();
}
function boot(){
  G=loadGame('poker');M=loadGame('mj');
  syncCoachBtn();
  go(location.hash==='#learn'?'learn':'home');
  window.addEventListener('pagehide',()=>{saveGame('poker');saveGame('mj');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){saveGame('poker');saveGame('mj');}});
}
// SAVE END
