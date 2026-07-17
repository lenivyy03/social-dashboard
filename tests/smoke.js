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

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/meta-api.js','assets/js/laboratory.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

assert.equal(vm.runInContext("surfaceFormat('reel')",context),'Video');
assert.equal(vm.runInContext("surfaceFormat('carousel')",context),'Álbum');
assert.equal(vm.runInContext("GOALS.sales.outcome",context),'sales');
assert.equal(vm.runInContext("COMPARE_CHART_METRICS.eng.key",context),'_eng');
assert.equal(vm.runInContext("COMPARE_CHART_METRICS.reach.label",context),'Alcance');
assert.equal(vm.runInContext("blankPersona().name",context),'Nuevo buyer persona');
assert.match(html,/xlsx-js-style@1\.2\.0/,'La exportación debe cargar la versión de Excel con estilos');

const appSource=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');
const viewSource=fs.readFileSync(path.join(root,'assets/js/views.js'),'utf8');
const reportSource=fs.readFileSync(path.join(root,'assets/js/reports.js'),'utf8');
const storageSource=fs.readFileSync(path.join(root,'assets/js/storage.js'),'utf8');
assert.match(appSource,/function renderMonthDropdown/);
assert.doesNotMatch(appSource,/function toggleMonth/);
assert.match(viewSource,/function monthComparisonPanel/);
assert.match(viewSource,/function growthYearControl/);
assert.match(reportSource,/function styledExcelSheet/);
assert.match(reportSource,/Piezas Vinculadas|PIEZAS VINCULADAS/);
assert.match(viewSource,/cBarsA/);
assert.match(viewSource,/cBarsB/);
assert.match(viewSource,/const chartPosts=compareMonthB\?[^:]+:allFiltered/);
assert.match(storageSource,/PAGE_CACHE_TTL_MS=2\*60\*60\*1000/);
assert.match(storageSource,/PAGE_CACHE_STORE='pageCache'/);
assert.match(fs.readFileSync(path.join(root,'assets/js/meta-api.js'),'utf8'),/Promise\.all\(\[facebookBase,instagramBase\]\)/);
assert.match(fs.readFileSync(path.join(root,'assets/js/meta-api.js'),'utf8'),/METRIC_SUPPORT_TTL_MS=24\*60\*60\*1000/);
assert.equal(vm.runInContext("recentPostsCutoff(new Date('2026-07-16T12:00:00')).toISOString().slice(0,10)",context),'2026-04-01');
assert.equal(vm.runInContext("filterRecentPosts([{created_time:'2026-03-31T23:59:59'},{created_time:'2026-04-01T08:00:00Z'}],new Date('2026-07-16T12:00:00')).length",context),1);
assert.equal(vm.runInContext("shouldContinueRecentPaging([{created_time:'2026-04-02T00:00:00'}],new Date('2026-07-16T12:00:00'))",context),true);
assert.equal(vm.runInContext("shouldContinueRecentPaging([{created_time:'2026-03-31T23:59:59'}],new Date('2026-07-16T12:00:00'))",context),false);

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
