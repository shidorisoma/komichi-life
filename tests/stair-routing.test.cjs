const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)};
let testNow=0;const storage={};const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>testNow},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};


// Execute the real game model with a minimal DOM; painting is visually checked
// separately in the browser. This test catches disconnected paths and save loss.
function loadModel(preserve=false){
 if(!preserve)for(const key of Object.keys(storage))delete storage[key];
 vm.createContext(b);
 const exported='globalThis.qa={loop,chars,homes,roadNodes,roadRoute,isBlockedByStructure,residentialPlots,homeEntrance,homeApproachPoints,homeExteriorGeometry,homeSouthRoadNode,drawWorld,artPoint,nativePoint,syncHomePlaces,WORLD_STREET_FURNITURE,PAINTED_PLOTS,PAINTED_OCCLUDERS,paintedTownArt,setAction,availableBenchSeats,deleteHome,updateHomeDetails,households,places,rooms,getFurniture:()=>furniture,getErrors:()=>lastFrameErrorCount,advanceGameClock,getClock:()=>({hour,minute,calendarDay}),remainingHomeExitPoints,stairConnectionAllowed,roadCandidates,roadJoinFollowsPaint,recoverResidentFromFailedRoute,waitForSocialPartner,householdForResident,startSocialVisit,relationshipFor,finishSocialPair,validateSocialPairs,relocateHome,movementSegmentClear,isOutdoorResident,setGoal:v=>{sharedGoal=v},getGoal:()=>sharedGoal,getDiary:()=>diary,saveGame,hour,minute,calendarDay,zoom,panX,panY};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);b.qa.paintedTownArt.complete=true;b.qa.paintedTownArt.naturalWidth=1122;b.qa.paintedTownArt.naturalHeight=1402;return b.qa;
}

const assert=require('assert').strict,q=loadModel(),p=q.chars[0];q.chars[1].action='workOutside';q.chars[1].stay=100000;
const start=q.artPoint(600,430),door=q.artPoint(367,357);Object.assign(p,{...start,action:'cafe',phaseState:'moving',tx:door.x,ty:door.y});
const route=q.roadRoute(p.x,p.y,p.tx,p.ty,null,p);assert(route.length>=2,'Cafe must remain reachable');
const bottom=q.artPoint(535,425);assert(route.some(n=>Math.hypot(n.x-bottom.x,n.y-bottom.y)<40),'Cafe route skips the bottom landing');
const upper=q.artPoint(439,359);assert(route.some(n=>Math.hypot(n.x-upper.x,n.y-upper.y)<40),'Cafe upper landing missing');
const home=q.homes[p.homeId];home.mapPlotId='south-center';const plot=q.residentialPlots.find(p=>p.id==='south-center');home.x=plot.x;home.y=plot.y;q.syncHomePlaces();
const entrance=q.homeEntrance(home);Object.assign(p,{...q.artPoint(551,641),action:'home',phaseState:'moving',tx:entrance.x,ty:entrance.y});
const homeRoute=q.roadRoute(p.x,p.y,p.tx,p.ty,home,p);assert(homeRoute.length>=2,'Middle home unreachable');const lower=q.artPoint(456,610);assert(homeRoute.some(n=>Math.hypot(n.x-lower.x,n.y-lower.y)<2),'Middle home must use all stairs');
const remaining=q.remainingHomeExitPoints(home,...Object.values(q.artPoint(447,585)));assert(remaining.every(n=>q.nativePoint(n.x,n.y).y>=584),'Replanning walks back up the stairs');
Object.assign(p,{...door,action:'walk',phaseState:'moving',tx:start.x,ty:start.y});delete p.departureHomeId;
const out=q.roadRoute(p.x,p.y,p.tx,p.ty,null,p);assert(out.some(n=>Math.hypot(n.x-bottom.x,n.y-bottom.y)<40),'Cafe departure skips bottom');console.log('PASS cafe lower and upper landings; complete middle-house stairs; no stair backtracking');

const g1=q.artPoint(727,469),g2=q.artPoint(620,752);
assert(!q.roadJoinFollowsPaint(g1.x,g1.y,g2.x,g2.y),'Garden shortcut crosses the grass');
console.log('PASS garden cross-lawn shortcut rejected');
