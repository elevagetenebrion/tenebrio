/* ══ MODULE TRAVAUX SUR LES BACS ══ */
let larTravauxLignes=[];

function larTravauxOuvrir(){
  const p=document.getElementById('larTravauxPanel');
  if(!p) return;
  p.style.display=p.style.display==='none'?'block':'none';
  if(p.style.display==='block'){ larTravauxResetEtapes(); larTravauxRemplirBacs(); }
}
function larTravauxResetEtapes(){
  document.getElementById('larTravauxEtape1').style.display='block';
  document.getElementById('larTravauxEtape2').style.display='none';
  document.getElementById('larTravauxEtape3').style.display='none';
  larTravauxLignes=[];
}
function larTravauxRemplirBacs(){
  const sel=document.getElementById('larTravauxBacSelect'); if(!sel) return;
  sel.innerHTML='';
  larData.forEach(function(r){
    const dernier=r.travaux&&r.travaux.length>0?' — '+r.travaux[r.travaux.length-1].type+' ('+larTravFmtDate(r.travaux[r.travaux.length-1].date)+')':'';
    const lbl=document.createElement('label');
    lbl.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-bottom:1px solid #f0e8d0;';
    lbl.innerHTML='<input type="checkbox" class="larTravBacChk" value="'+r.bac+'" style="width:20px;height:20px;accent-color:#2563a8;flex-shrink:0;"><span style="font-family:monospace;font-size:.85rem;"><strong>Bac n°'+r.bac+'</strong> — '+larTravFmtDate(r.dateEntree)+'<span style="color:#3a7d44;font-size:.75rem;">'+dernier+'</span></span>';
    sel.appendChild(lbl);
  });
}
function larTravauxSelTous(){ document.querySelectorAll('.larTravBacChk').forEach(function(c){c.checked=true;}); }
function larTravauxDeselTous(){ document.querySelectorAll('.larTravBacChk').forEach(function(c){c.checked=false;}); }
function larTravauxEtape2(){
  const bacs=Array.from(document.querySelectorAll('.larTravBacChk:checked')).map(function(c){return c.value;});
  if(!bacs.length){larShowToast('Sélectionnez au moins un bac.');return;}
  document.getElementById('larTravauxBacsChoisis').innerHTML='<strong>Bacs :</strong> '+bacs.map(b=>'Bac n°'+b).join(', ');
  ['larTravChkTamiser','larTravChkSubstrat','larTravChkLegumes','larTravChkEau'].forEach(function(id){const el=document.getElementById(id);if(el)el.checked=false;});
  document.getElementById('larTravauxEtape1').style.display='none';
  document.getElementById('larTravauxEtape2').style.display='block';
}
function larTravauxRetourEtape1(){document.getElementById('larTravauxEtape1').style.display='block';document.getElementById('larTravauxEtape2').style.display='none';}
function larTravauxRetourEtape2(){document.getElementById('larTravauxEtape2').style.display='block';document.getElementById('larTravauxEtape3').style.display='none';}

function larTravauxCreerTableau(){
  const bacs=Array.from(document.querySelectorAll('.larTravBacChk:checked')).map(function(c){return c.value;});
  const labels={tamiser:'🔲 Tamiser + peser',substrat:'🌾 Substrat',legumes:'🥦 Légumes',eau:'💧 Eau'};
  const travs=[];
  if(document.getElementById('larTravChkTamiser').checked) travs.push({type:'tamiser',label:labels.tamiser});
  if(document.getElementById('larTravChkSubstrat').checked) travs.push({type:'substrat',label:labels.substrat});
  if(document.getElementById('larTravChkLegumes').checked) travs.push({type:'legumes',label:labels.legumes});
  if(document.getElementById('larTravChkEau').checked) travs.push({type:'eau',label:labels.eau});
  if(!travs.length){larShowToast('Cochez au moins un travail.');return;}
  larTravauxLignes=[];
  bacs.forEach(function(bac){travs.forEach(function(t){larTravauxLignes.push({bac:bac,type:t.type,label:t.label,poids:null,stade:null,valide:false});});});
  larTravauxRenderTableau();
  document.getElementById('larTravauxEtape2').style.display='none';
  document.getElementById('larTravauxEtape3').style.display='block';
}

function larTravauxRenderTableau(){
  const c=document.getElementById('larTravauxTableauContainer'); if(!c) return;
  const coulBord={tamiser:'#2563a8',substrat:'#9a7818',legumes:'#3a7d44',eau:'#3a7d44'};
  let h='<table style="width:100%;border-collapse:collapse;font-size:.85rem;">';
  h+='<thead><tr style="background:#2563a8;color:#fff;"><th style="padding:10px 12px;text-align:left;">N° Bac</th><th style="padding:10px 12px;">Travail</th><th style="padding:10px 12px;">Stade</th><th style="padding:10px 12px;">Poids (kg)</th><th style="padding:10px 12px;text-align:center;">✓</th><th style="padding:10px 12px;text-align:center;">Suppr.</th></tr></thead><tbody>';
  larTravauxLignes.forEach(function(l,i){
    const bg=l.valide?'#e3f2e5':(i%2===0?'#fff':'#fbf8ef');
    const bl='4px solid '+(coulBord[l.type]||'#2563a8');
    h+='<tr style="background:'+bg+';border-left:'+bl+';cursor:pointer;" onclick="larTravauxToggleValide('+i+')">';
    h+='<td style="padding:10px 12px;font-family:monospace;font-weight:700;color:#2563a8;">Bac n°'+l.bac+'</td>';
    h+='<td style="padding:10px 12px;font-weight:600;">'+l.label+'</td>';
    if(l.type==='tamiser'){
      const stadeOpts=['v00:Vers 00','v0:Vers 0','v20:Vers 20','v12:Vers 12','v10:Vers 10','v08:Vers 08'].map(function(s){const[v,t]=s.split(':');return '<option value="'+v+'"'+(l.stade===v?' selected':'')+'>'+t+'</option>';}).join('');
      h+='<td style="padding:6px;" onclick="event.stopPropagation()"><select onchange="larTravauxSetStade('+i+',this.value)" style="width:110px;padding:5px;border:1.5px solid #2563a8;border-radius:6px;font-size:.82rem;"><option value="">-- Stade --</option>'+stadeOpts+'</select></td>';
    } else {
      h+='<td style="padding:10px 12px;text-align:center;color:#aaa;">—</td>';
    }
    if(l.type!=='eau'){
      h+='<td style="padding:6px;" onclick="event.stopPropagation()"><input type="number" step="0.01" min="0" placeholder="kg" value="'+(l.poids||'')+'" onchange="larTravauxSetPoids('+i+',this.value)" style="width:80px;padding:5px;border:1.5px solid #2563a8;border-radius:6px;font-size:.85rem;"></td>';
    } else {
      h+='<td style="padding:10px 12px;text-align:center;color:#aaa;">—</td>';
    }
    h+='<td style="padding:10px 12px;text-align:center;font-size:1.2rem;">'+(l.valide?'✅':'⬜')+'</td>';
    h+='<td style="padding:10px 12px;text-align:center;" onclick="event.stopPropagation()"><button onclick="larTravauxSupprimerLigne('+i+')" style="background:#b84030;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer;">✕</button></td>';
    h+='</tr>';
  });
  const nbV=larTravauxLignes.filter(function(l){return l.valide;}).length;
  h+='</tbody></table><div style="text-align:right;font-size:.8rem;color:#6b6b6b;margin-top:6px;">'+nbV+' / '+larTravauxLignes.length+' validés</div>';
  c.innerHTML=h;
}

function larTravauxToggleValide(i){if(larTravauxLignes[i])larTravauxLignes[i].valide=!larTravauxLignes[i].valide;larTravauxRenderTableau();}
function larTravauxSetStade(i,v){if(larTravauxLignes[i])larTravauxLignes[i].stade=v;}
function larTravauxSetPoids(i,v){if(larTravauxLignes[i])larTravauxLignes[i].poids=parseFloat(v)||null;}
function larTravauxSupprimerLigne(i){larTravauxLignes.splice(i,1);if(!larTravauxLignes.length){larTravauxResetEtapes();return;}larTravauxRenderTableau();}

function larTravauxValiderTout(){
  const sansStade=larTravauxLignes.filter(function(l){return l.type==='tamiser'&&!l.stade;});
  if(sansStade.length){larShowToast('Choisissez le stade pour : '+sansStade.map(l=>'Bac n°'+l.bac).join(', '));return;}
  const nonValides=larTravauxLignes.filter(function(l){return !l.valide;});
  if(nonValides.length){if(!confirm(nonValides.length+' bac(s) non validés. Enregistrer quand même ?'))return;}
  if(!confirm('Confirmer l\'enregistrement de tous les travaux ?'))return;
  const today=larSimS();
  const labH={tamiser:'Tamiser+peser',substrat:'Substrat',legumes:'Légumes',eau:'Eau'};
  larTravauxLignes.forEach(function(l){
    const row=larData.find(function(r){return String(r.bac)===String(l.bac);});
    if(!row)return;
    if(!row.travaux)row.travaux=[];
    row.travaux.push({date:today,type:labH[l.type]||l.type,stade:l.stade||null,poids:l.poids||null});
    if(l.type==='tamiser'&&l.stade&&l.poids) row[l.stade]=l.poids;
    row.dateDernierTravail=today;
  });
  larSave(); larRender();
  document.getElementById('larTravauxPanel').style.display='none';
  larTravauxLignes=[];
  larShowToast('✅ Travaux enregistrés !');
}

function larSupprimerTravail(rowIdx,travIdx){
  if(!confirm('Supprimer cette opération ?'))return;
  const row=larData[rowIdx]; if(!row||!row.travaux)return;
  row.travaux.splice(travIdx,1);
  larSave(); larRender();
  larShowToast('Opération supprimée.');
}

function larTravFmtDate(iso){
  if(!iso)return '—';
  const p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
}

