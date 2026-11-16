// Run: node compare-rates.cjs. --legacy verifies the passive-defense assertion catches the old melee rule.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let source=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
// Control fixture only: suppress AI construction/target selection, NOT production, movement or combat.
assert.equal(source.split('if(p.id){').length-1,1);
source=source.replace('if(p.id){','if(false){');
if(process.argv.includes('--legacy')){
 const melee='Math.abs(v.x-u.x)+Math.abs(v.y-u.y)<=1';
 assert.equal(source.split(melee).length-1,1);
 source=source.replace(melee,'v.x===u.x&&v.y===u.y');
}
function game(seed){
 const math=Object.create(Math);
 math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const elements=new Map();
 const noop=()=>{};
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 const document={getElementById(id){if(!elements.has(id))elements.set(id,{value:id==='bots'?'1':'',classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,getContext:()=>ctx});return elements.get(id)}};
 const c=vm.createContext({document,Math:math,console,requestAnimationFrame:noop,addEventListener:noop});
 vm.runInContext(source,c);
 vm.runInContext("start();units=[];cells.forEach(c=>{c.owner=-1;c.building=''});players.forEach(p=>{p.gold=1000;p.production=0;p.target=-1});births=[0,0];const originalSpawn=spawn;spawn=function(p,n,...xy){const before=units.length;originalSpawn(p,n,...xy);births[p.id]+=units.length-before}",c);
 return code=>vm.runInContext(code,c);
}
function production(seed){
 const run=game(seed);
 // Keep troops at separate home positions after each tick; production parity excludes combat losses.
 run("for(const p of players){const ox=p.id*20;for(let y=5;y<10;y++)for(let x=ox+2;x<ox+7;x++){const c=at(x,y);c.owner=p.id;const k=(y-5)*5+x-ox-2;c.building=k<15?'barracks':k<20?'market':''}p.castle={x:ox+4,y:7}}for(let t=0;t<120;t++){tick();for(const u of units){u.x=players[u.p].castle.x;u.y=players[u.p].castle.y;delete u.g}}");
 const result=JSON.parse(run('JSON.stringify({births,gold:players.map(p=>p.gold),alive:units.reduce((a,u)=>(a[u.p]++,a),[0,0])})'));
 assert.deepEqual(result.births,[186,186],'15 funded barracks + castle: identical gross production');
 assert.deepEqual(result.gold,[1300,1300],'identical income and production costs');
 assert.deepEqual(result.alive,result.births,'isolated production has no casualties');
 return result;
}
function battle(seed,passive,first){
 const run=game(seed);
 run(`for(let y=0;y<40;y++)for(let x=0;x<40;x++)at(x,y).owner=x<20?0:1;players.forEach(p=>{p.gold=0;p.production=-1e9;p.target=p.id===${passive}?-1:${passive}});for(const id of [${first},${1-first}])spawn(players[id],40,id===0?16:23,20)`);
 const losses=[0,0];
 for(let t=0;t<30;t++){
  const before=run('units.slice()');
  run('tick()');
  const live=new Set(run('units.slice()'));
  for(const u of before)if(!live.has(u))losses[u.p]++;
 }
 const remaining=JSON.parse(run('JSON.stringify(players.map(p=>units.filter(u=>u.p===p.id).length))'));
 for(const id of [0,1])assert.equal(remaining[id]+losses[id],40,'event-level casualty accounting');
 assert.ok(losses[1-passive]>0,'passive defender must kill attackers, not merely lose units');
 return {passive,first,losses,remaining};
}
for(const seed of [1,12345,98765]){
 const result={seed,production:production(seed),battles:[]};
 for(const passive of [0,1])for(const first of [0,1])result.battles.push(battle(seed,passive,first));
 console.log(JSON.stringify(result));
}
console.log('PASS: seeded production parity, passive defense, swapped player roles and unit order');
