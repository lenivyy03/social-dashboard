async function init(){
  setStatus('loading');
  try{ await loadPages(); setStatus('ok','Conectado'); }
  catch(e){ setStatus('err','Token inválido'); welcomeErr(e.message); }
}

// ── Pages ──
async function loadPages(){
  const r=await api('/me/accounts?fields=id,name,access_token,fan_count,followers_count,picture,instagram_business_account&limit=25');
  if(!r.data?.length) throw new Error('No se encontraron páginas.');
  pages=r.data; window._pt={};
  pages.forEach(p=>{ window._pt[p.id]=p.access_token; });
  renderSidebar();
  selectPage(pages[0].id);
}

function renderSidebar(){
  document.getElementById('pgList').innerHTML=pages.map((p,i)=>{
    const pic=p.picture?.data?.url||'';
    return `<button class="pg-btn${i===0?' active':''}" id="b-${p.id}" onclick="selectPage('${p.id}',this)">
      <div class="pg-icon">${pic?`<img src="${pic}"/>`:(p.name[0]||'?')}</div>
      <div class="pg-info"><div class="pg-name">${esc(p.name)}</div>
      <div class="pg-fans">${fmt(p.fan_count||p.followers_count||0)} seg.${p.instagram_business_account?' 📸':''}</div></div></button>`;
  }).join('');
}

function selectPage(id, btn){
  const page=pages.find(p=>p.id===id); if(!page) return;
  document.querySelectorAll('.pg-btn').forEach(b=>b.classList.remove('active'));
  (btn||document.getElementById(`b-${id}`))?.classList.add('active');
  document.getElementById('cmpBtn').classList.remove('active');
  currentPage=page; currentView='resumen'; closeSB();
  renderShell(page);
  loadPageData(page.id).then(()=>{ initMonthFilter(); renderView(); }).catch(e=>{ document.getElementById('viewBody').innerHTML=`<div class="state-box"><div class="ico">⚠️</div><h3>Error</h3><p>${esc(e.message)}</p></div>`; });
}

// Mes por default: el mes calendario actual si hay posts ahí; si no, el mes más
// reciente que sí tenga posts. El usuario puede luego elegir "Todos" o varios meses.
function initMonthFilter(){
  const data=cache[currentPage.id]; if(!data){ monthFilter=null; return; }
  const months=[...new Set(data.posts.map(p=>monthKey(p._dt)))].sort().reverse();
  const nowKey=monthKey(new Date());
  if(months.includes(nowKey)) monthFilter=new Set([nowKey]);
  else if(months.length) monthFilter=new Set([months[0]]);
  else monthFilter=null;
}
function monthKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }

function renderMonthChips(data){
  const months=[...new Set(data.posts.map(p=>monthKey(p._dt)))].sort().reverse();
  if(!months.length) return '';
  const label=k=>{ const [y,m]=k.split('-'); return `${MONTHS_ES[parseInt(m,10)-1]} ${y}`; };
  const chips=months.map(k=>`<button class="ctrl-btn ${monthFilter&&monthFilter.has(k)?'active':''}" onclick="toggleMonth('${k}')">${label(k)}</button>`).join('');
  return `<span style="font-size:11px;color:var(--muted);margin-right:2px">📅 Periodo:</span>
    <button class="ctrl-btn ${!monthFilter?'active':''}" onclick="setMonthFilter(null)">Todos</button>
    ${chips}`;
}
function toggleMonth(k){
  if(!monthFilter){ monthFilter=new Set([k]); }
  else if(monthFilter.has(k)){ monthFilter.delete(k); if(monthFilter.size===0) monthFilter=null; }
  else { monthFilter.add(k); }
  renderView();
}
function setMonthFilter(v){ monthFilter=v; renderView(); }

function renderLoadMoreBtn(data){
  if(!data.paging||(!data.paging.fb&&!data.paging.ig)) return '';
  if(data.loadingMore) return `<button class="ctrl-btn" disabled style="opacity:.5;cursor:default">⏳ Cargando publicaciones más viejas...</button>`;
  return `<button class="ctrl-btn" onclick="loadMorePosts('${currentPage.id}')">⏬ Cargar publicaciones más viejas</button>`;
}

// ── Shell with view tabs ──
function renderShell(page){
  const hasIG=!!page.instagram_business_account;
  const c=document.getElementById('pgContent');
  document.getElementById('welcome').style.display='none';
  c.style.display='block';
  c.innerHTML=`
    <div class="main-header"><div><div class="main-title">${esc(page.name)}</div><div class="main-sub" id="subLine">Cargando datos...</div></div></div>
    <div class="vtabs">
      <button class="vtab active" data-v="resumen" onclick="setView('resumen')">📊 Resumen</button>
      <button class="vtab" data-v="comparar" onclick="setView('comparar')">📈 Comparar Posts</button>
      <button class="vtab" data-v="formatos" onclick="setView('formatos')">🎬 Formatos y Horarios</button>
      <button class="vtab" data-v="analisis" onclick="setView('analisis')">🧠 Análisis</button>
      <button class="vtab" data-v="laboratorio" onclick="setView('laboratorio')">🧪 Laboratorio</button>
    </div>
    <div class="ptabs" id="platTabs">
      <button class="ptab" id="pt-todos" onclick="setPlat('todos')">🌐 Todos</button>
      <button class="ptab" id="pt-fb" onclick="setPlat('fb')">📘 Facebook</button>
      ${hasIG?`<button class="ptab" id="pt-ig" onclick="setPlat('ig')">📸 Instagram</button>`:''}
    </div>
    <div class="controls" id="monthTabsWrap" style="margin-bottom:10px"></div>
    <div id="loadMoreWrap" style="margin-bottom:16px"></div>
    <div id="viewBody"><div class="stats-grid">${sk(4,70)}</div><div class="card-box"><div class="skel" style="height:200px;border-radius:10px"></div></div></div>`;
  updatePlatTabs();
}

function setPlat(f){ platFilter=f; updatePlatTabs(); renderView(); }
function updatePlatTabs(){
  const m={'pt-todos':'todos','pt-fb':'fb','pt-ig':'ig'};
  Object.entries(m).forEach(([id,v])=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='ptab'+(platFilter===v?(v==='ig'?' ig':' fb'):'');
  });
}
function P(data){
  let arr=data.posts;
  if(platFilter==='fb') arr=arr.filter(p=>p._plat==='FB');
  else if(platFilter==='ig') arr=arr.filter(p=>p._plat==='IG');
  if(monthFilter) arr=arr.filter(p=>monthFilter.has(monthKey(p._dt)));
  return arr;
}

function setView(v){
  currentView=v;
  document.querySelectorAll('.vtab').forEach(t=>t.classList.toggle('active',t.dataset.v===v));
  renderView();
}


// ── VIEW ROUTER ──
function renderView(){
  const data=cache[currentPage.id];
  if(!data){ document.getElementById('viewBody').innerHTML=`<div class="state-box"><div class="ico">⚠️</div><h3>Sin datos</h3></div>`; return; }
  const nFb=data.posts.filter(p=>p._plat==='FB').length, nIg=data.posts.filter(p=>p._plat==='IG').length;
  document.getElementById('subLine').textContent=`📘 ${nFb} posts · ${fmt(data.fans)} seg.${data.hasIG?` | 📸 ${nIg} posts · ${fmt(data.igFans)} seg.`:''}`;
  const labMode=currentView==='laboratorio';
  document.getElementById('platTabs').style.display=labMode?'none':'flex';
  document.getElementById('monthTabsWrap').style.display=labMode?'none':'flex';
  document.getElementById('loadMoreWrap').style.display=labMode?'none':'block';
  document.getElementById('monthTabsWrap').innerHTML=labMode?'':renderMonthChips(data);
  document.getElementById('loadMoreWrap').innerHTML=labMode?'':renderLoadMoreBtn(data);
  if(currentView==='resumen') viewResumen(data);
  else if(currentView==='comparar') viewComparar(data);
  else if(currentView==='formatos') viewFormatos(data);
  else if(currentView==='analisis') viewAnalisis(data);
  else if(currentView==='laboratorio') viewLaboratorio(data);
}


function setStatus(s,m){const d=document.getElementById('sDot'),t=document.getElementById('sTxt');d.className='dot';t.textContent=m||'Cargando...';if(s==='ok')d.classList.add('ok');else if(s==='err')d.classList.add('err');}
function welcomeErr(msg){const w=document.getElementById('welcome');w.style.display='flex';w.innerHTML=`<div class="ico">⚠️</div><h3>Error</h3><p>${esc(msg)}</p><button class="btn-p" onclick="openTM()">🔑 Actualizar Token</button>`;}
function openTM(){document.getElementById('tkModal').style.display='flex';if(TOKEN)document.getElementById('tkInput').value=TOKEN;}
function closeTM(){document.getElementById('tkModal').style.display='none';}
function saveTK(){const t=document.getElementById('tkInput').value.trim();if(!t)return;TOKEN=t;localStorage.setItem('meta_token',t);closeTM();cache={};init();}
function toggleSB(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sOv').classList.toggle('show');}
function closeSB(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sOv').classList.remove('show');}

document.getElementById('tkModal').addEventListener('click',function(e){if(e.target===this)closeTM();});
document.getElementById('tkInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveTK();});
document.getElementById('rptModal').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
document.getElementById('linkModal').addEventListener('click',function(e){if(e.target===this)closeLinkModal();});
let _rt;window.addEventListener('resize',()=>{clearTimeout(_rt);_rt=setTimeout(()=>{if(currentPage&&cache[currentPage.id])renderView();},250);});
