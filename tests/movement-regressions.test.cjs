const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)};
let testNow=0;const storage={};const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>testNow},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};


// Execute the real game model with a minimal DOM; painting is visually checked
// separately in the browser. This test catches disconnected paths and save loss.
function loadModel(){
 vm.createContext(b);
 const exported='globalThis.qa={loop,chars,homes,roadNodes,roadRoute,isBlockedByStructure,residentialPlots,homeEntrance,homeApproachPoints,homeExteriorGeometry,homeSouthRoadNode,drawWorld,artPoint,nativePoint,syncHomePlaces,WORLD_STREET_FURNITURE,PAINTED_PLOTS,setAction,startWork,TOWN_EXIT_WAYPOINTS,availableBenchSeats,deleteHome,updateHomeDetails,households,places,rooms,getFurniture:()=>furniture,getErrors:()=>lastFrameErrorCount,advanceGameClock,getClock:()=>({hour,minute,calendarDay}),saveGame,hour,minute,calendarDay,zoom,panX,panY};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);return b.qa;
}
const assert=require('assert').strict,q=loadModel(),p=q.chars[0];
q.chars[1].action='workOutside';q.chars[1].phaseState='staying';q.chars[1].stay=100000;
// Every seat can be left for another bench without invalidating the route.
for(let index=0;index<q.WORLD_STREET_FURNITURE.benches.length;index++){
 const bench=q.WORLD_STREET_FURNITURE.benches[index];
 Object.assign(p,{x:bench.x-17,y:bench.y-10,action:'bench',phaseState:'staying',benchSeat:{bench:index,slot:0}});
 const seat=q.availableBenchSeats(0).find(s=>s.bench===(index+1)%5&&s.slot===0);
 assert(q.setAction(p,0,'bench',seat.x,seat.y,'移動中','着席','sit',1000),'Cannot leave bench '+index+' for another bench');
 assert.equal(p.benchExit.id,bench.id);
 for(let n=1;n<p.routePoints.length;n++)assert(q.isBlockedByStructure(p.routePoints[n].x,p.routePoints[n].y,p)===false);
}
// Retargeting again before leaving must preserve the original exit corridor.
const seat=q.availableBenchSeats(0).find(s=>s.bench===2&&s.slot===1);
assert(q.setAction(p,0,'bench',seat.x,seat.y,'移動中','着席','sit',1000));
let frame=0;
while(p.phaseState==='moving'&&frame<12000)q.loop(++frame*80);
assert.equal(p.phaseState,'staying','Resident did not finish bench transfer');
assert(Math.hypot(p.x-seat.x,p.y-seat.y)<3);
// Two residents must be able to occupy separate seats on the same bench.
const pair=loadModel(),bench=pair.WORLD_STREET_FURNITURE.benches[3],start=pair.artPoint(593,514);
pair.chars.forEach((resident,index)=>{
 Object.assign(resident,{x:start.x+index*36,y:start.y,action:'walk',phaseState:'staying',benchSeat:null,benchExit:null});
 assert(pair.setAction(resident,index,'bench',bench.x+(index?17:-17),bench.y-10,'移動中','着席','sit',10000));
 resident.benchSeat={bench:3,slot:index};
});
assert.equal(pair.availableBenchSeats(0).filter(s=>s.bench===3).length,1,'The other seat must stay reserved');
for(let n=1;n<=5000&&pair.chars.some(p=>p.phaseState==='moving');n++)pair.loop(n*80);
pair.chars.forEach(resident=>assert.equal(resident.phaseState,'staying','Paired bench visit did not arrive'));
assert(Math.hypot(pair.chars[0].x-pair.chars[1].x,pair.chars[0].y-pair.chars[1].y)>=22);
// A separate model prevents a household test from affecting the movement check.
const membership=loadModel(),ids=Object.keys(membership.homes);
assert(membership.updateHomeDetails(ids[1],'転居先',[membership.chars[0].id]));
assert(membership.households['household:'+ids[1]].residentIds.includes(membership.chars[0].id));
assert(!membership.households['household:'+ids[0]].residentIds.includes(membership.chars[0].id));
const h=loadModel(),removed=Object.keys(h.homes)[0],fallback=Object.keys(h.homes)[1];
const person=h.chars[0];person.homeId=removed;person.action='home';person.phaseState='staying';
const sourceRoom=Object.values(h.rooms).find(r=>r.homeId===removed);
const personal={instanceId:'regression-personal',homeId:removed,roomId:sourceRoom.id,ownershipType:'individual',ownerId:person.id,placed:true};
h.getFurniture().push(personal);
assert(h.deleteHome(removed),'Home deletion did not complete');
assert(!h.homes[removed]);assert(!h.places.some(p=>p.id===removed));
assert.equal(person.homeId,fallback);assert(h.households['household:'+fallback].residentIds.includes(person.id),'New household membership was not updated');
assert(h.getFurniture().some(f=>f.instanceId===personal.instanceId),'Personal furniture was lost');
assert.equal(personal.homeId,fallback);assert(h.rooms[personal.roomId]);assert.equal(personal.placed,false);
const saved=JSON.parse(storage['komichi-life-save-v1']);
assert(!saved.furnitureWorld.homes[removed]);assert(saved.furnitureWorld.furniture.some(f=>f.instanceId===personal.instanceId));
assert.equal(h.deleteHome(fallback),false,'Must retain one home');
const reloaded=loadModel();assert(!reloaded.homes[removed],'Deleted home was recreated after reload');assert(reloaded.homes[fallback]);assert(!reloaded.places.some(p=>p.id===removed),'Deleted home remains in map list');assert.equal(reloaded.chars[0].homeId,fallback);assert(reloaded.getFurniture().some(f=>f.instanceId===personal.instanceId));
// Intervals advance for a full day, pause while hidden, then resume without a jump.
for(let n=0;n<1440;n++){testNow+=1000;h.advanceGameClock()}
assert.equal(h.getClock().calendarDay,1);assert.equal(h.getClock().hour,15);assert.equal(h.getClock().minute,25);
b.document.hidden=true;testNow+=60000;h.advanceGameClock();assert.equal(h.getClock().minute,25);
b.document.hidden=false;testNow+=1000;h.advanceGameClock();assert.equal(h.getClock().minute,26);
assert.equal(h.getErrors(),0);
// Outside work walks out through the south flower arch and back in again.
const exitModel=loadModel(),worker=exitModel.chars[0];
exitModel.chars[1].action='workOutside';exitModel.chars[1].phaseState='staying';exitModel.chars[1].stay=100000;
Object.assign(worker,{x:900,y:900,tx:900,ty:900,action:'walk',phaseState:'idle',workOutside:true,jobTitle:'配達員',workplace:'街の外'});
exitModel.startWork(worker,0,{duration:600,urgent:false});
assert.equal(worker.action,'workExit','Outside work should start by walking out');
assert.equal(worker.phaseState,'moving');
const wps=exitModel.TOWN_EXIT_WAYPOINTS,exitPoint=wps[wps.length-1];
assert(Math.hypot(worker.tx-exitPoint.x,worker.ty-exitPoint.y)<1,'Exit target should be the south exit');
let exitFrame=0,minArchDist=Infinity;
while(!(worker.action==='workOutside'&&worker.phaseState==='staying')&&exitFrame<6000){exitModel.loop(++exitFrame*80);minArchDist=Math.min(minArchDist,Math.hypot(worker.x-wps[1].x,worker.y-wps[1].y))}
assert.equal(worker.action,'workOutside','Worker never left town');
assert(minArchDist<90,'Worker did not pass through the arch (min '+Math.round(minArchDist)+')');
assert.equal(worker.stay,600);
worker.stay=0.01;
let enterFrame=0;
while(worker.action!=='workEnter'&&enterFrame<600){exitModel.loop(++enterFrame*80)}
assert.equal(worker.action,'workEnter','Worker did not start walking back in');
minArchDist=Infinity;
while(worker.phaseState==='moving'&&enterFrame<8000){exitModel.loop(++enterFrame*80);minArchDist=Math.min(minArchDist,Math.hypot(worker.x-wps[1].x,worker.y-wps[1].y))}
assert.equal(worker.phaseState,'staying','Worker did not re-enter town');
assert(minArchDist<90,'Worker did not pass back through the arch');
assert(Math.hypot(worker.x-wps[0].x,worker.y-wps[0].y)<60,'Worker did not reach the gate');
assert.equal(exitModel.getErrors(),0);
console.log('PASS: all bench departures, retargeting and actual arrival; home transfers and deletion, personal furniture and save; 24-hour clock and background resume; outside work exits and re-enters through the south arch');
