const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const memory=new Map(),viewBody={innerHTML:''};
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{getElementById:id=>id==='viewBody'?viewBody:{}},navigator:{},SAVED_TOKEN:''
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/views.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

vm.runInContext(`
  monthKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  monthLabel=k=>{const [y,m]=k.split('-');return MONTHS_ES[Number(m)-1]+' '+y;};
  currentPage={id:'page-1'};platFilter='todos';compareFilter='todos';combineMode=false;
  drawBars=(posts,id,metric,max)=>{if(!globalThis.__charts)globalThis.__charts=[];__charts.push({id,count:posts.length,metric,max});};
  renderTable=posts=>{globalThis.__tableCount=posts.length;};
  const makePost=(id,date)=>({id,_dt:new Date(date),created_time:date,_plat:'FB',_fmt:'Foto',_paid:false,_eng:10,_likes:5,_comments:3,_shares:2,_reach:100,_vviews:0,message:id});
  globalThis.__data={posts:[makePost('jul','2026-07-05T12:00:00'),makePost('jun','2026-06-05T12:00:00'),makePost('may','2026-05-05T12:00:00')]};
  compareMonthA='2026-07';compareMonthB=null;globalThis.__charts=[];
  viewComparar(__data);
`,context);

assert.equal(context.__tableCount,3,'Sin VS deben mostrarse todas las publicaciones');
assert.match(viewBody.innerHTML,/todas las publicaciones de los últimos 4 meses/i);
assert.deepEqual(Array.from(context.__charts,entry=>entry.id),['cBars']);

vm.runInContext(`compareMonthB='2026-06';globalThis.__charts=[];viewComparar(__data);`,context);
assert.equal(context.__tableCount,2,'Con VS deben mostrarse solamente los dos meses elegidos');
assert.deepEqual(Array.from(context.__charts,entry=>entry.id),['cBarsA','cBarsB']);
assert(context.__charts.every(entry=>entry.metric==='_eng'));
assert.equal(context.__charts[0].max,context.__charts[1].max,'Las gráficas VS deben compartir la misma escala');
assert.match(viewBody.innerHTML,/JUL 2026 VS JUN 2026/i);

vm.runInContext(`compareMetric='reach';globalThis.__charts=[];viewComparar(__data);`,context);
assert(context.__charts.every(entry=>entry.metric==='_reach'));
assert.match(viewBody.innerHTML,/Eje Y:<\/strong> Alcance/);

console.log('Compare view test OK: vista completa sin VS y dos gráficas con VS.');
