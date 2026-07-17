const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const bundle=process.argv[2];
if(!bundle) throw new Error('Uso: node tests/excel-smoke.js /ruta/xlsx.bundle.js');
const xlsxContext={window:{},self:{},console,Date,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setTimeout,clearTimeout};
xlsxContext.globalThis=xlsxContext;
vm.runInNewContext(fs.readFileSync(path.resolve(bundle),'utf8'),xlsxContext,{filename:bundle});
const XLSX=xlsxContext.XLSX||xlsxContext.window.XLSX||xlsxContext.self.XLSX;
assert(XLSX,'El bundle del navegador debe exponer XLSX');
let captured=null;
let capturedFileName='';
XLSX.writeFile=(wb,fileName)=>{ captured=wb; capturedFileName=fileName; };

const root=path.resolve(__dirname,'..');
const memory=new Map();
const context=vm.createContext({
  console,XLSX,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{getElementById:()=>null},navigator:{clipboard:{writeText:()=>Promise.resolve()}},
  alert:message=>{throw new Error(message);},setTimeout,clearTimeout,Date,Math,Number,String,Set,Map,JSON
});

for(const file of ['assets/js/state.js','assets/js/utils.js','assets/js/reports.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

vm.runInContext(`
  pages=[{id:'page-1',name:'Cliente de Prueba'}];
  const fbDate=new Date('2026-07-10T18:00:00Z');
  const igDate=new Date('2026-07-11T18:00:00Z');
  const makePost=(id,platform,date)=>({
    id,_plat:platform,_dt:date,created_time:date.toISOString(),_fmt:'Video',_paid:false,
    message:'Publicación de ejemplo',_likes:12,_comments:3,_shares:2,_saved:1,
    _eng:17,_reach:450,_impr:600,_vviews:300
  });
  cache={'page-1':{posts:[makePost('fb-1','FB',fbDate),makePost('ig-1','IG',igDate)]}};
  LS.pairs=[{fb:'fb-1',ig:'ig-1',auto:false}];
  exportXLSX('page-1');
`,context);

assert(captured,'La exportación debe producir un libro');
assert.deepEqual(Array.from(captured.SheetNames),['Facebook','Instagram','General','Vinculadas']);
for(const name of captured.SheetNames){
  const sheet=captured.Sheets[name];
  assert(sheet.A1?.s?.fill,'Cada hoja debe tener un título con estilo');
  assert(sheet.A4?.s?.font?.bold,'Cada hoja debe tener encabezados destacados');
  assert(sheet['!autofilter'],'Cada hoja debe tener filtros de columna');
}
assert.equal(captured.Sheets.Facebook.A5.t,'d','Las fechas deben conservarse como fechas de Excel');
assert.equal(captured.Sheets.General.A1.v,'Cliente de Prueba · REPORTE GENERAL');
assert.match(captured.Sheets.General.A2.v,/Ventana: últimos 4 meses/);
assert.match(capturedFileName,/ultimos_4_meses/);

if(process.argv[3]){
  const bytes=XLSX.write(captured,{bookType:'xlsx',type:'array',cellStyles:true});
  fs.writeFileSync(path.resolve(process.argv[3]),Buffer.from(bytes));
}

console.log('Excel smoke test OK: 4 hojas, estilos, filtros y fechas reales.');
