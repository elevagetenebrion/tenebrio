/* ══ COLÉOPTÈRES ══ */
const COL_CLE = 'col_v21';
let colLots = [];

function colSauver(){
  localStorage.setItem(COL_CLE, JSON.stringify(colLots));
  fbSafeSave(COL_CLE, colLots);
}
async function colSyncFromCloud(){
    const cloudData = await fbSafeLoad(COL_CLE, null);
  if (cloudData !== null) { colLots = cloudData; localStorage.setItem(COL_CLE, JSON.stringify(cloudData)); }
}
function colDateStr(d){ return d.toISOString().slice(0,10); }
function colAddJours(str,n){ const d=new Date(str+'T12:00:00'); d.setDate(d.getDate()+n); return colDateStr(d); }
function colAffDate(str){ if(!str) return '-'; const [y,m,j]=str.split('-'); return j+'/'+m+'/'+y; }
function colAujourdHui(){ return colDateStr(new Date()); }
function colDateSecouage(lot,c){ return colAddJours(lot.dateEntree,(c-1)*10+5); }
function colDateChgBac(lot,c){ return colAddJours(lot.dateEntree,c*10); }
function colDateDeshy(lot){ return colAddJours(lot.dateEntree,45); }

function colBacsUtilises(){
  const u=new Set();
  colLots.forEach(lot=>{
    if(lot.c1?.bac) u.add(+lot.c1.bac);
    if(lot.c2?.bac) u.add(+lot.c2.bac);
    if(lot.c3?.bac) u.add(+lot.c3.bac);
    if(lot.c4?.bac) u.add(+lot.c4.bac);
  });
  return u;
}
function colGrillesUtilisees(){ return new Set(colLots.map(l=>l.grille).filter(Boolean)); }
function colLettresDisponibles(){
  const utilisees=colGrillesUtilisees(); const toutes=[];
  for(let i=65;i<=90;i++){const s=String.fromCharCode(i);if(!utilisees.has(s))toutes.push(s);}
  for(let i=65;i<=90;i++){const s=String.fromCharCode(i)+String.fromCharCode(i);if(!utilisees.has(s))toutes.push(s);}
  return toutes;
}

/* Pavé numérique */
let colNumpadCible=null, colNumpadMin=0, colNumpadMax=99999;
function colOuvrirNumpad(id,titre,min,max){
  colNumpadCible=id; colNumpadMin=min||0; colNumpadMax=max||99999;
  document.getElementById('colNumpadTitle').textContent=titre;
  document.getElementById('colNumpadDisplay').textContent='_';
  document.getElementById('colNumpadOverlay').classList.add('open');
}
function colNumpadTap(c){ const d=document.getElementById('colNumpadDisplay'); d.textContent=d.textContent==='_'?c:d.textContent+c; }
function colNumpadDel(){ const d=document.getElementById('colNumpadDisplay'); d.textContent=d.textContent.length<=1?'_':d.textContent.slice(0,-1); }
function colNumpadOk(){
  const v=document.getElementById('colNumpadDisplay').textContent;
  if(v==='_'){document.getElementById('colNumpadOverlay').classList.remove('open');return;}
  const n=parseInt(v,10);
  if(isNaN(n)||n<colNumpadMin||n>colNumpadMax){alert('Valeur invalide.');return;}
  document.getElementById(colNumpadCible).value=n;
  document.getElementById('colNumpadOverlay').classList.remove('open');
}

/* Formulaire */
function colPeuplerGrille(){
  const sel=document.getElementById('colFGrille'); if(!sel)return;
  sel.innerHTML='';
  colLettresDisponibles().forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l;sel.appendChild(o);});
  if(!sel.options.length){const o=document.createElement('option');o.value='';o.textContent='Aucune disponible';sel.appendChild(o);}
}
function colPeuplerBacs(){
  const sel=document.getElementById('colFBac'); if(!sel)return;
  const current=sel.value; sel.innerHTML='<option value="">-- Choisir --</option>';
  const utilises=colBacsUtilises();
  for(let i=1;i<=BAC_MAX;i++){if(!utilises.has(i)){const o=document.createElement('option');o.value=i;o.textContent=i;sel.appendChild(o);}}
  if(current) sel.value=current;
}
function colEnregistrer(){
  const dateE=document.getElementById('colFDateEntree').value;
  const grille=document.getElementById('colFGrille').value;
  const bac=document.getElementById('colFBac').value;
  const poids=document.getElementById('colFPoids').value;
  if(!dateE){alert("Veuillez renseigner la date d'entrée.");return;}
  if(!grille){alert('Veuillez choisir une lettre de grille.');return;}
  if(!bac){alert('Veuillez choisir un numéro de bac.');return;}
  if(!poids){alert('Veuillez renseigner le poids.');return;}
  colLots.push({id:Date.now(),dateEntree:dateE,grille,poids,c1:{bac:+bac,done_sec:false,done_chg:false},c2:null,c3:null,c4:null});
  colSauver();
  document.getElementById('colFDateEntree').value='';
  document.getElementById('colFPoids').value='';
  colPeuplerGrille(); colPeuplerBacs(); colRafraichir();
}

/* Alertes */
function colRafraichirAlertes(){
  const auj=colAujourdHui(); const zone=document.getElementById('colAlertesZone'); if(!zone)return;
  const secouages=[],chgts=[],oeufs=[],deshys=[];
  colLots.forEach(lot=>{
    const d1s=colDateSecouage(lot,1),d1c=colDateChgBac(lot,1);
    if(!lot.c1?.done_sec&&d1s<=auj) secouages.push({label:'Grille '+lot.grille+' / Bac '+lot.c1.bac,date:d1s,lot,cycle:1,type:'sec'});
    if(lot.c1?.done_sec&&!lot.c1?.done_chg&&d1c<=auj) chgts.push({label:'Grille '+lot.grille+' / Bac '+lot.c1.bac,date:d1c,lot,cycle:1,type:'chg'});
    if(lot.c2){
      const d2s=colDateSecouage(lot,2),d2c=colDateChgBac(lot,2);
      if(!lot.c2.done_sec&&d2s<=auj) secouages.push({label:'Grille '+lot.grille+' / Bac '+lot.c2.bac,date:d2s,lot,cycle:2,type:'sec'});
      if(lot.c2.done_sec&&!lot.c2.done_chg&&d2c<=auj) chgts.push({label:'Grille '+lot.grille+' / Bac '+lot.c2.bac,date:d2c,lot,cycle:2,type:'chg'});
    }
    if(lot.c3){
      const d3s=colDateSecouage(lot,3),d3c=colDateChgBac(lot,3);
      if(!lot.c3.done_sec&&d3s<=auj) secouages.push({label:'Grille '+lot.grille+' / Bac '+lot.c3.bac,date:d3s,lot,cycle:3,type:'sec'});
      if(lot.c3.done_sec&&!lot.c3.done_chg&&d3c<=auj) chgts.push({label:'Grille '+lot.grille+' / Bac '+lot.c3.bac,date:d3c,lot,cycle:3,type:'chg'});
    }
    if(lot.c4){
      const d4s=colDateSecouage(lot,4),d4d=colDateDeshy(lot);
      if(!lot.c4.done_sec&&d4s<=auj) secouages.push({label:'Grille '+lot.grille,date:d4s,lot,cycle:4,type:'sec'});
      if(lot.c4.done_sec&&!lot.c4.done_deshy&&d4d<=auj) deshys.push({label:'Grille '+lot.grille,date:d4d,lot,cycle:4,type:'deshy'});
    }
    [1,2,3].forEach(c=>{
      const cyc=lot['c'+c];
      if(cyc?.done_chg&&!cyc?.oeufsConfirmes) oeufs.push({label:'Grille '+lot.grille+' / Bac '+cyc.bac,date:colDateChgBac(lot,c),lot,cycle:c,type:'oeufs'});
    });
  });
  const tri=(a,b)=>a.date.localeCompare(b.date);
  secouages.sort(tri);chgts.sort(tri);oeufs.sort(tri);deshys.sort(tri);
  zone.innerHTML='';
  function bloc(titre,items,cls,acls){
    if(!items.length)return;
    const d=document.createElement('div');
    d.className='alerte-bloc '+cls;
    d.innerHTML='<h3>'+titre+'</h3><div class="alerte-items"></div>';
    zone.appendChild(d);
    const c=d.querySelector('.alerte-items');
    items.forEach(it=>{
      const i=document.createElement('div');
      i.className='alerte-item '+acls;
      var btn=document.createElement("button");btn.textContent="Confirmer";btn.dataset.id=it.lot.id;btn.dataset.cycle=it.cycle;btn.dataset.type=it.type;btn.className="col-alerte-btn";i.innerHTML=colAffDate(it.date)+' – '+it.label+'&nbsp;';i.appendChild(btn);
      c.appendChild(i);
    });
  }
  bloc('Secouages à effectuer',secouages,'alerte-secouage','a-sec');
  bloc('Changements de bac',chgts,'alerte-chgt','a-chgt');
  bloc('Bacs en pontes (œufs)',oeufs,'alerte-oeufs','a-oeufs');
  bloc('Déshydratation',deshys,'alerte-deshy','a-deshy');
}

function colConfirmerAlerte(id,cycle,type){
  const lot=colLots.find(l=>l.id==id); if(!lot)return;
  const cyc=lot['c'+cycle];
  if(type==='sec'){
    if(cyc)cyc.done_sec=true;
    if(cycle<4&&!lot['c'+(cycle+1)]) lot['c'+(cycle+1)]={bac:null,done_sec:false,done_chg:false};
  } else if(type==='chg'){
    if(cyc)cyc.done_chg=true;
    colSauver();
    if(cycle<4){colOuvrirModalChg(lot,cycle+1);return;}
  } else if(type==='oeufs'){
    if(cyc)cyc.oeufsConfirmes=true;
  } else if(type==='deshy'){
    if(lot.c4)lot.c4.done_deshy=true;
  }
  colSauver(); colRafraichir();
}

let colModalChgLot=null,colModalChgCycle=null;
function colOuvrirModalChg(lot,prochainCycle){
  colModalChgLot=lot;colModalChgCycle=prochainCycle;
  document.getElementById('colModalChgTxt').textContent='Changement vers Cycle '+prochainCycle+' – Grille '+lot.grille;
  document.getElementById('colModalChgDate').value=colAujourdHui();
  const sel=document.getElementById('colModalChgBacSel');
  sel.innerHTML='<option value="">-- Choisir --</option>';
  const utilises=colBacsUtilises();
  for(let i=1;i<=BAC_MAX;i++){if(!utilises.has(i)){const o=document.createElement('option');o.value=i;o.textContent=i;sel.appendChild(o);}}
  document.getElementById('colBtnConfirmChg').onclick=colConfirmerModalChg;
  document.getElementById('colModalChgBac').classList.add('open');
}
function colFermerModalChg(){ document.getElementById('colModalChgBac').classList.remove('open'); colModalChgLot=null;colModalChgCycle=null; }
function colConfirmerModalChg(){
  const date=document.getElementById('colModalChgDate').value;
  const bac=document.getElementById('colModalChgBacSel').value;
  if(!date){alert('Veuillez renseigner la date.');return;}
  if(!bac){alert('Veuillez choisir un numéro de bac.');return;}
  const n=parseInt(bac,10);
  const u=colBacsUtilises();
  if(u.has(n)){alert('Bac '+n+' déjà utilisé.');return;}
  if(colModalChgCycle===4){
    colModalChgLot.c4={bac:n,done_sec:false,done_deshy:false,dateDebut:date};
  } else {
    if(!colModalChgLot['c'+colModalChgCycle]) colModalChgLot['c'+colModalChgCycle]={bac:null,done_sec:false,done_chg:false};
    colModalChgLot['c'+colModalChgCycle].bac=n;
    colModalChgLot['c'+colModalChgCycle].dateDebut=date;
  }
  colSauver();colPeuplerBacs();colFermerModalChg();colRafraichir();
}

/* Tableau */
function colRafraichirTableau(){
  const tbody=document.getElementById('colMainTbody'); if(!tbody)return;
  if(!colLots.length){tbody.innerHTML='<tr><td colspan="20" class="col-empty-state">Aucun lot enregistré</td></tr>';return;}
  const auj=colAujourdHui();
  const sorted=[...colLots].sort((a,b)=>a.dateEntree.localeCompare(b.dateEntree));
  tbody.innerHTML='';
  sorted.forEach(lot=>{
    const tr=document.createElement('tr');
    function ac(date,done){ if(done)return 'col-ok-cell'; if(!date)return ''; if(date<=auj)return 'col-att-cell'; return ''; }
    let h='<td class="col-date-cell">'+colAffDate(lot.dateEntree)+'</td>';
    const d1s=colDateSecouage(lot,1),d1c=colDateChgBac(lot,1);
    h+='<td>'+lot.grille+'</td>';
    h+='<td class="col-poids-cell">'+(lot.c1?.bac||'-')+'</td>';
    h+='<td class="col-poids-cell">'+lot.poids+' g</td>';
    h+='<td class="'+ac(d1s,lot.c1?.done_sec)+'">'+colAffDate(d1s)+'</td>';
    h+=lot.c1?.done_chg?'<td class="col-oeufs-cell">Œufs<br>'+colAffDate(d1c)+'</td>':'<td class="'+ac(d1c,false)+'">'+colAffDate(d1c)+'</td>';
    h+='<td><button class="col-btn-supp" onclick="colOuvrirModalSupp('+lot.id+',1)">✕</button></td>';
    if(lot.c2){
      const d2s=colDateSecouage(lot,2),d2c=colDateChgBac(lot,2);
      h+='<td class="col-poids-cell">'+(lot.c2.bac||'?')+'</td>';
      h+='<td class="'+ac(d2s,lot.c2.done_sec)+'">'+colAffDate(d2s)+'</td>';
      h+=lot.c2.done_chg?'<td class="col-oeufs-cell">Œufs<br>'+colAffDate(d2c)+'</td>':'<td class="'+ac(d2c,false)+'">'+colAffDate(d2c)+'</td>';
      h+='<td><button class="col-btn-supp" onclick="colOuvrirModalSupp('+lot.id+',2)">✕</button></td>';
    }else{h+='<td colspan="4" style="color:#d1d5db;font-size:.7rem;">—</td>';}
    if(lot.c3){
      const d3s=colDateSecouage(lot,3),d3c=colDateChgBac(lot,3);
      h+='<td class="col-poids-cell">'+(lot.c3.bac||'?')+'</td>';
      h+='<td class="'+ac(d3s,lot.c3.done_sec)+'">'+colAffDate(d3s)+'</td>';
      h+=lot.c3.done_chg?'<td class="col-oeufs-cell">Œufs<br>'+colAffDate(d3c)+'</td>':'<td class="'+ac(d3c,false)+'">'+colAffDate(d3c)+'</td>';
      h+='<td><button class="col-btn-supp" onclick="colOuvrirModalSupp('+lot.id+',3)">✕</button></td>';
    }else{h+='<td colspan="4" style="color:#d1d5db;font-size:.7rem;">—</td>';}
    if(lot.c4){
      const d4s=colDateSecouage(lot,4),d4d=colDateDeshy(lot);
      h+='<td class="col-poids-cell">'+(lot.c4.bac||'?')+'</td>';
      h+='<td class="'+ac(d4s,lot.c4.done_sec)+'">'+colAffDate(d4s)+'</td>';
      h+='<td class="'+ac(d4d,lot.c4.done_deshy)+'">'+colAffDate(d4d)+'</td>';
      h+='<td class="col-deshy-cell">'+(lot.c4.done_deshy?'✔ Déshy.':'En attente')+'</td>';
      h+='<td><button class="col-btn-supp" onclick="colOuvrirModalSupp('+lot.id+',4)">✕</button></td>';
    }else{h+='<td colspan="5" style="color:#d1d5db;font-size:.7rem;">—</td>';}
    tr.innerHTML=h; tbody.appendChild(tr);
  });
}

let colModalSuppLotId=null,colModalSuppCycle=null;
function colOuvrirModalSupp(id,cycle){
  colModalSuppLotId=id;colModalSuppCycle=cycle;
  const lot=colLots.find(l=>l.id==id);
  document.getElementById('colModalSuppTxt').textContent='Grille '+lot.grille+' — Cycle '+cycle+' va être effacé.';
  document.getElementById('colBtnConfirmSupp').onclick=colConfirmerSupp;
  document.getElementById('colModalSupp').classList.add('open');
}
function colFermerModalSupp(){ document.getElementById('colModalSupp').classList.remove('open'); }
function colConfirmerSupp(){
  const lot=colLots.find(l=>l.id==colModalSuppLotId); if(!lot){colFermerModalSupp();return;}
  // Effacer le cycle ciblé et tous les cycles suivants (un cycle 3 effacé implique l'effacement du 4)
  for(let c=colModalSuppCycle; c<=4; c++){
    lot['c'+c]=null;
  }
  colSauver();colPeuplerGrille();colPeuplerBacs();colFermerModalSupp();colRafraichir();
  const t=document.getElementById('toast');
  if(t){ t.textContent='Cycle '+colModalSuppCycle+' effacé.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
}

function colRafraichir(){ colRafraichirAlertes(); colRafraichirTableau(); }

function initColPage(){
  colLots = JSON.parse(localStorage.getItem(COL_CLE)||'[]');
  const d=document.getElementById('colFDateEntree');
  if(d) d.value=colDateStr(new Date());
  colPeuplerGrille(); colPeuplerBacs(); colRafraichir();

  if(!window._colEffacerAttache){
    window._colEffacerAttache = true;
    const btn=document.getElementById('colBtnEffacer');
    if(btn) btn.addEventListener('click', colOuvrirModalEffacer);
    const btnZero=document.getElementById('colBtnMiseAZero');
    if(btnZero) btnZero.addEventListener('click', colViderToutLeTableau);
    const selLot=document.getElementById('colEffLot');
    if(selLot) selLot.addEventListener('change', colMettreAJourOptionsEffacer);
    const selCycle=document.getElementById('colEffCycle');
    if(selCycle) selCycle.addEventListener('change', colMettreAJourOptionsEffacer);
    const selType=document.getElementById('colEffType');
    if(selType) selType.addEventListener('change', colMettreAJourValeurEffacer);
    const btnConfirm=document.getElementById('colBtnConfirmEffacer');
    if(btnConfirm) btnConfirm.addEventListener('click', colConfirmerEffacer);
  }
}


/* Listener alertes coléoptères */
document.addEventListener('click', function(e){
  if(e.target.classList.contains('col-alerte-btn')){
    colConfirmerAlerte(e.target.dataset.id, parseInt(e.target.dataset.cycle), e.target.dataset.type);
  }
});

