const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)}
// Minimal in-memory IndexedDB good enough for the game's wrapper.
const idbData=new Map();
function fakeReq(exec){const r={result:undefined,error:null,onsuccess:null,onerror:null};queueMicrotask(()=>{try{r.result=exec();if(r.onsuccess)r.onsuccess()}catch(e){r.error=e;if(r.onerror)r.onerror()}});return r}
const fakeDb={createObjectStore:()=>({}),transaction:()=>({objectStore:()=>({get:k=>fakeReq(()=>idbData.get(k)),put:(v,k)=>fakeReq(()=>{idbData.set(k,v);return k}),delete:k=>fakeReq(()=>{idbData.delete(k)})})})};
const fakeIndexedDB={open:()=>{const r={result:fakeDb,error:null,onsuccess:null,onerror:null,onupgradeneeded:null};queueMicrotask(()=>{if(r.onupgradeneeded)r.onupgradeneeded();if(r.onsuccess)r.onsuccess()});return r}};
let storage={};
const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Promise,Infinity,performance:{now:()=>0},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=String(v)},removeItem:k=>{delete storage[k]}},indexedDB:fakeIndexedDB,Image:class{constructor(){this.complete=false}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};
const KEY='komichi-life-save-v1';
function loadModel(){
 vm.createContext(b);
 const exported='globalThis.qa={chars,saveGame,serializeCurrentSave,rehydrateAvatarText,ready:()=>AVATAR_IDB.ready};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);
 return b.qa;
}
const tick=()=>new Promise(r=>setTimeout(r,10));
const assert=require('assert').strict;
(async()=>{
 // 1) An avatar set in memory is synced to IndexedDB, then stripped from the save.
 let q=loadModel();
 await tick();
 assert.equal(q.ready(),true);
 const yaku=q.chars.find(p=>p.id==='yaku');
 const marker='data:image/png;base64,AVATAR_MARKER_0123456789';
 yaku.avatarImage=marker;yaku.avatarMode='sheet';
 assert(q.saveGame());
 await tick();
 assert(idbData.get('avatar:yaku')===marker,'avatar was not synced to IndexedDB');
 assert(q.saveGame());
 const storedRaw=storage[KEY];
 assert(storedRaw&&!storedRaw.includes('AVATAR_MARKER'),'save still embeds the avatar image');
 const storedData=JSON.parse(storedRaw),storedYaku=storedData.residents.find(p=>p.id==='yaku');
 assert.equal(storedYaku.avatarStored,true);
 assert.equal(storedYaku.avatarImage,'');
 // 2) Reloading with the same storage + IndexedDB restores the avatar in memory.
 q=loadModel();
 await tick();await tick();
 const yaku2=q.chars.find(p=>p.id==='yaku');
 assert.equal(yaku2.avatarImage,marker,'avatar was not hydrated from IndexedDB');
 assert.equal(yaku2.avatarStored,true);
 // 3) Exporting the stored save re-embeds the image for portability.
 const exportedText=await q.rehydrateAvatarText(storage[KEY]);
 assert(exportedText.includes('AVATAR_MARKER'),'exported save does not embed the avatar');
 assert(!exportedText.includes('avatarStored'),'exported save kept the storage marker');
 // 4) Deleting the avatar removes it from IndexedDB and from later saves.
 yaku2.avatarImage='';
 assert(q.saveGame());
 await tick();
 assert(!idbData.has('avatar:yaku'),'deleted avatar stayed in IndexedDB');
 assert(q.saveGame());
 const afterDelete=JSON.parse(storage[KEY]).residents.find(p=>p.id==='yaku');
 assert(!afterDelete.avatarStored,'avatarStored marker survived deletion');
 console.log('avatar-storage: 4 PASS');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
