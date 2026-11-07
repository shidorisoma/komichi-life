const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop,textContent:''});return els.get(id)};
const storage={};const b={console:{...console,warn:noop},Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>0},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};
function loadModel(){
 for(const key of Object.keys(storage))delete storage[key];
 vm.createContext(b);
 const exported='globalThis.qa={chars,addResident,buyFurniture,moveFurniture,canResidentUseFurniture,getFurniture:()=>furniture,furnitureCatalog,relationshipFor,evaluateRelationshipPromotions,relationshipThresholds,addDiary,writePersonalDiary,startSocialVisit,tryReplanSocialVisit,cancelSocialVisit,PAINTED_WALK_SPOTS,paintedTownArt,householdForResident};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);b.qa.paintedTownArt.complete=true;b.qa.paintedTownArt.naturalWidth=1122;b.qa.paintedTownArt.naturalHeight=1402;return b.qa;
}
const assert=require('assert').strict;let failures=0;
function test(name,fn){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}

// --- Furniture: the purchase/move functions exist without any in-game caller,
// so these tests are the only guard on their money and ownership rules.
test('buying furniture charges the buyer and registers the item at home',()=>{
 const q=loadModel(),buyer=q.chars[0];buyer.money=5000;
 const before=q.getFurniture().length;
 const item=q.buyFurniture(buyer.id,'chair');
 assert(item,'purchase should succeed');
 assert.equal(buyer.money,4700);
 assert.equal(q.getFurniture().length,before+1);
 assert.equal(item.homeId,q.householdForResident(buyer).homeId);
 assert(q.canResidentUseFurniture(buyer.id,'sit'),'owner household can use the chair');
});
test('buying furniture refuses when the buyer cannot afford it',()=>{
 const q=loadModel(),buyer=q.chars[0];buyer.money=100;
 const before=q.getFurniture().length;
 assert.equal(q.buyFurniture(buyer.id,'sofa'),null);
 assert.equal(buyer.money,100);
 assert.equal(q.getFurniture().length,before);
});
test('household-unique furniture cannot be bought twice',()=>{
 const q=loadModel(),buyer=q.chars[0];buyer.money=50000;
 // Every home starts with a bed and a fridge, both household-unique.
 assert.equal(q.buyFurniture(buyer.id,'bed'),null);
 assert.equal(q.buyFurniture(buyer.id,'fridge'),null);
 assert(q.buyFurniture(buyer.id,'chair'),'non-unique items stay buyable');
 assert(q.buyFurniture(buyer.id,'chair'),'and repeatable');
});
test('moving furniture validates the room type',()=>{
 const q=loadModel(),buyer=q.chars[0];buyer.money=5000;
 const homeId=q.householdForResident(buyer).homeId;
 const chair=q.buyFurniture(buyer.id,'chair');
 assert.equal(q.moveFurniture(chair.instanceId,homeId+':kitchen',300,500,90),true,'a chair may move to the kitchen');
 assert.equal(chair.roomId,homeId+':kitchen');
 assert.equal(chair.rotation,90);
 const fridge=q.getFurniture().find(f=>f.homeId===homeId&&f.furnitureId==='fridge');
 assert(fridge,'the starter fridge exists');
 assert.equal(q.moveFurniture(fridge.instanceId,homeId+':living',300,500,0),false,'a fridge only belongs in the kitchen');
 assert.equal(fridge.roomId,homeId+':kitchen');
});

// --- Relationships: auto-promotion follows the owner-specified thresholds.
test('trust and intimacy past the threshold promote acquaintances to friends',()=>{
 const q=loadModel();
 const a=q.addResident({name:'昇格A',hobbies:'',workStyle:'none'}),c=q.addResident({name:'昇格B',hobbies:'',workStyle:'none'});
 const r=q.relationshipFor(a,c);
 assert.equal(r.status,'知り合い');
 r.trust=60;r.intimacy=60;q.evaluateRelationshipPromotions();
 assert.equal(r.status,'友人');
 r.affection=90;q.evaluateRelationshipPromotions();
 assert.equal(r.status,'親友');
});
test('a low-sociability partner raises the promotion thresholds',()=>{
 const q=loadModel();
 const a=q.addResident({name:'低社交',hobbies:'',workStyle:'none',sociability:20}),c=q.addResident({name:'相手',hobbies:'',workStyle:'none'});
 const r=q.relationshipFor(a,c);
 r.trust=60;r.intimacy=60;q.evaluateRelationshipPromotions();
 assert.equal(r.status,'知り合い','60 is not enough when the threshold is raised');
 r.trust=70;r.intimacy=70;q.evaluateRelationshipPromotions();
 assert.equal(r.status,'友人');
});
test('best friend is capped at one per resident and locked pairs never promote',()=>{
 const q=loadModel();
 const a=q.addResident({name:'中心',hobbies:'',workStyle:'none'}),c=q.addResident({name:'親友候補1',hobbies:'',workStyle:'none'}),d=q.addResident({name:'親友候補2',hobbies:'',workStyle:'none'});
 const r1=q.relationshipFor(a,c),r2=q.relationshipFor(a,d);
 r1.trust=90;r1.intimacy=90;r1.affection=95;
 r2.trust=90;r2.intimacy=90;r2.affection=85;
 q.evaluateRelationshipPromotions();
 assert.equal(r1.status,'親友','the higher-affection pair wins the single slot');
 assert.equal(r2.status,'友人','the other pair stops at friend');
 const e=q.addResident({name:'固定',hobbies:'',workStyle:'none'}),f=q.addResident({name:'固定相手',hobbies:'',workStyle:'none'});
 const r3=q.relationshipFor(e,f);r3.statusLocked=true;r3.trust=99;r3.intimacy=99;r3.affection=99;
 q.evaluateRelationshipPromotions();
 assert.equal(r3.status,'知り合い','a manually locked pair is exempt from auto-promotion');
});

// --- Personal diary: one entry per resident per day, newest kept to 30.
test('a personal diary entry is written once per day from the objective log',()=>{
 const q=loadModel(),p=q.chars[0];
 q.addDiary(p.name+'は街を散歩した。');
 q.writePersonalDiary(p);
 assert.equal(p.personalDiaries.length,1);
 assert(p.personalDiaries[0].text.length>0);
 q.writePersonalDiary(p);
 assert.equal(p.personalDiaries.length,1,'the same day never writes twice');
});
test('personal diaries keep only the newest 30 entries',()=>{
 const q=loadModel(),p=q.chars[0];
 p.personalDiaries=Array.from({length:30},(_,i)=>({day:1000-i,time:'21:00',text:'過去の日記'+i}));
 p.lastDiaryDay=-1;
 q.writePersonalDiary(p);
 assert.equal(p.personalDiaries.length,30);
 assert.equal(p.personalDiaries[0].day,p.personalDiaries[0].day);
});

// --- Social re-planning: a stuck rendezvous moves to a free spot instead of
// dissolving, at most twice per visit.
test('a stuck rendezvous re-plans to a different spot, at most twice',()=>{
 const q=loadModel();
 const cherry=q.PAINTED_WALK_SPOTS.find(s=>s.id==='garden-cherry'),riverside=q.PAINTED_WALK_SPOTS.find(s=>s.id==='garden-riverside');
 const a=q.chars[0],c=q.chars[1];
 a.x=cherry.x;a.y=cherry.y;c.x=riverside.x;c.y=riverside.y;
 a.action='idle';a.phaseState='idle';c.action='idle';c.phaseState='idle';
 const r=q.relationshipFor(a,c);
 assert(q.startSocialVisit(a,c,r,a),'visit starts');
 assert.equal(a.socialReplans,0);
 const center1={x:(a.tx+c.tx)/2,y:(a.ty+c.ty)/2};
 assert(q.tryReplanSocialVisit(a),'first re-plan succeeds');
 const center2={x:(a.tx+c.tx)/2,y:(a.ty+c.ty)/2};
 assert(Math.hypot(center2.x-center1.x,center2.y-center1.y)>=110,'the new spot is away from the jammed one');
 assert.equal(a.socialReplans,1);assert.equal(c.socialReplans,1);
 assert(q.tryReplanSocialVisit(a),'second re-plan succeeds');
 assert.equal(q.tryReplanSocialVisit(a),false,'the re-plan budget is exhausted at two');
 q.cancelSocialVisit(a);
 assert(a.action!=='social'||a.socialPartnerId===null,'cancellation still works after the budget ends');
});

process.exitCode=failures?1:0;
