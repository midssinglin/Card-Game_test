// Copies the built site (../docs) into www/ for Capacitor. Run `python3 build.py` in the repo root first.
const fs=require('fs'),path=require('path');
const src=path.join(__dirname,'..','docs'),dst=path.join(__dirname,'www');
fs.rmSync(dst,{recursive:true,force:true});
fs.cpSync(src,dst,{recursive:true});
// the service worker is for the website only; app builds ship the files locally
fs.rmSync(path.join(dst,'sw.js'),{force:true});
console.log('copied',src,'->',dst);
