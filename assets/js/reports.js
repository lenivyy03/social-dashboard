// ════════ REPORT ════════
function genReport(pageId){
  const data=cache[pageId]; if(!data?.posts?.length) return;
  const {posts,fans}=data; const page=pages.find(p=>p.id===pageId);
  const org=posts.filter(p=>!p._paid), paid=posts.filter(p=>p._paid);
  const erOrg=avg(org.map(p=>{const b=p._reach>0?p._reach:fans;return b>0?p._eng/b*100:0;})).toFixed(2);
  const top=[...org].sort((a,b)=>b._eng-a._eng).slice(0,3);
  const fmts={}; posts.forEach(p=>{if(!fmts[p._fmt])fmts[p._fmt]={n:0,eng:0};fmts[p._fmt].n++;fmts[p._fmt].eng+=p._eng;});
  const fmtLines=Object.entries(fmts).map(([k,v])=>`  ${k}: ${v.n} posts, ${Math.round(v.eng/v.n)} eng promedio`).join('\n');
  const dayEng=[0,0,0,0,0,0,0],dayCnt=[0,0,0,0,0,0,0];
  org.forEach(p=>{const d=p._dt.getDay();dayEng[d]+=p._eng;dayCnt[d]++;});
  const dayAvg=dayEng.map((v,i)=>dayCnt[i]?Math.round(v/dayCnt[i]):0);
  const report=`=== REPORTE SOCIAL MEDIA (v4) ===
Página: ${page?.name||pageId}
Fecha: ${fmtDate(new Date())}
Seguidores: ${fmt(fans)}
Posts totales: ${posts.length} — FB: ${posts.filter(p=>p._plat==='FB').length}, IG: ${posts.filter(p=>p._plat==='IG').length} (${org.length} orgánicos, ${paid.length} pagados marcados)
Engagement Rate ORGÁNICO: ${erOrg}%

--- TOP 3 ORGÁNICOS ---
${top.map((p,i)=>`${i+1}. [${p._plat}/${p._fmt}] "${(p.message||'Sin texto').slice(0,70)}..."
   ${fmtDate(p.created_time)} | likes ${p._likes} coment ${p._comments} shares ${p._shares} | Alcance: ${p._reach>0?fmt(p._reach):'N/D'}`).join('\n\n')}

--- RENDIMIENTO POR FORMATO ---
${fmtLines}

--- ENGAGEMENT POR DIA (organico) ---
${DAYS.map((d,i)=>`  ${d}: ${dayCnt[i]} posts, ${dayAvg[i]} eng promedio`).join('\n')}

--- POSTS MARCADOS COMO PAGADOS ---
${paid.length?paid.map(p=>`  - "${(p.message||'').slice(0,50)}..." (${p._eng} eng)`).join('\n'):'  Ninguno marcado'}

=== FIN ===
Analiza con el modo ANALISIS de la skill de social media manager. Considera SOLO el rendimiento organico para el diagnostico (los pagados estan marcados aparte). Dame que funciona, que no, y 3 publicaciones concretas para esta semana.`;
  openReportModal('📋 Reporte para Codex','Copia y pega en el chat para análisis de social media.',report);
}
function copyReport(){ navigator.clipboard.writeText(document.getElementById('rptText').textContent).then(()=>{const b=document.querySelector('#rptModal .btn-p');b.textContent='✅ Copiado';setTimeout(()=>b.textContent='📋 Copiar',2000);}); }

// ════════ CSV ════════
function exportXLSX(pageId){
  const data=cache[pageId]; if(!data?.posts?.length) return alert('Sin datos.');
  if(typeof XLSX==='undefined') return alert('La librería de Excel no cargó (revisa tu conexión a internet) — intenta de nuevo.');

  const all=[...data.posts].sort((a,b)=>b._dt-a._dt); // más reciente primero
  const fb=all.filter(p=>p._plat==='FB'), ig=all.filter(p=>p._plat==='IG');
  const byId={}; all.forEach(p=>{byId[p.id]=p;});
  const pairsHere=LS.pairs.filter(pr=>byId[pr.fb]&&byId[pr.ig])
    .sort((a,b)=>Math.max(byId[b.fb]._dt,byId[b.ig]._dt)-Math.max(byId[a.fb]._dt,byId[a.ig]._dt));

  const rowOf=(p,withRed)=>{
    const row={};
    if(withRed) row['Red']=p._plat;
    row['Fecha']=fmtDate(p.created_time);
    row['Hora']=p._dt.getHours()+':00';
    row['Día']=DAYS[p._dt.getDay()];
    row['Formato']=p._fmt;
    row['Pagado']=p._paid?'SI':'NO';
    row['Texto']=p.message||'';
    row['Likes']=p._likes;
    row['Comentarios']=p._comments;
    row['Compartidos']=p._shares;
    row['Guardados']=p._saved||0;
    row['Engagement']=p._eng;
    row['Alcance']=p._reach||0;
    row['Impresiones']=p._impr||0;
    row['VideoViews']=p._vviews||0;
    return row;
  };
  const totalRow=(label,arr,withRed)=>{
    const S=k=>arr.reduce((s,p)=>s+(p[k]||0),0);
    const row={};
    if(withRed) row['Red']='';
    row['Fecha']=label; row['Hora']=''; row['Día']=''; row['Formato']='';
    row['Pagado']=`${arr.length} posts`; row['Texto']='';
    row['Likes']=S('_likes'); row['Comentarios']=S('_comments'); row['Compartidos']=S('_shares');
    row['Guardados']=S('_saved'); row['Engagement']=S('_eng'); row['Alcance']=S('_reach');
    row['Impresiones']=S('_impr'); row['VideoViews']=S('_vviews');
    return row;
  };

  const wb=XLSX.utils.book_new();

  const fbRows=fb.map(p=>rowOf(p,false)); if(fb.length) fbRows.push(totalRow('TOTAL FACEBOOK',fb,false));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(fbRows.length?fbRows:[{Fecha:'Sin datos'}]),'Facebook');

  if(ig.length){
    const igRows=ig.map(p=>rowOf(p,false)); igRows.push(totalRow('TOTAL INSTAGRAM',ig,false));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(igRows),'Instagram');
  }

  const genRows=all.map(p=>rowOf(p,true)); genRows.push(totalRow('TOTAL GENERAL',all,true));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(genRows),'General');

  if(pairsHere.length){
    const linkRows=pairsHere.map(pr=>{
      const fp=byId[pr.fb], ip=byId[pr.ig];
      return {
        'FechaFB':fmtDate(fp.created_time),'FechaIG':fmtDate(ip.created_time),
        'Formato':`${fp._fmt}/${ip._fmt}`,
        'TextoFB':fp.message||'','TextoIG':ip.message||'',
        'LikesFB':fp._likes,'LikesIG':ip._likes,
        'LikesTotal':fp._likes+ip._likes,
        'ComentariosTotal':fp._comments+ip._comments,
        'CompartidosTotal':fp._shares+ip._shares,
        'GuardadosTotal':(fp._saved||0)+(ip._saved||0),
        'EngagementTotal':fp._eng+ip._eng,
        'AlcanceTotal':(fp._reach||0)+(ip._reach||0),
        'VideoViewsTotal':(fp._vviews||0)+(ip._vviews||0)
      };
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(linkRows),'Vinculadas');
  }

  const fname=`${(pages.find(p=>p.id===pageId)?.name||'datos').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb,fname);
}
