const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const memory=new Map();
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,Promise,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{},_pt:{'page-1':'token'}},document:{},navigator:{},SAVED_TOKEN:'',
  alert:message=>{throw new Error(message);}
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/meta-api.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

(async()=>{
  vm.runInContext(`
    pages=[{id:'page-1',name:'Cliente'}];
    const range=olderMonthRange(4);
    globalThis.__since=Math.floor(range.start.getTime()/1000);
    globalThis.__until=Math.floor(range.end.getTime()/1000);
    globalThis.__monthDate=new Date(range.start.getFullYear(),range.start.getMonth(),10,12).toISOString();
    globalThis.__paths=[];
    cache={'page-1':{posts:[],fans:100,hasIG:false,loadedMonths:4,loadingMore:false,debug:{fb:[],fbVideo:[],igPhoto:[],igVideo:[]}}};
    api=async path=>{__paths.push(path);return {data:[{id:'older-fb',created_time:__monthDate,message:'Mes anterior',likes:{summary:{total_count:4}},comments:{summary:{total_count:1}},shares:{count:1}}],paging:{}};};
    enrichFBPosts=async posts=>{posts.forEach(p=>p._reach=25);return {fb:['post_media_view'],fbVideo:[]};};
    enrichIGPosts=async()=>({igPhoto:[],igVideo:[]});
    renderView=()=>{};autoLinkSameDay=()=>{};recordSnapshot=()=>{};savePageDataCache=async()=>{};
  `,context);

  await vm.runInContext(`loadMorePosts('page-1')`,context);
  assert.equal(vm.runInContext("cache['page-1'].loadedMonths",context),5);
  assert.equal(vm.runInContext("cache['page-1'].posts[0].id",context),'older-fb');
  assert.match(context.__paths[0],new RegExp(`since=${context.__since}`));
  assert.match(context.__paths[0],new RegExp(`until=${context.__until}`));
  console.log('Older month test OK: agrega exactamente un mes y amplía la ventana.');
})().catch(error=>{console.error(error);process.exitCode=1;});
