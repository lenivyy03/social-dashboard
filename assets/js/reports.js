// ════════ REPORT ════════
function genReport(pageId){
  const data=cache[pageId]; if(!data?.posts?.length) return;
  const {posts,fans}=data; const page=pages.find(p=>p.id===pageId);
  const org=posts.filter(p=>!p._paid), paid=posts.filter(p=>p._paid);
  const evaluated=org.map(post=>({post,...calculatePostER(post,LS.snaps[pageId]||[])}));
  const excluded=evaluated.filter(row=>!row.rankable);
  const ranked=scoreERPercentiles(evaluated.filter(row=>row.rankable)).sort((a,b)=>b.score-a.score||b.er-a.er);
  const erOrg=ranked.length?avg(ranked.map(row=>row.er)).toFixed(2):'N/D';
  const top=ranked.slice(0,3);
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
Engagement Rate ORGÁNICO comparable: ${erOrg}${erOrg==='N/D'?'':'%'}
Metodología ER: alcance real; si falta, snapshot de seguidores de la fecha (estimado); si ambos faltan, se excluye.
Posts excluidos por falta de datos: ${excluded.length}

--- TOP 3 ORGÁNICOS ---
${top.length?top.map((row,i)=>{const p=row.post;return `${i+1}. [${p._plat}/${p._fmt}] "${(p.message||'Sin texto').slice(0,70)}..."
   ${fmtDate(p.created_time)} | ER ${row.er.toFixed(2)}% (${row.label}) | percentil ${row.score.toFixed(1)}/10${row.sampleSmall?' · muestra chica':''} | likes ${p._likes} coment ${p._comments} shares ${p._shares} | Alcance: ${p._reach>0?fmt(p._reach):'N/D'}`;}).join('\n\n'):'Sin publicaciones con datos suficientes.'}

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

// ════════ EXCEL ════════
function styledExcelSheet(title,subtitle,headers,rows){
  const matrix=[
    [title],
    [subtitle],
    [],
    headers,
    ...rows.map(row=>headers.map(header=>row[header]??''))
  ];
  const ws=XLSX.utils.aoa_to_sheet(matrix,{cellDates:true});
  const lastCol=headers.length-1,lastRow=matrix.length-1;
  const border={top:{style:'thin',color:{rgb:'D8D4C8'}},bottom:{style:'thin',color:{rgb:'D8D4C8'}},left:{style:'thin',color:{rgb:'D8D4C8'}},right:{style:'thin',color:{rgb:'D8D4C8'}}};
  const titleStyle={font:{name:'Aptos Display',sz:16,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'111111'}},alignment:{vertical:'center',horizontal:'left'}};
  const subtitleStyle={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'FF3D00'}},alignment:{vertical:'center',horizontal:'left'}};
  const headerStyle={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'111111'}},alignment:{vertical:'center',horizontal:'center',wrapText:true},border};
  const bodyStyle=(alternate)=>({font:{name:'Aptos',sz:10,color:{rgb:'222222'}},fill:{patternType:'solid',fgColor:{rgb:alternate?'F5F3EC':'FFFFFF'}},alignment:{vertical:'top',wrapText:true},border});
  const totalStyle={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'FF3D00'}},alignment:{vertical:'center'},border};

  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:lastCol}},{s:{r:1,c:0},e:{r:1,c:lastCol}}];
  ws['!rows']=[{hpt:28},{hpt:21},{hpt:8},{hpt:28}];
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:3,c:0},e:{r:Math.max(3,lastRow),c:lastCol}})};
  ws['!margins']={left:0.3,right:0.3,top:0.5,bottom:0.5,header:0.2,footer:0.2};

  for(let c=0;c<=lastCol;c++){
    const titleCell=ws[XLSX.utils.encode_cell({r:0,c})]||(ws[XLSX.utils.encode_cell({r:0,c})]={t:'s',v:''});
    const subtitleCell=ws[XLSX.utils.encode_cell({r:1,c})]||(ws[XLSX.utils.encode_cell({r:1,c})]={t:'s',v:''});
    titleCell.s=titleStyle; subtitleCell.s=subtitleStyle;
    ws[XLSX.utils.encode_cell({r:3,c})].s=headerStyle;
  }

  rows.forEach((row,index)=>{
    const r=index+4;
    const isTotal=Object.values(row).some(v=>typeof v==='string'&&v.startsWith('TOTAL'));
    for(let c=0;c<=lastCol;c++){
      const cell=ws[XLSX.utils.encode_cell({r,c})]; if(!cell) continue;
      cell.s=isTotal?totalStyle:bodyStyle(index%2===1);
      if(cell.t==='n') cell.s={...cell.s,numFmt:'#,##0',alignment:{...cell.s.alignment,horizontal:'right'}};
      if(cell.t==='d') cell.s={...cell.s,numFmt:'dd/mm/yyyy',alignment:{...cell.s.alignment,horizontal:'center'}};
    }
    ws['!rows'][r]={hpt:isTotal?22:34};
  });

  ws['!cols']=headers.map((header,c)=>{
    const values=[header,...rows.map(row=>row[header])];
    let width=Math.max(...values.map(value=>{
      if(value instanceof Date) return 12;
      return String(value??'').length;
    }),10)+2;
    if(/Texto|Caption/.test(header)) width=Math.min(Math.max(width,30),55);
    else width=Math.min(width,22);
    return {wch:width};
  });
  return ws;
}

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
    row['Fecha']=new Date(p.created_time);
    row['Hora']=String(p._dt.getHours()).padStart(2,'0')+':00';
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
  const pageName=pages.find(p=>p.id===pageId)?.name||'Social Dashboard';
  const months=loadedMonthCount(data);
  const generated=`Ventana: últimos ${months} meses · ${all.length} publicaciones · Generado el ${fmtDate(new Date())}`;
  const baseHeaders=Object.keys(rowOf(all[0],false));
  const generalHeaders=Object.keys(rowOf(all[0],true));

  const fbRows=fb.map(p=>rowOf(p,false)); if(fb.length) fbRows.push(totalRow('TOTAL FACEBOOK',fb,false));
  XLSX.utils.book_append_sheet(wb,styledExcelSheet(`${pageName} · FACEBOOK`,generated,baseHeaders,fbRows),'Facebook');

  const igRows=ig.map(p=>rowOf(p,false)); if(ig.length) igRows.push(totalRow('TOTAL INSTAGRAM',ig,false));
  XLSX.utils.book_append_sheet(wb,styledExcelSheet(`${pageName} · INSTAGRAM`,generated,baseHeaders,igRows),'Instagram');

  const genRows=all.map(p=>rowOf(p,true)); genRows.push(totalRow('TOTAL GENERAL',all,true));
  XLSX.utils.book_append_sheet(wb,styledExcelSheet(`${pageName} · REPORTE GENERAL`,generated,generalHeaders,genRows),'General');

  const linkRows=pairsHere.map(pr=>{
    const fp=byId[pr.fb], ip=byId[pr.ig];
    return {
      'FechaFB':new Date(fp.created_time),'FechaIG':new Date(ip.created_time),
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
  const linkHeaders=['FechaFB','FechaIG','Formato','TextoFB','TextoIG','LikesFB','LikesIG','LikesTotal','ComentariosTotal','CompartidosTotal','GuardadosTotal','EngagementTotal','AlcanceTotal','VideoViewsTotal'];
  XLSX.utils.book_append_sheet(wb,styledExcelSheet(`${pageName} · PIEZAS VINCULADAS`,generated,linkHeaders,linkRows),'Vinculadas');

  wb.Props={Title:`Reporte social de ${pageName} · últimos ${months} meses`,Subject:`Analítica de Facebook e Instagram · ventana móvil de ${months} meses`,Author:'social.dashboard',CreatedDate:new Date()};
  const fname=`${pageName.replace(/[^a-z0-9áéíóúñ]+/gi,'_')}_ultimos_${months}_meses_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb,fname,{bookType:'xlsx',cellStyles:true,compression:true});
}
