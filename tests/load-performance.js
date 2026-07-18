const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const memory=new Map();
const context=vm.createContext({
  console,setTimeout,clearTimeout,Date,Math,Number,String,Set,Map,JSON,Promise,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{},_pt:{'page-1':'token'}},document:{},navigator:{},SAVED_TOKEN:''
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/meta-api.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

(async()=>{
  vm.runInContext(`
    pages=[{id:'page-1',name:'Cliente',instagram_business_account:{id:'ig-1'}}];
    cache={};
    globalThis.__starts=[];globalThis.__progress=[];
    getPageDataCache=async()=>null;
    savePageDataCache=async()=>{};
    recordSnapshot=()=>{};
    autoLinkSameDay=()=>{};
    api=async path=>{
      __starts.push({path,time:Date.now()});
      await new Promise(resolve=>setTimeout(resolve,35));
      if(path.includes('/posts?')) return {data:[{id:'fb',created_time:'2026-07-10T18:00:00Z',message:'FB',likes:{summary:{total_count:2}},comments:{summary:{total_count:1}},shares:{count:1}}],paging:{}};
      if(path.includes('/media?')) return {data:[{id:'ig',timestamp:'2026-07-11T18:00:00Z',caption:'IG',media_type:'IMAGE',like_count:3,comments_count:1}],paging:{}};
      if(path.startsWith('/ig-1?')) return {followers_count:200};
      return {fan_count:100};
    };
    enrichFBPosts=async posts=>{await new Promise(resolve=>setTimeout(resolve,70));posts.forEach(p=>p._reach=10);return {fb:['post_media_view'],fbVideo:[]};};
    enrichIGPosts=async posts=>{await new Promise(resolve=>setTimeout(resolve,70));posts.forEach(p=>p._reach=20);return {igPhoto:['reach'],igVideo:[]};};
    fetchPageFollowerHistory=async()=>[{date:'2026-01-02',value:2,source:'meta',metric:'page_daily_follows'}];
  `,context);

  const started=Date.now();
  await vm.runInContext(`loadPageData('page-1',phase=>__progress.push({phase,time:Date.now()}))`,context);
  const starts=context.__starts;
  const fb=starts.find(x=>x.path.includes('/posts?')),ig=starts.find(x=>x.path.includes('/media?'));
  assert(fb&&ig,'Deben iniciar Facebook e Instagram');
  assert(Math.abs(fb.time-ig.time)<15,'Facebook e Instagram deben comenzar en paralelo');
  assert.equal(context.__progress[0].phase,'base');
  assert(context.__progress[0].time-started<80,'La vista básica debe aparecer antes de terminar los insights');
  assert.equal(vm.runInContext("cache['page-1'].metricsLoading",context),false);
  assert.equal(vm.runInContext("cache['page-1'].posts.length",context),2);
  assert.equal(vm.runInContext("cache['page-1'].followerHistory.fb[0].value",context),2);

  console.log('Load performance test OK: redes paralelas y render progresivo.');
})().catch(error=>{console.error(error);process.exitCode=1;});
