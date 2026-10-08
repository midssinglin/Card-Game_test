// Daily practice: valid questions, same set for the same date.
const fs=require('fs');const d=__dirname+'/../src/';
const rd=f=>fs.readFileSync(d+f,'utf8');
const pc=rd('poker_core.js'),mj=rd('mj.js'),ln=rd('learn.js'),st=rd('stats.js');
const data=ln.split('// LEARN DATA START')[1].split('// LEARN DATA END')[0];
const stats=st.split('// STATS START')[1].split('// STATS END')[0];
var document={addEventListener(){}};var localStorage={_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v}};
eval(pc.split('// GAME START')[0]+pc.split('// GAME START')[1].split('// GAME END')[0]+mj.split('// MJ GAME START')[0]+`
var SET={mj:JSON.parse(JSON.stringify(MJ_RULE_DEFAULT)),poker:{},speed:'fast'};var REPLAY={on:false};var LDONE=new Set();
`+data+stats+`
let bad=0,same=0;
const realToday=todayStr;
for(let i=0;i<60;i++){
  const day=new Date(2026,9,1+i);
  todayStr=()=>realToday(day);
  DAILY_CACHE=null;const a=JSON.stringify(dailyQuestions());
  DAILY_CACHE=null;const b=JSON.stringify(dailyQuestions());
  if(a===b)same++;
  for(const q of JSON.parse(a)){
    const keys=q.choices.map(c=>c.label+'|'+JSON.stringify(c.show||null));
    if(q.answer<0||q.answer>=q.choices.length||new Set(keys).size!==keys.length)bad++;
  }
}
console.log('days',60,'deterministic',same,'invalid questions',bad);
if(bad||same!==60)process.exit(1);
`);
