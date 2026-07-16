const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const localAssets=[...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m=>m[1]);
assert(localAssets.length>0,'index.html debe referenciar los archivos modulares');
localAssets.forEach(asset=>assert(fs.existsSync(path.join(root,asset)),`Falta ${asset}`));

for(const dir of ['assets/js','assets/css']){
  assert(fs.existsSync(path.join(root,dir)),`Falta ${dir}`);
}

const memory=new Map();
const context=vm.createContext({
  console,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},
  document:{getElementById:()=>null},
  navigator:{},
  confirm:()=>true,
  alert:()=>{},
  setTimeout,clearTimeout,
  Date,Math,Number,String,Set,Map,JSON
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/laboratory.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

assert.equal(vm.runInContext("surfaceFormat('reel')",context),'Video');
assert.equal(vm.runInContext("surfaceFormat('carousel')",context),'Álbum');
assert.equal(vm.runInContext("GOALS.sales.outcome",context),'sales');
assert.equal(vm.runInContext("blankPersona().name",context),'Nuevo buyer persona');

vm.runInContext(`
  currentPage={id:'page-1',name:'Cliente'};
  LS.paid={};LS.outcomes={};
  globalThis.__benchmark=buildBenchmark({posts:[
    {id:'a',_plat:'IG',_fmt:'Video',_paid:false,_likes:10,_reach:100},
    {id:'b',_plat:'IG',_fmt:'Video',_paid:false,_likes:20,_reach:200},
    {id:'c',_plat:'FB',_fmt:'Video',_paid:false,_likes:100,_reach:1000}
  ]},{platform:'instagram',surface:'reel',distribution:'organic',primaryGoal:'likes'});
`,context);
const benchmark=context.__benchmark;
assert.equal(benchmark.sample,2);
assert.equal(benchmark.mean,15);
assert.equal(benchmark.top[0].value,20);

console.log(`Smoke test OK: ${localAssets.length} assets y funciones principales validadas.`);
