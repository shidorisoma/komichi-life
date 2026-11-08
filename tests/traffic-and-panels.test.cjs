const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)};
const intervals=new Map();let intervalId=0;let testNow=0;const storage={};const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>testNow},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:(fn,ms)=>{const id=++intervalId;intervals.set(id,{fn,ms});return id},clearInterval:id=>intervals.delete(id),setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};


// Execute the real game model with a minimal DOM; painting is visually checked
// separately in the browser. This test catches disconnected paths and save loss.
function loadModel(preserve=false){
 intervals.clear();intervalId=0;
 if(!preserve)for(const key of Object.keys(storage))delete storage[key];
 vm.createContext(b);
 const exported='globalThis.qa={loop,chars,homes,roadNodes,roadRoute,isBlockedByStructure,residentialPlots,homeEntrance,homeApproachPoints,homeExteriorGeometry,homeSouthRoadNode,drawWorld,artPoint,nativePoint,syncHomePlaces,WORLD_STREET_FURNITURE,PAINTED_PLOTS,PAINTED_OCCLUDERS,paintedTownArt,setAction,getCafeSeats:()=>CAFE_SEATS,availableBenchSeats,deleteHome,updateHomeDetails,households,places,rooms,getFurniture:()=>furniture,getErrors:()=>lastFrameErrorCount,advanceGameClock,getClock:()=>({hour,minute,calendarDay}),roadJoinFollowsPaint,roadCandidates,getRoadClearanceSize:()=>commonRoadClearance.size,addResident,updateResidentDiagnostics,showTab,openPlaceResidents,suspendGame,resumeGame,getDiagnosticTimer:()=>residentDiagnosticTimer,recoverResidentFromFailedRoute,waitForSocialPartner,householdForResident,startSocialVisit,relationshipFor,finishSocialPair,validateSocialPairs,relocateHome,movementSegmentClear,isOutdoorResident,setGoal:v=>{sharedGoal=v},setPairGoal:v=>{sharedGoalPairId=v},getGoal:()=>sharedGoal,getDiary:()=>diary,saveGame,hour,minute,calendarDay,zoom,panX,panY};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);b.qa.paintedTownArt.complete=true;b.qa.paintedTownArt.naturalWidth=1122;b.qa.paintedTownArt.naturalHeight=1402;return b.qa;
}
const assert=require('assert').strict;let failures=0;
function test(name,fn){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
test('leaving diagnostics stops its periodic updates',()=>{const q=loadModel();q.openPlaceResidents();const timer=q.getDiagnosticTimer();assert(intervals.has(timer));q.showTab('residents',true);assert.equal(q.getDiagnosticTimer(),null);assert(!intervals.has(timer));});
test('diagnostic updates suspend in the background and restart on return',()=>{const q=loadModel();q.openPlaceResidents();const timer=q.getDiagnosticTimer();q.suspendGame();assert(!intervals.has(timer));q.resumeGame();assert(q.getDiagnosticTimer()!=null);assert(intervals.has(q.getDiagnosticTimer()));});
test('six opposing walkers all finish without overlapping',()=>{const q=loadModel(),base=q.chars[0];while(q.chars.length<6){const i=q.chars.length;q.chars.push({...base,id:'traffic-'+i,name:'Traffic '+i,needs:{...base.needs},profile:{...base.profile}})}q.chars.forEach(p=>{p.action='workOutside';p.phaseState='staying';p.stay=10000;p.passing=null});const nodes=[];for(const n of [...q.roadNodes].sort((a,b)=>a.y-b.y)){const art=q.nativePoint(n.x,n.y);if(art.x>520&&art.x<680&&art.y>300&&art.y<900&&nodes.every(p=>Math.hypot(p.x-n.x,p.y-n.y)>110))nodes.push(n)}assert(nodes.length>=6);const starts=nodes.slice(0,6).map(n=>({x:n.x,y:n.y}));q.chars.forEach((p,i)=>{Object.assign(p,starts[i]);const end=starts[5-i];assert(q.setAction(p,i,'walk',end.x,end.y,'go','rest','stand',10000))});for(let n=1;n<=4500&&q.chars.some(p=>p.phaseState==='moving');n++){q.loop(n*80);for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)assert(Math.hypot(q.chars[i].x-q.chars[j].x,q.chars[i].y-q.chars[j].y)>=21.99,'Walkers overlapped');}q.chars.forEach(p=>assert.equal(p.phaseState,'staying',p.id+' still moving at '+p.x+','+p.y));assert.equal(q.getErrors(),0);});
test('repeated resumes never duplicate diagnostic timers',()=>{const q=loadModel();q.openPlaceResidents();for(let n=0;n<5;n++){q.suspendGame();q.resumeGame();q.resumeGame();assert.equal([...intervals.values()].filter(item=>item.fn===q.updateResidentDiagnostics).length,1)}q.showTab('walk',true);assert.equal([...intervals.values()].filter(item=>item.fn===q.updateResidentDiagnostics).length,0);q.suspendGame();q.resumeGame();assert.equal(q.getDiagnosticTimer(),null);});
test('six residents run for eight game hours without errors or endless travel',()=>{let seed=7;const originalMath=b.Math,rng=Object.create(Math);rng.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);b.Math=rng;try{const q=loadModel();while(q.chars.length<6)assert(q.addResident({name:'長時間'+q.chars.length,hobbies:'散歩、読書',workStyle:'none'}));const progress=new Map();for(let second=1;second<=480;second++){testNow=second*1000;q.advanceGameClock();q.loop(testNow);assert.equal(q.getErrors(),0);q.chars.forEach(p=>{assert(Number.isFinite(p.x)&&Number.isFinite(p.y));const key=p.action+':'+p.tx+':'+p.ty,old=progress.get(p.id),duration=p.phaseState==='moving'&&old?.key===key?old.duration+1:0;progress.set(p.id,{key,duration});assert(duration<180,p.name+' never reached '+key)});}assert.equal(q.getClock().hour,23);assert.equal(q.getClock().minute,25);}finally{b.Math=originalMath}});
test('road clearance reuse is invalidated when housing is synchronized',()=>{const q=loadModel(),p=q.chars[0],start=q.artPoint(593,514),target=q.artPoint(350,1150);Object.assign(p,{x:start.x,y:start.y,action:'walk',phaseState:'moving',tx:target.x,ty:target.y});const before=q.roadRoute(p.x,p.y,p.tx,p.ty,null,p);assert(before.length>=2);assert(q.getRoadClearanceSize()>0);q.syncHomePlaces();assert.equal(q.getRoadClearanceSize(),0);const after=q.roadRoute(p.x,p.y,p.tx,p.ty,null,p);assert.equal(JSON.stringify(after),JSON.stringify(before));});
test('nearest-road optimization matches the full-scan results',()=>{const q=loadModel(),p=q.chars[0];const points=[...q.roadNodes.filter((_,i)=>i%11===0),q.artPoint(350,1150),q.artPoint(367,357),q.artPoint(1010,800),{x:-500,y:0}];Object.assign(p,{action:'walk',phaseState:'moving'});for(const point of points){const visible=q.roadNodes.filter(n=>!q.isBlockedByStructure(n.x,n.y,p)&&q.roadJoinFollowsPaint(point.x,point.y,n.x,n.y)&&q.movementSegmentClear(point.x,point.y,n.x,n.y,p)).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y));let expected;if(visible.length){const reach=Math.max(145,Math.min(185,Math.hypot(visible[0].x-point.x,visible[0].y-point.y)+65));expected=visible.filter(n=>Math.hypot(n.x-point.x,n.y-point.y)<=reach).slice(0,3)}else expected=q.roadNodes.filter(n=>!q.isBlockedByStructure(n.x,n.y,p)).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y)).slice(0,3);assert.equal(JSON.stringify(q.roadCandidates(point.x,point.y,p).map(n=>n.id)),JSON.stringify(expected.map(n=>n.id)));}});
test('a pair visiting the cafe together sits at the same table',()=>{
 const q=loadModel();
 const [a,b]=q.chars,cafe=q.places.find(p=>p.id==='cafe'),seats=q.getCafeSeats();
 let t=0;const run=(sec,pred)=>{const end=t+sec*1000;while(t<end){t+=100;q.loop(t);if(pred&&pred())return true}return pred?pred():true};
 const rel=q.relationshipFor(a,b);
 q.setGoal('pair-date');q.setPairGoal(rel.id);
 const start=q.artPoint(510,430);
 [a,b].forEach((p,i)=>{p.x=start.x;p.y=start.y;p.phaseState='idle';p.action='idle';assert(q.setAction(p,i,'date',cafe.x,cafe.y,'デートへ向かっている','喫茶店で過ごしている','sit',90))});
 assert.notEqual(a.cafeSeat,b.cafeSeat,'pair takes two different chairs');
 assert.equal(Math.floor(a.cafeSeat/2),Math.floor(b.cafeSeat/2),'pair shares one table');
 assert(run(90,()=>a.phaseState==='staying'&&b.phaseState==='staying'),'pair arrives at the cafe');
 assert(Math.hypot(a.x-seats[a.cafeSeat].x,a.y-seats[a.cafeSeat].y)<14,'first of the pair sits at the assigned chair');
 assert(Math.hypot(b.x-seats[b.cafeSeat].x,b.y-seats[b.cafeSeat].y)<14,'second of the pair sits at the assigned chair');
 assert.equal(q.getErrors(),0);
});
test('cafe guests sit at separate terrace seats and can leave past each other',()=>{
 const q=loadModel();
 const [a,b]=q.chars,cafe=q.places.find(p=>p.id==='cafe'),seats=q.getCafeSeats();
 let t=0;const run=(sec,pred)=>{const end=t+sec*1000;while(t<end){t+=100;q.loop(t);if(pred&&pred())return true}return pred?pred():true};
 const start=q.artPoint(510,430);
 [a,b].forEach((p,i)=>{p.x=start.x;p.y=start.y;p.phaseState='idle';p.action='idle';assert(q.setAction(p,i,'cafe',cafe.x+30,cafe.y+40,'喫茶店へ向かっている','喫茶店で過ごしている','sit',90))});
 assert.notEqual(a.cafeSeat,b.cafeSeat);
 assert(run(60,()=>a.phaseState==='staying'&&b.phaseState==='staying'),'both guests arrive');
 assert(Math.hypot(a.x-seats[a.cafeSeat].x,a.y-seats[a.cafeSeat].y)<14,'each guest sits at their own terrace seat');
 assert(Math.hypot(b.x-seats[b.cafeSeat].x,b.y-seats[b.cafeSeat].y)<14,'each guest sits at their own terrace seat');
 const far=a.cafeSeat===0?a:b,near=far===a?b:a,fi=q.chars.indexOf(far),plaza=q.artPoint(350,1150);
 q.setAction(far,fi,'walk',plaza.x,plaza.y,'街へ向かっている','広場を散歩している','stand',20);
 assert(run(45,()=>Math.hypot(far.x-cafe.x,far.y-cafe.y)>320),'the far guest leaves past the seated guest');
 assert.equal(near.phaseState,'staying','the seated guest is undisturbed');
 assert.equal(q.getErrors(),0);
});

process.exitCode=failures?1:0;
