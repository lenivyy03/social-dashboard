// ── Load data (FB + insights) ──
async function loadPageData(pageId){
  if(cache[pageId]) return;
  const t=window._pt[pageId]||TOKEN;
  const page=pages.find(p=>p.id===pageId);
  const igId=page?.instagram_business_account?.id||null;
  const debug={fb:[],fbVideo:[],igPhoto:[],igVideo:[]}; // qué métricas respondieron OK, para diagnóstico

  // ── FACEBOOK (primeras 50 — carga inicial rápida; el resto se trae bajo demanda
  // con "Cargar publicaciones más viejas" usando el cursor de paginación de Meta) ──
  const [pr,pi]=await Promise.all([
    api(`/${pageId}/posts?fields=id,message,created_time,full_picture,status_type,attachments{media_type,type},likes.summary(true),comments.summary(true),shares&limit=50`,t),
    api(`/${pageId}?fields=fan_count,followers_count`,t)
  ]);
  const fbPosts=pr.data||[];
  fbPosts.forEach(p=>{ p._plat='FB'; p._fmt=getFormat(p); });
  const fbDebug=await enrichFBPosts(fbPosts,t);
  debug.fb=fbDebug.fb; debug.fbVideo=fbDebug.fbVideo;

  // ── INSTAGRAM (primeras 50, mismo esquema de paginación bajo demanda) ──
  let igPosts=[], igFans=0, igPagingNext=null;
  if(igId){
    try{
      const [mr,ii]=await Promise.all([
        api(`/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=50`,t),
        api(`/${igId}?fields=followers_count`,t)
      ]);
      igFans=ii.followers_count||0;
      igPosts=(mr.data||[]).map(igMediaToPost);
      const igDebug=await enrichIGPosts(igPosts,t);
      debug.igPhoto=igDebug.igPhoto; debug.igVideo=igDebug.igVideo;
      igPagingNext=mr.paging?.next||null;
    }catch(e){ console.warn('IG no cargo:',e.message); }
  }

  // ── MERGE ──
  const posts=[...fbPosts,...igPosts];
  posts.forEach(p=>{
    p._eng=(p._likes||0)+(p._comments||0)+(p._shares||0);
    p._dt=new Date(p.created_time);
    p._paid=!!LS.paid[p.id];
  });
  posts.sort((a,b)=>b._dt-a._dt);

  // Piezas del MISMO día se vinculan automático (en la práctica casi nunca falla).
  // Diferencias de 1+ día siguen pidiendo confirmación manual en "Vincular piezas".
  autoLinkSameDay(fbPosts,igPosts);

  const fans=pi.fan_count||pi.followers_count||0;
  cache[pageId]={posts,fans,igFans,hasIG:!!igId,debug,paging:{fb:pr.paging?.next||null,ig:igPagingNext},loadingMore:false};
  recordSnapshot(pageId,fans,posts);
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
async function enrichFBPosts(fbPosts,t){
  // Meta deprecó post_impressions/post_impressions_unique/post_video_views (nov 2025 y jun 2026).
  // Reemplazo oficial: post_media_view. Probamos varias candidatas y usamos las que sí respondan.
  // 'post_activity_by_action_type' es un desglose por tipo de acción que puede incluir "save" —
  // es experimental, si no existe simplemente no se usa (el probe la descarta sola).
  let fbMetrics=[];
  if(fbPosts.length) fbMetrics=await probeMetrics(sampleIds(fbPosts),['post_impressions_unique','post_impressions','post_media_view','post_clicks','post_activity_by_action_type'],t);
  const ins=await batchInsights(fbPosts.map(p=>p.id),fbMetrics,t);
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
  let fbVideoMetrics=[];
  const fbVids=fbPosts.filter(p=>p._fmt==='Video');
  if(fbVids.length){
    fbVideoMetrics=await probeMetrics(sampleIds(fbVids),['post_video_views','post_media_view'],t);
    if(fbVideoMetrics.length){
      const vi=await batchInsights(fbVids.map(p=>p.id),fbVideoMetrics,t);
      fbVids.forEach((p,i)=>{ p._vviews=vi[i]?.post_video_views||vi[i]?.post_media_view||0; });
    }
    // Si no hubo métrica de video dedicada, al menos usa post_media_view ya obtenido arriba
    fbVids.forEach(p=>{ if(!p._vviews && p._ins?.post_media_view) p._vviews=p._ins.post_media_view; });
  }
  return {fb:fbMetrics,fbVideo:fbVideoMetrics};
}

// Igual que enrichFBPosts pero para Instagram — separa foto/álbum vs video porque
// Meta permite distintas métricas según el tipo de contenido (reach puede vivir en
// fotos y estar muerto en Reels, o viceversa).
async function enrichIGPosts(igPosts,t){
  const igNoVid=igPosts.filter(p=>p._fmt!=='Video');
  const igVidAll=igPosts.filter(p=>p._fmt==='Video');
  let igMetricsPhoto=[], igMetricsVideo=[];
  if(igNoVid.length) igMetricsPhoto=await probeMetrics(sampleIds(igNoVid),IG_COMMON_METRICS,t);
  if(igVidAll.length) igMetricsVideo=await probeMetrics(sampleIds(igVidAll),[...IG_COMMON_METRICS,...IG_VIDEO_EXTRA_METRICS],t);
  if(igNoVid.length){
    const insP=await batchInsights(igNoVid.map(p=>p.id),igMetricsPhoto,t);
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
    const insV=await batchInsights(igVidAll.map(p=>p.id),igMetricsVideo,t);
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

// Trae el siguiente lote (más viejo) de FB y/o IG usando el cursor "paging.next" que
// ya trae Meta en la respuesta — no hace falta reconstruir la URL a mano.
async function loadMorePosts(pageId){
  const data=cache[pageId];
  if(!data||data.loadingMore) return;
  if(!data.paging||(!data.paging.fb&&!data.paging.ig)) return;
  const t=window._pt[pageId]||TOKEN;
  data.loadingMore=true; renderView();
  try{
    let newFb=[], newIg=[];
    if(data.paging.fb){
      const pr=await apiUrl(data.paging.fb);
      newFb=pr.data||[];
      newFb.forEach(p=>{ p._plat='FB'; p._fmt=getFormat(p); });
      const fbDebug=await enrichFBPosts(newFb,t);
      data.debug.fb=[...new Set([...data.debug.fb,...fbDebug.fb])];
      data.debug.fbVideo=[...new Set([...data.debug.fbVideo,...fbDebug.fbVideo])];
      data.paging.fb=pr.paging?.next||null;
    }
    if(data.paging.ig){
      const mr=await apiUrl(data.paging.ig);
      newIg=(mr.data||[]).map(igMediaToPost);
      const igDebug=await enrichIGPosts(newIg,t);
      data.debug.igPhoto=[...new Set([...data.debug.igPhoto,...igDebug.igPhoto])];
      data.debug.igVideo=[...new Set([...data.debug.igVideo,...igDebug.igVideo])];
      data.paging.ig=mr.paging?.next||null;
    }
    [...newFb,...newIg].forEach(p=>{
      p._eng=(p._likes||0)+(p._comments||0)+(p._shares||0);
      p._dt=new Date(p.created_time);
      p._paid=!!LS.paid[p.id];
    });
    data.posts=[...data.posts,...newFb,...newIg].sort((a,b)=>b._dt-a._dt);
    autoLinkSameDay(data.posts.filter(p=>p._plat==='FB'),data.posts.filter(p=>p._plat==='IG'));
    recordSnapshot(pageId,data.fans,data.posts);
  }catch(e){ alert('No se pudieron cargar más publicaciones: '+e.message); }
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
