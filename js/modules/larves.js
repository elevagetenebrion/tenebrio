/* ══ LARVES ══ */
const LAR_LS = 'larves_v7';
const LAR_STADES = [
  {id:'v00',label:'Vers 00',offset:0,isV08:false},
  {id:'v0',label:'Vers 0',offset:15,isV08:false},
  {id:'v20',label:'Vers 20',offset:30,isV08:false},
  {id:'v12',label:'Vers 12',offset:45,isV08:false},
  {id:'v10',label:'Vers 10',offset:60,isV08:false},
  {id:'v08',label:'Vers 08',offset:75,isV08:true},
  {id:'nymph',label:'Nymphes 06',offset:null,isV08:false},
];
const LAR_CLBLS = LAR_STADES.map(s=>s.label);
const LAR_CCLRS = ['#e8ddd0','#d4c4a8','#b8a880','#9a8860','#7a6840','#5a4820','#9a7818'];

function larToday(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate());}
function larAddD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function larS2d(s){if(!s)return null;const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function larD2s(d){if(!d)return null;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function larFr(s){if(!s)return '—';const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function larDiff(a,b){const da=larS2d(a),db=larS2d(b);if(!da||!db)return null;return Math.round((db-da)/86400000);}

function larNymphAuto(row){
  const v=row.v08;
  return(v!==null&&v!==undefined&&v!=='')?parseFloat((parseFloat(v)/4).toFixed(2)):null;
}

let larSimOff=0;
function larSimD(){return larAddD(larToday(),larSimOff);}
function larSimS(){return larD2s(larSimD());}
function larRefreshSim(){
  const sd=document.getElementById('larSimDisplay'); if(!sd) return;
  sd.textContent=larSimD().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('larSimDateInput').value=larSimS();
  document.getElementById('larSimDot').className=larSimOff===0?'lar-dot-real':'lar-dot-active';
  larRender();
}
function larShiftSim(n){larSimOff+=n;larRefreshSim();}
function larResetSim(){larSimOff=0;larRefreshSim();}
function larApplySimInput(){
  const v=document.getElementById('larSimDateInput').value;
  if(v){larSimOff=Math.round((larS2d(v)-larToday())/86400000);larRefreshSim();}
}

let larData=[],larEditId=null;
function larLoad(){try{larData=JSON.parse(localStorage.getItem(LAR_LS))||[];}catch(e){larData=[];}}
function larSave(){
  localStorage.setItem(LAR_LS,JSON.stringify(larData));
  fbSafeSave(LAR_LS, larData);
}
async function larSyncFromCloud(){
    const cloudData = await fbSafeLoad(LAR_LS, null);
  if (cloudData !== null) { larData = cloudData; localStorage.setItem(LAR_LS, JSON.stringify(cloudData)); }
}

let larKRow=null,larKField=null,larKVal='';
function larOpenKpad(rowIdx,fieldId,curVal,label){
  larKRow=rowIdx; larKField=fieldId;
  larKVal=(curVal!==null&&curVal!==undefined&&curVal!=='')?String(curVal):'';
  document.getElementById('larKpadLabel').textContent=label;
  const row=larData[rowIdx];
  const dateExistante=row.dates&&row.dates[fieldId];
  document.getElementById('larKpadDate').value=dateExistante||larSimS();
  larRefreshKDisp();
  document.getElementById('larKpadOverlay').classList.add('open');
  document.querySelectorAll('#page-larves .lar-poids-zone:not(.lar-auto-val)').forEach(z=>z.classList.remove('lar-editing'));
  const z=document.querySelector('.lar-poids-zone[data-row="'+rowIdx+'"][data-field="'+fieldId+'"]');
  if(z){z.classList.add('lar-editing');z.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function larRefreshKDisp(){
  document.getElementById('larKpadDisplay').innerHTML=(larKVal||'0')+'<span class="lar-unit"> g</span>';
}
function larHandleNK(k){
  if(k==='CANCEL'){ larCloseKpad(); return; }
  if(k==='DEL'){ larKVal=larKVal.slice(0,-1); }
  else if(k==='.'){ if(!larKVal.includes('.')) larKVal+='.'; }
  else if(k==='OK'){ larCommitKpad(); return; }
  else{ if(larKVal===''||larKVal==='0') larKVal=k; else larKVal+=k; }
  larRefreshKDisp();
}
function larCommitKpad(){
  if(larKRow!==null&&larKField!==null){
    const v=(larKVal!==''&&!isNaN(parseFloat(larKVal)))?parseFloat(larKVal):null;
    larData[larKRow][larKField]=v;
    const dateOp=document.getElementById('larKpadDate').value;
    if(!larData[larKRow].dates) larData[larKRow].dates={};
    if(v!==null && dateOp){ larData[larKRow].dates[larKField]=dateOp; }
    else if(v===null){ delete larData[larKRow].dates[larKField]; }
    larSave(); larRender();
    if(larKField==='v08'&&v!==null){
      const auto=parseFloat((v/4).toFixed(2));
      larShowToast('Vers 08 : '+v.toLocaleString('fr-FR')+' g le '+larFr(dateOp)+' — Nymphes 06 auto : '+auto.toLocaleString('fr-FR')+' g');
    } else {
      larShowToast(v!==null?(v.toLocaleString('fr-FR')+' g enregistré le '+larFr(dateOp)):'Valeur effacée');
    }
  }
  larCloseKpad();
}
function larCloseKpad(){
  document.getElementById('larKpadOverlay').classList.remove('open');
  document.querySelectorAll('#page-larves .lar-poids-zone').forEach(z=>z.classList.remove('lar-editing'));
  larKRow=null;larKField=null;larKVal='';
}

function larFmtG(v){
  return(v!==null&&v!==undefined&&v!=='')?parseFloat(v).toLocaleString('fr-FR')+' g':null;
}
function larGetActiveStade(j){
  if(j===null||j<0) return null;
  const offsets=[0,15,30,45,60,75];
  for(let i=0;i<offsets.length-1;i++){
    if(j>=offsets[i]&&j<offsets[i+1]) return LAR_STADES[i].id;
  }
  if(j>=75) return 'v08';
  return null;
}

function larRender(){
  const tbody=document.getElementById('larTbody'); if(!tbody) return;
  document.getElementById('larCntBadge').textContent=larData.length+' bac(s)';

  if(!larData.length){
    tbody.innerHTML='<tr class="lar-empty-row"><td colspan="10">Aucun bac — cliquez sur « Nouveau bac » pour commencer.</td></tr>';
    larUpdateChart([]); return;
  }

  const ts=larSimS();
  const tot={},cnt={};
  LAR_STADES.forEach(s=>{tot[s.id]=0;cnt[s.id]=0;});

  larData.forEach(r=>{
    LAR_STADES.forEach(s=>{
      const v=s.id==='nymph'?larNymphAuto(r):r[s.id];
      if(v!==null&&v!==undefined&&v!==''){tot[s.id]+=parseFloat(v);cnt[s.id]++;}
    });
  });

  const filtreBacRaw=(document.getElementById('larRechercheBac')?.value||'').trim();
  const filtreDate=(document.getElementById('larRechercheDate')?.value||'').trim();
  // Support multi-bacs séparés par virgule ou espace : "12, 15 23" → ['12','15','23']
  const filtreBacs = filtreBacRaw ? filtreBacRaw.split(/[,\s]+/).map(s=>s.trim()).filter(s=>s.length>0) : [];

  let rows='';
  let nbAffiches=0;
  const larOrdreAffichage=larData.map(function(row,i){return i;}).sort(function(a,b){
    return (parseInt(larData[a].bac,10)||0)-(parseInt(larData[b].bac,10)||0);
  });
  larOrdreAffichage.forEach(function(i){
    const row=larData[i];
    if(filtreBacs.length>0 || filtreDate){
      const bacStr = String(row.bac||'').trim();
      const matchBac = filtreBacs.length>0 && filtreBacs.some(function(f){ return bacStr===f || bacStr.indexOf(f)!==-1; });
      const matchDate = filtreDate && (row.dateEntree||'').trim()===filtreDate;
      if(!matchBac && !matchDate) return;
    }
    nbAffiches++;
    const entry=row.dateEntree;
    const j=entry?larDiff(entry,ts):null;
    const ast=larGetActiveStade(j);
    const jbg=j!==null&&j>=0?('<div class="lar-jbg">J+'+j+'</div>'):(j!==null?'<div class="lar-jbg lar-jbg-f">futur</div>':'');

    const cells=LAR_STADES.map(s=>{
      const sd=(s.offset!==null&&entry)?larD2s(larAddD(larS2d(entry),s.offset)):null;
      const sj=sd?larDiff(sd,ts):null;
      const isAct=s.id===ast;
      const sIdx=LAR_STADES.findIndex(x=>x.id===s.id);
      const nextOff=LAR_STADES[sIdx+1]?LAR_STADES[sIdx+1].offset:null;
      const isPast=nextOff!==null&&j!==null&&j>=nextOff;
      const isFut=sj!==null&&sj<0;

      let tdcls='';
      if(s.id==='v08') tdcls='lar-tdv08';
      if(s.id==='nymph') tdcls='lar-tdnp';
      if(isAct) tdcls+=' lar-td-active';
      else if(isPast) tdcls+=' lar-td-past';
      else if(isFut) tdcls+=' lar-td-future';

      const dateReelle=row.dates&&row.dates[s.id];
      const dateLbl=dateReelle
        ?('<div class="lar-sc-date lar-sc-date-reelle'+(isAct?' lar-adate':'')+'" title="Date réelle de l\'opération saisie par le technicien">✓ '+larFr(dateReelle)+'</div>')
        :(sd?('<div class="lar-sc-date'+(isAct?' lar-adate':'')+'">'+larFr(sd)+'</div>'):'');
      let poidsHtml='';

      if(s.id==='nymph'){
        const auto=larNymphAuto(row);
        const g=larFmtG(auto);
        const dejaTransfere=row.nymphTransfere===true;
        const btnTransfer=(auto!==null&&!dejaTransfere)
          ?('<button class="lar-btn-transfer" data-row="'+i+'" title="Créer un bac Nymphes avec ce poids">→ Nymphes</button>')
          :(dejaTransfere?'<span class="lar-transfer-ok">✓ Transféré</span>':'');
        poidsHtml='<div class="lar-poids-zone lar-auto-val" title="Calculé automatiquement = 1/4 de Vers 08">'+
          (g?('<div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><span class="lar-poids-val" style="color:var(--lgreen);">'+g+'</span><span class="lar-auto-tag">↑ auto</span>'+btnTransfer+'</div>'):'<span class="lar-poids-empty">— (après saisie Vers 08)</span>')+
          '</div>';
      } else if(s.id==='v08'){
        const v08=(row.v08!==null&&row.v08!==undefined&&row.v08!=='')?parseFloat(row.v08):null;
        const inner=v08!==null
          ?('<div class="lar-v08w"><div class="lar-v08r">'+(v08*3/4).toLocaleString('fr-FR')+' g</div><div class="lar-v08l">→ déshydratation</div><div class="lar-v08s">'+(v08/4).toLocaleString('fr-FR')+' g</div><div class="lar-v08l">→ Nymphes 06 (auto)</div></div>')
          :'<span class="lar-poids-empty">+ poids total</span>';
        poidsHtml='<div class="lar-poids-zone'+(v08!==null?' lar-has-val':'')+'" data-row="'+i+'" data-field="v08" data-label="Vers 08 — poids total du bac">'+inner+'</div>';
      } else {
        const v=row[s.id]; const g=larFmtG(v);
        poidsHtml='<div class="lar-poids-zone'+(g?' lar-has-val':'')+'" data-row="'+i+'" data-field="'+s.id+'" data-label="'+s.label+' — poids du bac">'+
          (g?('<span class="lar-poids-val">'+g+'</span>'):'<span class="lar-poids-empty">+ poids</span>')+'</div>';
      }
      return '<td class="'+tdcls.trim()+'"><div class="lar-sc-cell">'+dateLbl+poidsHtml+'</div></td>';
    }).join('');

    rows+='<tr><td class="lar-tdt"><div class="lar-dtv">'+larFr(entry)+'</div>'+jbg+'</td>'+
      '<td class="lar-tdb" style="vertical-align:middle;">'+(row.bac||'—')+'</td>'+
      cells+
      '<td style="vertical-align:middle;"><div class="lar-btn-row"><button class="lar-bic" data-edit="'+i+'">✏️</button><button class="lar-bic" data-del="'+i+'">✕</button></div></td></tr>';
  });

  const totCells=LAR_STADES.map(s=>{
    const t=tot[s.id],c=cnt[s.id];
    const moy=c>0?(t/c):null;
    const ms=moy!==null?moy.toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
    const ts2=c>0?t.toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
    if(s.id==='v08'){
      const r3=c>0?(t*3/4).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
      const r1=c>0?(t/4).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
      return '<td class="lar-tdv08" style="text-align:center;"><div class="lar-tv08r">∑ '+r3+' g</div><div class="lar-v08l">→ déshydratation</div><div class="lar-tv08s">∑ '+r1+' g</div><div class="lar-v08l">→ Nymphes 06</div><div class="lar-mv">Moy. '+ms+' g · '+c+' bac'+(c>1?'s':'')+'</div></td>';
    }
    if(s.id==='nymph'){
      return '<td class="lar-tdnp" style="text-align:center;"><div class="lar-tv" style="color:var(--lgreen);">∑ '+ts2+' g</div><div class="lar-mv">Moy. '+ms+' g · '+c+' bac'+(c>1?'s':'')+'</div><div style="font-size:.6rem;color:var(--lgreen);margin-top:2px;">↑ calculé auto</div></td>';
    }
    return '<td style="text-align:center;"><div class="lar-tv">∑ '+ts2+' g</div><div class="lar-mv">Moy. '+ms+' g · '+c+' bac'+(c>1?'s':'')+'</div></td>';
  }).join('');

  rows+='<tr class="lar-tot"><td class="lar-tot-lbl" colspan="2">Totaux &amp; moyennes</td>'+totCells+'<td></td></tr>';
  if(nbAffiches===0 && (filtreBacs.length>0||filtreDate)){
    tbody.innerHTML='<tr class="lar-empty-row"><td colspan="10">Aucun bac ne correspond à la recherche.</td></tr>';
  } else {
    tbody.innerHTML=rows;
  }

  // Historique visible uniquement lors d'une recherche par bac
  const histZone=document.getElementById('larHistoriqueTravaux');
  if(histZone){
    if(filtreBacs.length>0&&nbAffiches>0){
      let hHtml='<div style="background:#f0f8ff;border:1.5px solid #2563a8;border-radius:10px;padding:14px;margin-top:4px;margin-bottom:14px;">';
      hHtml+='<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#2563a8;margin-bottom:10px;">📋 Historique des opérations</div>';
      let hasH=false;
      larData.forEach(function(row,ri){
        if(!filtreBacs.some(function(f){return String(row.bac||'').trim()===f||String(row.bac||'').indexOf(f)!==-1;})) return;
        if(!row.travaux||!row.travaux.length) return;
        hasH=true;
        hHtml+='<div style="margin-bottom:12px;"><div style="font-weight:700;color:#2563a8;margin-bottom:4px;font-family:monospace;">Bac n°'+row.bac+'</div>';
        hHtml+='<table style="width:100%;border-collapse:collapse;font-size:.82rem;">';
        hHtml+='<thead><tr style="background:#2563a8;color:#fff;"><th style="padding:5px 8px;text-align:left;">Date</th><th style="padding:5px 8px;text-align:left;">Opération</th><th style="padding:5px 8px;text-align:left;">Stade</th><th style="padding:5px 8px;text-align:right;">Poids</th><th></th></tr></thead><tbody>';
        row.travaux.forEach(function(t,ti){
          hHtml+='<tr style="border-bottom:1px solid #d0e4f7;">';
          hHtml+='<td style="padding:5px 8px;">'+larTravFmtDate(t.date)+'</td>';
          hHtml+='<td style="padding:5px 8px;font-weight:600;">'+t.type+'</td>';
          hHtml+='<td style="padding:5px 8px;">'+(t.stade||'—')+'</td>';
          hHtml+='<td style="padding:5px 8px;text-align:right;">'+(t.poids?t.poids+' kg':'—')+'</td>';
          hHtml+='<td style="padding:5px 8px;text-align:center;"><button onclick="larSupprimerTravail('+ri+','+ti+')" style="background:#b84030;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:.7rem;cursor:pointer;">✕</button></td>';
          hHtml+='</tr>';
        });
        hHtml+='</tbody></table></div>';
      });
      if(!hasH) hHtml+='<div style="color:#888;font-size:.85rem;padding:8px 0;">Aucune opération enregistrée pour ce bac.</div>';
      hHtml+='</div>';
      histZone.innerHTML=hHtml;
    } else {
      histZone.innerHTML='';
    }
  }

  tbody.querySelectorAll('.lar-poids-zone:not(.lar-auto-val)').forEach(z=>{
    z.addEventListener('click',function(e){
      e.stopPropagation();
      const ri=parseInt(z.dataset.row);
      larOpenKpad(ri,z.dataset.field,larData[ri][z.dataset.field],z.dataset.label);
    });
  });
  tbody.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',function(){larOpenEditModal(parseInt(b.dataset.edit));}));
  tbody.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',function(){larDeleteRow(parseInt(b.dataset.del));}));

  const moys=LAR_STADES.map(s=>{const c=cnt[s.id];return c>0?parseFloat((tot[s.id]/c).toFixed(2)):null;});
  larUpdateChart(moys);
}

window.larChart=null;
function larUpdateChart(moys){
  const canvas=document.getElementById('larChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  if(larChart) larChart.destroy();
  larChart=new Chart(ctx,{
    type:'line',
    data:{labels:LAR_CLBLS,datasets:[{
      label:'Poids moyen par stade (g)',
      data:moys.map(v=>v==null?0:v),
      borderColor:'#7a6840',backgroundColor:'rgba(122,104,64,0.10)',
      pointBackgroundColor:LAR_CCLRS,pointBorderColor:'#fff',pointBorderWidth:2,
      pointRadius:8,pointHoverRadius:10,fill:true,tension:.35,spanGaps:true,
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,labels:{font:{size:11},color:'#2c2218'}},
        tooltip:{callbacks:{label:function(c){return c.parsed.y>0?(c.parsed.y.toLocaleString('fr-FR')+' g'):'Aucune donnée';}}}},
      scales:{
        x:{grid:{color:'#ddd8cf'},ticks:{font:{size:10},color:'#7a6a55'}},
        y:{grid:{color:'#ddd8cf'},ticks:{font:{size:10},color:'#7a6a55',callback:function(v){return v+' g';}},beginAtZero:true}
      }
    }
  });
}

function larUpdDprev(ds){
  const D=larS2d(ds);
  document.getElementById('larDp0').textContent=D?larFr(larD2s(larAddD(D,0))):'—';
  document.getElementById('larDp15').textContent=D?larFr(larD2s(larAddD(D,15))):'—';
  document.getElementById('larDp30').textContent=D?larFr(larD2s(larAddD(D,30))):'—';
  document.getElementById('larDp45').textContent=D?larFr(larD2s(larAddD(D,45))):'—';
  document.getElementById('larDp60').textContent=D?larFr(larD2s(larAddD(D,60))):'—';
  document.getElementById('larDp75').textContent=D?larFr(larD2s(larAddD(D,75))):'—';
}
function larBuildBacSel(excIdx,cur){
  const sel=document.getElementById('larFBac'); sel.innerHTML='';
  const used=larData.filter(function(_,i){return i!==excIdx;}).map(function(r){return parseInt(r.bac);});
  for(let n=1;n<=BAC_MAX;n++){
    if(used.indexOf(n)!==-1) continue;
    const o=document.createElement('option');
    o.value=n; o.textContent='Bac n° '+n;
    if(cur&&parseInt(cur)===n) o.selected=true;
    sel.appendChild(o);
  }
}
function larOpenAddModal(){
  larEditId=null;
  document.getElementById('larModalTitle').textContent='Nouveau bac larvaire';
  const d=larSimS();
  document.getElementById('larFDate').value=d;
  larBuildBacSel(null,null);
  larUpdDprev(d);
  document.getElementById('larModalOverlay').classList.add('open');
}
function larOpenEditModal(i){
  larEditId=i; const row=larData[i];
  document.getElementById('larModalTitle').textContent='Modifier — Bac n° '+(row.bac||'');
  document.getElementById('larFDate').value=row.dateEntree||'';
  larBuildBacSel(i,row.bac);
  larUpdDprev(row.dateEntree||'');
  document.getElementById('larModalOverlay').classList.add('open');
}
function larCloseModal(){ document.getElementById('larModalOverlay').classList.remove('open'); }
function larSaveEntry(){
  const dt=document.getElementById('larFDate').value;
  const bac=document.getElementById('larFBac').value;
  if(!dt||!bac){ larShowToast('Date et numéro de bac requis.'); return; }
  if(larEditId!==null){
    larData[larEditId].dateEntree=dt; larData[larEditId].bac=bac;
    larShowToast('Bac mis à jour.');
  } else {
    larData.push({dateEntree:dt,bac:bac,v00:null,v0:null,v20:null,v12:null,v10:null,v08:null});
    larShowToast('Bac n° '+bac+' ajouté — touchez les cellules pour saisir les poids.');
  }
  larSave(); larRender(); larCloseModal();
}
function larDeleteRow(i){
  if(!confirm('Supprimer ce bac ?')) return;
  larData.splice(i,1); larSave(); larRender(); larShowToast('Bac supprimé.');
}

function larExportCSV(){
  const h=['Date entrée','N° bac','Date Vers 00','Vers 00 (g)','Date Vers 0','Vers 0 (g)','Date Vers 20','Vers 20 (g)','Date Vers 12','Vers 12 (g)','Date Vers 10','Vers 10 (g)','Date Vers 08','Vers 08 total (g)','→ déshydratation (g)','→ Nymphes 06 (g)','Nymphes 06 auto (g)'];
  const rows=larData.map(function(r){
    const D=larS2d(r.dateEntree);
    const dates=[0,15,30,45,60,75].map(function(o){return D?larFr(larD2s(larAddD(D,o))):'';});
    const v08=r.v08==null?'':r.v08;
    const desh=v08!==''?(v08*3/4).toFixed(2):'';
    const np=v08!==''?(v08/4).toFixed(2):'';
    return [r.dateEntree,r.bac,dates[0],r.v00==null?'':r.v00,dates[1],r.v0==null?'':r.v0,dates[2],r.v20==null?'':r.v20,dates[3],r.v12==null?'':r.v12,dates[4],r.v10==null?'':r.v10,dates[5],v08,desh,np,np].join(';');
  });
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent([h.join(';')].concat(rows).join('\n'));
  a.download='larves_'+larSimS()+'.csv';
  a.click();
}

function larShowToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2800);
}

function larAttacherEvenements(){
  if(window._larEventsAttached) return;
  window._larEventsAttached=true;
  // Bouton Travaux sur les bacs
  const btnTrav = document.getElementById('larBtnTravaux');
  if(btnTrav) btnTrav.addEventListener('click', larTravauxOuvrir);
  // Listeners checkboxes travail (substrat/légumes)
  ['larTravChkSubstrat','larTravChkLegumes'].forEach(function(id){
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', function(){
      document.getElementById('larTravailSubstratWrap').style.display = document.getElementById('larTravChkSubstrat').checked ? 'block' : 'none';
      document.getElementById('larTravailLegumesWrap').style.display  = document.getElementById('larTravChkLegumes').checked  ? 'block' : 'none';
    });
  });
  document.getElementById('larRechercheBac').addEventListener('input', larRender);
  document.getElementById('larRechercheDate').addEventListener('change', larRender);
  document.getElementById('larBtnEffacerRecherche').addEventListener('click', function(){
    document.getElementById('larRechercheBac').value='';
    document.getElementById('larRechercheDate').value='';
    larRender();
  });
  document.getElementById('larBM15').addEventListener('click',function(){larShiftSim(-15);});
  document.getElementById('larBM1').addEventListener('click',function(){larShiftSim(-1);});
  document.getElementById('larBP1').addEventListener('click',function(){larShiftSim(1);});
  document.getElementById('larBP15').addEventListener('click',function(){larShiftSim(15);});
  document.getElementById('larBP30').addEventListener('click',function(){larShiftSim(30);});
  document.getElementById('larBApply').addEventListener('click',larApplySimInput);
  document.getElementById('larBReset').addEventListener('click',larResetSim);
  document.getElementById('larSimDateInput').addEventListener('keydown',function(e){if(e.key==='Enter')larApplySimInput();});
  document.getElementById('larBtnAdd').addEventListener('click',larOpenAddModal);
  document.getElementById('larBtnExport').addEventListener('click',larExportCSV);
  document.getElementById('larBtnSave').addEventListener('click',larSaveEntry);
  document.getElementById('larBtnCancel').addEventListener('click',larCloseModal);
  document.getElementById('larFDate').addEventListener('change',function(e){larUpdDprev(e.target.value);});
  document.getElementById('larModalOverlay').addEventListener('click',function(e){
    if(e.target===document.getElementById('larModalOverlay')) larCloseModal();
  });
  document.getElementById('larKpadPanel').addEventListener('click',function(e){
    e.stopPropagation();
    const btn=e.target.closest('[data-nk]');
    if(btn) larHandleNK(btn.dataset.nk);
  });
  document.getElementById('larKpadClose').addEventListener('click',function(e){e.stopPropagation();larCloseKpad();});
  document.getElementById('larKpadOverlay').addEventListener('click',function(){larCloseKpad();});
}

function larTransfererVersNymphes(rowIdx){
  const row=larData[rowIdx];
  if(!row) return;
  const poids=larNymphAuto(row);
  if(poids===null||poids<=0){ larShowToast('Aucun poids Nymphes 06 calculé.'); return; }
  let nymDb;
  try{ nymDb=JSON.parse(localStorage.getItem('nymphes_v1'))||{lots:[],grillesCreees:[]}; }
  catch(e){ nymDb={lots:[],grillesCreees:[]}; }
  if(!nymDb.lots) nymDb.lots=[];

  // Trouver un numéro de bac libre (cohérent avec la logique Nymphes : col_v21 + nymphes_v1)
  const utilises=new Set();
  nymDb.lots.forEach(function(l){ utilises.add(l.bac); });
  try{
    const rawCol=localStorage.getItem('col_v21');
    if(rawCol){
      const dataCol=JSON.parse(rawCol);
      const lotsCol=dataCol.lots||dataCol||[];
      if(Array.isArray(lotsCol)){
        lotsCol.forEach(function(l){
          if(l.cycles) l.cycles.forEach(function(c){ if(c&&c.bac) utilises.add(c.bac); });
          if(l.c1&&l.c1.bac) utilises.add(l.c1.bac);
          if(l.c2&&l.c2.bac) utilises.add(l.c2.bac);
          if(l.c3&&l.c3.bac) utilises.add(l.c3.bac);
        });
      }
    }
  }catch(e){}
  let nouveauBac=null;
  for(let i=1;i<=BAC_MAX;i++){ if(!utilises.has(i)){ nouveauBac=i; break; } }
  if(!nouveauBac){ larShowToast('Aucun numéro de bac disponible.'); return; }

  nymDb.lots.push({
    id:'lot_'+Date.now()+'_'+Math.floor(Math.random()*10000),
    dateEntree:larSimS(),
    bac:nouveauBac,
    poids:poids,
    tri:null,
    origine:'transfert_larves'
  });
  localStorage.setItem('nymphes_v1', JSON.stringify(nymDb));
  fbSafeSave('nymphes_v1', nymDb);

  row.nymphTransfere=true;
  larSave();
  larRender();
  larShowToast('Bac n°'+nouveauBac+' créé dans Nymphes ('+poids.toLocaleString('fr-FR')+' g).');
}

function larMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Larves. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Larves ?')) return;
  larData = [];
  larSave();
  larRender();
}

function initLarvesPage(){
  larLoad();
  larAttacherEvenements();
  larRefreshSim();

  const tbody=document.getElementById('larTbody');
  if(tbody && !window._larTransferAttached){
    window._larTransferAttached=true;
    tbody.addEventListener('click', function(e){
      const btn=e.target.closest('.lar-btn-transfer');
      if(btn){ larTransfererVersNymphes(parseInt(btn.dataset.row)); }
    });
  }
}


