// ════════ CHARTS ════════
function setupCanvas(c,W,H){ const dpr=window.devicePixelRatio||1; c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px'; c.getContext('2d').scale(dpr,dpr); }

function drawTimeline(posts,id){
  const c=document.getElementById(id); if(!c)return;
  const W=c.parentElement.clientWidth-36,H=200; setupCanvas(c,W,H);
  const sorted=[...posts].sort((a,b)=>a._dt-b._dt);
  const mixed=platFilter==='todos';
  const colors=mixed?sorted.map(p=>p._plat==='IG'?'#E1306C':'#1877F2'):'#111111';
  barChartLabeled(c.getContext('2d'),W,H,sorted.map(p=>p._eng),sorted.map(p=>`${String(p._dt.getDate()).padStart(2,'0')}/${String(p._dt.getMonth()+1).padStart(2,'0')}`),colors,sorted.map(p=>p._paid),null,{platforms:mixed});
}

function drawBars(posts,id,metricKey='_eng',maxOverride=null,orderMode='chronological'){
  const c=document.getElementById(id); if(!c)return;
  const sorted=orderComparePosts(posts,metricKey,orderMode);
  const W=c.parentElement.clientWidth-36,H=220; setupCanvas(c,W,H);
  const mixed=platFilter==='todos';
  const colors=mixed?sorted.map(p=>p._plat==='IG'?'#E1306C':'#1877F2'):'#111111';
  barChartLabeled(c.getContext('2d'),W,H,sorted.map(p=>p[metricKey]||0),sorted.map(p=>`${String(p._dt.getDate()).padStart(2,'0')}/${String(p._dt.getMonth()+1).padStart(2,'0')}`),colors,sorted.map(p=>p._paid),maxOverride,{platforms:mixed});
}

function orderComparePosts(posts,metricKey='_eng',orderMode='chronological'){
  if(orderMode==='chronological') return [...posts].sort((a,b)=>a._dt-b._dt||String(a._plat).localeCompare(String(b._plat)));
  const direction=orderMode==='asc'?1:-1;
  return [...posts].sort((a,b)=>{
    const difference=((a[metricKey]||0)-(b[metricKey]||0))*direction;
    return difference||a._dt-b._dt||String(a._plat).localeCompare(String(b._plat));
  });
}

function barChartLabeled(ctx,W,H,data,labels,colors,paidArr,maxOverride=null,legend={}){
  const pad={t:legend.platforms?30:12,b:30,l:38,r:8},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const max=Math.max(maxOverride||0,...data,1),count=Math.max(data.length,1);
  const bW=Math.max(4,Math.min(26,cW/count-3)),gap=cW/count;
  const labelStep=Math.max(1,Math.ceil(data.length/8));
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<=4;i++){const y=pad.t+(cH/4)*i;ctx.strokeStyle='rgba(17,17,17,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle='#8a8a8a';ctx.font='9px Share Tech Mono';ctx.textAlign='right';ctx.fillText(fmt(Math.round(max*(1-i/4))),pad.l-4,y+3);}
  data.forEach((v,i)=>{
    const x=pad.l+i*gap+(gap-bW)/2,h=(v/max)*cH,y=pad.t+cH-h;
    const isPaid=Array.isArray(paidArr)&&paidArr[i];
    ctx.fillStyle=Array.isArray(colors)?(colors[i]||'#111111'):colors; ctx.globalAlpha=.88;
    const r=Math.min(3,bW/2);
    ctx.beginPath();ctx.moveTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.arcTo(x+bW,y,x+bW,y+r,r);ctx.lineTo(x+bW,pad.t+cH);ctx.lineTo(x,pad.t+cH);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    if(isPaid&&h>0){ctx.strokeStyle='#ff3d00';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+1);ctx.lineTo(x+bW,y+1);ctx.stroke();}
    if(data.length<=8&&v>0){ctx.fillStyle='#444';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText(fmt(v),x+bW/2,Math.max(pad.t+8,y-4));}
    if(i%labelStep===0||i===data.length-1){ctx.fillStyle='#8a8a8a';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText(labels[i],x+bW/2,H-4);}
  });
  if(legend.platforms){
    const items=[['#1877F2','FB'],['#E1306C','IG']];let x=pad.l;
    ctx.font='9px JetBrains Mono';ctx.textAlign='left';
    items.forEach(([color,label])=>{ctx.fillStyle=color;ctx.fillRect(x,6,8,8);ctx.fillStyle='#666';ctx.fillText(label,x+12,14);x+=42;});
    ctx.strokeStyle='#ff3d00';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,10);ctx.lineTo(x+12,10);ctx.stroke();ctx.fillStyle='#666';ctx.fillText('borde naranja = pagado',x+17,14);
  }else if(Array.isArray(paidArr)&&paidArr.some(Boolean)){
    ctx.strokeStyle='#ff3d00';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W-pad.r-96,pad.t+4);ctx.lineTo(W-pad.r-84,pad.t+4);ctx.stroke();ctx.fillStyle='#8a8a8a';ctx.font='9px JetBrains Mono';ctx.textAlign='left';ctx.fillText('= pagado',W-pad.r-79,pad.t+8);
  }
}

function multiLineChart(ctx,W,H,series){
  const pad={t:12,b:28,l:46,r:10},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const points=series.flatMap(item=>item.points||[]);
  if(!points.length) return;
  const dates=[...new Set(points.map(point=>point.date))].sort();
  const values=points.map(point=>Number(point.value)||0),max=Math.max(...values,1),min=Math.min(...values,0),range=max-min||1;
  const firstTime=new Date(`${dates[0]}T00:00:00Z`).getTime(),lastTime=new Date(`${dates[dates.length-1]}T00:00:00Z`).getTime();
  const px=date=>pad.l+((new Date(`${date}T00:00:00Z`).getTime()-firstTime)/(lastTime-firstTime||1))*cW;
  const py=value=>pad.t+cH-((value-min)/range)*cH;
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<=4;i++){const y=pad.t+(cH/4)*i;ctx.strokeStyle='rgba(17,17,17,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle='#8a8a8a';ctx.font='9px JetBrains Mono';ctx.textAlign='right';ctx.fillText(fmt(Math.round(max-(range*i/4))),pad.l-4,y+3);}
  series.forEach(item=>{
    const rows=[...(item.points||[])].sort((a,b)=>a.date.localeCompare(b.date));
    if(!rows.length) return;
    ctx.strokeStyle=item.color;ctx.lineWidth=2;ctx.beginPath();rows.forEach((point,index)=>{const x=px(point.date),y=py(Number(point.value)||0);index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    rows.forEach(point=>{ctx.fillStyle=item.color;ctx.beginPath();ctx.arc(px(point.date),py(Number(point.value)||0),2.3,0,Math.PI*2);ctx.fill();});
  });
  const step=Math.max(1,Math.ceil(dates.length/8));
  dates.forEach((date,index)=>{if(index%step===0||index===dates.length-1){const parts=date.split('-');ctx.fillStyle='#8a8a8a';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText(`${parts[2]}/${parts[1]}`,px(date),H-4);}});
}

function lineChart(ctx,W,H,data,labels,color,fill){
  const pad={t:12,b:28,l:42,r:10},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const max=Math.max(...data),min=Math.min(...data),range=max-min||1;
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<=4;i++){const y=pad.t+(cH/4)*i;ctx.strokeStyle='rgba(17,17,17,0.12)';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle='#8a8a8a';ctx.font='9px Share Tech Mono';ctx.textAlign='right';ctx.fillText(fmt(Math.round(max-(range*i/4))),pad.l-4,y+3);}
  const px=i=>pad.l+(cW/(data.length-1||1))*i, py=v=>pad.t+cH-((v-min)/range)*cH;
  if(fill){ctx.beginPath();ctx.moveTo(px(0),pad.t+cH);data.forEach((v,i)=>ctx.lineTo(px(i),py(v)));ctx.lineTo(px(data.length-1),pad.t+cH);ctx.closePath();const g=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);g.addColorStop(0,'rgba(17,17,17,0.15)');g.addColorStop(1,'rgba(17,17,17,0)');ctx.fillStyle=g;ctx.fill();}
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();data.forEach((v,i)=>{i===0?ctx.moveTo(px(i),py(v)):ctx.lineTo(px(i),py(v));});ctx.stroke();
  data.forEach((v,i)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(i),py(v),2.5,0,Math.PI*2);ctx.fill();});
  const step=Math.max(1,Math.ceil(data.length/8));
  labels.forEach((l,i)=>{if(i%step===0||i===data.length-1){ctx.fillStyle='#8a8a8a';ctx.font='8px Share Tech Mono';ctx.textAlign='center';ctx.fillText(l,px(i),H-4);}});
}
