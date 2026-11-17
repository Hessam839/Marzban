const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'script exists');new vm.Script(script);
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:id==='bots'?'8':'',classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this[type]=fn},getBoundingClientRect(){return {left:0,top:0,width:640,height:640}},getContext(){return new Proxy({createLinearGradient(){return {addColorStop(){}}}},{get:(target,key)=>target[key]||(()=>{})})}});return elements.get(id)}
const globalHandlers={};
const context=vm.createContext({addEventListener(t,f){globalHandlers[t]=f},document:{getElementById:element},requestAnimationFrame(){},getComputedStyle(){return {borderLeftWidth:'0',borderTopWidth:'0',borderRightWidth:'0',borderBottomWidth:'0'}},Math,console});
// Test-only event hooks: count actual movement and combat deaths, never population deltas.
let combatEvents=null;
context.traceCombat=event=>{if(combatEvents)combatEvents.push(event)};
let tracedScript=script.replace(/\r\n/g,'\n');
for(const [from,to,count] of [
 ['v.hp--;','v.hp--;traceCombat({type:"hit",attacker:u.p,defender:v.p,killed:v.hp<=0});',2],
 ['const c=at(x,y);\n  if(c.owner!==u.p){','const c=at(x,y),previousOwner=c.owner;\n  if(c.owner!==u.p){',1],
 ['  u.x=x;u.y=y;','if(previousOwner>=0&&previousOwner!==u.p)traceCombat({type:"entry",attacker:u.p,defender:previousOwner,x,y});u.x=x;u.y=y;',1]
]){
 assert.equal(tracedScript.split(from).length-1,count,'combat hook matches source');
 tracedScript=tracedScript.split(from).join(to);
}
vm.runInContext(tracedScript,context);
assert.equal(vm.runInContext('players.length',context),9);
assert.equal(vm.runInContext('units.filter(u=>u.p===0).length',context),3);
assert.equal(vm.runInContext("at(6,6).building",context),'castle');
vm.runInContext('players.slice(1).forEach(p=>p.alive=false);units=units.filter(u=>u.p===0);for(let i=0;i<60;i++)tick()',context);
assert.equal(vm.runInContext('units.filter(u=>u.p===0).length',context),6);
assert.ok(vm.runInContext('players[0].gold',context)>27.99);
const owned=vm.runInContext('cells.filter(c=>c.owner===0).length',context);
assert.ok(owned>21,'territory expands');
vm.runInContext('players[0].gold=24',context);
element('market').click();element('board').click({clientX:6*16+8,clientY:7*16+8});
assert.equal(vm.runInContext("at(6,7).building",context),'market');
assert.equal(vm.runInContext('players[0].gold',context),12);
vm.runInContext('players[1].alive=true;at(8,7).owner=1',context);
element('board').click({clientX:8*16+8,clientY:7*16+8});
assert.equal(vm.runInContext('players[0].target',context),1);
vm.runInContext('players[0].target=-1;at(30,30).owner=1',context);
element('board').click({clientX:30*16+8,clientY:30*16+8});
assert.equal(vm.runInContext('players[0].target',context),1,'click on far cell of bordering enemy starts attack');
vm.runInContext('players[1].alive=true;removePlayer(1,0)',context);
assert.equal(vm.runInContext('players[1].alive',context),false);
assert.equal(vm.runInContext('players[0].target',context),-1);
vm.runInContext('start()',context);
vm.runInContext('players[0].target=2',context);
assert.equal(vm.runInContext('players[0].target',context),2);
vm.runInContext('removePlayer(2,0)',context);
assert.equal(vm.runInContext('players[0].target',context),-1,'target cleared when target player eliminated');
vm.runInContext('start()',context);
assert.equal(vm.runInContext('units.filter(u=>u.p===0).length',context),3);
element('bots').value='2';
vm.runInContext('start();players[0].target=1;units=units.filter(u=>u.p===0);removePlayer(1,2)',context);
const before=vm.runInContext('cells.filter(c=>c.owner===0).length',context);
vm.runInContext('for(let i=0;i<40;i++)tick()',context);
assert.ok(vm.runInContext('cells.filter(c=>c.owner===0).length',context)>before,'units resume free expansion after target dies');
vm.runInContext("start();players.slice(2).forEach(p=>p.alive=false);units=units.filter(u=>u.p===0);cells.forEach(c=>{if(c.owner===1){c.owner=-1;c.building=''}});for(let x=9;x<16;x++)for(let y=3;y<10;y++)at(x,y).owner=1;players[1].castle={x:13,y:6};at(13,6).building='castle';for(let x=4;x<=8;x++)for(let y=4;y<=8;y++)at(x,y).owner=0;for(let i=0;i<15;i++)spawn(players[0],1);players[0].target=1;for(let i=0;i<60;i++)tick()",context);
assert.equal(vm.runInContext('players[1].alive',context),false,'soldiers attack target and capture its castle');
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=units.filter(u=>u.p===0);players[0].gold=0;players[0].production=59;tick()',context);
assert.equal(vm.runInContext('units.filter(u=>u.p===0).length',context),6,'castle soldiers are free');
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=[];players[0].gold=0;players[0].production=0;let n=0;cells.forEach((c,k)=>{if(c.owner===0&&!c.building&&n<10){c.building="barracks";n++}});for(let i=1;i<=10;i++)tick()',context);
assert.equal(vm.runInContext('units.length',context),2,'10 ready barracks but only 5 gold of income: 2 soldiers (2 gold each)');
assert.equal(vm.runInContext('players[0].gold',context),1,'5 gold - 2 soldiers x 2 gold = 1');
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=[];players[0].gold=100;players[0].production=0;cells.forEach(c=>{c.building=""});at(6,7).building="barracks";for(let i=1;i<=10;i++)tick()',context);
assert.equal(vm.runInContext('units.length',context),1,'funded barracks produces after 10s');
assert.equal(vm.runInContext('players[0].gold',context),100+5-2,'one soldier cost 2 gold');
// No gold: barracks waits (no soldier, no negative gold), then produces as soon as gold arrives.
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=[];players[0].production=0;cells.forEach(c=>{c.building=""});at(6,7).building="barracks";players[0].gold=0;for(let i=0;i<9;i++){players[0].gold=0;tick()}players[0].gold=0;tick();',context);
assert.equal(vm.runInContext('units.length',context),0,'no gold -> no barracks soldier');
assert.equal(vm.runInContext('players[0].gold>=0',context),true,'gold never negative');
vm.runInContext('players[0].gold=2;tick()',context);
assert.equal(vm.runInContext('units.length',context),1,'barracks fires right after gold arrives');
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=[];spawn(players[0],149);players[0].production=59;tick()',context);
assert.equal(vm.runInContext('units.length',context),152,'no cap: castle batch passes 150');
assert.equal(vm.runInContext("typeof train",context),'undefined','no gold->soldier purchase exists');
vm.runInContext("start();players.slice(1).forEach(p=>p.alive=false);units=[];cells.forEach(c=>{c.owner=0;c.building=''});spawn(players[0],1);units[0].x=5;units[0].y=5;units[0].px=1;units[0].py=1",context);
vm.runInContext('tick()',context);
assert.equal(vm.runInContext('units[0].px===units[0].x&&units[0].py===units[0].y',context),true,'unit that did not move has no stale slide');
vm.runInContext("start();players.slice(1).forEach(p=>p.alive=false);units=[];players[0].production=0;at(6,7).building='barracks';at(7,7).building='barracks';for(let i=0;i<4;i++)tick();at(8,7).building='barracks';at(8,7).owner=0;at(7,7).owner=0;at(6,7).owner=0",context);
const per=[];for(let i=0;i<10;i++){vm.runInContext('tick()',context);per.push(vm.runInContext('units.length',context))}
assert.equal(per[4],0,'no soldiers before the first 10s');
assert.equal(per[5],2,'two early barracks fire together at their own 10s');
assert.equal(per[8],2,'late barracks has not fired yet');
assert.equal(per[9],3,'late barracks fires 10s after its own build, not on the shared clock');
element('bots').value='3';
vm.runInContext("start();units=[];players[0].production=0;cells.forEach(c=>{c.building=''});at(6,7).owner=0;at(6,7).building='barracks';at(33,34).owner=3;at(33,34).building='barracks';for(let i=0;i<10;i++)tick();",context);
assert.equal(vm.runInContext('units.filter(u=>u.p===0).length',context)>=1,true,'human barracks produces while other players are alive');
assert.equal(vm.runInContext('units.filter(u=>u.p===3).length',context)>=1,true,'last player barracks also produces');
// Bot economy, each bot ALONE (no combat, so lost buildings are never mistaken for unbuilt ones). Isolated result is deterministic: 15 barracks, 8 markets at 120s.
for(const id of [1,2,3]){vm.runInContext(`start();players.forEach((p,i)=>{if(i!==${id})p.alive=false});units=units.filter(u=>u.p===${id});for(let i=0;i<120;i++)tick()`,context);
 assert.equal(vm.runInContext(`players[${id}].alive`,context),true,'bot '+id+' alive alone');
 const nb=vm.runInContext(`cells.filter(c=>c.owner===${id}&&c.building==='barracks').length`,context),nm=vm.runInContext(`cells.filter(c=>c.owner===${id}&&c.building==='market').length`,context);
 assert.equal(nb>=14,true,'bot '+id+' builds barracks alone: '+nb);assert.equal(nm>=8,true,'bot '+id+' builds markets alone: '+nm)}
vm.runInContext('start();players.slice(1).forEach(p=>p.alive=false);units=[];spawn(players[0],149);players[0].production=59;players[0].gold=10;tick()',context);
assert.equal(vm.runInContext('units.length',context),152,'no cap: castle batch of 3 not truncated at 149');
// Fairness under gold shortage: 10 barracks, income 0.5/s, 2 gold/soldier -> each barracks must get its share (no starvation by cell order).
vm.runInContext("start();players.slice(1).forEach(p=>p.alive=false);units=[];cells.forEach(c=>{c.building=''});players[0].production=-1e9;players[0].gold=0;fired=new Map();const o=spawn;spawn=function(p,n,x,y){if(p.id===0)fired.set(x+','+y,(fired.get(x+','+y)||0)+n);return o(p,n,x,y)};let nn=0;cells.forEach((c,k)=>{if(c.owner===0&&!c.building&&nn<10){c.building='barracks';nn++}});for(let i=0;i<400;i++)tick()",context);
const counts=JSON.parse(vm.runInContext('JSON.stringify([...fired.values()])',context));
assert.equal(counts.length,10,'every barracks produced at least once under shortage');
assert.equal(Math.max(...counts)-Math.min(...counts)<=2,true,'shortage is shared evenly: '+counts);
// Ranking box: sorted by territory then soldiers, dead players last, player row marked.
vm.runInContext("start();players.forEach((p,i)=>{p.alive=i<3});cells.forEach(c=>{c.owner=-1;c.building=''});units=[];for(let x=0;x<5;x++)at(x,0).owner=0;for(let x=0;x<9;x++)at(x,1).owner=1;for(let x=0;x<7;x++)at(x,2).owner=2;for(let x=0;x<20;x++)at(x,3).owner=3;rankAt=-1;updateRank()",context);
const rankHtml=element('rank').innerHTML;
const order=[...rankHtml.matchAll(/<tr class=\"(me)? ?(dead)?\"><td>(\d)<\/td><td class=\"n\"><span[^>]*><\/span> ([^<]*)<\/td>/g)].map(m=>m[4].trim()+(m[2]?'*':''));
assert.deepEqual(order,['بات 1','بات 2','شما','بات 3*'],'rank: alive by territory desc, dead last: '+order);
// Passive defender is not a free kill: unit adjacent to an enemy hits back even when its owner is not attacking.
vm.runInContext("start();players.forEach((p,i)=>{if(i>1)p.alive=false});units=[];cells.forEach(c=>{c.owner=-1;c.building=''});for(let x=0;x<20;x++)for(let y=0;y<40;y++)at(x,y).owner=0;for(let x=20;x<40;x++)for(let y=0;y<40;y++)at(x,y).owner=1;players[0].production=-1e9;players[1].production=-1e9;for(let i=0;i<40;i++){spawn(players[0],1,16,20);spawn(players[1],1,23,20)}players[0].target=-1;players[1].target=0;for(let t=0;t<30&&players[0].alive;t++){tick();if(players[1].target<0)players[1].target=0}",context);
const lossA=40-vm.runInContext('units.filter(u=>u.p===0).length',context),lossB=40-vm.runInContext('units.filter(u=>u.p===1).length',context);
assert.equal(lossB>=10,true,'passive side kills attackers (hits back): attacker losses '+lossB+' vs passive losses '+lossA);
element('bots').value='2';
// Per-enemy guard coverage (guard role only), idle / while attacking another bot / after a new front appears.
const cover="(e=>{const bs=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(at(x,y).owner===0&&neighbors(x,y).some(([a,b])=>at(a,b).owner===e))bs.push([x,y]);return units.filter(u=>u.p===0&&u.guard&&bs.some(([x,y])=>Math.abs(x-u.x)+Math.abs(y-u.y)<=2)).length})";
const setup="start();players.forEach((p,i)=>{p.alive=i<3;p.target=-1});units=[];cells.forEach(c=>{c.owner=-1;c.building=''});for(let x=4;x<=12;x++)for(let y=4;y<=12;y++)at(x,y).owner=0;for(let x=13;x<=20;x++)for(let y=4;y<=12;y++)at(x,y).owner=1;for(let x=4;x<=12;x++)for(let y=13;y<=20;y++)at(x,y).owner=2;for(let i=0;i<100;i++)spawn(players[0],1);";
const run="for(let i=0;i<30;i++){tick();units=units.filter(u=>u.p===0);players[1].target=players[2].target=-1}";
for(const [name,pre,mid] of [['idle','',''],['attacking bot 1','players[0].target=1;',''],['new front','for(let x=4;x<=12;x++)for(let y=13;y<=20;y++)at(x,y).owner=-1;','for(let x=4;x<=12;x++)for(let y=13;y<=20;y++)at(x,y).owner=2;']]){
 vm.runInContext(setup+pre+run+mid+(mid?run:''),context);
 for(const e of [1,2])if(vm.runInContext(`cells.filter(c=>c.owner===${e}).length`,context)>=10)assert.ok(vm.runInContext(cover+'('+e+')',context)>=3,`${name}: border with bot ${e} has guards`);
 if(name==='attacking bot 1')assert.ok(vm.runInContext('players[2].alive',context),'bot 2 survives');
}
element('bots').value='1';
vm.runInContext('start();for(let i=0;i<180;i++)tick()',context);
assert.ok(vm.runInContext('cells.filter(c=>c.owner===1).length',context)>21,'bot expands instead of circling its border');
vm.runInContext('start()',context);
vm.runInContext('players.forEach((p,i)=>{if(i!==0&&i!==4)p.alive=false});units=units.filter(u=>players[u.p].alive)',context);
vm.runInContext('players[0].target=4;for(let i=0;i<100;i++)tick()',context);
const playerUnits=vm.runInContext('units.filter(u=>u.p===0).length',context);
assert.ok(playerUnits>0,'player 0 retains soldiers, field() routes through obstacles');
const combatCounts=events=>({
 entries:events.filter(e=>e.type==='entry'&&e.attacker===0&&e.defender===1).length,
 attackerDeaths:events.filter(e=>e.type==='hit'&&e.killed&&e.attacker===1&&e.defender===0).length,
 defenderDeaths:events.filter(e=>e.type==='hit'&&e.killed&&e.attacker===0&&e.defender===1).length
});
// A defended tile records a death, not an entry; the following tick records actual entry.
const duel="start();cells.forEach(c=>{c.owner=-1;c.building=''});players.forEach(p=>{p.gold=0;p.production=0;p.target=-1});at(9,10).owner=0;at(10,10).owner=1;players[0].target=1;units=[{p:0,x:9,y:10,hp:2,guard:false,g:409},{p:1,x:10,y:10,hp:1,guard:true,g:410}];";
combatEvents=[];
vm.runInContext(duel+'tick()',context);
assert.deepEqual(combatCounts(combatEvents),{entries:0,attackerDeaths:0,defenderDeaths:1});
combatEvents=[];
vm.runInContext('tick()',context);
assert.deepEqual(combatCounts(combatEvents),{entries:1,attackerDeaths:0,defenderDeaths:0});
combatEvents=[];
vm.runInContext(duel+"units[0].hp=1;units[0].guard=true;units[1].hp=2;units[1].guard=false;players[1].target=0;tick()",context);
assert.deepEqual(combatCounts(combatEvents),{entries:0,attackerDeaths:1,defenderDeaths:0});
combatEvents=[];
let seed=12345;
context.Math=Object.create(Math);
context.Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
vm.runInContext("start();units=[];cells.forEach(c=>{c.owner=-1;c.building=''});for(let y=12;y<=26;y++)for(let x=5;x<=34;x++)at(x,y).owner=x<20?0:1;players[0].castle={x:10,y:19};players[1].castle={x:29,y:19};for(const p of players){at(p.castle.x,p.castle.y).building='castle';spawn(p,30)}players[0].target=1",context);
const totals={entries:0,attackerDeaths:0,defenderDeaths:0};
for(let t=1;t<=100;t++){
 combatEvents=[];
 vm.runInContext('tick()',context);
 const counts=combatCounts(combatEvents);
 for(const k of Object.keys(totals))totals[k]+=counts[k];
 console.log(JSON.stringify({tick:t,...counts}));
 if(!vm.runInContext('players[0].alive&&players[1].alive',context))break;
}
combatEvents=null;
console.log('Combat totals (entry events, not unique cells): '+JSON.stringify(totals));
// New: 8-direction movement, map sizes, difficulty, pause.
assert.equal(vm.runInContext("start();neighbors(5,5).length",context),8,'8 neighbors inside map');
assert.equal(vm.runInContext("neighbors(0,0).length",context),3,'corner has 3 neighbors');
vm.runInContext("start();players.slice(1).forEach(p=>p.alive=false);units=[];cells.forEach(c=>{c.owner=-1;c.building=''});for(let i=0;i<10;i++)at(5+i,5+i).owner=0;players[0].castle={x:5,y:5};spawn(players[0],1,5,5);units[0].guard=false;units[0].g=14*N+14;units[0].px=5;units[0].py=5",context);
vm.runInContext("tick()",context);
assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify([units[0].x,units[0].y])",context)),[6,6],'unit steps diagonally');
for(const [sz,exp] of [['30',30],['40',40],['50',50]]){element('size').value=sz;vm.runInContext('start()',context);assert.equal(vm.runInContext('N',context),exp);assert.equal(vm.runInContext('cells.length',context),exp*exp);
 for(let i=0;i<vm.runInContext('players.length',context);i++)assert.ok(vm.runInContext(`players[${i}].castle.x<N&&players[${i}].castle.y<N&&at(players[${i}].castle.x,players[${i}].castle.y).owner===${i}`,context),'castle inside map '+sz)}
element('size').value='40';
element('diff').value='hard';vm.runInContext('start()',context);assert.equal(vm.runInContext('botMul',context),1.5);
element('diff').value='easy';vm.runInContext('start()',context);assert.equal(vm.runInContext('botMul',context),.6);
element('diff').value='normal';vm.runInContext('start()',context);assert.equal(vm.runInContext('botMul',context),1);
vm.runInContext("start();players[0].gold=0;players[1].gold=0",context);vm.runInContext('setPause(true)',context);assert.equal(vm.runInContext('paused',context),true);
element('board').click({clientX:100,clientY:100});vm.runInContext('setPause(false)',context);assert.equal(vm.runInContext('paused',context),false);
vm.runInContext('start()',context);
console.log('PASS: syntax, spawn, production, economy, combat, borders, bots, no unit cap, 8-dir moves, map sizes, difficulty, pause');

