/* ══ RÉINITIALISATION COMPLÈTE ══ */
async function resetAllData() {
  if (!confirm('⚠️ Ceci va supprimer TOUTES les données de TOUS les modules (locale + cloud partagé). Cette action est irréversible pour tout le monde. Continuer ?')) return;
  if (!confirm('Confirmation finale : êtes-vous absolument sûr de vouloir tout effacer ?')) return;

  const keys = ['env_elevage_v2', 'col_v21', 'nymphes_v1', 'larves_v7', 'ponte_v1', 'stock_son_ble_v4', 'stock_legumes_v1', 'stock_legumes_seuil', 'stock_levure_v1', 'stock_poids_casse_v1', 'stock_v2_son_de_ble', 'stock_v2_levure', 'stock_v2_farine', 'stock_v2_legumes'];

  // 1. Vider le localStorage
  keys.forEach(function(k) { localStorage.removeItem(k); });

  // 2. Vider Firestore (cloud partagé)
  const ready = await fbWaitReady(5000);
  if (ready && window._fbSaveData) {
    for (const k of keys) {
      try { await window._fbSaveData(k, (k === 'env_elevage_v2' || k === 'nymphes_v1') ? {} : []); }
      catch(e) { console.error('Erreur reset cloud pour ' + k, e); }
    }
  }

  alert('✓ Toutes les données ont été réinitialisées. La page va se recharger.');
  window.location.reload();
}


/* ══ MODALE EFFACER / REMPLACER (GLOBAL COLÉOPTÈRES) ══ */
function colOuvrirModalEffacer(){
  if(!colLots.length){
    const t=document.getElementById('toast');
    if(t){ t.textContent='Aucun lot enregistré.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
    return;
  }
  const sel=document.getElementById('colEffLot');
  sel.innerHTML='';
  colLots.forEach(function(lot){
    const opt=document.createElement('option');
    opt.value=lot.id; opt.textContent='Grille '+lot.grille+' — entrée '+colAffDate(lot.dateEntree);
    sel.appendChild(opt);
  });
  colMettreAJourOptionsEffacer();
  document.getElementById('colModalEffacer').classList.add('open');
}
function colFermerModalEffacer(){
  document.getElementById('colModalEffacer').classList.remove('open');
}

function colMettreAJourOptionsEffacer(){
  const lotId=document.getElementById('colEffLot').value;
  const cycle=parseInt(document.getElementById('colEffCycle').value,10);
  const lot=colLots.find(function(l){return l.id==lotId;});
  const typeWrap=document.getElementById('colEffTypeWrap');
  const typeSel=document.getElementById('colEffType');

  // Cycle 1 : choix grille OU bac. Cycles 2/3/4 : uniquement bac.
  if(cycle===1){
    typeWrap.style.display='block';
    typeSel.innerHTML='<option value="grille">Effacer / remplacer la grille (lettre)</option><option value="bac">Effacer / remplacer le bac</option>';
  } else {
    typeWrap.style.display='none';
    typeSel.innerHTML='<option value="bac">Effacer / remplacer le bac</option>';
  }
  colMettreAJourValeurEffacer();
}

function colMettreAJourValeurEffacer(){
  const type=document.getElementById('colEffType').value;
  const valSel=document.getElementById('colEffValeur');
  const label=document.getElementById('colEffValeurLabel');
  valSel.innerHTML='';

  if(type==='grille'){
    label.textContent='Nouvelle lettre de grille';
    colLettresDisponibles().forEach(function(l){
      const opt=document.createElement('option');
      opt.value=l; opt.textContent=l;
      valSel.appendChild(opt);
    });
  } else {
    label.textContent='Nouveau numéro de bac';
    const utilises=colBacsUtilises();
    for(let i=1;i<=BAC_MAX;i++){
      if(!utilises.has(i)){
        const opt=document.createElement('option');
        opt.value=i; opt.textContent=i;
        valSel.appendChild(opt);
      }
    }
  }
}

function colViderToutLeTableau(){
  if(!confirm('⚠️ Ceci va supprimer TOUTES les lignes du tableau Coléoptères (local + cloud partagé). Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider complètement le tableau Coléoptères ?')) return;
  colLots = [];
  colSauver();
  colPeuplerGrille(); colPeuplerBacs(); colRafraichir();
  const t=document.getElementById('toast');
  if(t){ t.textContent='Tableau Coléoptères vidé.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
}

function colConfirmerEffacer(){
  const lotId=document.getElementById('colEffLot').value;
  const cycle=parseInt(document.getElementById('colEffCycle').value,10);
  const type=document.getElementById('colEffType').value;
  const valeur=document.getElementById('colEffValeur').value;
  const lot=colLots.find(function(l){return l.id==lotId;});
  if(!lot){ colFermerModalEffacer(); return; }
  if(!valeur){ alert('Veuillez choisir une nouvelle valeur.'); return; }

  if(type==='grille'){
    lot.grille=valeur;
  } else {
    const cyc=lot['c'+cycle];
    if(!cyc){ alert('Ce cycle n\'existe pas encore pour ce lot.'); colFermerModalEffacer(); return; }
    cyc.bac=parseInt(valeur,10);
  }

  colSauver(); colPeuplerGrille(); colPeuplerBacs(); colRafraichir();
  colFermerModalEffacer();
  const t=document.getElementById('toast');
  if(t){ t.textContent='Modification effectuée.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
}


/* ══ POPUP GRAPHIQUES (Journalier / Hebdomadaire / Mensuel) ══ */
let envChartPopupInstance = null;
let envPeriodeActuelle = 'jour';

function envOuvrirGraphPopup(){
  document.getElementById('envGraphOverlay').style.display = 'flex';
  envChangerPeriodeGraph('jour');
}
function envFermerGraphPopup(){
  document.getElementById('envGraphOverlay').style.display = 'none';
  if (envChartPopupInstance) { envChartPopupInstance.destroy(); envChartPopupInstance = null; }
}

function envChangerPeriodeGraph(periode){
  envPeriodeActuelle = periode;
  document.querySelectorAll('.env-period-btn').forEach(function(b){
    const actif = b.dataset.period===periode;
    b.style.background = actif ? '#dd6b20' : '#fff';
    b.style.color = actif ? '#fff' : '#dd6b20';
  });

  let labels=[], temps=[], hygros=[], meteoTemps=[], meteoHygros=[];

  if (periode==='jour') {
    const entries = envDb[envTodayKey()]||[];
    labels = entries.map(function(e){return e.time;});
    temps = entries.map(function(e){return e.temp;});
    hygros = entries.map(function(e){return e.hygro;});
    meteoTemps = entries.map(function(e){return (e.meteoTemp!==undefined&&e.meteoTemp!==null)?e.meteoTemp:null;});
    meteoHygros = entries.map(function(e){return (e.meteoHumid!==undefined&&e.meteoHumid!==null)?e.meteoHumid:null;});
  } else if (periode==='semaine') {
    const today = new Date();
    for (let i=6;i>=0;i--){
      const d = new Date(today); d.setDate(d.getDate()-i);
      const dk = d.toISOString().slice(0,10);
      const entries = envDb[dk]||[];
      labels.push(d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}));
      const t = entries.map(function(e){return e.temp;});
      const h = entries.map(function(e){return e.hygro;});
      const mt = entries.map(function(e){return e.meteoTemp;}).filter(function(v){return v!==null&&v!==undefined;});
      const mh = entries.map(function(e){return e.meteoHumid;}).filter(function(v){return v!==null&&v!==undefined;});
      temps.push(t.length?envMean(t):null);
      hygros.push(h.length?envMean(h):null);
      meteoTemps.push(mt.length?envMean(mt):null);
      meteoHygros.push(mh.length?envMean(mh):null);
    }
  } else if (periode==='mois') {
    const mk = envMonthKey();
    const days = Object.keys(envDb).filter(function(k){return k.startsWith(mk);}).sort();
    labels = days.map(function(d){return d.slice(8);});
    temps = days.map(function(d){const e=envDb[d];return e&&e.length?envMean(e.map(function(x){return x.temp;})):null;});
    hygros = days.map(function(d){const e=envDb[d];return e&&e.length?envMean(e.map(function(x){return x.hygro;})):null;});
    meteoTemps = days.map(function(d){const e=envDb[d]||[];const v=e.map(function(x){return x.meteoTemp;}).filter(function(x){return x!==null&&x!==undefined;});return v.length?envMean(v):null;});
    meteoHygros = days.map(function(d){const e=envDb[d]||[];const v=e.map(function(x){return x.meteoHumid;}).filter(function(x){return x!==null&&x!==undefined;});return v.length?envMean(v):null;});
  }

  const datasets = [
    { label:'Température intérieure (°C)', data:temps, borderColor:'#dd6b20', backgroundColor:'rgba(221,107,32,0.1)', tension:.35, pointRadius:4, fill:false, yAxisID:'yT', spanGaps:true },
    { label:'Hygrométrie intérieure (%)', data:hygros, borderColor:'#38a169', backgroundColor:'rgba(56,161,105,0.1)', tension:.35, pointRadius:4, fill:false, yAxisID:'yH', spanGaps:true },
    { label:'Température extérieure (°C)', data:meteoTemps, borderColor:'#dd6b20', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yT', spanGaps:true },
    { label:'Hygrométrie extérieure (%)', data:meteoHygros, borderColor:'#38a169', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yH', spanGaps:true },
  ];

  const canvas = document.getElementById('envChartPopup');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (envChartPopupInstance) envChartPopupInstance.destroy();
  envChartPopupInstance = new Chart(ctx, {
    type:'line',
    data:{ labels: labels.length?labels:['—'], datasets },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:10}} } },
      scales:{
        yT:{ type:'linear', position:'left', min:10, max:40, title:{display:true,text:'°C'} },
        yH:{ type:'linear', position:'right', min:20, max:100, title:{display:true,text:'%'}, grid:{drawOnChartArea:false} },
        x:{}
      }
    }
  });
}

/* ══ CALENDRIER D'ABSENCES ══ */
const ENV_ABSENCES_KEY = 'env_absences_v1';
function envChargerAbsences(){
  try { return JSON.parse(localStorage.getItem(ENV_ABSENCES_KEY)) || []; }
  catch(e) { return []; }
}
function envSauverAbsences(absences){
  localStorage.setItem(ENV_ABSENCES_KEY, JSON.stringify(absences));
  fbSafeSave(ENV_ABSENCES_KEY, absences);
}
function envEstJourAbsence(dateISO){
  const absences = envChargerAbsences();
  return absences.some(function(a){ return dateISO >= a.debut && dateISO <= a.fin; });
}

function envOuvrirCalendrierAbsences(){
  document.getElementById('envAbsenceOverlay').style.display = 'flex';
  const today = envTodayKey();
  document.getElementById('envAbsenceDateDebut').value = today;
  document.getElementById('envAbsenceDateFin').value = today;
  envAfficherListeAbsences();
}
function envFermerCalendrierAbsences(){
  document.getElementById('envAbsenceOverlay').style.display = 'none';
}
function envValiderAbsence(){
  const debut = document.getElementById('envAbsenceDateDebut').value;
  const fin = document.getElementById('envAbsenceDateFin').value;
  if (!debut || !fin) { alert('Veuillez choisir les deux dates.'); return; }
  if (fin < debut) { alert('La date de fin doit être après la date de début.'); return; }
  const absences = envChargerAbsences();
  absences.push({ debut, fin, id: Date.now() });
  envSauverAbsences(absences);
  envAfficherListeAbsences();
  showToast('✓ Période d\'absence enregistrée.');
}
function envSupprimerAbsence(id){
  let absences = envChargerAbsences();
  absences = absences.filter(function(a){ return a.id !== id; });
  envSauverAbsences(absences);
  envAfficherListeAbsences();
}
function envAfficherListeAbsences(){
  const zone = document.getElementById('envListeAbsences');
  const absences = envChargerAbsences();
  if (!absences.length) { zone.innerHTML = '<em>Aucune période d\'absence enregistrée.</em>'; return; }
  zone.innerHTML = '<strong>Périodes enregistrées :</strong><br>' + absences.map(function(a){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #eee;">'
      + '<span>' + a.debut.split('-').reverse().join('/') + ' → ' + a.fin.split('-').reverse().join('/') + '</span>'
      + '<button onclick="envSupprimerAbsence(' + a.id + ')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-weight:700;">✕</button>'
      + '</div>';
  }).join('');
}


/* ══ ZOOM GÉNÉRIQUE SUR GRAPHIQUE ══ */
let zoomChartInstance = null;
function ouvrirZoomGraph(sourceChartVar){
  const src = window[sourceChartVar];
  if(!src){ return; }
  document.getElementById('zoomGraphOverlay').style.display='flex';
  const ctx = document.getElementById('zoomGraphCanvas').getContext('2d');
  if(zoomChartInstance) zoomChartInstance.destroy();
  const config = {
    type: src.config.type,
    data: JSON.parse(JSON.stringify(src.config.data)),
    options: Object.assign({}, src.config.options, { responsive:true, maintainAspectRatio:false })
  };
  zoomChartInstance = new Chart(ctx, config);
}
function fermerZoomGraph(){
  document.getElementById('zoomGraphOverlay').style.display='none';
  if(zoomChartInstance){ zoomChartInstance.destroy(); zoomChartInstance=null; }
}


/* ══ MISE À ZÉRO — MODULES DE STOCK ══ */
function sonMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Son de blé. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Son de blé ?')) return;
  sonSave([]);
  sonRender();
}
function legMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Légumes. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Légumes ?')) return;
  legSave([]);
  legRender();
}
function levMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Levure. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Levure ?')) return;
  levSave([]);
  levRender();
}
function poidsMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Poids cassé. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Poids cassé ?')) return;
  poidsSave([]);
  poidsRender();
}


/* ══ EXPORT CSV — TÉLÉCHARGEMENT DES DONNÉES DE CHAQUE PAGE ══ */
function telechargerCSV(filename, rows){
  const csv = rows.map(r => r.map(v => {
    const s = (v===null||v===undefined) ? '' : String(v);
    return s.indexOf(';')!==-1 || s.indexOf('"')!==-1 || s.indexOf('\n')!==-1
      ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(';')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportEnvironnement(){
  const rows=[['Date','Heure','Température intérieure (°C)','Hygrométrie intérieure (%)','Température extérieure (°C)','Hygrométrie extérieure (%)']];
  Object.keys(envDb).sort().forEach(function(dk){
    (envDb[dk]||[]).forEach(function(e){
      rows.push([dk, e.time, e.temp, e.hygro, e.meteoTemp??'', e.meteoHumid??'']);
    });
  });
  telechargerCSV('environnement_'+envTodayKey()+'.csv', rows);
}

function exportSonDeBle(){
  const data=sonLoad();
  const rows=[['Date','Type','Quantité (kg)','N° Facture','Fournisseur']];
  data.forEach(function(r){ rows.push([r.date,r.type,r.qte,r.fac||'',r.frs||'']); });
  telechargerCSV('son_de_ble.csv', rows);
}
function exportLegumes(){
  const data=legLoad();
  const rows=[['Date','Légume','Type','Quantité (kg)','N° Lot/Facture','Fournisseur']];
  data.forEach(function(r){ rows.push([r.date,r.legume||'',r.type,r.qte,r.fac||'',r.frs||'']); });
  telechargerCSV('legumes.csv', rows);
}
function exportLevure(){
  const data=levLoad();
  const rows=[['Date','Type','Quantité (kg)','N° Facture','Fournisseur']];
  data.forEach(function(r){ rows.push([r.date,r.type,r.qte,r.fac||'',r.frs||'']); });
  telechargerCSV('levure.csv', rows);
}
function exportPoidsCasse(){
  const data=poidsLoad();
  const rows=[['Date','Type','Quantité (kg)','N° Facture','Fournisseur']];
  data.forEach(function(r){ rows.push([r.date,r.type,r.qte,r.fac||'',r.frs||'']); });
  telechargerCSV('poids_casse.csv', rows);
}

function exportColeopteres(){
  const rows=[['Grille','Date entrée','Poids (g)','C1 Bac','C2 Bac','C3 Bac','C4 Bac']];
  colLots.forEach(function(l){
    rows.push([l.grille, l.dateEntree, l.poids, l.c1?l.c1.bac:'', l.c2?l.c2.bac:'', l.c3?l.c3.bac:'', l.c4?l.c4.bac:'']);
  });
  telechargerCSV('coleopteres.csv', rows);
}

function exportOeufs(){
  const lignes=ponteLoadPonte();
  const rows=[['Bac','Date entrée','Date sortie','Statut','Bac fusion']];
  lignes.forEach(function(l){
    const statut = l.sorti?'Sorti':(l.fusionne?'Fusionné':'Actif');
    rows.push([l.bac, l.dateEntree, l.dateSortie, statut, l.bacFusion||'']);
  });
  telechargerCSV('oeufs_ponte.csv', rows);
}

function exportNymphes(){
  const rows=[['Bac','Date entrée','Poids (g)','Date tri','Poids coléoptères (g)','Morts (g)']];
  (NYM_DB.lots||[]).forEach(function(l){
    const tris=l.tris||(l.tri?[l.tri]:[]);
    if(tris.length===0){
      rows.push([l.bac, l.dateEntree, l.poids, '', '', '']);
    } else {
      tris.forEach(function(t){ rows.push([l.bac, l.dateEntree, l.poids, t.date, t.poidsColeo, t.morts]); });
    }
  });
  telechargerCSV('nymphes.csv', rows);
}

function exportLarves(){
  const rows=[['Bac','Date entrée','Vers 00 (g)','Vers 0 (g)','Vers 20 (g)','Vers 12 (g)','Vers 10 (g)','Vers 08 (g)']];
  larData.forEach(function(r){
    rows.push([r.bac, r.dateEntree, r.v00??'', r.v0??'', r.v20??'', r.v12??'', r.v10??'', r.v08??'']);
  });
  telechargerCSV('larves.csv', rows);
}


/* ══ EXPORT PDF RÉEL (jsPDF + html2canvas) ══ */
async function exporterEnPDF(pageId, filename){
  const pageEl = document.getElementById(pageId);
  if(!pageEl){ alert('Page introuvable.'); return; }

  const t=document.getElementById('toast');
  if(t){ t.textContent='Génération du PDF en cours...'; t.classList.add('show'); }

  // Masquer temporairement les éléments non désirés (comme en impression)
  const elementsACacher = pageEl.querySelectorAll(
    '.user-badge-bar, .sim-date-bar, .lar-sim-bar, .nym-sim-bar, .btn-retour, .page-footer, .imprimer-bar, .form-section, .form-zone, .alert-config, .toolbar, .nym-actions-principales, .lar-toolbar, input, select, button'
  );
  const anciensDisplay = [];
  elementsACacher.forEach(function(el){ anciensDisplay.push(el.style.display); el.style.display='none'; });

  try {
    const canvas = await html2canvas(pageEl, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    if(t){ t.textContent='PDF téléchargé.'; setTimeout(function(){t.classList.remove('show');},2200); }
  } catch(e) {
    console.error('Erreur génération PDF', e);
    if(t){ t.textContent='Erreur lors de la génération du PDF.'; setTimeout(function(){t.classList.remove('show');},2500); }
  } finally {
    elementsACacher.forEach(function(el,i){ el.style.display = anciensDisplay[i]; });
  }
}


