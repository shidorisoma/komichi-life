const fs=require('fs'),vm=require('vm'),noop=()=>{};
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];new Function(src);
const ctx=new Proxy({measureText:s=>({width:s.length*7}),createPattern:()=>({setTransform:noop}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{id,clientWidth:390,clientHeight:844,style:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],querySelector:()=>el('child'),appendChild:noop});return els.get(id)};
let testNow=0;const storage={};
const b={console,Math,Date,Set,Map,WeakMap,JSON,Number,String,Object,Array,Infinity,performance:{now:()=>testNow},document:{getElementById:el,createElement:()=>el('created'),querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:noop,body:el('body')},window:{addEventListener:noop,__SPRITE_DATA__:{nagisumi:{'stand-front':'data:builtin192x192','stand-left':'data:builtin192x192','walk-right-0':'data:builtin192x192','walk-right-1':'data:builtin192x192','walk-right-2':'data:builtin192x192','walk-right-3':'data:builtin192x192'}}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Image:class{constructor(){this.complete=false}set src(v){this._src=v;this.complete=true;const m=/(\d+)x(\d+)/.exec(v||'');this.naturalWidth=m?+m[1]:192;this.naturalHeight=m?+m[2]:192}get src(){return this._src}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setInterval:noop,setTimeout:noop,clearTimeout:noop,DOMMatrix:class{scale(){return this}},alert:noop,confirm:()=>true};
function loadModel(){
 vm.createContext(b);
 const exported='globalThis.qa={spriteImageFor,avatarFrameFor,chars};})();';
 vm.runInContext(src.replace(/\}\)\(\);\s*$/,exported),b);return b.qa;
}
const assert=require('assert').strict,q=loadModel();
const nagi=q.chars[0],yaku=q.chars[1];
assert.equal(nagi.kind,'nagisumi');assert.equal(yaku.kind,'yaku');
// No avatar: built-in set is used for nagisumi, nothing for yaku (shape fallback).
const builtin=q.spriteImageFor(nagi);
assert(builtin&&builtin._src==='data:builtin192x192','built-in sprite expected without avatar');
assert.equal(q.spriteImageFor(yaku),null,'yaku must fall back to shapes without avatar or built-in set');
// Sheet avatar on yaku: standing faces spriteDir (format rows: front/right/left/back, so left -> row 2, col 0).
Object.assign(yaku,{avatarImage:'data:sheet800x800',avatarMode:'sheet',phaseState:'staying',action:'walk',socialPartnerId:null,spriteDir:'left',x:1000,y:1000});
let frame=q.avatarFrameFor(yaku);
assert(frame&&frame.image,'sheet avatar frame expected');
assert.equal(frame.sw,200);assert.equal(frame.sh,200);
assert.equal(frame.sx,0);assert.equal(frame.sy,400);
// Moving right cycles walk columns 0..3 by time (row 1 in the new format).
Object.assign(yaku,{phaseState:'moving',routePoints:[{x:1200,y:1000}],routeIndex:0,tx:1200,ty:1000});
testNow=0;frame=q.avatarFrameFor(yaku);assert.equal(frame.sy,200);assert.equal(frame.sx,0);
testNow=170;frame=q.avatarFrameFor(yaku);assert.equal(frame.sx,200);
testNow=330;frame=q.avatarFrameFor(yaku);assert.equal(frame.sx,400);
testNow=490;frame=q.avatarFrameFor(yaku);assert.equal(frame.sx,600);
assert.equal(yaku.spriteDir,'right');
// Avatar takes priority over the built-in set.
Object.assign(nagi,{avatarImage:'data:sheet800x800',avatarMode:'sheet',phaseState:'staying',action:'walk',socialPartnerId:null,spriteDir:'front'});
const prioritized=q.spriteImageFor(nagi);
assert(prioritized&&prioritized.image,'avatar must win over built-in sprite');
assert.equal(prioritized.sy,0);
// Single-image mode returns the image itself for every state.
Object.assign(yaku,{avatarImage:'data:single500x700',avatarMode:'single',phaseState:'moving'});
const single=q.avatarFrameFor(yaku);
assert(single&&single._src==='data:single500x700','single mode must return the whole image');
// Clearing the avatar restores the previous behaviour.
yaku.avatarImage='';assert.equal(q.avatarFrameFor(yaku),null);
nagi.avatarImage='';const restored=q.spriteImageFor(nagi);
assert(restored&&restored._src==='data:builtin192x192','clearing avatar must restore built-in sprite');
console.log('avatar-images: 9 PASS');
