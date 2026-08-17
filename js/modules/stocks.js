/* ══ STOCKS — module consolidé (Son de blé / Levure / Farine-Poids cassé / Légumes) ══ */
const STK_TYPES = {
  son_de_ble: { label:"Son de blé",           seuil:20 },
  levure:     { label:"Levure",               seuil:5  },
  farine:     { label:"Farine / Poids cassé", seuil:5  },
  legumes:    { label:"Légumes",              seuil:5  }
};
let stkCurrent = 'son_de_ble';

function stkKey(type){ return 'stock_v2_' + type; }

function stkLoad(type){
  try { return JSON.parse(localStorage.getItem(stkKey(type))) || []; } catch(e){ return []; }
}
function stkSave(type, rows){
  localStorage.setItem(stkKey(type), JSON.stringify(rows));
  fbSafeSave(stkKey(type), rows);
}
async function stkSyncFromCloud(){
  for (const type in STK_TYPES){
    const cloudData = await fbSafeLoad(stkKey(type), null);
    if (cloudData !== null) localStorage.setItem(stkKey(type), JSON.stringify(cloudData));
  }
}

function stkSetType(type){
  stkCurrent = type;
  stkRender();
}

function stkAddRow(kind){
  const dateEl = document.getElementById('stkInDate');
  const date = dateEl.value;
  const qte = parseFloat(document.getElementById('stkInQte').value);
  if(!date || isNaN(qte) || qte<=0){ alert('Merci de renseigner une date et une quantité valide.'); return; }
  const frs = document.getElementById('stkInFrs').value;
  const fac = document.getElementById('stkInFac').value;
  const prix = kind==='entree' ? (parseFloat(document.getElementById('stkInPrix').value)||0) : 0;
  const rows = stkLoad(stkCurrent);
  rows.push({ id: Date.now()+Math.random(), type: kind, date: date, frs: kind==='entree'?frs:'', fac: kind==='entree'?fac:'', qte: qte, prix: prix });
  rows.sort(function(a,b){ return a.date.localeCompare(b.date); });
  stkSave(stkCurrent, rows);
  document.getElementById('stkInFrs').value='';
  document.getElementById('stkInFac').value='';
  document.getElementById('stkInQte').value='';
  document.getElementById('stkInPrix').value='';
  stkRender();
}

function stkDeleteRow(id){
  let rows = stkLoad(stkCurrent);
  rows = rows.filter(function(r){ return r.id!==id; });
  stkSave(stkCurrent, rows);
  stkRender();
}

function stkMiseAZero(){
  if(!confirm('⚠️ Ceci va supprimer toutes les lignes du stock "'+STK_TYPES[stkCurrent].label+'". Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : vider ce tableau ?')) return;
  stkSave(stkCurrent, []);
  stkRender();
}

function stkFormatDate(iso){
  if(!iso) return '—';
  const p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
}

function stkRender(){
  const rows = stkLoad(stkCurrent);
  const tbody = document.getElementById('stkTbody');
  if(!tbody) return;
  tbody.innerHTML='';
  const sel = document.getElementById('stkSelect');
  if(sel) sel.value = stkCurrent;

  if(rows.length===0){
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#777;">Aucune donnée pour ce stock</td></tr>';
    const abEmpty = document.getElementById('stk-alertBox');
    if(abEmpty) abEmpty.style.display='none';
    stkRenderCmup(rows);
    return;
  }

  /* File PEPS (premier entré, premier sorti) pour repérer les lots épuisés */
  const batches=[]; const epuiseIds=new Set();
  rows.forEach(function(r){
    if(r.type==='entree'){ batches.push({id:r.id, remaining:r.qte}); }
    else{
      let toConsume=r.qte;
      for(const b of batches){
        if(toConsume<=0) break;
        if(b.remaining<=0) continue;
        const take=Math.min(b.remaining, toConsume);
        b.remaining-=take; toConsume-=take;
        if(b.remaining<=0.0001) epuiseIds.add(b.id);
      }
    }
  });

  let runE=0, runS=0;
  rows.forEach(function(r){
    if(r.type==='entree') runE+=r.qte; else runS+=r.qte;
    const diff = runE-runS;
    const tr=document.createElement('tr');
    if(r.type==='entree' && epuiseIds.has(r.id)) tr.style.opacity='0.5';
    tr.innerHTML =
      '<td>'+stkFormatDate(r.date)+'</td>'+
      '<td>'+(r.type==='entree'?(r.frs||'—'):'')+'</td>'+
      '<td>'+(r.type==='entree'?(r.fac||'—'):'')+'</td>'+
      '<td style="color:#2a5a1a;font-weight:700;">'+(r.type==='entree'?r.qte.toFixed(2):'')+'</td>'+
      '<td>'+runE.toFixed(2)+'</td>'+
      '<td style="color:#c0392b;font-weight:700;">'+(r.type==='sortie'?r.qte.toFixed(2):'')+'</td>'+
      '<td>'+runS.toFixed(2)+'</td>'+
      '<td style="font-weight:800;'+(diff<=STK_TYPES[stkCurrent].seuil?'color:#c0392b;':'')+'">'+diff.toFixed(2)+'</td>'+
      '<td><button class="btn-del" onclick="stkDeleteRow('+JSON.stringify(r.id)+')">✕</button></td>';
    tbody.appendChild(tr);
  });

  const ab = document.getElementById('stk-alertBox');
  const seuil = STK_TYPES[stkCurrent].seuil;
  const stockFinal = runE-runS;
  if(ab){
    if(stockFinal<=seuil){
      ab.textContent = '⚠ STOCK BAS — '+STK_TYPES[stkCurrent].label+' : '+stockFinal.toFixed(2)+' kg restants (seuil : '+seuil+' kg) !';
      ab.style.display='block';
    } else { ab.style.display='none'; }
  }

  stkRenderCmup(rows);
}

function stkRenderCmup(rows){
  const tbody=document.getElementById('stkTbodyCmup');
  if(!tbody) return;
  tbody.innerHTML='';
  if(rows.length===0){
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:#777;">Aucune donnée</td></tr>';
    return;
  }
  let poidsTotal=0, prixTotal=0;
  rows.forEach(function(r){
    const tr=document.createElement('tr');
    if(r.type==='entree'){
      poidsTotal+=r.qte; prixTotal+=(r.prix||0);
      const prixKg = poidsTotal>0 ? prixTotal/poidsTotal : 0;
      tr.innerHTML='<td>'+stkFormatDate(r.date)+'</td><td style="color:#2a5a1a;">'+r.qte.toFixed(2)+'</td><td>'+poidsTotal.toFixed(2)+'</td><td>'+prixKg.toFixed(3)+' €</td><td>'+prixTotal.toFixed(2)+' €</td><td></td><td></td><td></td>';
    } else {
      const prixMoyen = poidsTotal>0 ? prixTotal/poidsTotal : 0;
      const prixSortie = r.qte*prixMoyen;
      tr.innerHTML='<td></td><td></td><td></td><td></td><td>'+stkFormatDate(r.date)+'</td><td style="color:#c0392b;">'+r.qte.toFixed(2)+'</td><td>'+prixMoyen.toFixed(3)+' €</td><td>'+prixSortie.toFixed(2)+' €</td>';
    }
    tbody.appendChild(tr);
  });
}

/* ══ Pavé numérique tactile (Quantité / Prix) ══ */
let stkNumpadCible=null;
function stkOuvrirNumpad(id, titre){
  stkNumpadCible = id;
  document.getElementById('stkNumpadTitle').textContent = titre;
  const current = document.getElementById(id).value;
  document.getElementById('stkNumpadDisplay').textContent = current ? String(current) : '_';
  document.getElementById('stkNumpadOverlay').classList.add('open');
}
function stkNumpadTap(c){
  const d=document.getElementById('stkNumpadDisplay');
  if(c==='.'){
    if(d.textContent==='_'){ d.textContent='0.'; return; }
    if(d.textContent.indexOf('.')!==-1) return;
    d.textContent += '.';
    return;
  }
  d.textContent = (d.textContent==='_') ? c : d.textContent+c;
}
function stkNumpadDel(){
  const d=document.getElementById('stkNumpadDisplay');
  d.textContent = d.textContent.length<=1 ? '_' : d.textContent.slice(0,-1);
}
function stkNumpadCancel(){
  document.getElementById('stkNumpadOverlay').classList.remove('open');
  stkNumpadCible=null;
}
function stkNumpadOk(){
  const v = document.getElementById('stkNumpadDisplay').textContent;
  document.getElementById('stkNumpadOverlay').classList.remove('open');
  if(v==='_' || stkNumpadCible===null){ stkNumpadCible=null; return; }
  const n = parseFloat(v);
  if(isNaN(n) || n<0){ alert('Valeur invalide.'); stkNumpadCible=null; return; }
  document.getElementById(stkNumpadCible).value = n;
  stkNumpadCible=null;
}

function stkExportCSV(){
  const rows = stkLoad(stkCurrent);
  const out = [['Date','Fournisseur','N° Facture','Qté entrée (kg)','Total entrées','Qté sortie (kg)','Total sorties','Stock dispo']];
  let runE=0, runS=0;
  rows.forEach(function(r){
    if(r.type==='entree') runE+=r.qte; else runS+=r.qte;
    out.push([stkFormatDate(r.date), r.type==='entree'?(r.frs||''):'', r.type==='entree'?(r.fac||''):'', r.type==='entree'?r.qte.toFixed(2):'', runE.toFixed(2), r.type==='sortie'?r.qte.toFixed(2):'', runS.toFixed(2), (runE-runS).toFixed(2)]);
  });
  telechargerCSV('stock_'+stkCurrent+'.csv', out);
}
