const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)};
const storage={};const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>0},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};


// Execute the real game model with a minimal DOM; painting is visually checked
// separately in the browser. This test catches disconnected paths and save loss.
function loadModel(){
 vm.createContext(b);
 const exported='globalThis.qa={pointInPolygon,WORLD_NATURE_OBJECTS,loop,chars,homes,roadNodes,roadRoute,isBlockedByStructure,residentialPlots,homeEntrance,homeApproachPoints,homeExteriorGeometry,homeSouthRoadNode,drawWorld,artPoint,nativePoint,syncHomePlaces,WORLD_STREET_FURNITURE,PAINTED_PLOTS,CAFE_SEATS,townObjectLayers,saveGame,hour,minute,calendarDay,zoom,panX,panY};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);return b.qa;
}
const assert=require('assert').strict,q=loadModel(),p=q.chars[0];
assert(q,'Game model export failed');
assert.equal(q.roadNodes.filter(n=>q.isBlockedByStructure(n.x,n.y,p)).length,0,'Road centerline overlaps a physical obstacle');
const start=q.artPoint(593,514);
const targets=[[367,357,'cafe'],[265,696,'walk'],[774,519,'walk'],[883,486,'bench'],[747,610,'bench'],[794,767,'bench'],[386,1067,'bench'],[596,1068,'bench'],[1010,800,'walk'],[350,1150,'walk']];
for(const [x,y,action] of targets){
 const end=q.artPoint(x,y);Object.assign(p,{x:start.x,y:start.y,tx:end.x,ty:end.y,action,phaseState:'moving'});
 assert(q.roadRoute(p.x,p.y,p.tx,p.ty,null,p).length>=2,'Unreachable scene destination '+x+','+y);
}
const originalSave=JSON.parse(storage['komichi-life-save-v1']);
for(const id of Object.keys(q.homes))delete q.homes[id];
for(const plot of q.residentialPlots){const id='test-'+plot.id;q.homes[id]={...plot,id,mapPlotId:plot.id,layoutKey:'2LDK'}}q.syncHomePlaces();
for(const h of Object.values(q.homes)){
 const door=q.homeEntrance(h);Object.assign(p,{homeId:h.id,x:start.x,y:start.y,tx:door.x,ty:door.y,action:'home',phaseState:'moving'});
 assert(q.roadRoute(p.x,p.y,p.tx,p.ty,h,p).length>=2,'Home entry disconnected '+h.mapPlotId);
 Object.assign(p,{x:door.x,y:door.y,tx:start.x,ty:start.y,action:'walk',phaseState:'moving'});
 assert(q.roadRoute(p.x,p.y,p.tx,p.ty,null,p).length>=2,'Home exit disconnected '+h.mapPlotId);
}
for(const plot of q.PAINTED_PLOTS){
 for(const [x,y] of plot.footprint)assert(((x-482)/306)**2+((y-1077)/192)**2>1,'Housing touches the plaza buffer '+plot.id);
}
q.drawWorld();
// A waiting social partner must not cause an endless approach: once the
// traveller is within reach of the partner, the meeting counts as made
// and the traveller stops beside them instead of walking to the exact
// reserved point (which can sit past the partner and invite orbiting).
const a=q.chars[0],mate=q.chars[1];
Object.assign(a,{x:831.6,y:1142.4,tx:831.6,ty:1142.4,action:'social',phaseState:'staying',stay:1000,socialPartnerId:mate.id,passing:null});
Object.assign(mate,{x:894.2,y:1107.0,tx:928.0,ty:1142.0,action:'social',phaseState:'moving',stay:1000,socialPartnerId:a.id,passing:null,phase:0,passingCooldown:0,routePoints:[{x:894.2,y:1107.0},{x:876.0,y:1192.0},{x:928.0,y:1142.0}],routeIndex:1});
for(let frame=1;frame<=120;frame++)q.loop(frame*80);
assert.equal(mate.phaseState,'staying','Social approach loops around a waiting partner');
assert(Math.hypot(mate.x-a.x,mate.y-a.y)<=90,'Social approach did not stop beside the partner');
// Reopen a v9-style state in the real initialization sequence.
const legacy=originalSave;legacy.townLayoutRevision=9;
legacy.clock={hour:12,minute:34,day:4,calendarDay:19};legacy.view={zoom:2,panX:500,panY:500};
legacy.residents[0].name='保存済み住人';legacy.residents[0].money=24680;
Object.values(legacy.furnitureWorld.homes).forEach((h,i)=>{h.x=140+i*180;h.y=419;h.mapLayoutVersion=9});
const expectedIds=legacy.residents.map(p=>p.id),expectedHomes=Object.keys(legacy.furnitureWorld.homes),furnitureCount=legacy.furnitureWorld.furniture.length;
storage['komichi-life-save-v1']=JSON.stringify(legacy);const restored=loadModel();
assert.equal(restored.chars[0].name,'保存済み住人');assert.equal(restored.chars[0].money,24680);
assert.equal(restored.hour,12);assert.equal(restored.minute,34);assert.equal(restored.calendarDay,19);
assert.equal(JSON.stringify(restored.chars.map(p=>p.id)),JSON.stringify(expectedIds));
assert.equal(JSON.stringify(Object.keys(restored.homes)),JSON.stringify(expectedHomes));
assert.equal(JSON.parse(storage['komichi-life-save-v1']).furnitureWorld.furniture.length,furnitureCount);
assert.equal(restored.zoom,1);assert.equal(restored.panX,0);assert.equal(restored.panY,0);
console.log('PASS: clear roads, 10 destinations, 6 two-way home approaches, plaza separation, foreground rendering and legacy save migration');

// Every tree sorts at its trunk, with a walker visible on the near side.
for(const tree of q.WORLD_NATURE_OBJECTS.trees){
 const behind={x:tree.x,y:tree.y-1},ahead={x:tree.x,y:tree.y+1};
 const layers=q.townObjectLayers([{p:behind,i:0},{p:ahead,i:1}]);
 const trunk=layers.findIndex(l=>l.y===tree.y);
 assert(trunk>0,'Missing independent tree layer');
 assert(layers.findIndex(l=>l.y===behind.y)<trunk);
 assert(layers.findIndex(l=>l.y===ahead.y)>trunk);
}
const bench=q.WORLD_STREET_FURNITURE.benches[0];
const seated={x:bench.x,y:bench.y-12,action:'bench',phaseState:'staying',benchSeat:{bench:0}};
const layers=q.townObjectLayers([{p:seated,i:0}]);
assert(layers.some(l=>l.y===bench.y),'Missing bench layer');
assert(!layers.some(l=>l.y===seated.y),'Seated resident must draw inside the bench layer');
for(const seat of q.CAFE_SEATS){
 const layers=q.townObjectLayers([{p:seat,i:0}]);
 assert(layers.some(l=>l.y===seat.y-3),'Missing cafe chair');
 assert(layers.some(l=>l.y===seat.y),'Missing seated resident');
}
