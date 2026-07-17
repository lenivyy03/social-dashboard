const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const canvas={parentElement:{clientWidth:900},getContext:()=>({})};
const context=vm.createContext({
  console,Date,Math,String,
  window:{devicePixelRatio:1},document:{getElementById:id=>id==='chart'?canvas:null}
});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/charts.js'),'utf8'),context,{filename:'assets/js/charts.js'});
vm.runInContext(`
  setupCanvas=()=>{};
  barChartLabeled=(ctx,W,H,data,labels,color,paid,max)=>{globalThis.__chart={data,labels,max};};
  globalThis.__posts=[
    {_dt:new Date('2026-06-18T12:00:00'),_plat:'FB',_likes:18,_paid:false},
    {_dt:new Date('2026-06-01T12:00:00'),_plat:'FB',_likes:1,_paid:false},
    {_dt:new Date('2026-06-08T12:00:00'),_plat:'IG',_likes:8,_paid:false}
  ];
  drawBars([
    {_dt:new Date('2026-06-18T12:00:00'),_plat:'FB',_likes:18,_paid:false},
    {_dt:new Date('2026-06-01T12:00:00'),_plat:'FB',_likes:1,_paid:false},
    {_dt:new Date('2026-06-08T12:00:00'),_plat:'IG',_likes:8,_paid:false}
  ],'chart','_likes',25);
`,context);

assert.deepEqual(Array.from(context.__chart.data),[1,8,18]);
assert.deepEqual(Array.from(context.__chart.labels),['01/06·F','08/06·I','18/06·F']);
assert.equal(context.__chart.max,25);

vm.runInContext(`drawBars(__posts,'chart','_likes',25,'desc');`,context);
assert.deepEqual(Array.from(context.__chart.data),[18,8,1]);
assert.deepEqual(Array.from(context.__chart.labels),['18/06·F','08/06·I','01/06·F']);
vm.runInContext(`drawBars(__posts,'chart','_likes',25,'asc');`,context);
assert.deepEqual(Array.from(context.__chart.data),[1,8,18]);
console.log('Chart order test OK: cronológico, mayor a menor o menor a mayor.');
