/* ══ TABLEAU DE PONTE (ŒUFS) ══ */
var PONTE_KEY = 'ponte_v1';
var pontePendingSortieUid = null;

function ponteAddDays(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function ponteFmtDate(s) {
  var p = s.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
}
function ponteToday() { return new Date().toISOString().slice(0,10); }
function ponteDiffDays(dateStr) {
  var t = new Date(ponteToday()+'T00:00:00');
  var d = new Date(dateStr+'T00:00:00');
  return Math.round((d-t)/86400000);
}
function ponteLoadPonte() {
  try { return JSON.parse(localStorage.getItem(PONTE_KEY))||[]; } catch(e) { return []; }
}
function ponteSavePonte(data) {
  localStorage.setItem(PONTE_KEY, JSON.stringify(data));
  fbSafeSave(PONTE_KEY, data);
}
async function ponteSyncFromCloud() {
    const cloudData = await fbSafeLoad(PONTE_KEY, null);
  if (cloudData !== null) { localStorage.setItem(PONTE_KEY, JSON.stringify(cloudData)); }
}

function ponteTousNumerosUtilises(excludeUids) {
  excludeUids = excludeUids||[];
  var utilises = [];
  try {
    var raw = JSON.parse(localStorage.getItem('col_v21'))||[];
    var lots = Array.isArray(raw)?raw:(raw.lots||[]);
    lots.forEach(function(lot){
      if(lot.c1&&lot.c1.bac) utilises.push(String(lot.c1.bac));
      if(lot.c2&&lot.c2.bac) utilises.push(String(lot.c2.bac));
      if(lot.c3&&lot.c3.bac) utilises.push(String(lot.c3.bac));
    });
  } catch(e) {}
  ponteLoadPonte().forEach(function(l){
    if(excludeUids.indexOf(l.uid)!==-1) return;
    utilises.push(String(l.bac));
    if(l.bacFusion) utilises.push(String(l.bacFusion));
  });
  return utilises;
}

function ponteRemplirSelectLibres(selectEl, excludeUids) {
  var utilises = ponteTousNumerosUtilises(excludeUids||[]);
  selectEl.innerHTML = '<option value="">-- Choisir --</option>';
  for(var i=1;i<=BAC_MAX;i++){
    if(utilises.indexOf(String(i))===-1){
      var opt=document.createElement('option');
      opt.value=i; opt.textContent=i;
      selectEl.appendChild(opt);
    }
  }
}

function ponteAjouterLigne() {
  var dateVal = document.getElementById('ponteInputDate').value;
  var bacVal  = document.getElementById('ponteInputBac').value;
  if(!dateVal||!bacVal||bacVal===''){alert('Veuillez saisir une date et un numéro de bac.');return;}
  var deja = ponteTousNumerosUtilises([]);
  if(deja.indexOf(String(bacVal))!==-1){alert('Le bac '+bacVal+' est déjà présent.');return;}
  var lignes = ponteLoadPonte();
  lignes.push({uid:'manuel_'+Date.now(),dateEntree:dateVal,dateSortie:ponteAddDays(dateVal,10),bac:String(bacVal),bacFusion:null,fusionne:false,sorti:false,source:'manuel'});
  ponteSavePonte(lignes);
  ponteRender();
}

function ponteSyncAuto() {
  var raw; try { raw=JSON.parse(localStorage.getItem('col_v21')); } catch(e){return;}
  if(!raw) return;
  var lots = Array.isArray(raw)?raw:(Array.isArray(raw.lots)?raw.lots:[]);
  var lignes = ponteLoadPonte();
  var uids = lignes.map(function(l){return l.uid;});
  var bacsExistants = lignes.map(function(l){return String(l.bac);});
  lots.forEach(function(lot){
    if(!lot||!lot.dateEntree) return;
    [1,2,3].forEach(function(c){
      var cyc = lot['c'+c];
      if(!cyc||!cyc.bac) return;
      var uid = 'col_'+(lot.id||lot.dateEntree)+'_c'+c;
      if(uids.indexOf(uid)!==-1) return;
      if(bacsExistants.indexOf(String(cyc.bac))!==-1) return;
      var dateEntree = ponteAddDays(lot.dateEntree, c*10);
      lignes.push({uid,dateEntree,dateSortie:ponteAddDays(dateEntree,10),bac:String(cyc.bac),bacFusion:null,fusionne:false,sorti:false,source:'auto'});
      bacsExistants.push(String(cyc.bac));
    });
    // Cycle 4 : entre dans Œufs seulement après confirmation du secouage (+10j après le début du cycle 4)
    if (lot.c4 && lot.c4.bac && lot.c4.done_sec) {
      var uid4 = 'col_'+(lot.id||lot.dateEntree)+'_c4';
      if (uids.indexOf(uid4) === -1 && bacsExistants.indexOf(String(lot.c4.bac)) === -1) {
        var dateDebut4 = lot.c4.dateDebut || ponteAddDays(lot.dateEntree, 40);
        var dateEntree4 = ponteAddDays(dateDebut4, 10);
        lignes.push({uid:uid4, dateEntree:dateEntree4, dateSortie:ponteAddDays(dateEntree4,10), bac:String(lot.c4.bac), bacFusion:null, fusionne:false, sorti:false, source:'auto'});
        bacsExistants.push(String(lot.c4.bac));
      }
    }
  });
  ponteSavePonte(lignes);
}

function ponteRender() {
  ponteSyncAuto();
  var lignes     = ponteLoadPonte();
  var tbody      = document.getElementById('ponteBody');      if(!tbody) return;
  var alertList  = document.getElementById('ponteAlertList');
  var alertBox   = document.getElementById('ponteAlertBox');
  var emptyState = document.getElementById('ponteEmpty');
  var selBac     = document.getElementById('ponteInputBac');
  if(selBac) ponteRemplirSelectLibres(selBac,[]);
  if(!lignes.length){
    tbody.innerHTML=''; emptyState.style.display='block'; alertBox.style.display='none'; return;
  }
  emptyState.style.display='none';
  lignes.sort(function(a,b){return (parseInt(a.bac,10)||0)-(parseInt(b.bac,10)||0);});
  var urgents = lignes.filter(function(l){return !l.sorti&&!l.fusionne&&ponteDiffDays(l.dateSortie)<=1;});
  if(urgents.length){
    alertBox.style.display='block';
    alertList.innerHTML=urgents.map(function(l){
      var d=ponteDiffDays(l.dateSortie);
      var cls=d<0?'ponte-abadge-overdue':d===0?'ponte-abadge-today':'ponte-abadge-warn';
      var label=d<0?'Retard '+Math.abs(d)+'j':d===0?"Aujourd'hui":'Demain';
      return '<div class="ponte-alert-item"><span>Bac '+l.bac+' — sortie '+ponteFmtDate(l.dateSortie)+'</span><span class="ponte-abadge '+cls+'">'+label+'</span></div>';
    }).join('');
  } else { alertBox.style.display='none'; }

  tbody.innerHTML=lignes.map(function(l){
    var d=ponteDiffDays(l.dateSortie);
    var bCls,bTxt;
    if(l.sorti){bCls='ponte-badge-done';bTxt='Sorti';}
    else if(l.fusionne){bCls='ponte-badge-fusionne';bTxt='Fusionné';}
    else if(d<0){bCls='ponte-badge-overdue';bTxt='Retard '+Math.abs(d)+'j';}
    else if(d===0){bCls='ponte-badge-today';bTxt="Aujourd'hui";}
    else{bCls='ponte-badge-ok';bTxt='J-'+d;}
    var fusionCell;
    if(l.fusionne) fusionCell='<span style="color:#bbb;font-size:.75rem;">→ Bac '+(l.bacFusion||'?')+'</span>';
    else if(l.source==='fusion') fusionCell='<span style="color:#283593;font-weight:600;font-size:.76rem;">Issu de fusion</span>';
    else if(!l.sorti) fusionCell='<button class="ponte-btn-action ponte-btn-fusionner" data-uid="'+l.uid+'">Fusionner</button>';
    else fusionCell='<span style="color:#ccc;">—</span>';
    var actionCell;
    if(l.sorti) actionCell='<span style="color:#bbb;">✓ Sorti</span>';
    else if(l.fusionne) actionCell='<span style="color:#ccc;">—</span>';
    else actionCell='<button class="ponte-btn-action ponte-btn-sortir" data-uid="'+l.uid+'" data-bac="'+l.bac+'">Sortir</button>';
    var rowCls=l.fusionne?' class="ponte-fusionne"':'';
    return '<tr'+rowCls+'><td>'+ponteFmtDate(l.dateEntree)+'</td><td style="font-weight:600;">'+l.bac+'</td><td>'+fusionCell+'</td><td>'+ponteFmtDate(l.dateSortie)+'</td><td><span class="ponte-badge '+bCls+'">'+bTxt+'</span></td><td>'+actionCell+'</td></tr>';
  }).join('');
}

document.addEventListener('click', function(e){
  if(e.target.classList.contains('ponte-btn-sortir')){
    pontePendingSortieUid=e.target.dataset.uid;
    document.getElementById('ponteModalSortieText').textContent='Confirmer la sortie du bac '+e.target.dataset.bac+' ?';
    document.getElementById('ponteModalSortie').classList.add('open');
  }
  if(e.target.classList.contains('ponte-btn-fusionner')){
    ponteOuvrirFusion(e.target.dataset.uid);
  }
});

async function ponteTransfererVersLarves(bacNum, dateSortie) {
  var larRaw = await fbSafeLoad('larves_v7', null);
  if (larRaw === null) {
    try { larRaw = JSON.parse(localStorage.getItem('larves_v7')) || []; }
    catch(e) { larRaw = []; }
  }
  var bacsExistants = larRaw.map(function(r){ return String(r.bac); });
  if (bacsExistants.indexOf(String(bacNum)) !== -1) return; // déjà présent, éviter doublon
  larRaw.push({ dateEntree: dateSortie, bac: String(bacNum), v00:null, v0:null, v20:null, v12:null, v10:null, v08:null, origine:'tri_oeufs' });
  localStorage.setItem('larves_v7', JSON.stringify(larRaw));
  await fbSafeSave('larves_v7', larRaw);
}

async function ponteConfirmSortie(){
  if(!pontePendingSortieUid) return;
  var lignes=ponteLoadPonte();
  var bacSorti=null, dateSortieVal=null;
  lignes.forEach(function(l){
    if(l.uid===pontePendingSortieUid){
      l.sorti=true;
      bacSorti=l.bac;
      dateSortieVal=ponteToday();
    }
  });
  ponteSavePonte(lignes);
  ponteFermerModal('ponteModalSortie'); ponteRender();
  if (bacSorti) {
    await ponteTransfererVersLarves(bacSorti, dateSortieVal);
    if (typeof showToast === 'function') showToast('Bac '+bacSorti+' transféré vers Larves.');
  }
}

function ponteOuvrirFusion(uid){
  var lignes=ponteLoadPonte();
  var candidats=lignes.filter(function(l){return !l.sorti&&!l.fusionne;});
  if(candidats.length<2){alert('Il faut au moins 2 bacs actifs pour fusionner.');return;}
  var checkList=document.getElementById('ponteCheckList');
  checkList.innerHTML=candidats.map(function(l){
    var checked=l.uid===uid?' checked':'';
    return '<label class="ponte-check-item"><input type="checkbox" value="'+l.uid+'"'+checked+'/>Bac '+l.bac+' — entrée '+ponteFmtDate(l.dateEntree)+'</label>';
  }).join('');
  var tousUids=candidats.map(function(l){return l.uid;});
  ponteRemplirSelectLibres(document.getElementById('ponteSelectFusion'),tousUids);
  document.getElementById('ponteModalFusion').classList.add('open');
}

function ponteConfirmFusion(){
  var cases=document.getElementById('ponteCheckList').querySelectorAll('input[type="checkbox"]:checked');
  var coches=Array.prototype.slice.call(cases);
  var nouveauBac=document.getElementById('ponteSelectFusion').value;
  if(coches.length<2){alert('Veuillez cocher au moins 2 bacs.');return;}
  if(!nouveauBac||nouveauBac===''){alert('Veuillez choisir un nouveau numéro de bac.');return;}
  var uidsCoches=coches.map(function(cb){return cb.value;});
  var lignes=ponteLoadPonte();
  var deja=ponteTousNumerosUtilises(uidsCoches);
  if(deja.indexOf(String(nouveauBac))!==-1){alert('Le bac '+nouveauBac+' est déjà utilisé.');return;}
  lignes.forEach(function(l){if(uidsCoches.indexOf(l.uid)!==-1){l.fusionne=true;l.bacFusion=String(nouveauBac);}});
  var now=ponteToday();
  lignes.push({uid:'fusion_'+Date.now(),dateEntree:now,dateSortie:ponteAddDays(now,10),bac:String(nouveauBac),bacFusion:null,fusionne:false,sorti:false,source:'fusion',fusionSource:uidsCoches});
  ponteSavePonte(lignes); ponteFermerModal('ponteModalFusion'); ponteRender();
}

function ponteOuvrirReset(){ document.getElementById('ponteModalReset').classList.add('open'); }
function ponteConfirmReset(){
  localStorage.removeItem(PONTE_KEY);
  fbSafeSave(PONTE_KEY, []);
  ponteFermerModal('ponteModalReset');
  ponteRender();
}
function ponteMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du Tableau de Ponte. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le Tableau de Ponte ?')) return;
  ponteConfirmReset();
}
function ponteFermerModal(id){ document.getElementById(id).classList.remove('open'); pontePendingSortieUid=null; }

function initOeufsPage(){
  var d=document.getElementById('ponteInputDate');
  if(d) d.value=ponteToday();
  ponteRender();
}


/* ══ SIMULATEUR DE DATE ══ */
var SIM_DATE_OEUFS = null;
var SIM_DATE_COL   = null;

// Override ponteToday pour utiliser la date simulée
var _ponteTodayOrig = ponteToday;
ponteToday = function() { return SIM_DATE_OEUFS || _ponteTodayOrig(); };

// Override colAujourdHui pour utiliser la date simulée
var _colAujourdHuiOrig = colAujourdHui;
colAujourdHui = function() { return SIM_DATE_COL || _colAujourdHuiOrig(); };

function simChangerDateOeufs() {
  var v = document.getElementById('simDateOeufs').value;
  SIM_DATE_OEUFS = v || null;
  var badge = document.getElementById('simBadgeOeufs');
  if(badge) badge.style.display = v ? 'inline' : 'none';
  ponteRender();
}
function simResetOeufs() {
  SIM_DATE_OEUFS = null;
  var inp = document.getElementById('simDateOeufs');
  if(inp) inp.value = '';
  var badge = document.getElementById('simBadgeOeufs');
  if(badge) badge.style.display = 'none';
  ponteRender();
}

function simChangerDateCol() {
  var v = document.getElementById('simDateCol').value;
  SIM_DATE_COL = v || null;
  var badge = document.getElementById('simBadgeCol');
  if(badge) badge.style.display = v ? 'inline' : 'none';
  colRafraichir();
}
function simResetCol() {
  SIM_DATE_COL = null;
  var inp = document.getElementById('simDateCol');
  if(inp) inp.value = '';
  var badge = document.getElementById('simBadgeCol');
  if(badge) badge.style.display = 'none';
  colRafraichir();
}

