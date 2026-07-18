// ── Load data (FB + insights) ──
// Ventana visible: mes calendario actual + los tres meses anteriores.
// Ejemplo: durante julio se conservan publicaciones desde el 1 de abril.
function recentPostsCutoff(now=new Date()){
  return new Date(now.getFullYear(),now.getMonth()-3,1,0,0,0,0);
}
function filterRecentPosts(posts,now=new Date()){
  const cutoff=recentPostsCutoff(now).getTime();
  return posts.filter(p=>new Date(p.created_time).getTime()>=cutoff);
}
function shouldContinueRecentPaging(posts,now=new Date()){
  if(!posts.length) return false;
  const cutoff=recentPostsCutoff(now).getTime();
  return posts.every(p=>new Date(p.created_time).getTime()>=cutoff);
}

function olderMonthRange(loadedMonths=4,now=new Date()){
  const count=Math.max(4,Number(loadedMonths)||4);
  const start=new Date(now.getFullYear(),now.getMonth()-count,1,0,0,0,0);
  const end=new Date(start.getFullYear(),start.getMonth()+1,1,0,0,0,0);
  return {start,end,key:`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}`};
}

async function fetchPeriodPages(path,t){
  const items=[];
  let response=await api(path,t),pagesLoaded=0;
  while(response&&pagesLoaded<20){
    items.push(...(response.data||[]));
    pagesLoaded++;
    const next=response.paging?.next;
    if(!next) break;
    response=await apiUrl(next);
  }
  return items;
}

function followerHistoryWindows(year,now=new Date()){
  const y=Number(year),todayYear=now.getFullYear();
  const start=new Date(Date.UTC(y,0,1));
  const endExclusive=y===todayYear
    ? new Date(Date.UTC(y,now.getMonth(),now.getDate()+1))
    : new Date(Date.UTC(y+1,0,1));
  const windows=[];
  for(let cursor=new Date(start);cursor<endExclusive;){
    const until=new Date(Math.min(cursor.getTime()+89*86400000,endExclusive.getTime()));
    windows.push({since:Math.floor(cursor.getTime()/1000),until:Math.floor(until.getTime()/1000)});
    cursor=until;
  }
  return windows;
}

async function fetchPageFollowerHistory(pageId,t,year=new Date().getFullYear()){
  const windows=followerHistoryWindows(year);
  try{
    const responses=await Promise.all(windows.map(w=>api(`/${pageId}/insights?metric=page_daily_follows&period=day&since=${w.since}&until=${w.until}`,t)));
    const byDate=new Map();
    responses.forEach(response=>{
      const metric=(response.data||[]).find(row=>row.name==='page_daily_follows')||(response.data||[])[0];
      (metric?.values||[]).forEach(point=>{
        const date=String(point.end_time||point.date||'').slice(0,10);
        if(date) byDate.set(date,Number(point.value)||0);
      });
    });
    return [...byDate].map(([date,value])=>({date,value,source:'meta',metric:'page_daily_follows'})).sort((a,b)=>a.date.localeCompare(b.date));
  }catch(e){
    console.warn('Meta no entregó el histórico anual de seguidores de Facebook:',e.message);
    return [];
  }
}

async function fetchInstagramFollowerHistory(igId,t,year=new Date().getFullYear(),now=new Date()){
  const windowDays=30;
  const until=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
  const since=new Date(until.getTime()-windowDays*86400000);
  try{
    const response=await api(`/${igId}/insights?metric=follower_count&period=day&since=${Math.floor(since.getTime()/1000)}&until=${Math.floor(until.getTime()/1000)}`,t);
    const metric=(response.data||[]).find(row=>row.name==='follower_count');
    const byDate=new Map();
    (metric?.values||[]).forEach(point=>{
      const date=String(point.end_time||point.date||'').slice(0,10);
      if(date) byDate.set(date,Number(point.value)||0);
    });
    const rows=[...byDate].map(([date,value])=>({date,value,source:'meta',metric:'follower_count'})).sort((a,b)=>a.date.localeCompare(b.date));
    return {rows,windowDays,year:Number(year)};
  }catch(e){
    console.warn('Instagram no entregó seguidores nuevos de los últimos 30 días:',e.message);
    return {rows:[],windowDays,year:Number(year)};
  }
}

function prepareLoadedPosts(posts){
  posts.forEach(p=>{
    if(p._plat==='FB'){
      p._likes=p.likes?.summary?.total_count||p._likes||0;
      p._comments=p.comments?.summary?.total_count||p._comments||0;
      p._shares=p.shares?.count||p._shares||0;
    }
    for(const key of ['_impr','_clicks','_vviews','_reach','_saved','_totalInteractions','_watchTime','_avgWatchTime','_replays','_skipRate','_profileVisits','_follows']) if(p[key]===undefined) p[key]=0;
    p._eng=(p._likes||0)+(p._comments||0)+(p._shares||0);
    p._dt=new Date(p.created_time);
    p._paid=!!LS.paid[p.id];
  });
  return posts.sort((a,b)=>b._dt-a._dt);
}

async function loadPageData(pageId,onProgress){
  if(cache[pageId]) return;
  try{
    const saved=await getPageDataCache(pageId);
    if(saved){
      cache[pageId]=saved; recordSnapshot(pageId,saved.fans,saved.hasIG&&saved.igFans>0?saved.igFans:undefined,saved.posts); onProgress?.('cache');
      // Si ya cubre toda la ventana, dos horas de caché bastan. Si aún había
      // paginación, se muestra al instante y se actualiza en segundo plano.
      if(saved.completeWindow&&saved.followerHistory?.loaded) return;
    }
  }catch(e){ console.warn('Caché local no disponible:',e.message); }
  const t=window._pt[pageId]||TOKEN;
  const page=pages.find(p=>p.id===pageId);
  const igId=page?.instagram_business_account?.id||null;
  const debug={fb:[],fbVideo:[],igPhoto:[],igVideo:[]}; // qué métricas respondieron OK, para diagnóstico
  const followerYear=new Date().getFullYear();
  const followerHistoryTask=fetchPageFollowerHistory(pageId,t,followerYear);
  const igFollowerHistoryTask=igId?fetchInstagramFollowerHistory(igId,t,followerYear):Promise.resolve({rows:[],windowDays:30,year:followerYear});

  const facebookBase=Promise.all([
    api(`/${pageId}/posts?fields=id,message,created_time,full_picture,status_type,attachments{media_type,type},likes.summary(true),comments.summary(true),shares&limit=50`,t),
    api(`/${pageId}?fields=fan_count,followers_count`,t)
  ]);
  const instagramBase=igId?Promise.all([
    api(`/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=50`,t),
    api(`/${igId}?fields=followers_count`,t)
  ]).then(([mr,ii])=>({mr,ii})).catch(e=>{console.warn('IG no cargo:',e.message);return {mr:{data:[],paging:{}},ii:{}};}):Promise.resolve({mr:{data:[],paging:{}},ii:{}});

  // Facebook e Instagram arrancan al mismo tiempo.
  const [[pr,pi],{mr,ii}]=await Promise.all([facebookBase,instagramBase]);
  const fbRaw=pr.data||[];
  const fbPosts=filterRecentPosts(fbRaw);
  fbPosts.forEach(p=>{ p._plat='FB'; p._fmt=getFormat(p); });
  const igRaw=(mr.data||[]).map(igMediaToPost);
  const igPosts=filterRecentPosts(igRaw);
  const posts=prepareLoadedPosts(filterRecentPosts([...fbPosts,...igPosts]));
  const fans=pi.fan_count||pi.followers_count||0,igFans=ii.followers_count||0;
  cache[pageId]={posts,fans,igFans,hasIG:!!igId,debug,followerHistory:{fb:[],ig:{rows:[],windowDays:30,year:followerYear},year:followerYear,loaded:false},paging:{fb:shouldContinueRecentPaging(fbRaw)?(pr.paging?.next||null):null,ig:shouldContinueRecentPaging(igRaw)?(mr.paging?.next||null):null},loadedMonths:4,loadingMore:false,metricsLoading:true,fromCache:false};
  onProgress?.('base');

  // Las métricas de ambas redes se completan en paralelo mientras la interfaz ya es visible.
  const [fbDebug,igDebug,fbFollowerHistory,igFollowerHistory]=await Promise.all([enrichFBPosts(fbPosts,t,pageId),enrichIGPosts(igPosts,t,pageId),followerHistoryTask,igFollowerHistoryTask]);
  debug.fb=fbDebug.fb; debug.fbVideo=fbDebug.fbVideo;
  debug.igPhoto=igDebug.igPhoto; debug.igVideo=igDebug.igVideo;
  cache[pageId].followerHistory.fb=fbFollowerHistory;
  cache[pageId].followerHistory.ig=igFollowerHistory;
  cache[pageId].followerHistory.loaded=true;
  prepareLoadedPosts(posts);
  cache[pageId].metricsLoading=false;
  onProgress?.('followers');

  // Piezas del MISMO día se vinculan automático (en la práctica casi nunca falla).
  // Diferencias de 1+ día siguen pidiendo confirmación manual en "Vincular piezas".
  autoLinkSameDay(fbPosts,igPosts);

  recordSnapshot(pageId,fans,igId&&ii.followers_count!==undefined?igFans:undefined,posts);
  savePageDataCache(pageId,cache[pageId]).catch(e=>console.warn('No se guardó la caché:',e.message));
}

function igMediaToPost(m){
  return {
    id:m.id,
    message:m.caption||'',
    created_time:m.timestamp,
    full_picture:m.media_type==='VIDEO'?(m.thumbnail_url||m.media_url||''):(m.media_url||''),
    _plat:'IG',
    _fmt:m.media_type==='VIDEO'?'Video':(m.media_type==='CAROUSEL_ALBUM'?'Álbum':'Foto'),
    _likes:m.like_count||0,
    _comments:m.comments_count||0,
    _shares:0,
    _impr:0,_clicks:0,_vviews:0,_reach:0,_saved:0,_totalInteractions:0,
    _watchTime:0,_avgWatchTime:0,_replays:0,_skipRate:0,_profileVisits:0,_follows:0,_ins:{}
  };
}

// Prueba y trae insights de Facebook para un lote de posts (mutan in-place). Reutilizable
// tanto para la carga inicial como para los lotes de "cargar más viejas".
async function enrichFBPosts(fbPosts,t,pageId='global'){
  // Meta deprecó post_impressions/post_impressions_unique/post_video_views (nov 2025 y jun 2026).
  // Reemplazo oficial: post_media_view. Probamos varias candidatas y usamos las que sí respondan.
  // 'post_activity_by_action_type' es un desglose por tipo de acción que puede incluir "save" —
  // es experimental, si no existe simplemente no se usa (el probe la descarta sola).
  const fbVids=fbPosts.filter(p=>p._fmt==='Video');
  const [fbMetrics,fbVideoMetrics]=await Promise.all([
    fbPosts.length?supportedMetrics(`${pageId}:fb`,sampleIds(fbPosts),['post_impressions_unique','post_impressions','post_media_view','post_clicks','post_activity_by_action_type'],t):[],
    fbVids.length?supportedMetrics(`${pageId}:fb-video`,sampleIds(fbVids),['post_video_views','post_media_view'],t):[]
  ]);
  const [ins,vi]=await Promise.all([
    batchInsights(fbPosts.map(p=>p.id),fbMetrics,t),
    batchInsights(fbVids.map(p=>p.id),fbVideoMetrics,t)
  ]);
  fbPosts.forEach((p,i)=>{
    p._ins=ins[i]||{};
    p._reach=p._ins.post_impressions_unique||p._ins.post_impressions||p._ins.post_media_view||0;
    p._impr=p._ins.post_impressions||p._ins.post_media_view||0;
    p._clicks=p._ins.post_clicks||0;
    p._vviews=0;
    p._saved=(p._ins.post_activity_by_action_type&&typeof p._ins.post_activity_by_action_type==='object')?(p._ins.post_activity_by_action_type.save||0):0;
    p._likes=p.likes?.summary?.total_count||0;
    p._comments=p.comments?.summary?.total_count||0;
    p._shares=p.shares?.count||0;
  });
  if(fbVids.length){
    fbVids.forEach((p,i)=>{ p._vviews=vi[i]?.post_video_views||vi[i]?.post_media_view||0; });
    // Si no hubo métrica de video dedicada, al menos usa post_media_view ya obtenido arriba
    fbVids.forEach(p=>{ if(!p._vviews && p._ins?.post_media_view) p._vviews=p._ins.post_media_view; });
  }
  return {fb:fbMetrics,fbVideo:fbVideoMetrics};
}

// Igual que enrichFBPosts pero para Instagram — separa foto/álbum vs video porque
// Meta permite distintas métricas según el tipo de contenido (reach puede vivir en
// fotos y estar muerto en Reels, o viceversa).
async function enrichIGPosts(igPosts,t,pageId='global'){
  const igNoVid=igPosts.filter(p=>p._fmt!=='Video');
  const igVidAll=igPosts.filter(p=>p._fmt==='Video');
  const [igMetricsPhoto,igMetricsVideo]=await Promise.all([
    igNoVid.length?supportedMetrics(`${pageId}:ig-photo`,sampleIds(igNoVid),IG_COMMON_METRICS,t):[],
    igVidAll.length?supportedMetrics(`${pageId}:ig-video`,sampleIds(igVidAll),[...IG_COMMON_METRICS,...IG_VIDEO_EXTRA_METRICS],t):[]
  ]);
  const [insP,insV]=await Promise.all([
    batchInsights(igNoVid.map(p=>p.id),igMetricsPhoto,t),
    batchInsights(igVidAll.map(p=>p.id),igMetricsVideo,t)
  ]);
  if(igNoVid.length){
    igNoVid.forEach((p,i)=>{
      p._ins=insP[i]||{};
      p._reach=p._ins.reach||p._ins.impressions||0;
      p._saved=p._ins.saved||0;
      p._shares=p._ins.shares||0;
      p._totalInteractions=p._ins.total_interactions||0;
      p._profileVisits=p._ins.profile_visits||p._ins.profile_activity||0;
      p._follows=p._ins.follows||0;
      p._vviews=p._ins.views||0;
    });
  }
  if(igVidAll.length){
    igVidAll.forEach((p,i)=>{
      p._ins=insV[i]||{};
      p._reach=p._ins.reach||0;
      p._saved=p._ins.saved||0;
      p._shares=p._ins.shares||0;
      p._totalInteractions=p._ins.total_interactions||0;
      p._vviews=p._ins.plays||p._ins.views||p._ins.video_views||0;
      p._watchTime=p._ins.ig_reels_video_view_total_time||0;
      p._avgWatchTime=p._ins.ig_reels_avg_watch_time||0;
      p._replays=p._ins.clips_replays_count||0;
      p._skipRate=p._ins.reels_skip_rate||0;
      p._profileVisits=p._ins.profile_visits||p._ins.profile_activity||0;
      p._follows=p._ins.follows||0;
    });
  }
  return {igPhoto:igMetricsPhoto,igVideo:igMetricsVideo};
}

// Agrega un mes calendario anterior completo. La carga inicial sigue siendo de cuatro
// meses; cada clic amplía la ventana exactamente un mes, sin depender del cursor inicial.
async function loadMorePosts(pageId){
  const data=cache[pageId];
  if(!data||data.loadingMore) return;
  const t=window._pt[pageId]||TOKEN;
  const page=pages.find(p=>p.id===pageId);
  const igId=page?.instagram_business_account?.id||null;
  const range=olderMonthRange(loadedMonthCount(data));
  const since=Math.floor(range.start.getTime()/1000),until=Math.floor(range.end.getTime()/1000);
  data.loadingMore=true; renderView();
  try{
    const fbTask=(async()=>{
      const fbRaw=await fetchPeriodPages(`/${pageId}/posts?fields=id,message,created_time,full_picture,status_type,attachments{media_type,type},likes.summary(true),comments.summary(true),shares&since=${since}&until=${until}&limit=50`,t);
      const newFb=fbRaw;
      newFb.forEach(p=>{ p._plat='FB'; p._fmt=getFormat(p); });
      const fbDebug=await enrichFBPosts(newFb,t,pageId);
      return {posts:newFb,debug:fbDebug};
    })();
    const igTask=igId?(async()=>{
      const igRaw=(await fetchPeriodPages(`/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&since=${since}&until=${until}&limit=50`,t)).map(igMediaToPost);
      const newIg=igRaw;
      const igDebug=await enrichIGPosts(newIg,t,pageId);
      return {posts:newIg,debug:igDebug};
    })().catch(e=>{console.warn('No se cargó el mes anterior de Instagram:',e.message);return {posts:[],debug:{igPhoto:[],igVideo:[]}};}):Promise.resolve({posts:[],debug:{igPhoto:[],igVideo:[]}});
    const [fbResult,igResult]=await Promise.all([fbTask,igTask]);
    const newFb=fbResult.posts,newIg=igResult.posts;
    data.debug.fb=[...new Set([...data.debug.fb,...fbResult.debug.fb])];
    data.debug.fbVideo=[...new Set([...data.debug.fbVideo,...fbResult.debug.fbVideo])];
    data.debug.igPhoto=[...new Set([...data.debug.igPhoto,...igResult.debug.igPhoto])];
    data.debug.igVideo=[...new Set([...data.debug.igVideo,...igResult.debug.igVideo])];
    const byId=new Map(data.posts.map(p=>[p.id,p]));
    prepareLoadedPosts([...newFb,...newIg]).forEach(p=>byId.set(p.id,p));
    data.posts=prepareLoadedPosts([...byId.values()]);
    data.loadedMonths=loadedMonthCount(data)+1;
    autoLinkSameDay(data.posts.filter(p=>p._plat==='FB'),data.posts.filter(p=>p._plat==='IG'));
    recordSnapshot(pageId,data.fans,data.hasIG&&data.igFans>0?data.igFans:undefined,data.posts);
    savePageDataCache(pageId,data).catch(e=>console.warn('No se guardó la caché:',e.message));
  }catch(e){ alert('No se pudo cargar el mes anterior: '+e.message); }
  data.loadingMore=false;
  renderView();
}

// Vincula automáticamente pares FB+IG publicados el mismo día calendario.
// Respeta lo que ya rechazaste antes (no vuelve a proponer lo que ya dijiste que no es igual).
function autoLinkSameDay(fbPosts,igPosts){
  let changed=false;
  fbPosts.forEach(fp=>{
    if(isLinked(fp.id)) return;
    const fpDay=fp._dt.toISOString().slice(0,10);
    let match=null;
    igPosts.forEach(ip=>{
      if(match||isLinked(ip.id)) return;
      if(LS.rejected.includes(pairKey(fp.id,ip.id))) return;
      if(ip._dt.toISOString().slice(0,10)===fpDay) match=ip;
    });
    if(match){ LS.pairs.push({fb:fp.id,ig:match.id,auto:true}); changed=true; }
  });
  if(changed) LS.save();
}

function getFormat(p){
  const st=p.status_type||'', att=p.attachments?.data?.[0];
  const t1=String(att?.media_type||'').toLowerCase(), t2=String(att?.type||'').toLowerCase();
  if(st==='added_video'||t1==='video'||t2.includes('video')||t2.includes('reel')) return 'Video';
  if(t1==='album'||t2==='album') return 'Álbum';
  if(st==='added_photos'||t1==='photo'||t2.includes('photo')) return 'Foto';
  if(t2==='share'||st==='shared_story') return 'Link';
  if(p.full_picture) return 'Foto';
  return 'Texto';
}


// ════════ INSIGHTS BATCH ════════
async function batchInsights(ids,metrics,token){
  if(!ids.length||!metrics.length) return ids.map(()=>({}));
  const out=ids.map(()=>({}));
  // Meta limita batch a 50 requests → dividir en chunks
  for(let start=0;start<ids.length;start+=50){
    const chunk=ids.slice(start,start+50);
    try{
      const batch=chunk.map(id=>({method:'GET',relative_url:`${id}/insights?metric=${metrics.join(',')}`}));
      const res=await fetch(`${API}/?batch=${encodeURIComponent(JSON.stringify(batch))}&include_headers=false&access_token=${encodeURIComponent(token)}`,{method:'POST'});
      const data=await res.json();
      if(Array.isArray(data)){
        data.forEach((item,i)=>{
          if(!item||item.code!==200) return;
          try{ const body=JSON.parse(item.body); const r={}; (body.data||[]).forEach(m=>{r[m.name]=m.values?.[0]?.value||0;}); out[start+i]=r; }
          catch{}
        });
      }
    }catch{}
  }
  return out;
}

// Prueba qué métricas acepta Meta para este tipo de contenido (una métrica inválida tira toda la llamada)
// Prueba qué métricas acepta Meta usando VARIOS posts de muestra (no solo uno) — si el
// primer post es un caso raro (muy viejo, tipo especial), esto evita perder métricas
// que sí funcionan para el resto. Regresa la unión de lo que respondió código 200.
async function probeMetrics(sampleIdOrIds,candidates,token){
  const ids=Array.isArray(sampleIdOrIds)?sampleIdOrIds:[sampleIdOrIds];
  const valid=new Set();
  for(const id of ids){
    try{
      const batch=candidates.map(m=>({method:'GET',relative_url:`${id}/insights?metric=${m}`}));
      const res=await fetch(`${API}/?batch=${encodeURIComponent(JSON.stringify(batch))}&include_headers=false&access_token=${encodeURIComponent(token)}`,{method:'POST'});
      const data=await res.json();
      if(Array.isArray(data)) candidates.forEach((m,i)=>{ if(data[i]&&data[i].code===200) valid.add(m); });
    }catch{}
  }
  return [...valid];
}

// La compatibilidad de métricas cambia poco: recordarla por 24h evita repetir hasta
// 12 solicitudes de diagnóstico en cada apertura sin ocultar futuras depreciaciones.
const METRIC_SUPPORT_TTL_MS=24*60*60*1000;
async function supportedMetrics(key,sampleIdsValue,candidates,token){
  const cacheKey=`v25:${key}`;
  const saved=LS.metricSupport[cacheKey];
  if(saved&&Date.now()-saved.savedAt<METRIC_SUPPORT_TTL_MS&&Array.isArray(saved.metrics)){
    return saved.metrics.filter(metric=>candidates.includes(metric));
  }
  const metrics=await probeMetrics(sampleIdsValue,candidates,token);
  if(metrics.length){ LS.metricSupport[cacheKey]={savedAt:Date.now(),metrics}; LS.save(); }
  return metrics;
}

// Elige hasta 3 posts representativos (primero, medio, último) para probar métricas
function sampleIds(arr){
  if(!arr.length) return [];
  if(arr.length<=3) return arr.map(p=>p.id);
  const idxs=[...new Set([0,Math.floor(arr.length/2),arr.length-1])];
  return idxs.map(i=>arr[i].id);
}


async function api(path,token){const t=token||TOKEN,sep=path.includes('?')?'&':'?';const r=await fetch(`${API}${path}${sep}access_token=${encodeURIComponent(t)}`);const d=await r.json();if(d.error)throw new Error(d.error.message);return d;}
// Para "paging.next": Meta ya regresa una URL absoluta con el cursor y el token incluidos.
async function apiUrl(url){const r=await fetch(url);const d=await r.json();if(d.error)throw new Error(d.error.message);return d;}
