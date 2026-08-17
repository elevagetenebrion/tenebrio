/* ══ ENVIRONNEMENT ══ */
const ENV_KEY = 'env_elevage_v2';
let envState = { temp: '', hygro: '', tempTime: null, hygroTime: null };
let envDb = {};
window.envChartDay = null;
window.envChartMonth = null;
let envClockTimer = null;

function envLoadDB() {
  try { return JSON.parse(localStorage.getItem(ENV_KEY)) || {}; } catch { return {}; }
}
function envSaveDB() {
  localStorage.setItem(ENV_KEY, JSON.stringify(envDb));
  fbSafeSave(ENV_KEY, envDb);
}
async function envSyncFromCloud() {
    const cloudData = await fbSafeLoad(ENV_KEY, null);
  if (cloudData !== null) { envDb = cloudData; localStorage.setItem(ENV_KEY, JSON.stringify(cloudData)); }
}
function envTodayKey() { return new Date().toISOString().slice(0,10); }
function envMonthKey() { return new Date().toISOString().slice(0,7); }
const envMean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;

function envTickClock() {
  const d = document.getElementById('dateDisplay');
  const t = document.getElementById('timeDisplay');
  if (!d || !t) return;
  const now = new Date();
  d.textContent = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  t.textContent = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function kp(field, char) {
  if (char==='.' && envState[field].includes('.')) return;
  if (!envState[field]) envState[field] = '';
  if (envState[field].length >= 5) return;
  envState[field] += char;
  if (!envState[field+'Time']) envState[field+'Time'] = new Date();
  envUpdateDisplay(field);
}

function clearField(field) {
  envState[field] = '';
  envState[field+'Time'] = null;
  envUpdateDisplay(field);
  const s = document.getElementById(field==='temp'?'tempStatus':'hygroStatus');
  const t = document.getElementById(field==='temp'?'tempTime':'hygroTime');
  if(s) s.innerHTML='';
  if(t) t.textContent='';
}

/* ══ Saisie vocale (Température / Hygrométrie) ══ */
let envRecognition=null, envVoiceField=null;
function envVoiceStart(field){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('🎤 Reconnaissance vocale non disponible sur ce navigateur.'); return; }
  if(envRecognition){ try{ envRecognition.onend=null; envRecognition.stop(); }catch(e){} }
  envVoiceField = field;
  const btn = document.getElementById(field==='temp'?'tempMicBtn':'hygroMicBtn');
  envRecognition = new SR();
  envRecognition.lang = 'fr-FR';
  envRecognition.interimResults = false;
  envRecognition.maxAlternatives = 1;
  envRecognition.onstart = function(){ if(btn) btn.classList.add('listening'); };
  envRecognition.onresult = function(e){
    const transcript = e.results[0][0].transcript;
    const val = envParseNombreVocal(transcript);
    if(val!==null && !isNaN(val)){
      envSetVoice(field, val);
      showToast('🎤 '+(field==='temp'?'Température':'Hygrométrie')+' : '+val+'  («'+transcript+'»)');
    } else {
      showToast('🎤 Valeur non comprise : «'+transcript+'» — réessayez');
    }
  };
  envRecognition.onerror = function(e){
    if(e.error!=='no-speech') showToast('🎤 Erreur micro : '+e.error);
  };
  envRecognition.onend = function(){ if(btn) btn.classList.remove('listening'); };
  try{ envRecognition.start(); }catch(e){}
}
function envSetVoice(field, val){
  envState[field] = String(val);
  if(!envState[field+'Time']) envState[field+'Time'] = new Date();
  envUpdateDisplay(field);
}
function envVoiceStartText(textareaId, btnId){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('🎤 Reconnaissance vocale non disponible sur ce navigateur.'); return; }
  if(envRecognition){ try{ envRecognition.onend=null; envRecognition.stop(); }catch(e){} }
  const btn = document.getElementById(btnId);
  const ta = document.getElementById(textareaId);
  envRecognition = new SR();
  envRecognition.lang = 'fr-FR';
  envRecognition.interimResults = false;
  envRecognition.maxAlternatives = 1;
  envRecognition.onstart = function(){ if(btn) btn.classList.add('listening'); };
  envRecognition.onresult = function(e){
    const transcript = e.results[0][0].transcript;
    if(ta){
      const sep = (ta.value && !/[\s\n]$/.test(ta.value)) ? ' ' : '';
      ta.value = ta.value + sep + transcript;
    }
    showToast('🎤 Texte ajouté : «'+transcript+'»');
  };
  envRecognition.onerror = function(e){
    if(e.error!=='no-speech') showToast('🎤 Erreur micro : '+e.error);
  };
  envRecognition.onend = function(){ if(btn) btn.classList.remove('listening'); };
  try{ envRecognition.start(); }catch(e){}
}
function envParseNombreVocal(text){
  let t = String(text).toLowerCase().trim().replace(',', '.');
  const mDigit = t.match(/-?\d+(?:\.\d+)?/);
  if(mDigit) return parseFloat(mDigit[0]);
  t = t.replace(/-/g,' ');
  const parts = t.split(/\bvirgule\b|\bpoint\b/);
  const intPart = envMotsVersNombre(parts[0].trim());
  if(intPart===null) return null;
  if(parts.length>1 && parts[1].trim()){
    const decPart = envMotsVersNombre(parts[1].trim());
    if(decPart!==null) return parseFloat(intPart+'.'+decPart);
  }
  return intPart;
}
function envMotsVersNombre(str){
  if(!str) return null;
  const UNITS={'zero':0,'zéro':0,'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,'six':6,'sept':7,'huit':8,'neuf':9,'dix':10,'onze':11,'douze':12,'treize':13,'quatorze':14,'quinze':15,'seize':16};
  const TENS={'vingt':20,'trente':30,'quarante':40,'cinquante':50,'soixante':60};
  const words = str.split(/\s+/).filter(function(w){return w && w!=='et';});
  if(!words.length) return null;
  const full = words.join(' ');
  let total=0, i=0;
  if(full.indexOf('quatre vingt dix')===0){ total=90; i=3; }
  else if(full.indexOf('quatre vingt')===0){ total=80; i=2; }
  else if(full.indexOf('soixante dix')===0){ total=70; i=2; }
  else if(TENS.hasOwnProperty(words[0])){ total=TENS[words[0]]; i=1; }
  else if(UNITS.hasOwnProperty(words[0])){ total=UNITS[words[0]]; i=1; }
  else return null;
  if(i<words.length && UNITS.hasOwnProperty(words[i])){ total+=UNITS[words[i]]; }
  return total;
}

function envUpdateDisplay(field) {
  const val = envState[field];
  const displayEl = document.getElementById(field==='temp'?'tempDisplay':'hygroDisplay');
  const timeEl    = document.getElementById(field==='temp'?'tempTime':'hygroTime');
  const statusEl  = document.getElementById(field==='temp'?'tempStatus':'hygroStatus');
  if(displayEl) displayEl.textContent = val || '—';
  const t = envState[field+'Time'];
  if (t && timeEl) timeEl.innerHTML = `⏱ Saisie à ${t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
  const num = parseFloat(val);
  if (!isNaN(num) && statusEl) {
    let badge = '';
    if (field==='temp') {
      if (num>=25&&num<=28) badge='<span class="status-badge status-ok">✓ Idéal</span>';
      else if (num>28) badge='<span class="status-badge status-warn">↑ Trop chaud</span>';
      else badge='<span class="status-badge status-warn">↓ Trop froid</span>';
    } else {
      if (num>=55&&num<=60) badge='<span class="status-badge status-ok">✓ Idéal</span>';
      else if (num>60) badge='<span class="status-badge status-warn">↑ Trop humide</span>';
      else badge='<span class="status-badge status-warn">↓ Trop sec</span>';
    }
    statusEl.innerHTML = badge;
  }
  const tv = parseFloat(envState.temp), hv = parseFloat(envState.hygro);
  if (!isNaN(tv) && !isNaN(hv)) genObservations(tv, hv);
}

function enregistrer() {
  const temp  = parseFloat(envState.temp);
  const hygro = parseFloat(envState.hygro);
  if (isNaN(temp)||isNaN(hygro)) { showToast('Veuillez saisir température et hygrométrie.'); return; }
  const now = new Date();
  const solutionEl = document.getElementById('envSolutionApportee');
  const entry = {
    time: now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
    temp, hygro, ts: now.toISOString(),
    meteoTemp: envDerniereMeteo.temp,
    meteoHumid: envDerniereMeteo.humid,
    solution: solutionEl ? solutionEl.value.trim() : ''
  };
  const dk = envTodayKey();
  if (!envDb[dk]) envDb[dk] = [];
  envDb[dk].push(entry);
  envSaveDB();
  // Vider la solution après enregistrement (elle est maintenant dans le tableau)
  const solutionElClear = document.getElementById('envSolutionApportee');
  if(solutionElClear) solutionElClear.value = '';
  localStorage.setItem(ENV_SOLUTION_KEY, '');
  fbSafeSave(ENV_SOLUTION_KEY, '');
  clearField('temp'); clearField('hygro');
  showToast('✓ Mesure enregistrée');
  envRenderAll();
  genObservations(temp, hygro);
}

function genObservations(temp, hygro) {
  const lines = [];
  if (temp>=25&&temp<=28) lines.push(['✅',`Température de ${temp}°C : dans la plage idéale (25–28°C).`]);
  else if (temp>28&&temp<=30) lines.push(['⚠️',`Température de ${temp}°C légèrement élevée. Vérifier la ventilation.`]);
  else if (temp>30) lines.push(['🔴',`Température de ${temp}°C trop élevée. Ventiler immédiatement.`]);
  else lines.push(['⚠️',`Température de ${temp}°C insuffisante pour un développement optimal.`]);
  if (hygro>=55&&hygro<=60) lines.push(['✅',`Hygrométrie de ${hygro}% : parfaitement contrôlée.`]);
  else if (hygro>60) lines.push(['⚠️',`Hygrométrie de ${hygro}% élevée. Risque de moisissures.`]);
  else lines.push(['⚠️',`Hygrométrie de ${hygro}% basse. Les larves peuvent se déshydrater.`]);
  if (temp>=25&&temp<=28&&hygro>=55&&hygro<=60) lines.push(['🌟','Conditions globales excellentes !']);
  const dk = envTodayKey();
  const entries = envDb[dk]||[];
  if (entries.length>=3) {
    const avgT = envMean(entries.map(e=>e.temp));
    const avgH = envMean(entries.map(e=>e.hygro));
    lines.push(['📈',`Moyenne journalière : ${avgT.toFixed(1)}°C — ${avgH.toFixed(1)}%.`]);
  }
  const obsContent = document.getElementById('obsContent');
  const obsBox = document.getElementById('obsBox');
  if (obsContent) obsContent.innerHTML = lines.map(([i,t])=>`<div class="obs-line"><span class="obs-icon">${i}</span><span>${t}</span></div>`).join('');
  if (obsBox) obsBox.classList.add('visible');
}

function envRenderTable() {
  const tbody = document.getElementById('logBody');
  if (!tbody) return;
  const entries = envDb[envTodayKey()]||[];
  if (!entries.length) { tbody.innerHTML='<tr><td colspan="6" style="color:var(--sub);text-align:center;padding:16px">Aucune mesure enregistrée aujourd\'hui.</td></tr>'; return; }
  tbody.innerHTML = entries.map(e=>{
    const mTemp = (e.meteoTemp!==null&&e.meteoTemp!==undefined) ? e.meteoTemp.toFixed(1)+'°C' : '—';
    const mHumid = (e.meteoHumid!==null&&e.meteoHumid!==undefined) ? e.meteoHumid.toFixed(0)+'%' : '—';
    const sol = e.solution ? e.solution : '—';
    return `<tr><td>${e.time}</td><td class="temp-val">${e.temp.toFixed(1)}</td><td class="hygro-val">${e.hygro.toFixed(1)}</td><td style="color:var(--orange);">${mTemp}</td><td style="color:var(--blue);">${mHumid}</td><td style="color:#38a169;font-size:.82rem;">${sol}</td></tr>`;
  }).join('');
}

function envRenderChartDay() {
  const canvas = document.getElementById('chartDay');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dk = envTodayKey();
  const entries = envDb[dk]||[];
  const labels = entries.map(e=>e.time);
  const temps  = entries.map(e=>e.temp);
  const hygros = entries.map(e=>e.hygro);
  const meteoTemps  = entries.map(e=>(e.meteoTemp!==undefined&&e.meteoTemp!==null)?e.meteoTemp:null);
  const meteoHygros = entries.map(e=>(e.meteoHumid!==undefined&&e.meteoHumid!==null)?e.meteoHumid:null);
  const avgT = envMean(temps);
  const avgH = envMean(hygros);
  const datasets = [
    { label:'Température intérieure (°C)', data:temps, borderColor:'#e53e3e', backgroundColor:'rgba(229,62,62,0.1)', tension:.35, pointRadius:5, fill:false, yAxisID:'yT' },
    { label:'Hygrométrie intérieure (%)',  data:hygros, borderColor:'#3182ce', backgroundColor:'rgba(49,130,206,0.1)', tension:.35, pointRadius:5, fill:false, yAxisID:'yH' },
    { label:'Température extérieure (°C)', data:meteoTemps, borderColor:'#dd6b20', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yT', spanGaps:true },
    { label:'Hygrométrie extérieure (%)',  data:meteoHygros, borderColor:'#38a169', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yH', spanGaps:true },
  ];
  if (avgT!==null) datasets.push({ label:`Moy. ${avgT.toFixed(1)}°C`, data:Array(labels.length).fill(avgT), borderColor:'#e53e3e', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false, yAxisID:'yT' });
  if (avgH!==null) datasets.push({ label:`Moy. ${avgH.toFixed(1)}%`,  data:Array(labels.length).fill(avgH), borderColor:'#3182ce', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false, yAxisID:'yH' });
  if (envChartDay) envChartDay.destroy();
  envChartDay = new Chart(ctx, { type:'line', data:{labels,datasets}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{ yT:{type:'linear',position:'left',min:15,max:40,title:{display:true,text:'°C'}}, yH:{type:'linear',position:'right',min:30,max:90,title:{display:true,text:'%'},grid:{drawOnChartArea:false}}, x:{} } } });
}

function envRenderChartMonth() {
  const canvas = document.getElementById('chartMonth');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const mk = envMonthKey();
  const days = Object.keys(envDb).filter(k=>k.startsWith(mk)).sort();
  const labels = days.map(d=>d.slice(8));
  const avgTemps  = days.map(d=>{ const e=envDb[d]; return e&&e.length?envMean(e.map(x=>x.temp)):null; });
  const avgHygros = days.map(d=>{ const e=envDb[d]; return e&&e.length?envMean(e.map(x=>x.hygro)):null; });
  const avgMeteoTemps  = days.map(d=>{ const e=envDb[d]; const vals=(e||[]).map(x=>x.meteoTemp).filter(v=>v!==null&&v!==undefined); return vals.length?envMean(vals):null; });
  const avgMeteoHygros = days.map(d=>{ const e=envDb[d]; const vals=(e||[]).map(x=>x.meteoHumid).filter(v=>v!==null&&v!==undefined); return vals.length?envMean(vals):null; });
  const gAvgT = envMean(avgTemps.filter(v=>v!==null));
  const gAvgH = envMean(avgHygros.filter(v=>v!==null));
  const datasets = [
    { label:'Moy. temp. intérieure (°C)',  data:avgTemps,  borderColor:'#e53e3e', tension:.35, pointRadius:5, fill:false, yAxisID:'yT' },
    { label:'Moy. hygro. intérieure (%)', data:avgHygros, borderColor:'#3182ce', tension:.35, pointRadius:5, fill:false, yAxisID:'yH' },
    { label:'Moy. temp. extérieure (°C)',  data:avgMeteoTemps,  borderColor:'#dd6b20', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yT', spanGaps:true },
    { label:'Moy. hygro. extérieure (%)', data:avgMeteoHygros, borderColor:'#38a169', borderDash:[4,3], tension:.35, pointRadius:3, fill:false, yAxisID:'yH', spanGaps:true },
  ];
  if (gAvgT!==null) datasets.push({ label:`Moy. mens. ${gAvgT.toFixed(1)}°C`, data:Array(labels.length).fill(gAvgT), borderColor:'#e53e3e', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false, yAxisID:'yT' });
  if (gAvgH!==null) datasets.push({ label:`Moy. mens. ${gAvgH.toFixed(1)}%`,  data:Array(labels.length).fill(gAvgH), borderColor:'#3182ce', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false, yAxisID:'yH' });
  if (envChartMonth) envChartMonth.destroy();
  envChartMonth = new Chart(ctx, { type:'line', data:{labels:labels.length?labels:['—'],datasets}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{ yT:{type:'linear',position:'left',min:15,max:40,title:{display:true,text:'°C'}}, yH:{type:'linear',position:'right',min:30,max:90,title:{display:true,text:'%'},grid:{drawOnChartArea:false}}, x:{title:{display:true,text:'Jour du mois'}} } } });
}

function envRenderAll() {
  envRenderTable();
  envRenderChartDay();
  envRenderChartMonth();
}

const WMO_CODES = {0:['Ciel dégagé','☀️'],1:['Principalement dégagé','🌤'],2:['Partiellement nuageux','⛅'],3:['Couvert','☁️'],45:['Brouillard','🌫'],51:['Bruine légère','🌦'],61:['Pluie légère','🌧'],63:['Pluie modérée','🌧'],65:['Pluie forte','🌧'],80:['Averses','🌦'],95:['Orage','⛈']};
let envDerniereMeteo = { temp: null, humid: null };

async function fetchMeteo() {
  const loading = document.getElementById('meteoLoading');
  const content = document.getElementById('meteoContent');
  if (!loading||!content) return;
  loading.style.display='block'; content.style.display='none';
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=44.644&longitude=-0.097&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&wind_speed_unit=kmh&timezone=Europe%2FParis');
    const data = await res.json();
    const c = data.current;
    envDerniereMeteo.temp = c.temperature_2m;
    envDerniereMeteo.humid = c.relative_humidity_2m;
    const wmo = WMO_CODES[c.weather_code]||['—','❓'];
    document.getElementById('meteoIcon').textContent = wmo[1];
    document.getElementById('meteoDesc').textContent = wmo[0];
    document.getElementById('meteoTemp').textContent  = `🌡 ${c.temperature_2m}°C`;
    document.getElementById('meteoHumid').textContent = `💧 ${c.relative_humidity_2m}%`;
    document.getElementById('meteoWind').textContent  = `💨 ${c.wind_speed_10m} km/h`;
    document.getElementById('meteoRain').textContent  = `🌧 ${c.precipitation} mm`;
    envDerniereMeteo = { temp: c.temperature_2m, humid: c.relative_humidity_2m };
    loading.style.display='none'; content.style.display='flex';
  } catch { if(loading) loading.textContent='Météo indisponible.'; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function envViderToutesLesDonnees(){
  if(!confirm('⚠️ Ceci va supprimer TOUTES les données Environnement (température, hygrométrie, historique) — local + cloud partagé. Action irréversible. Continuer ?')) return;
  if(!confirm('Confirmation finale : effacer toutes les données Environnement ?')) return;
  envDb = {};
  envSaveDB();
  envRenderAll();
  const t=document.getElementById('toast');
  if(t){ t.textContent='Données Environnement effacées.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
}

const ENV_SOLUTION_KEY = 'env_solution_apportee';
function envSauverSolution(){
  const val = document.getElementById('envSolutionApportee').value;
  localStorage.setItem(ENV_SOLUTION_KEY, val);
  fbSafeSave(ENV_SOLUTION_KEY, val);
  const t=document.getElementById('toast');
  if(t){ t.textContent='Solution enregistrée.'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2200); }
}
async function envChargerSolution(){
  const cloudVal = await fbSafeLoad(ENV_SOLUTION_KEY, null);
  const localVal = localStorage.getItem(ENV_SOLUTION_KEY)||'';
  const val = (cloudVal!==null) ? cloudVal : localVal;
  const ta = document.getElementById('envSolutionApportee');
  // Ne pas écraser si l'utilisateur est en train d'écrire (focus sur la textarea)
  if(ta && document.activeElement !== ta){
    ta.value = val;
  }
  localStorage.setItem(ENV_SOLUTION_KEY, val);
}

function initEnvPage() {
  envDb = envLoadDB();
  envChargerSolution();
  const yl = document.getElementById('yearLabel');
  if(yl) yl.textContent = new Date().getFullYear();
  if (!window._envClock) {
    window._envClock = setInterval(envTickClock, 1000);
  }
  envTickClock();
  envRenderAll();
  fetchMeteo();
  if(!window._envEffacerAttache){
    window._envEffacerAttache = true;


  }
}


