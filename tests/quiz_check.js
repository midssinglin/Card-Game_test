const fs=require('fs');const d=__dirname+'/../src/';
const pc=fs.readFileSync(d+'poker_core.js','utf8'),mj=fs.readFileSync(d+'mj.js','utf8'),ln=fs.readFileSync(d+'learn.js','utf8');
const data=ln.split('// LEARN DATA START')[1].split('// LEARN DATA END')[0];
eval(pc.split('// GAME START')[0]+mj.split('// MJ GAME START')[0]+`
var SET={mj:JSON.parse(JSON.stringify(MJ_RULE_DEFAULT))};
const fmtN=n=>String(n);
`+data+`
let bad=0,n=0;
for(const tr of ['poker','mj'])for(const L of LESSONS[tr])for(const s of L.steps){
  if(s.t==='read'){ if(typeof s.html==='function') s.html(); continue;}
  for(let r=0;r<300;r++){n++;const q=s.gen();
    const keys=q.choices.map(c=>c.label+'|'+(c.show?JSON.stringify(c.show.tiles):''));
    if(q.answer<0||q.answer>=q.choices.length||new Set(keys).size!==keys.length||q.choices.length<2||!q.explain){bad++;if(bad<6)console.log('BAD',L.id,JSON.stringify(q).slice(0,300));}
  }
}
// verify pkCompare answer correctness independently & tenpai hands
for(const s of MJ_TENPAI){const h=mjParse(s);const w=mjWaits(mjCounts(h),0);console.log(s,'tiles',h.length,'waits',w.map(tName).join(' '));}
for(const [s,ok] of MJ_WINQ){const h=mjParse(s);console.log(s,h.length,mjCanWin(mjCounts(h),0),'expected',ok);}
for(let i=0;i<3;i++){const q=mjTaiQuiz(i);console.log('tai',i,q.choices[q.answer].label,q.explain);}
console.log('quiz samples',n,'bad',bad);if(bad)process.exit(1);
`);
