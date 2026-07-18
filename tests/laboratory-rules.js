const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..'),memory=new Map();
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{getElementById:()=>null,querySelector:()=>null},navigator:{},SAVED_TOKEN:''
});
for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/laboratory.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

const igReel=vm.runInContext(`validGoalIds('instagram','reel')`,context);
assert(igReel.includes('retention'));
assert(igReel.includes('saves'));
assert(!igReel.includes('clicks'));

const fbPhoto=vm.runInContext(`validGoalIds('facebook','photo')`,context);
assert(fbPhoto.includes('clicks'));
assert(!fbPhoto.includes('retention'));
assert(!fbPhoto.includes('saves'));

const reset=vm.runInContext(`
  const draft={platform:'facebook',surface:'photo',primaryGoal:'retention',secondaryGoal:'saves'};
  const changes=normalizeLabGoals(draft);
  ({draft,changes});
`,context);
assert.equal(reset.draft.primaryGoal,'reach');
assert.equal(reset.draft.secondaryGoal,'reach');
assert.equal(reset.changes.length,2);

const benchmark=vm.runInContext(`
  currentPage={id:'page-1'};LS.outcomes={};
  buildBenchmark({posts:[
    {id:'a',_plat:'IG',_fmt:'Video',_paid:false,_saved:4,_dt:new Date('2026-01-01'),created_time:'2026-01-01',message:'Hook ganador\\nMás texto'},
    {id:'b',_plat:'IG',_fmt:'Video',_paid:false,_saved:0,_dt:new Date('2026-01-02'),created_time:'2026-01-02',message:'Sin dato'},
    {id:'c',_plat:'IG',_fmt:'Video',_paid:false,_saved:0,_dt:new Date('2026-01-03'),created_time:'2026-01-03',message:'Sin dato'},
    {id:'d',_plat:'IG',_fmt:'Video',_paid:false,_saved:0,_dt:new Date('2026-01-04'),created_time:'2026-01-04',message:'Sin dato'}
  ]},{platform:'instagram',surface:'reel',distribution:'organic',primaryGoal:'saves'},'saves');
`,context);
assert.equal(benchmark.lowAvailability,true);
assert.match(benchmark.availabilityNote,/1 de 4 posts/);
assert.equal(benchmark.top.length,1,'El Top no debe incluir publicaciones con valor cero');
assert.equal(benchmark.top[0].hook,'Hook ganador');

console.log('Laboratory rules test OK: objetivos por contexto y benchmark honesto.');
