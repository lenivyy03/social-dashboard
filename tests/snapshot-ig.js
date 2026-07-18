const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..'),memory=new Map();
const context=vm.createContext({
  console,Date,Math,Number,String,Set,Map,JSON,Promise,setTimeout,clearTimeout,
  localStorage:{getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))},
  window:{addEventListener:()=>{}},document:{},navigator:{},SAVED_TOKEN:''
});

for(const file of ['assets/js/state.js','assets/js/storage.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

vm.runInContext(`
  recordPostSnapshots=async()=>{};
  recordSnapshot('page-1',120,85,[{_eng:10},{_eng:20}]);
`,context);

const snapshot=vm.runInContext(`LS.snaps['page-1'][0]`,context);
assert.equal(snapshot.fans,120);
assert.equal(snapshot.igFans,85);
assert.equal(snapshot.avgEng,15);

vm.runInContext(`
  LS.snaps['legacy']=[{date:'2025-01-01',fans:50,avgEng:3}];
  recordSnapshot('legacy',55,[{_eng:4}]);
`,context);
assert.equal(vm.runInContext(`LS.snaps.legacy[0].igFans`,context),undefined,'Las entradas antiguas sin igFans siguen siendo válidas');

console.log('Snapshot IG test OK: guarda igFans y conserva compatibilidad con entradas antiguas.');
