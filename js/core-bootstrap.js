/* ══ CONFIGURATION NOMBRE DE BACS ══ */
const BAC_MAX_KEY = 'config_bac_max';
let BAC_MAX = 255;

function bacMaxLoad() {
  try {
    const v = parseInt(localStorage.getItem(BAC_MAX_KEY), 10);
    if (!isNaN(v) && v > 0) BAC_MAX = v;
  } catch(e) {}
}
function bacMaxSave(n) {
  BAC_MAX = n;
  NYM_NB_BACS_MAX = n;
  NYM_ALERTE_BACS = n;
  localStorage.setItem(BAC_MAX_KEY, String(n));
  fbSafeSave(BAC_MAX_KEY, n);
}
async function bacMaxSyncFromCloud() {
  const cloudVal = await fbSafeLoad(BAC_MAX_KEY, null);
  if (cloudVal !== null && !isNaN(parseInt(cloudVal,10))) {
    BAC_MAX = parseInt(cloudVal, 10);
    NYM_NB_BACS_MAX = BAC_MAX;
    NYM_ALERTE_BACS = BAC_MAX;
    localStorage.setItem(BAC_MAX_KEY, String(BAC_MAX));
  }
}
function ouvrirConfigBacMax() {
  const current = BAC_MAX;
  const val = prompt('Nombre total de bacs disponibles dans l\'élevage :', current);
  if (val === null) return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) { alert('Veuillez entrer un nombre valide supérieur à 0.'); return; }
  bacMaxSave(n);
  const disp = document.getElementById('bacMaxDisplay');
  if (disp) disp.textContent = n;
  alert('✓ Nombre de bacs mis à jour : ' + n + '. Les menus déroulants utiliseront cette nouvelle limite.');
}

bacMaxLoad();
window.addEventListener('fbReady', function() {
  bacMaxSyncFromCloud().then(function() {
    const disp = document.getElementById('bacMaxDisplay');
    if (disp) disp.textContent = BAC_MAX;
  });
});

/* ══ HELPER FIREBASE - ATTENTE DE DISPONIBILITÉ ══ */
function fbWaitReady(maxWaitMs) {
  return new Promise(function(resolve) {
    var waited = 0;
    var interval = setInterval(function() {
      if (window._fbSaveData && window._fbLoadData) {
        clearInterval(interval);
        resolve(true);
      } else {
        waited += 100;
        if (waited >= (maxWaitMs || 5000)) {
          clearInterval(interval);
          resolve(false);
        }
      }
    }, 100);
  });
}
async function fbSafeSave(key, value) {
  var ready = await fbWaitReady(5000);
  if (ready && window._fbSaveData) {
    return window._fbSaveData(key, value);
  }
  return false;
}
async function fbSafeLoad(key, fallback) {
  var ready = await fbWaitReady(5000);
  if (ready && window._fbLoadData) {
    return window._fbLoadData(key, fallback);
  }
  return fallback;
}

/* ══ NAVIGATION ══ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if (id === 'page-stocks') {
    stkSyncFromCloud().then(function(){ stkRender(); });
    var stkDateEl = document.getElementById('stkInDate');
    if (stkDateEl) stkDateEl.value = new Date().toISOString().split('T')[0];
  }
  if (id === 'page-env') { envSyncFromCloud().then(function(){ initEnvPage(); }); }
  if (id === 'page-col') { colSyncFromCloud().then(function(){ initColPage(); }); }
  if (id === 'page-oeufs') { ponteSyncFromCloud().then(function(){ initOeufsPage(); }); }
  if (id === 'page-nymphes') { nymSyncFromCloud().then(function(){ initNymphesPage(); }); }
  if (id === 'page-larves') { larSyncFromCloud().then(function(){ initLarvesPage(); }); }
  if (id === 'page-substrat') { subSyncFromCloud().then(function(){ initSubstratPage(); }); }
}


