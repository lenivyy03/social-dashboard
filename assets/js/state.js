// ═══════════════════════════════════════════════════
//  SOCIAL DASHBOARD v4 — Angel Ortega
//  Meta Graph API v25.0 | Multi-view analytics
// ═══════════════════════════════════════════════════
const API='https://graph.facebook.com/v25.0';
const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const IG_COMMON_METRICS=['reach','saved','shares','total_interactions','views','impressions','profile_visits','profile_activity','follows'];
const IG_VIDEO_EXTRA_METRICS=['plays','video_views','ig_reels_video_view_total_time','ig_reels_avg_watch_time','clips_replays_count','reels_skip_rate'];
let TOKEN='', pages=[], currentPage=null, currentView='resumen', platFilter='todos';
let cache={};                    // {pageId: {posts, fans, platform}}
let sortState={col:'eng',dir:'desc'};
let compareFilter='todos';       // todos | organico | pagado
let combineMode=false;           // muestra piezas vinculadas manualmente (FB+IG confirmadas) combinadas en una fila
let monthFilter=null;            // null=todos los posts cacheados; Set de 'YYYY-MM' si hay mes(es) elegido(s)

const GOALS={
  reach:{label:'Alcance',metric:'_reach'},
  views:{label:'Reproducciones',metric:'_vviews'},
  retention:{label:'Retención',metric:'_avgWatchTime'},
  likes:{label:'Likes',metric:'_likes'},
  comments:{label:'Comentarios',metric:'_comments'},
  saves:{label:'Guardados',metric:'_saved'},
  shares:{label:'Compartidos',metric:'_shares'},
  clicks:{label:'Clics',metric:'_clicks'},
  messages:{label:'Mensajes',outcome:'messages'},
  leads:{label:'Prospectos',outcome:'leads'},
  sales:{label:'Ventas',outcome:'sales'},
  revenue:{label:'Ingresos',outcome:'revenue'}
};

// ── localStorage helpers ──
const LS={
  paid:JSON.parse(localStorage.getItem('sd_paid')||'{}'),         // {postId:true}
  snaps:JSON.parse(localStorage.getItem('sd_snaps')||'{}'),       // {pageId:[{date,fans,avgEng}]}
  pairs:JSON.parse(localStorage.getItem('sd_pairs')||'[]'),       // [{fb:postId, ig:postId}] piezas confirmadas como la misma
  rejected:JSON.parse(localStorage.getItem('sd_rejected')||'[]'), // ["fbId|igId"] sugerencias descartadas
  personas:JSON.parse(localStorage.getItem('sd_personas')||'{}'), // {pageId:[buyer persona]}
  labDrafts:JSON.parse(localStorage.getItem('sd_lab_drafts')||'{}'),
  outcomes:JSON.parse(localStorage.getItem('sd_outcomes')||'{}'), // {postId:{messages,leads,sales,revenue}}
  save(){
    localStorage.setItem('sd_paid',JSON.stringify(this.paid));
    localStorage.setItem('sd_snaps',JSON.stringify(this.snaps));
    localStorage.setItem('sd_pairs',JSON.stringify(this.pairs));
    localStorage.setItem('sd_rejected',JSON.stringify(this.rejected));
    localStorage.setItem('sd_personas',JSON.stringify(this.personas));
    localStorage.setItem('sd_lab_drafts',JSON.stringify(this.labDrafts));
    localStorage.setItem('sd_outcomes',JSON.stringify(this.outcomes));
  }
};

window.addEventListener('DOMContentLoaded',()=>{
  TOKEN=SAVED_TOKEN||localStorage.getItem('meta_token')||'';
  if(TOKEN) init(); else openTM();
});
