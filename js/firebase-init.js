    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyA4nr8bEP_KzaL6zBLAkOl59FrSz1N_62M",
      authDomain: "elevage-tenebrion.firebaseapp.com",
      projectId: "elevage-tenebrion",
      storageBucket: "elevage-tenebrion.firebasestorage.app",
      messagingSenderId: "121979752237",
      appId: "1:121979752237:web:8efa5cd91357a902130da4"
    };

    const fbApp = initializeApp(firebaseConfig);
    const fbAuth = getAuth(fbApp);
    const fbDb = getFirestore(fbApp);

    // Exposer globalement pour le reste du script classique
    window._fbAuth = fbAuth;
    window._fbDb = fbDb;
    window._fbSignIn = (email, pass) => signInWithEmailAndPassword(fbAuth, email, pass);
    window._fbSignOut = () => signOut(fbAuth);
    window._fbDoc = doc;
    window._fbGetDoc = getDoc;
    window._fbSetDoc = setDoc;
    window._fbCollection = collection;
    window._fbGetDocs = getDocs;

    onAuthStateChanged(fbAuth, (user) => {
      const loginScreen = document.getElementById('loginScreen');
      const appContent = document.getElementById('appContent');
      const userBadge = document.getElementById('userEmailBadge');
      if (user) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContent) appContent.style.display = '';
        if (userBadge) userBadge.textContent = user.email;
        window._currentUser = user;
        window.dispatchEvent(new Event('fbReady'));
      } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
        window._currentUser = null;
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('loginForm');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('loginEmail').value;
          const pass = document.getElementById('loginPassword').value;
          const errEl = document.getElementById('loginError');
          errEl.textContent = '';
          try {
            await window._fbSignIn(email, pass);
          } catch (err) {
            errEl.textContent = 'Connexion échouée : email ou mot de passe incorrect.';
          }
        });
      }
    });

    // ══ STOCKAGE PARTAGÉ FIRESTORE ══
    // Collection unique "elevage_data", un document par module (ex: "stock_son_ble_v4")
    window._fbLoadData = async function(key, fallback) {
      try {
        const ref = window._fbDoc(window._fbDb, 'elevage_data', key);
        const snap = await window._fbGetDoc(ref);
        if (snap.exists()) {
          return snap.data().value;
        }
        return fallback;
      } catch (e) {
        console.error('Erreur chargement Firestore ('+key+'):', e);
        return fallback;
      }
    };

    window._fbSaveData = async function(key, value) {
      try {
        const ref = window._fbDoc(window._fbDb, 'elevage_data', key);
        await window._fbSetDoc(ref, { value: value, updatedAt: new Date().toISOString() });
        return true;
      } catch (e) {
        console.error('Erreur sauvegarde Firestore ('+key+'):', e);
        return false;
      }
    };
