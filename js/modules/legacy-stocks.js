/* ══ SON DE BLÉ ══ */
const SON_KEY = 'stock_son_ble_v4';
function sonLoad() { try { return JSON.parse(localStorage.getItem(SON_KEY))||[]; } catch { return []; } }
function sonSave(d) {
  localStorage.setItem(SON_KEY, JSON.stringify(d));
  fbSafeSave(SON_KEY, d);
}
async function sonSyncFromCloud() {
    const cloudData = await fbSafeLoad(SON_KEY, null);
  if (cloudData !== null) {
    localStorage.setItem(SON_KEY, JSON.stringify(cloudData));
  }
}

function sonComputeRows(data) {
  var fifo=[], rows=[];
  data.forEach(function(row,i) {
    if (row.type==='entree') {
      fifo.push({fac:row.fac, reste:row.qte});
      var cumul=fifo.reduce((s,e)=>s+e.reste,0);
      rows.push({orig:row,index:i,entree:row.qte,sortie:0,cumul,resteInfo:null});
    } else {
      var rs=row.qte;
      while(rs>0&&fifo.length>0){var f=fifo[0],d=Math.min(f.reste,rs);f.reste=Math.round((f.reste-d)*1000)/1000;rs=Math.round((rs-d)*1000)/1000;if(f.reste<=0)fifo.shift();}
      var c2=Math.round(fifo.reduce((s,e)=>s+e.reste,0)*1000)/1000;
      rows.push({orig:row,index:i,entree:0,sortie:row.qte,cumul:c2,resteInfo:null});
    }
  });
  var f2=[];
  rows.forEach(function(r) {
    if(r.orig.type==='entree'){
      f2.push({fac:r.orig.fac,reste:r.orig.qte});
      r.resteInfo=f2.map(e=>(e.fac||'—')+': '+e.reste.toFixed(2)+' kg').join(' | ');
    } else {
      var rs2=r.orig.qte;
      f2.forEach(e=>{if(rs2<=0)return;var d=Math.min(e.reste,rs2);e.reste=Math.round((e.reste-d)*1000)/1000;rs2=Math.round((rs2-d)*1000)/1000;});
      f2=f2.filter(e=>e.reste>0);
      r.resteInfo=f2.length?f2.map(e=>(e.fac||'—')+': '+e.reste.toFixed(2)+' kg').join(' | '):'—';
    }
  });
  return rows;
}

function sonRender() {
  var tbody=document.getElementById('tbody');
  if(!tbody) return;
  var data=sonLoad();
  tbody.innerHTML='';
  var alertBox=document.getElementById('alertBox');
  if(!data.length){
    tbody.innerHTML="<tr class='empty-msg'><td colspan='8'>Aucune donnée. Ajoutez une ligne ci-dessus.</td></tr>";
    if(alertBox) alertBox.style.display='none';
    return;
  }
  var rows=sonComputeRows(data), lastC=0;
  rows.forEach(function(r){
    lastC=r.cumul;
    var isE=r.orig.type==='entree', isA=r.cumul<=20;
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+r.orig.date+'</td>'
      +'<td class="col-entree">'+(isE?r.entree.toFixed(2)+' kg':'—')+'</td>'
      +'<td class="col-sortie">'+(!isE?r.sortie.toFixed(2)+' kg':'—')+'</td>'
      +(isA?'<td class="col-cumul-alert">⚠ '+r.cumul.toFixed(2)+' kg</td>':'<td class="col-cumul">'+r.cumul.toFixed(2)+' kg</td>')
      +'<td class="'+(r.resteInfo==='—'?'col-reste-zero':'col-reste')+'">'+(r.resteInfo||'—')+'</td>'
      +'<td>'+(r.orig.fac||'—')+'</td>'
      +'<td>'+(r.orig.frs||'—')+'</td>'
      +'<td><button class="btn-del" data-i="'+r.index+'">✕</button></td>';
    tbody.appendChild(tr);
  });
  if(alertBox) alertBox.style.display=lastC<=20?'block':'none';
}

document.addEventListener('click', function(e) {
  if(e.target.classList.contains('btn-del')) {
    var data=sonLoad();
    data.splice(parseInt(e.target.getAttribute('data-i')),1);
    sonSave(data); sonRender();
  }
  if(e.target.id==='btnAdd') {
    var date=document.getElementById('inDate').value,
        type=document.getElementById('inType').value,
        qte=parseFloat(document.getElementById('inQte').value),
        fac=document.getElementById('inFac').value.trim(),
        frs=document.getElementById('inFrs').value.trim();
    if(!date){alert('Veuillez saisir une date.');return;}
    if(!qte||qte<=0){alert('Veuillez saisir une quantité valide.');return;}
    var data=sonLoad();
    data.push({date,type,qte,fac,frs});
    sonSave(data); sonRender();
    document.getElementById('inQte').value='';
    document.getElementById('inFac').value='';
    document.getElementById('inFrs').value='';
  }
});


/* ══ LÉGUMES ══ */
const LEG_KEY = 'stock_legumes_v1';
const LEG_SEUIL_KEY = 'stock_legumes_seuil';
function legGetSeuil() { var v=parseFloat(localStorage.getItem(LEG_SEUIL_KEY)); return isNaN(v)?5:v; }
function legLoad() { try { return JSON.parse(localStorage.getItem(LEG_KEY))||[]; } catch { return []; } }
function legSave(d) {
  localStorage.setItem(LEG_KEY, JSON.stringify(d));
  fbSafeSave(LEG_KEY, d);
}
async function legLoadSyncFromCloud() {
    const cloudData = await fbSafeLoad(LEG_KEY, null);
  if (cloudData !== null) { localStorage.setItem(LEG_KEY, JSON.stringify(cloudData)); }
}
function legComputeRows(data) {
  var fifo=[], rows=[];
  data.forEach(function(row,i) {
    if (row.type==='entree') {
      fifo.push({fac:row.fac, reste:row.qte});
      var cumul=fifo.reduce(function(s,e){return s+e.reste;},0);
      rows.push({orig:row,index:i,entree:row.qte,sortie:0,cumul:cumul,resteInfo:null});
    } else {
      var rs=row.qte;
      while(rs>0&&fifo.length>0){var f=fifo[0],d=Math.min(f.reste,rs);f.reste=Math.round((f.reste-d)*1000)/1000;rs=Math.round((rs-d)*1000)/1000;if(f.reste<=0)fifo.shift();}
      var c2=Math.round(fifo.reduce(function(s,e){return s+e.reste;},0)*1000)/1000;
      rows.push({orig:row,index:i,entree:0,sortie:row.qte,cumul:c2,resteInfo:null});
    }
  });
  var f2=[];
  rows.forEach(function(r) {
    if(r.orig.type==='entree'){
      f2.push({fac:r.orig.fac,reste:r.orig.qte});
      r.resteInfo=f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | ');
    } else {
      var rs2=r.orig.qte;
      f2.forEach(function(e){if(rs2<=0)return;var d=Math.min(e.reste,rs2);e.reste=Math.round((e.reste-d)*1000)/1000;rs2=Math.round((rs2-d)*1000)/1000;});
      f2=f2.filter(function(e){return e.reste>0;});
      r.resteInfo=f2.length?f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | '):'—';
    }
  });
  return rows;
}
function legRender() {
  var tbody=document.getElementById('leg-tbody'); if(!tbody) return;
  var seuil=legGetSeuil();
  var si=document.getElementById('leg-seuilInput'); if(si) si.value=seuil;
  var sa=document.getElementById('leg-alertSeuil'); if(sa) sa.textContent=seuil;
  var data=legLoad(); tbody.innerHTML='';
  var ab=document.getElementById('leg-alertBox');
  if(!data.length){tbody.innerHTML='<tr class="empty-msg"><td colspan="9">Aucune donnée. Ajoutez une ligne ci-dessus.</td></tr>';if(ab)ab.style.display='none';return;}
  var rows=legComputeRows(data),lastC=0;
  rows.forEach(function(r){
    lastC=r.cumul; var isE=r.orig.type==='entree', isA=r.cumul<=seuil;
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+r.orig.date+'</td>'
      +'<td>'+(r.orig.legume||'—')+'</td>'
      +'<td class="col-entree">'+(isE?r.entree.toFixed(2)+' kg':'—')+'</td>'
      +'<td class="col-sortie">'+(!isE?r.sortie.toFixed(2)+' kg':'—')+'</td>'
      +(isA?'<td class="col-cumul-alert">⚠ '+r.cumul.toFixed(2)+' kg</td>':'<td class="col-cumul">'+r.cumul.toFixed(2)+' kg</td>')
      +'<td class="'+(r.resteInfo==='—'?'col-reste-zero':'col-reste')+'">'+(r.resteInfo||'—')+'</td>'
      +'<td>'+(r.orig.fac||'—')+'</td>'
      +'<td>'+(r.orig.frs||'—')+'</td>'
      +'<td><button class="btn-del-leg" data-i="'+r.index+'">✕</button></td>';
    tbody.appendChild(tr);
  });
  if(ab) ab.style.display=lastC<=seuil?'block':'none';
}

/* ══ LEVURE ══ */
const LEV_KEY = 'stock_levure_v1';
function levLoad() { try { return JSON.parse(localStorage.getItem(LEV_KEY))||[]; } catch { return []; } }
function levSave(d) {
  localStorage.setItem(LEV_KEY, JSON.stringify(d));
  fbSafeSave(LEV_KEY, d);
}
async function levLoadSyncFromCloud() {
    const cloudData = await fbSafeLoad(LEV_KEY, null);
  if (cloudData !== null) { localStorage.setItem(LEV_KEY, JSON.stringify(cloudData)); }
}
function levComputeRows(data) {
  var fifo=[], rows=[];
  data.forEach(function(row,i) {
    if (row.type==='entree') {
      fifo.push({fac:row.fac, reste:row.qte});
      var cumul=fifo.reduce(function(s,e){return s+e.reste;},0);
      rows.push({orig:row,index:i,entree:row.qte,sortie:0,cumul:cumul,resteInfo:null});
    } else {
      var rs=row.qte;
      while(rs>0&&fifo.length>0){var f=fifo[0],d=Math.min(f.reste,rs);f.reste=Math.round((f.reste-d)*1000)/1000;rs=Math.round((rs-d)*1000)/1000;if(f.reste<=0)fifo.shift();}
      var c2=Math.round(fifo.reduce(function(s,e){return s+e.reste;},0)*1000)/1000;
      rows.push({orig:row,index:i,entree:0,sortie:row.qte,cumul:c2,resteInfo:null});
    }
  });
  var f2=[];
  rows.forEach(function(r) {
    if(r.orig.type==='entree'){
      f2.push({fac:r.orig.fac,reste:r.orig.qte});
      r.resteInfo=f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | ');
    } else {
      var rs2=r.orig.qte;
      f2.forEach(function(e){if(rs2<=0)return;var d=Math.min(e.reste,rs2);e.reste=Math.round((e.reste-d)*1000)/1000;rs2=Math.round((rs2-d)*1000)/1000;});
      f2=f2.filter(function(e){return e.reste>0;});
      r.resteInfo=f2.length?f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | '):'—';
    }
  });
  return rows;
}
function levRender() {
  var tbody=document.getElementById('lev-tbody'); if(!tbody) return;
  var data=levLoad(); tbody.innerHTML='';
  var ab=document.getElementById('lev-alertBox');
  if(!data.length){tbody.innerHTML='<tr class="empty-msg"><td colspan="8">Aucune donnée. Ajoutez une ligne ci-dessus.</td></tr>';if(ab)ab.style.display='none';return;}
  var rows=levComputeRows(data),lastC=0;
  rows.forEach(function(r){
    lastC=r.cumul; var isE=r.orig.type==='entree', isA=r.cumul<=5;
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+r.orig.date+'</td>'
      +'<td class="col-entree">'+(isE?r.entree.toFixed(2)+' kg':'—')+'</td>'
      +'<td class="col-sortie">'+(!isE?r.sortie.toFixed(2)+' kg':'—')+'</td>'
      +(isA?'<td class="col-cumul-alert">⚠ '+r.cumul.toFixed(2)+' kg</td>':'<td class="col-cumul">'+r.cumul.toFixed(2)+' kg</td>')
      +'<td class="'+(r.resteInfo==='—'?'col-reste-zero':'col-reste')+'">'+(r.resteInfo||'—')+'</td>'
      +'<td>'+(r.orig.fac||'—')+'</td>'
      +'<td>'+(r.orig.frs||'—')+'</td>'
      +'<td><button class="btn-del-lev" data-i="'+r.index+'">✕</button></td>';
    tbody.appendChild(tr);
  });
  if(ab) ab.style.display=lastC<=5?'block':'none';
}

/* ══ LISTENERS LEG & LEV ══ */
document.addEventListener('click', function(e) {
  if(e.target.classList.contains('btn-del-leg')){
    var data=legLoad();data.splice(parseInt(e.target.getAttribute('data-i')),1);legSave(data);legRender();
  }
  if(e.target.classList.contains('btn-del-lev')){
    var data=levLoad();data.splice(parseInt(e.target.getAttribute('data-i')),1);levSave(data);levRender();
  }
  if(e.target.id==='leg-btnAdd'){
    var date=document.getElementById('leg-inDate').value,
        legume=document.getElementById('leg-inLegume').value.trim(),
        type=document.getElementById('leg-inType').value,
        qte=parseFloat(document.getElementById('leg-inQte').value),
        fac=document.getElementById('leg-inFac').value.trim(),
        frs=document.getElementById('leg-inFrs').value.trim();
    if(!date){alert('Veuillez saisir une date.');return;}
    if(!qte||qte<=0){alert('Veuillez saisir une quantité valide.');return;}
    var data=legLoad();data.push({date,legume,type,qte,fac,frs});legSave(data);legRender();
    document.getElementById('leg-inLegume').value='';
    document.getElementById('leg-inQte').value='';
    document.getElementById('leg-inFac').value='';
    document.getElementById('leg-inFrs').value='';
  }
  if(e.target.id==='lev-btnAdd'){
    var date=document.getElementById('lev-inDate').value,
        type=document.getElementById('lev-inType').value,
        qte=parseFloat(document.getElementById('lev-inQte').value),
        fac=document.getElementById('lev-inFac').value.trim(),
        frs=document.getElementById('lev-inFrs').value.trim();
    if(!date){alert('Veuillez saisir une date.');return;}
    if(!qte||qte<=0){alert('Veuillez saisir une quantité valide.');return;}
    var data=levLoad();data.push({date,type,qte,fac,frs});levSave(data);levRender();
    document.getElementById('lev-inQte').value='';
    document.getElementById('lev-inFac').value='';
    document.getElementById('lev-inFrs').value='';
  }
});
document.addEventListener('change', function(e){
  if(e.target.id==='leg-seuilInput'){
    var v=parseFloat(e.target.value);
    if(!isNaN(v)&&v>0){localStorage.setItem(LEG_SEUIL_KEY,v);legRender();}
  }
});


/* ══ POIDS CASSÉ ══ */
const POIDS_KEY = 'stock_poids_casse_v1';
function poidsLoad() { try { return JSON.parse(localStorage.getItem(POIDS_KEY))||[]; } catch { return []; } }
function poidsSave(d) {
  localStorage.setItem(POIDS_KEY, JSON.stringify(d));
  fbSafeSave(POIDS_KEY, d);
}
async function poidsLoadSyncFromCloud() {
    const cloudData = await fbSafeLoad(POIDS_KEY, null);
  if (cloudData !== null) { localStorage.setItem(POIDS_KEY, JSON.stringify(cloudData)); }
}
function poidsComputeRows(data) {
  var fifo=[], rows=[];
  data.forEach(function(row,i) {
    if (row.type==='entree') {
      fifo.push({fac:row.fac, reste:row.qte});
      var cumul=fifo.reduce(function(s,e){return s+e.reste;},0);
      rows.push({orig:row,index:i,entree:row.qte,sortie:0,cumul:cumul,resteInfo:null});
    } else {
      var rs=row.qte;
      while(rs>0&&fifo.length>0){var f=fifo[0],d=Math.min(f.reste,rs);f.reste=Math.round((f.reste-d)*1000)/1000;rs=Math.round((rs-d)*1000)/1000;if(f.reste<=0)fifo.shift();}
      var c2=Math.round(fifo.reduce(function(s,e){return s+e.reste;},0)*1000)/1000;
      rows.push({orig:row,index:i,entree:0,sortie:row.qte,cumul:c2,resteInfo:null});
    }
  });
  var f2=[];
  rows.forEach(function(r) {
    if(r.orig.type==='entree'){
      f2.push({fac:r.orig.fac,reste:r.orig.qte});
      r.resteInfo=f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | ');
    } else {
      var rs2=r.orig.qte;
      f2.forEach(function(e){if(rs2<=0)return;var d=Math.min(e.reste,rs2);e.reste=Math.round((e.reste-d)*1000)/1000;rs2=Math.round((rs2-d)*1000)/1000;});
      f2=f2.filter(function(e){return e.reste>0;});
      r.resteInfo=f2.length?f2.map(function(e){return(e.fac||'—')+': '+e.reste.toFixed(2)+' kg';}).join(' | '):'—';
    }
  });
  return rows;
}
function poidsRender() {
  var tbody=document.getElementById('poids-tbody'); if(!tbody) return;
  var data=poidsLoad(); tbody.innerHTML='';
  var ab=document.getElementById('poids-alertBox');
  if(!data.length){tbody.innerHTML='<tr class="empty-msg"><td colspan="8">Aucune donnée. Ajoutez une ligne ci-dessus.</td></tr>';if(ab)ab.style.display='none';return;}
  var rows=poidsComputeRows(data),lastC=0;
  rows.forEach(function(r){
    lastC=r.cumul; var isE=r.orig.type==='entree', isA=r.cumul<=5;
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+r.orig.date+'</td>'
      +'<td class="col-entree">'+(isE?r.entree.toFixed(2)+' kg':'—')+'</td>'
      +'<td class="col-sortie">'+(!isE?r.sortie.toFixed(2)+' kg':'—')+'</td>'
      +(isA?'<td class="col-cumul-alert">⚠ '+r.cumul.toFixed(2)+' kg</td>':'<td class="col-cumul">'+r.cumul.toFixed(2)+' kg</td>')
      +'<td class="'+(r.resteInfo==='—'?'col-reste-zero':'col-reste')+'">'+(r.resteInfo||'—')+'</td>'
      +'<td>'+(r.orig.fac||'—')+'</td>'
      +'<td>'+(r.orig.frs||'—')+'</td>'
      +'<td><button class="btn-del-poids" data-i="'+r.index+'">✕</button></td>';
    tbody.appendChild(tr);
  });
  if(ab) ab.style.display=lastC<=5?'block':'none';
}
document.addEventListener('click', function(e){
  if(e.target.classList.contains('btn-del-poids')){
    var data=poidsLoad();data.splice(parseInt(e.target.getAttribute('data-i')),1);poidsSave(data);poidsRender();
  }
  if(e.target.id==='poids-btnAdd'){
    var date=document.getElementById('poids-inDate').value,
        type=document.getElementById('poids-inType').value,
        qte=parseFloat(document.getElementById('poids-inQte').value),
        fac=document.getElementById('poids-inFac').value.trim(),
        frs=document.getElementById('poids-inFrs').value.trim();
    if(!date){alert('Veuillez saisir une date.');return;}
    if(!qte||qte<=0){alert('Veuillez saisir une quantité valide.');return;}
    var data=poidsLoad();data.push({date,type,qte,fac,frs});poidsSave(data);poidsRender();
    document.getElementById('poids-inQte').value='';
    document.getElementById('poids-inFac').value='';
    document.getElementById('poids-inFrs').value='';
  }
});


