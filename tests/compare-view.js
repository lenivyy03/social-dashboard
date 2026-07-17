const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const memory=new Map(),elements={viewBody:{innerHTML:''},tblWrap:{innerHTML:''},tblWrapA:{innerHTML:''},tblWrapB:{innerHTML:''}};
const viewBody=elements.viewBody;
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{getElementById:id=>elements[id]||{}},navigator:{},SAVED_TOKEN:''
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/charts.js','assets/js/views.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

vm.runInContext(`
  monthKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  monthLabel=k=>{const [y,m]=k.split('-');return MONTHS_ES[Number(m)-1]+' '+y;};
  currentPage={id:'page-1'};platFilter='todos';compareFilter='todos';combineMode=false;
  drawBars=(posts,id,metric,max,order)=>{if(!globalThis.__charts)globalThis.__charts=[];__charts.push({id,count:posts.length,metric,max,order});};
  const originalRenderTable=renderTable;
  renderTable=posts=>{globalThis.__tableCount=posts.length;originalRenderTable(posts);};
  const makePost=(id,date)=>({id,_dt:new Date(date),created_time:date,_plat:'FB',_fmt:'Foto',_paid:false,_eng:10,_likes:5,_comments:3,_shares:2,_reach:100,_vviews:0,message:id});
  globalThis.__data={posts:[makePost('jul','2026-07-05T12:00:00'),makePost('jun','2026-06-05T12:00:00'),makePost('may','2026-05-05T12:00:00')]};
  compareMonthA='2026-07';compareMonthB=null;globalThis.__charts=[];
  viewComparar(__data);
`,context);

assert.equal(context.__tableCount,3,'Sin VS deben mostrarse todas las publicaciones');
assert.match(viewBody.innerHTML,/todas las publicaciones de los últimos 4 meses/i);
assert.deepEqual(Array.from(context.__charts,entry=>entry.id),['cBars']);

vm.runInContext(`compareMonthB='2026-06';globalThis.__charts=[];viewComparar(__data);`,context);
assert.deepEqual(Array.from(context.__charts,entry=>entry.id),['cBarsA','cBarsB']);
assert(context.__charts.every(entry=>entry.metric==='_eng'));
assert.equal(context.__charts[0].max,context.__charts[1].max,'Las gráficas VS deben compartir la misma escala');
assert.match(viewBody.innerHTML,/JUL 2026 VS JUN 2026/i);
assert.match(viewBody.innerHTML,/id="tblWrapA"/);
assert.match(viewBody.innerHTML,/id="tblWrapB"/);
assert.match(elements.tblWrapA.innerHTML,/jul/);
assert.match(elements.tblWrapB.innerHTML,/jun/);

vm.runInContext(`compareMetric='reach';globalThis.__charts=[];viewComparar(__data);`,context);
assert(context.__charts.every(entry=>entry.metric==='_reach'));
assert.match(viewBody.innerHTML,/Eje Y:<\/strong> Alcance/);

vm.runInContext(`
  renderView=()=>viewComparar(__data);
  globalThis.__charts=[];
  sortBy('likes');
`,context);
assert(context.__charts.every(entry=>entry.metric==='_likes'));
assert(context.__charts.every(entry=>entry.order==='desc'));
assert.match(viewBody.innerHTML,/Orden de barras y tablas/);
assert.match(viewBody.innerHTML,/Likes · mayor a menor/);

console.log('Compare view test OK: VS con dos tablas y orden compartido.');
