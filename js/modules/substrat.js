/* ══ SUBSTRAT — fiche recette, stocks liés au module Stocks, préparations ══ */
const SUB_CLES = { recette:'sub_recette_v1', historique:'sub_historique_v1' };
const SUB_INGREDIENTS = [
  { id:'son_de_ble', nom:'Son de blé', icone:'🌾', tagClass:'sub-tag-son' },
  { id:'farine', nom:'Farine protéinée', icone:'🧂', tagClass:'sub-tag-farine' },
  { id:'levure', nom:'Levure de bière', icone:'🫙', tagClass:'sub-tag-levure' }
];
let subRecette = { son:80, farine:12, levure:8 };
let subHistorique = [];

function subChargerJSON(cle, defaut){
  try{ const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; }catch(e){ return defaut; }
}
function subSauverJSON(cle, valeur){
  localStorage.setItem(cle, JSON.stringify(valeur));
  fbSafeSave(cle, valeur);
}
async function subSyncFromCloud(){
  const cloudRecette = await fbSafeLoad(SUB_CLES.recette, null);
  if (cloudRecette !== null) localStorage.setItem(SUB_CLES.recette, JSON.stringify(cloudRecette));
  const cloudHist = await fbSafeLoad(SUB_CLES.historique, null);
  if (cloudHist !== null) localStorage.setItem(SUB_CLES.historique, JSON.stringify(cloudHist));
}

/* Niveau de stock réel calculé à partir des mouvements de la page Stocks */
function subNiveauStock(type){
  const rows = stkLoad(type);
  let e=0, s=0;
  rows.forEach(function(r){ if(r.type==='entree') e+=r.qte; else s+=r.qte; });
  return Math.round((e-s)*100)/100;
}
function subAjouterMouvementSortie(type, qte, date){
  const rows = stkLoad(type);
  const id = Date.now()+Math.random();
  rows.push({ id:id, type:'sortie', date:date, frs:'', fac:'Préparation substrat', qte:qte, prix:0 });
  rows.sort(function(a,b){ return a.date.localeCompare(b.date); });
  stkSave(type, rows);
  return id;
}
function subSupprimerMouvement(type, id){
  let rows = stkLoad(type);
  rows = rows.filter(function(r){ return r.id!==id; });
  stkSave(type, rows);
}

/* Fiche recette */
function subMajTotalPct(){
  const son = parseFloat(document.getElementById('sub-pct-son').value) || 0;
  const farine = parseFloat(document.getElementById('sub-pct-farine').value) || 0;
  const levure = parseFloat(document.getElementById('sub-pct-levure').value) || 0;
  const total = Math.round((son+farine+levure)*10)/10;
  const el = document.getElementById('sub-total-pct');
  if(Math.abs(total-100) < 0.05){
    el.className = 'sub-total-pct sub-total-ok';
    el.textContent = 'Total : '+total+'% ✓';
  } else {
    el.className = 'sub-total-pct sub-total-ko';
    el.textContent = 'Total : '+total+'% — doit faire 100%';
  }
  return { son:son, farine:farine, levure:levure, total:total };
}
function subEnregistrerRecette(){
  const v = subMajTotalPct();
  if(Math.abs(v.total-100) > 0.05){
    alert("Le total des pourcentages doit être égal à 100% avant d'enregistrer la recette.");
    return;
  }
  subRecette = { son:v.son, farine:v.farine, levure:v.levure };
  subSauverJSON(SUB_CLES.recette, subRecette);
  subMajApercu();
  showToast('✓ Fiche recette enregistrée');
}

/* Stocks (lecture seule, depuis la page Stocks) */
function subRenderStocks(){
  const grille = document.getElementById('sub-stocks-grille');
  if(!grille) return;
  grille.innerHTML = '';
  SUB_INGREDIENTS.forEach(function(ing){
    const qte = subNiveauStock(ing.id);
    const seuil = STK_TYPES[ing.id] ? STK_TYPES[ing.id].seuil : 5;
    const alerte = qte <= seuil;
    const div = document.createElement('div');
    div.className = 'sub-stock-carte' + (alerte ? ' sub-alerte' : '');
    div.innerHTML =
      '<div class="sub-icone">'+ing.icone+'</div>'+
      '<div class="sub-nom">'+ing.nom+'</div>'+
      '<div class="sub-qte">'+qte.toFixed(2)+' <span>kg</span></div>'+
      (alerte ? '<div style="font-size:0.72rem;color:#C0392B;font-weight:700;margin-top:2px;">⚠ Stock faible</div>' : '');
    grille.appendChild(div);
  });
}

/* Calcul des besoins / aperçu */
function subCalculerBesoins(poids){
  return {
    son: Math.round(poids * subRecette.son / 100 * 100) / 100,
    farine: Math.round(poids * subRecette.farine / 100 * 100) / 100,
    levure: Math.round(poids * subRecette.levure / 100 * 100) / 100
  };
}
function subMajApercu(){
  const poids = parseFloat(document.getElementById('sub-prep-poids').value);
  const apercu = document.getElementById('sub-apercu');
  const avert = document.getElementById('sub-avertissement');
  if(!poids || poids <= 0){
    apercu.classList.remove('visible');
    avert.classList.remove('visible');
    return;
  }
  const besoins = subCalculerBesoins(poids);
  apercu.classList.add('visible');
  apercu.innerHTML =
    '<div class="sub-apercu-ligne"><span>🌾 Son de blé nécessaire</span><b>'+besoins.son.toFixed(2)+' kg</b></div>'+
    '<div class="sub-apercu-ligne"><span>🧂 Farine protéinée nécessaire</span><b>'+besoins.farine.toFixed(2)+' kg</b></div>'+
    '<div class="sub-apercu-ligne"><span>🫙 Levure de bière nécessaire</span><b>'+besoins.levure.toFixed(2)+' kg</b></div>';

  const manque = [];
  if(besoins.son > subNiveauStock('son_de_ble')) manque.push('son de blé');
  if(besoins.farine > subNiveauStock('farine')) manque.push('farine');
  if(besoins.levure > subNiveauStock('levure')) manque.push('levure');
  if(manque.length){
    avert.classList.add('visible');
    avert.textContent = '⚠ Stock insuffisant pour : '+manque.join(', ')+'. La validation restera possible mais le stock passera en négatif.';
  } else {
    avert.classList.remove('visible');
  }
}

/* Validation de la préparation → déduction réelle des stocks (page Stocks) */
function subValiderPreparation(){
  const date = document.getElementById('sub-prep-date').value || new Date().toISOString().slice(0,10);
  const poids = parseFloat(document.getElementById('sub-prep-poids').value);
  const nom = document.getElementById('sub-prep-nom').value.trim() || 'Non renseigné';

  if(!poids || poids <= 0){ alert('Merci de renseigner un poids de substrat valide.'); return; }
  const totalRecette = subRecette.son + subRecette.farine + subRecette.levure;
  if(Math.abs(totalRecette-100) > 0.5){
    alert("La fiche recette ne totalise pas 100%. Corrigez-la avant de valider une préparation.");
    return;
  }

  const besoins = subCalculerBesoins(poids);
  const idSon = subAjouterMouvementSortie('son_de_ble', besoins.son, date);
  const idFarine = subAjouterMouvementSortie('farine', besoins.farine, date);
  const idLevure = subAjouterMouvementSortie('levure', besoins.levure, date);

  const entree = {
    id: Date.now(),
    date: date, poids: poids, nom: nom,
    son: besoins.son, farine: besoins.farine, levure: besoins.levure,
    mouvementIds: { son_de_ble: idSon, farine: idFarine, levure: idLevure }
  };
  subHistorique.unshift(entree);
  subSauverJSON(SUB_CLES.historique, subHistorique);

  document.getElementById('sub-prep-poids').value = '';
  document.getElementById('sub-apercu').classList.remove('visible');
  document.getElementById('sub-avertissement').classList.remove('visible');

  subRenderStocks();
  subRenderHistorique();
  showToast('✓ Préparation enregistrée — stocks mis à jour');
}

/* Historique */
function subFormatDate(iso){ if(!iso) return '—'; const p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function subRenderHistorique(){
  const corps = document.getElementById('sub-corps-historique');
  if(!corps) return;
  if(!subHistorique.length){
    corps.innerHTML = '<tr><td colspan="5" class="sub-vide">Aucune préparation enregistrée pour l’instant.</td></tr>';
    return;
  }
  corps.innerHTML = subHistorique.map(function(h){
    return '<tr>'+
      '<td>'+subFormatDate(h.date)+'</td>'+
      '<td><b>'+h.poids.toFixed(1)+' kg</b></td>'+
      '<td><span class="sub-ing-tag sub-tag-son">🌾 '+h.son.toFixed(2)+' kg</span>'+
      '<span class="sub-ing-tag sub-tag-farine">🧂 '+h.farine.toFixed(2)+' kg</span>'+
      '<span class="sub-ing-tag sub-tag-levure">🫙 '+h.levure.toFixed(2)+' kg</span></td>'+
      '<td>'+h.nom+'</td>'+
      '<td><button class="sub-btn-suppr" title="Annuler et recréditer les stocks" onclick="subAnnulerEntree('+h.id+')">✕</button></td>'+
      '</tr>';
  }).join('');
}
function subAnnulerEntree(id){
  const entree = subHistorique.find(function(h){ return h.id===id; });
  if(!entree) return;
  if(!confirm('Annuler la préparation du '+subFormatDate(entree.date)+' ('+entree.poids+' kg) et recréditer les stocks ?')) return;
  if(entree.mouvementIds){
    if(entree.mouvementIds.son_de_ble!==undefined) subSupprimerMouvement('son_de_ble', entree.mouvementIds.son_de_ble);
    if(entree.mouvementIds.farine!==undefined) subSupprimerMouvement('farine', entree.mouvementIds.farine);
    if(entree.mouvementIds.levure!==undefined) subSupprimerMouvement('levure', entree.mouvementIds.levure);
  }
  subHistorique = subHistorique.filter(function(h){ return h.id!==id; });
  subSauverJSON(SUB_CLES.historique, subHistorique);
  subRenderStocks();
  subRenderHistorique();
}
function subExporterCSV(){
  const out = [['Date','Poids substrat (kg)','Son de ble (kg)','Farine (kg)','Levure (kg)','Prepare par']];
  subHistorique.forEach(function(h){
    out.push([subFormatDate(h.date), h.poids, h.son, h.farine, h.levure, h.nom]);
  });
  telechargerCSV('historique_substrat.csv', out);
}
function subRemiseAZero(){
  if(!confirm("Effacer tout l'historique des préparations de substrat ? (les stocks réels ne sont pas modifiés, seul l'historique est vidé)")) return;
  subHistorique = [];
  subSauverJSON(SUB_CLES.historique, subHistorique);
  subRenderHistorique();
}

['sub-pct-son','sub-pct-farine','sub-pct-levure'].forEach(function(id){
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', function(){ subMajTotalPct(); subMajApercu(); });
});
document.addEventListener('DOMContentLoaded', function(){
  const pp = document.getElementById('sub-prep-poids');
  if(pp) pp.addEventListener('input', subMajApercu);
});

function initSubstratPage(){
  subRecette = subChargerJSON(SUB_CLES.recette, { son:80, farine:12, levure:8 });
  subHistorique = subChargerJSON(SUB_CLES.historique, []);
  document.getElementById('sub-pct-son').value = subRecette.son;
  document.getElementById('sub-pct-farine').value = subRecette.farine;
  document.getElementById('sub-pct-levure').value = subRecette.levure;
  document.getElementById('sub-prep-date').value = new Date().toISOString().slice(0,10);
  subMajTotalPct();
  subRenderStocks();
  subRenderHistorique();
}
