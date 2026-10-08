#!/usr/bin/env python3
"""Build 牌桌學堂 from src/.

  dist/artifact.html  one self-contained page (used for the Claude preview)
  docs/               the GitHub Pages site: index.html, PWA manifest, service worker, icons

Run:  python3 build.py
"""
import os, json, hashlib
R=os.path.dirname(os.path.abspath(__file__))
def rd(p): return open(os.path.join(R,p),encoding='utf-8').read()
def wr(p,s): 
    full=os.path.join(R,p); os.makedirs(os.path.dirname(full),exist_ok=True)
    open(full,'w',encoding='utf-8').write(s)
CSS=['src/base.css','src/extra.css']
JS=['src/poker_core.js','src/mj.js','src/ui.js','src/learn.js','src/stats.js','src/replay.js','src/worker.js','src/net.js','src/online.js','src/save.js']
FONTS='''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,600;6..96,700&family=IBM+Plex+Mono:wght@500;600&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700;900&display=swap">
'''
FIREBASE_VER='10.12.2'
def scripts():
    return '\n'.join(rd(j) for j in JS if os.path.exists(os.path.join(R,j)))
def engine_src():
    eng=rd('src/poker_core.js')+'\n'+rd('src/mj.js')
    assert '</script' not in eng
    return '<script type="text/plain" id="engine-src">'+eng+'</script>\n'
def body(target):
    css=''.join(rd(c) for c in CSS)
    return ('<style>'+css+'</style>\n'+rd('src/body.html')+'\n'+engine_src()+
            '<script>\nconst BUILD_TARGET='+json.dumps(target)+';\n'+scripts()+'\nboot();\n</script>\n')
# preview build: the artifact host adds its own document shell
wr('dist/artifact.html','<title>牌桌學堂</title>\n'+FONTS+body('artifact'))
# GitHub Pages build: full document with PWA bits and the Firebase SDK
shell='''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>牌桌學堂</title>
<meta name="description" content="和電腦或朋友對戰德州撲克、台灣16張麻將，教練即時提示勝率、聽牌與台數。籌碼免費，沒有現金價值。">
<meta name="theme-color" content="#0b1113">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
'''+FONTS+'''<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="https://cdn.jsdelivr.net/npm/firebase@'''+FIREBASE_VER+'''/firebase-app-compat.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/firebase@'''+FIREBASE_VER+'''/firebase-auth-compat.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/firebase@'''+FIREBASE_VER+'''/firebase-database-compat.js" defer></script>
<script src="firebase-config.js" defer></script>
</head>
<body>
'''
page=shell+body('pages').replace('<script>\nconst BUILD_TARGET','<script defer>\nconst BUILD_TARGET',0)
# run the app after the deferred SDK scripts: wrap the inline script in DOMContentLoaded
page=page.replace('<script>\nconst BUILD_TARGET="pages";','<script>\ndocument.addEventListener("DOMContentLoaded",function(){\nconst BUILD_TARGET="pages";')
page=page.replace('\nboot();\n</script>','\nboot();\n});\n</script>')+'<script>if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js");</script>\n</body>\n</html>\n'
wr('docs/index.html',page)
ver=hashlib.sha1(page.encode()).hexdigest()[:10]
wr('docs/manifest.webmanifest',json.dumps({
  "name":"牌桌學堂","short_name":"牌桌學堂","description":"德州撲克與台灣16張麻將練牌室，含教練提示與線上對戰。",
  "lang":"zh-Hant","start_url":"./","scope":"./","display":"standalone","orientation":"any",
  "background_color":"#0b1113","theme_color":"#0b1113","categories":["games","education"],
  "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},
           {"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},
           {"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},ensure_ascii=False,indent=2))
wr('docs/sw.js','''// 牌桌學堂 service worker: works offline after the first visit.
const CACHE='ptx-'''+ver+'''';
const CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','firebase-config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||/firebaseio|googleapis\\.com\\/identitytoolkit|securetoken|firebasedatabase/.test(u.host+u.pathname))return;
  const sameOrigin=u.origin===location.origin;
  if(sameOrigin&&(e.request.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/'))){
    // pages: network first so updates show up, cache when offline
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // everything else (icons, fonts, Firebase SDK): cache first
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return res;})));
});
''')
if not os.path.exists(os.path.join(R,'docs/firebase-config.js')):
    wr('docs/firebase-config.js','''// 填入你的 Firebase 專案設定後，線上對戰就會啟用。步驟見 README.md「線上對戰設定」。
// Paste your Firebase web app config here (see README). Leave it as null to keep online play off.
window.FIREBASE_CONFIG = null;
''')
wr('docs/.nojekyll','')
print('built dist/artifact.html and docs/ (cache',ver+')')
