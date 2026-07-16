function getPagePersonas(pageId){
  if(!LS.personas[pageId]) LS.personas[pageId]=[];
  return LS.personas[pageId];
}

function getLabDraft(pageId){
  if(!LS.labDrafts[pageId]){
    LS.labDrafts[pageId]={stage:'idea',distribution:'organic',platform:'instagram',surface:'reel',primaryGoal:'reach',secondaryGoal:'saves',personaId:'',topic:'',hook:'',message:'',cta:'',offer:'',notes:'',trial:false,mediaName:'',budget:'',paidAudience:'',campaignGoal:''};
  }
  return LS.labDrafts[pageId];
}

function viewLaboratorio(data){
  const pageId=currentPage.id,draft=getLabDraft(pageId),personas=getPagePersonas(pageId);
  if(!draft.personaId&&personas.length) draft.personaId=personas[0].id;
  const persona=personas.find(p=>p.id===draft.personaId)||null;
  const personaOptions=personas.map(p=>`<option value="${p.id}" ${p.id===draft.personaId?'selected':''}>${esc(p.name)}</option>`).join('');
  const goalOptions=Object.entries(GOALS).map(([id,g])=>`<option value="${id}">${g.label}</option>`).join('');
  const recent=data.posts.slice(0,10);

  document.getElementById('viewBody').innerHTML=`
    <div class="lab-intro">
      <div><div class="lab-kicker">PREPRODUCCIÓN + APRENDIZAJE</div><h2>Laboratorio de contenido</h2>
      <p>Define qué debe lograr la pieza, con quién debe conectar y genera un paquete de análisis basado en el histórico real de esta cuenta.</p></div>
      <div class="controls"><button class="btn-export" onclick="exportDashboardBackup()">↓ Exportar respaldo</button><label class="btn-report file-btn">↑ Importar respaldo<input type="file" accept="application/json" onchange="importDashboardBackup(this)"></label></div>
    </div>

    <div class="lab-grid">
      <section class="card-box lab-section">
        <div class="card-hdr"><div><div class="lab-step">01</div><div class="card-title">Buyer persona</div></div><div class="controls"><button class="ctrl-btn" onclick="newPersona()">+ Nuevo</button><label class="ctrl-btn file-btn">Subir<input type="file" accept=".json,.txt,.md,application/json,text/plain" onchange="importPersonaFile(this)"></label></div></div>
        <div class="form-field"><label>Perfil guardado</label><select id="labPersona" onchange="selectPersona(this.value)"><option value="">— Selecciona o crea un perfil —</option>${personaOptions}</select></div>
        ${personaEditor(persona)}
      </section>

      <section class="card-box lab-section">
        <div class="card-hdr"><div><div class="lab-step">02</div><div class="card-title">Objetivo y distribución</div></div></div>
        <div class="form-grid two">
          <div class="form-field"><label>Momento de análisis</label><select id="labStage" onchange="saveLabDraft()">
            <option value="idea" ${draft.stage==='idea'?'selected':''}>Idea antes de producir</option><option value="draft" ${draft.stage==='draft'?'selected':''}>Guion o borrador</option><option value="final" ${draft.stage==='final'?'selected':''}>Pieza terminada</option></select></div>
          <div class="form-field"><label>Distribución</label><select id="labDistribution" onchange="saveLabDraft()"><option value="organic" ${draft.distribution==='organic'?'selected':''}>Orgánico</option><option value="paid" ${draft.distribution==='paid'?'selected':''}>Pagado</option></select></div>
          <div class="form-field"><label>Red</label><select id="labPlatform" onchange="saveLabDraft()"><option value="instagram" ${draft.platform==='instagram'?'selected':''}>Instagram</option><option value="facebook" ${draft.platform==='facebook'?'selected':''}>Facebook</option></select></div>
          <div class="form-field"><label>Superficie / formato</label><select id="labSurface" onchange="saveLabDraft()"><option value="reel" ${draft.surface==='reel'?'selected':''}>Reel / video</option><option value="carousel" ${draft.surface==='carousel'?'selected':''}>Carrusel / álbum</option><option value="photo" ${draft.surface==='photo'?'selected':''}>Foto</option><option value="feed" ${draft.surface==='feed'?'selected':''}>Feed general</option></select></div>
          <div class="form-field"><label>Objetivo principal</label><select id="labPrimary" onchange="saveLabDraft()">${goalOptions}</select></div>
          <div class="form-field"><label>Objetivo secundario</label><select id="labSecondary" onchange="saveLabDraft()"><option value="">Ninguno</option>${goalOptions}</select></div>
        </div>
        <div id="paidFields" class="paid-fields ${draft.distribution==='paid'?'':'hidden'}">
          <div class="form-grid two">
            <div class="form-field"><label>Presupuesto planeado / invertido</label><input id="labBudget" type="number" min="0" step="0.01" value="${esc(draft.budget)}" placeholder="MXN" oninput="saveLabDraft()"></div>
            <div class="form-field"><label>Objetivo de campaña</label><input id="labCampaignGoal" value="${esc(draft.campaignGoal)}" placeholder="Mensajes, leads, ventas..." oninput="saveLabDraft()"></div>
            <div class="form-field span-2"><label>Audiencia o segmentación planeada</label><textarea id="labPaidAudience" rows="3" oninput="saveLabDraft()">${esc(draft.paidAudience)}</textarea></div>
          </div>
          <p class="lab-help">Esta primera versión usa la marca manual de contenido pagado y tus resultados de negocio. El gasto y la entrega completa de campañas requerirán posteriormente la API de Marketing de Meta.</p>
        </div>
        <label class="check-row"><input type="checkbox" id="labTrial" ${draft.trial?'checked':''} onchange="saveLabDraft()"> Marcar como candidato para Trial Reel</label>
      </section>
    </div>

    <section class="card-box lab-section">
      <div class="card-hdr"><div><div class="lab-step">03</div><div class="card-title">La pieza</div></div><span class="lab-save">Se guarda automáticamente en este dispositivo</span></div>
      <div class="form-grid two">
        <div class="form-field span-2"><label>Tema o idea central</label><input id="labTopic" value="${esc(draft.topic)}" placeholder="Ej. Cómo saber si ya puedes pensionarte" oninput="saveLabDraft()"></div>
        <div class="form-field span-2"><label>Hook / primera frase</label><input id="labHook" value="${esc(draft.hook)}" placeholder="La frase que detiene el scroll" oninput="saveLabDraft()"></div>
        <div class="form-field span-2"><label>Guion, caption o descripción</label><textarea id="labMessage" rows="7" placeholder="Pega aquí el guion o explica la idea..." oninput="saveLabDraft()">${esc(draft.message)}</textarea></div>
        <div class="form-field"><label>Oferta o promesa</label><input id="labOffer" value="${esc(draft.offer)}" placeholder="Qué obtiene la persona" oninput="saveLabDraft()"></div>
        <div class="form-field"><label>CTA</label><input id="labCta" value="${esc(draft.cta)}" placeholder="Qué debe hacer después" oninput="saveLabDraft()"></div>
        <div class="form-field span-2"><label>Notas de producción</label><textarea id="labNotes" rows="3" placeholder="Visuales, duración, referencias, presupuesto..." oninput="saveLabDraft()">${esc(draft.notes)}</textarea></div>
        <div class="form-field span-2"><label>Archivo de referencia (opcional)</label><input type="file" id="labMedia" accept="image/*,video/*" onchange="saveLabDraft()"><small>${draft.mediaName?`Guardado como referencia: ${esc(draft.mediaName)}`:'El archivo no se sube a GitHub. Al usar el paquete, adjúntalo también en Codex.'}</small></div>
      </div>
      <div id="labReadiness">${labReadiness(data,draft,persona)}</div>
      <div class="lab-actions"><button class="btn-p lab-primary" onclick="generateLabPacket()">📋 Generar paquete para Codex</button></div>
    </section>

    <div class="lab-grid">
      <section class="card-box lab-section">
        <div class="card-hdr"><div><div class="lab-step">04</div><div class="card-title">Resultados de negocio</div></div></div>
        <p class="lab-help">Registra lo que Meta no puede conocer. Esto permitirá que el sistema aprenda qué contenido genera mensajes, prospectos y ventas.</p>
        <div class="tbl-wrap outcome-table">${outcomesTable(recent)}</div>
      </section>
      <section class="card-box lab-section">
        <div class="card-hdr"><div><div class="lab-step">05</div><div class="card-title">Histórico de aprendizaje</div></div></div>
        <div id="snapshotStatus" class="snapshot-status">Consultando snapshots...</div>
        <div class="insight"><span class="ico">◉</span>Los snapshots se guardan por publicación y por día. La predicción mejorará cuando existan observaciones comparables a 24 h, 72 h y 7 días.</div>
      </section>
    </div>`;

  document.getElementById('labPrimary').value=draft.primaryGoal||'reach';
  document.getElementById('labSecondary').value=draft.secondaryGoal||'';
  updateSnapshotStatus(pageId);
}

function personaEditor(p){
  if(!p) return `<div class="empty-panel">Crea o sube un buyer persona para evaluar la alineación de cada pieza.</div>`;
  return `<div class="form-grid two persona-editor">
    <div class="form-field span-2"><label>Nombre del perfil</label><input id="personaName" value="${esc(p.name)}" placeholder="Ej. Prejubilado preocupado"></div>
    <div class="form-field"><label>Ubicación / contexto</label><input id="personaLocation" value="${esc(p.location)}" placeholder="Hermosillo, Sonora"></div>
    <div class="form-field"><label>Etapa de decisión</label><input id="personaStage" value="${esc(p.stage)}" placeholder="Descubrimiento, consideración..."></div>
    <div class="form-field span-2"><label>Quién es</label><textarea id="personaProfile" rows="3">${esc(p.profile)}</textarea></div>
    <div class="form-field"><label>Problemas y miedos</label><textarea id="personaProblems" rows="4">${esc(p.problems)}</textarea></div>
    <div class="form-field"><label>Deseos y resultados</label><textarea id="personaDesires" rows="4">${esc(p.desires)}</textarea></div>
    <div class="form-field"><label>Objeciones</label><textarea id="personaObjections" rows="3">${esc(p.objections)}</textarea></div>
    <div class="form-field"><label>Disparadores de interés</label><textarea id="personaTriggers" rows="3">${esc(p.triggers)}</textarea></div>
    <div class="form-field"><label>Tono recomendado</label><input id="personaTone" value="${esc(p.tone)}"></div>
    <div class="form-field"><label>Acción esperada</label><input id="personaAction" value="${esc(p.action)}"></div>
    <div class="span-2 controls"><button class="btn-p" onclick="savePersona()">Guardar buyer persona</button><button class="btn-g danger" onclick="deletePersona()">Eliminar</button></div>
  </div>`;
}

function blankPersona(){return {id:`persona_${Date.now()}`,name:'Nuevo buyer persona',location:'',stage:'',profile:'',problems:'',desires:'',objections:'',triggers:'',tone:'',action:'',updatedAt:new Date().toISOString()};}
function newPersona(){const arr=getPagePersonas(currentPage.id),p=blankPersona();arr.push(p);getLabDraft(currentPage.id).personaId=p.id;LS.save();renderView();}
function selectPersona(id){getLabDraft(currentPage.id).personaId=id;LS.save();renderView();}

function savePersona(){
  const draft=getLabDraft(currentPage.id),arr=getPagePersonas(currentPage.id),p=arr.find(x=>x.id===draft.personaId);if(!p)return;
  const val=id=>document.getElementById(id)?.value.trim()||'';
  Object.assign(p,{name:val('personaName'),location:val('personaLocation'),stage:val('personaStage'),profile:val('personaProfile'),problems:val('personaProblems'),desires:val('personaDesires'),objections:val('personaObjections'),triggers:val('personaTriggers'),tone:val('personaTone'),action:val('personaAction'),updatedAt:new Date().toISOString()});
  if(!p.name) return alert('Escribe un nombre para el buyer persona.');
  LS.save();renderView();
}

function deletePersona(){
  const draft=getLabDraft(currentPage.id);if(!draft.personaId||!confirm('¿Eliminar este buyer persona?'))return;
  LS.personas[currentPage.id]=getPagePersonas(currentPage.id).filter(p=>p.id!==draft.personaId);
  draft.personaId=LS.personas[currentPage.id][0]?.id||'';LS.save();renderView();
}

function importPersonaFile(input){
  const file=input.files?.[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{
    try{
      let p=blankPersona();
      if(file.name.toLowerCase().endsWith('.json')){const raw=JSON.parse(reader.result);Object.assign(p,raw.persona||raw);p.id=`persona_${Date.now()}`;}
      else {p.name=file.name.replace(/\.[^.]+$/,'');p.profile=String(reader.result).trim();}
      getPagePersonas(currentPage.id).push(p);getLabDraft(currentPage.id).personaId=p.id;LS.save();renderView();
    }catch(e){alert('No se pudo leer el buyer persona: '+e.message);}
  };reader.readAsText(file);
}

function saveLabDraft(){
  const d=getLabDraft(currentPage.id),val=id=>document.getElementById(id)?.value||'';
  Object.assign(d,{stage:val('labStage')||d.stage,distribution:val('labDistribution')||d.distribution,platform:val('labPlatform')||d.platform,surface:val('labSurface')||d.surface,primaryGoal:val('labPrimary')||d.primaryGoal,secondaryGoal:val('labSecondary'),topic:val('labTopic'),hook:val('labHook'),message:val('labMessage'),offer:val('labOffer'),cta:val('labCta'),notes:val('labNotes'),trial:!!document.getElementById('labTrial')?.checked,budget:val('labBudget'),campaignGoal:val('labCampaignGoal'),paidAudience:val('labPaidAudience')});
  const media=document.getElementById('labMedia')?.files?.[0];if(media)d.mediaName=media.name;
  LS.save();
  const paidFields=document.getElementById('paidFields');if(paidFields)paidFields.classList.toggle('hidden',d.distribution!=='paid');
  const readiness=document.getElementById('labReadiness');
  if(readiness){const persona=getPagePersonas(currentPage.id).find(p=>p.id===d.personaId);readiness.innerHTML=labReadiness(cache[currentPage.id],d,persona);}
}

function labReadiness(data,draft,persona){
  const platform=draft.platform==='instagram'?'IG':'FB',format=surfaceFormat(draft.surface);
  const samples=data.posts.filter(p=>p._plat===platform&&(!format||p._fmt===format)&&p._paid===(draft.distribution==='paid')).length;
  const checks=[['Buyer persona',!!persona],['Objetivo',!!draft.primaryGoal],['Tema',!!draft.topic],['Hook',!!draft.hook],['Mensaje o guion',!!draft.message],['CTA',!!draft.cta],['Histórico comparable',samples>=5]];
  return `<div class="readiness"><div class="readiness-title">Preparación de la prueba</div>${checks.map(([n,ok])=>`<span class="ready-chip ${ok?'ok':''}">${ok?'✓':'○'} ${n}</span>`).join('')}<div class="readiness-note">${samples} publicaciones históricas comparables. ${samples<5?'La recomendación se marcará con confianza baja.':'Ya existe una base inicial para comparar.'}</div></div>`;
}

function surfaceFormat(surface){return surface==='reel'?'Video':surface==='carousel'?'Álbum':surface==='photo'?'Foto':null;}
function goalValue(post,goalId){const goal=GOALS[goalId];if(!goal)return 0;if(goal.metric)return Number(post[goal.metric]||0);return Number(LS.outcomes[post.id]?.[goal.outcome]||0);}

function buildBenchmark(data,draft){
  const platform=draft.platform==='instagram'?'IG':'FB',format=surfaceFormat(draft.surface),paid=draft.distribution==='paid';
  const comparable=data.posts.filter(p=>p._plat===platform&&(!format||p._fmt===format)&&p._paid===paid);
  const ranked=[...comparable].sort((a,b)=>goalValue(b,draft.primaryGoal)-goalValue(a,draft.primaryGoal));
  const values=comparable.map(p=>goalValue(p,draft.primaryGoal));
  const positive=values.filter(v=>v>0),mean=positive.length?Math.round(avg(positive)):0;
  return {platform,format:format||'Todos los formatos',paid,sample:comparable.length,measured:positive.length,mean,
    top:ranked.slice(0,5).map(p=>({date:fmtDate(p.created_time),format:p._fmt,text:(p.message||'Sin texto').slice(0,100),value:goalValue(p,draft.primaryGoal)}))};
}

async function generateLabPacket(){
  saveLabDraft();
  const data=cache[currentPage.id],draft=getLabDraft(currentPage.id),persona=getPagePersonas(currentPage.id).find(p=>p.id===draft.personaId);
  if(!persona)return alert('Guarda o selecciona un buyer persona antes de generar el paquete.');
  if(!draft.topic&&!draft.message)return alert('Escribe al menos el tema o la descripción de la pieza.');
  const bench=buildBenchmark(data,draft),snaps=await getPostSnapshots(currentPage.id).catch(()=>[]);
  const goal=GOALS[draft.primaryGoal],secondary=GOALS[draft.secondaryGoal];
  const topLines=bench.top.length?bench.top.map((p,i)=>`${i+1}. ${p.date} | ${p.format} | ${goal.label}: ${p.value}\n   ${p.text}`).join('\n'):'Sin publicaciones comparables.';
  const packet=`=== LABORATORIO DE CONTENIDO — SOCIAL DASHBOARD ===
Cliente: ${currentPage.name}
Etapa analizada: ${draft.stage}
Distribución: ${draft.distribution==='paid'?'PAGADA':'ORGÁNICA'}
Red / superficie: ${bench.platform} / ${draft.surface}
Objetivo principal: ${goal.label}
Objetivo secundario: ${secondary?.label||'Ninguno'}
Trial Reel: ${draft.trial?'Sí, se considera para una prueba con no seguidores':'No'}
${draft.distribution==='paid'?`Presupuesto: ${draft.budget||'No especificado'} MXN\nObjetivo de campaña: ${draft.campaignGoal||'No especificado'}\nAudiencia pagada: ${draft.paidAudience||'No especificada'}\nNota: los insights de media no sustituyen las métricas de entrega del Administrador de Anuncios.`:''}

--- BUYER PERSONA ---
Nombre: ${persona.name}
Ubicación/contexto: ${persona.location||'No especificado'}
Etapa de decisión: ${persona.stage||'No especificada'}
Quién es: ${persona.profile||'No especificado'}
Problemas/miedos: ${persona.problems||'No especificados'}
Deseos/resultados: ${persona.desires||'No especificados'}
Objeciones: ${persona.objections||'No especificadas'}
Disparadores: ${persona.triggers||'No especificados'}
Tono recomendado: ${persona.tone||'No especificado'}
Acción esperada: ${persona.action||'No especificada'}

--- PIEZA ---
Tema: ${draft.topic||'No especificado'}
Hook: ${draft.hook||'No especificado'}
Guion/caption/descripción:
${draft.message||'No especificado'}

Oferta/promesa: ${draft.offer||'No especificada'}
CTA: ${draft.cta||'No especificado'}
Notas: ${draft.notes||'Ninguna'}
Archivo de referencia: ${draft.mediaName||'Ninguno'}${draft.mediaName?' (lo adjuntaré por separado en Codex)':''}

--- REFERENCIA HISTÓRICA DE ESTA CUENTA ---
Comparación: ${bench.platform} · ${bench.format} · ${bench.paid?'Pagado':'Orgánico'}
Muestra comparable: ${bench.sample} publicaciones (${bench.measured} con datos medibles para ${goal.label})
Promedio histórico medible: ${bench.mean}
Snapshots individuales disponibles: ${snaps.length}

Top comparables por ${goal.label}:
${topLines}

--- TAREA PARA CODEX ---
Analiza esta pieza como estratega de social media. Separa claramente:
1. Alineación con el buyer persona.
2. Potencial relativo frente al histórico de esta cuenta.
3. Riesgos para distribución orgánica o pagada según corresponda.
4. Cambios concretos en hook, mensaje, estructura visual y CTA.
5. Una versión mejorada de la idea o guion.
6. Una variante A/B enfocada al objetivo principal.
7. Qué medir a las 24 h, 72 h y 7 días.

No inventes una puntuación exacta del algoritmo de Meta ni garantices resultados. Indica confianza baja/media/alta según el tamaño y calidad de la muestra. Si adjunto imagen o video, analiza también la ejecución visual.
=== FIN DEL PAQUETE ===`;
  openReportModal('🧪 Paquete del Laboratorio','Copia este texto en Codex y adjunta la pieza si ya existe.',packet);
}

function outcomesTable(posts){
  if(!posts.length)return '<div class="empty-panel">No hay publicaciones cargadas.</div>';
  const rows=posts.map(p=>{const o=LS.outcomes[p.id]||{};return `<tr><td>${p._plat}</td><td>${fmtDate(p.created_time)}</td><td class="td-text">${esc((p.message||'Sin texto').slice(0,42))}</td><td><input id="spend_${p.id}" type="number" min="0" step="0.01" value="${o.spend||0}"></td><td><input id="msg_${p.id}" type="number" min="0" value="${o.messages||0}"></td><td><input id="lead_${p.id}" type="number" min="0" value="${o.leads||0}"></td><td><input id="sale_${p.id}" type="number" min="0" value="${o.sales||0}"></td><td><input id="rev_${p.id}" type="number" min="0" step="0.01" value="${o.revenue||0}"></td><td><button class="ctrl-btn" onclick="saveOutcome('${p.id}',this)">Guardar</button></td></tr>`;}).join('');
  return `<table><thead><tr><th>Red</th><th>Fecha</th><th>Pieza</th><th>Gasto</th><th>Mensajes</th><th>Prospectos</th><th>Ventas</th><th>Ingreso</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function saveOutcome(postId,button){
  const num=id=>Math.max(0,Number(document.getElementById(id)?.value||0));
  LS.outcomes[postId]={spend:num(`spend_${postId}`),messages:num(`msg_${postId}`),leads:num(`lead_${postId}`),sales:num(`sale_${postId}`),revenue:num(`rev_${postId}`),updatedAt:new Date().toISOString()};LS.save();
  if(button){button.textContent='✓ Guardado';setTimeout(()=>button.textContent='Guardar',1200);}
}

async function updateSnapshotStatus(pageId){
  const el=document.getElementById('snapshotStatus');if(!el)return;
  try{const rows=await getPostSnapshots(pageId),posts=new Set(rows.map(r=>r.postId)),days=new Set(rows.map(r=>r.capturedAt.slice(0,10)));
    el.innerHTML=`<div class="snapshot-number">${rows.length}</div><div><strong>puntos históricos</strong><br>${posts.size} publicaciones · ${days.size} días observados</div>`;
  }catch{el.textContent='El navegador no permitió consultar el histórico individual.';}
}

function openReportModal(title,description,text){
  const titleEl=document.getElementById('rptTitle'),descEl=document.getElementById('rptDescription');
  if(titleEl)titleEl.textContent=title;if(descEl)descEl.textContent=description;
  document.getElementById('rptText').textContent=text;document.getElementById('rptModal').style.display='flex';
}
