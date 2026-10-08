// LEARN DATA START
// Steps: {t:'read', html, show?} or {t:'quiz', gen:()=>({q, show, choices:[{label, show?}], answer, explain})}
// "show" is a visual: {cards:[...]} | {tiles:[...], last?} | {pairs:[{label, cards}]}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function mkQuiz(q,show,correct,wrongs,explain){
  const ch=shuf([correct,...wrongs.slice(0,3)]);
  return {q,show,choices:ch,answer:ch.indexOf(correct),explain};
}
function rand5(){const s=new Set();while(s.size<5)s.add(Math.floor(Math.random()*52));return [...s];}
function randHandOfCat(cat){
  if(cat===8){const su=Math.floor(Math.random()*4),hi=3+Math.floor(Math.random()*9);return [0,1,2,3,4].map(d=>{const r=hi-d;return su*13+(r<0?12:r);});}
  if(cat===7){const r=Math.floor(Math.random()*13);let k;do{k=Math.floor(Math.random()*13);}while(k===r);return [r,13+r,26+r,39+r,Math.floor(Math.random()*4)*13+k];}
  for(let n=0;n<200000;n++){const h=rand5();if((evalScore(h)>>20)===cat)return h;}
  return rand5();
}
function mjParse(s){const m={m:0,p:9,s:18},o=[];s.split(' ').forEach(g=>{const su=g.slice(-1);for(const ch of g.slice(0,-1))o.push(su==='z'?26+Number(ch):m[su]+Number(ch)-1);});return o;}
const pct=x=>Math.round(x*100)+'%';
function numWrongs(right,deltas,fmt){const out=[];for(const d of shuf(deltas)){const v=right+d;if(v>0&&v!==right&&!out.some(o=>o.v===v))out.push({v});if(out.length===3)break;}return out.map(o=>({label:fmt(o.v)}));}

const LESSONS={
poker:[
 {id:'p1',title:'牌型大小',goal:'認得 10 種牌型，判斷哪一手比較大',steps:[
  {t:'read',html:'<p>德州撲克比的是 <b>5 張牌組成的牌型</b>。由大到小共 10 種，最大是皇家同花順，最小是高牌。</p><p>牌型一樣時，再從最大的那張開始比點數。A 最大，2 最小；A 也可以當 1 組成 A-2-3-4-5 的順子。</p>',show:{rankTable:true}},
  {t:'quiz',gen:pkCompare},{t:'quiz',gen:pkCompare},{t:'quiz',gen:pkCompare}]},
 {id:'p2',title:'一手牌怎麼進行',goal:'知道四輪下注的順序與每輪能做的動作',steps:[
  {t:'read',html:'<ol class="steps"><li>按鈕位左邊兩家先放<b>小盲、大盲</b>。</li><li><b>翻牌前</b>：每人拿 2 張底牌，從大盲左邊開始行動。</li><li><b>翻牌</b>：桌上翻開 3 張公牌，再下注一輪。</li><li><b>轉牌</b>、<b>河牌</b>：各再翻 1 張，各下注一輪。</li><li><b>攤牌</b>：還沒棄牌的人，從 7 張中挑最好的 5 張比大小。</li></ol><p>輪到你時可以：棄牌、過牌（沒人下注時）、跟注、加注、全下。</p>'},
  {t:'quiz',gen:()=>mkQuiz('翻牌之後，桌上有幾張公牌？',null,{label:'3 張'},[{label:'2 張'},{label:'4 張'},{label:'5 張'}],'翻牌一次翻開 3 張，之後轉牌、河牌各再加 1 張，最後共 5 張。')},
  {t:'quiz',gen:()=>mkQuiz('前面有人下注 40，輪到你。你可以怎麼做？',null,{label:'跟注、加注或棄牌'},[{label:'過牌'},{label:'只能全下'},{label:'只能棄牌'}],'有人下注之後就不能過牌了：要嘛跟上 40、要嘛加更多、不然就棄牌。')},
  {t:'quiz',gen:pkBestOf7},{t:'quiz',gen:pkBestOf7}]},
 {id:'p3',title:'位置',goal:'理解為什麼越晚行動越有利',steps:[
  {t:'read',html:'<p>翻牌後的每一輪，都從按鈕位左邊的人先說話，<b>按鈕位最後行動</b>。</p><p>越晚行動，你看得到越多對手的動作，資訊越多、越好做決定。所以在前面的位置要玩得緊一點，只玩強牌；在按鈕位附近可以多玩一些中等牌。</p>'},
  {t:'quiz',gen:()=>mkQuiz('6 人桌，翻牌後誰最後行動？',null,{label:'按鈕位 D'},[{label:'小盲'},{label:'大盲'},{label:'按鈕位左邊第一家'}],'翻牌後從按鈕位左邊開始輪，按鈕位永遠最後說話。')},
  {t:'quiz',gen:()=>mkQuiz('同樣拿 K♣ 9♦ 這種中等牌，在哪個位置比較適合玩？',{cards:[50,33]},{label:'按鈕位'},[{label:'第一個行動的位置'},{label:'哪裡都一樣'}],'中等牌最怕後面的人加注。在按鈕位時，前面的人都已表態，風險小很多。')}]},
 {id:'p4',title:'底池賠率',goal:'用勝率判斷該不該跟注',steps:[
  {t:'read',html:'<p>跟注要不要划算，看<b>跟注所需勝率</b>：</p><p class="formula">跟注額 ÷（底池＋跟注額）</p><p>例如底池 100、對手再下注 50（底池變 150），你跟 50 去搶 200，需要 50 ÷ 200 = 25% 的勝率。你的勝率高於 25%，長期跟注就會賺。</p><p>教練面板的「跟注所需」就是這個數字。</p>'},
  {t:'quiz',gen:pkPotOdds},{t:'quiz',gen:pkPotOdds},
  {t:'read',html:'<p><b>改良張</b>是能讓你牌變好的牌。常見例子：同花聽牌（已有 4 張同花色）有 9 張，兩頭順子聽牌有 8 張。</p><p><b>4 與 2 法則</b>：翻牌時改良張 × 4 ≈ 到河牌中牌的機率；轉牌時 × 2。</p>',show:{cards:[25,22]}},
  {t:'quiz',gen:()=>mkQuiz('翻牌後你有同花聽牌（4 張紅心）。依 4 與 2 法則，到河牌湊成同花的機率大約是？',{cards:[25,22,14,17,46]},{label:'36%'},[{label:'18%'},{label:'50%'},{label:'9%'}],'同花聽牌有 9 張改良張，翻牌時 × 4 ≈ 36%（實際約 35%）。')}]},
 {id:'p5',title:'詐唬與下注大小',goal:'知道什麼時候詐唬、下多少',steps:[
  {t:'read',html:'<p><b>價值下注</b>：牌比對手好，下注讓他付錢跟。<b>詐唬</b>：牌不好，下注讓對手棄牌。</p><p>詐唬要成功，對手棄牌的比例必須夠高：</p><p class="formula">需要棄牌比例 ＝ 下注額 ÷（底池＋下注額）</p><p>對手越少、對手越會棄牌，詐唬越有機會。對「什麼都跟」的新手詐唬，通常只會白白送錢。</p>'},
  {t:'quiz',gen:()=>mkQuiz('底池 100，你下注 50 詐唬。對手至少要棄牌幾成，你才不虧？',null,{label:'約 33%'},[{label:'約 20%'},{label:'50%'},{label:'約 67%'}],'50 ÷（100＋50）≈ 33%。對手棄牌超過三分之一，這個詐唬長期就有賺。')},
  {t:'quiz',gen:()=>mkQuiz('下面哪個情況最適合詐唬？',null,{label:'只剩 1 個對手，而且他一直過牌'},[{label:'還有 4 個對手在牌局裡'},{label:'對手是什麼牌都跟的新手'}],'對手少、而且表現出牌不強時，詐唬成功率最高；人多或遇到跟注站，就少詐唬。')}]},
],
mj:[
 {id:'m1',title:'認識牌',goal:'認得 144 張牌與花牌的處理方式',steps:[
  {t:'read',html:'<p>台灣麻將共 144 張：</p><ul class="steps"><li><b>萬、筒、條</b>：各有 1 到 9，每種 4 張。</li><li><b>風牌</b>：東、南、西、北；<b>三元牌</b>：中、發、白。風牌和三元牌合稱字牌，每種 4 張。</li><li><b>花牌</b>：春夏秋冬、梅蘭竹菊各 1 張。</li></ul>',show:{tiles:[0,4,8,9,13,17,18,22,26,27,28,29,30,31,32,33,34,38]}},
  {t:'quiz',gen:mjNameTile},{t:'quiz',gen:mjNameTile},{t:'quiz',gen:mjNameTile},
  {t:'quiz',gen:()=>mkQuiz('摸到花牌時要怎麼做？',{tiles:[35]},{label:'亮在桌上，再從牌尾補一張'},[{label:'直接打出去'},{label:'留在手牌裡'}],'花牌不能組牌，摸到就亮出來並補牌。和座位相符的花（正花）還能加台。')}]},
 {id:'m2',title:'順子、刻子與眼',goal:'知道胡牌要湊成什麼形狀',steps:[
  {t:'read',html:'<ul class="steps"><li><b>順子</b>：同一花色連續三張，例如三四五萬。字牌不能組順子。</li><li><b>刻子</b>：三張一模一樣的牌，例如三張中。</li><li><b>眼</b>：一對相同的牌。</li></ul><p>台灣麻將胡牌要湊 <b>5 組順子或刻子，加 1 對眼</b>，總共 17 張。</p>',show:{tiles:[2,3,4,31,31,31,27,27]}},
  {t:'quiz',gen:mjSetType},{t:'quiz',gen:mjSetType},{t:'quiz',gen:mjSetType},
  {t:'quiz',gen:()=>mkQuiz('胡牌時，手牌加上吃碰出去的牌總共幾張（不算花與槓多的那張）？',null,{label:'17 張'},[{label:'14 張'},{label:'16 張'},{label:'18 張'}],'平常手上 16 張，胡牌那一張讓它變成 17 張：5 組 × 3 張＋1 對眼。')}]},
 {id:'m3',title:'吃、碰、槓',goal:'知道誰能吃碰、誰優先',steps:[
  {t:'read',html:'<ul class="steps"><li><b>吃</b>：只能吃<b>上家</b>（坐你左邊、在你前一手出牌的人）打的牌，湊成順子。</li><li><b>碰</b>：任何人打出你有一對的牌，都能碰成刻子。</li><li><b>槓</b>：手上有三張、別人打出第四張可以明槓；自己摸齊四張可以暗槓。槓完從牌尾補一張。</li><li>同時有人要：<b>胡 &gt; 碰／槓 &gt; 吃</b>。</li></ul><p>吃或碰之後，手牌就不是「門清」，會少掉門清與不求人的台。</p>'},
  {t:'quiz',gen:()=>mkQuiz('下家打出三萬，你手上有一二萬。你可以吃嗎？',{tiles:[0,1]},{label:'不行，只能吃上家打的牌'},[{label:'可以'},{label:'可以，但要先碰'}],'吃只限上家。下家、對家打的牌，你只能碰或胡。')},
  {t:'quiz',gen:()=>mkQuiz('上家打出五筒，你想吃，對家想碰。誰優先？',{tiles:[13]},{label:'對家碰'},[{label:'你吃'},{label:'看誰先按'}],'碰和槓優先於吃，只有胡牌比碰更優先。')},
  {t:'quiz',gen:()=>mkQuiz('吃或碰之後，你會失去哪個台的機會？',null,{label:'門清'},[{label:'自摸'},{label:'莊家'}],'門清是指沒有吃、碰、明槓。吃碰後仍然可以自摸，但不會有門清或不求人。')}]},
 {id:'m4',title:'聽牌',goal:'看得出自己在聽哪幾張',steps:[
  {t:'read',html:'<p><b>聽牌</b>：只差一張就能胡。<b>向聽數</b>：還差幾張有用的牌才會聽牌，「1 向聽」代表再進一張有用的牌就聽牌。</p><p>聽的牌種類越多、場上剩越多張，越容易胡。像四五條聽三條或六條，叫「兩面聽」；只聽一種牌叫「獨聽」，能多算台。</p>',show:{tiles:[21,22]}},
  {t:'quiz',gen:mjWaitQuiz},{t:'quiz',gen:mjWaitQuiz},
  {t:'quiz',gen:()=>mkQuiz('教練說你現在「1 向聽」，意思是？',null,{label:'再進一張有用的牌就聽牌'},[{label:'已經聽牌了'},{label:'差 1 張就胡牌'}],'1 向聽還沒聽牌；先進一張有用的牌變成聽牌，再來一張對的牌才會胡。')}]},
 {id:'m5',title:'胡牌與付錢',goal:'判斷能不能胡，以及誰要付',steps:[
  {t:'read',html:'<ul class="steps"><li><b>自摸</b>：自己摸到胡牌，<b>其他三家都要付</b>。</li><li><b>放槍</b>：胡別人打出的牌，只有<b>打出那張的人付</b>。</li><li>牌牆摸到留牌處還沒人胡，就是<b>流局</b>，莊家連莊、不用付錢。</li></ul>'},
  {t:'quiz',gen:mjCanWinQuiz},{t:'quiz',gen:mjCanWinQuiz},
  {t:'quiz',gen:()=>mkQuiz('你自摸胡牌，誰要付錢？',null,{label:'其他三家都付'},[{label:'只有上家'},{label:'只有莊家'}],'自摸由其他三家各付一份；放槍才只有打出那張的人付。')}]},
 {id:'m6',title:'算台',goal:'會看台數明細並算出籌碼',steps:[
  {t:'read',html:()=>{const R=SET.mj;return `<p>每一手的籌碼：</p><p class="formula">底 ${R.base} ＋ 台數 × ${R.perTai}</p><p>常見的台：莊家 ${R.tai.dealer}、自摸 ${R.tai.zimo}、門清 ${R.tai.menqing}、不求人 ${R.tai.buqiuren}、三元牌刻 ${R.tai.dragonPung}、碰碰胡 ${R.tai.pengpeng}、混一色 ${R.tai.hunyi}、清一色 ${R.tai.qingyi}。</p><p class="note">這一關的數字照你在首頁設定的台數表計算。</p>`;}},
  {t:'quiz',gen:()=>mjTaiQuiz(0)},{t:'quiz',gen:()=>mjTaiQuiz(1)},{t:'quiz',gen:()=>mjTaiQuiz(2)},
  {t:'quiz',gen:mjPayQuiz}]},
]};

// ---------- poker generators
function pkCompare(){
  const pairs=[[4,5],[5,6],[2,3],[3,4],[1,2],[6,7],[0,1]];
  let ca,cb;
  if(Math.random()<.25){ca=cb=pick([1,2,3,5]);}else{[ca,cb]=shuf(pick(pairs));}
  let a,b;do{a=randHandOfCat(ca);b=randHandOfCat(cb);}while(a.some(c=>b.includes(c)));
  const sa=evalScore(a),sb=evalScore(b),ans=sa>sb?'A 比較大':sb>sa?'B 比較大':'一樣大';
  const opts=['A 比較大','B 比較大','一樣大'];
  return {q:'哪一手比較大？',show:{pairs:[{label:'A',cards:a},{label:'B',cards:b}]},choices:opts.map(l=>({label:l})),answer:opts.indexOf(ans),
    explain:`A 是${handName(sa)}，B 是${handName(sb)}。${(sa>>20)===(sb>>20)?'牌型相同時，從最大的牌開始比點數。':''}`};
}
function pkBestOf7(){
  const s=new Set();while(s.size<7)s.add(Math.floor(Math.random()*52));const cs=[...s];
  const sc=evalScore(cs),cat=sc>>20;
  const others=[cat-2,cat-1,cat+1,cat+2,cat+3].filter(c=>c>=0&&c<=8&&c!==cat);
  return mkQuiz('前 2 張是你的底牌，後 5 張是公牌。你最好的牌型是？',{cards:cs},{label:CAT[cat]},shuf(others).map(c=>({label:CAT[c]})),`最好的 5 張組成${handName(sc)}。`);
}
function pkPotOdds(){
  const pot=pick([60,80,100,120,150,200,240,300]),bet=pick([20,30,40,50,60,80,100,150]);
  const potNow=pot+bet,req=bet/(potNow+bet);
  const r=Math.round(req*100);
  return mkQuiz(`底池原本 ${pot}，對手又下注 ${bet}。你要跟 ${bet}，至少需要多少勝率？`,null,{label:r+'%'},numWrongs(r,[-15,-10,-8,8,10,15,20],v=>v+'%'),
    `跟注 ${bet} ÷（底池 ${potNow}＋跟注 ${bet}）＝ ${bet} ÷ ${potNow+bet} ≈ ${r}%。`);
}
// ---------- mahjong generators
function mjNameTile(){
  const k=Math.floor(Math.random()*42);let wr;
  if(k<27){const n=k%9,s=(k/9)|0;wr=shuf([...[0,1,2].filter(x=>x!==s).map(x=>x*9+n),...[n-1,n+1].filter(x=>x>=0&&x<9).map(x=>s*9+x)]);}
  else if(k<34)wr=shuf([27,28,29,30,31,32,33].filter(x=>x!==k));
  else wr=shuf([34,35,36,37,38,39,40,41].filter(x=>x!==k));
  return mkQuiz('這張是什麼牌？',{tiles:[k]},{label:tName(k)},wr.map(x=>({label:tName(x)})),k>=34?'花牌，摸到要亮出來並補牌。':k>=27?'字牌，不能組順子，只能組刻子或當眼。':`${tName(k)}：${MJ_SUIT[(k/9)|0]}子的 ${k%9+1}。`);
}
function mjSetType(){
  const kind=pick(['seq','pung','none','none2']);let t;
  if(kind==='seq'){const s=Math.floor(Math.random()*3),n=Math.floor(Math.random()*7);t=[s*9+n,s*9+n+1,s*9+n+2];}
  else if(kind==='pung'){const k=Math.floor(Math.random()*34);t=[k,k,k];}
  else if(kind==='none'){t=pick([[27,28,29],[31,32,33]]);}
  else{const s=Math.floor(Math.random()*3),n=Math.floor(Math.random()*7);t=pick([[s*9+n,s*9+n+1,((s+1)%3)*9+n+2],[s*9+n,s*9+n+2,s*9+Math.min(8,n+4)]]);}
  const ans=kind==='seq'?'順子':kind==='pung'?'刻子':'都不是';
  const ex=kind==='seq'?'同花色連續三張，是順子。':kind==='pung'?'三張一模一樣，是刻子。':t[0]>=27?'字牌不能組順子，三張不同的字牌什麼都不是。':'不同花色或不連續，不能組成順子。';
  const opts=['順子','刻子','都不是'];
  return {q:'這三張是？',show:{tiles:t},choices:opts.map(l=>({label:l})),answer:opts.indexOf(ans),explain:ex};
}
const MJ_TENPAI=['123m 456m 789p 234s 11z 67s','234m 345p 678s 222z 456s 9s','111m 234p 567p 888s 55z 13m','234m 567m 345p 66p 78p 456s'];
function mjWaitQuiz(){
  const hand=mjParse(pick(MJ_TENPAI)).sort((a,b)=>a-b);
  const w=mjWaits(mjCounts(hand),0);
  const key=a=>a.slice().sort((x,y)=>x-y).join(',');
  const cands=[];
  const add=a=>{a=[...new Set(a)].filter(k=>k>=0&&k<34).sort((x,y)=>x-y);if(a.length&&key(a)!==key(w)&&!cands.some(c=>key(c)===key(a)))cands.push(a);};
  add(w.map(k=>k<27&&k%9<8?k+1:k));add(w.map(k=>k<27&&k%9>0?k-1:k));
  if(w.length>1)add(w.slice(1));add([...w,w[0]<27&&w[0]%9<7?w[0]+2:w[0]+1]);
  add([hand[3]]);add([hand[8],hand[9]]);
  const right={label:'',show:{tiles:w}};
  return mkQuiz('這手牌（16 張）在聽哪些牌？',{tiles:hand},right,shuf(cands).slice(0,3).map(c=>({label:'',show:{tiles:c}})),`這手聽 ${w.map(tName).join('、')}，共 ${w.length} 種。${w.length===1?'只聽一種就是獨聽。':'聽越多種越容易胡。'}`);
}
const MJ_WINQ=[['123m 456m 789m 234p 567s 99s',true],['123m 456m 789m 234p 568s 99s',false],['111z 222z 333z 444z 55z 123m',true],['12m 456m 789p 234s 567s 99s 3p',false],['222m 345m 666p 789p 11s 345s',true],['123m 345m 789p 234s 567s 9s 8s',false]];
function mjCanWinQuiz(){
  const [s,ok]=pick(MJ_WINQ);const t=mjParse(s);const last=t.pop();const hand=t.sort((a,b)=>a-b).concat([last]);
  const real=mjCanWin(mjCounts(hand),0);
  return mkQuiz('摸到最右邊那張後，這手牌能胡嗎？',{tiles:hand,last:true},{label:real?'能胡':'不能胡'},[{label:real?'不能胡':'能胡'}],real?'可以拆成 5 組順子或刻子＋1 對眼。':'有幾張湊不成順子或刻子，還不能胡。');
}
const MJ_TAIQ=[
  {desc:'你是南家，自摸。沒有吃碰。',hand:'234m 567m 345p 678p 234s 55s',win:'5s',self:true,melds:[]},
  {desc:'你是南家，胡別人打的二條。之前碰了中。',hand:'345m 678m 456p 789s 22s',win:'2s',self:false,melds:[{t:'pung',k:31,from:2}]},
  {desc:'你是南家，胡別人打的西。之前碰了東，現在是東風圈。',hand:'111m 555m 999m 222z 33z',win:'3z',self:false,melds:[{t:'pung',k:27,from:3}]},
];
function mjTaiQuiz(i){
  const S=MJ_TAIQ[i],hand=mjParse(S.hand),win=mjParse(S.win)[0];
  const r=mjScore({hand,melds:S.melds,flowers:[],win,self:S.self,seat:1,round:0,last:false,gangkai:false,rob:false,special:null},SET.mj);
  const conc=hand.slice();conc.splice(conc.indexOf(win),1);
  return mkQuiz(`${S.desc} 這手牌型共幾台？（莊家不在這手裡）`,{tiles:conc.sort((a,b)=>a-b).concat([win]),last:true,melds:S.melds},{label:r.tai+' 台'},numWrongs(r.tai,[-3,-2,-1,1,2,3,4],v=>v+' 台'),
    r.items.length?`${r.items.map(x=>`${x.name} ${x.tai}`).join('＋')} ＝ ${r.tai} 台。`:'沒有任何台型，只算底。');
}
function mjPayQuiz(){
  const R=SET.mj,t=pick([2,3,4,5,6,8]),v=R.base+t*R.perTai;
  return mkQuiz(`你胡了一手 ${t} 台的牌（放槍，莊家不在其中）。底 ${R.base}、每台 ${R.perTai}，放槍的人要付多少？`,null,{label:String(v)},numWrongs(v,[-R.perTai*2,-R.perTai,R.perTai,R.perTai*2,-R.base,R.base],x=>String(x)),`${R.base}＋${t} × ${R.perTai} ＝ ${v}。`);
}
// LEARN DATA END

// LEARN UI
let LCUR=null;
function learnDone(){try{return new Set(JSON.parse(localStorage.getItem('ptx-learn')||'[]'));}catch(_){return new Set();}}
function markDone(id){const s=learnDone();s.add(id);try{localStorage.setItem('ptx-learn',JSON.stringify([...s]));}catch(_){}LDONE.add(id);}
const LDONE=learnDone();
function showHTML(sh){
  if(!sh)return '';
  if(sh.rankTable)return `<div class="ranks">${EX.map(([n,d,cs])=>`<div class="rk"><div class="name">${n}<small>${d}</small></div><div class="cards">${cs.map(c=>cardHTML(c)).join('')}</div></div>`).join('')}</div>`;
  if(sh.pairs)return `<div class="lpairs">${sh.pairs.map(p=>`<div class="lpair"><span class="lpl">${p.label}</span><span class="lcards">${p.cards.map(c=>cardHTML(c)).join('')}</span></div>`).join('')}</div>`;
  if(sh.cards){const sp=sh.split!=null?sh.split:(sh.cards.length===7?2:-1);return `<div class="lcards">${sh.cards.map((c,i)=>cardHTML(c,i===sp?'gapl':'')).join('')}</div>`;}
  if(sh.tiles){
    const t=sh.tiles.map((k,i)=>mjTileHTML(k,sh.last&&i===sh.tiles.length-1?'hi lastgap':'')).join('');
    return `<div class="ltiles">${sh.melds&&sh.melds.length?mjMeldsHTML({melds:sh.melds},true):''}${t}</div>`;
  }
  return '';
}
function trackOf(id){return id[0]==='p'?'poker':'mj';}
function openLesson(id){
  const tr=trackOf(id),idx=LESSONS[tr].findIndex(l=>l.id===id);
  LCUR={tr,idx,L:LESSONS[tr][idx],step:0,q:null,picked:[],ok:false,first:0,total:0,done:false};
  prepStep();if(VIEW!=='learn')go('learn');else renderLearn();
}
function prepStep(){
  const L=LCUR.L,s=L.steps[LCUR.step];
  LCUR.q=s.t==='quiz'?s.gen():null;LCUR.picked=[];LCUR.ok=s.t!=='quiz';
}
function renderLearn(){
  const root=$('#learn-root');
  if(!LCUR){
    const track=(tr,name,cls)=>`<section class="track ${cls}"><h3>${name}</h3><ol class="lessons">${LESSONS[tr].map((l,i)=>`<li><button data-lesson="${l.id}"><span class="ln">${i+1}</span><span class="lt">${l.title}<small>${l.goal}</small></span><span class="ld ${LDONE.has(l.id)?'ok':''}">${LDONE.has(l.id)?'已完成':'開始'}</span></button></li>`).join('')}</ol></section>`;
    root.innerHTML=`<div class="hero-home"><p class="eyebrow">新手教學</p><h2 class="display small">從規則學起</h2><p class="lede">每關幾分鐘：先看說明，再答幾題。題目由遊戲的規則引擎出題，每次都不一樣；麻將算台題會照你設定的台數表。</p></div>
      <div class="tracks">${track('poker','德州撲克 · 5 關','poker')}${track('mj','台灣麻將 · 6 關','mj')}</div>`;
    return;
  }
  const L=LCUR.L,n=L.steps.length;
  const crumb=LCUR.daily?`每日練習 · ${todayStr()}`:`${LCUR.tr==='poker'?'德州撲克':'台灣麻將'} · 第 ${LCUR.idx+1} 關`;
  if(LCUR.done&&LCUR.daily){
    root.innerHTML=`<div class="lesson"><div class="lhead"><button class="ghost" data-go="home">回首頁</button><span class="lcrumb">${crumb}</span></div>
      <h2 class="ltitle">今日練習完成</h2><div class="lprog"><span style="width:100%"></span></div>
      <div class="lstep"><p class="big">${LCUR.first}／${LCUR.total}</p><p>${dailyStatus()}。明天會有新的 3 題。</p></div>
      <div class="lnav"><button class="btn" data-go="stats">看我的統計</button><button class="btn primary" data-go="home">回首頁</button></div></div>`;
    return;
  }
  if(LCUR.done){
    const next=LESSONS[LCUR.tr][LCUR.idx+1];
    root.innerHTML=`<div class="lesson"><div class="lhead"><button class="ghost" data-lback>所有關卡</button><span class="lcrumb">${crumb}</span></div>
      <h2 class="ltitle">完成：${L.title}</h2><div class="lprog"><span style="width:100%"></span></div>
      <div class="lstep"><p class="big">${LCUR.first}／${LCUR.total}</p><p>題目第一次就答對 ${LCUR.first} 題。${LCUR.first===LCUR.total?'全對，很棒！':'答錯的部分可以再挑戰一次，題目會換。'}</p></div>
      <div class="lnav"><button class="btn" data-lretry>再挑戰一次</button>${next?`<button class="btn" data-lesson="${next.id}">下一關：${next.title}</button>`:''}<button class="btn primary" data-go="${LCUR.tr}">去實戰</button></div></div>`;
    return;
  }
  const s=L.steps[LCUR.step];
  let body='';
  if(s.t==='read'){body=(typeof s.html==='function'?s.html():s.html)+showHTML(s.show);}
  else{
    const q=LCUR.q;
    body=`<p class="lq">${esc(q.q)}</p>${showHTML(q.show)}<div class="lchoices">${q.choices.map((c,i)=>{
      const st=LCUR.picked.includes(i)?(i===q.answer?'right':'wrong'):'';
      return `<button class="lch ${st}" data-ch="${i}" ${LCUR.ok||st?'disabled':''}>${c.label?esc(c.label):''}${c.show?showHTML(c.show):''}</button>`;}).join('')}</div>
      ${LCUR.picked.length?`<div class="advice tone-${LCUR.ok?'good':'bad'}"><span class="tag">${LCUR.ok?'答對了':'再想想'}</span><p>${LCUR.ok?esc(q.explain):'這個不對，再選一次。'}</p></div>`:''}`;
  }
  root.innerHTML=`<div class="lesson"><div class="lhead"><button class="ghost" data-lback>所有關卡</button><span class="lcrumb">${crumb} · ${LCUR.step+1}／${n}</span></div>
    <h2 class="ltitle">${L.title}</h2><div class="lprog"><span style="width:${Math.round(LCUR.step/n*100)}%"></span></div>
    <div class="lstep">${body}</div>
    <div class="lnav"><button class="btn" data-lprev ${LCUR.step===0?'disabled':''}>上一步</button><button class="btn primary" data-lnext ${LCUR.ok?'':'disabled'}>${LCUR.step===n-1?'完成這關':'下一步'}</button></div></div>`;
}
document.addEventListener('click',e=>{
  const ls=e.target.closest('[data-lesson]');if(ls){openLesson(ls.dataset.lesson);return;}
  if(e.target.closest('[data-daily]')){openDaily();return;}
  if(VIEW!=='learn')return;
  if(e.target.closest('[data-lback]')){LCUR=null;renderLearn();window.scrollTo(0,0);return;}
  if(!LCUR)return;
  if(e.target.closest('[data-lretry]')){openLesson(LESSONS[LCUR.tr][LCUR.idx].id);return;}
  const ch=e.target.closest('[data-ch]');
  if(ch&&!LCUR.ok){const i=Number(ch.dataset.ch);if(LCUR.picked.includes(i))return;
    if(!LCUR.picked.length){LCUR.total++;if(i===LCUR.q.answer)LCUR.first++;statQuiz(LCUR.daily?'daily':'tut',i===LCUR.q.answer);}
    LCUR.picked.push(i);if(i===LCUR.q.answer){LCUR.ok=true;sfx('right');}else sfx('wrong');renderLearn();return;}
  if(e.target.closest('[data-lprev]')&&LCUR.step>0){LCUR.step--;prepStep();renderLearn();return;}
  if(e.target.closest('[data-lnext]')&&LCUR.ok){
    const L=LCUR.L;
    if(LCUR.step===L.steps.length-1){LCUR.done=true;if(LCUR.daily)finishDaily();else markDone(L.id);sfx('win');}
    else{LCUR.step++;prepStep();}
    renderLearn();window.scrollTo(0,0);
  }
});

// ---------- sound (synthesised, starts only after a tap)
let AC=null;
function sfx(type){
  if(!SET.sound)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    const t0=AC.currentTime;
    const tone=(f,st,dur,vol,wave)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=wave||'sine';o.frequency.value=f;g.gain.setValueAtTime(0,t0+st);g.gain.linearRampToValueAtTime(vol,t0+st+.005);g.gain.exponentialRampToValueAtTime(.0001,t0+st+dur);o.connect(g);g.connect(AC.destination);o.start(t0+st);o.stop(t0+st+dur+.02);};
    const click=(st,dur,freq,vol)=>{const n=Math.floor(AC.sampleRate*dur),b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,4);const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();f.type='bandpass';f.frequency.value=freq;f.Q.value=1.2;g.gain.value=vol;s.buffer=b;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t0+st);};
    if(type==='tile'){click(0,.05,2600,.9);click(.012,.04,1400,.4);}
    else if(type==='card')click(0,.08,3800,.35);
    else if(type==='chip'){tone(2400,0,.06,.06,'triangle');tone(3100,.04,.06,.05,'triangle');}
    else if(type==='claim')tone(330,0,.18,.08,'triangle');
    else if(type==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,i*.08,.32,.07,'triangle'));}
    else if(type==='right')tone(880,0,.14,.06,'triangle');
    else if(type==='wrong')tone(196,0,.16,.07,'triangle');
  }catch(_){}
}
