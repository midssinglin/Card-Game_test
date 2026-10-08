// NET START
// A small realtime-database interface with two backends:
//   firebase  Firebase Realtime Database (anonymous sign-in), for real online play
//   local     same browser, separate tabs (BroadcastChannel + localStorage), for testing without Firebase
// Both expose ref(path) with: set update remove push get on onAdd claim onDisconnectRemove onDisconnectSet cancelDisconnect
const NET={backend:null,uid:null,ready:false,db:null};
function firebaseConfigured(){return !!(window.FIREBASE_CONFIG&&window.firebase&&window.firebase.initializeApp);}
async function netInit(mode){
  if(NET.ready&&NET.backend===mode)return;
  if(mode==='firebase'){
    if(!firebaseConfigured())throw new Error('還沒有填入 Firebase 設定（見 README「線上對戰設定」）。');
    if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
    // each browser tab is its own player: keep the anonymous login per tab
    try{await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);}catch(_){}
    const cred=await firebase.auth().signInAnonymously();
    NET.uid=cred.user.uid;NET.db=firebase.database();
  }else{
    LocalDB.init();
    let id=null;try{id=sessionStorage.getItem('ptx-local-uid');}catch(_){}
    if(!id){id='L'+Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('ptx-local-uid',id);}catch(_){}}
    NET.uid=id;
  }
  NET.backend=mode;NET.ready=true;
}
function ref(path){return NET.backend==='firebase'?fbRef(path):LocalDB.ref(path);}
function fbRef(path){
  const r=NET.db.ref(path);
  return {
    set:v=>r.set(v),update:v=>r.update(v),remove:()=>r.remove(),
    push:v=>{const n=r.push();return n.set(v).then(()=>n.key);},
    get:()=>r.once('value').then(s=>s.val()),
    on:cb=>{const h=s=>cb(s.val());r.on('value',h);return ()=>r.off('value',h);},
    onAdd:cb=>{const h=s=>cb(s.key,s.val());r.on('child_added',h);return ()=>r.off('child_added',h);},
    claim:v=>r.transaction(cur=>cur===null?v:undefined).then(res=>res.committed),
    onDisconnectRemove:()=>r.onDisconnect().remove(),
    onDisconnectSet:v=>r.onDisconnect().set(v),
    cancelDisconnect:()=>r.onDisconnect().cancel()
  };
}
const LocalDB={
  key:'ptx-localdb',ch:null,subs:[],dis:[],pending:false,inited:false,
  init(){
    if(this.inited)return;this.inited=true;
    try{this.ch=new BroadcastChannel('ptx-localdb');this.ch.onmessage=()=>this.queue();}catch(_){}
    window.addEventListener('storage',e=>{if(e.key===this.key)this.queue();});
    window.addEventListener('pagehide',()=>this.runDisconnect());
  },
  parts(p){return p.split('/').filter(Boolean);},
  load(){try{return JSON.parse(localStorage.getItem(this.key)||'{}')||{};}catch(_){return {};}},
  read(path){let o=this.load();for(const k of this.parts(path)){if(o==null||typeof o!=='object')return null;o=o[k];}return o===undefined?null:o;},
  write(path,v){
    const t=this.load(),ks=this.parts(path);let o=t;
    for(let i=0;i<ks.length-1;i++){if(o[ks[i]]==null||typeof o[ks[i]]!=='object')o[ks[i]]={};o=o[ks[i]];}
    if(v===null||v===undefined)delete o[ks[ks.length-1]];else o[ks[ks.length-1]]=JSON.parse(JSON.stringify(v));
    try{localStorage.setItem(this.key,JSON.stringify(t));}catch(_){}
    try{this.ch&&this.ch.postMessage(1);}catch(_){}
    this.queue();
  },
  queue(){if(this.pending)return;this.pending=true;setTimeout(()=>{this.pending=false;this.subs.slice().forEach(f=>f());},0);},
  runDisconnect(){this.dis.forEach(([p,v])=>this.write(p,v));this.dis=[];},
  ref(path){
    const S=this;
    return {
      set:v=>{S.write(path,v);return Promise.resolve();},
      update:v=>{for(const k in v)S.write(path+'/'+k,v[k]);return Promise.resolve();},
      remove:()=>{S.write(path,null);return Promise.resolve();},
      push:v=>{const k=Date.now().toString(36)+Math.random().toString(36).slice(2,7);S.write(path+'/'+k,v);return Promise.resolve(k);},
      get:()=>Promise.resolve(S.read(path)),
      on:cb=>{let last;const f=()=>{const v=S.read(path),s=JSON.stringify(v);if(s!==last){last=s;cb(v);}};S.subs.push(f);setTimeout(f,0);return ()=>{S.subs=S.subs.filter(x=>x!==f);};},
      onAdd:cb=>{const seen=new Set();const f=()=>{const v=S.read(path)||{};Object.keys(v).sort().forEach(k=>{if(!seen.has(k)){seen.add(k);cb(k,v[k]);}});};S.subs.push(f);setTimeout(f,0);return ()=>{S.subs=S.subs.filter(x=>x!==f);};},
      claim:v=>{if(S.read(path)!=null)return Promise.resolve(false);S.write(path,v);return Promise.resolve(true);},
      onDisconnectRemove:()=>{S.dis.push([path,null]);return Promise.resolve();},
      onDisconnectSet:v=>{S.dis.push([path,v]);return Promise.resolve();},
      cancelDisconnect:()=>{S.dis=S.dis.filter(d=>d[0]!==path);return Promise.resolve();}
    };
  }
};
// NET END
