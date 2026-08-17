/* ══ NYMPHES ══ */
const NYM_CLE_NYMPHES = 'nymphes_v1';
let NYM_NB_BACS_MAX = 255; // synchronisé avec BAC_MAX
let NYM_ALERTE_BACS = 255;
const NYM_SEUIL_GRILLE_G = 300;

function nymLettresGrilles(){
  const arr=[];
  for(let i=0;i<26;i++) arr.push(String.fromCharCode(65+i));
  for(let i=0;i<26;i++){const l=String.fromCharCode(65+i);arr.push(l+l);}
  return arr;
}
const NYM_LETTRES = nymLettresGrilles();

function nymChargerDB(){
  try{
    const raw=localStorage.getItem(NYM_CLE_NYMPHES);
    if(!raw) return {lots:[],grillesCreees:[]};
    const data=JSON.parse(raw);
    if(!data.lots) data.lots=[];
    if(!data.grillesCreees) data.grillesCreees=[];
    return data;
  }catch(e){ return {lots:[],grillesCreees:[]}; }
}
function nymSauverDB(db){
  localStorage.setItem(NYM_CLE_NYMPHES, JSON.stringify(db));
  fbSafeSave(NYM_CLE_NYMPHES, db);
}
async function nymSyncFromCloud(){
    const cloudData = await fbSafeLoad(NYM_CLE_NYMPHES, null);
  if (cloudData !== null) { localStorage.setItem(NYM_CLE_NYMPHES, JSON.stringify(cloudData)); }
}
let NYM_DB = null;

function nymGenId(){ return 'lot_'+Date.now()+'_'+Math.floor(Math.random()*10000); }
let NYM_SIM_OFF = 0;
function nymSimD(){ const d=new Date(); d.setDate(d.getDate()+NYM_SIM_OFF); return d; }
function nymTodayISO(){ return nymSimD().toISOString().slice(0,10); }
function nymRefreshSim(){
  const sd=document.getElementById('nymSimDisplay'); if(!sd) return;
  sd.textContent = nymSimD().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('nymSimDateInput').value = nymTodayISO();
  document.getElementById('nymSimDot').className = NYM_SIM_OFF===0?'nym-dot-real':'nym-dot-active';
}
function nymShiftSim(n){ NYM_SIM_OFF+=n; nymRefreshSim(); }
function nymResetSim(){ NYM_SIM_OFF=0; nymRefreshSim(); }
function nymApplySimInput(){
  const v=document.getElementById('nymSimDateInput').value;
  if(v){
    const target=new Date(v+'T00:00:00');
    const now=new Date(); now.setHours(0,0,0,0);
    NYM_SIM_OFF=Math.round((target-now)/86400000);
    nymRefreshSim();
  }
}
function nymFormatDateFR(iso){ if(!iso) return '—'; const p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function nymToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(function(){t.classList.remove('show');},2400);
}

function nymBacsUtilisesColeopteres(){
  try{
    const raw=localStorage.getItem('col_v21');
    if(!raw) return [];
    const data=JSON.parse(raw);
    const lots=data.lots||data||[];
    const used=[];
    if(Array.isArray(lots)){
      lots.forEach(function(l){
        if(l.cycles) l.cycles.forEach(function(c){if(c&&c.bac)used.push(c.bac);});
        if(l.c1&&l.c1.bac) used.push(l.c1.bac);
        if(l.c2&&l.c2.bac) used.push(l.c2.bac);
        if(l.c3&&l.c3.bac) used.push(l.c3.bac);
        if(l.c4&&l.c4.bac) used.push(l.c4.bac);
        if(l.bac) used.push(l.bac);
      });
    }
    return used.map(function(n){return parseInt(n,10);});
  }catch(e){ return []; }
}

/* Vérifie les numéros de bac utilisés dans TOUS les tableaux de l'application
   (Coléoptères, Nymphes, Larves, Œufs) — pour éviter tout doublon global */
function nymBacsUtilisesPartout(excludeNymLotId){
  const used = nymBacsUtilisesColeopteres();

  // Nymphes (lots actuels en mémoire)
  if (excludeNymLotId !== undefined) {
    NYM_DB.lots.forEach(function(l){ if(l.id!==excludeNymLotId && l.bac) used.push(parseInt(l.bac,10)); });
  } else if (NYM_DB && NYM_DB.lots) {
    NYM_DB.lots.forEach(function(l){ if(l.bac) used.push(parseInt(l.bac,10)); });
  }

  // Larves
  try{
    const rawLar = localStorage.getItem('larves_v7');
    if (rawLar) {
      const larLots = JSON.parse(rawLar) || [];
      if (Array.isArray(larLots)) larLots.forEach(function(l){ if(l.bac) used.push(parseInt(l.bac,10)); });
    }
  }catch(e){}

  // Œufs (ponte) — bacs actifs uniquement (non sortis, non fusionnés)
  try{
    const rawPonte = localStorage.getItem('ponte_v1');
    if (rawPonte) {
      const ponteLignes = JSON.parse(rawPonte) || [];
      if (Array.isArray(ponteLignes)) ponteLignes.forEach(function(l){
        if (l.bac && !l.sorti && !l.fusionne) used.push(parseInt(l.bac,10));
      });
    }
  }catch(e){}

  return used.filter(function(n){ return !isNaN(n); });
}
function nymBacsDisponiblesNymphes(excludeLotId){
  const utilises=new Set(nymBacsUtilisesPartout(excludeLotId));
  const dispo=[];
  for(let i=1;i<=BAC_MAX;i++){ if(!utilises.has(i)) dispo.push(i); }
  return dispo;
}
function nymRemplirSelectBacs(select, excludeLotId, valeurActuelle){
  select.innerHTML='';
  const dispo=nymBacsDisponiblesNymphes(excludeLotId);
  if(valeurActuelle && dispo.indexOf(valeurActuelle)===-1) dispo.unshift(valeurActuelle);
  dispo.sort(function(a,b){return a-b;});
  dispo.forEach(function(n){
    const opt=document.createElement('option');
    opt.value=n; opt.textContent='Bac n°'+n;
    if(n===valeurActuelle) opt.selected=true;
    select.appendChild(opt);
  });
}
function nymBacsDisponiblesColeopteresPourGrille(){
  const u1=nymBacsUtilisesPartout();
  const u2=NYM_DB.grillesCreees.filter(function(g){return !g.enAttente;}).map(function(g){return parseInt(g.bac,10);});
  const utilises=new Set(u1.concat(u2));
  const dispo=[];
  for(let i=1;i<=BAC_MAX;i++){ if(!utilises.has(i)) dispo.push(i); }
  return dispo;
}
function nymLettresDisponiblesPourGrille(){
  const utilisees=new Set(NYM_DB.grillesCreees.map(function(g){return g.lettre;}));
  try{
    const raw=localStorage.getItem('col_v21');
    if(raw){
      const data=JSON.parse(raw);
      const lots=data.lots||data||[];
      if(Array.isArray(lots)) lots.forEach(function(l){ if(l.grille) utilisees.add(l.grille); });
    }
  }catch(e){}
  return NYM_LETTRES.filter(function(l){return !utilisees.has(l);});
}
function nymRemplirSelectLettres(select, valeurActuelle){
  select.innerHTML='';
  const dispo=nymLettresDisponiblesPourGrille();
  if(valeurActuelle && dispo.indexOf(valeurActuelle)===-1) dispo.unshift(valeurActuelle);
  dispo.forEach(function(l){
    const opt=document.createElement('option');
    opt.value=l; opt.textContent=l;
    if(l===valeurActuelle) opt.selected=true;
    select.appendChild(opt);
  });
}
function nymRemplirSelectBacsGrille(select, valeurActuelle){
  select.innerHTML='';
  let dispo=nymBacsDisponiblesColeopteresPourGrille();
  if(valeurActuelle && dispo.indexOf(valeurActuelle)===-1) dispo.unshift(valeurActuelle);
  dispo.sort(function(a,b){return a-b;});
  dispo.forEach(function(n){
    const opt=document.createElement('option');
    opt.value=n; opt.textContent='Bac n°'+n;
    if(n===valeurActuelle) opt.selected=true;
    select.appendChild(opt);
  });
}

function nymRenderCompteur(){
  const n=NYM_DB.lots.length;
  const cb=document.getElementById('nymCompteurBacs'); if(cb) cb.textContent=n;
  const ac=document.getElementById('nymAlerteCompteur'); if(ac) ac.style.display=(n>NYM_ALERTE_BACS)?'block':'none';
}

function nymRenderTableau(){
  const tbody=document.getElementById('nymCorpsTableau'); if(!tbody) return;
  const potentiels=nymV08Eligibles().slice().sort(function(a,b){return (parseInt(a.bac,10)||0)-(parseInt(b.bac,10)||0);});
  const potHtml=potentiels.map(function(r){
    const auto=larNymphAuto(r);
    return '<tr class="nym-ligne-potentielle">'+
      '<td>'+larFr(r.dateEntree)+'</td>'+
      '<td><span class="nym-badge-bac-vers">Vers n°'+r.bac+'</span></td>'+
      '<td class="nym-poids-val">'+(auto!==null?auto.toLocaleString('fr-FR'):'—')+' <span class="nym-badge-potentiel">Potentiel</span></td>'+
      '<td colspan="4" style="font-style:italic;color:#a08040;">En attente de récupération des nymphes</td>'+
      '<td class="action-cell"><button class="nym-btn-travaux-mini" data-action="travaux-potentiel" data-bac="'+r.bac+'">🛠 Travaux</button></td>'+
      '</tr>';
  }).join('');

  if(!NYM_DB.lots.length){
    tbody.innerHTML=(potentiels.length?'':'<tr><td colspan="8" class="nym-table-vide">Aucun bac de nymphes enregistré. Utilisez "+ Ajouter un bac".</td></tr>')+potHtml;
    nymRenderCompteur();
    const tm=document.getElementById('nymTotalMorts'); if(tm) tm.textContent='0';
    nymRenderV08Historique();
    return;
  }
  const lots=NYM_DB.lots.slice().sort(function(a,b){return (parseInt(a.bac,10)||0)-(parseInt(b.bac,10)||0);});
  tbody.innerHTML=lots.map(function(l){
    const trie=l.tri && l.tri.date;
    const tris=l.tris||(trie?[l.tri]:[]);
    const nbTris=tris.length;
    let html='';
    if(nbTris===0){
      html+='<tr data-id="'+l.id+'">';
      html+='<td>'+nymFormatDateFR(l.dateEntree)+'</td>';
      html+='<td><span class="nym-badge-bac">'+l.bac+'</span></td>';
      html+='<td class="nym-poids-val">'+l.poids+'</td>';
      html+='<td><span class="nym-vide-cell">—</span></td>';
      html+='<td><span class="nym-vide-cell">—</span></td>';
      html+='<td><span class="nym-vide-cell">—</span></td>';
      html+='<td><span class="nym-vide-cell">—</span></td>';
      html+='<td class="action-cell"><button class="nym-btn-modifier" data-action="modifier" data-id="'+l.id+'">✏️</button></td>';
      html+='</tr>';
    } else {
      tris.forEach(function(t, idx){
        const bacsTries=(t.bacs||[l.bac]).join(', ');
        const isLast=idx===nbTris-1;
        html+='<tr class="nym-ligne-triee" data-id="'+l.id+'">';
        if(idx===0){
          html+='<td rowspan="'+nbTris+'">'+nymFormatDateFR(l.dateEntree)+'</td>';
          html+='<td rowspan="'+nbTris+'"><span class="nym-badge-bac">'+l.bac+'</span></td>';
          html+='<td rowspan="'+nbTris+'" class="nym-poids-val">'+l.poids+' <span style="font-size:.65rem;color:#6b6b6b;">(restant)</span></td>';
        }
        html+='<td>'+nymFormatDateFR(t.date)+' <span style="font-size:.65rem;color:#9a7818;">(tri '+(idx+1)+'/'+nbTris+')</span></td>';
        html+='<td>'+bacsTries+'</td>';
        html+='<td><span class="nym-poids-val">'+t.poidsColeo+'</span></td>';
        html+='<td><span class="nym-morts-val">'+t.morts+'</span></td>';
        if(idx===0){
          html+='<td rowspan="'+nbTris+'" class="action-cell"><span class="nym-vide-cell">Verrouillé</span></td>';
        }
        html+='</tr>';
      });
    }
    return html;
  }).join('')+potHtml;
  nymRenderCompteur();

  const trisVus=new Set();
  let totalMorts=0;
  lots.forEach(function(l){
    const allTris=l.tris||(l.tri&&l.tri.date?[l.tri]:[]);
    allTris.forEach(function(t){
      const cle=t.date+'|'+(t.bacs||[]).join(',')+'|'+t.morts+'|'+l.id;
      if(!trisVus.has(cle)){ trisVus.add(cle); totalMorts+=t.morts; }
    });
  });
  const tm=document.getElementById('nymTotalMorts'); if(tm) tm.textContent=totalMorts+' g';
  nymRenderV08Historique();
}

function nymRenderGrillesCreees(){
  const zone=document.getElementById('nymZoneGrillesCreees'); if(!zone) return;
  if(!NYM_DB.grillesCreees.length){
    zone.innerHTML='<span class="nym-grilles-vide">Aucune grille créée pour le moment.</span>';
    return;
  }
  zone.innerHTML=NYM_DB.grillesCreees.slice().sort(function(a,b){
    return (parseInt(a.bac,10)||0)-(parseInt(b.bac,10)||0);
  }).map(function(g){
    if (g.enAttente) {
      const manque = NYM_SEUIL_GRILLE_G - g.poidsActuel;
      return '<div class="nym-grille-chip" data-id="'+g.id+'" style="border-color:#dd6b20;background:#fffaf0;">'+
        '<span class="grille-info" style="color:#9a4a00;">⏳ En attente — '+g.poidsActuel+' g / 300 g (manque '+manque+' g)</span>'+
        '</div>';
    }
    return '<div class="nym-grille-chip" data-id="'+g.id+'">'+
      '<span class="grille-info">✓ Grille '+g.lettre+' — Bac n°'+g.bac+' (300 g)</span>'+
      '<button data-action="modifier-grille" data-id="'+g.id+'">✏️</button>'+
      '</div>';
  }).join('');
}

function nymTransmettreVersColeopteres(grille){
  try{
    const raw=localStorage.getItem('col_v21');
    let lots = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(lots)) lots = lots.lots || [];
    lots.push({
      id: Date.now()+Math.floor(Math.random()*10000),
      grille: grille.lettre,
      dateEntree: grille.date,
      poids: NYM_SEUIL_GRILLE_G,
      origine: 'tri_nymphes',
      c1: { bac: grille.bac, done_sec:false, done_chg:false },
      c2: null, c3: null, c4: null
    });
    localStorage.setItem('col_v21', JSON.stringify(lots));
    fbSafeSave('col_v21', lots);
  }catch(e){ console.error('Erreur transmission col_v21', e); }
}

let nymKpValeur='0';
let nymKpCallback=null;
function nymOuvrirPave(titre, valeurInitiale, callback){
  nymKpValeur=(valeurInitiale!==undefined&&valeurInitiale!==null&&valeurInitiale!=='')?String(valeurInitiale):'0';
  nymKpCallback=callback;
  document.getElementById('nymKeypadTitre').textContent=titre;
  document.getElementById('nymKeypadDisplay').textContent=nymKpValeur;
  document.getElementById('nymKeypadOverlay').classList.add('visible');
}
function nymFermerPave(){
  document.getElementById('nymKeypadOverlay').classList.remove('visible');
  nymKpCallback=null;
}

let nymModLotId=null, nymModPoids=0;
function nymOuvrirModifier(lotId){
  const lot=NYM_DB.lots.find(function(l){return l.id===lotId;});
  if(!lot) return;
  if(lot.tri && lot.tri.date){ nymToast('Ce bac a déjà été trié, modification impossible.'); return; }
  nymModLotId=lotId; nymModPoids=lot.poids;
  nymRemplirSelectBacs(document.getElementById('nymFModBac'), lotId, lot.bac);
  document.getElementById('nymFModPoidsAffiche').value=lot.poids;
  document.getElementById('nymOvModifier').classList.add('visible');
}

let nymFusionSelection=[];
let nymTrierSelection=[];
let nymTriPoidsColeo=0;
let nymTriPoidsMorts=0;
let nymFileGrillesACreer=[];
let nymGrilleEnCoursIndex=0;
let nymTriContexte=null;
let nymModGrilleId=null;

function nymRemplirSelectBacsGrilleFusion(select){
  const utilises=new Set(nymBacsUtilisesPartout().filter(function(n){
    // Exclure les bacs nymphes en cours de fusion (ils seront supprimés et leur numéro libéré)
    const lot = NYM_DB.lots.find(function(l){ return parseInt(l.bac,10)===n && nymFusionSelection.indexOf(l.id)!==-1; });
    return !lot;
  }));
  select.innerHTML='';
  const dispo=[];
  for(let i=1;i<=BAC_MAX;i++){ if(!utilises.has(i)) dispo.push(i); }
  dispo.forEach(function(n){
    const opt=document.createElement('option');
    opt.value=n; opt.textContent='Bac n°'+n;
    select.appendChild(opt);
  });
}

function nymTotalNymphesSelection(){
  return nymTrierSelection.reduce(function(s,id){
    const l=NYM_DB.lots.find(function(x){return x.id===id;});
    return s+(l?l.poids:0);
  },0);
}
function nymVerifierPlafondTri(){
  const totalNymphes=nymTotalNymphesSelection();
  const plafond=totalNymphes-nymTriPoidsMorts;
  const box=document.getElementById('nymTrierVerifRecap');
  box.style.display='block';
  if(nymTriPoidsColeo>plafond){
    box.innerHTML='<span class="nym-alerte-txt">⚠️ Poids coléoptères ('+nymTriPoidsColeo+' g) supérieur au plafond autorisé : '+plafond+' g (nymphes − morts).</span>';
  } else {
    box.innerHTML='<span class="nym-ok-txt">✓ Poids coléoptères valide. Plafond : '+plafond+' g.</span>';
  }
}

/* ══ GESTION DE LA GRILLE EN ATTENTE (accumulation jusqu'à 300g) ══ */
function nymGetGrilleEnAttente(){
  return NYM_DB.grillesCreees.find(function(g){ return g.enAttente===true; }) || null;
}

function nymTraiterPoidsColeoVersGrille(poidsAjoute){
  let restant = poidsAjoute;
  let attente = nymGetGrilleEnAttente();

  if (attente) {
    const espaceLibre = NYM_SEUIL_GRILLE_G - attente.poidsActuel;
    const aAjouter = Math.min(espaceLibre, restant);
    attente.poidsActuel += aAjouter;
    restant -= aAjouter;
    nymSauverDB(NYM_DB); nymRenderGrillesCreees();

    if (attente.poidsActuel >= NYM_SEUIL_GRILLE_G) {
      nymOuvrirCreationGrillePourAttente(attente);
      // Le reste éventuel (si poidsAjoute dépassait) sera traité après confirmation lettre/bac
      if (restant > 0) {
        window._nymResteApresGrille = restant;
      }
      return;
    }
  } else if (restant > 0) {
    // Pas de grille en attente : en créer une nouvelle avec le poids actuel
    if (restant >= NYM_SEUIL_GRILLE_G) {
      const nouvelleAttente = { id: nymGenId(), enAttente:true, poidsActuel: NYM_SEUIL_GRILLE_G, lettre:null, bac:null, date: nymTriContexte?nymTriContexte.date:nymTodayISO() };
      NYM_DB.grillesCreees.push(nouvelleAttente);
      restant -= NYM_SEUIL_GRILLE_G;
      nymSauverDB(NYM_DB); nymRenderGrillesCreees();
      nymOuvrirCreationGrillePourAttente(nouvelleAttente);
      if (restant > 0) window._nymResteApresGrille = restant;
      return;
    } else {
      const nouvelleAttente = { id: nymGenId(), enAttente:true, poidsActuel: restant, lettre:null, bac:null, date: nymTriContexte?nymTriContexte.date:nymTodayISO() };
      NYM_DB.grillesCreees.push(nouvelleAttente);
      nymSauverDB(NYM_DB); nymRenderGrillesCreees();
      nymToast('Grille en attente créée : '+restant+' g / 300 g (manque '+(NYM_SEUIL_GRILLE_G-restant)+' g).');
      return;
    }
  }

  if (restant > 0) {
    // Reliquat à traiter en récursif (cas rare où poidsAjoute > 300g d'un coup)
    nymTraiterPoidsColeoVersGrille(restant);
  } else {
    nymToast('Poids ajouté à la grille en attente : '+poidsAjoute+' g.');
  }
}

let nymGrillePourValidation = null;
function nymOuvrirCreationGrillePourAttente(grilleAttente){
  nymGrillePourValidation = grilleAttente;
  document.getElementById('nymCreerGrilleRecap').innerHTML = 'Grille complète : <b>'+grilleAttente.poidsActuel+' g</b> — Choisissez sa lettre et son numéro de bac pour la transmettre aux Coléoptères.';
  nymRemplirSelectLettres(document.getElementById('nymFGrilleLettre'), null);
  nymRemplirSelectBacsGrille(document.getElementById('nymFGrilleBac'), null);
  document.getElementById('nymOvCreerGrille').classList.add('visible');
}

function nymOuvrirModifierGrille(grilleId){
  const g=NYM_DB.grillesCreees.find(function(x){return x.id===grilleId;});
  if(!g) return;
  nymModGrilleId=grilleId;
  nymRemplirSelectLettresAvecActuelle(document.getElementById('nymFModGrilleLettre'), g.lettre);
  nymRemplirSelectBacsGrilleAvecActuel(document.getElementById('nymFModGrilleBac'), g.bac);
  document.getElementById('nymOvModifierGrille').classList.add('visible');
}
function nymRemplirSelectLettresAvecActuelle(select, lettreActuelle){
  const utilisees=new Set(NYM_DB.grillesCreees.filter(function(g){return g.lettre!==lettreActuelle;}).map(function(g){return g.lettre;}));
  try{
    const raw=localStorage.getItem('col_v21');
    if(raw){
      const data=JSON.parse(raw);
      const lots=data.lots||data||[];
      if(Array.isArray(lots)) lots.forEach(function(l){ if(l.grille && l.grille!==lettreActuelle) utilisees.add(l.grille); });
    }
  }catch(e){}
  select.innerHTML='';
  NYM_LETTRES.filter(function(l){return !utilisees.has(l);}).forEach(function(l){
    const opt=document.createElement('option');
    opt.value=l; opt.textContent=l;
    if(l===lettreActuelle) opt.selected=true;
    select.appendChild(opt);
  });
}
function nymRemplirSelectBacsGrilleAvecActuel(select, bacActuel){
  bacActuel = parseInt(bacActuel, 10);
  const u1=nymBacsUtilisesPartout();
  const u2=NYM_DB.grillesCreees.filter(function(g){return !g.enAttente && parseInt(g.bac,10)!==bacActuel;}).map(function(g){return parseInt(g.bac,10);});
  const utilises=new Set(u1.concat(u2));
  select.innerHTML='';
  const dispo=[];
  for(let i=1;i<=BAC_MAX;i++){ if(!utilises.has(i)) dispo.push(i); }
  if(dispo.indexOf(bacActuel)===-1) dispo.unshift(bacActuel);
  dispo.sort(function(a,b){return a-b;});
  dispo.forEach(function(n){
    const opt=document.createElement('option');
    opt.value=n; opt.textContent='Bac n°'+n;
    if(n===bacActuel) opt.selected=true;
    select.appendChild(opt);
  });
}

function nymSafeListen(id, event, handler){
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
  else console.warn('[Nymphes] Élément manquant pour listener: #' + id);
}

function nymAttacherEvenements(){
  if(window._nymEventsAttached) return;
  window._nymEventsAttached = true;

  nymSafeListen('nymBM15','click', function(){nymShiftSim(-15);});
  nymSafeListen('nymBM1','click', function(){nymShiftSim(-1);});
  nymSafeListen('nymBP1','click', function(){nymShiftSim(1);});
  nymSafeListen('nymBP15','click', function(){nymShiftSim(15);});
  nymSafeListen('nymBP30','click', function(){nymShiftSim(30);});
  nymSafeListen('nymBApply','click', nymApplySimInput);
  nymSafeListen('nymBReset','click', nymResetSim);
  nymSafeListen('nymSimDateInput','keydown', function(e){if(e.key==='Enter')nymApplySimInput();});

  nymSafeListen('nymBtnTravauxVers08','click', nymOuvrirRecupModal);
  nymSafeListen('nymRecupBac','change', nymMajPoidsRecupAuto);
  nymSafeListen('nymRecupAnnuler','click', nymFermerRecupModal);
  nymSafeListen('nymRecupValider','click', nymValiderRecup);
  nymSafeListen('nymOvRecup','click', function(e){ if(e.target===document.getElementById('nymOvRecup')) nymFermerRecupModal(); });

  nymSafeListen('nymKeypadPanel','click', function(e){e.stopPropagation();});
  nymSafeListen('nymKeypadOverlay','click', function(){nymFermerPave();});
  document.querySelectorAll('.nym-keypad-grid button').forEach(function(btn){
    btn.addEventListener('click', function(){
      const k=btn.dataset.k;
      if(k==='back'){ nymKpValeur=nymKpValeur.length>1?nymKpValeur.slice(0,-1):'0'; }
      else if(k==='.'){ if(nymKpValeur.indexOf('.')===-1) nymKpValeur+='.'; }
      else { nymKpValeur=(nymKpValeur==='0')?k:nymKpValeur+k; }
      document.getElementById('nymKeypadDisplay').textContent=nymKpValeur;
    });
  });
  nymSafeListen('nymKpEffacer','click', function(){
    nymKpValeur='0'; document.getElementById('nymKeypadDisplay').textContent=nymKpValeur;
  });
  nymSafeListen('nymKpAnnuler','click', nymFermerPave);
  nymSafeListen('nymKpValider','click', function(){
    const val=parseFloat(nymKpValeur)||0;
    const cb=nymKpCallback;
    nymFermerPave();
    if(cb) cb(val);
  });

  let nymAjPoids=0;
  nymSafeListen('nymBtnAjouter','click', function(){
    nymAjPoids=0;
    document.getElementById('nymFAjDate').value=nymTodayISO();
    document.getElementById('nymFAjPoidsAffiche').value='0';
    nymRemplirSelectBacs(document.getElementById('nymFAjBac'), null, null);
    document.getElementById('nymOvAjouter').classList.add('visible');
  });
  nymSafeListen('nymFAjPoidsAffiche','click', function(){
    nymOuvrirPave('Poids du bac (g)', nymAjPoids, function(v){
      nymAjPoids=v; document.getElementById('nymFAjPoidsAffiche').value=v;
    });
  });
  nymSafeListen('nymFAjAnnuler','click', function(){
    document.getElementById('nymOvAjouter').classList.remove('visible');
  });
  nymSafeListen('nymFAjValider','click', function(){
    const date=document.getElementById('nymFAjDate').value;
    const bac=parseInt(document.getElementById('nymFAjBac').value,10);
    if(!date){nymToast('Veuillez indiquer une date.');return;}
    if(!bac){nymToast('Veuillez choisir un bac.');return;}
    if(nymAjPoids<=0){nymToast('Veuillez indiquer un poids.');return;}
    NYM_DB.lots.push({id:nymGenId(),dateEntree:date,bac:bac,poids:nymAjPoids,tri:null});
    nymSauverDB(NYM_DB);
    nymRenderTableau();
    document.getElementById('nymOvAjouter').classList.remove('visible');
    nymToast('Bac n°'+bac+' ajouté.');
  });

  nymSafeListen('nymFModPoidsAffiche','click', function(){
    nymOuvrirPave('Poids du bac (g)', nymModPoids, function(v){
      nymModPoids=v; document.getElementById('nymFModPoidsAffiche').value=v;
    });
  });
  nymSafeListen('nymFModAnnuler','click', function(){
    document.getElementById('nymOvModifier').classList.remove('visible');
  });
  nymSafeListen('nymFModValider','click', function(){
    const lot=NYM_DB.lots.find(function(l){return l.id===nymModLotId;});
    if(!lot) return;
    const nouveauBac=parseInt(document.getElementById('nymFModBac').value,10);
    lot.bac=nouveauBac; lot.poids=nymModPoids;
    nymSauverDB(NYM_DB); nymRenderTableau();
    document.getElementById('nymOvModifier').classList.remove('visible');
    nymToast('Bac n°'+nouveauBac+' mis à jour.');
  });
  nymSafeListen('nymFModSupprimer','click', function(){
    NYM_DB.lots=NYM_DB.lots.filter(function(l){return l.id!==nymModLotId;});
    nymSauverDB(NYM_DB); nymRenderTableau();
    document.getElementById('nymOvModifier').classList.remove('visible');
    nymToast('Lot supprimé.');
  });

  nymSafeListen('nymBtnFusionner','click', function(){
    const dispo=NYM_DB.lots.filter(function(l){return !(l.tri&&l.tri.date);});
    if(dispo.length<2){nymToast('Il faut au moins 2 bacs disponibles pour fusionner.');return;}
    const cl=document.getElementById('nymFusionChecklist');
    cl.innerHTML=dispo.map(function(l){
      return '<label class="nym-check-item"><input type="checkbox" value="'+l.id+'" class="nym-fusion-check"/> Bac n°'+l.bac+' — '+nymFormatDateFR(l.dateEntree)+' — '+l.poids+' g</label>';
    }).join('');
    document.getElementById('nymFusionRecap').innerHTML='Poids total : <b>0 g</b>';
    document.getElementById('nymOvFusionListe').classList.add('visible');
  });
  nymSafeListen('nymFusionChecklist','change', function(){
    const checked=Array.prototype.map.call(document.querySelectorAll('.nym-fusion-check:checked'),function(c){return c.value;});
    const total=checked.reduce(function(s,id){const l=NYM_DB.lots.find(function(x){return x.id===id;});return s+(l?l.poids:0);},0);
    document.getElementById('nymFusionRecap').innerHTML='Poids total : <b>'+total+' g</b> ('+checked.length+' bac(s) sélectionné(s))';
  });
  nymSafeListen('nymFusAnnuler','click', function(){
    document.getElementById('nymOvFusionListe').classList.remove('visible');
  });
  nymSafeListen('nymFusContinuer','click', function(){
    const checked=Array.prototype.map.call(document.querySelectorAll('.nym-fusion-check:checked'),function(c){return c.value;});
    if(checked.length<2){nymToast('Sélectionnez au moins 2 bacs.');return;}
    nymFusionSelection=checked;
    const total=nymFusionSelection.reduce(function(s,id){const l=NYM_DB.lots.find(function(x){return x.id===id;});return s+(l?l.poids:0);},0);
    document.getElementById('nymFusionBacRecap').innerHTML=nymFusionSelection.length+' bacs sélectionnés — Poids total : <b>'+total+' g</b>';
    nymRemplirSelectBacsGrilleFusion(document.getElementById('nymFFusBac'));
    document.getElementById('nymOvFusionListe').classList.remove('visible');
    document.getElementById('nymOvFusionBac').classList.add('visible');
  });
  nymSafeListen('nymFusBacAnnuler','click', function(){
    document.getElementById('nymOvFusionBac').classList.remove('visible');
    document.getElementById('nymOvFusionListe').classList.add('visible');
  });
  nymSafeListen('nymFusBacValider','click', function(){
    const lotsAFusionner=NYM_DB.lots.filter(function(l){return nymFusionSelection.indexOf(l.id)!==-1;});
    const poidsTotal=lotsAFusionner.reduce(function(s,l){return s+l.poids;},0);
    const dateMin=lotsAFusionner.reduce(function(min,l){return (!min||l.dateEntree<min)?l.dateEntree:min;},null);
    const nouveauBac=parseInt(document.getElementById('nymFFusBac').value,10);
    NYM_DB.lots=NYM_DB.lots.filter(function(l){return nymFusionSelection.indexOf(l.id)===-1;});
    NYM_DB.lots.push({id:nymGenId(),dateEntree:dateMin,bac:nouveauBac,poids:poidsTotal,tri:null});
    nymSauverDB(NYM_DB); nymRenderTableau();
    document.getElementById('nymOvFusionBac').classList.remove('visible');
    nymToast('Fusion réalisée → Bac n°'+nouveauBac+' ('+poidsTotal+' g).');
    nymFusionSelection=[];
  });

  nymSafeListen('nymBtnTrier','click', function(){
    const dispo=NYM_DB.lots.filter(function(l){return (parseFloat(l.poids)||0) > 0;});
    if(!dispo.length){nymToast('Aucun bac disponible à trier (tous les bacs sont à 0 g).');return;}
    const cl=document.getElementById('nymTrierChecklist');
    cl.innerHTML=dispo.map(function(l){
      const nbTris=(l.tris&&l.tris.length)||0;
      const badge=nbTris>0?(' <span style="color:#3a7d44;font-weight:700;">(déjà trié '+nbTris+'x)</span>'):'';
      return '<label class="nym-check-item"><input type="checkbox" value="'+l.id+'" class="nym-trier-check"/> Bac n°'+l.bac+' — '+nymFormatDateFR(l.dateEntree)+' — '+l.poids+' g'+badge+'</label>';
    }).join('');
    document.getElementById('nymTrierRecap').innerHTML='Poids total des nymphes sélectionnées : <b>0 g</b>';
    document.getElementById('nymOvTrierListe').classList.add('visible');
  });
  nymSafeListen('nymTrierChecklist','change', function(){
    const checked=Array.prototype.map.call(document.querySelectorAll('.nym-trier-check:checked'),function(c){return c.value;});
    const total=checked.reduce(function(s,id){const l=NYM_DB.lots.find(function(x){return x.id===id;});return s+(l?l.poids:0);},0);
    document.getElementById('nymTrierRecap').innerHTML='Poids total des nymphes sélectionnées : <b>'+total+' g</b> ('+checked.length+' bac(s))';
  });
  nymSafeListen('nymTrierAnnuler','click', function(){
    document.getElementById('nymOvTrierListe').classList.remove('visible');
  });
  nymSafeListen('nymTrierContinuer','click', function(){
    const checked=Array.prototype.map.call(document.querySelectorAll('.nym-trier-check:checked'),function(c){return c.value;});
    if(!checked.length){nymToast('Sélectionnez au moins un bac.');return;}
    nymTrierSelection=checked;
    const totalNymphes=nymTrierSelection.reduce(function(s,id){const l=NYM_DB.lots.find(function(x){return x.id===id;});return s+(l?l.poids:0);},0);
    nymTriPoidsColeo=0; nymTriPoidsMorts=0;
    document.getElementById('nymFTriDate').value=nymTodayISO();
    document.getElementById('nymFTriColeoAffiche').value='0';
    document.getElementById('nymFTriMortsAffiche').value='0';
    document.getElementById('nymTrierVerifRecap').style.display='none';
    document.getElementById('nymTrierResultatsRecap').innerHTML=nymTrierSelection.length+' bac(s) sélectionné(s) — Poids total des nymphes : <b>'+totalNymphes+' g</b>';
    document.getElementById('nymOvTrierListe').classList.remove('visible');
    document.getElementById('nymOvTrierResultats').classList.add('visible');
  });
  nymSafeListen('nymFTriColeoAffiche','click', function(){
    nymOuvrirPave('Poids des coléoptères (g)', nymTriPoidsColeo, function(v){
      nymTriPoidsColeo=v; document.getElementById('nymFTriColeoAffiche').value=v; nymVerifierPlafondTri();
    });
  });
  nymSafeListen('nymFTriMortsAffiche','click', function(){
    nymOuvrirPave('Poids des morts (g)', nymTriPoidsMorts, function(v){
      nymTriPoidsMorts=v; document.getElementById('nymFTriMortsAffiche').value=v; nymVerifierPlafondTri();
    });
  });
  nymSafeListen('nymTriResAnnuler','click', function(){
    document.getElementById('nymOvTrierResultats').classList.remove('visible');
  });
  nymSafeListen('nymTriResValider','click', function(){
    const date=document.getElementById('nymFTriDate').value;
    if(!date){nymToast('Veuillez indiquer la date du tri.');return;}
    const totalNymphes=nymTotalNymphesSelection();
    const plafond=totalNymphes-nymTriPoidsMorts;
    if(nymTriPoidsColeo<=0){nymToast('Veuillez indiquer le poids des coléoptères.');return;}
    if(nymTriPoidsColeo>plafond){nymToast('Poids coléoptères supérieur au plafond autorisé !');return;}
    const bacsTries=nymTrierSelection.map(function(id){const l=NYM_DB.lots.find(function(x){return x.id===id;});return l?l.bac:null;}).filter(function(x){return x;});
    nymTriContexte={date:date,bacsTries:bacsTries,poidsColeo:nymTriPoidsColeo,morts:nymTriPoidsMorts};
    nymTrierSelection.forEach(function(id){
      const l=NYM_DB.lots.find(function(x){return x.id===id;});
      if(l) {
        const triEntry={date:date,bacs:bacsTries,poidsColeo:nymTriPoidsColeo,morts:nymTriPoidsMorts};
        if(!l.tris) l.tris=[];
        l.tris.push(triEntry);
        l.tri=triEntry; // dernier tri (compatibilité affichage)
        // Déduire le poids trié (coléoptères + morts) du poids restant du bac
        l.poids = Math.max(0, (parseFloat(l.poids)||0) - nymTriPoidsColeo - nymTriPoidsMorts);
      }
    });
    nymSauverDB(NYM_DB); nymRenderTableau();
    document.getElementById('nymOvTrierResultats').classList.remove('visible');
    nymTraiterPoidsColeoVersGrille(nymTriPoidsColeo);
  });

  nymSafeListen('nymGrilleAnnuler','click', function(){
    document.getElementById('nymOvCreerGrille').classList.remove('visible');
    nymGrillePourValidation = null;
    nymToast('Création annulée. La grille reste en attente (300 g prête à être attribuée).');
  });
  nymSafeListen('nymGrilleValider','click', function(){
    const lettre=document.getElementById('nymFGrilleLettre').value;
    const bac=parseInt(document.getElementById('nymFGrilleBac').value,10);
    if(!lettre||!bac){nymToast('Veuillez choisir une lettre et un bac.');return;}
    if(!nymGrillePourValidation){ document.getElementById('nymOvCreerGrille').classList.remove('visible'); return; }

    // Finaliser la grille en attente : devient une grille transmise
    nymGrillePourValidation.lettre = lettre;
    nymGrillePourValidation.bac = bac;
    nymGrillePourValidation.poids = NYM_SEUIL_GRILLE_G;
    nymGrillePourValidation.enAttente = false;
    nymSauverDB(NYM_DB); nymRenderGrillesCreees();
    nymTransmettreVersColeopteres(nymGrillePourValidation);
    nymToast('Grille '+lettre+' / Bac n°'+bac+' (300 g) créée et transmise aux Coléoptères.');

    document.getElementById('nymOvCreerGrille').classList.remove('visible');
    nymGrillePourValidation = null;

    // Traiter le reliquat éventuel (excédent au-delà de 300g)
    if (window._nymResteApresGrille && window._nymResteApresGrille > 0) {
      const reste = window._nymResteApresGrille;
      window._nymResteApresGrille = 0;
      setTimeout(function(){ nymTraiterPoidsColeoVersGrille(reste); }, 200);
    }
  });

  nymSafeListen('nymModGrilleAnnuler','click', function(){
    document.getElementById('nymOvModifierGrille').classList.remove('visible');
  });
  nymSafeListen('nymModGrilleValider','click', function(){
    const g=NYM_DB.grillesCreees.find(function(x){return x.id===nymModGrilleId;});
    if(!g) return;
    const ancienneLettre=g.lettre, ancienBac=g.bac;
    g.lettre=document.getElementById('nymFModGrilleLettre').value;
    g.bac=parseInt(document.getElementById('nymFModGrilleBac').value,10);
    nymSauverDB(NYM_DB); nymRenderGrillesCreees();
    try{
      const raw=localStorage.getItem('col_v21');
      if(raw){
        let lots=JSON.parse(raw);
        if(!Array.isArray(lots)) lots=lots.lots||[];
        const lot=lots.find(function(l){return l.origine==='tri_nymphes'&&l.grille===ancienneLettre&&l.c1&&l.c1.bac===ancienBac;});
        if(lot){ lot.grille=g.lettre; if(lot.c1) lot.c1.bac=g.bac; localStorage.setItem('col_v21',JSON.stringify(lots)); }
      }
    }catch(e){ console.error(e); }
    document.getElementById('nymOvModifierGrille').classList.remove('visible');
    nymToast('Grille mise à jour : '+g.lettre+' / Bac n°'+g.bac);
  });

  nymSafeListen('nymCorpsTableau','click', function(e){
    const btn=e.target.closest('[data-action="modifier"]');
    if(btn) nymOuvrirModifier(btn.dataset.id);
    const btnT=e.target.closest('[data-action="travaux-potentiel"]');
    if(btnT) nymOuvrirRecupModal(btnT.dataset.bac);
  });
  nymSafeListen('nymZoneGrillesCreees','click', function(e){
    const btn=e.target.closest('[data-action="modifier-grille"]');
    if(btn) nymOuvrirModifierGrille(btn.dataset.id);
  });
}

function nymMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du tableau Nymphes ET les grilles créées. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider le tableau Nymphes ?')) return;
  NYM_DB = { lots: [], grillesCreees: [] };
  nymSauverDB(NYM_DB);
  nymRenderTableau();
  nymRenderGrillesCreees();
}

function initNymphesPage(){
  NYM_DB = nymChargerDB();
  nymAttacherEvenements();
  larLoad();
  nymRefreshSim();
  nymRenderTableau();
  nymRenderGrillesCreees();
}

/* ══ Vers 08 arrivés à maturité → récupération des nymphes ══ */
function nymV08Eligibles(){
  larLoad();
  return larData.filter(function(r){
    const v=parseFloat(r.v08);
    return !isNaN(v) && v>0 && !r.nymphTransfere;
  });
}
function nymRenderV08Historique(){
  const wrap=document.getElementById('nymV08HistWrap');
  const hist=document.getElementById('nymV08Historique');
  if(!hist||!wrap) return;
  const entries=[];
  larData.forEach(function(r){
    if(Array.isArray(r.travaux)){
      r.travaux.forEach(function(t){
        if(t.type==='Récupération nymphes') entries.push({date:t.date,bac:r.bac,poids:t.poids,bacReception:t.bacReception});
      });
    }
  });
  if(!entries.length){ wrap.style.display='none'; hist.innerHTML=''; return; }
  wrap.style.display='block';
  entries.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  hist.innerHTML=entries.map(function(e){
    return '<div class="nym-v08-hist-item">'+larFr(e.date)+' — Vers n°'+e.bac+' : récupération des nymphes, '+(parseFloat(e.poids)||0).toLocaleString('fr-FR')+' g → bac de réception n°'+e.bacReception+'</div>';
  }).join('');
}
function nymMajPoidsRecupAuto(){
  const selBac=document.getElementById('nymRecupBac');
  const row=larData.find(function(r){return String(r.bac)===String(selBac.value);});
  const auto=row?larNymphAuto(row):null;
  document.getElementById('nymRecupPoids').value=auto!==null?auto:'';
}
function nymOuvrirRecupModal(bacPreselectionne){
  larLoad();
  const elig=nymV08Eligibles();
  if(!elig.length){ nymToast('Aucun bac de vers arrivé à maturité disponible.'); return; }
  const selBac=document.getElementById('nymRecupBac');
  selBac.innerHTML='';
  elig.forEach(function(r){
    const opt=document.createElement('option');
    opt.value=r.bac; opt.textContent='Bac n°'+r.bac;
    if(bacPreselectionne && String(r.bac)===String(bacPreselectionne)) opt.selected=true;
    selBac.appendChild(opt);
  });
  nymMajPoidsRecupAuto();
  const selRecep=document.getElementById('nymRecupBacReception');
  nymRemplirSelectBacs(selRecep, null, null);
  const optVide=document.createElement('option');
  optVide.value=''; optVide.textContent='-- Choisir un bac --';
  selRecep.insertBefore(optVide, selRecep.firstChild);
  selRecep.value='';
  document.getElementById('nymOvRecup').classList.add('visible');
}
function nymFermerRecupModal(){ document.getElementById('nymOvRecup').classList.remove('visible'); }
function nymValiderRecup(){
  const bac=document.getElementById('nymRecupBac').value;
  const poids=parseFloat(document.getElementById('nymRecupPoids').value);
  const bacReception=parseInt(document.getElementById('nymRecupBacReception').value,10);
  if(!bac){ nymToast('Aucun bac sélectionné.'); return; }
  if(isNaN(poids)||poids<=0){ nymToast('Merci de renseigner un poids récupéré valide.'); return; }
  if(!bacReception){ nymToast('Merci de choisir un bac de réception.'); return; }
  const row=larData.find(function(r){return String(r.bac)===String(bac);});
  if(!row){ nymToast('Bac introuvable.'); return; }
  const today=nymTodayISO();
  NYM_DB.lots.push({id:nymGenId(),dateEntree:today,bac:bacReception,poids:poids,tri:null,origine:'transfert_larves'});
  nymSauverDB(NYM_DB);
  if(!Array.isArray(row.travaux)) row.travaux=[];
  row.travaux.push({date:today,type:'Récupération nymphes',stade:'v08',poids:poids,bacReception:bacReception});
  row.nymphTransfere=true;
  larSave();
  nymFermerRecupModal();
  nymRenderTableau();
  nymToast('Bac n°'+bacReception+' créé dans Nymphes ('+poids.toLocaleString('fr-FR')+' g).');
}

