// ════════ VIEW: RESUMEN ════════
function viewResumen(data){
  const fans=data.fans, posts=P(data);
  const org=posts.filter(p=>!p._paid);
  const avgEng=avg(posts.map(p=>p._eng));
  const avgEngOrg=avg(org.map(p=>p._eng));
  const avgReach=avg(posts.map(p=>p._reach));
  const er=avgReach>0?((avgEng/avgReach)*100).toFixed(1)+'%':'—';
  document.getElementById('viewBody').innerHTML=`
    <div class="stats-grid">
      <div class="sc"><div class="sc-lbl">Seguidores</div><div class="sc-val bl">${fmt(fans)}</div>${cache[currentPage.id].hasIG?`<div class="sc-sub" style="color:var(--muted)">📸 IG: ${fmt(cache[currentPage.id].igFans)}</div>`:''}</div>
      <div class="sc"><div class="sc-lbl">Eng. Promedio</div><div class="sc-val gr">${fmt(Math.round(avgEng))}</div><div class="sc-sub" style="color:var(--muted)">Orgánico: ${fmt(Math.round(avgEngOrg))}</div></div>
      <div class="sc"><div class="sc-lbl">Eng. Rate</div><div class="sc-val ye">${er}</div></div>
      <div class="sc"><div class="sc-lbl">Posts pagados</div><div class="sc-val or">${posts.filter(p=>p._paid).length}/${posts.length}</div></div>
    </div>
    ${metricsDebugPanel(cache[currentPage.id])}
    <div class="card-box">
      <div class="card-hdr"><div class="card-title">Totales por Red</div></div>
      <div class="tbl-wrap">${platTotalsTable(cache[currentPage.id])}</div>
    </div>
    <div class="chart-2col">
      <div class="card-box"><div class="card-hdr"><div class="card-title">Engagement en el Tiempo</div></div><canvas id="cTime"></canvas></div>
      <div class="card-box"><div class="card-hdr"><div class="card-title">Crecimiento de Seguidores</div>${growthYearControl(currentPage.id)}</div><div id="growthArea"></div></div>
    </div>`;
  drawTimeline(posts,'cTime');
  drawGrowth(currentPage.id);
}

// Panel de diagnóstico: qué métricas de Meta respondieron OK hoy. Si Meta vuelve a
// deprecar algo, esto lo muestra de inmediato en vez de dejar "—" sin explicación.
function metricsDebugPanel(data){
  const d=data.debug; if(!d) return '';
  const chip=(name,ok)=>`<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border:1px solid ${ok?'var(--green)':'var(--red)'};color:${ok?'var(--green)':'var(--red)'};font-size:11px">${ok?'✓':'✗'} ${name}</span>`;
  const fbAll=['post_impressions_unique','post_impressions','post_media_view','post_clicks','post_activity_by_action_type'];
  const fbVidAll=['post_video_views','post_media_view'];
  const igPhotoAll=IG_COMMON_METRICS;
  const igVidAll=[...IG_COMMON_METRICS,...IG_VIDEO_EXTRA_METRICS];
  const row=(label,all,active)=>`<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--muted);margin-bottom:3px">${label}</div>${all.map(m=>chip(m,active.includes(m))).join('')}</div>`;
  const body=
    row('Facebook — alcance/impresiones',fbAll,d.fb) +
    (d.fbVideo.length||fbVidAll.some(m=>d.fb.includes(m))?row('Facebook — video views',fbVidAll,[...d.fb,...d.fbVideo]):'') +
    (data.hasIG?row('Instagram — Foto/Álbum (no video)',igPhotoAll,d.igPhoto):'') +
    (data.hasIG?row('Instagram — Video/Reels',igVidAll,d.igVideo):'');
  return `<details class="card-box" style="padding:12px 18px;margin-bottom:18px">
    <summary style="cursor:pointer;font-family:'Space Grotesk';font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px">🔍 Diagnóstico de métricas de Meta</summary>
    <div style="margin-top:12px">
      <p style="font-size:11px;color:var(--muted);margin-bottom:10px">Meta deprecó varias métricas en nov 2025 y jun 2026. Esto muestra cuáles siguen vivas hoy para tu cuenta, separado por tipo de contenido (el reach de Reels murió el 15 jun 2026 y no tiene reemplazo — solo queda 'plays'). Si algo aparece en rojo, Meta dejó de darlo y no es un error del dashboard. <strong>Nota:</strong> <code>post_activity_by_action_type</code> (guardados de Facebook) es experimental — no hay documentación oficial confirmando el nombre exacto, así que puede fallar aunque tu cuenta sí tenga guardados reales.</p>
      ${body}
    </div>
  </details>`;
}

function platTotalsTable(data){
  const all=monthFilter?data.posts.filter(p=>monthKey(p._dt)===monthFilter):data.posts;
  const fb=all.filter(p=>p._plat==='FB'), ig=all.filter(p=>p._plat==='IG');
  const S=(arr,k)=>arr.reduce((s,p)=>s+(p[k]||0),0);
  const row=(icon,name,arr)=>`<tr>
    <td style="white-space:nowrap">${icon} ${name}</td>
    <td class="td-num">${arr.length}</td>
    <td class="td-num">${fmt(S(arr,'_likes'))}</td>
    <td class="td-num">${fmt(S(arr,'_comments'))}</td>
    <td class="td-num">${fmt(S(arr,'_shares'))}</td>
    <td class="td-num" style="color:var(--yellow)">${fmt(S(arr,'_saved'))}</td>
    <td class="td-num" style="color:var(--green)">${fmt(S(arr,'_eng'))}</td>
    <td class="td-num" style="color:var(--yellow)">${S(arr,'_reach')>0?fmt(S(arr,'_reach')):'—'}</td>
    <td class="td-num" style="color:var(--cyan)">${S(arr,'_vviews')>0?fmt(S(arr,'_vviews')):'—'}</td>
  </tr>`;
  return `<table><thead><tr>
    <th>Red</th><th>Posts</th><th>❤️ Likes</th><th>💬 Coments</th><th>🔁 Shares</th><th>🔖 Guardados</th><th>Total Eng</th><th>👁 Alcance</th><th>▶ Views</th>
  </tr></thead><tbody>
    ${row('📘','Facebook',fb)}
    ${data.hasIG?row('📸','Instagram',ig):''}
    ${row('🌐','TOTAL',all)}
  </tbody></table>`;
}

function growthYearControl(pageId){
  const years=[...new Set((LS.snaps[pageId]||[]).map(s=>s.date.slice(0,4)))].sort().reverse();
  if(!years.length) years.push(String(new Date().getFullYear()));
  if(!growthYear||!years.includes(String(growthYear))) growthYear=years[0];
  return `<label class="period-control compact"><span>Año</span>
    <select class="period-select" onchange="setGrowthYear(this.value)">
      ${years.map(y=>`<option value="${y}" ${String(growthYear)===y?'selected':''}>${y}</option>`).join('')}
    </select>
  </label>`;
}

function setGrowthYear(year){ growthYear=String(year); drawGrowth(currentPage.id); }

function drawGrowth(pageId){
  const allSnaps=LS.snaps[pageId]||[];
  const area=document.getElementById('growthArea');
  if(!area) return;
  const years=[...new Set(allSnaps.map(s=>s.date.slice(0,4)))].sort().reverse();
  if(!growthYear||!years.includes(String(growthYear))) growthYear=years[0]||String(new Date().getFullYear());
  const snaps=allSnaps.filter(s=>s.date.startsWith(String(growthYear)+'-')).sort((a,b)=>a.date.localeCompare(b.date));
  if(snaps.length<2){
    area.innerHTML=`<div style="padding:30px 10px;text-align:center;color:var(--muted);font-size:12px;line-height:1.6">
      📅 Aún no hay histórico suficiente en ${growthYear}.<br>El dashboard guarda los números cada día que lo abres.<br>
      <strong style="color:var(--text)">Snapshot de hoy guardado.</strong><br>Vuelve mañana para ver la primera línea de tendencia.</div>`;
    return;
  }
  const change=(snaps[snaps.length-1].fans||0)-(snaps[0].fans||0);
  area.innerHTML=`<div class="growth-summary"><span>${fmt(snaps[0].fans)} iniciales</span><strong class="${change>=0?'positive':'negative'}">${change>=0?'+':''}${fmt(change)} en ${growthYear}</strong><span>${fmt(snaps[snaps.length-1].fans)} actuales</span></div><canvas id="cGrowth"></canvas>`;
  const c=document.getElementById('cGrowth');
  const W=c.parentElement.clientWidth,H=180; setupCanvas(c,W,H);
  const ctx=c.getContext('2d');
  lineChart(ctx,W,H,snaps.map(s=>s.fans),snaps.map(s=>{const p=s.date.split('-');return `${p[2]}/${p[1]}`;}),'#111111',true);
}

// ════════ VIEW: COMPARAR ════════
function viewComparar(data){
  let scoped=data.posts;
  if(platFilter==='fb') scoped=scoped.filter(p=>p._plat==='FB');
  else if(platFilter==='ig') scoped=scoped.filter(p=>p._plat==='IG');
  const months=[...new Set(scoped.map(p=>monthKey(p._dt)))].sort().reverse();
  if(!compareMonthA||!months.includes(compareMonthA)) compareMonthA=(monthFilter&&months.includes(monthFilter)?monthFilter:months[0])||null;
  if(compareMonthB&&(!months.includes(compareMonthB)||compareMonthB===compareMonthA)) compareMonthB=null;
  const allFiltered=getFiltered(scoped);
  const metric=COMPARE_CHART_METRICS[compareMetric]||COMPARE_CHART_METRICS.eng;
  const chartOrderHelp=compareChartOrder==='chronological'
    ? 'fecha de publicación · F=Facebook, I=Instagram'
    : `${metric.label} · ${compareChartOrder==='desc'?'mayor a menor':'menor a mayor'}`;
  const selected=new Set([compareMonthA,compareMonthB].filter(Boolean));
  const chartPosts=compareMonthB?allFiltered.filter(p=>selected.has(monthKey(p._dt))):allFiltered;
  let posts=chartPosts;
  const periodPanel=compareMonthB?monthComparisonPanel(chartPosts,compareMonthA,compareMonthB):`<div class="insight compare-all-note"><span class="ico">📚</span>Mostrando juntas <strong>todas las publicaciones de los últimos 4 meses</strong>. Elige un segundo mes para activar la comparación VS.</div>`;
  const nSugg=suggestPairs(data).length;
  if(combineMode) posts=combinePairs(posts);
  const monthATablePosts=compareMonthB?posts.filter(p=>monthKey(p._dt)===compareMonthA):[];
  const monthBTablePosts=compareMonthB?posts.filter(p=>monthKey(p._dt)===compareMonthB):[];
  const combineInsight = combineMode ? `<div class="insight" style="margin-bottom:14px"><span class="ico">🔗</span>Mostrando ${LS.pairs.length} pieza(s) vinculada(s) como una sola fila (mismo día = automático, 1+ día = confirmado por ti). Los posts sin pareja quedan individuales.</div>` : '';
  document.getElementById('viewBody').innerHTML=`
    <div class="compare-periods">
      <label class="period-control"><span>Mes A (al comparar)</span>
        <select class="period-select" onchange="setCompareMonth('a',this.value)">
          ${months.map(k=>`<option value="${k}" ${compareMonthA===k?'selected':''}>${monthLabel(k)}</option>`).join('')}
        </select>
      </label>
      <span class="compare-vs">VS</span>
      <label class="period-control"><span>Comparar contra</span>
        <select class="period-select" onchange="setCompareMonth('b',this.value)">
          <option value="" ${!compareMonthB?'selected':''}>Sin comparación</option>
          ${months.filter(k=>k!==compareMonthA).map(k=>`<option value="${k}" ${compareMonthB===k?'selected':''}>${monthLabel(k)}</option>`).join('')}
        </select>
      </label>
      <label class="period-control metric-control"><span>Qué miden las barras</span>
        <select class="period-select" onchange="setCompareMetric(this.value)">
          ${Object.entries(COMPARE_CHART_METRICS).map(([key,value])=>`<option value="${key}" ${compareMetric===key?'selected':''}>${value.label}</option>`).join('')}
        </select>
      </label>
      <label class="period-control order-control"><span>Orden de barras y tablas</span>
        <select class="period-select" onchange="setCompareChartOrder(this.value)">
          <option value="chronological" ${compareChartOrder==='chronological'?'selected':''}>Por fecha</option>
          <option value="desc" ${compareChartOrder==='desc'?'selected':''}>Mayor a menor · ${metric.label}</option>
          <option value="asc" ${compareChartOrder==='asc'?'selected':''}>Menor a mayor · ${metric.label}</option>
        </select>
      </label>
    </div>
    ${periodPanel}
    ${combineInsight}
    <div class="card-box">
      <div class="card-hdr">
        <div class="card-title">${compareMonthB?`${monthLabel(compareMonthA)} VS ${monthLabel(compareMonthB)}`:'Todas las publicaciones · últimos 4 meses'}</div>
        <div class="controls">
          <button class="ctrl-btn ${compareFilter==='todos'?'active':''}" onclick="setFilter('todos')">Todos</button>
          <button class="ctrl-btn ${compareFilter==='organico'?'active':''}" onclick="setFilter('organico')">🟢 Orgánico</button>
          <button class="ctrl-btn ${compareFilter==='pagado'?'active':''}" onclick="setFilter('pagado')">💰 Pagado</button>
          <button class="ctrl-btn ${combineMode?'active':''}" onclick="toggleCombine()">🔗 Ver piezas vinculadas</button>
          <button class="btn-report" onclick="openLinkModal()">🔗 Vincular piezas${nSugg?` (${nSugg})`:''}</button>
          <button class="btn-export" onclick="exportXLSX('${currentPage.id}')" title="Incluye únicamente las publicaciones cargadas de los últimos 4 meses">📥 Excel · 4 meses</button>
        </div>
      </div>
      <div class="chart-axis-guide"><span><strong>Eje X:</strong> ${chartOrderHelp}</span><span><strong>Eje Y:</strong> ${metric.label} · ${metric.help}</span></div>
      ${compareMonthB?`<div class="compare-chart-grid">
        <div class="compare-chart-panel"><div class="compare-chart-title">${monthLabel(compareMonthA)} <span>${chartPosts.filter(p=>monthKey(p._dt)===compareMonthA).length} posts</span></div><div class="compare-chart-metric">${metric.label}</div><canvas id="cBarsA"></canvas></div>
        <div class="compare-chart-panel"><div class="compare-chart-title">${monthLabel(compareMonthB)} <span>${chartPosts.filter(p=>monthKey(p._dt)===compareMonthB).length} posts</span></div><div class="compare-chart-metric">${metric.label}</div><canvas id="cBarsB"></canvas></div>
      </div>`:'<canvas id="cBars"></canvas>'}
    </div>
    ${compareMonthB?`<div class="compare-table-grid">
      <div class="card-box compare-table-card">
        <div class="card-hdr"><div class="card-title">Publicaciones · ${monthLabel(compareMonthA)}</div><span class="mini-table-count">${monthATablePosts.length} posts</span></div>
        <div class="tbl-wrap mini-compare-table" id="tblWrapA"></div>
      </div>
      <div class="card-box compare-table-card">
        <div class="card-hdr"><div class="card-title">Publicaciones · ${monthLabel(compareMonthB)}</div><span class="mini-table-count">${monthBTablePosts.length} posts</span></div>
        <div class="tbl-wrap mini-compare-table" id="tblWrapB"></div>
      </div>
    </div>`:`<div class="card-box">
      <div class="card-hdr"><div class="card-title">Tabla Comparativa — clic en encabezado para ordenar</div></div>
      <div class="tbl-wrap" id="tblWrap"></div>
    </div>`}`;
  if(compareMonthB){
    const monthAPosts=chartPosts.filter(p=>monthKey(p._dt)===compareMonthA);
    const monthBPosts=chartPosts.filter(p=>monthKey(p._dt)===compareMonthB);
    const sharedMax=Math.max(...chartPosts.map(p=>p[metric.key]||0),1);
    drawBars(monthAPosts,'cBarsA',metric.key,sharedMax,compareChartOrder);
    drawBars(monthBPosts,'cBarsB',metric.key,sharedMax,compareChartOrder);
    renderMonthCompareTable(monthATablePosts,'tblWrapA',metric);
    renderMonthCompareTable(monthBTablePosts,'tblWrapB',metric);
  }else{
    drawBars(chartPosts,'cBars',metric.key,null,compareChartOrder);
    renderTable(posts);
  }
}
function toggleCombine(){ combineMode=!combineMode; renderView(); }
function setCompareMetric(metric){ if(COMPARE_CHART_METRICS[metric]) compareMetric=metric; renderView(); }
function setCompareChartOrder(order){ if(['chronological','desc','asc'].includes(order)) compareChartOrder=order; renderView(); }

function setCompareMonth(which,value){
  if(which==='a'){
    compareMonthA=value||null;
    if(compareMonthB===compareMonthA) compareMonthB=null;
  }else compareMonthB=value||null;
  renderView();
}

function monthComparisonPanel(posts,a,b){
  const summarize=month=>{
    const rows=posts.filter(p=>monthKey(p._dt)===month);
    const sum=k=>rows.reduce((total,p)=>total+(p[k]||0),0);
    return {posts:rows.length,eng:Math.round(avg(rows.map(p=>p._eng))),reach:sum('_reach'),views:sum('_vviews')};
  };
  const left=summarize(a),right=summarize(b);
  const delta=(current,base)=>base?Math.round((current-base)/base*100):null;
  const cell=(label,key)=>{
    const d=delta(left[key],right[key]);
    return `<div class="month-compare-card">
      <div class="month-compare-label">${label}</div>
      <div class="month-compare-values"><strong>${fmt(left[key])}</strong><span>${fmt(right[key])}</span></div>
      <div class="month-delta ${d===null?'neutral':d>=0?'positive':'negative'}">${d===null?'Sin base':`${d>=0?'+':''}${d}%`} <small>${monthLabel(a)} vs ${monthLabel(b)}</small></div>
    </div>`;
  };
  return `<div class="month-compare-summary">
    <div class="month-compare-head"><strong>${monthLabel(a)}</strong><span>comparado con</span><strong>${monthLabel(b)}</strong></div>
    <div class="month-compare-grid">${cell('Publicaciones','posts')}${cell('Eng. promedio','eng')}${cell('Alcance total','reach')}${cell('Views totales','views')}</div>
  </div>`;
}

const LINK_WINDOW_DAYS=3; // ventana para sugerir candidatos FB/IG como misma pieza

function pairKey(fbId,igId){ return fbId+'|'+igId; }
function isLinked(id){ return LS.pairs.some(p=>p.fb===id||p.ig===id); }

// Sugiere candidatos (mismo contenido en FB e IG) por cercanía de fecha — NUNCA agrupa solo, requiere tu confirmación
function suggestPairs(data){
  const fbPosts=data.posts.filter(p=>p._plat==='FB'&&!isLinked(p.id));
  const igPosts=data.posts.filter(p=>p._plat==='IG'&&!isLinked(p.id));
  const suggestions=[];
  fbPosts.forEach(fp=>{
    let best=null,bestDiff=Infinity;
    igPosts.forEach(ip=>{
      if(LS.rejected.includes(pairKey(fp.id,ip.id))) return;
      const diffDays=Math.abs(fp._dt-ip._dt)/86400000;
      if(diffDays<=LINK_WINDOW_DAYS && diffDays<bestDiff){ bestDiff=diffDays; best=ip; }
    });
    if(best) suggestions.push({fb:fp,ig:best,diffDays:bestDiff});
  });
  suggestions.sort((a,b)=>a.diffDays-b.diffDays);
  return suggestions;
}

function confirmLink(fbId,igId){ LS.pairs.push({fb:fbId,ig:igId,auto:false}); LS.save(); renderLinkModal(); renderView(); }
function rejectLink(fbId,igId){ LS.rejected.push(pairKey(fbId,igId)); LS.save(); renderLinkModal(); }
function unlinkPair(fbId,igId){ LS.pairs=LS.pairs.filter(p=>!(p.fb===fbId&&p.ig===igId)); LS.save(); renderLinkModal(); renderView(); }
function manualLink(){
  const fb=document.getElementById('manFb').value, ig=document.getElementById('manIg').value;
  if(!fb||!ig) return alert('Selecciona un post de cada red.');
  confirmLink(fb,ig);
}

function openLinkModal(){ document.getElementById('linkModal').style.display='flex'; renderLinkModal(); }
function closeLinkModal(){ document.getElementById('linkModal').style.display='none'; }

function renderLinkModal(){
  const data=cache[currentPage.id];
  const byId={}; data.posts.forEach(p=>byId[p.id]=p);
  const confirmed=LS.pairs.filter(p=>byId[p.fb]&&byId[p.ig]);
  const suggestions=suggestPairs(data);

  const thumbRow=(fp,ip)=>`<div class="link-thumbs">${fp.full_picture?`<img src="${fp.full_picture}"/>`:'<div class="link-noimg">📘</div>'}${ip.full_picture?`<img src="${ip.full_picture}"/>`:'<div class="link-noimg">📸</div>'}</div>`;

  const confirmedHtml=confirmed.map(p=>{
    const fp=byId[p.fb],ip=byId[p.ig];
    const badge=p.auto?'🤖 Auto (mismo día)':'✅ Confirmado por ti';
    return `<div class="link-row">
      ${thumbRow(fp,ip)}
      <div class="link-info">
        <div class="link-meta">${badge} — 📘 ${fmtDate(fp.created_time)} · 📸 ${fmtDate(ip.created_time)}</div>
        <div class="link-caption">📘 ${esc((fp.message||'sin texto').slice(0,55))}...</div>
        <div class="link-caption">📸 ${esc((ip.message||'sin texto').slice(0,55))}...</div>
      </div>
      <button class="btn-g" onclick="unlinkPair('${p.fb}','${p.ig}')">Desvincular</button>
    </div>`;
  }).join('');

  const suggHtml=suggestions.length?suggestions.map(s=>`
    <div class="link-row">
      ${thumbRow(s.fb,s.ig)}
      <div class="link-info">
        <div class="link-meta">📘 ${fmtDate(s.fb.created_time)} · 📸 ${fmtDate(s.ig.created_time)} — ${s.diffDays<1?'mismo día':Math.round(s.diffDays)+' día(s) de diferencia'}</div>
        <div class="link-caption">📘 ${esc((s.fb.message||'sin texto').slice(0,55))}...</div>
        <div class="link-caption">📸 ${esc((s.ig.message||'sin texto').slice(0,55))}...</div>
      </div>
      <div class="link-actions">
        <button class="btn-p" onclick="confirmLink('${s.fb.id}','${s.ig.id}')">✅ Misma pieza</button>
        <button class="btn-g" onclick="rejectLink('${s.fb.id}','${s.ig.id}')">❌ No</button>
      </div>
    </div>`).join(''):'<p style="color:var(--muted);font-size:12px;padding:8px 0">No hay sugerencias nuevas dentro de ±3 días.</p>';

  const unlinkedFb=data.posts.filter(p=>p._plat==='FB'&&!isLinked(p.id));
  const unlinkedIg=data.posts.filter(p=>p._plat==='IG'&&!isLinked(p.id));

  document.getElementById('linkModalBody').innerHTML=`
    ${confirmed.length?`<div class="link-section-title">Vinculadas (${confirmed.length})</div>${confirmedHtml}`:''}
    <div class="link-section-title">Sugerencias (± ${LINK_WINDOW_DAYS} días)</div>
    ${suggHtml}
    <div class="link-section-title">Vincular manualmente (para casos fuera de la ventana)</div>
    <div class="link-manual">
      <select id="manFb"><option value="">— Post de Facebook —</option>${unlinkedFb.map(p=>`<option value="${p.id}">${fmtDate(p.created_time)} — ${esc((p.message||'sin texto').slice(0,40))}</option>`).join('')}</select>
      <select id="manIg"><option value="">— Post de Instagram —</option>${unlinkedIg.map(p=>`<option value="${p.id}">${fmtDate(p.created_time)} — ${esc((p.message||'sin texto').slice(0,40))}</option>`).join('')}</select>
      <button class="btn-p" onclick="manualLink()">🔗 Vincular</button>
    </div>`;
}

// Combina SOLO las piezas que confirmaste manualmente; el resto queda individual
function combinePairs(posts){
  const byId={}; posts.forEach(p=>byId[p.id]=p);
  const used=new Set();
  const merged=[];
  LS.pairs.forEach(pair=>{
    const fp=byId[pair.fb], ip=byId[pair.ig];
    if(!fp||!ip) return; // no pertenece a esta página o quedó fuera del filtro actual
    used.add(fp.id); used.add(ip.id);
    const arr=[fp,ip];
    const S=k=>arr.reduce((s,p)=>s+(p[k]||0),0);
    const m={
      id:'pair_'+pair.fb+'_'+pair.ig,
      _dt:fp._dt<ip._dt?fp._dt:ip._dt,
      created_time:(fp._dt<ip._dt?fp:ip).created_time,
      _plat:'FB+IG',
      _fmt:[...new Set([fp._fmt,ip._fmt])].join(' / '),
      _likes:S('_likes'),_comments:S('_comments'),_shares:S('_shares'),
      _saved:S('_saved'),_reach:S('_reach'),_vviews:S('_vviews'),
      _paid:fp._paid||ip._paid,
      full_picture:fp.full_picture||ip.full_picture||'',
      message:`[FB] ${fp.message||'(sin texto)'}  ·  [IG] ${ip.message||'(sin texto)'}`,
      _members:arr
    };
    m._eng=m._likes+m._comments+m._shares;
    merged.push(m);
  });
  const rest=posts.filter(p=>!used.has(p.id));
  return [...merged,...rest];
}

function getFiltered(posts){
  if(compareFilter==='organico') return posts.filter(p=>!p._paid);
  if(compareFilter==='pagado') return posts.filter(p=>p._paid);
  return posts;
}
function setFilter(f){ compareFilter=f; renderView(); }

function renderTable(posts){
  const sorted=sortPosts(posts);
  const arrow=c=>sortState.col===c?`<span class="arrow">${sortState.dir==='desc'?'▼':'▲'}</span>`:'';
  const platIcon=p=>{ if(p._plat==='FB') return '📘'; if(p._plat==='IG') return '📸'; return '📘📸'; };
  const rows=sorted.map(p=>{
    const isMerged=p._fmt.includes('/');
    const fmtTag=isMerged?'':`tag-${p._fmt.toLowerCase().replace('á','a')}`;
    return `<tr>
      <td><button class="paid-toggle" onclick="togglePaid('${p.id}')" title="Marcar pagado/orgánico">${p._paid?'💰':'🟢'}</button></td>
      <td style="text-align:center">${platIcon(p)}</td>
      <td style="white-space:nowrap;color:var(--muted)">${fmtDate(p.created_time)}</td>
      <td><span class="tag ${fmtTag}">${p._fmt}</span></td>
      <td class="td-text">${esc(p.message||'Sin texto')}</td>
      <td class="td-num">${p._likes}</td>
      <td class="td-num">${p._comments}</td>
      <td class="td-num">${p._shares}</td>
      <td class="td-num" style="color:var(--green)">${p._eng}</td>
      <td class="td-num" style="color:var(--yellow)">${p._reach>0?fmt(p._reach):'—'}</td>
      <td class="td-num" style="color:var(--cyan)">${p._vviews>0?fmt(p._vviews):'—'}</td>
    </tr>`;
  }).join('');
  document.getElementById('tblWrap').innerHTML=`<table>
    <thead><tr>
      <th></th>
      <th onclick="sortBy('plat')">Red${arrow('plat')}</th>
      <th onclick="sortBy('date')">Fecha${arrow('date')}</th>
      <th onclick="sortBy('fmt')">Formato${arrow('fmt')}</th>
      <th>Texto</th>
      <th onclick="sortBy('likes')">❤️${arrow('likes')}</th>
      <th onclick="sortBy('comments')">💬${arrow('comments')}</th>
      <th onclick="sortBy('shares')">🔁${arrow('shares')}</th>
      <th onclick="sortBy('eng')">Total${arrow('eng')}</th>
      <th onclick="sortBy('reach')">Alcance${arrow('reach')}</th>
      <th onclick="sortBy('vviews')">▶ Views${arrow('vviews')}</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

function renderMonthCompareTable(posts,targetId,metric){
  const sorted=orderComparePosts(posts,metric.key,compareChartOrder);
  const platform=p=>p._plat==='IG'?'📸':p._plat==='FB'?'📘':'📘📸';
  const rows=sorted.map(p=>{
    const fmtTag=`tag-${p._fmt.toLowerCase().replace('á','a')}`;
    const value=p[metric.key]||0;
    return `<tr>
      <td class="mini-date">${fmtDate(p.created_time)}</td>
      <td class="mini-platform" title="${p._plat}">${platform(p)}${p._paid?' 💰':''}</td>
      <td class="mini-content"><span class="tag ${fmtTag}">${p._fmt}</span><span title="${esc(p.message||'Sin texto')}">${esc(p.message||'Sin texto')}</span></td>
      <td class="td-num mini-metric">${fmt(value)}</td>
    </tr>`;
  }).join('');
  document.getElementById(targetId).innerHTML=`<table>
    <thead><tr><th>Fecha</th><th>Red</th><th>Contenido</th><th>${metric.label}</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="4" class="mini-empty">Sin publicaciones</td></tr>'}</tbody>
  </table>`;
}

function sortBy(col){
  if(sortState.col===col) sortState.dir=sortState.dir==='desc'?'asc':'desc';
  else { sortState.col=col; sortState.dir='desc'; }
  const chartMetric={likes:'likes',comments:'comments',shares:'shares',eng:'eng',reach:'reach',vviews:'views'}[col];
  if(chartMetric){
    compareMetric=chartMetric;
    compareChartOrder=sortState.dir;
  }
  renderView();
}
function sortPosts(posts){
  const k={date:'_dt',plat:'_plat',fmt:'_fmt',likes:'_likes',comments:'_comments',shares:'_shares',eng:'_eng',reach:'_reach',vviews:'_vviews'}[sortState.col];
  return [...posts].sort((a,b)=>{
    let va=a[k],vb=b[k];
    if(k==='_fmt'||k==='_plat'){ va=va||''; vb=vb||''; return sortState.dir==='desc'?vb.localeCompare(va):va.localeCompare(vb); }
    return sortState.dir==='desc'?vb-va:va-vb;
  });
}
function togglePaid(id){
  LS.paid[id]=!LS.paid[id];
  if(!LS.paid[id]) delete LS.paid[id];
  LS.save();
  Object.values(cache).forEach(d=>d.posts?.forEach(p=>{ if(p.id===id) p._paid=!!LS.paid[id]; }));
  renderView();
}

// ════════ VIEW: FORMATOS Y HORARIOS ════════
function viewFormatos(data){
  const posts=P(data);
  const fmts={};
  posts.forEach(p=>{ if(!fmts[p._fmt]) fmts[p._fmt]={n:0,eng:0}; fmts[p._fmt].n++; fmts[p._fmt].eng+=p._eng; });
  const fmtArr=Object.entries(fmts).map(([k,v])=>({fmt:k,n:v.n,avg:Math.round(v.eng/v.n)})).sort((a,b)=>b.avg-a.avg);
  const maxFmt=Math.max(...fmtArr.map(f=>f.avg),1);
  const fmtColors={'Video':'var(--ig)','Foto':'var(--accent)','Álbum':'var(--accent2)','Texto':'var(--muted)','Link':'var(--cyan)'};
  const fmtBars=fmtArr.map(f=>`<div class="fmt-row">
    <div class="fmt-label">${f.fmt}</div>
    <div class="fmt-bar-wrap"><div class="fmt-bar" style="width:${Math.max(8,(f.avg/maxFmt)*100)}%;background:${fmtColors[f.fmt]||'var(--accent)'}">${f.avg}</div></div>
    <div class="fmt-count">${f.n} posts</div></div>`).join('');

  let fmtInsight='';
  if(fmtArr.length>=2){
    const best=fmtArr[0], worst=fmtArr[fmtArr.length-1];
    if(worst.avg>0){
      const x=(best.avg/worst.avg).toFixed(1);
      fmtInsight=`<div class="insight"><span class="ico">💡</span>Tus posts de <strong>${best.fmt}</strong> rinden <strong>${x}x más</strong> engagement que los de ${worst.fmt}. Conviene hacer más ${best.fmt}.</div>`;
    }
  }

  const heat={}; let maxHeat=0;
  posts.forEach(p=>{ const d=p._dt.getDay(), h=p._dt.getHours(); const k=`${d}-${h}`; heat[k]=(heat[k]||0)+p._eng; if(heat[k]>maxHeat)maxHeat=heat[k]; });
  const hoursUsed=[...new Set(posts.map(p=>p._dt.getHours()))].sort((a,b)=>a-b);
  let heatHtml=`<div class="heat-grid"><div class="heat-corner"></div>`;
  DAYS.forEach(d=>heatHtml+=`<div class="heat-daylbl">${d}</div>`);
  hoursUsed.forEach(h=>{
    heatHtml+=`<div class="heat-hrlbl">${h}:00</div>`;
    for(let d=0;d<7;d++){
      const v=heat[`${d}-${h}`]||0;
      const intensity=maxHeat>0?v/maxHeat:0;
      const bg=v>0?`rgba(17,17,17,${0.10+intensity*0.75})`:'rgba(17,17,17,0.04)';
      heatHtml+=`<div class="heat-cell" style="background:${bg}" title="${DAYS[d]} ${h}:00 — ${v} eng">${v>0?v:''}</div>`;
    }
  });
  heatHtml+=`</div>`;

  let bestSlot='',bestVal=0;
  Object.entries(heat).forEach(([k,v])=>{ if(v>bestVal){bestVal=v;bestSlot=k;} });
  const [bd,bh]=bestSlot?bestSlot.split('-'):['',''];

  const lenBuckets={'Corto (<100)':{n:0,eng:0},'Medio (100-300)':{n:0,eng:0},'Largo (>300)':{n:0,eng:0}};
  posts.forEach(p=>{ const l=(p.message||'').length; const b=l<100?'Corto (<100)':l<=300?'Medio (100-300)':'Largo (>300)'; lenBuckets[b].n++; lenBuckets[b].eng+=p._eng; });
  const lenArr=Object.entries(lenBuckets).filter(([k,v])=>v.n>0).map(([k,v])=>({k,n:v.n,avg:Math.round(v.eng/v.n)}));
  const maxLen=Math.max(...lenArr.map(l=>l.avg),1);
  const lenBars=lenArr.map(l=>`<div class="fmt-row"><div class="fmt-label" style="width:120px">${l.k}</div><div class="fmt-bar-wrap"><div class="fmt-bar" style="width:${Math.max(8,(l.avg/maxLen)*100)}%;background:var(--orange)">${l.avg}</div></div><div class="fmt-count">${l.n}</div></div>`).join('');

  const withQ=posts.filter(p=>(p.message||'').includes('?')), noQ=posts.filter(p=>!(p.message||'').includes('?'));
  const qAvg=avg(withQ.map(p=>p._eng)).toFixed(0), nqAvg=avg(noQ.map(p=>p._eng)).toFixed(0);

  document.getElementById('viewBody').innerHTML=`
    ${fmtInsight}
    <div class="chart-2col">
      <div class="card-box"><div class="card-hdr"><div class="card-title">Engagement por Formato</div></div>${fmtBars||'<p style="color:var(--muted);font-size:12px">Sin datos</p>'}</div>
      <div class="card-box"><div class="card-hdr"><div class="card-title">Largo de Texto vs Engagement</div></div>${lenBars||'<p style="color:var(--muted);font-size:12px">Sin datos</p>'}</div>
    </div>
    <div class="card-box">
      <div class="card-hdr"><div class="card-title">Mapa de Calor — Día × Hora</div></div>
      ${bestSlot?`<div class="insight" style="margin-bottom:14px"><span class="ico">🕐</span>Tu mejor momento histórico: <strong>${DAYS[bd]} a las ${bh}:00</strong> (${bestVal} engagement acumulado).</div>`:''}
      ${heatHtml}
    </div>
    <div class="card-box">
      <div class="card-hdr"><div class="card-title">¿Las preguntas funcionan?</div></div>
      <div style="display:flex;gap:30px;flex-wrap:wrap">
        <div><div class="sc-lbl">Posts CON pregunta</div><div class="sc-val gr" style="font-size:26px">${qAvg}</div><div class="sc-sub" style="color:var(--muted)">${withQ.length} posts · eng promedio</div></div>
        <div><div class="sc-lbl">Posts SIN pregunta</div><div class="sc-val or" style="font-size:26px">${nqAvg}</div><div class="sc-sub" style="color:var(--muted)">${noQ.length} posts · eng promedio</div></div>
      </div>
    </div>`;
}

// ════════ VIEW: ANÁLISIS ════════
function viewAnalisis(data){
  const fans=data.fans, posts=P(data);
  const org=posts.filter(p=>!p._paid);
  posts.forEach(p=>{ const base=p._reach>0?p._reach:fans; p._er=base>0?(p._eng/base*100):0; p._score=Math.min(10,parseFloat((p._er*2).toFixed(1))); });
  const src=org.length?org:posts;
  const ranked=[...src].sort((a,b)=>b._er-a._er);
  const top3=ranked.slice(0,3), bot3=ranked.slice(-3).reverse();

  const dayEng=[0,0,0,0,0,0,0],dayCnt=[0,0,0,0,0,0,0];
  src.forEach(p=>{ const d=p._dt.getDay(); dayEng[d]+=p._eng; dayCnt[d]++; });
  const dayAvg=dayEng.map((v,i)=>dayCnt[i]?Math.round(v/dayCnt[i]):0);
  const bestDay=dayAvg.indexOf(Math.max(...dayAvg));

  const sortedOrg=[...src].sort((a,b)=>b._dt-a._dt);
  const last5=avg(sortedOrg.slice(0,5).map(p=>p._eng)), prev5=avg(sortedOrg.slice(5,10).map(p=>p._eng));
  const trend=prev5>0?Math.round((last5-prev5)/prev5*100):0;

  const rankHtml=(list,color)=>list.map(p=>{
    const img=p.full_picture||'';
    return `<div class="rank-post">
      ${img?`<img class="rank-thumb" src="${img}" onerror="this.parentElement.innerHTML='📝'"/>`:'<div class="rank-thumb">📝</div>'}
      <div class="rank-info"><div class="rank-text">${esc(p.message?.slice(0,45)||'Sin texto')}</div>
      <div class="rank-meta">${fmtDate(p.created_time)} · ${p._fmt} · Eng: ${p._eng}${p._paid?' · 💰':''}</div></div>
      <div class="rank-score" style="color:${color}">${p._score}/10</div></div>`;
  }).join('');

  document.getElementById('viewBody').innerHTML=`
    <div class="card-hdr" style="margin-bottom:14px">
      <div class="card-title">Análisis de Rendimiento (orgánico)</div>
      <button class="btn-report" onclick="genReport('${currentPage.id}')">📋 Generar Reporte para Codex</button>
    </div>
    <div class="chart-2col">
      <div class="card-box"><div class="card-hdr"><div class="card-title">🏆 Top 3 (orgánico)</div></div><div class="rank-posts">${rankHtml(top3,'var(--green)')||'Sin datos'}</div></div>
      <div class="card-box"><div class="card-hdr"><div class="card-title">📉 Necesitan mejora</div></div><div class="rank-posts">${rankHtml(bot3,'var(--red)')||'Sin datos'}</div></div>
    </div>
    <div class="card-box">
      <div class="card-hdr"><div class="card-title">Resumen</div></div>
      <div class="stats-grid">
        <div class="sc"><div class="sc-lbl">ER Orgánico</div><div class="sc-val ye">${avg(org.map(p=>p._er)).toFixed(2)}%</div></div>
        <div class="sc"><div class="sc-lbl">Tendencia (5 vs 5)</div><div class="sc-val ${trend>=0?'gr':'or'}">${trend>=0?'▲ +':'▼ '}${trend}%</div></div>
        <div class="sc"><div class="sc-lbl">Mejor día</div><div class="sc-val bl">${DAYS[bestDay]}</div></div>
        <div class="sc"><div class="sc-lbl">Posts orgánicos</div><div class="sc-val pu">${org.length}/${posts.length}</div></div>
      </div>
    </div>`;
}

// ════════ COMPARE PAGES ════════
async function showCompare(){
  document.querySelectorAll('.pg-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('cmpBtn').classList.add('active'); closeSB();
  const c=document.getElementById('pgContent');
  document.getElementById('welcome').style.display='none'; c.style.display='block';
  c.innerHTML=`<div class="main-header"><div><div class="main-title">Comparar Todas</div><div class="main-sub">Vista general de tus negocios</div></div></div>
    <div class="cmp-grid" id="cGrid">${sk(pages.length,180)}</div>
    <div class="card-box"><div class="card-hdr"><div class="card-title">Engagement Promedio por Página</div></div><canvas id="cmpBars"></canvas></div>`;
  const results=await Promise.allSettled(pages.map(async p=>{
    const t=window._pt[p.id]||TOKEN;
    try{
      const r=await api(`/${p.id}/posts?fields=id,likes.summary(true),comments.summary(true),shares&limit=15`,t);
      const posts=r.data||[];
      const eng=posts.map(x=>(x.likes?.summary?.total_count||0)+(x.comments?.summary?.total_count||0)+(x.shares?.count||0));
      return{...p,avgEng:Math.round(avg(eng)),n:posts.length};
    }catch{return{...p,avgEng:0,n:0};}
  }));
  const vals=results.map(r=>r.value);
  document.getElementById('cGrid').innerHTML=vals.map(p=>{
    const pic=p.picture?.data?.url||''; const fans=p.fan_count||p.followers_count||0;
    return `<div class="cmp-card"><div class="cmp-pic">${pic?`<img src="${pic}"/>`:'👤'}</div>
      <div class="cmp-name">${esc(p.name)}</div><div class="cmp-fans">${fmt(fans)} seg.${p.instagram_business_account?' · 📸':''}</div>
      <div class="cmp-stats">
        <div><div class="csv2 bl">${fmt(fans)}</div><div class="csl2">Seguidores</div></div>
        <div><div class="csv2 pu">${p.n}</div><div class="csl2">Posts</div></div>
        <div><div class="csv2 gr">${fmt(p.avgEng)}</div><div class="csl2">Avg Eng</div></div>
        <div><div class="csv2 ye">${fans>0?((p.avgEng/fans)*100).toFixed(1)+'%':'—'}</div><div class="csl2">ER Est.</div></div>
      </div></div>`;
  }).join('');
  const c2=document.getElementById('cmpBars');
  const W=c2.parentElement.clientWidth-36,H=200; setupCanvas(c2,W,H);
  barChartLabeled(c2.getContext('2d'),W,H,vals.map(p=>p.avgEng),vals.map(p=>p.name.slice(0,12)),'#111111');
}
