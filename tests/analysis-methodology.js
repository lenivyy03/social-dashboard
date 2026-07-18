const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const context=vm.createContext({console,Date,Math,Number,String,Set,Map,JSON});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/utils.js'),'utf8'),context,{filename:'assets/js/utils.js'});

const results=vm.runInContext(`
  const snapshots=[
    {date:'2026-01-01',fans:100,igFans:80},
    {date:'2026-02-01',fans:200,igFans:160}
  ];
  [
    calculatePostER({_eng:20,_reach:100,_plat:'FB',created_time:'2026-01-15T12:00:00Z'},snapshots),
    calculatePostER({_eng:10,_reach:0,_plat:'FB',created_time:'2026-01-15T12:00:00Z'},snapshots),
    calculatePostER({_eng:8,_reach:0,_plat:'IG',created_time:'2026-01-15T12:00:00Z'},snapshots),
    calculatePostER({_eng:5,_reach:0,_plat:'FB',created_time:'2025-12-15T12:00:00Z'},snapshots)
  ];
`,context);

assert.equal(results[0].label,'alcance real');
assert.equal(results[0].er,20);
assert.equal(results[1].label,'estimado');
assert.equal(results[1].denominator,100,'Debe usar el snapshot anterior más cercano, no seguidores actuales');
assert.equal(results[1].er,10);
assert.equal(results[2].denominator,80,'Instagram debe usar igFans cuando existe');
assert.equal(results[2].er,10);
assert.equal(results[3].rankable,false);

const scored=vm.runInContext(`scoreERPercentiles([
  {post:{id:'a',_plat:'FB',_fmt:'Foto'},er:1},
  {post:{id:'b',_plat:'FB',_fmt:'Foto'},er:2},
  {post:{id:'c',_plat:'FB',_fmt:'Foto'},er:3},
  {post:{id:'d',_plat:'IG',_fmt:'Foto'},er:100}
])`,context);
assert.deepEqual(Array.from(scored.slice(0,3),row=>row.score),[3.3,6.7,10]);
assert.equal(scored[3].score,10,'El percentil se calcula dentro de la misma red y formato');
assert(scored.every(row=>row.sampleSmall));

console.log('Analysis methodology test OK: ER de 3 niveles y percentiles por red/formato.');
