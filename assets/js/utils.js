function avg(a){return a.length?a.reduce((s,v)=>s+(v||0),0)/a.length:0;}
function fmt(n){if(n===undefined||n===null)return'—';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toString();}
function fmtDate(d){const dt=new Date(d);return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sk(n,h){return[...Array(n)].map(()=>`<div class="skel" style="height:${h}px;border-radius:12px"></div>`).join('');}
