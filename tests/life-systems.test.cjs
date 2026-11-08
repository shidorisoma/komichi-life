const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop,textContent:''});return els.get(id)};
const storage={};const b={console:{...console,warn:noop},Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>0},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};
function loadModel(){
 for(const key of Object.keys(storage))delete storage[key];
 vm.createContext(b);
 const exported='globalThis.qa={chars,addResident,buyFurniture,moveFurniture,canResidentUseFurniture,getFurniture:()=>furniture,furnitureCatalog,relationshipFor,evaluateRelationshipPromotions,relationshipThresholds,addDiary,writePersonalDiary,startSocialVisit,tryReplanSocialVisit,cancelSocialVisit,PAINTED_WALK_SPOTS,paintedTownArt,householdForResident,parsePairInstruction,relationTypeStances,stanceToward,relationGainFactors,typeSceneFor,RELATION_TYPE_OPTIONS,tickLife,tryAutoTreat,completeWork,getTreat:()=>({by:sharedGoalTreatBy,mode:sharedGoalTreatMode}),setDay:v=>{calendarDay=v},getSharedGoal:()=>({goal:sharedGoal,pairId:sharedGoalPairId,kind:sharedGoalKind}),getCafeSeats:()=>CAFE_SEATS,getMemories:()=>memories,getRelationships:()=>relationships,setClock:(h,m)=>{hour=h;minute=m},getDiary:()=>diary};})();';
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

// --- Relationship types and pair instructions (2026-11-08) ---
test('relationships carry type and instruction fields by default',()=>{
 const q=loadModel(),r=q.relationshipFor(q.chars[0],q.chars[1]);
 assert.equal(r.relType,'');assert.equal(r.instructionText,'');assert.equal(r.instructionKind,'');assert.equal(r.lastPairDateStamp,-1);
});
test('pair instruction text parses into intents',()=>{
 const q=loadModel();
 assert.equal(q.parsePairInstruction('もっとデートさせたい').stance,'date');
 assert.equal(q.parsePairInstruction('喫茶店で会わせたい').stance,'date');
 assert.equal(q.parsePairInstruction('ふたりで一緒に過ごさせたい').stance,'together');
 assert.equal(q.parsePairInstruction('しばらく距離を置いてほしい').stance,'distance');
 assert.equal(q.parsePairInstruction('なんかいい感じにして'),null);
 const empty=q.parsePairInstruction('');assert.equal(empty.stance,'');assert.equal(empty.once,'');
});
test('one-shot instructions parse from plain text',()=>{
 const q=loadModel();
 assert.equal(q.parsePairInstruction('花をプレゼントする').once,'gift-flower');
 assert.equal(q.parsePairInstruction('本をプレゼントしたい').once,'gift-book');
 assert.equal(q.parsePairInstruction('お菓子を贈りたい').once,'gift-sweets');
 assert.equal(q.parsePairInstruction('プレゼントをあげたい').once,'gift');
 assert.equal(q.parsePairInstruction('一緒に散歩したい').once,'walk');
 assert.equal(q.parsePairInstruction('一緒に花を見に行きたい').once,'flowers');
 assert.equal(q.parsePairInstruction('一緒に買い物したい').once,'shopping');
 assert.equal(q.parsePairInstruction('一緒に釣りをしたい').once,'fishing');
 assert.equal(q.parsePairInstruction('一緒に食事したい').once,'meal');
 assert.equal(q.parsePairInstruction('励ましてあげたい').once,'cheer');
 assert.equal(q.parsePairInstruction('仲直りしてほしい').once,'makeup');
});
test('relationship type stances resolve per resident, including one-sided keys',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 r.relType='sweetA-dryB';
 assert.equal(q.stanceToward(r,a.id),'sweet');assert.equal(q.stanceToward(r,b.id),'dry');
 r.relType='sweetB';
 assert.equal(q.stanceToward(r,a.id),'normal');assert.equal(q.stanceToward(r,b.id),'sweet');
 r.relType='shy-shy';
 assert.equal(q.stanceToward(r,a.id),'shy');assert.equal(q.stanceToward(r,b.id),'shy');
 r.relType='bogus';
 assert.equal(q.stanceToward(r,a.id),'normal');
});
test('gain factors follow the pair type',()=>{
 const q=loadModel(),r=q.relationshipFor(q.chars[0],q.chars[1]);
 r.relType='sweet-sweet';assert.equal(q.relationGainFactors(r).affection,1.5);
 r.relType='dry-dry';assert.equal(q.relationGainFactors(r).affection,.55);
 r.relType='sweetA-dryB';assert(Math.abs(q.relationGainFactors(r).affection-1.025)<1e-9);
 r.relType='';assert.equal(q.relationGainFactors(r).affection,1);
});
test('type scenes flavor social text only when a type is set',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 assert.equal(q.typeSceneFor(a,b,r),null);
 r.relType='sweet-sweet';assert(q.typeSceneFor(a,b,r).text.includes('寄り添って'));
 r.relType='sweetA-dryB';const mixed=q.typeSceneFor(a,b,r);
 assert(mixed.text.includes(a.name+'は嬉しそうに寄り添っている'));
 assert(mixed.text.includes(b.name+'はあっさりした様子で話している'));
});
test('a date instruction sends that pair on a cafe date and rewards their relationship',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 r.instructionKind='date';
 const before=r.affection;
 // Move to a stamp on the 30-minute scheduling grid, cafe open.
 q.setClock(10,0);
 for(let i=0;i<10&&!q.getSharedGoal().goal;i++)q.tickLife();
 assert.equal(q.getSharedGoal().goal,'pair-date');
 assert.equal(q.getSharedGoal().pairId,r.id);
 a.action='date';a.phaseState='staying';a.x=q.getCafeSeats()[0].x;a.y=q.getCafeSeats()[0].y;
 b.action='date';b.phaseState='staying';b.x=q.getCafeSeats()[1].x;b.y=q.getCafeSeats()[1].y;
 for(let i=0;i<25;i++)q.tickLife();
 assert.equal(q.getSharedGoal().goal,'');
 assert(r.affection>before,'the pair relationship gains affection');
 assert(r.lastPairDateStamp>=0,'the date stamp is recorded');
 assert(q.getMemories().some(m=>m.pairId===r.id),'a memory is recorded for the pair');
});

// --- Log wording and de-duplication (2026-11-08) ---
test('consecutive identical log entries collapse into one',()=>{
 const q=loadModel();
 const base=q.getDiary().length;
 q.addDiary('同じ出来事。');q.addDiary('同じ出来事。');q.addDiary('同じ出来事。');
 assert.equal(q.getDiary().length,base+1);
 q.addDiary('別の出来事。');q.addDiary('同じ出来事。');
 assert.equal(q.getDiary().length,base+3,'non-consecutive repeats still record');
});
test('rendezvous log lines do not narrate the rendezvous itself',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 assert(q.startSocialVisit(a,b,r,a),'visit starts');
 const line=q.getDiary()[0].text;
 assert(!line.includes('待ち合わせ'),'no rendezvous narration: '+line);
 assert(line.startsWith(a.name+'と'+b.name+'が'),'pair line keeps the two names: '+line);
});

test('a flower gift instruction is executed once when the pair is free',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 r.pendingInstruction='gift-flower';r.pendingStamp=600;
 const before=r.affection;
 q.setClock(10,0);
 for(let i=0;i<10&&r.pendingInstruction;i++)q.tickLife();
 assert.equal(r.pendingInstruction,'','the one-shot is consumed');
 assert.equal(a.action,'social','the pair meets for the handover');
 assert(q.getDiary().some(d=>d.text.includes('花束をプレゼントした')),'the gift is logged');
 assert(r.affection>before,'affection rises');
 assert(q.getMemories().some(m=>m.pairId===r.id&&m.title==='プレゼント'),'a memory is recorded');
});
test('a meal instruction becomes a one-time cafe meal',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 r.pendingInstruction='meal';r.pendingStamp=600;
 q.setClock(10,0);
 for(let i=0;i<10&&!q.getSharedGoal().goal;i++)q.tickLife();
 assert.equal(q.getSharedGoal().goal,'pair-date');
 assert.equal(q.getSharedGoal().kind,'meal');
 assert.equal(r.pendingInstruction,'','consumed when the meal starts');
 a.action='date';a.phaseState='staying';a.x=q.getCafeSeats()[0].x;a.y=q.getCafeSeats()[0].y;
 b.action='date';b.phaseState='staying';b.x=q.getCafeSeats()[1].x;b.y=q.getCafeSeats()[1].y;
 for(let i=0;i<25;i++)q.tickLife();
 assert(q.getMemories().some(m=>m.pairId===r.id&&m.title==='ふたりの食事時間'),'meal memory recorded');
});

test('proximity alone is not interaction: no gains, no shared-time log',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 q.setClock(10,0);
 a.x=400;a.y=900;b.x=440;b.y=900;a.phaseState='staying';b.phaseState='staying';a.action='bench';b.action='bench';
 a.lastInitiatedSocialStamp=600;b.lastInitiatedSocialStamp=600;r.lastChatStamp=-1;
 const snap={aff:r.affection,tru:r.trust,int:r.intimacy};
 const orig=Math.random;Math.random=()=>0.99;
 try{for(let i=0;i<30;i++)q.tickLife()}finally{Math.random=orig}
 assert.equal(r.affection,snap.aff);assert.equal(r.trust,snap.tru);assert.equal(r.intimacy,snap.int);
 assert(!q.getDiary().some(d=>d.text.includes('穏やかな時間を過ごした')),'no fabricated shared-time log');
 a.phaseState='moving';b.phaseState='moving';
 Math.random=()=>0;
 try{for(let i=0;i<10;i++)q.tickLife()}finally{Math.random=orig}
 assert(!q.getDiary().some(d=>d.text.startsWith(a.name+'と'+b.name+'が')&&d.text.includes('話')),'walking past never starts a chat');
});
test('nearby residents sometimes actually talk, and only then it counts',()=>{
 const q=loadModel(),[a,b]=q.chars,r=q.relationshipFor(a,b);
 q.setClock(10,0);
 const place=(actA,actB,dist)=>{a.x=400;a.y=900;b.x=400+dist;b.y=900;a.phaseState='staying';b.phaseState='staying';a.action=actA;b.action=actB;a.lastInitiatedSocialStamp=600;b.lastInitiatedSocialStamp=600;r.lastChatStamp=-1};
 const chats=()=>q.getDiary().filter(d=>d.text.startsWith(a.name+'と'+b.name+'が')&&(d.text.includes('話をした')||d.text.includes('近況を話した')||d.text.includes('言葉を交わした')));
 const orig=Math.random;Math.random=()=>0;
 try{
  place('bench','bench',40);
  const aff=r.affection;q.tickLife();
  assert.equal(chats().length,1,'a real chat is logged');
  assert(r.affection>aff,'the chat raises the relationship');
  const aff2=r.affection;
  for(let i=0;i<10;i++)q.tickLife();
  assert.equal(chats().length,1,'a pair does not chat again right away');
  assert.equal(r.affection,aff2,'no passive gains during the cooldown');
  place('cafe','walk',50);q.tickLife();
  assert.equal(chats().length,2);
  assert(!chats()[0].text.includes('喫茶店で'),'a place is only named when both are actually there');
  place('cafe','cafe',50);q.tickLife();
  assert(chats()[0].text.includes('喫茶店で少し話をした'),'both at the cafe can talk about it');
 }finally{Math.random=orig}
});

test('weekly support pays remittance and scholarship once per week',()=>{
 const q=loadModel(),p=q.chars[0];
 p.supportRemittance=true;p.supportRemittanceAmount=7000;p.supportScholarship=true;p.supportScholarshipAmount=5000;p.supportWeekKey=-1;
 q.setClock(12,0);const before=p.money;
 q.tickLife();assert.equal(p.money,before+12000);
 q.tickLife();assert.equal(p.money,before+12000,'no double payment within the same week');
 q.setDay(7);q.tickLife();assert.equal(p.money,before+24000);
 assert(q.getDiary().some(d=>d.text.includes('仕送り')),'remittance is logged');
 assert(q.getDiary().some(d=>d.text.includes('奨学金')),'scholarship is logged');
});
test('relief treat fires when a rich close partner can cover a broke one',()=>{
 const q=loadModel(),a=q.chars[0],b=q.chars[1];
 const rel=q.relationshipFor(a,b);rel.lastTreatDay=-1;
 a.money=15000;b.money=2000;
 a.action='walk';b.action='walk';a.phaseState='idle';b.phaseState='idle';
 q.setClock(12,0);
 assert.equal(q.tryAutoTreat(720),true);
 assert.equal(q.getTreat().by,a.id);assert.equal(q.getTreat().mode,'relief');
 a.action='date';b.action='date';a.phaseState='staying';b.phaseState='staying';
 a.x=1000;a.y=1000;b.x=1050;b.y=1000;
 for(let i=0;i<25;i++)q.tickLife();
 assert.equal(a.money,14100,'payer covers both meals at 450 each');
 assert(q.getDiary().some(d=>d.text.includes('食事をおごった')),'treat is logged');
});
test('affection treat fires randomly for close pairs regardless of money',()=>{
 const q=loadModel(),a=q.chars[0],b=q.chars[1];
 const rel=q.relationshipFor(a,b);rel.lastTreatDay=-1;
 a.money=5000;b.money=5000;
 a.action='walk';b.action='walk';a.phaseState='idle';b.phaseState='idle';
 q.setClock(12,0);
 const orig=Math.random;Math.random=()=>0.01;
 try{assert.equal(q.tryAutoTreat(720),true);assert.equal(q.getTreat().mode,'affection')}finally{Math.random=orig}
});
test('makanai feeds the resident when work completes',()=>{
 const q=loadModel(),p=q.chars[1];
 p.makanai=true;p.needs.hunger=40;p.pendingWorkPay={amount:1000,description:'バイト'};
 const before=p.money;q.completeWork(p);
 assert.equal(p.needs.hunger,70);
 assert.equal(p.money,before+1000);
 assert(q.getDiary().some(d=>d.text.includes('まかない')),'makanai is logged');
});

process.exitCode=failures?1:0;
