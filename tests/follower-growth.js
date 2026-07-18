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

  vm.runInContext(`api=async()=>({data:[{name:'follower_count',values:[{value:2,end_time:'2026-01-03T08:00:00+0000'}]}]});`,context);
  const instagramHistory=await vm.runInContext(`fetchInstagramFollowerHistory('ig-1','token',2026)`,context);
  assert.equal(instagramHistory[0].value,2);

  let call=0;
  vm.runInContext(`globalThis.__igCall=0;api=async()=>++__igCall===1?{data:[]}:{data:[{name:'follower_count',values:[{value:2,end_time:'2026-06-03T08:00:00+0000'}]}]};`,context);
  const incompleteInstagram=await vm.runInContext(`fetchInstagramFollowerHistory('ig-1','token',2026)`,context);
  assert.equal(incompleteInstagram.length,0,'Instagram incompleto debe mostrarse como no disponible');

  vm.runInContext(`
    globalThis.__view={innerHTML:''};
    document.getElementById=id=>id==='viewBody'?__view:null;
    P=data=>data.posts;drawTimeline=()=>{};drawGrowth=()=>{};
    currentPage={id:'page-1'};
    cache={'page-1':{posts:[],fans:100,igFans:80,hasIG:true,followerHistory:{year:2026,fb:[{date:'2026-01-02',value:5}],ig:[],loaded:true}}};
    viewResumen(cache['page-1']);
  `,context);
  assert.match(context.__view.innerHTML,/Facebook/);
  assert.match(context.__view.innerHTML,/\+5/);
  assert.match(context.__view.innerHTML,/Instagram/);
  assert.match(context.__view.innerHTML,/No disponible/);
  console.log('Follower growth test OK: Facebook anual e Instagram no disponible si está incompleto.');
})().catch(error=>{console.error(error);process.exitCode=1;});
