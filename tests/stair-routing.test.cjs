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

const assert=require('assert').strict,q=loadModel(),p=q.chars[0];
const home=q.homes[p.homeId],plot=q.residentialPlots.find(p=>p.id==='north-west');
for(const id of Object.keys(q.homes))if(id!==home.id)delete q.homes[id];
home.mapPlotId=plot.id;home.x=plot.x;home.y=plot.y;q.syncHomePlaces();
const start=q.artPoint(352,545),door=q.homeEntrance(home);Object.assign(p,{...start,action:'home',phaseState:'moving',tx:door.x,ty:door.y});
const route=q.roadRoute(p.x,p.y,p.tx,p.ty,home,p);assert(route.length>=2,'Hill home unreachable');
for(const [x,y] of [[269,217],[295,253]]){const landing=q.artPoint(x,y);assert(route.some(n=>Math.hypot(n.x-landing.x,n.y-landing.y)<2),'Hill stair landing skipped');}
const remaining=q.remainingHomeExitPoints(home,...Object.values(q.artPoint(282,235)));assert(remaining.every(n=>q.nativePoint(n.x,n.y).y>=234),'Stair exit doubles back');
const cafe=q.artPoint(176,597);Object.assign(p,{...start,action:'cafe',tx:cafe.x,ty:cafe.y});assert(q.roadRoute(p.x,p.y,p.tx,p.ty,null,p).length>=2,'Cafe terrace disconnected');
const a=q.artPoint(490,576),end=q.artPoint(820,1210);assert(!q.roadJoinFollowsPaint(a.x,a.y,end.x,end.y),'Shortcut through lake allowed');
console.log('PASS hill stair landings, no backtracking, cafe access, lake shortcut rejection');
