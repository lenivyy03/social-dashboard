const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const memory=new Map();
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{},navigator:{},SAVED_TOKEN:''
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/meta-api.js','assets/js/views.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

const series=vm.runInContext(`buildAnnualFollowerSeries([
  {date:'2026-01-02',value:2},{date:'2026-01-04',value:1}
],2026,new Date('2026-01-04T12:00:00Z'))`,context);
assert.equal(series.length,4);
assert.deepEqual(Array.from(series,p=>p.value),[0,2,0,1]);

const windows=vm.runInContext(`followerHistoryWindows(2026,new Date('2026-07-18T12:00:00Z'))`,context);
assert(windows.length>=3,'El año debe dividirse en ventanas aceptables para Meta');
assert.equal(windows[0].since,Date.UTC(2026,0,1)/1000);

(async()=>{
  vm.runInContext(`
    globalThis.__followerPaths=[];
    api=async path=>{__followerPaths.push(path);return {data:[{name:'page_daily_follows',values:[{value:3,end_time:'2026-01-02T08:00:00+0000'}]}]};};
  `,context);
  const history=await vm.runInContext(`fetchPageFollowerHistory('page-1','token',2026)`,context);
  assert.equal(history[0].value,3);
  assert(context.__followerPaths.every(path=>path.includes('metric=page_daily_follows')));
  console.log('Follower growth test OK: año completo y métrica diaria de Meta.');
})().catch(error=>{console.error(error);process.exitCode=1;});
