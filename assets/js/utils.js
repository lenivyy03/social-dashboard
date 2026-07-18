function avg(a){return a.length?a.reduce((s,v)=>s+(v||0),0)/a.length:0;}
function fmt(n){if(n===undefined||n===null)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toString();}
function fmtDate(d){const raw=String(d||'');if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){const [y,m,day]=raw.split('-');return `${day}/${m}/${y}`;}const dt=new Date(d);return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sk(n,h){return[...Array(n)].map(()=>`<div class="skel" style="height:${h}px;border-radius:12px"></div>`).join('');}
function loadedMonthCount(data){return Math.max(4,Number(data?.loadedMonths)||4);}
function loadedPeriodLabel(data){const count=loadedMonthCount(data);return `Últimos ${count} meses`;}

// Devuelve el snapshot de seguidores más cercano que ya existía cuando se publicó
// la pieza. Nunca usa seguidores actuales para estimar el rendimiento histórico.
function followerSnapshotForPost(post,snapshots=[]){
  const postDate=String(post.created_time||post._dt?.toISOString?.()||'').slice(0,10);
  if(!postDate) return null;
  return snapshots
    .filter(snapshot=>snapshot?.date&&snapshot.date<=postDate)
    .sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}

// Metodología compartida por Análisis y Reporte:
// 1) alcance real; 2) seguidores del snapshot de esa época; 3) exclusión.
function calculatePostER(post,snapshots=[]){
  const engagement=Number(post?._eng)||0,reach=Number(post?._reach)||0;
  if(reach>0) return {rankable:true,er:engagement/reach*100,denominator:reach,source:'reach',label:'alcance real',snapshotDate:null};
  const snapshot=followerSnapshotForPost(post,snapshots);
  if(!snapshot) return {rankable:false,er:null,denominator:0,source:'missing',label:'sin datos suficientes',snapshotDate:null};
  const followers=post?._plat==='IG'
    ? (Number(snapshot.igFans)>0?Number(snapshot.igFans):Number(snapshot.fans)||0)
    : Number(snapshot.fans)||0;
  if(followers<=0) return {rankable:false,er:null,denominator:0,source:'missing',label:'sin datos suficientes',snapshotDate:snapshot.date};
  return {rankable:true,er:engagement/followers*100,denominator:followers,source:'snapshot',label:'estimado',snapshotDate:snapshot.date};
}

// Percentil empírico dentro de la misma red y formato. Se crean objetos nuevos para
// no agregar campos temporales a las publicaciones guardadas en caché.
function scoreERPercentiles(rows){
  const groups=new Map();
  rows.forEach(row=>{
    const key=`${row.post._plat}|${row.post._fmt}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  });
  return rows.map(row=>{
    const group=groups.get(`${row.post._plat}|${row.post._fmt}`)||[];
    const atOrBelow=group.filter(candidate=>candidate.er<=row.er).length;
    return {...row,score:Number(((atOrBelow/Math.max(group.length,1))*10).toFixed(1)),sampleSize:group.length,sampleSmall:group.length<5};
  });
}

function firstCaptionLine(message){
  return String(message||'').split(/\r?\n/).map(line=>line.trim()).find(Boolean)||'Sin texto';
}

// Misma base del mapa de calor: engagement acumulado por día y hora.
function bestHistoricalSlot(posts,platform=null,format=null){
  const slots=new Map();
  posts.filter(post=>(!platform||post._plat===platform)&&(!format||post._fmt===format)).forEach(post=>{
    const dt=post._dt instanceof Date?post._dt:new Date(post.created_time);
    if(Number.isNaN(dt.getTime())) return;
    const key=`${dt.getDay()}-${dt.getHours()}`;
    slots.set(key,(slots.get(key)||0)+(Number(post._eng)||0));
  });
  let best=null;
  slots.forEach((value,key)=>{if(!best||value>best.value){const [day,hour]=key.split('-').map(Number);best={day,hour,value};}});
  return best;
}
