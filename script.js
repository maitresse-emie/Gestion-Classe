// ==========================================
// SCRIPT COMPLET & SÉCURISÉ - GESTION DE CLASSE
// ==========================================
function escJS(str) { return (str || "").toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function escHTML(str) { return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

const KEY_ATELIERS = 'mesAteliers_Finale';
const KEY_ELEVES = 'mesEleves_Finale';
const KEY_IMAGES = 'mesImagesTypes_Finale';
const KEY_ARCHIVES_TODO = 'dashboardArchives_Finale';
const KEY_PROG = 'mesProgrammations_Finale';
const KEY_THEME = 'monThemeVisuel_Finale';

let dashboardExpanded = new Set(); 
let dashboardArchives = JSON.parse(localStorage.getItem(KEY_ARCHIVES_TODO)) || [];
let afficherArchivesMode = false;
let programmations = JSON.parse(localStorage.getItem(KEY_PROG)) || {};

let dateGlobaleDebutISO = "";
let dateGlobaleDebutFR = "";
let dateGlobaleFinFR = "";
let filtreEtoilesDispo = 0;

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

function getCouleurMatiereBandeau(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("ecriture")) {
        return { bg: "#1b4f72", text: "#ffffff", border: "#154360" };
    }
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure")) {
        return { bg: "#c0392b", text: "#ffffff", border: "#922b21" };
    }
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie")) {
        return { bg: "#795548", text: "#ffffff", border: "#5d4037" };
    }
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite")) {
        return { bg: "#e67e22", text: "#ffffff", border: "#d35400" };
    }
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) {
        return { bg: "#5dade2", text: "#ffffff", border: "#2e86c1" };
    }
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) {
        return { bg: "#27ae60", text: "#ffffff", border: "#1e8449" };
    }
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol")) {
        return { bg: "#e84393", text: "#ffffff", border: "#c2185b" };
    }
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) {
        return { bg: "#8e44ad", text: "#ffffff", border: "#6c3483" };
    }
    return { bg: "#eaeded", text: "#2c3e50", border: "#bdc3c7" };
}

function calculerVendrediDepuisISO(dateISO) {
    if (!dateISO) return { debutFR: "", finFR: "", finISO: "", lundiSuivantISO: "" };
    const parts = dateISO.split('-').map(Number);
    if (parts.length !== 3) return { debutFR: "", finFR: "", finISO: "", lundiSuivantISO: "" };
    const dtDebut = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = dtDebut.getDay();
    let diffVendredi = (5 - day + 7) % 7;
    if (diffVendredi === 0) diffVendredi = 7;
    const dtFin = new Date(dtDebut);
    dtFin.setDate(dtDebut.getDate() + diffVendredi);

    let diffLundiSuivant = (8 - day) % 7;
    if (diffLundiSuivant === 0) diffLundiSuivant = 7;
    const dtLundiSuiv = new Date(dtDebut);
    dtLundiSuiv.setDate(dtDebut.getDate() + diffLundiSuivant);

    const fmtFR = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    const fmtISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return { debutFR: fmtFR(dtDebut), finFR: fmtFR(dtFin), finISO: fmtISO(dtFin), lundiSuivantISO: fmtISO(dtLundiSuiv) };
}

function assurerStructureSemaines(e) {
    if (!e) return;
    if (!e.maxAteliers) e.maxAteliers = 15;
    if (e.maxTablettes === undefined) e.maxTablettes = 2;
    if (!e.niveau) e.niveau = "CP";
    if (!e.suivi) e.suivi = {};
    if (!e.valides) e.valides = {};
    if (!e.planHebdo || !Array.isArray(e.planHebdo)) e.planHebdo = [];
    if (!e.enAttente || !Array.isArray(e.enAttente)) e.enAttente = [];
    if (!e.historique || !Array.isArray(e.historique)) e.historique = [];
    if (!e.masquees || !Array.isArray(e.masquees)) e.masquees = [];
    if (!e.priorites) e.priorites = [];
    if (!e.bilanEvaluations) e.bilanEvaluations = {};
    if (!e.joursAssignes) e.joursAssignes = {};
    if (!e.dateDebutISO) e.dateDebutISO = "";
    if (!e.dateDebut) e.dateDebut = "";
    if (!e.dateFin) e.dateFin = "";

    if (!e.semaines || !Array.isArray(e.semaines) || e.semaines.length === 0) {
        e.semaines = [{
            id: 'sem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            dateDebutISO: e.dateDebutISO || "",
            dateDebut: e.dateDebut || "",
            dateFin: e.dateFin || "",
            planHebdo: [...e.planHebdo],
            priorites: [...e.priorites],
            joursAssignes: { ...e.joursAssignes },
            valides: { ...e.valides },
            suivi: JSON.parse(JSON.stringify(e.suivi || {}))
        }];
        e.semaineIndex = 0;
    }
    if (e.semaineIndex === undefined || e.semaineIndex < 0 || e.semaineIndex >= e.semaines.length) {
        e.semaineIndex = 0;
    }
}

function syncEleveVersSemaineActive(e) {
    if (!e) return;
    assurerStructureSemaines(e);
    let idx = e.semaineIndex || 0;
    if (!e.semaines[idx]) idx = 0;
    e.semaines[idx].planHebdo = [...(e.planHebdo || [])];
    e.semaines[idx].priorites = [...(e.priorites || [])];
    e.semaines[idx].joursAssignes = { ...(e.joursAssignes || {}) };
    e.semaines[idx].valides = { ...(e.valides || {}) };
    e.semaines[idx].suivi = JSON.parse(JSON.stringify(e.suivi || {}));
    e.semaines[idx].dateDebutISO = e.dateDebutISO || "";
    e.semaines[idx].dateDebut = e.dateDebut || "";
    e.semaines[idx].dateFin = e.dateFin || "";
}

function chargerSemaineDepuisIndex(e, nouvelIndex) {
    if (!e) return;
    syncEleveVersSemaineActive(e);
    let idx = parseInt(nouvelIndex);
    if (isNaN(idx) || idx < 0 || idx >= e.semaines.length) idx = 0;
    e.semaineIndex = idx;
    let s = e.semaines[idx];
    e.planHebdo = [...(s.planHebdo || [])];
    e.priorites = [...(s.priorites || [])];
    e.joursAssignes = { ...(s.joursAssignes || {}) };
    e.valides = { ...(s.valides || {}) };
    e.suivi = { ...(e.suivi || {}), ...(s.suivi || {}) };
    e.dateDebutISO = s.dateDebutISO || "";
    e.dateDebut = s.dateDebut || "";
    e.dateFin = s.dateFin || "";
}

Object.values(eleves).forEach(e => assurerStructureSemaines(e));
localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));

function sauvegarderEleves() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
    declencherAutoSaveDrive();
}
function sauvegarderBase() { localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); declencherAutoSaveDrive(); }
function sauvegarderProgrammations() { localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); declencherAutoSaveDrive(); }

function nettoyerNomPourTri(str) { return (!str) ? "" : str.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, "").trim().toLowerCase(); }

function formaterEtoiles(nb) {
    let n = parseInt(nb) || 0;
    if (n <= 0) return "";
    return `<span style="color:#f39c12; font-size:12px; margin-right:4px;" title="Difficulté : ${n} étoile(s)">${"⭐".repeat(n)}</span>`;
}

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
        a.id !== idExclu &&
        (a.ressource || "").trim().toLowerCase() === ressource.trim().toLowerCase() &&
        (a.matiere || "").trim().toLowerCase() === matiere.trim().toLowerCase() &&
        (a.sequence || "").trim().toLowerCase() === sequence.trim().toLowerCase()
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

let idEleveCourant = null; let idEleveImpressionCourant = null;
let filtreCourantDB = 'Tous'; let filtreCourantMatiere = 'Toutes'; let filtreCourantTypeDB = 'Tous';
let idEnCoursEdition = null; let couleurManuelleModifiee = false; let isFormLoading = false;
let dernierNiveauForm = []; let derniereMatiereForm = ""; let derniereSequenceForm = ""; let derniereCompForm = "";

function getListeTrie(idsArray, priosArray = [], suiviObj = {}) {
    if (!idsArray) return [];
    let planObjects = idsArray.map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
    planObjects.sort((a, b) => {
        let remA = (suiviObj && suiviObj[a.id] && (suiviObj[a.id].statut === 'a_revoir' || suiviObj[a.id].statut === 'a_refaire')) ? 1 : 0;
        let remB = (suiviObj && suiviObj[b.id] && (suiviObj[b.id].statut === 'a_revoir' || suiviObj[b.id].statut === 'a_refaire')) ? 1 : 0;
        let prioA = (priosArray.includes(a.id) || remA) ? 1 : 0;
        let prioB = (priosArray.includes(b.id) || remB) ? 1 : 0;
        if (prioA !== prioB) return prioB - prioA;
        if (remA !== remB) return remB - remA;

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
        if (nivA !== nivB) return nivA - nivB;
        return (a.nom || "").localeCompare(b.nom || "", 'fr', { sensitivity: 'base' });
    });
}

// ==========================================
// NAVIGATION & THÈMES
// ==========================================
function appliquerThemeVisuel(nomTheme) {
    document.body.classList.remove('theme-pastel', 'theme-doodles', 'theme-nature');
    if (nomTheme === 'pastel') document.body.classList.add('theme-pastel');
    if (nomTheme === 'doodles') document.body.classList.add('theme-doodles');
    if (nomTheme === 'nature') document.body.classList.add('theme-nature');
    localStorage.setItem(KEY_THEME, nomTheme || 'classique');
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active-theme'));
    let activeCard = document.getElementById('card_theme_' + (nomTheme || 'classique'));
    if (activeCard) activeCard.classList.add('active-theme');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container'); if(!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerText = message;
    container.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000);
}

const originalAlert = window.alert;
window.alert = function(msg) {
    if (msg.includes("succès") || msg.includes("mise à jour") || msg.includes("enregistrées")) { showToast(msg, 'success'); }
    else if (msg.length < 60) { showToast(msg, 'error'); } else { originalAlert(msg); }
};

window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnScrollTop'); if(!btn) return;
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
// GOOGLE DRIVE
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
            if(data.theme) { appliquerThemeVisuel(data.theme); }
            
            localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
            Object.values(eleves).forEach(e => assurerStructureSemaines(e));
            localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
            
            postEditGlobal(); majListeEleves(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); majSelectCouleursRapides(); rafraichirDashboard();
            if(statut) { statut.innerText = "✅ Synchronisé depuis le Drive !"; statut.style.color = "#27ae60"; } calculTailleStockage();
        } else { if(statut) statut.innerText = "⚠️ Fichier Drive vide ou corrompu."; }
    }).catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else { if(statut) { statut.innerText = "❌ Erreur de téléchargement du fichier."; statut.style.color = "#e74c3c"; } } });
}

function sauvegarderVersDriveFichierUnique() {
    if(!driveAccessToken) return;
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel' };
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
// GESTION DES ELEVES & SEMAINES
// ==========================================
function majListeEleves() {
    const select = document.getElementById('selectEleveProfile'); const selectImp = document.getElementById('selectEleveImpression'); const selectBilan = document.getElementById('selectEleveBilan');
    let optHtml = '<option value="">-- Sélectionner un élève --</option>'; 
    let optImp = '<option value="">-- Choisir un élève ou un groupe --</option>' +
        '<option value="TOUS_ELEVES">📚 TOUS les élèves de la classe</option>' +
        '<option value="NIVEAU_CP">📘 Tous les CP</option>' +
        '<option value="NIVEAU_CE1">📘 Tous les CE1</option>' +
        '<option value="NIVEAU_CE2">📘 Tous les CE2</option>' +
        '<option value="NIVEAU_CM1">📘 Tous les CM1</option>' +
        '<option value="NIVEAU_CM2">📘 Tous les CM2</option>';
    let optBilan = '<option value="">-- Choisir un élève --</option>';

    let elevesTries = getElevesTries();
    elevesTries.forEach(e => { 
        let labelNiv = `[${e.niveau || "CP"}] ${e.nom}`;
        optHtml += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
        optImp += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
        optBilan += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
    });
    if (select) select.innerHTML = optHtml; if (selectImp) selectImp.innerHTML = optImp; if (selectBilan) selectBilan.innerHTML = optBilan;
    
    let btnEdit = document.getElementById('btnEditEleve');
    if(idEleveCourant && eleves[idEleveCourant]) { 
        if (select) select.value = idEleveCourant; if (btnEdit) btnEdit.style.display = "inline-block";
        let inputMax = document.getElementById('inputMaxAteliersEleve'); let inputMaxTab = document.getElementById('inputMaxTablettesEleve'); let maxAff = document.getElementById('maxAteliersAffiche');
        if (inputMax) inputMax.value = eleves[idEleveCourant].maxAteliers || 15; if (inputMaxTab) inputMaxTab.value = eleves[idEleveCourant].maxTablettes ?? 2; if (maxAff) maxAff.innerText = eleves[idEleveCourant].maxAteliers || 15; 
    } else { if (btnEdit) btnEdit.style.display = "none"; }
    if(idEleveCourant && !idEleveImpressionCourant) { idEleveImpressionCourant = idEleveCourant; }
    if(idEleveImpressionCourant) { if (selectImp) selectImp.value = idEleveImpressionCourant; if (selectBilan && eleves[idEleveImpressionCourant]) selectBilan.value = idEleveImpressionCourant; }
}

function modifierMaxAteliersEleve() { if(!idEleveCourant) return; let val = parseInt(document.getElementById('inputMaxAteliersEleve').value); if(isNaN(val) || val < 1) val = 1; if(val > 25) val = 25; eleves[idEleveCourant].maxAteliers = val; sauvegarderEleves(); let maxAff = document.getElementById('maxAteliersAffiche'); if(maxAff) maxAff.innerText = val; }
function modifierMaxTablettesEleve() { if(!idEleveCourant) return; let val = parseInt(document.getElementById('inputMaxTablettesEleve').value); if(isNaN(val) || val < 0) val = 0; if(val > 10) val = 10; eleves[idEleveCourant].maxTablettes = val; sauvegarderEleves(); if(idEleveCourant) afficherPlanHebdo(); }

function creerEleve() { 
    const nomInput = document.getElementById('nouvelEleveNom'); const nivSelect = document.getElementById('nouvelEleveNiveau'); if(!nomInput) return;
    const nom = nomInput.value.trim(); if(!nom) return; const niveau = nivSelect ? nivSelect.value : "CP"; const id = 'eleve_' + Date.now(); 
    eleves[id] = { id: id, nom: nom, niveau: niveau, planHebdo: [], enAttente: [], historique: [], masquees: [], priorites: [], maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {}, joursAssignes: {}, dateDebutISO: "", dateDebut: "", dateFin: "" }; 
    assurerStructureSemaines(eleves[id]);
    sauvegarderEleves(); nomInput.value = ''; majListeInstantaneeEleve(id); rafraichirDashboard(); 
}

function majListeInstantaneeEleve(newId) { majListeEleves(); let sel = document.getElementById('selectEleveProfile'); if(sel) sel.value = newId; chargerEleve(); }

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

function majBarreSemainesUI() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    assurerStructureSemaines(e);
    syncEleveVersSemaineActive(e);

    const sel = document.getElementById('selectSemaineEleve');
    if (sel) {
        let html = '';
        e.semaines.forEach((s, idx) => {
            let datesTxt = (s.dateDebut && s.dateFin) ? ` (du ${s.dateDebut} au ${s.dateFin})` : '';
            let tag = idx === 0 ? ' [En cours]' : ' [D\'avance]';
            html += `<option value="${idx}">Semaine ${idx + 1}${datesTxt} — ${s.planHebdo.length} act.${tag}</option>`;
        });
        sel.innerHTML = html;
        sel.value = e.semaineIndex;
    }

    const btnSuppr = document.getElementById('btnSupprimerSemaine');
    if (btnSuppr) btnSuppr.style.display = e.semaines.length > 1 ? 'inline-block' : 'none';

    const inputDate = document.getElementById('dateDebutSemaineInput');
    const spanFin = document.getElementById('dateFinSemaineAffiche');
    if (inputDate) inputDate.value = e.dateDebutISO || "";
    if (spanFin) spanFin.innerText = e.dateFin ? `➔ au Vendredi ${e.dateFin}` : "➔ Vendredi : --/--";

    const labelTitre = document.getElementById('labelSemaineTitre');
    if (labelTitre) {
        let infoD = (e.dateDebut && e.dateFin) ? ` du ${e.dateDebut} au ${e.dateFin}` : "";
        labelTitre.innerText = `Semaine ${e.semaineIndex + 1}${infoD}`;
    }
}

function appliquerDateDebutSemaine(dateISO) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    let res = calculerVendrediDepuisISO(dateISO);
    e.dateDebutISO = dateISO || "";
    e.dateDebut = res.debutFR;
    e.dateFin = res.finFR;
    dateGlobaleDebutISO = e.dateDebutISO;
    dateGlobaleDebutFR = e.dateDebut;
    dateGlobaleFinFR = e.dateFin;
    sauvegarderEleves();
    majBarreSemainesUI();
}

function changerSemaineActive(nouvelIndex) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    chargerSemaineDepuisIndex(e, nouvelIndex);
    sauvegarderEleves();
    majBarreSemainesUI();
    afficherPlanHebdo();
    if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
    rafraichirDashboard();
}

function ajouterSemaineAvance() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    syncEleveVersSemaineActive(e);
    let derniereSem = e.semaines[e.semaines.length - 1];
    let nouvDebutISO = ""; let nouvDebutFR = ""; let nouvFinFR = "";
    if (derniereSem && derniereSem.dateDebutISO) {
        let calcPrec = calculerVendrediDepuisISO(derniereSem.dateDebutISO);
        if (calcPrec.lundiSuivantISO) {
            nouvDebutISO = calcPrec.lundiSuivantISO;
            let calcNouv = calculerVendrediDepuisISO(nouvDebutISO);
            nouvDebutFR = calcNouv.debutFR;
            nouvFinFR = calcNouv.finFR;
        }
    }
    let planInitial = [...(e.enAttente || [])];
    let priosInitiales = [...(e.enAttente || [])];
    e.enAttente = [];

    e.semaines.push({
        id: 'sem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        dateDebutISO: nouvDebutISO,
        dateDebut: nouvDebutFR,
        dateFin: nouvFinFR,
        planHebdo: planInitial,
        priorites: priosInitiales,
        joursAssignes: {},
        valides: {},
        suivi: JSON.parse(JSON.stringify(e.suivi || {}))
    });
    chargerSemaineDepuisIndex(e, e.semaines.length - 1);
    sauvegarderEleves();
    majBarreSemainesUI();
    afficherPlanHebdo();
    if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
    showToast(`Semaine ${e.semaines.length} créée (avec ${planInitial.length} atelier(s) prioritaire(s)) !`, "success");
}

function supprimerSemaineActive() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    if (e.semaines.length <= 1) return;
    if (confirm(`Supprimer la Semaine ${e.semaineIndex + 1} préparée pour ${e.nom} ?`)) {
        e.semaines.splice(e.semaineIndex, 1);
        let nouvIdx = Math.max(0, e.semaineIndex - 1);
        let s = e.semaines[nouvIdx];
        e.semaineIndex = nouvIdx;
        e.planHebdo = [...(s.planHebdo || [])];
        e.priorites = [...(s.priorites || [])];
        e.joursAssignes = { ...(s.joursAssignes || {}) };
        e.valides = { ...(s.valides || {}) };
        e.suivi = { ...(e.suivi || {}), ...(s.suivi || {}) };
        e.dateDebutISO = s.dateDebutISO || "";
        e.dateDebut = s.dateDebut || "";
        e.dateFin = s.dateFin || "";
        sauvegarderEleves();
        majBarreSemainesUI();
        afficherPlanHebdo();
        if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
        rafraichirDashboard();
        showToast("Semaine supprimée.", "success");
    }
}

function chargerEleve() {
    const sel = document.getElementById('selectEleveProfile'); if (!sel) return; idEleveCourant = sel.value;
    const zoneTravail = document.getElementById('zoneTravail'); const message = document.getElementById('messageSelectEleve'); const btnEdit = document.getElementById('btnEditEleve');
    if(!idEleveCourant) { if(zoneTravail) zoneTravail.style.display = 'none'; if(message) message.style.display = 'block'; if(btnEdit) btnEdit.style.display = 'none'; return; }
    if(zoneTravail) zoneTravail.style.display = 'block'; if(message) message.style.display = 'none'; if(btnEdit) btnEdit.style.display = 'inline-block';
    let e = eleves[idEleveCourant];
    assurerStructureSemaines(e);
    document.querySelectorAll('.nomEleveAffiche').forEach(el => el.innerText = e.nom);
    let inputMax = document.getElementById('inputMaxAteliersEleve'); let inputMaxTab = document.getElementById('inputMaxTablettesEleve'); let maxAff = document.getElementById('maxAteliersAffiche');
    if(inputMax) inputMax.value = e.maxAteliers || 15; if(inputMaxTab) inputMaxTab.value = e.maxTablettes ?? 2; if(maxAff) maxAff.innerText = e.maxAteliers || 15;
    majBarreSemainesUI();
    afficherPlanHebdo(); afficherHistorique(); if(document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
}

function assignerJour(idActivite, jour) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let eleve = eleves[idEleveCourant];
    if (!eleve.joursAssignes) eleve.joursAssignes = {};
    if (jour) { eleve.joursAssignes[idActivite] = jour; } else { delete eleve.joursAssignes[idActivite]; }
    sauvegarderEleves(); afficherPlanHebdo();
}

function cocherNiveauModal(classeCheckbox, niveauCible) {
    document.querySelectorAll('.' + classeCheckbox + ':not(:disabled)').forEach(cb => {
        let e = eleves[cb.value];
        if (!niveauCible) cb.checked = false;
        else if (niveauCible === 'TOUS') cb.checked = true;
        else if (e && (e.niveau || 'CP').toUpperCase() === niveauCible.toUpperCase()) cb.checked = true;
    });
}

function genererBarreSelectionNiveauxHtml(classeCheckbox) {
    return `<div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ccc;">
        <span style="font-size:11px; font-weight:bold; color:#7f8c8d; width:100%;">Sélection rapide par niveau :</span>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'TOUS')">✅ Tous</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', '')">❌ Aucun</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CP')">📘 CP</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE1')">📘 CE1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE2')">📘 CE2</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM1')">📘 CM1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM2')">📘 CM2</button>
    </div>`;
}

function ouvrirModalDuplication() {
    if(!idEleveCourant || eleves[idEleveCourant].planHebdo.length === 0) { showToast("Le plan de l'élève est vide.", "error"); return; }
    document.getElementById('nomEleveSourceDupli').innerText = eleves[idEleveCourant].nom;
    let html = genererBarreSelectionNiveauxHtml('cb-dupli-eleve');
    let elevesTries = getElevesTries();
    elevesTries.forEach(e => { if(e.id !== idEleveCourant) { html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}</label>`; } });
    document.getElementById('listeElevesDupli').innerHTML = html; document.getElementById('modalDupliquer').style.display = 'flex';
}

function validerDuplication() {
    if(!idEleveCourant) return; const planSource = eleves[idEleveCourant].planHebdo; const joursSource = eleves[idEleveCourant].joursAssignes || {};
    let checks = document.querySelectorAll('.cb-dupli-eleve:checked');
    if(checks.length === 0) { showToast("Sélectionnez au moins un élève.", "error"); return; } let msgCount = 0;
    checks.forEach(cb => {
        const target = eleves[cb.value]; assurerStructureSemaines(target); if(!target.joursAssignes) target.joursAssignes = {};
        planSource.forEach(idAct => {
            if (!target.planHebdo.includes(idAct) && !target.historique.some(h=>h.idActivite === idAct) && target.planHebdo.length < (target.maxAteliers||15)) {
                target.planHebdo.push(idAct); if(joursSource[idAct]) target.joursAssignes[idAct] = joursSource[idAct]; msgCount++;
            }
        });
        syncEleveVersSemaineActive(target);
    });
    sauvegarderEleves(); document.getElementById('modalDupliquer').style.display = 'none'; rafraichirDashboard(); showToast(`${msgCount} activités ajoutées en tout.`, "success");
}

let activiteAssignationEnCours = null;
function assignerActivite(idActivite) {
    activiteAssignationEnCours = idActivite; let act = baseDonnees.find(a => a.id === idActivite); if (!act) return;
    document.getElementById('nomActiviteAssign').innerText = act.ressource;
    let selJour = document.getElementById('selectJourAssignMultiple'); if (selJour) selJour.value = "";
    let html = genererBarreSelectionNiveauxHtml('cb-assign-eleve');
    let elevesTries = getElevesTries();
    elevesTries.forEach(e => {
        assurerStructureSemaines(e);
        let dejaPrevu = e.semaines.some(s => s.planHebdo && s.planHebdo.includes(idActivite)) || e.historique.some(h => h.idActivite === idActivite);
        let disabled = dejaPrevu ? "disabled checked" : ""; let color = disabled ? "color: #95a5a6; text-decoration: line-through;" : "";
        html += `<label style="cursor:pointer; font-size:14px; ${color}"><input type="checkbox" class="cb-assign-eleve" value="${e.id}" ${disabled}> [${e.niveau}] ${escHTML(e.nom)} (Semaine ${e.semaineIndex + 1})</label>`;
    });
    document.getElementById('listeElevesAssign').innerHTML = html; document.getElementById('modalAssigner').style.display = 'flex';
}

function validerAssignationMultiple() {
    if (!activiteAssignationEnCours) return; let checks = document.querySelectorAll('.cb-assign-eleve:checked:not(:disabled)');
    if (checks.length === 0) { document.getElementById('modalAssigner').style.display = 'none'; return; }
    let selJour = document.getElementById('selectJourAssignMultiple');
    let jourChoisi = selJour ? selJour.value : "";
    let count = 0;
    checks.forEach(cb => {
        let e = eleves[cb.value]; assurerStructureSemaines(e);
        if (e.planHebdo.length < (e.maxAteliers || 15)) {
            e.planHebdo.push(activiteAssignationEnCours);
            if (jourChoisi) { if (!e.joursAssignes) e.joursAssignes = {}; e.joursAssignes[activiteAssignationEnCours] = jourChoisi; }
            syncEleveVersSemaineActive(e);
            count++;
        }
    });
    sauvegarderEleves(); document.getElementById('modalAssigner').style.display = 'none'; rafraichirDashboard(); if(idEleveCourant) afficherPlanHebdo(); showToast(`Activité assignée à ${count} élève(s).`, "success");
}

function commencerNouvelleSemaine() {
    if(!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
    let msg = eleve.semaines.length > 1
        ? `Voulez-vous clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom} et passer automatiquement à la semaine préparée suivante ?\n\nLes activités notées "à revoir / à refaire" y seront placées EN PRIORITÉ.`
        : `Voulez-vous clôturer cette semaine pour ${eleve.nom} et initialiser une nouvelle semaine ?\n\nLes activités notées "à revoir / à refaire" seront placées EN PRIORITÉ dans le nouveau plan.`;
    if(confirm(msg)) {
        let aTransferer = [...(eleve.enAttente || [])];
        (eleve.planHebdo || []).forEach(idAct => {
            if (eleve.suivi && eleve.suivi[idAct] && (eleve.suivi[idAct].statut === 'a_revoir' || eleve.suivi[idAct].statut === 'a_refaire')) {
                if (!aTransferer.includes(idAct)) aTransferer.push(idAct);
            }
        });
        eleve.enAttente = [];

        if (eleve.semaines.length > 1) {
            eleve.semaines.splice(eleve.semaineIndex, 1);
            let nextIdx = Math.min(eleve.semaineIndex, eleve.semaines.length - 1);
            eleve.semaineIndex = nextIdx;
            let s = eleve.semaines[nextIdx];
            if (!s.priorites) s.priorites = [];
            aTransferer.forEach(idAct => {
                if (!s.planHebdo.includes(idAct)) s.planHebdo.unshift(idAct);
                if (!s.priorites.includes(idAct)) s.priorites.push(idAct);
            });
            eleve.planHebdo = [...s.planHebdo];
            eleve.priorites = [...s.priorites];
            eleve.joursAssignes = { ...(s.joursAssignes || {}) };
            eleve.valides = { ...(s.valides || {}) };
            eleve.suivi = { ...(eleve.suivi || {}), ...(s.suivi || {}) };
            eleve.dateDebutISO = s.dateDebutISO || "";
            eleve.dateDebut = s.dateDebut || "";
            eleve.dateFin = s.dateFin || "";
        } else {
            let nextISO = ""; let nextDeb = ""; let nextFin = "";
            if (eleve.dateDebutISO) {
                let c = calculerVendrediDepuisISO(eleve.dateDebutISO);
                if (c.lundiSuivantISO) {
                    nextISO = c.lundiSuivantISO;
                    let c2 = calculerVendrediDepuisISO(nextISO);
                    nextDeb = c2.debutFR; nextFin = c2.finFR;
                }
            }
            eleve.planHebdo = [...aTransferer];
            eleve.valides = {};
            eleve.priorites = [...aTransferer];
            eleve.joursAssignes = {};
            eleve.dateDebutISO = nextISO; eleve.dateDebut = nextDeb; eleve.dateFin = nextFin;
            eleve.semaines[0] = { id: 'sem_' + Date.now(), dateDebutISO: nextISO, dateDebut: nextDeb, dateFin: nextFin, planHebdo: [...eleve.planHebdo], priorites: [...eleve.priorites], joursAssignes: {}, valides: {}, suivi: JSON.parse(JSON.stringify(eleve.suivi || {})) };
        }
        dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_')); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Semaine suivante activée avec report prioritaire !", "success");
    }
}

function basculerPriorite(idActivite) {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if (!eleve.priorites) eleve.priorites = []; let idx = eleve.priorites.indexOf(idActivite);
    if (idx > -1) { eleve.priorites.splice(idx, 1); } else { eleve.priorites.push(idActivite); } sauvegarderEleves(); afficherPlanHebdo();
}

// ==========================================
// VALIDATIONS & PLAN HEBDO
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
    if(idx > -1) {
        e.enAttente.splice(idx, 1);
        if (!e.planHebdo.includes(idActivite)) e.planHebdo.unshift(idActivite);
        if (!e.priorites) e.priorites = [];
        if (!e.priorites.includes(idActivite)) e.priorites.push(idActivite);
        sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo(); rafraichirDashboard();
    }
}

function validerDirectement(idActivite) { if(!idEleveCourant) return; marquerCommeValideSansRafraichir(idActivite, eleves[idEleveCourant]); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Activité validée !", "success"); }
function masquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant]; const max = eleve.maxAteliers || 15;
    if (eleve.planHebdo.length >= max) { showToast(`⚠️ Limite maximale atteinte.`, "error"); return; }
    const actAjoutee = baseDonnees.find(b => b.id === idActivite);
    if (actAjoutee && estActiviteTablette(actAjoutee)) { let maxTab = eleve.maxTablettes ?? 2; let nbTabActuels = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length; if (nbTabActuels >= maxTab) { showToast(`🚫 Limite atteinte : ${maxTab} atelier(s) tablette(s) max pour cet élève.`, "error"); return; } }
    
    let selectJourElem = document.getElementById('jour_dispo_' + idActivite);
    let jourChoisi = selectJourElem ? selectJourElem.value : "";

    eleve.planHebdo.push(idActivite);
    if (!eleve.joursAssignes) eleve.joursAssignes = {};
    if (jourChoisi) { eleve.joursAssignes[idActivite] = jourChoisi; }

    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard();
    showToast(jourChoisi ? `Ajouté au plan (${jourChoisi}) !` : "Ajouté au plan (Libre) !");
}

function retirerDuPlan(idActivite) { 
    let e = eleves[idEleveCourant]; let idx = e.planHebdo.indexOf(idActivite); 
    if(idx > -1) { e.planHebdo.splice(idx, 1); } else { idx = e.enAttente.indexOf(idActivite); if (idx > -1) e.enAttente.splice(idx, 1); }
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite]; if (e.valides && e.valides[idActivite]) delete e.valides[idActivite];
    if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré du plan.");
}

function desarchiverActivite(idActivite) {
    if(!idEleveCourant) return;
    if(confirm("Annuler la validation de l'historique ?")) { const eleve = eleves[idEleveCourant]; const index = eleve.historique.findIndex(h => h.idActivite === idActivite); if(index > -1) { eleve.historique.splice(index, 1); sauvegarderEleves(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard();} }
}

function afficherPlanHebdo() {
    const eleve = eleves[idEleveCourant]; const tbodyApercu = document.getElementById('tableApercuPlan'); if(!tbodyApercu || !eleve) return; tbodyApercu.innerHTML = '';
    document.getElementById('compteurAteliersEleve').innerText = eleve.planHebdo.length; document.getElementById('maxAteliersAffiche').innerText = eleve.maxAteliers || 15;
    let nbTabCount = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length; let compteurTabElem = document.getElementById('compteurTablettesEleve'); if(compteurTabElem) compteurTabElem.innerText = `${nbTabCount}/${eleve.maxTablettes ?? 2}`;

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || [], eleve.suivi || {});

    planObjects.forEach((a, index) => {
        const num = index + 1; let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
        let isPrio = (eleve.priorites && eleve.priorites.includes(a.id)) || statutSuivi === 'a_revoir' || statutSuivi === 'a_refaire';
        let prioStar = isPrio ? "⭐" : "☆"; let prioStyle = isPrio ? "color: #f1c40f;" : "color: #bdc3c7;";
        let etoilesHtml = formaterEtoiles(a.difficulte);
        
        let logoDebutLigne = statutSuivi === 'a_revoir' ? `<span style="font-size:16px; margin-right:3px;" title="À faire avec la maîtresse">👩‍🏫</span>` : (statutSuivi === 'a_refaire' ? `<span style="font-size:14px; margin-right:3px;" title="À refaire seul">🔄</span>` : "");

        let suiviHtml = '';
        if (eleve.suivi && eleve.suivi[a.id]) {
            let s = eleve.suivi[a.id]; let infoCommentaire = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
            if (s.statut === 'a_revoir') suiviHtml = `<br><span style="color:#c0392b; font-size:12px; font-weight:bold;">👩‍🏫 À revoir avec maîtresse (Prioritaire)</span>${infoCommentaire}`;
            if (s.statut === 'a_refaire') suiviHtml = `<br><span style="color:#d35400; font-size:12px; font-weight:bold;">🔄 À refaire seul (Prioritaire)</span>${infoCommentaire}`;
        }

        let jourActuel = (eleve.joursAssignes && eleve.joursAssignes[a.id]) ? eleve.joursAssignes[a.id] : "";
        let numClass = jourActuel ? "col-num num-jour-impose" : "col-num";
        let styleRessource = jourActuel ? "text-decoration: underline;" : "";

        let selectJourHtml = `<select onchange="assignerJour('${a.id}', this.value)" style="width:100%; padding:4px; font-size:12px; border-radius:4px; border:1px solid #bdc3c7; ${jourActuel ? 'background:#fef5e7; font-weight:bold; color:#d35400;' : ''}">
            <option value="">-- Libre --</option>
            <option value="Lundi" ${jourActuel === 'Lundi' ? 'selected' : ''}>Lundi</option>
            <option value="Mardi" ${jourActuel === 'Mardi' ? 'selected' : ''}>Mardi</option>
            <option value="Jeudi" ${jourActuel === 'Jeudi' ? 'selected' : ''}>Jeudi</option>
            <option value="Vendredi" ${jourActuel === 'Vendredi' ? 'selected' : ''}>Vendredi</option>
        </select>`;

        let actionHtml = estValide ? `<span style="color:#27ae60; font-weight:bold; font-size:12px;">✅ Fini</span><br><button type="button" class="btn-remove" style="width: 100%; margin-top:3px;" onclick="annulerValidationPlan('${a.id}')">↩️ Défaire</button>` : `<button type="button" class="btn-valid" style="width: 100%; margin-bottom: 5px;" onclick="validerDirectement('${a.id}')">🏁 Fini</button><button type="button" class="btn-remove" style="width: 100%;" onclick="retirerDuPlan('${a.id}')">❌ Retirer</button>`;

        let coulMat = getCouleurMatiereBandeau(a.matiere);
        let pastilleMat = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${coulMat.bg}; margin-right:4px;"></span>`;

        tbodyApercu.innerHTML += `<tr class="${rowClass}">
            <td style="text-align:center;"><input type="checkbox" class="cb-plan-valider" value="${a.id}" ${estValide ? 'checked disabled' : ''} style="transform: scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center; cursor:pointer;" class="badge-prio" onclick="basculerPriorite('${a.id}')" style="${prioStyle}">${prioStar}</td>
            <td class="${numClass}" title="${jourActuel ? 'Imposé le ' + jourActuel : ''}">${logoDebutLigne}${num}</td>
            <td>${pastilleMat}<strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td>
            <td>${logoDebutLigne}${etoilesHtml}<strong style="${styleRessource}">${escHTML(a.ressource)}</strong> ${badge} ${suiviHtml}</td>
            <td style="text-align:center;">${selectJourHtml}</td>
            <td>${actionHtml}</td>
        </tr>`;
    });
    if(eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="8" style="text-align:center;">Le plan de cette semaine est vide.</td></tr>';

    if (eleve.enAttente && eleve.enAttente.length > 0) {
        tbodyApercu.innerHTML += `<tr><td colspan="8" style="background:#f39c12; color:white; font-weight:bold; text-align:center; padding:10px; font-size:14px;">⏳ EN ATTENTE POUR LA SEMAINE SUIVANTE (Seront placés en priorité ⭐)</td></tr>`;
        let attenteObjects = getListeTrie(eleve.enAttente, eleve.priorites || [], eleve.suivi || {});
        attenteObjects.forEach((a) => {
            let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let suiviHtml = '';
            let etoilesHtml = formaterEtoiles(a.difficulte);
            let statutS = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
            let logoDeb = statutS === 'a_revoir' ? "👩‍🏫 " : "🔄 ";
            if (eleve.suivi && eleve.suivi[a.id]) {
                let s = eleve.suivi[a.id]; let infoCommentaire = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
                if (s.statut === 'a_revoir') suiviHtml = `<br><span style="color:#c0392b; font-size:12px; font-weight:bold;">👩‍🏫 À revoir avec maîtresse</span>${infoCommentaire}`;
                if (s.statut === 'a_refaire') suiviHtml = `<br><span style="color:#d35400; font-size:12px; font-weight:bold;">🔄 À refaire seul</span>${infoCommentaire}`;
            }
            let actionHtml = `<button type="button" class="btn-hide" style="width: 100%;" onclick="annulerAttente('${a.id}')">↩ Remettre dans la semaine affichée</button>`;
            tbodyApercu.innerHTML += `<tr style="background:#fef5e7;"><td style="text-align:center;">⏸️</td><td style="text-align:center;">⭐</td><td class="col-num">${logoDeb}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td><td>${logoDeb}${etoilesHtml}<strong>${escHTML(a.ressource)}</strong> ${badge} ${suiviHtml}</td><td style="text-align:center;">-</td><td>${actionHtml}</td></tr>`;
        });
    }
}
function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    let targetPage = document.getElementById(idPage);
    if(targetPage) targetPage.classList.add('active');
    if(element) element.classList.add('active');
    
    if(idPage === 'pageSuivi') { if(idEleveCourant) chargerEleve(); }
    if(idPage === 'pageEtiquettes') { initNiveaux(); afficherChoixEtiquettes(); }
    if(idPage === 'pageImpression') { if(idEleveCourant) { idEleveImpressionCourant = idEleveCourant; } majListeEleves(); changementEleveImpression(); } 
    if(idPage === 'pageBase') { majSelectCouleursRapides(); afficherBase(); }
    if(idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if(idPage === 'pageDashboard') { rafraichirDashboard(); }
    if(idPage === 'pageMatrice') { genererMatriceCompetences(); }
    if(idPage === 'pageBilan') { majListeEleves(); genererBilanEleve(); }
    if(idPage === 'pageSave') { calculTailleStockage(); }
    
    window.scrollTo({top: 0, behavior: 'smooth'});
}
