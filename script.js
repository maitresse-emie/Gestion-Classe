// ==========================================
// 1. SETUP, CONSTANTES ET UTILITAIRES DE BASE
// ==========================================
function escJS(str) { return (str || "").toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function escHTML(str) { return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

const KEY_ATELIERS = 'mesAteliers_Finale';
const KEY_ELEVES = 'mesEleves_Finale';
const KEY_IMAGES = 'mesImagesTypes_Finale';
const KEY_ARCHIVES_TODO = 'dashboardArchives_Finale';
const KEY_PROG = 'mesProgrammations_Finale';

let dashboardExpanded = new Set(); 
let dashboardArchives = JSON.parse(localStorage.getItem(KEY_ARCHIVES_TODO)) || [];
let afficherArchivesMode = false;

let programmations = JSON.parse(localStorage.getItem(KEY_PROG)) || {};

let imagesParType = JSON.parse(localStorage.getItem(KEY_IMAGES));
if (!imagesParType) {
    imagesParType = {
        "Atelier": { img: "", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Jeu": { img: "", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Vidéo": { img: "", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Anton": { img: "", remplacerNum: true, appliquerCouleur: false, isTablette: true },
        "Scratch": { img: "", remplacerNum: true, appliquerCouleur: false, isTablette: true }
    };
} else {
    Object.keys(imagesParType).forEach(k => {
        if (typeof imagesParType[k] === 'object' && imagesParType[k].isTablette === undefined) {
            imagesParType[k].isTablette = (k.toLowerCase() === 'anton');
        }
    });
}

let baseDonnees = JSON.parse(localStorage.getItem(KEY_ATELIERS));
if (!baseDonnees || !Array.isArray(baseDonnees)) { baseDonnees = []; }

let eleves = JSON.parse(localStorage.getItem(KEY_ELEVES));
if (!eleves) { eleves = {}; }

function sauvegarderEleves() { localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves)); declencherAutoSaveDrive(); }
function sauvegarderBase() { localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); declencherAutoSaveDrive(); }
function sauvegarderProgrammations() { localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); declencherAutoSaveDrive(); }

function trierBaseDonnees() {
    if (!Array.isArray(baseDonnees)) return;
    baseDonnees.sort((a, b) => {
        let matA = nettoyerNomPourTri(a.matiere); let matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = (a.sequence || "").trim(); let sB = (b.sequence || "").trim();
        if (sA !== sB) return sA.localeCompare(sB, 'fr');
        return (a.ressource || "").localeCompare(b.ressource || "", 'fr');
    });
}

function eliminerDoublonsHistoriques() {
    Object.values(eleves).forEach(e => {
        if (e.historique && Array.isArray(e.historique)) {
            let uniqueMap = new Map();
            e.historique.forEach(h => { uniqueMap.set(h.idActivite, h); });
            e.historique = Array.from(uniqueMap.values());
        }
    });
}

function getNiveauxCochesFormulaire() {
    let res = []; document.querySelectorAll('.cb-niveau-form:checked').forEach(cb => res.push(cb.value)); return res;
}

function verifierDoublonActivite(matiere, sequence, competence, ressource, visuel, idExclu) {
    return baseDonnees.find(a => 
        a.id !== idExclu && (a.ressource || "").trim().toLowerCase() === ressource.trim().toLowerCase() &&
        (a.matiere || "").trim().toLowerCase() === matiere.trim().toLowerCase() && (a.sequence || "").trim().toLowerCase() === sequence.trim().toLowerCase()
    );
}

function majSelectCouleursRapides(valeurForcee) {
    const select = document.getElementById('selectCouleurRapide'); if (!select) return;
    let optionsHtml = '<option value="">-- Choisir une couleur --</option>' +
        '<option value="#ffe599">🟡 Jaune (Maths CP)</option><option value="#f6b26b">🟠 Orange (Maths CE)</option><option value="#ea9999">🔴 Rouge (Maths CM)</option>' +
        '<option value="#d5a6bd">🟣 Violet (Français CP)</option><option value="#b6d7a8">🟢 Vert (Français CE)</option><option value="#9fc5e8">🔵 Bleu (Français CM)</option>' +
        '<option value="#ffffff">⚪ Blanc</option>';
    select.innerHTML = optionsHtml; if (valeurForcee) select.value = valeurForcee;
}

Object.values(eleves).forEach(e => { 
    if(!e.maxAteliers) e.maxAteliers = 15; if(e.maxTablettes === undefined) e.maxTablettes = 2; if(!e.niveau) e.niveau = "CP";
    if(!e.suivi) e.suivi = {}; if(!e.valides) e.valides = {}; if(!e.planHebdo || !Array.isArray(e.planHebdo)) e.planHebdo = [];
    if(!e.enAttente || !Array.isArray(e.enAttente)) e.enAttente = []; if(!e.historique || !Array.isArray(e.historique)) e.historique = [];
    if(!e.masquees || !Array.isArray(e.masquees)) e.masquees = []; if(!e.priorites) e.priorites = []; if(!e.bilanEvaluations) e.bilanEvaluations = {};
});
localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));

let idEleveCourant = null; let idEleveImpressionCourant = null;
let filtreCourantDB = 'Tous'; let filtreCourantMatiere = 'Toutes'; let filtreCourantTypeDB = 'Tous';
let idEnCoursEdition = null; let couleurManuelleModifiee = false; let isFormLoading = false;

let dernierNiveauForm = []; let derniereMatiereForm = ""; let derniereSequenceForm = ""; let derniereCompForm = "";

function nettoyerNomPourTri(str) { return (!str) ? "" : str.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, "").trim().toLowerCase(); }

function getListeTrie(idsArray, priosArray = []) {
    if (!idsArray) return [];
    let planObjects = idsArray.map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
    planObjects.sort((a, b) => {
        let prioA = priosArray.includes(a.id) ? 1 : 0; let prioB = priosArray.includes(b.id) ? 1 : 0;
        if (prioA !== prioB) return prioB - prioA;
        let matA = nettoyerNomPourTri(a.matiere); let matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = (a.sequence || "").trim(); let sB = (b.sequence || "").trim();
        if (sA !== sB) return sA.localeCompare(sB, 'fr');
        let cA = (a.competence || "").trim(); let cB = (b.competence || "").trim();
        if (cA !== cB) return cA.localeCompare(cB, 'fr');
        return (a.estEvaluation ? 1 : 0) - (b.estEvaluation ? 1 : 0);
    });
    return planObjects;
}

function getElevesTries() {
    const ordreNiv = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    return Object.values(eleves).sort((a, b) => {
        let nivA = ordreNiv[(a.niveau || "CP").toUpperCase()] || 99; let nivB = ordreNiv[(b.niveau || "CP").toUpperCase()] || 99;
        if (nivA !== nivB) return nivA - nivB; return (a.nom || "").localeCompare(b.nom || "", 'fr', { sensitivity: 'base' });
    });
}

// ==========================================
// 2. UI, TOASTS ET OUTILS VISUELS
// ==========================================
let modeClasseActif = false;
function basculerModeClasse() {
    modeClasseActif = !modeClasseActif; const btn = document.querySelector('.btn-tablet-toggle');
    if (modeClasseActif) { document.body.classList.add('mode-classe'); btn.innerText = "💻 Quitter Mode Classe"; btn.style.background = "#e74c3c"; } 
    else { document.body.classList.remove('mode-classe'); btn.innerText = "📱 Mode Classe"; btn.style.background = "#8e44ad"; }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container'); const toast = document.createElement('div');
    toast.className = `toast ${type}`; toast.innerText = message; container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

const originalAlert = window.alert;
window.alert = function(msg) {
    if (msg.includes("succès") || msg.includes("mise à jour") || msg.includes("enregistrées")) { showToast(msg, 'success'); }
    else if (msg.length < 60) { showToast(msg, 'error'); } else { originalAlert(msg); }
};

window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnScrollTop');
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) { btn.style.display = "block"; } else { btn.style.display = "none"; }
});

function formaterLienImage(url) {
    if (!url) return ""; url = url.trim();
    let matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); let matchOpenId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    let fileId = matchFileD ? matchFileD[1] : (matchOpenId ? matchOpenId[1] : null);
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`; return url;
}

function isDarkColor(hex) {
    if(!hex || !hex.startsWith('#')) return false;
    let c = hex.substring(1); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let rgb = parseInt(c, 16); let r = (rgb >> 16) & 0xff; let g = (rgb >>  8) & 0xff; let b = (rgb >>  0) & 0xff;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}

function calculerCouleurAutomatique(matiere, niveauxStr, typeRes) {
    if (!matiere || !niveauxStr) return "#ffffff";
    let typeKey = ""; 
    if (imagesParType) { for (let k in imagesParType) { if (k.trim().toLowerCase() === (typeRes || "").trim().toLowerCase()) { typeKey = k; break; } } }
    if (typeKey && imagesParType[typeKey] && typeof imagesParType[typeKey] === 'object') { if (imagesParType[typeKey].appliquerCouleur === false) return "#ffffff"; }
    let mat = matiere.trim().toLowerCase(); let nivs = niveauxStr.toUpperCase();
    let ordreNivs = ["CP", "CE1", "CE2", "CM1", "CM2"]; let niveauPlusBas = "";
    for (let n of ordreNivs) { if (nivs.includes(n)) { niveauPlusBas = n; break; } }
    if (mat.includes('math')) { if (niveauPlusBas === 'CP') return "#ffe599"; if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#f6b26b"; if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#ea9999"; } 
    else if (mat.includes('français') || mat.includes('francais')) { if (niveauPlusBas === 'CP') return "#d5a6bd"; if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#b6d7a8"; if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#9fc5e8"; }
    return "#ffffff";
}

function calculTailleStockage() {
    let _lsTotal = 0, _xLen, _x;
    for (_x in localStorage) { if (!localStorage.hasOwnProperty(_x)) continue; _xLen = ((localStorage[_x].length + _x.length) * 2); _lsTotal += _xLen; }
    let megaBytes = (_lsTotal / (1024 * 1024)).toFixed(2); let pct = Math.min(100, (megaBytes / 5) * 100);
    let texteSto = document.getElementById('texteStockage'); if(texteSto) texteSto.innerText = `${megaBytes} Mo utilisés sur environ 5.00 Mo`;
    let jauge = document.getElementById('jaugeStockageFill');
    if(jauge) { jauge.style.width = pct + "%"; if (pct > 80) jauge.style.backgroundColor = "#e74c3c"; else if (pct > 50) jauge.style.backgroundColor = "#f39c12"; else jauge.style.backgroundColor = "#27ae60"; }
}

// ==========================================
// 3. SYNCHRONISATION GOOGLE DRIVE (JSON uniquement)
// ==========================================
const CLIENT_ID = '133293729951-pv43qv8a9758rbm4atpiiq3rv0g79vnd.apps.googleusercontent.com';
const API_KEY = ''; const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
let driveAccessToken = null; let driveFileId = null; let intervalVerificationSession = null; let timerAutoSave;

function declencherAutoSaveDrive() {
    if (!driveFileId || !driveAccessToken) return; clearTimeout(timerAutoSave);
    timerAutoSave = setTimeout(() => { let statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Sauvegarde auto..."; sauvegarderVersDriveFichierUnique(); calculTailleStockage(); }, 3000);
}

function initialiserDrive() {
    const statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Connexion à Google...";
    gapi.load('client', () => {
        gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] }).then(() => {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID, scope: SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        driveAccessToken = tokenResponse.access_token; let expirationTime = Date.now() + 55 * 60 * 1000;
                        localStorage.setItem('drive_token_cache_final', JSON.stringify({ token: driveAccessToken, expiresAt: expirationTime }));
                        let btnConn = document.getElementById('btnConnectDrive'); if(btnConn) btnConn.innerText = "✅ Connecté";
                        rechercherFichierSauvegarde(); lancerSurveillanceExpirationSession(expirationTime);
                    }
                },
            });
            tokenClient.requestAccessToken({prompt: ''});
        }).catch(err => { if(statut) statut.innerText = "⚠️ Erreur d'initialisation Google."; });
    });
}

function lancerSurveillanceExpirationSession(expiresAt) {
    if (intervalVerificationSession) clearInterval(intervalVerificationSession);
    intervalVerificationSession = setInterval(() => {
        let tempsRestant = expiresAt - Date.now();
        if (tempsRestant > 0 && tempsRestant <= 5 * 60 * 1000 && driveAccessToken) { clearInterval(intervalVerificationSession); if (confirm("⚠️ Votre session Google Drive va expirer dans 5 minutes !\nVoulez-vous rafraîchir votre connexion ?")) initialiserDrive(); }
    }, 30 * 1000);
}

function rechercherFichierSauvegarde(forcerTelechargement = false) {
    if(!driveAccessToken) { initialiserDrive(); return; }
    const statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "🔍 Recherche du fichier JSON...";
    fetch('https://www.googleapis.com/drive/v3/files?q=name="Sauvegarde_Classe.json" and trashed=false', { headers: { 'Authorization': 'Bearer ' + driveAccessToken } })
    .then(res => { if(res.status === 401) throw new Error("TOKEN_EXPIRED"); return res.json(); })
    .then(data => {
        if(data.files && data.files.length > 0) { driveFileId = data.files[0].id; if (forcerTelechargement || baseDonnees.length === 0) { if(statut) statut.innerText = "✅ Fichier trouvé. Téléchargement..."; telechargerDepuisDrive(driveFileId); } else { if(statut) { statut.innerText = "✅ Fichier lié (Prêt pour la synchro)."; statut.style.color = "#27ae60"; } } } 
        else { if(statut) statut.innerText = "ℹ️ Aucun fichier. Création de la sauvegarde..."; sauvegarderVersDriveFichierUnique(); }
    }).catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else if(statut) statut.innerText = "❌ Erreur de recherche Drive."; });
}

function telechargerDepuisDrive(fileId) {
    const statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Téléchargement depuis le Drive...";
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { 'Authorization': 'Bearer ' + driveAccessToken } })
    .then(res => { if(res.status === 401) throw new Error("TOKEN_EXPIRED"); if (!res.ok) throw new Error("API_ERROR"); return res.json(); })
    .then(data => {
        if(data && data.base && data.eleves) {
            baseDonnees = Array.isArray(data.base) ? data.base : []; eleves = data.eleves; 
            if(data.images) imagesParType = data.images;
            if(data.programmations) { programmations = data.programmations; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
            if(data.archives) { dashboardArchives = data.archives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
            
            localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves)); localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
            
            Object.values(eleves).forEach(e => { 
                if(!e.maxAteliers) e.maxAteliers = 15; if(e.maxTablettes === undefined) e.maxTablettes = 2; if(!e.niveau) e.niveau = "CP";
                if(!e.suivi) e.suivi = {}; if(!e.valides) e.valides = {}; if(!e.planHebdo) e.planHebdo = []; if(!e.enAttente) e.enAttente = []; if(!e.historique) e.historique = []; if(!e.masquees) e.masquees = []; if(!e.priorites) e.priorites = []; if(!e.bilanEvaluations) e.bilanEvaluations = {};
            });
            localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
            
            postEditGlobal(); majListeEleves(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); majSelectCouleursRapides(); rafraichirDashboard();
            if(statut) { statut.innerText = "✅ Synchronisé depuis le Drive !"; statut.style.color = "#27ae60"; } calculTailleStockage();
        } else { if(statut) statut.innerText = "⚠️ Fichier Drive vide ou corrompu."; }
    }).catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else { if(statut) { statut.innerText = "❌ Erreur de téléchargement du fichier."; statut.style.color = "#e74c3c"; } } });
}

function sauvegarderVersDriveFichierUnique() {
    if(!driveAccessToken) return;
    const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations };
    const fileBlob = new Blob([JSON.stringify(data)], { type: 'application/json' }); const metadata = { 'name': 'Sauvegarde_Classe.json', 'mimeType': 'application/json' }; const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' })); form.append('file', fileBlob);
    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'; let method = 'POST';
    if (driveFileId) { url = `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=multipart`; method = 'PATCH'; }
    fetch(url, { method: method, headers: new Headers({ 'Authorization': 'Bearer ' + driveAccessToken }), body: form })
    .then(response => { if(response.status === 401) throw new Error("TOKEN_EXPIRED"); return response.json(); })
    .then(val => { if(val.id) { if(!driveFileId) driveFileId = val.id; let statut = document.getElementById('statutDrive'); if(statut) { statut.innerText = "✅ Sauvegardé à " + new Date().toLocaleTimeString(); statut.style.color = "#27ae60"; } } })
    .catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else { let statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "❌ Erreur de synchro Drive."; } });
}

function formaterErreurExpiration() {
    driveAccessToken = null; localStorage.removeItem('drive_token_cache_final'); if (intervalVerificationSession) clearInterval(intervalVerificationSession);
    let statut = document.getElementById('statutDrive'); let btnConn = document.getElementById('btnConnectDrive');
    if(statut) { statut.innerText = "⚠️ Session expirée. Veuillez vous reconnecter."; statut.style.color = "#e74c3c"; } if(btnConn) btnConn.innerText = "☁️ Reconnecter Google Drive";
}

function tenterConnexionAuto() {
    const cache = JSON.parse(localStorage.getItem('drive_token_cache_final'));
    if(cache && cache.token && cache.expiresAt > Date.now()) {
        let statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Reconnexion automatique...";
        gapi.load('client', () => { gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] }).then(() => { driveAccessToken = cache.token; let btnConn = document.getElementById('btnConnectDrive'); if(btnConn) btnConn.innerText = "✅ Connecté (Auto)"; rechercherFichierSauvegarde(false); lancerSurveillanceExpirationSession(cache.expiresAt); }); });
    }
}

// ==========================================
// 4. GESTION DES ELEVES & ASSIGNATIONS
// ==========================================
function majListeEleves() {
    const select = document.getElementById('selectEleveProfile'); const selectImp = document.getElementById('selectEleveImpression'); const selectBilan = document.getElementById('selectEleveBilan');
    let optHtml = '<option value="">-- Sélectionner un élève --</option>'; let optImp = '<option value="">-- Choisir un élève --</option><option value="TOUS_ELEVES">-- 📚 TOUS les élèves --</option>';
    let elevesTries = getElevesTries();
    elevesTries.forEach(e => { let labelNiv = `[${e.niveau || "CP"}] ${e.nom}`; optHtml += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; optImp += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; });
    if (select) select.innerHTML = optHtml; if (selectImp) selectImp.innerHTML = optImp; if (selectBilan) selectBilan.innerHTML = optImp;
    
    let btnEdit = document.getElementById('btnEditEleve');
    if(idEleveCourant && eleves[idEleveCourant]) { 
        if (select) select.value = idEleveCourant; if (btnEdit) btnEdit.style.display = "inline-block";
        let inputMax = document.getElementById('inputMaxAteliersEleve'); let inputMaxTab = document.getElementById('inputMaxTablettesEleve'); let maxAff = document.getElementById('maxAteliersAffiche');
        if (inputMax) inputMax.value = eleves[idEleveCourant].maxAteliers || 15; if (inputMaxTab) inputMaxTab.value = eleves[idEleveCourant].maxTablettes ?? 2; if (maxAff) maxAff.innerText = eleves[idEleveCourant].maxAteliers || 15; 
    } else { if (btnEdit) btnEdit.style.display = "none"; }
    if(idEleveCourant && !idEleveImpressionCourant) { idEleveImpressionCourant = idEleveCourant; }
    if(idEleveImpressionCourant) { if (selectImp) selectImp.value = idEleveImpressionCourant; if (selectBilan) selectBilan.value = idEleveImpressionCourant; }
}

function modifierMaxAteliersEleve() { if(!idEleveCourant) return; let val = parseInt(document.getElementById('inputMaxAteliersEleve').value); if(isNaN(val) || val < 1) val = 1; if(val > 25) val = 25; eleves[idEleveCourant].maxAteliers = val; sauvegarderEleves(); let maxAff = document.getElementById('maxAteliersAffiche'); if(maxAff) maxAff.innerText = val; }
function modifierMaxTablettesEleve() { if(!idEleveCourant) return; let val = parseInt(document.getElementById('inputMaxTablettesEleve').value); if(isNaN(val) || val < 0) val = 0; if(val > 10) val = 10; eleves[idEleveCourant].maxTablettes = val; sauvegarderEleves(); if(idEleveCourant) afficherPlanHebdo(); }

function creerEleve() { 
    const nomInput = document.getElementById('nouvelEleveNom'); const nivSelect = document.getElementById('nouvelEleveNiveau'); if(!nomInput) return;
    const nom = nomInput.value.trim(); if(!nom) return; const niveau = nivSelect ? nivSelect.value : "CP"; const id = 'eleve_' + Date.now(); 
    eleves[id] = { id: id, nom: nom, niveau: niveau, planHebdo: [], enAttente: [], historique: [], masquees: [], priorites: [], maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {} }; 
    sauvegarderEleves(); nomInput.value = ''; majListeInstantanéeEleve(id); rafraichirDashboard(); 
}

function majListeInstantanéeEleve(newId) { majListeEleves(); let sel = document.getElementById('selectEleveProfile'); if(sel) sel.value = newId; chargerEleve(); }

function ouvrirModalEditionEleve() {
    if(!idEleveCourant || !eleves[idEleveCourant]) return; let e = eleves[idEleveCourant];
    document.getElementById('editEleveNomInput').value = e.nom; document.getElementById('editEleveNiveauSelect').value = e.niveau || "CP"; ouvrirModal('modalEditEleve');
}

function validerEditionEleve() {
    if(!idEleveCourant || !eleves[idEleveCourant]) return;
    let nouveauNom = document.getElementById('editEleveNomInput').value.trim(); let nouveauNiveau = document.getElementById('editEleveNiveauSelect').value;
    if(!nouveauNom) { showToast("Le prénom ne peut pas être vide.", "error"); return; }
    eleves[idEleveCourant].nom = nouveauNom; eleves[idEleveCourant].niveau = nouveauNiveau; sauvegarderEleves(); fermerModal('modalEditEleve'); majListeEleves(); chargerEleve(); rafraichirDashboard(); showToast("Élève mis à jour !", "success");
}

function supprimerEleve() { if(!idEleveCourant) return; if(confirm("Supprimer définitivement cet élève ?")) { delete eleves[idEleveCourant]; idEleveCourant = null; idEleveImpressionCourant = null; sauvegarderEleves(); majListeEleves(); chargerEleve(); rafraichirDashboard(); } }

function chargerEleve() {
    const sel = document.getElementById('selectEleveProfile'); if (!sel) return; idEleveCourant = sel.value;
    const zoneTravail = document.getElementById('zoneTravail'); const message = document.getElementById('messageSelectEleve'); const btnEdit = document.getElementById('btnEditEleve');
    if(!idEleveCourant) { if(zoneTravail) zoneTravail.style.display = 'none'; if(message) message.style.display = 'block'; if(btnEdit) btnEdit.style.display = 'none'; return; }
    if(zoneTravail) zoneTravail.style.display = 'block'; if(message) message.style.display = 'none'; if(btnEdit) btnEdit.style.display = 'inline-block';
    document.querySelectorAll('.nomEleveAffiche').forEach(el => el.innerText = eleves[idEleveCourant].nom);
    let inputMax = document.getElementById('inputMaxAteliersEleve'); let inputMaxTab = document.getElementById('inputMaxTablettesEleve'); let maxAff = document.getElementById('maxAteliersAffiche');
    if(inputMax) inputMax.value = eleves[idEleveCourant].maxAteliers || 15; if(inputMaxTab) inputMaxTab.value = eleves[idEleveCourant].maxTablettes ?? 2; if(maxAff) maxAff.innerText = eleves[idEleveCourant].maxAteliers || 15;
    afficherPlanHebdo(); afficherHistorique(); if(document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
}

function ouvrirModalDuplication() {
    if(!idEleveCourant || eleves[idEleveCourant].planHebdo.length === 0) { showToast("Le plan de l'élève est vide.", "error"); return; }
    document.getElementById('nomEleveSourceDupli').innerText = eleves[idEleveCourant].nom; let html = ''; let elevesTries = getElevesTries();
    elevesTries.forEach(e => { if(e.id !== idEleveCourant) { html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}</label>`; } });
    document.getElementById('listeElevesDupli').innerHTML = html; document.getElementById('modalDupliquer').style.display = 'flex';
}

function validerDuplication() {
    if(!idEleveCourant) return; const planSource = eleves[idEleveCourant].planHebdo; let checks = document.querySelectorAll('.cb-dupli-eleve:checked');
    if(checks.length === 0) { showToast("Sélectionnez au moins un élève.", "error"); return; } let msgCount = 0;
    checks.forEach(cb => { const target = eleves[cb.value]; planSource.forEach(idAct => { if (!target.planHebdo.includes(idAct) && !target.historique.some(h=>h.idActivite === idAct) && target.planHebdo.length < (target.maxAteliers||15)) { target.planHebdo.push(idAct); msgCount++; } }); });
    sauvegarderEleves(); document.getElementById('modalDupliquer').style.display = 'none'; rafraichirDashboard(); showToast(`${msgCount} activités ajoutées en tout.`, "success");
}

let activiteAssignationEnCours = null;
function assignerActivite(idActivite) {
    activiteAssignationEnCours = idActivite; let act = baseDonnees.find(a => a.id === idActivite); if (!act) return;
    document.getElementById('nomActiviteAssign').innerText = act.ressource; let html = ''; let elevesTries = getElevesTries();
    elevesTries.forEach(e => { let disabled = (e.planHebdo.includes(idActivite) || e.historique.some(h => h.idActivite === idActivite)) ? "disabled checked" : ""; let color = disabled ? "color: #95a5a6; text-decoration: line-through;" : ""; html += `<label style="cursor:pointer; font-size:14px; ${color}"><input type="checkbox" class="cb-assign-eleve" value="${e.id}" ${disabled}> [${e.niveau}] ${escHTML(e.nom)}</label>`; });
    document.getElementById('listeElevesAssign').innerHTML = html; document.getElementById('modalAssigner').style.display = 'flex';
}

function validerAssignationMultiple() {
    if (!activiteAssignationEnCours) return; let checks = document.querySelectorAll('.cb-assign-eleve:checked:not(:disabled)');
    if (checks.length === 0) { document.getElementById('modalAssigner').style.display = 'none'; return; } let count = 0;
    checks.forEach(cb => { let e = eleves[cb.value]; if (e.planHebdo.length < (e.maxAteliers || 15)) { e.planHebdo.push(activiteAssignationEnCours); count++; } });
    sauvegarderEleves(); document.getElementById('modalAssigner').style.display = 'none'; rafraichirDashboard(); if(idEleveCourant) afficherPlanHebdo(); showToast(`Activité assignée à ${count} élève(s).`, "success");
}

function commencerNouvelleSemaine() {
    if(!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if(confirm(`Voulez-vous commencer une nouvelle semaine pour ${eleve.nom} ?\n\nCela va vider le plan actuel et transférer automatiquement les activités en attente dans le nouveau plan.`)) {
        eleve.planHebdo = [...(eleve.enAttente || [])]; eleve.enAttente = []; eleve.valides = {}; eleve.priorites = [];
        dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_')); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Nouvelle semaine initialisée !", "success");
    }
}

function basculerPriorite(idActivite) {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if (!eleve.priorites) eleve.priorites = []; let idx = eleve.priorites.indexOf(idActivite);
    if (idx > -1) { eleve.priorites.splice(idx, 1); } else { eleve.priorites.push(idActivite); } sauvegarderEleves(); afficherPlanHebdo();
}

// ==========================================
// 5. VALIDATIONS ET AFFICHAGE DU PLAN HEBDO
// ==========================================
function cocherToutPlan(source) { document.querySelectorAll('.cb-plan-valider:not(:disabled)').forEach(cb => cb.checked = source.checked); }

function validerSelectionPlan() {
    if(!idEleveCourant) return; const checks = document.querySelectorAll('.cb-plan-valider:checked:not(:disabled)');
    if(checks.length === 0) { showToast("Cochez au moins une activité.", "error"); return; }
    checks.forEach(cb => { marquerCommeValideSansRafraichir(cb.value, eleves[idEleveCourant]); });
    sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard(); showToast("Sélection validée !", "success");
}

function estActiviteTablette(act) {
    if (!act || !act.typeRes) return false; let tName = act.typeRes.trim().toLowerCase();
    for (let k in imagesParType) { if (k.trim().toLowerCase() === tName) { let cfg = imagesParType[k]; return (typeof cfg === 'object' && cfg.isTablette === true); } } return false;
}

function marquerCommeValideSansRafraichir(idActivite, eleve) {
    const act = baseDonnees.find(b => b.id === idActivite); if(!act) return; const dateValid = new Date().toLocaleDateString('fr-FR');
    if(!eleve.valides) eleve.valides = {}; eleve.valides[idActivite] = dateValid;

    if (act.estEvaluation) {
        let niveauxAct = (act.niveau || "").toUpperCase().split(/[,/]+/).map(x => x.trim());
        const toutesMemeComp = baseDonnees.filter(b => {
            let memeMatiere = (b.matiere || "").trim().toLowerCase() === (act.matiere || "").trim().toLowerCase();
            let memeComp = (b.competence || "").trim().toLowerCase() === (act.competence || "").trim().toLowerCase();
            let niveauxB = (b.niveau || "").toUpperCase().split(/[,/]+/).map(x => x.trim());
            return memeMatiere && memeComp && niveauxAct.some(n => niveauxB.includes(n));
        });
        toutesMemeComp.forEach(b => {
            if(!eleve.historique.some(h => h.idActivite === b.id)) { eleve.historique.push({ idActivite: b.id, date: dateValid }); }
            eleve.valides[b.id] = dateValid; if(eleve.suivi && eleve.suivi[b.id]) delete eleve.suivi[b.id]; 
        });
    } else {
        if(!eleve.historique.some(h => h.idActivite === idActivite)) { eleve.historique.push({ idActivite: idActivite, date: dateValid }); }
        if(eleve.suivi && eleve.suivi[idActivite]) delete eleve.suivi[idActivite]; 
    }
}

function annulerValidationPlan(idActivite) {
    if(!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if(eleve.valides && eleve.valides[idActivite]) { delete eleve.valides[idActivite]; eleve.historique = eleve.historique.filter(h => h.idActivite !== idActivite); sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); rafraichirDashboard(); }
}

function annulerAttente(idActivite) {
    if(!idEleveCourant) return; let e = eleves[idEleveCourant]; let idx = e.enAttente.indexOf(idActivite);
    if(idx > -1) { e.enAttente.splice(idx, 1); e.planHebdo.push(idActivite); if (e.suivi && e.suivi[idActivite]) { e.suivi[idActivite].statut = ''; e.suivi[idActivite].commentaire = ''; } sauvegarderEleves(); afficherPlanHebdo(); rafraichirDashboard(); }
}

function validerDirectement(idActivite) { if(!idEleveCourant) return; marquerCommeValideSansRafraichir(idActivite, eleves[idEleveCourant]); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Activité validée !", "success"); }
function masquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant]; const max = eleve.maxAteliers || 15;
    if (eleve.planHebdo.length >= max) { showToast(`⚠️ Limite maximale atteinte.`, "error"); return; }
    const actAjoutee = baseDonnees.find(b => b.id === idActivite);
    if (actAjoutee && estActiviteTablette(actAjoutee)) { let maxTab = eleve.maxTablettes ?? 2; let nbTabActuels = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length; if (nbTabActuels >= maxTab) { showToast(`🚫 Limite atteinte : ${maxTab} atelier(s) tablette(s) max pour cet élève.`, "error"); return; } }
    eleve.planHebdo.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Ajouté au plan !");
}

function retirerDuPlan(idActivite) { 
    let e = eleves[idEleveCourant]; let idx = e.planHebdo.indexOf(idActivite); 
    if(idx > -1) { e.planHebdo.splice(idx, 1); } else { idx = e.enAttente.indexOf(idActivite); if (idx > -1) e.enAttente.splice(idx, 1); }
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite]; if (e.valides && e.valides[idActivite]) delete e.valides[idActivite];
    sauvegarderEleves(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré du plan.");
}

function desarchiverActivite(idActivite) {
    if(!idEleveCourant) return;
    if(confirm("Annuler la validation de l'historique ?")) { const eleve = eleves[idEleveCourant]; const index = eleve.historique.findIndex(h => h.idActivite === idActivite); if(index > -1) { eleve.historique.splice(index, 1); sauvegarderEleves(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard();} }
}

function afficherPlanHebdo() {
    const eleve = eleves[idEleveCourant]; const tbodyApercu = document.getElementById('tableApercuPlan'); if(!tbodyApercu) return; tbodyApercu.innerHTML = '';
    document.getElementById('compteurAteliersEleve').innerText = eleve.planHebdo.length; document.getElementById('maxAteliersAffiche').innerText = eleve.maxAteliers || 15;
    let nbTabCount = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length; let compteurTabElem = document.getElementById('compteurTablettesEleve'); if(compteurTabElem) compteurTabElem.innerText = `${nbTabCount}/${eleve.maxTablettes ?? 2}`;

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || []);

    planObjects.forEach((a, index) => {
        const num = index + 1; let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : ''); let isPrio = (eleve.priorites && eleve.priorites.includes(a.id));
        let prioStar = isPrio ? "⭐" : "☆"; let prioStyle = isPrio ? "color: #f1c40f;" : "color: #bdc3c7;";
        
        let suiviHtml = '';
        if (eleve.suivi && eleve.suivi[a.id]) {
            let s = eleve.suivi[a.id]; let infoCommentaire = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
            if (s.statut === 'a_revoir') suiviHtml = `<br><span style="color:#c0392b; font-size:12px; font-weight:bold;">⚠️ À revoir avec maitresse</span>${infoCommentaire}`;
            if (s.statut === 'a_refaire') suiviHtml = `<br><span style="color:#d35400; font-size:12px; font-weight:bold;">🔄 À refaire seul</span>${infoCommentaire}`;
        }

        let actionHtml = estValide ? `<span style="color:#27ae60; font-weight:bold; font-size:12px;">✅ Fini</span><br><button type="button" class="btn-remove" style="width: 100%; margin-top:3px;" onclick="annulerValidationPlan('${a.id}')">↩️ Défaire</button>` : `<button type="button" class="btn-valid" style="width: 100%; margin-bottom: 5px;" onclick="validerDirectement('${a.id}')">🏁 Fini</button><button type="button" class="btn-remove" style="width: 100%;" onclick="retirerDuPlan('${a.id}')">❌ Retirer</button>`;

        tbodyApercu.innerHTML += `<tr class="${rowClass}">
            <td style="text-align:center;"><input type="checkbox" class="cb-plan-valider" value="${a.id}" ${estValide ? 'checked disabled' : ''} style="transform: scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center; cursor:pointer;" class="badge-prio" onclick="basculerPriorite('${a.id}')" style="${prioStyle}">${prioStar}</td>
            <td class="col-num">${num}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td><td><strong>${escHTML(a.ressource)}</strong> ${badge} ${suiviHtml}</td>
            <td>${actionHtml}</td>
        </tr>`;
    });
    if(eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="7" style="text-align:center;">Le plan est vide.</td></tr>';

    if (eleve.enAttente && eleve.enAttente.length > 0) {
        tbodyApercu.innerHTML += `<tr><td colspan="7" style="background:#f39c12; color:white; font-weight:bold; text-align:center; padding:10px; font-size:14px;">⏳ LISTE D'ATTENTE (À revoir / À refaire)</td></tr>`;
        let attenteObjects = getListeTrie(eleve.enAttente);
        attenteObjects.forEach((a) => {
            let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let suiviHtml = '';
            if (eleve.suivi && eleve.suivi[a.id]) {
                let s = eleve.suivi[a.id]; let infoCommentaire = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
                if (s.statut === 'a_revoir') suiviHtml = `<br><span style="color:#c0392b; font-size:12px; font-weight:bold;">⚠️ À revoir avec maitresse</span>${infoCommentaire}`;
                if (s.statut === 'a_refaire') suiviHtml = `<br><span style="color:#d35400; font-size:12px; font-weight:bold;">🔄 À refaire seul</span>${infoCommentaire}`;
            }
            let actionHtml = `<button type="button" class="btn-hide" style="width: 100%;" onclick="annulerAttente('${a.id}')">↩ Remettre au plan actuel</button>`;
            tbodyApercu.innerHTML += `<tr style="background:#fef5e7;"><td style="text-align:center;">⏸️</td><td style="text-align:center;">-</td><td class="col-num">-</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td><td><strong>${escHTML(a.ressource)}</strong> ${badge} ${suiviHtml}</td><td>${actionHtml}</td></tr>`;
        });
    }
}

function afficherHistorique() {
    const eleve = eleves[idEleveCourant]; const tbodyHist = document.getElementById('tableHistorique'); const tbodyMasq = document.getElementById('tableMasquees'); if(!tbodyHist || !tbodyMasq) return; tbodyHist.innerHTML = ''; tbodyMasq.innerHTML = '';
    [...eleve.historique].reverse().forEach(hist => { const a = baseDonnees.find(b => b.id === hist.idActivite); if(a) tbodyHist.innerHTML += `<tr><td><strong>${hist.date}</strong></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="desarchiverActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Restaurer</button></td></tr>`; });
    if(eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun historique.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if(a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="demasquerActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Réintégrer</button></td></tr>`; });
    if(eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune activité masquée.</td></tr>';
}

function afficherRessourcesDisponibles() {
    const niveau = document.getElementById('selectNiveau').value; const periode = document.getElementById('selectPeriode').value; const matiere = document.getElementById('selectMatiere').value;
    const sequence = document.getElementById('selectSequence').value; const zoneRessources = document.getElementById('zoneRessources'); const tbody = document.getElementById('tableRessourcesDispo');
    if(!sequence || !idEleveCourant) { if(zoneRessources) zoneRessources.style.display = 'none'; return; }
    if(zoneRessources) zoneRessources.style.display = 'block'; if(tbody) tbody.innerHTML = '';
    
    const eleve = eleves[idEleveCourant];
    let activites = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere && a.sequence === sequence);
    if(periode) { activites = activites.filter(a => { let key = a.matiere + "|" + a.competence; return programmations[key] && programmations[key].includes(periode); }); }
    
    const idsHistorique = eleve.historique.map(h => h.idActivite); let nbAffichees = 0;
    activites.forEach(a => {
        if(idsHistorique.includes(a.id)) return; if(eleve.masquees && eleve.masquees.includes(a.id)) return; if(eleve.planHebdo.includes(a.id)) return; if(eleve.enAttente && eleve.enAttente.includes(a.id)) return;
        nbAffichees++; let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Évaluation</span>` : ''; let rowClass = a.estEvaluation ? 'row-eval' : '';
        tbody.innerHTML += `<tr class="${rowClass}"><td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td><td><strong>${escHTML(a.ressource)}</strong> <br><span style="font-size:11px; color:#7f8c8d;">(${escHTML(a.typeRes)} Atelier: ${escHTML(a.symbole)})</span> ${badge}</td><td style="text-align: right; width: 260px;"><button type="button" class="btn-add" onclick="ajouterAuPlan('${a.id}')">➕ Plan</button> <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')">🏁 Fini</button> <button type="button" class="btn-hide" onclick="masquerActivite('${a.id}')">🚫 Masq</button></td></tr>`;
    });
    if(nbAffichees === 0) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#7f8c8d;">Toutes les activités ont été faites ou sont dans le plan.</td></tr>';
}

// ==========================================
// 6. PROGRAMMATION ANNUELLE
// ==========================================
function initProgFilters() {
    let selectNiv = document.getElementById('progNiveau'); let selectMat = document.getElementById('progMatiere'); if(!selectNiv || !selectMat) return;
    let niveauxExistants = new Set(); baseDonnees.forEach(a => { if(a.niveau) a.niveau.split(/[,/]+/).forEach(x => niveauxExistants.add(x.trim().toUpperCase())); });
    let nivs = Array.from(niveauxExistants).filter(n => n); const ordreNiveaux = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    nivs.sort((a,b) => (ordreNiveaux[a] || 99) - (ordreNiveaux[b] || 99));
    let htmlNiv = '<option value="">-- Tous les niveaux --</option>'; nivs.forEach(n => htmlNiv += `<option value="${n}">${n}</option>`); let oldNiv = selectNiv.value; selectNiv.innerHTML = htmlNiv; selectNiv.value = oldNiv;
    let mats = [...new Set(baseDonnees.map(a => a.matiere))].filter(m => m).sort();
    let htmlMat = '<option value="">-- Toutes les matières --</option>'; mats.forEach(m => htmlMat += `<option value="${m}">${m}</option>`); let oldMat = selectMat.value; selectMat.innerHTML = htmlMat; selectMat.value = oldMat;
}

function afficherProgrammation() {
    let niv = document.getElementById('progNiveau').value; let mat = document.getElementById('progMatiere').value; let tbody = document.getElementById('tableProg'); if(!tbody) return;
    let activitesFiltrees = baseDonnees;
    if(niv) activitesFiltrees = activitesFiltrees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niv));
    if(mat) activitesFiltrees = activitesFiltrees.filter(a => a.matiere === mat);
    
    let clesUniques = new Map();
    activitesFiltrees.forEach(a => { let key = a.matiere + "|" + a.sequence + "|" + a.competence; if(!clesUniques.has(key)) { clesUniques.set(key, { matiere: a.matiere, sequence: a.sequence, competence: a.competence }); } });
    let listeItems = Array.from(clesUniques.values()).sort((a,b) => { if(a.matiere !== b.matiere) return a.matiere.localeCompare(b.matiere); if(a.sequence !== b.sequence) return a.sequence.localeCompare(b.sequence); return a.competence.localeCompare(b.competence); });
    
    let html = ''; let derniereMat = "";
    listeItems.forEach(item => {
        if(item.matiere !== derniereMat) { html += `<tr style="background:#eaeded;"><td colspan="7" style="font-size:14px; padding:12px;"><strong>📚 ${escHTML(item.matiere)}</strong></td></tr>`; derniereMat = item.matiere; }
        let progKey = item.matiere + "|" + item.competence; let progs = programmations[progKey] || [];
        html += `<tr>
            <td>${escHTML(item.sequence)}</td><td>${escHTML(item.competence)}</td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P1', this.checked)" ${progs.includes('P1') ? 'checked' : ''} style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P2', this.checked)" ${progs.includes('P2') ? 'checked' : ''} style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P3', this.checked)" ${progs.includes('P3') ? 'checked' : ''} style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P4', this.checked)" ${progs.includes('P4') ? 'checked' : ''} style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P5', this.checked)" ${progs.includes('P5') ? 'checked' : ''} style="transform:scale(1.2);"></td>
        </tr>`;
    });
    if(listeItems.length === 0) html = '<tr><td colspan="7" style="text-align:center;">Aucune compétence trouvée.</td></tr>';
    tbody.innerHTML = html;
}

function toggleProg(matiere, competence, periode, isChecked) {
    let key = matiere + "|" + competence; if(!programmations[key]) programmations[key] = [];
    if(isChecked) { if(!programmations[key].includes(periode)) programmations[key].push(periode); } else { programmations[key] = programmations[key].filter(p => p !== periode); }
    sauvegarderProgrammations();
}

// ==========================================
// 7. DASHBOARD, ÉVALUATION ET MATRICE
// ==========================================
function toggleExpandDashboard(idEleve) { if(dashboardExpanded.has(idEleve)) dashboardExpanded.delete(idEleve); else dashboardExpanded.add(idEleve); rafraichirDashboard(); }

function setSuivi(idEleve, idAct, statut) {
    let e = eleves[idEleve]; if(!e.suivi) e.suivi = {}; if(!e.enAttente) e.enAttente = []; if(!e.suivi[idAct]) e.suivi[idAct] = { statut: '', commentaire: '' };
    if(e.suivi[idAct].statut === statut) {
        if(confirm("Voulez-vous retirer ce statut et remettre l'activité dans le plan actuel ?")) { e.suivi[idAct].statut = ''; e.suivi[idAct].commentaire = ''; let idx = e.enAttente.indexOf(idAct); if (idx > -1) { e.enAttente.splice(idx, 1); e.planHebdo.push(idAct); } } 
        else { let result = prompt("Modifier le commentaire ou la note :", e.suivi[idAct].commentaire || ''); if(result !== null) e.suivi[idAct].commentaire = result.trim(); }
    } else {
        let actionName = statut === 'a_revoir' ? "À revoir avec la maitresse" : "À refaire seul"; let result = prompt(`[${actionName}]\nL'activité sera retirée du plan et mise en attente.\nAjouter une note :`, e.suivi[idAct].commentaire || '');
        if(result !== null) { e.suivi[idAct].statut = statut; e.suivi[idAct].commentaire = result.trim(); let idx = e.planHebdo.indexOf(idAct); if (idx > -1) { e.planHebdo.splice(idx, 1); if (!e.enAttente.includes(idAct)) e.enAttente.push(idAct); } }
    }
    sauvegarderEleves(); rafraichirDashboard(); if (idEleveCourant === idEleve) afficherPlanHebdo();
}

function validerDepuisDashboard(idEleve, idAct) { marquerCommeValideSansRafraichir(idAct, eleves[idEleve]); sauvegarderEleves(); rafraichirDashboard(); showToast("Validé !", "success"); if (idEleveCourant === idEleve) { afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); } }

function archiverItem(cle) { if (!dashboardArchives.includes(cle)) { dashboardArchives.push(cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); showToast("Archivé", "success"); } }
function restaurerArchive(cle) { dashboardArchives = dashboardArchives.filter(k => k !== cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); showToast("Restauré", "success"); }
function viderArchives() { if (confirm("Supprimer définitivement toutes les archives ?")) { dashboardArchives = []; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); } }
function toggleAfficherArchives() { afficherArchivesMode = !afficherArchivesMode; let zone = document.getElementById('zoneArchivesDashboard'); let btn = document.getElementById('btnToggleArchives'); if(zone) zone.style.display = afficherArchivesMode ? 'block' : 'none'; if(btn) btn.innerText = afficherArchivesMode ? "📂 Masquer les archives" : `📂 Voir les archives (${dashboardArchives.length})`; }

function rafraichirDashboard() {
    let groupes = {}; let tabletteGroupes = {}; 
    Object.values(eleves).forEach(e => {
        if(!e.suivi) e.suivi = {}; if(!e.enAttente) e.enAttente = []; let allActiveActivities = [...e.planHebdo, ...e.enAttente];
        allActiveActivities.forEach(idAct => {
            let act = baseDonnees.find(b => b.id === idAct);
            if (act && estActiviteTablette(act)) { let cleTabArchive = `tablette_${idAct}`; if (!dashboardArchives.includes(cleTabArchive)) { if (!tabletteGroupes[idAct]) tabletteGroupes[idAct] = { act: act, eleves: [] }; if (!tabletteGroupes[idAct].eleves.includes(e.nom)) tabletteGroupes[idAct].eleves.push(e.nom); } }
            let s = e.suivi[idAct];
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire')) { let cleArchive = `${e.id}_${idAct}_${s.statut}`; if (!dashboardArchives.includes(cleArchive)) { if (!groupes[idAct]) groupes[idAct] = { a_revoir: [], a_refaire: [] }; groupes[idAct][s.statut].push({ eleve: e, commentaire: s.commentaire }); } }
        });
    });

    let memoHtml = '';
    for (let idAct in groupes) {
        let act = baseDonnees.find(a => a.id === idAct); if (!act) continue; let title = `<strong>${escHTML(act.niveau)} ${escHTML(act.matiere)}</strong> - ${escHTML(act.competence)} (<em>${escHTML(act.ressource)}</em>)`;
        groupes[idAct].a_revoir.forEach(x => { let cle = `${x.eleve.id}_${idAct}_a_revoir`; memoHtml += `<div style="background:#fdedec; border-left:4px solid #e74c3c; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>👩‍🏫 <strong>Atelier Dirigé (À revoir) :</strong> ${title} ➔ Avec : <strong>${escHTML(x.eleve.nom)}</strong> ${x.commentaire ? `(💬 ${escHTML(x.commentaire)})` : ''}</div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#c0392b;"><input type="checkbox" onchange="archiverItem('${cle}')"> Archiver</label></div>`; });
        groupes[idAct].a_refaire.forEach(x => { let cle = `${x.eleve.id}_${idAct}_a_refaire`; memoHtml += `<div style="background:#fef5e7; border-left:4px solid #f39c12; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>🔄 <strong>À refaire seul :</strong> ${title} ➔ Avec : <strong>${escHTML(x.eleve.nom)}</strong> ${x.commentaire ? `(💬 ${escHTML(x.commentaire)})` : ''}</div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#d35400;"><input type="checkbox" onchange="archiverItem('${cle}')"> Archiver</label></div>`; });
    }
    let memoDiv = document.getElementById('memoListContent'); if(memoDiv) memoDiv.innerHTML = memoHtml || '<p style="color:#7f8c8d; font-style:italic;">Aucun groupe de besoin en attente.</p>';

    let tabletteHtml = '';
    for (let idAct in tabletteGroupes) {
        let item = tabletteGroupes[idAct]; let cleTab = `tablette_${idAct}`;
        tabletteHtml += `<div style="background:#eaf2f8; border-left:4px solid #2980b9; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>💻 <strong>${escHTML(item.act.niveau)} ${escHTML(item.act.matiere)}</strong> - ${escHTML(item.act.competence)} (<em>${escHTML(item.act.ressource)}</em>)<br><span style="font-size:13px;">👥 <strong>${item.eleves.length} élève(s) :</strong> ${escHTML(item.eleves.sort().join(', '))}</span></div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#2980b9;"><input type="checkbox" onchange="archiverItem('${cleTab}')"> Archiver</label></div>`;
    }
    let tabDiv = document.getElementById('tabletteListContent'); if(tabDiv) tabDiv.innerHTML = tabletteHtml || '<p style="color:#7f8c8d; font-style:italic;">Aucun atelier tablette en cours.</p>';

    let archiveHtml = '';
    dashboardArchives.forEach(cle => {
        if (cle.startsWith('tablette_') || cle.startsWith('anton_')) { let idClean = cle.replace('tablette_', '').replace('anton_', ''); let act = baseDonnees.find(a => a.id === idClean); if (act) archiveHtml += `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid #eee;"><span>💻 Tablette - <strong>${escHTML(act.matiere)}</strong> (${escHTML(act.ressource)})</span><button onclick="restaurerArchive('${cle}')" style="background:#27ae60; color:white; border:none; border-radius:3px;">↩️</button></div>`; } 
        else { let parts = cle.split('_'); let e = eleves[parts[0]]; let act = baseDonnees.find(a => a.id === parts[1]); if (e && act) archiveHtml += `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid #eee;"><span>${parts[2] === 'a_revoir' ? '👩‍🏫 Revoir' : '🔄 Refaire'} - <strong>${escHTML(e.nom)}</strong> : ${escHTML(act.matiere)} (${escHTML(act.ressource)})</span><button onclick="restaurerArchive('${cle}')" style="background:#27ae60; color:white; border:none; border-radius:3px;">↩️</button></div>`; }
    });
    let archList = document.getElementById('listeArchivesContent'); if(archList) archList.innerHTML = archiveHtml || '<p style="font-size:12px; color:#7f8c8d; font-style:italic;">Aucune archive.</p>';
    let btnToggle = document.getElementById('btnToggleArchives'); if(btnToggle) btnToggle.innerText = afficherArchivesMode ? "📂 Masquer les archives" : `📂 Voir les archives (${dashboardArchives.length})`;

    const tbody = document.getElementById('tableDashboard'); if(!tbody) return; let html = ''; let listeEleves = getElevesTries();
    if(listeEleves.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun élève enregistré.</td></tr>'; return; }

    listeEleves.forEach(e => {
        let currentPlanLen = e.planHebdo ? e.planHebdo.length : 0; let max = e.maxAteliers || 15; let pct = Math.min(100, Math.round((currentPlanLen / max) * 100)); let colorBar = pct >= 100 ? "#e74c3c" : (pct > 75 ? "#f39c12" : "#27ae60"); let btnExpand = `<button type="button" class="btn-action" style="padding:6px 12px;" onclick="toggleExpandDashboard('${e.id}')">Évaluer ⬇️</button>`;
        let planObjectsTries = getListeTrie([...e.planHebdo, ...(e.enAttente || [])], e.priorites || []);
        let planMiniHtml = '<table style="width:100%; font-size:12px; background:#fdfefe; margin-top:5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        
        planObjectsTries.forEach((act, idx) => {
            let idAct = act.id; let s = e.suivi[idAct] || {}; let isAttente = (e.enAttente || []).includes(idAct);
            let styleRefaire = s.statut === 'a_refaire' ? 'background:#f39c12; color:white;' : 'background:#ecf0f1; color:#333;'; let styleRevoir = s.statut === 'a_revoir' ? 'background:#e74c3c; color:white;' : 'background:#ecf0f1; color:#333;';
            let infoC = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : ''; let attenteTag = isAttente ? `<br><span style="color:#e67e22; font-size:11px; font-weight:bold;">⏳ En attente</span>` : '';
            planMiniHtml += `<tr><td style="width:25px; font-weight:bold; text-align:center; color:#e74c3c;">#${idx+1}</td><td><strong>${escHTML(act.matiere)}</strong> - ${escHTML(act.competence)}<br><span style="color:#7f8c8d;">${escHTML(act.ressource)}</span>${infoC}${attenteTag}</td><td style="text-align:right; white-space:nowrap;"><button class="dashboard-eval-btn" style="${styleRefaire}" onclick="setSuivi('${e.id}', '${idAct}', 'a_refaire')">🔄 À refaire</button> <button class="dashboard-eval-btn" style="${styleRevoir}" onclick="setSuivi('${e.id}', '${idAct}', 'a_revoir')">👩‍🏫 À revoir</button> <button class="dashboard-eval-btn" style="background:#27ae60; color:white;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">✅ Valider</button></td></tr>`;
        });
        if(planObjectsTries.length === 0) planMiniHtml += '<tr><td colspan="3" style="text-align:center; padding:15px;">Plan vide.</td></tr>'; planMiniHtml += '</table>';
        html += `<tr style="border-top: 2px solid #ecf0f1;"><td style="font-size:16px;"><strong>[${e.niveau}] ${escHTML(e.nom)}</strong></td><td><div class="jauge-container"><div class="jauge-fill" style="width: ${pct}%; background-color: ${colorBar};"></div></div><div class="jauge-text">${currentPlanLen} ateliers en cours sur ${max} max</div></td><td style="text-align: center;">${btnExpand}</td></tr><tr id="dash_details_${e.id}" style="${dashboardExpanded.has(e.id) ? '' : 'display:none;'} background:#f2f4f4;"><td colspan="3" style="padding:15px;">${planMiniHtml}</td></tr>`;
    });
    tbody.innerHTML = html; genererMatriceCompetences();
}

function genererMatriceCompetences() {
    const table = document.getElementById('tableMatrice'); if (!table) return; let listeEleves = getElevesTries(); if (listeEleves.length === 0 || baseDonnees.length === 0) { table.innerHTML = "<tr><td>Aucune donnée pour la matrice.</td></tr>"; return; }
    let compsSet = new Set(); listeEleves.forEach(e => { e.historique.forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if (act && act.competence) compsSet.add(act.competence); }); }); let competences = Array.from(compsSet).sort((a,b) => a.localeCompare(b, 'fr'));
    let html = `<thead><tr><th>Élèves \\ Compétences</th>`; competences.forEach(c => { html += `<th><div style="writing-mode: vertical-rl; transform: rotate(180deg); max-height: 120px; margin: auto;">${escHTML(c)}</div></th>`; }); html += `</tr></thead><tbody>`;
    listeEleves.forEach(e => { html += `<tr><td>[${e.niveau}] ${escHTML(e.nom)}</td>`; competences.forEach(c => { let actValidee = e.historique.find(h => { let act = baseDonnees.find(b => b.id === h.idActivite); return act && act.competence === c; }); if (actValidee) { html += `<td style="background-color: #27ae60; color: white; font-weight:bold;" title="Validé le ${actValidee.date}">V</td>`; } else { html += `<td style="background-color: #ecf0f1; color: #bdc3c7;">-</td>`; } }); html += `</tr>`; });
    html += `</tbody>`; table.innerHTML = html;
}

function changerBilanEval(idEleve, idAct, valeur) { let eleve = eleves[idEleve]; if(!eleve) return; if(!eleve.bilanEvaluations) eleve.bilanEvaluations = {}; eleve.bilanEvaluations[idAct] = valeur; sauvegarderEleves(); }

function genererBilanEleve() {
    let selectBilan = document.getElementById('selectEleveBilan'); let zone = document.getElementById('zoneBilanPrint'); if (!selectBilan || !zone) return; let idEleve = selectBilan.value;
    if (!idEleve || idEleve === "TOUS_ELEVES") { zone.innerHTML = '<h3 style="text-align: center; color: #7f8c8d; margin-top: 50px;">Sélectionnez un seul élève pour voir son bilan des évaluations.</h3>'; return; }
    let eleve = eleves[idEleve]; let evalActs = [];
    if(eleve.historique && Array.isArray(eleve.historique)) { eleve.historique.forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if(act && act.estEvaluation) { evalActs.push({ act: act, date: h.date }); } }); }
    if (evalActs.length === 0) { zone.innerHTML = `<h3 style="color:#2c3e50;">Bilan des évaluations - [${eleve.niveau}] ${escHTML(eleve.nom)}</h3><p>Aucune évaluation validée pour le moment.</p>`; return; }

    let html = `<div style="border-bottom: 2px solid #9b59b6; padding-bottom: 10px; margin-bottom: 20px;"><h2 style="margin:0; color:#2c3e50;">Bilan des Évaluations : [${eleve.niveau}] ${escHTML(eleve.nom)}</h2><p style="margin:5px 0 0 0; color:#7f8c8d; font-size:14px;">Généré le ${new Date().toLocaleDateString('fr-FR')}</p></div>`;
    let groupes = {}; evalActs.forEach(item => { let mat = item.act.matiere || "Autre"; if (!groupes[mat]) groupes[mat] = []; groupes[mat].push(item); });

    Object.keys(groupes).sort().forEach(mat => {
        html += `<h3 style="color:#9b59b6; margin-top:20px; border-bottom:1px solid #bdc3c7;">${escHTML(mat)}</h3><table style="width:100%; font-size:13px; margin-bottom:15px;"><thead><tr><th>Compétence / Évaluation</th><th style="width:100px; text-align:center;">Date</th><th style="width:140px; text-align:center;">Position (A / PA / NA)</th></tr></thead><tbody>`;
        groupes[mat].forEach(item => {
            let actId = item.act.id; let currentVal = (eleve.bilanEvaluations && eleve.bilanEvaluations[actId]) ? eleve.bilanEvaluations[actId] : "";
            let btnA = `background: ${currentVal === 'A' ? '#27ae60' : '#ecf0f1'}; color: ${currentVal === 'A' ? 'white' : '#333'};`; let btnPA = `background: ${currentVal === 'PA' ? '#f39c12' : '#ecf0f1'}; color: ${currentVal === 'PA' ? 'white' : '#333'};`; let btnNA = `background: ${currentVal === 'NA' ? '#e74c3c' : '#ecf0f1'}; color: ${currentVal === 'NA' ? 'white' : '#333'};`;
            html += `<tr><td><strong>${escHTML(item.act.competence)}</strong><br><span style="font-size:11px; color:#7f8c8d;">${escHTML(item.act.ressource)}</span></td><td style="text-align:center; font-size:11px;">${item.date}</td><td style="text-align:center; white-space:nowrap;" class="no-print-eval"><button type="button" style="${btnA} border:1px solid #bdc3c7; border-radius:3px; padding:4px 8px; font-weight:bold; cursor:pointer;" onclick="changerBilanEval('${eleve.id}', '${actId}', 'A'); genererBilanEleve();" title="Acquis">A</button> <button type="button" style="${btnPA} border:1px solid #bdc3c7; border-radius:3px; padding:4px 8px; font-weight:bold; cursor:pointer;" onclick="changerBilanEval('${eleve.id}', '${actId}', 'PA'); genererBilanEleve();" title="Partiellement Acquis">PA</button> <button type="button" style="${btnNA} border:1px solid #bdc3c7; border-radius:3px; padding:4px 8px; font-weight:bold; cursor:pointer;" onclick="changerBilanEval('${eleve.id}', '${actId}', 'NA'); genererBilanEleve();" title="Non Acquis">NA</button></td><td style="text-align:center; font-weight:bold; display:none;" class="print-eval-text">${currentVal || '-'}</td></tr>`;
        });
        html += `</tbody></table>`;
    });
    html += `<div style="margin-top: 40px; border: 1px solid #bdc3c7; border-radius: 8px; padding: 15px; height: 100px;"><p style="margin:0; font-weight:bold; color:#34495e;">Légende : <strong>A</strong> (Acquis) | <strong>PA</strong> (Partiellement Acquis) | <strong>NA</strong> (Non Acquis)</p><p style="margin:10px 0 0 0; font-weight:bold; color:#34495e;">Commentaires de l'enseignant :</p></div>`;
    zone.innerHTML = html;
}

// ==========================================
// 8. FILTRES DB, CASCADES & FORMULAIRES DB
// ==========================================
function initNiveaux() {
    const selectNiveau = document.getElementById('selectNiveau'); if(!selectNiveau) return;
    let niveauxExistants = [...new Set(baseDonnees.map(a => a.niveau))].filter(n => n); let niveauxSimples = new Set();
    niveauxExistants.forEach(n => { n.split(/[,/]+/).map(x => x.trim().toUpperCase()).forEach(x => { if(x) niveauxSimples.add(x); }); });
    let niveauxFinaux = Array.from(niveauxSimples); const ordreNiveaux = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    niveauxFinaux.sort((a, b) => { let vA = ordreNiveaux[a.toUpperCase()] || 99; let vB = ordreNiveaux[b.toUpperCase()] || 99; return vA !== vB ? vA - vB : a.localeCompare(b); });
    let html = '<option value="">-- Choix --</option>'; niveauxFinaux.forEach(n => { html += `<option value="${escHTML(n)}">${escHTML(n)}</option>`; });
    let currentVal = selectNiveau.value; selectNiveau.innerHTML = html; if (niveauxFinaux.includes(currentVal)) selectNiveau.value = currentVal;
    majCascadeMatiere(); majFiltresNiveaux();
}

function majCascadeMatiere() {
    const niveau = document.getElementById('selectNiveau').value; const periode = document.getElementById('selectPeriode').value;
    const selectMatiere = document.getElementById('selectMatiere'); const selectSequence = document.getElementById('selectSequence'); if (!selectMatiere || !selectSequence) return;
    
    if(!niveau) { selectMatiere.innerHTML = '<option value="">-- --</option>'; selectMatiere.disabled = true; selectSequence.innerHTML = '<option value="">-- --</option>'; selectSequence.disabled = true; let zoneRes = document.getElementById('zoneRessources'); if(zoneRes) zoneRes.style.display = 'none'; return; }
    selectMatiere.disabled = false;
    
    let activitesFiltrees = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()));
    if(periode) { activitesFiltrees = activitesFiltrees.filter(a => { let key = a.matiere + "|" + a.competence; return programmations[key] && programmations[key].includes(periode); }); }
    
    let matieres = [...new Set(activitesFiltrees.map(a => a.matiere))].filter(m => m).sort((a,b)=>nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));
    let html = '<option value="">-- Matière --</option>'; matieres.forEach(m => { html += `<option value="${escHTML(m)}">${escHTML(m)}</option>`; });
    selectMatiere.innerHTML = html; majCascadeSequence();
}

function majCascadeSequence() {
    const niveau = document.getElementById('selectNiveau').value; const periode = document.getElementById('selectPeriode').value;
    const matiere = document.getElementById('selectMatiere').value; const selectSequence = document.getElementById('selectSequence'); if (!selectSequence) return;
    
    if(!matiere) { selectSequence.innerHTML = '<option value="">-- --</option>'; selectSequence.disabled = true; let zoneRes = document.getElementById('zoneRessources'); if(zoneRes) zoneRes.style.display = 'none'; return; }
    selectSequence.disabled = false;
    
    let activitesFiltrees = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere);
    if(periode) { activitesFiltrees = activitesFiltrees.filter(a => { let key = a.matiere + "|" + a.competence; return programmations[key] && programmations[key].includes(periode); }); }
    
    let sequences = [...new Set(activitesFiltrees.map(a => a.sequence))].filter(s => s).sort((a,b)=>a.localeCompare(b));
    let html = '<option value="">-- Séquence --</option>'; sequences.forEach(s => { html += `<option value="${escHTML(s)}">${escHTML(s)}</option>`; });
    selectSequence.innerHTML = html; afficherRessourcesDisponibles();
}

function majFiltresNiveaux() {
    const ordreNiveaux = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 }; let niveauxExtraits = new Set(); baseDonnees.forEach(a => { if(a.niveau) { a.niveau.split(/[,/]+/).forEach(n => niveauxExtraits.add(n.trim().toUpperCase())); } });
    let niveauxExistants = Array.from(niveauxExtraits).filter(n => n); ["CP", "CE1", "CE2", "CM1", "CM2"].forEach(n => { if(!niveauxExistants.includes(n)) niveauxExistants.push(n); }); niveauxExistants.sort((a, b) => { let vA = ordreNiveaux[a] || 99; let vB = ordreNiveaux[b] || 99; return vA !== vB ? vA - vB : a.localeCompare(b); });
    let dbFilters = document.getElementById('dbFilters'); if (dbFilters) { let htmlDB = `<button type="button" class="filter-btn ${filtreCourantDB === 'Tous' ? 'active' : ''}" onclick="appliquerFiltreDB('Tous')">📁 Tous</button>`; niveauxExistants.forEach(n => { htmlDB += `<button type="button" class="filter-btn ${filtreCourantDB === n ? 'active' : ''}" onclick="appliquerFiltreDB('${escJS(n)}')">📘 ${escHTML(n)}</button>`; }); dbFilters.innerHTML = htmlDB; }
    let matieresDispos = filtreCourantDB === 'Tous' ? getMatieresDisponibles() : [...new Set(baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(filtreCourantDB.toUpperCase())).map(a => a.matiere))].filter(m => m).sort((a,b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));
    let dbMatFilters = document.getElementById('dbMatiereFilters'); if (dbMatFilters) { let htmlMat = `<button type="button" class="filter-btn filter-btn-matiere ${filtreCourantMatiere === 'Toutes' ? 'active' : ''}" onclick="appliquerFiltreMatiere('Toutes')">📂 Toutes</button>`; matieresDispos.forEach(m => { htmlMat += `<button type="button" class="filter-btn filter-btn-matiere ${filtreCourantMatiere === m ? 'active' : ''}" onclick="appliquerFiltreMatiere('${escJS(m)}')">📗 ${escHTML(m)}</button>`; }); dbMatFilters.innerHTML = htmlMat; }
    let typesDisposDB = Object.keys(imagesParType).sort((a,b) => a.localeCompare(b)); let dbTypeFilters = document.getElementById('dbTypeFilters'); if (dbTypeFilters) { let htmlTypeDB = `<button type="button" class="filter-btn filter-btn-matiere ${filtreCourantTypeDB === 'Tous' ? 'active' : ''}" onclick="appliquerFiltreTypeDB('Tous')">📂 Tous</button>`; typesDisposDB.forEach(t => { htmlTypeDB += `<button type="button" class="filter-btn filter-btn-matiere ${filtreCourantTypeDB === t ? 'active' : ''}" onclick="appliquerFiltreTypeDB('${escJS(t)}')">🏷️ ${escHTML(t)}</button>`; }); dbTypeFilters.innerHTML = htmlTypeDB; }
    let etqTypeCheckboxes = document.getElementById('etqTypeCheckboxes'); if (etqTypeCheckboxes) { let htmlTypes = ''; typesDisposDB.forEach(t => { htmlTypes += `<label style="font-size: 13px; cursor: pointer;"><input type="checkbox" class="cb-type-etq" value="${escHTML(t)}" checked onchange="afficherChoixEtiquettes()"> ${escHTML(t)}</label>`; }); etqTypeCheckboxes.innerHTML = htmlTypes; }
}

function basculerTousTypes(source) { document.querySelectorAll('.cb-type-etq').forEach(cb => cb.checked = source.checked); afficherChoixEtiquettes(); }
function appliquerFiltreDB(niveau) { filtreCourantDB = niveau; filtreCourantMatiere = 'Toutes'; filtreCourantTypeDB = 'Tous'; majFiltresNiveaux(); afficherBase(); }
function appliquerFiltreMatiere(matiere) { filtreCourantMatiere = matiere; filtreCourantTypeDB = 'Tous'; majFiltresNiveaux(); afficherBase(); }
function appliquerFiltreTypeDB(type) { filtreCourantTypeDB = type; majFiltresNiveaux(); afficherBase(); }

function getMatieresDisponibles() { let niveauxCoches = getNiveauxCochesFormulaire(); let activitesFiltrees = niveauxCoches.length > 0 ? baseDonnees.filter(a => niveauxCoches.some(n => a.niveau && a.niveau.toUpperCase().includes(n.toUpperCase()))) : baseDonnees; let mats = [...new Set(activitesFiltrees.map(a => a.matiere))].filter(m => m); ["Mathématiques", "Français", "Histoire", "Géographie", "Sciences", "Anglais", "EMC", "Arts"].forEach(d => { if(!mats.includes(d)) mats.push(d); }); return mats.sort((a,b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr')); }
function getSequencesDisponibles(matiere) { let niveauxCoches = getNiveauxCochesFormulaire(); let activitesFiltrees = niveauxCoches.length > 0 ? baseDonnees.filter(a => niveauxCoches.some(n => a.niveau && a.niveau.toUpperCase().includes(n.toUpperCase()))) : baseDonnees; let seqs = (matiere && matiere !== 'AUTRE') ? [...new Set(activitesFiltrees.filter(a => a.matiere === matiere).map(a => a.sequence))].filter(s => s) : [...new Set(activitesFiltrees.map(a => a.sequence))].filter(s => s); return seqs.sort((a,b) => a.localeCompare(b)); }
function getCompetencesDisponibles(sequence) { let niveauxCoches = getNiveauxCochesFormulaire(); let activitesFiltrees = niveauxCoches.length > 0 ? baseDonnees.filter(a => niveauxCoches.some(n => a.niveau && a.niveau.toUpperCase().includes(n.toUpperCase()))) : baseDonnees; let comps = (sequence && sequence !== 'AUTRE') ? [...new Set(activitesFiltrees.filter(a => a.sequence === sequence).map(a => a.competence))].filter(c => c) : [...new Set(activitesFiltrees.map(a => a.competence))].filter(c => c); return comps.sort((a,b) => a.localeCompare(b)); }

function initialiserSelectsFormulaire() {
    const selMat = document.getElementById('addMatiereSelect'); if (!selMat) return;
    let matActuelle = selMat.value; let mats = getMatieresDisponibles(); 
    if (matActuelle && matActuelle !== 'AUTRE' && !mats.includes(matActuelle)) mats.push(matActuelle); mats.sort((a,b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));
    let htmlMat = '<option value="">-- 2. Sélectionner Matière --</option>'; mats.forEach(m => htmlMat += `<option value="${escHTML(m)}">${escHTML(m)}</option>`); htmlMat += `<option value="AUTRE">➕ Autre matière...</option>`;
    selMat.innerHTML = htmlMat; if (mats.includes(matActuelle) || matActuelle === 'AUTRE') selMat.value = matActuelle;
    surChangementMatiereForm(selMat.value); majSelectCouleursRapides();
}

function surChangementMatiereForm(valMatiere) {
    const inputCustom = document.getElementById('addMatiereCustom'); const selSeq = document.getElementById('addSequenceSelect'); if (!selSeq) return;
    let seqActuelle = selSeq.value; if(valMatiere === 'AUTRE') { if(inputCustom) { inputCustom.style.display = 'block'; inputCustom.focus(); } } else { if(inputCustom) { inputCustom.style.display = 'none'; inputCustom.value = ''; } }
    let seqs = getSequencesDisponibles(valMatiere); if (seqActuelle && seqActuelle !== 'AUTRE' && !seqs.includes(seqActuelle)) seqs.push(seqActuelle); seqs.sort((a,b) => a.localeCompare(b));
    let htmlSeq = '<option value="">-- 3. Sélectionner Séquence --</option>'; seqs.forEach(s => htmlSeq += `<option value="${escHTML(s)}">${escHTML(s)}</option>`); htmlSeq += `<option value="AUTRE">➕ Autre séquence...</option>`;
    selSeq.innerHTML = htmlSeq; if (seqs.includes(seqActuelle) || seqActuelle === 'AUTRE') selSeq.value = seqActuelle; surChangementSequenceForm(selSeq.value);
}

function surChangementSequenceForm(valSeq) {
    const inputCustom = document.getElementById('addSequenceCustom'); const selComp = document.getElementById('addCompetenceSelect'); if (!selComp) return;
    let compActuelle = selComp.value; if(valSeq === 'AUTRE') { if(inputCustom) { inputCustom.style.display = 'block'; inputCustom.focus(); } } else { if(inputCustom) { inputCustom.style.display = 'none'; inputCustom.value = ''; } }
    let comps = getCompetencesDisponibles(valSeq); if (compActuelle && compActuelle !== 'AUTRE' && !comps.includes(compActuelle)) comps.push(compActuelle); comps.sort((a,b) => a.localeCompare(b));
    let htmlComp = '<option value="">-- 5. Sélectionner Compétence --</option>'; comps.forEach(c => htmlComp += `<option value="${escHTML(c)}">${escHTML(c)}</option>`); htmlComp += `<option value="AUTRE">➕ Autre compétence...</option>`;
    selComp.innerHTML = htmlComp; if (comps.includes(compActuelle) || compActuelle === 'AUTRE') selComp.value = compActuelle; surChangementCompetenceForm(selComp.value);
}

function surChangementCompetenceForm(valComp) { const inputCustom = document.getElementById('addCompetenceCustom'); if(!inputCustom) return; if(valComp === 'AUTRE') { inputCustom.style.display = 'block'; inputCustom.focus(); } else { inputCustom.style.display = 'none'; inputCustom.value = ''; } }

function ouvrirModal(idModal) { let m = document.getElementById(idModal); if(m) m.style.display = 'flex'; }
function fermerModal(idModal) { let m = document.getElementById(idModal); if(m) m.style.display = 'none'; initialiserSelectsFormulaire(); }

function afficherListeMatieresModal() { let mats = [...new Set(baseDonnees.map(a => a.matiere))].filter(m => m).sort((a,b)=>nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr')); let html = '<table style="width:100%; font-size:12px;"><thead><tr><th>Matière</th><th>Ateliers liés</th></tr></thead><tbody>'; mats.forEach(m => { let nb = baseDonnees.filter(a => a.matiere === m).length; html += `<tr><td><input type="text" class="input-edit-matiere" data-ancienne="${escHTML(m)}" value="${escHTML(m)}" style="width:100%; padding:4px;"></td><td style="text-align:center;">${nb}</td></tr>`; }); html += '</tbody></table><button type="button" onclick="sauvegarderToutesMatieres()" class="btn-valid" style="width:100%; margin-top:10px;">💾 Valider</button>'; let box = document.getElementById('listeMatieresModal'); if(box) box.innerHTML = html; }
function sauvegarderToutesMatieres() { document.querySelectorAll('.input-edit-matiere').forEach(input => { let ancienne = input.getAttribute('data-ancienne'); let nouvelle = input.value.trim(); if(nouvelle && ancienne !== nouvelle) { baseDonnees.forEach(a => { if(a.matiere === ancienne) a.matiere = nouvelle; }); } }); postEditGlobal(); fermerModal('modalMatieres'); showToast("Matières mises à jour !"); }

function afficherListeSequencesModal() { let seqs = [...new Set(baseDonnees.map(a => a.sequence))].filter(s => s).sort(); let html = '<table style="width:100%; font-size:12px;"><thead><tr><th>Séquence</th><th>Ateliers liés</th></tr></thead><tbody>'; seqs.forEach(s => { let nb = baseDonnees.filter(a => a.sequence === s).length; html += `<tr><td><input type="text" class="input-edit-sequence" data-ancienne="${escHTML(s)}" value="${escHTML(s)}" style="width:100%; padding:4px;"></td><td style="text-align:center;">${nb}</td></tr>`; }); html += '</tbody></table><button type="button" onclick="sauvegarderToutesSequences()" class="btn-valid" style="width:100%; margin-top:10px;">💾 Valider</button>'; let box = document.getElementById('listeSequencesModal'); if(box) box.innerHTML = html; }
function sauvegarderToutesSequences() { document.querySelectorAll('.input-edit-sequence').forEach(input => { let ancienne = input.getAttribute('data-ancienne'); let nouvelle = input.value.trim(); if(nouvelle && ancienne !== nouvelle) { baseDonnees.forEach(a => { if(a.sequence === ancienne) a.sequence = nouvelle; }); } }); postEditGlobal(); fermerModal('modalSequences'); showToast("Séquences mises à jour !"); }

function afficherListeCompetencesModal() { let comps = [...new Set(baseDonnees.map(a => a.competence))].filter(c => c).sort(); let html = '<table style="width:100%; font-size:12px;"><thead><tr><th>Compétence</th><th>Ateliers liés</th></tr></thead><tbody>'; comps.forEach(c => { let nb = baseDonnees.filter(a => a.competence === c).length; html += `<tr><td><input type="text" class="input-edit-competence" data-ancienne="${escHTML(c)}" value="${escHTML(c)}" style="width:100%; padding:4px;"></td><td style="text-align:center;">${nb}</td></tr>`; }); html += '</tbody></table><button type="button" onclick="sauvegarderToutesCompetences()" class="btn-valid" style="width:100%; margin-top:10px;">💾 Valider</button>'; let box = document.getElementById('listeCompetencesModal'); if(box) box.innerHTML = html; }
function sauvegarderToutesCompetences() { document.querySelectorAll('.input-edit-competence').forEach(input => { let ancienne = input.getAttribute('data-ancienne'); let nouvelle = input.value.trim(); if(nouvelle && ancienne !== nouvelle) { baseDonnees.forEach(a => { if(a.competence === ancienne) a.competence = nouvelle; }); } }); postEditGlobal(); fermerModal('modalCompetences'); showToast("Compétences mises à jour !"); }

function afficherListeTypesModal() {
    let html = '<table style="width:100%; font-size:11px;"><thead><tr><th>Type</th><th>Lien image Drive</th><th title="Remplacer n°">N°?</th><th title="Couleur auto">Coul?</th><th title="Appli Tablette">Tablette?</th><th>Action</th></tr></thead><tbody>';
    Object.keys(imagesParType).sort((a,b) => a.localeCompare(b)).forEach(t => {
        let cfg = imagesParType[t]; let imgVal = (typeof cfg === 'object') ? (cfg.img || "") : (cfg || ""); let remplacerChecked = (typeof cfg === 'object' && cfg.remplacerNum) ? "checked" : ""; let couleurChecked = (typeof cfg === 'object' && cfg.appliquerCouleur !== false) ? "checked" : ""; let tabletteChecked = (typeof cfg === 'object' && cfg.isTablette === true) ? "checked" : "";
        html += `<tr><td><strong>${escHTML(t)}</strong></td><td><input type="text" class="input-type-img" data-nom="${escHTML(t)}" value="${escHTML(imgVal)}" style="width: 100%; padding: 4px;"></td><td style="text-align:center;"><input type="checkbox" class="input-type-remp" data-nom="${escHTML(t)}" ${remplacerChecked}></td><td style="text-align:center;"><input type="checkbox" class="input-type-coul" data-nom="${escHTML(t)}" ${couleurChecked}></td><td style="text-align:center;"><input type="checkbox" class="input-type-tablette" data-nom="${escHTML(t)}" ${tabletteChecked}></td><td style="text-align:center;"><button type="button" onclick="supprimerType('${escJS(t)}')">🗑️</button></td></tr>`;
    });
    html += '</tbody></table><button type="button" onclick="sauvegarderTousLesTypes()" class="btn-valid" style="width:100%; margin-top:15px;">💾 Valider</button>'; 
    let box = document.getElementById('listeTypesModal'); if(box) box.innerHTML = html;
}

function sauvegarderTousLesTypes() {
    document.querySelectorAll('#listeTypesModal tbody tr').forEach(tr => {
        let imgInput = tr.querySelector('.input-type-img'); if(!imgInput) return; let nomType = imgInput.getAttribute('data-nom'); let imgVal = imgInput.value.trim();
        let rempVal = tr.querySelector('.input-type-remp').checked; let coulVal = tr.querySelector('.input-type-coul').checked; let tabVal = tr.querySelector('.input-type-tablette').checked;
        imagesParType[nomType] = { img: imgVal, remplacerNum: rempVal, appliquerCouleur: coulVal, isTablette: tabVal }; let lienFormate = formaterLienImage(imgVal);
        baseDonnees.forEach(a => {
            if (a.typeRes && a.typeRes.trim().toLowerCase() === nomType.trim().toLowerCase()) {
                if (coulVal === false && a.visuel && a.visuel.startsWith('#')) { a.visuel = lienFormate || ""; } else if (!a.visuel || a.visuel.startsWith('http') || a.visuel.startsWith('data:image')) { if (lienFormate) a.visuel = lienFormate; } else if (coulVal === true && (!a.visuel || a.visuel.startsWith('http'))) { let newColor = calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes); if (newColor !== "#ffffff") a.visuel = newColor; }
            }
        });
    });
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); declencherAutoSaveDrive(); sauvegarderBase(); afficherBase(); if(idEleveCourant) afficherPlanHebdo(); fermerModal('modalTypes'); showToast("Types mis à jour !"); majListeTypesSelect(); majFiltresNiveaux();
}
function supprimerType(nomType) { if (baseDonnees.filter(a => a.typeRes && a.typeRes.trim().toLowerCase() === nomType.trim().toLowerCase()).length > 0) { showToast(`Impossible, utilisé par des ateliers.`, "error"); return; } if (confirm(`Supprimer le type "${nomType}" ?`)) { delete imagesParType[nomType]; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); majListeTypesSelect(); afficherListeTypesModal(); declencherAutoSaveDrive(); } }

function majListeTypesSelect() {
    const selectType = document.getElementById('addTypeSelect'); if(!selectType) return; let typeActuel = selectType.value; let htmlOpts = '<option value="">-- 7. Sélectionner un Type --</option>';
    if (imagesParType && typeof imagesParType === 'object') { Object.keys(imagesParType).sort((a,b) => a.localeCompare(b)).forEach(t => { htmlOpts += `<option value="${escHTML(t)}">${escHTML(t)}</option>`; }); }
    htmlOpts += `<option value="AUTRE">➕ Autre type (Saisir manuellement)...</option>`; selectType.innerHTML = htmlOpts; if(typeActuel) selectType.value = typeActuel;
}

function postEditGlobal() { trierBaseDonnees(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); }

function editerActiviteBase(idActivite) {
    const a = baseDonnees.find(x => x.id === idActivite); if(!a) return; idEnCoursEdition = idActivite; couleurManuelleModifiee = true; isFormLoading = true;
    document.querySelectorAll('.cb-niveau-form').forEach(cb => { cb.checked = a.niveau && a.niveau.toUpperCase().includes(cb.value.toUpperCase()); }); initialiserSelectsFormulaire();
    const selMat = document.getElementById('addMatiereSelect'); let matTrouvee = false;
    if(selMat) { for(let opt of selMat.options) { if(opt.value === a.matiere) { selMat.value = a.matiere; matTrouvee = true; break; } } if(!matTrouvee && a.matiere) { selMat.value = 'AUTRE'; document.getElementById('addMatiereCustom').style.display = 'block'; document.getElementById('addMatiereCustom').value = a.matiere; } else { document.getElementById('addMatiereCustom').style.display = 'none'; } surChangementMatiereForm(selMat.value); }
    const selSeq = document.getElementById('addSequenceSelect'); let seqTrouvee = false;
    if(selSeq) { for(let opt of selSeq.options) { if(opt.value === a.sequence) { selSeq.value = a.sequence; seqTrouvee = true; break; } } if(!seqTrouvee && a.sequence) { selSeq.value = 'AUTRE'; document.getElementById('addSequenceCustom').style.display = 'block'; document.getElementById('addSequenceCustom').value = a.sequence; } else { document.getElementById('addSequenceCustom').style.display = 'none'; } surChangementSequenceForm(selSeq.value); }
    let leconInput = document.getElementById('addLecon'); if(leconInput) leconInput.value = a.lecon || '';
    const selComp = document.getElementById('addCompetenceSelect'); let compTrouvee = false;
    if(selComp) { for(let opt of selComp.options) { if(opt.value === a.competence) { selComp.value = a.competence; compTrouvee = true; break; } } if(!compTrouvee && a.competence) { selComp.value = 'AUTRE'; document.getElementById('addCompetenceCustom').style.display = 'block'; document.getElementById('addCompetenceCustom').value = a.competence; } else { document.getElementById('addCompetenceCustom').style.display = 'none'; } }
    let resInput = document.getElementById('addRessource'); if(resInput) resInput.value = a.ressource || '';
    const selectType = document.getElementById('addTypeSelect'); const inputCustom = document.getElementById('addTypeCustom'); let typeTrouve = false;
    if(selectType) { for(let opt of selectType.options) { if(opt.value === a.typeRes) { selectType.value = a.typeRes; inputCustom.style.display = 'none'; typeTrouve = true; break; } } if(!typeTrouve && a.typeRes) { selectType.value = 'AUTRE'; inputCustom.style.display = 'block'; inputCustom.value = a.typeRes; } else if(!a.typeRes) { selectType.value = ''; inputCustom.style.display = 'none'; } }
    let symInput = document.getElementById('addSymbole'); if(symInput) symInput.value = a.symbole || ''; document.querySelectorAll('.cb-pers-form').forEach(cb => { cb.checked = a.personnes && a.personnes.includes(cb.value); }); let evalInput = document.getElementById('addIsEval'); if(evalInput) evalInput.checked = a.estEvaluation || false;
    if (a.visuel && (a.visuel.startsWith('http') || a.visuel.startsWith('data:image'))) { document.getElementById('addImage').value = a.visuel; majSelectCouleursRapides('#ffffff'); document.getElementById('addColor').value = '#ffffff'; document.getElementById('addColor').style.display = 'none'; } else if (a.visuel && a.visuel.startsWith('#')) { majSelectCouleursRapides(a.visuel); document.getElementById('addColor').value = a.visuel; document.getElementById('addImage').value = ''; } else { majSelectCouleursRapides('#ffffff'); document.getElementById('addColor').value = '#ffffff'; document.getElementById('addColor').style.display = 'none'; document.getElementById('addImage').value = ''; }
    const box = document.getElementById('boxFormulaireManuel'); if(box) box.classList.add('edit-mode'); let titreForm = document.getElementById('titreFormulaireManuel'); if(titreForm) { titreForm.innerHTML = "✏️ Modifier l'activité"; titreForm.style.color = "#d35400"; }
    const btnValider = document.getElementById('btnValiderForm'); if(btnValider) { btnValider.innerHTML = "💾 Enregistrer"; btnValider.style.backgroundColor = "#d35400"; }
    let btnAnnuler = document.getElementById('btnAnnulerForm'); if(btnAnnuler) btnAnnuler.style.display = "inline-block"; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); isFormLoading = false; 
}

function annulerEdition() {
    idEnCoursEdition = null; couleurManuelleModifiee = false; isFormLoading = false;
    document.querySelectorAll('.cb-niveau-form').forEach(cb => cb.checked = false); document.querySelectorAll('.cb-pers-form').forEach(cb => cb.checked = false);
    let l = document.getElementById('addLecon'); if(l) l.value = ''; let cc = document.getElementById('addCompetenceCustom'); if(cc) cc.value = ''; let ar = document.getElementById('addRessource'); if(ar) ar.value = ''; let as = document.getElementById('addSymbole'); if(as) as.value = ''; let ats = document.getElementById('addTypeSelect'); if(ats) ats.value = ''; let atc = document.getElementById('addTypeCustom'); if(atc) { atc.style.display = 'none'; atc.value = ''; } let ams = document.getElementById('addMatiereSelect'); if(ams) ams.value = ''; let amc = document.getElementById('addMatiereCustom'); if(amc) { amc.style.display = 'none'; amc.value = ''; } let ass = document.getElementById('addSequenceSelect'); if(ass) ass.value = ''; let asc = document.getElementById('addSequenceCustom'); if(asc) { asc.style.display = 'none'; asc.value = ''; } let adi = document.getElementById('addImage'); if(adi) adi.value = ''; majSelectCouleursRapides('#ffffff'); let adc = document.getElementById('addColor'); if(adc) { adc.value = '#ffffff'; adc.style.display = 'none'; } let aie = document.getElementById('addIsEval'); if(aie) aie.checked = false; 
    const box = document.getElementById('boxFormulaireManuel'); if(box) box.classList.remove('edit-mode'); let titreForm = document.getElementById('titreFormulaireManuel'); if(titreForm) { titreForm.innerHTML = "➕ Ajouter une ou plusieurs activités"; titreForm.style.color = "#2980b9"; }
    const btnValider = document.getElementById('btnValiderForm'); if(btnValider) { btnValider.innerHTML = "➕ Ajouter l'activité"; btnValider.style.backgroundColor = "#27ae60"; } let btnAnnuler = document.getElementById('btnAnnulerForm'); if(btnAnnuler) btnAnnuler.style.display = "none"; initialiserSelectsFormulaire();
}

function sauvegarderFormulaire() {
    let niveauxCoches = getNiveauxCochesFormulaire(); if (niveauxCoches.length === 0) { alert("Veuillez cocher au moins un niveau."); return; }
    const niveauStr = niveauxCoches.join(', '); let persCoches = []; document.querySelectorAll('.cb-pers-form:checked').forEach(cb => persCoches.push(cb.value)); const persStr = persCoches.join(' ');
    
    let matSelect = document.getElementById('addMatiereSelect'); let matCustom = document.getElementById('addMatiereCustom'); let matiereFinal = matSelect.value === 'AUTRE' && matCustom ? matCustom.value.trim() : matSelect.value;
    let seqSelect = document.getElementById('addSequenceSelect'); let seqCustom = document.getElementById('addSequenceCustom'); let sequenceFinal = seqSelect.value === 'AUTRE' && seqCustom ? seqCustom.value.trim() : seqSelect.value;
    let compSelect = document.getElementById('addCompetenceSelect'); let compCustom = document.getElementById('addCompetenceCustom'); let competenceFinal = compSelect.value === 'AUTRE' && compCustom ? compCustom.value.trim() : compSelect.value;
    let resElem = document.getElementById('addRessource'); let symElem = document.getElementById('addSymbole'); const ressource = resElem ? resElem.value.trim() : ''; const symbole = symElem ? symElem.value.trim() : '';
    let selectTypeElem = document.getElementById('addTypeSelect'); let typeCustomElem = document.getElementById('addTypeCustom'); let typeFinal = selectTypeElem.value === 'AUTRE' && typeCustomElem ? typeCustomElem.value.trim() : selectTypeElem.value;

    if(!matiereFinal || !sequenceFinal || !competenceFinal || !ressource) { alert("Veuillez remplir Matière, Séquence, Compétence et Ressource."); return; }
    if(typeFinal && !imagesParType.hasOwnProperty(typeFinal)) { imagesParType[typeFinal] = { img: "", remplacerNum: false, appliquerCouleur: true, isTablette: false }; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); majListeTypesSelect(); }

    let visuel = ""; let imgElem = document.getElementById('addImage'); let colElem = document.getElementById('addColor'); let colRapideElem = document.getElementById('selectCouleurRapide');
    const imageUrl = imgElem ? imgElem.value.trim() : ''; const colorPickerVal = colElem ? colElem.value : '#ffffff'; const selectCouleurVal = colRapideElem ? colRapideElem.value : '';
    let couleurAuto = calculerCouleurAutomatique(matiereFinal, niveauStr, typeFinal);
    if (imageUrl) { visuel = imageUrl; } else if (couleurManuelleModifiee && selectCouleurVal && selectCouleurVal !== 'NOUVELLE_ROUE') { visuel = selectCouleurVal; } else if (couleurManuelleModifiee && colorPickerVal && colorPickerVal !== '#ffffff') { visuel = colorPickerVal; } else if (!couleurManuelleModifiee && couleurAuto !== "#ffffff") { visuel = couleurAuto; } else if (imagesParType[typeFinal]) { let cfg = imagesParType[typeFinal]; visuel = (typeof cfg === 'object') ? cfg.img : cfg; } else { visuel = selectCouleurVal || colorPickerVal || "#ffffff"; }

    let doublonTrouve = verifierDoublonActivite(matiereFinal, sequenceFinal, competenceFinal, ressource, visuel, idEnCoursEdition);
    if (doublonTrouve) { alert(`⚠️ Action bloquée : L'atelier "${doublonTrouve.ressource}" existe déjà dans la séquence "${doublonTrouve.sequence}".`); return; }

    let leconElem = document.getElementById('addLecon'); let evalElem = document.getElementById('addIsEval');

    if(idEnCoursEdition) {
        const idx = baseDonnees.findIndex(a => a.id === idEnCoursEdition);
        if(idx > -1) { baseDonnees[idx] = { id: idEnCoursEdition, niveau: niveauStr, matiere: matiereFinal, sequence: sequenceFinal, lecon: leconElem ? leconElem.value.trim() : '', competence: competenceFinal, ressource: ressource, typeRes: typeFinal, symbole: symbole, atelier: "", personnes: persStr, correction: "", visuel: visuel, estEvaluation: evalElem ? evalElem.checked : false }; }
        annulerEdition(); 
    } else {
        baseDonnees.push({ id: 'act_' + Date.now() + Math.random().toString(36).substr(2, 9), niveau: niveauStr, matiere: matiereFinal, sequence: sequenceFinal, lecon: leconElem ? leconElem.value.trim() : '', competence: competenceFinal, ressource: ressource, typeRes: typeFinal, symbole: symbole, atelier: "", personnes: persStr, correction: "", visuel: visuel, estEvaluation: evalElem ? evalElem.checked : false });
        dernierNiveauForm = [...niveauxCoches]; derniereMatiereForm = matiereFinal; derniereSequenceForm = sequenceFinal; derniereCompForm = competenceFinal;
        if(resElem) resElem.value = ''; if(symElem) symElem.value = ''; if(imgElem) imgElem.value = ''; if(evalElem) evalElem.checked = false;
        showToast("Activité ajoutée ! Vous pouvez en ajouter une autre pour la même compétence.", "success");
    }
    
    trierBaseDonnees(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); initialiserSelectsFormulaire(); afficherChoixEtiquettes();
    
    if(!idEnCoursEdition) {
        dernierNiveauForm.forEach(n => { let cb = document.querySelector(`.cb-niveau-form[value="${n}"]`); if(cb) cb.checked = true; });
        let selMat = document.getElementById('addMatiereSelect'); if(selMat) { selMat.value = derniereMatiereForm; surChangementMatiereForm(derniereMatiereForm); }
        let selSeq = document.getElementById('addSequenceSelect'); if(selSeq) { selSeq.value = derniereSequenceForm; surChangementSequenceForm(derniereSequenceForm); }
        let selComp = document.getElementById('addCompetenceSelect'); if(selComp) { selComp.value = derniereCompForm; surChangementCompetenceForm(derniereCompForm); }
    }
    if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); }
}

function changerCouleurDB(idActivite, nouvelleCouleur) { const idx = baseDonnees.findIndex(a => a.id === idActivite); if(idx > -1) { baseDonnees[idx].visuel = nouvelleCouleur; sauvegarderBase(); afficherBase(); afficherChoixEtiquettes(); if(idEleveCourant) afficherPlanHebdo(); } }
function changerImageDB(idActivite) { const url = prompt("Collez le lien de l'image (Vide pour retirer) :"); if(url !== null) { const idx = baseDonnees.findIndex(a => a.id === idActivite); if(idx > -1) { baseDonnees[idx].visuel = url.trim(); sauvegarderBase(); afficherBase(); afficherChoixEtiquettes(); if(idEleveCourant) afficherPlanHebdo(); } } }

function supprimerActiviteBase(idActivite) { 
    if(confirm("Supprimer définitivement ?")) { 
        baseDonnees = baseDonnees.filter(a => a.id !== idActivite); 
        Object.values(eleves).forEach(e => {
            if (e.planHebdo) e.planHebdo = e.planHebdo.filter(id => id !== idActivite); if (e.historique) e.historique = e.historique.filter(h => h.idActivite !== idActivite); if (e.masquees) e.masquees = e.masquees.filter(id => id !== idActivite);
            if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite]; if (e.valides && e.valides[idActivite]) delete e.valides[idActivite]; if (e.priorites) e.priorites = e.priorites.filter(id => id !== idActivite); if (e.enAttente) e.enAttente = e.enAttente.filter(id => id !== idActivite); if (e.bilanEvaluations && e.bilanEvaluations[idActivite]) delete e.bilanEvaluations[idActivite];
        });
        sauvegarderEleves(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); 
        if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); } rafraichirDashboard(); showToast("Activité supprimée", "success");
    } 
}

function viderBase() { 
    if(confirm("Vider la base ? Attention, cela retirera toutes les activités des plans des élèves.")) { 
        baseDonnees = []; 
        Object.values(eleves).forEach(e => { e.planHebdo = []; e.historique = []; e.masquees = []; e.suivi = {}; e.valides = {}; e.enAttente = []; e.priorites = []; e.bilanEvaluations = {}; });
        sauvegarderEleves(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); 
        if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); } rafraichirDashboard(); showToast("Base vidée", "success");
    } 
}

// --- 9. AFFICHAGE DE LA BASE ET ETIQUETTES ---
function afficherBase() {
    const tbody = document.getElementById('tableBase'); if(!tbody) return; let html = ''; if (!Array.isArray(baseDonnees)) return; let donneesAffichees = baseDonnees;
    const searchInput = document.getElementById('searchBase');
    if (searchInput && searchInput.value) { let terms = searchInput.value.toLowerCase().split(' '); donneesAffichees = donneesAffichees.filter(a => { let texteGlobal = `${a.niveau} ${a.matiere} ${a.sequence} ${a.competence} ${a.ressource} ${a.typeRes}`.toLowerCase(); return terms.every(term => texteGlobal.includes(term)); }); }
    if(filtreCourantDB !== 'Tous') { donneesAffichees = donneesAffichees.filter(a => a.niveau && a.niveau.toUpperCase().includes(filtreCourantDB.toUpperCase())); }
    if(filtreCourantMatiere !== 'Toutes') { donneesAffichees = donneesAffichees.filter(a => a.matiere === filtreCourantMatiere); }
    if(filtreCourantTypeDB !== 'Tous') { donneesAffichees = donneesAffichees.filter(a => a.typeRes && a.typeRes.trim().toLowerCase() === filtreCourantTypeDB.trim().toLowerCase()); }

    donneesAffichees.forEach(a => { 
        let typeAct = a.typeRes ? a.typeRes.trim().toLowerCase() : ""; let cfgType = null;
        for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
        let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""); let imageAffichee = ""; let couleurFond = "#ffffff";
        if (a.visuel && a.visuel.startsWith('#')) { couleurFond = a.visuel; imageAffichee = lienImageConfig; } else if (a.visuel && (a.visuel.startsWith('http') || a.visuel.startsWith('data:'))) { imageAffichee = a.visuel; } else { imageAffichee = lienImageConfig; }
        let bgColorStyle = ""; let textColor = "black"; if (couleurFond !== '#ffffff') { bgColorStyle = `background-color: ${couleurFond};`; textColor = isDarkColor(couleurFond) ? 'white' : 'black'; }

        let previewHtml = `<div style="${bgColorStyle} color: ${textColor}; padding: 4px; border-radius: 4px; text-align: center; border: 1px solid #bdc3c7; margin-bottom: 4px; min-height: 20px;">`;
        if (imageAffichee) previewHtml += `<img src="${formaterLienImage(imageAffichee)}" style="max-height: 30px; border-radius: 3px;">`; else previewHtml += `<strong>${escHTML(a.symbole)}</strong>`; previewHtml += `</div>`;
        let controlsHtml = `<div style="display: flex; gap: 5px; justify-content: center;"><input type="color" class="color-picker-db" value="${couleurFond}" onchange="changerCouleurDB('${a.id}', this.value)" title="Changer la couleur"><button type="button" class="img-btn-db" onclick="changerImageDB('${a.id}')" title="Modifier l'image">🖼️</button></div>`;
        let badge = a.estEvaluation ? `<br><span class="badge-eval">🎯 Éval</span>` : ''; let rowClass = a.estEvaluation ? 'row-eval' : '';

        html += `<tr class="${rowClass}"><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td><strong>${escHTML(a.ressource)}</strong> ${badge}</td><td>${escHTML(a.typeRes)}</td><td class="col-center">${escHTML(a.personnes)}</td><td style="text-align: center; vertical-align: middle;">${previewHtml}${controlsHtml}</td><td style="text-align: center; white-space: nowrap;"><button type="button" onclick="assignerActivite('${a.id}')" title="Assigner à un ou plusieurs élèves">👥</button> <button type="button" onclick="editerActiviteBase('${a.id}')">✏️</button> <button type="button" onclick="supprimerActiviteBase('${a.id}')" style="color:red;">❌</button></td></tr>`; 
    });
    tbody.innerHTML = html;
}

function afficherChoixEtiquettes() {
    const tbody = document.getElementById('tableChoixEtiquettes'); if(!tbody) return; let html = ''; let typesCochés = []; document.querySelectorAll('.cb-type-etq:checked').forEach(cb => typesCochés.push(cb.value));
    let donneesAffichees = (typesCochés.length > 0) ? baseDonnees.filter(a => a.typeRes && typesCochés.some(t => t.trim().toLowerCase() === a.typeRes.trim().toLowerCase())) : []; let mapUniques = new Map();
    donneesAffichees.forEach(a => { let cleUnique = `${a.niveau}_${a.matiere}_${a.ressource}_${a.symbole || ''}_${a.visuel || ''}`; if (!mapUniques.has(cleUnique)) { mapUniques.set(cleUnique, { ...a }); } });
    let listeUnique = Array.from(mapUniques.values());

    listeUnique.forEach((a) => {
        let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let typeAct = a.typeRes ? a.typeRes.trim().toLowerCase() : ""; let cfgType = null;
        for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
        let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""); let imageAffichee = (a.visuel && a.visuel.startsWith('#')) ? lienImageConfig : ((a.visuel && (a.visuel.startsWith('http') || a.visuel.startsWith('data:'))) ? a.visuel : lienImageConfig);
        let imgF = formaterLienImage(imageAffichee); let visuelApercu = ""; if (imgF && imgF.startsWith('http')) { visuelApercu = `<img src="${imgF}" style="max-height: 20px; vertical-align: middle; margin-left: 5px;">`; } else if (a.symbole) { visuelApercu = `<strong>(${escHTML(a.symbole)})</strong>`; }

        html += `<tr><td style="text-align: center;"><input type="checkbox" class="cb-etiquette" data-id="${a.id}" onchange="genererApercuEtiquettes()"></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${escHTML(a.ressource)} ${visuelApercu} ${badge} <br><span style="font-size:10px; color:#7f8c8d;">Type: ${escHTML(a.typeRes)}</span></td><td style="text-align: center;"><input type="number" class="input-qte-etq" data-id="${a.id}" value="1" min="1" max="20" style="width: 50px; text-align: center; padding: 4px;" oninput="genererApercuEtiquettes()"></td></tr>`;
    });
    if(listeUnique.length === 0) { html = '<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Aucune activité trouvée.</td></tr>'; }
    tbody.innerHTML = html; genererApercuEtiquettes();
}

function cocherToutesEtiquettes(source) { document.querySelectorAll('.cb-etiquette').forEach(cb => cb.checked = source.checked); genererApercuEtiquettes(); }

function genererApercuEtiquettes() {
    const container = document.getElementById('printEtiquettesContainer'); if(!container) return; const checkboxes = document.querySelectorAll('.cb-etiquette:checked');
    const w = document.getElementById('etqWidth').value; const h = document.getElementById('etqHeight').value; const fs = document.getElementById('etqFontSize').value; const gap = document.getElementById('etqGap').value; const mt = document.getElementById('etqMarginTop').value; const mb = document.getElementById('etqMarginBottom').value; const ml = document.getElementById('etqMarginLeft').value; const mr = document.getElementById('etqMarginRight').value;
    container.style.padding = `${mt}mm ${mr}mm ${mb}mm ${ml}mm`; container.style.gap = `${gap}mm`; let html = '';
    checkboxes.forEach(cb => {
        const id = cb.getAttribute('data-id'); const a = baseDonnees.find(x => x.id === id);
        const qteInput = document.querySelector(`.input-qte-etq[data-id="${id}"]`); const qte = qteInput ? parseInt(qteInput.value) || 1 : 1;
        if(a) {
            let typeAct = a.typeRes ? a.typeRes.trim().toLowerCase() : ""; let cfgType = null;
            for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
            let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""); let remplacerNum = (cfgType && typeof cfgType === 'object') ? cfgType.remplacerNum : false; let imageAffichee = ""; let couleurFond = "#ffffff";
            if (a.visuel && a.visuel.startsWith('#')) { couleurFond = a.visuel; imageAffichee = lienImageConfig; } else if (a.visuel && (a.visuel.startsWith('http') || a.visuel.startsWith('data:'))) { imageAffichee = a.visuel; } else { imageAffichee = lienImageConfig; }
            let bgColorStyle = "background-color: #ffffff; color: black; border: 1px solid #333;"; if (couleurFond !== '#ffffff') { bgColorStyle = `background-color: ${couleurFond}; color: ${isDarkColor(couleurFond) ? 'white' : 'black'}; border: 1px solid #000;`; }
            let imgFinal = formaterLienImage(imageAffichee); let content = "";
            if (imgFinal) { if (remplacerNum) { content = `<img src="${imgFinal}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">`; } else { content = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%;"><span style="font-weight:bold;">${escHTML(a.symbole || '')}</span><img src="${imgFinal}" style="max-height: 60%; object-fit: contain; margin-top:2px;"></div>`; } } else { content = `<strong>${escHTML(a.symbole || '')}</strong>`; }
            for(let i = 0; i < qte; i++) { html += `<div class="etiquette-box" style="width: ${w}mm; height: ${h}mm; font-size: ${fs}px; ${bgColorStyle}">${content}</div>`; }
        }
    });
    if (checkboxes.length === 0) html = '<p style="width: 100%; text-align: center; color: #7f8c8d; margin-top: 50px;">Cochez des étiquettes et indiquez leur quantité.</p>'; container.innerHTML = html;
}

function lancerImpressionEtiquettes() { if(document.querySelectorAll('.cb-etiquette:checked').length === 0) { alert("Cochez au moins une étiquette."); return; } document.body.classList.add('print-mode-etiquettes'); window.print(); document.body.classList.remove('print-mode-etiquettes'); }

// --- 10. SAUVEGARDE LOCALE & NAVIGATION ---
function exporterSauvegarde() { const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations }; const blob = new Blob([JSON.stringify(data)], { type: "application/json" }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Sauvegarde_Classe_" + new Date().toLocaleDateString('fr-FR').replace(/\//g, '-') + ".json"; a.click(); }

function restaurerSauvegarde() {
    const fileInput = document.getElementById('fileImport'); if(!fileInput || fileInput.files.length === 0) return; const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.base && data.eleves) {
                baseDonnees = Array.isArray(data.base) ? data.base : []; eleves = data.eleves;
                if (data.archives) { dashboardArchives = data.archives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
                if (data.programmations) { programmations = data.programmations; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
                Object.values(eleves).forEach(el => { 
                    if(!el.maxAteliers) el.maxAteliers = 15; if(el.maxTablettes === undefined) el.maxTablettes = 2; if(!el.niveau) el.niveau = "CP";
                    if(!el.suivi) el.suivi = {}; if(!el.priorites) el.priorites = []; if(!el.enAttente) el.enAttente = []; if(!el.bilanEvaluations) el.bilanEvaluations = {};
                });
                if(data.images) { imagesParType = data.images; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); majListeTypesSelect(); }
                trierBaseDonnees(); sauvegarderBase(); sauvegarderEleves(); initNiveaux(); initProgFilters(); afficherProgrammation(); majListeEleves(); initialiserSelectsFormulaire(); afficherBase(); afficherChoixEtiquettes(); majSelectCouleursRapides();
                showToast("Données restaurées et triées !", "success"); fileInput.value = '';
            } else alert("Fichier invalide.");
        } catch(err) { alert("Erreur de lecture."); }
    }; reader.readAsText(fileInput.files[0]);
}

function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active')); document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetPage = document.getElementById(idPage); if(targetPage) targetPage.classList.add('active'); if(element) element.classList.add('active');
    
    if(idPage === 'pageEtiquettes') { initNiveaux(); afficherChoixEtiquettes(); }
    if(idPage === 'pageImpression') { if(idEleveCourant) { idEleveImpressionCourant = idEleveCourant; } majListeEleves(); rafraichirFicheImpression(); } 
    if(idPage === 'pageBase') { majSelectCouleursRapides(); afficherBase(); }
    if(idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if(idPage === 'pageDashboard') { rafraichirDashboard(); }
    if(idPage === 'pageMatrice') { genererMatriceCompetences(); }
    if(idPage === 'pageBilan') { majListeEleves(); genererBilanEleve(); }
    if(idPage === 'pageSave') { calculTailleStockage(); }
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function rafraichirFicheImpression() {
    try {
        let selImp = document.getElementById('selectEleveImpression'); if(!selImp) return; idEleveImpressionCourant = selImp.value; 
        const container = document.getElementById('containerFichesImpression'); if(!container) return;
        if(!idEleveImpressionCourant) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;" class="no-print"><h2>Veuillez sélectionner un élève ou l\'option "Tous les élèves" ci-dessus.</h2></div>'; return; }
        
        if(idEleveImpressionCourant === 'TOUS_ELEVES') {
            let listeEleves = getElevesTries();
            if(listeEleves.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;" class="no-print"><h2>Aucun élève enregistré dans la classe.</h2></div>'; return; }
            let htmlGlobal = ''; listeEleves.forEach(e => { htmlGlobal += genererHtmlFicheEleve(e, false); }); container.innerHTML = htmlGlobal;
        } else { if(eleves[idEleveImpressionCourant]) { container.innerHTML = genererHtmlFicheEleve(eleves[idEleveImpressionCourant], true); } }
    } catch(error) { console.error("Erreur lors de la génération de la fiche :", error); let containerErr = document.getElementById('containerFichesImpression'); if(containerErr) containerErr.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;"><h2>Une erreur est survenue lors de l\'affichage.</h2></div>'; }
}

function genererHtmlFicheEleve(eleve, estUnique) {
    if(!eleve.planHebdo || !Array.isArray(eleve.planHebdo)) return "";
    let dateDebutElem = document.getElementById('pdtDateDebut'); let dateFinElem = document.getElementById('pdtDateFin');
    let dateDebut = dateDebutElem ? dateDebutElem.value.trim() : ''; let dateFin = dateFinElem ? dateFinElem.value.trim() : '';
    let infoDates = (dateDebut && dateFin) ? ` (du ${escHTML(dateDebut)} au ${escHTML(dateFin)})` : (dateDebut ? ` (à partir du ${escHTML(dateDebut)})` : "");
    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || []); let rowsHtml = ''; let derniereSequence = "";

    planObjects.forEach((a, index) => {
        const num = index + 1;
        if (a.sequence !== derniereSequence) { derniereSequence = a.sequence; rowsHtml += `<tr class="sequence-separator-row"><td colspan="7">📑 Séquence : ${escHTML(a.sequence)} (${escHTML(a.matiere)})</td></tr>`; }
        let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Évaluation</span>` : ''; let rowClass = a.estEvaluation ? 'row-eval' : ''; let repereHtml = ""; let typeAct = a.typeRes ? a.typeRes.trim().toLowerCase() : ""; let cfgType = null;
        for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
        let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""); let remplacerNum = (cfgType && typeof cfgType === 'object') ? cfgType.remplacerNum : false;
        let imageFinale = a.visuel || lienImageConfig || ""; imageFinale = formaterLienImage(imageFinale);
        if (imageFinale && !imageFinale.startsWith('#')) { if (remplacerNum) { repereHtml = `<img src="${imageFinale}" style="max-height: 40px; max-width: 70px; border-radius: 3px; vertical-align: middle; display: block; margin: auto;" title="${escHTML(a.typeRes)}">`; } else { let numAtelier = a.symbole ? `<strong>${escHTML(a.symbole)}</strong><br>` : ''; repereHtml = `${numAtelier}<img src="${imageFinale}" style="max-height: 32px; max-width: 60px; margin-top: 2px; border-radius: 2px; display: block; margin-left: auto; margin-right: auto;">`; } } else { repereHtml = `<strong>${escHTML(a.symbole || '')}</strong>`; }
        let bgColor = ""; if (a.visuel && a.visuel.startsWith('#') && a.visuel !== '#ffffff') { bgColor = `background-color: ${a.visuel}; color: ${isDarkColor(a.visuel) ? 'white' : 'black'}; border-radius: 2px; padding: 2px;`; }
        rowsHtml += `<tr class="${rowClass}"><td class="col-num">${num}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em><br>' : ''}${escHTML(a.competence)}</td><td><strong>${escHTML(a.ressource)}</strong> ${badge}</td><td class="col-center">${escHTML(a.typeRes || '')}</td><td class="col-center print-visual-cell" style="${bgColor}; width: 80px; text-align: center;">${repereHtml}</td><td class="col-center">${escHTML(a.personnes || '')}</td></tr>`;
    });

    if(planObjects.length === 0) rowsHtml = '<tr><td colspan="7" style="text-align:center;">Le plan de travail est vide pour cet élève.</td></tr>';
    let totalAct = planObjects.length; let lignesParJour = Math.max(2, Math.ceil(totalAct / 4) + 1); let planningRowsHtml = ''; for(let i = 0; i < lignesParJour; i++) { planningRowsHtml += `<tr><td><span class="planning-cell-box"></span></td><td><span class="planning-cell-box"></span></td><td><span class="planning-cell-box"></span></td><td><span class="planning-cell-box"></span></td></tr>`; }
    let wrapperClass = estUnique ? '' : 'plan-eleve-page';

    return `<div class="panel ${wrapperClass}" style="margin-top: 1px;"><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2c3e50; padding-bottom: 1px; margin-bottom: 2px;"><h2 style="margin:0; font-size: 11px;">Plan de travail - [${eleve.niveau}] ${escHTML(eleve.nom)}</h2><span style="font-size: 9.5px; font-weight: bold; color: #2980b9;">📅 Période${infoDates}</span></div><p style="font-size: 8px; font-style: italic; color: #555; margin: 0 0 2px 0; background: #f8f9f9; padding: 1px 3px; border-radius: 2px; border-left: 2px solid #2980b9;">💡 <strong>Consigne :</strong> Entoure le n° de l'activité commencée et non terminée. Barre le numéro quand tu as terminé.</p><table><thead><tr><th class="col-num">N°</th><th>Matière & Séquence</th><th>Compétence visée</th><th>Ressource à réaliser</th><th class="col-center">Type</th><th class="col-center" style="width: 80px;">N° Atelier</th><th class="col-center">Nb Pers.</th></tr></thead><tbody>${rowsHtml}</tbody></table><h4 style="margin: 2px 0 1px 0; color: #2c3e50; font-size: 8.5px;">📅 Planification journalière (Écris le N° de l'activité à faire) :</h4><table class="planning-table"><thead><tr><th>Lundi</th><th>Mardi</th><th>Jeudi</th><th>Vendredi</th></tr></thead><tbody>${planningRowsHtml}</tbody></table></div>`;
}

// --- INITIALISATION AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", function() {
    document.addEventListener('click', function(e) { const navBtn = e.target.closest('.nav-btn'); if (navBtn) { e.preventDefault(); let onclickAttr = navBtn.getAttribute('onclick'); if (onclickAttr) { let match = onclickAttr.match(/'(.*?)'/); if (match && match[1]) changerOnglet(match[1], navBtn); } } });
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.addEventListener('touchstart', function(e) { e.preventDefault(); let onclickAttr = this.getAttribute('onclick'); if (onclickAttr) { let match = onclickAttr.match(/'(.*?)'/); if (match && match[1]) changerOnglet(match[1], this); } }, { passive: false }); });
    eliminerDoublonsHistoriques(); majListeTypesSelect(); initialiserSelectsFormulaire(); trierBaseDonnees(); majListeEleves(); afficherBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherChoixEtiquettes(); majSelectCouleursRapides(); tenterConnexionAuto(); calculTailleStockage();
});
