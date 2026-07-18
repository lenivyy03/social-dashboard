// Históricos ligeros de página permanecen en localStorage para las gráficas existentes.
function recordSnapshot(pageId,fans,posts){
  const today=new Date().toISOString().slice(0,10);
  if(!LS.snaps[pageId]) LS.snaps[pageId]=[];
  const arr=LS.snaps[pageId];
  const avgEng=posts.length?Math.round(posts.reduce((s,p)=>s+p._eng,0)/posts.length):0;
  const existing=arr.find(s=>s.date===today);
  if(existing){ existing.fans=fans; existing.avgEng=avgEng; }
  else arr.push({date:today,fans,avgEng});
  // Conserva algo más de un año para poder consultar la tendencia anual completa.
  if(arr.length>400) LS.snaps[pageId]=arr.slice(-400);
  LS.save();
  recordPostSnapshots(pageId,posts).catch(e=>console.warn('No se guardaron snapshots por post:',e));
}

// Los snapshots por publicación pueden crecer bastante: IndexedDB evita saturar localStorage.
const ANALYTICS_DB='social_dashboard_analytics';
const ANALYTICS_DB_VERSION=2;
const POST_SNAPSHOT_STORE='postSnapshots';
const PAGE_CACHE_STORE='pageCache';
const PAGE_CACHE_TTL_MS=2*60*60*1000;

function openAnalyticsDB(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB) return reject(new Error('IndexedDB no está disponible.'));
    const req=indexedDB.open(ANALYTICS_DB,ANALYTICS_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(POST_SNAPSHOT_STORE)){
        const store=db.createObjectStore(POST_SNAPSHOT_STORE,{keyPath:'key'});
        store.createIndex('pageId','pageId',{unique:false});
        store.createIndex('postId','postId',{unique:false});
        store.createIndex('capturedAt','capturedAt',{unique:false});
      }
      if(!db.objectStoreNames.contains(PAGE_CACHE_STORE)) db.createObjectStore(PAGE_CACHE_STORE,{keyPath:'pageId'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('No se pudo abrir el histórico.'));
  });
}

// Caché temporal y local del dispositivo. Nunca guarda tokens ni URLs de paginación.
async function savePageDataCache(pageId,data){
  if(!data?.posts) return;
  const db=await openAnalyticsDB();
  const tx=db.transaction(PAGE_CACHE_STORE,'readwrite');
  tx.objectStore(PAGE_CACHE_STORE).put({
    pageId:String(pageId),savedAt:Date.now(),
    data:{posts:data.posts,fans:data.fans||0,igFans:data.igFans||0,hasIG:!!data.hasIG,debug:data.debug||{fb:[],fbVideo:[],igPhoto:[],igVideo:[]},followerHistory:data.followerHistory||{fb:[],ig:[],year:new Date().getFullYear(),loaded:false},completeWindow:!data.paging?.fb&&!data.paging?.ig}
  });
  await transactionDone(tx); db.close();
}

async function getPageDataCache(pageId){
  const db=await openAnalyticsDB();
  const tx=db.transaction(PAGE_CACHE_STORE,'readonly');
  const done=transactionDone(tx);
  const req=tx.objectStore(PAGE_CACHE_STORE).get(String(pageId));
  const record=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});
  await done; db.close();
  if(!record||Date.now()-record.savedAt>PAGE_CACHE_TTL_MS) return null;
  const data=record.data;
  data.posts=filterRecentPosts(data.posts||[]).map(p=>({...p,_dt:new Date(p.created_time),_paid:!!LS.paid[p.id]}));
  return {...data,paging:{fb:null,ig:null},loadedMonths:4,loadingMore:false,fromCache:true,cachedAt:record.savedAt};
}

async function clearPageDataCache(){
  const db=await openAnalyticsDB();
  const tx=db.transaction(PAGE_CACHE_STORE,'readwrite');
  tx.objectStore(PAGE_CACHE_STORE).clear();
  await transactionDone(tx); db.close();
}

function postSnapshotRecord(pageId,p,capturedAt){
  const dateKey=capturedAt.slice(0,10); // un punto por día; se actualiza si abres varias veces
  return {
    key:`${pageId}|${p.id}|${dateKey}`,
    pageId:String(pageId),postId:String(p.id),capturedAt,
    postCreatedAt:p.created_time,ageHours:Math.max(0,Math.round((Date.now()-new Date(p.created_time).getTime())/3600000)),
    platform:p._plat,format:p._fmt,paid:!!p._paid,
    likes:p._likes||0,comments:p._comments||0,shares:p._shares||0,saved:p._saved||0,
    reach:p._reach||0,views:p._vviews||0,clicks:p._clicks||0,
    totalInteractions:p._totalInteractions||0,watchTime:p._watchTime||0,
    avgWatchTime:p._avgWatchTime||0,replays:p._replays||0,skipRate:p._skipRate||0,
    profileVisits:p._profileVisits||0,follows:p._follows||0
  };
}

async function recordPostSnapshots(pageId,posts){
  if(!posts?.length) return;
  const db=await openAnalyticsDB();
  const tx=db.transaction(POST_SNAPSHOT_STORE,'readwrite');
  const store=tx.objectStore(POST_SNAPSHOT_STORE);
  const capturedAt=new Date().toISOString();
  posts.forEach(p=>store.put(postSnapshotRecord(pageId,p,capturedAt)));
  await transactionDone(tx);
  db.close();
}

function transactionDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('Error guardando el histórico.'));
    tx.onabort=()=>reject(tx.error||new Error('Guardado cancelado.'));
  });
}

async function getPostSnapshots(pageId){
  const db=await openAnalyticsDB();
  const tx=db.transaction(POST_SNAPSHOT_STORE,'readonly');
  const done=transactionDone(tx);
  const req=tx.objectStore(POST_SNAPSHOT_STORE).index('pageId').getAll(String(pageId));
  const rows=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});
  await done; db.close();
  return rows.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
}

async function exportDashboardBackup(){
  const postSnapshots=currentPage?await getPostSnapshots(currentPage.id):[];
  const payload={version:1,exportedAt:new Date().toISOString(),pageId:currentPage?.id||null,
    personas:LS.personas,labDrafts:LS.labDrafts,outcomes:LS.outcomes,postSnapshots};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`social-dashboard-respaldo-${new Date().toISOString().slice(0,10)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

async function restorePostSnapshots(rows){
  if(!Array.isArray(rows)||!rows.length)return;
  const db=await openAnalyticsDB(),tx=db.transaction(POST_SNAPSHOT_STORE,'readwrite'),store=tx.objectStore(POST_SNAPSHOT_STORE);
  rows.forEach(row=>{if(row?.key&&row?.pageId&&row?.postId)store.put(row);});
  await transactionDone(tx);db.close();
}

function importDashboardBackup(input){
  const file=input.files?.[0];if(!file)return;
  const reader=new FileReader();reader.onload=async()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data||data.version!==1)throw new Error('Formato de respaldo no reconocido.');
      if(!confirm('¿Importar buyer personas, borradores, resultados y snapshots de este respaldo?'))return;
      LS.personas={...LS.personas,...(data.personas||{})};
      LS.labDrafts={...LS.labDrafts,...(data.labDrafts||{})};
      LS.outcomes={...LS.outcomes,...(data.outcomes||{})};LS.save();
      await restorePostSnapshots(data.postSnapshots||[]);renderView();
    }catch(e){alert('No se pudo importar el respaldo: '+e.message);}
  };reader.readAsText(file);input.value='';
}
