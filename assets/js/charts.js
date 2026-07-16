// ════════ CHARTS ════════
function setupCanvas(c,W,H){ const dpr=window.devicePixelRatio||1; c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px'; c.getContext('2d').scale(dpr,dpr); }

function drawTimeline(posts,id){
  const c=document.getElementById(id); if(!c)return;
  const W=c.parentElement.clientWidth-36,H=200; setupCanvas(c,W,H);
  const sorted=[...posts].sort((a,b)=>a._dt-b._dt);
  barChartLabeled(c.getContext('2d'),W,H,sorted.map(p=>p._eng),sorted.map(p=>`${String(p._dt.getDate()).padStart(2,'0')}/${String(p._dt.getMonth()+1).padStart(2,'0')}`),'#111111',sorted.map(p=>p._paid));
}

function drawBars(posts,id){
  const c=document.getElementById(id); if(!c)return;
  const sorted=sortPosts(posts);
  const W=c.parentElement.clientWidth-36,H=220; setupCanvas(c,W,H);
  barChartLabeled(c.getContext('2d'),W,H,sorted.map(p=>p._eng),sorted.map(p=>`${String(p._dt.getDate()).padStart(2,'0')}/${String(p._dt.getMonth()+1).padStart(2,'0')}`),'#111111',sorted.map(p=>p._paid));
}

function barChartLabeled(ctx,W,H,data,labels,color,paidArr){
  const pad={t:12,b:30,l:38,r:8},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const max=Math.max(...data,1);
  const bW=Math.max(4,Math.min(26,cW/data.length-3)),gap=cW/data.length;
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<=4;i++){const y=pad.t+(cH/4)*i;ctx.strokeStyle='rgba(17,17,17,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle='#8a8a8a';ctx.font='9px Share Tech Mono';ctx.textAlign='right';ctx.fillText(fmt(Math.round(max*(1-i/4))),pad.l-4,y+3);}
  data.forEach((v,i)=>{
    const x=pad.l+i*gap+(gap-bW)/2,h=(v/max)*cH,y=pad.t+cH-h;
    const isPaid=Array.isArray(paidArr)&&paidArr[i];
    ctx.fillStyle=isPaid?'#ff3d00':color; ctx.globalAlpha=.85;
    const r=Math.min(3,bW/2);
    ctx.beginPath();ctx.moveTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.arcTo(x+bW,y,x+bW,y+r,r);ctx.lineTo(x+bW,pad.t+cH);ctx.lineTo(x,pad.t+cH);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    if(data.length<=18||i%Math.ceil(data.length/12)===0){ctx.fillStyle='#8a8a8a';ctx.font='8px Share Tech Mono';ctx.textAlign='center';ctx.fillText(labels[i],x+bW/2,H-4);}
  });
  if(Array.isArray(paidArr)){ctx.fillStyle='#ff3d00';ctx.fillRect(W-pad.r-70,pad.t,8,8);ctx.fillStyle='#8a8a8a';ctx.font='9px Share Tech Mono';ctx.textAlign='left';ctx.fillText('= pagado',W-pad.r-58,pad.t+8);}
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

