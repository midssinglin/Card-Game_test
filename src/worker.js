// WORKER START
// Runs AI decisions and coach analysis off the main thread so taps and animations stay smooth.
// The engine code is embedded in the page as <script type="text/plain" id="engine-src"> and
// started as a Worker from a blob URL. Any failure falls back to computing on the main thread.
const AIW={w:null,ok:false,id:0,cb:{},fails:0};
(function(){
  try{
    const el=document.getElementById('engine-src');
    if(!el||typeof Worker==='undefined'||typeof Blob==='undefined')return;
    const pre="var SET={},VIEW='worker',REPLAY={on:false};function notify(){}function mjNotify(){}function humanTurn(){}function mjHumanTurn(){}function mjHumanClaim(){}function onSessionOver(){}function mjOnSessionOver(){}\n";
    const main="\nself.onmessage=function(e){var d=e.data,res;try{SET=d.set;"+
      "if(d.kind==='pokerAI'){G=d.state;res=aiDecide(G.players[d.args.i]);}"+
      "else if(d.kind==='pokerHint'){G=d.state;computeHint();res=G.hint;}"+
      "else if(d.kind==='mjAITurn'){M=d.state;res=mjAiTurnDecide(d.args.i);}"+
      "else if(d.kind==='mjAIClaims'){M=d.state;res={};d.args.seats.forEach(function(j){res[j]=mjAiClaim(j,M.claim.opts[j],M.claim.k);});}"+
      "else if(d.kind==='mjHint'){M=d.state;mjComputeHint();res=M.hint;}"+
      "self.postMessage({id:d.id,res:res});}catch(err){self.postMessage({id:d.id,err:String(err&&err.message||err)});}};";
    const url=URL.createObjectURL(new Blob([pre+el.textContent+main],{type:'text/javascript'}));
    AIW.w=new Worker(url);
    AIW.w.onmessage=e=>{const f=AIW.cb[e.data.id];delete AIW.cb[e.data.id];if(f)f(e.data);};
    AIW.w.onerror=e=>{AIW.ok=false;if(e&&e.preventDefault)e.preventDefault();Object.keys(AIW.cb).forEach(k=>{const f=AIW.cb[k];delete AIW.cb[k];f({err:'worker error'});});};
    AIW.ok=true;
  }catch(_){AIW.ok=false;}
})();
aiRun=function(kind,args,fallback,done){
  if(!AIW.ok){done(fallback());return;}
  const id=++AIW.id;let settled=false,t=null;
  const finish=d=>{
    if(settled)return;settled=true;if(t)clearTimeout(t);
    if(!d||d.err||d.res===undefined){if(++AIW.fails>=3)AIW.ok=false;done(fallback());}
    else done(d.res);
  };
  t=setTimeout(()=>{delete AIW.cb[id];finish(null);},6000);
  AIW.cb[id]=finish;
  const st=kind.startsWith('poker')?Object.assign({},G,{log:[],deck:[]}):Object.assign({},M,{log:[],hint:null,wcache:null});
  try{AIW.w.postMessage({id,kind,args,state:st,set:{mj:SET.mj,speed:SET.speed}});}catch(_){delete AIW.cb[id];finish(null);}
};
// WORKER END
