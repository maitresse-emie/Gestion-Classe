// ==========================================
// 1. SETUP, CONSTANTES ET COULEURS MATIÈRES
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
let filtreEtoilesDispo = 0; // 0 = Toutes, 1 = ⭐, 2 = ⭐⭐, 3 = ⭐⭐⭐

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

// Code couleur strict par matière pour les titres et bandeaux de séquences
function getCouleurMatiereBandeau(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("ecriture")) {
        return { bg: "#1b4f72", text: "#ffffff", border: "#154360" }; // Bleu foncé (Français)
    }
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure")) {
        return { bg: "#c0392b", text: "#ffffff", border: "#922b21" }; // Rouge (Mathématiques)
    }
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie")) {
        return { bg: "#795548", text: "#ffffff", border: "#5d4037" }; // Marron (Arts)
    }
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite")) {
        return { bg: "#e67e22", text: "#ffffff", border: "#d35400" }; // Orange (EPS)
    }
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) {
        return { bg: "#5dade2", text: "#ffffff", border: "#2e86c1" }; // Bleu clair (Histoire-Géo)
    }
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) {
        return { bg: "#27ae60", text: "#ffffff", border: "#1e8449" }; // Vert (Sciences et Technologie)
    }
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol")) {
        return { bg: "#e84393", text: "#ffffff", border: "#c2185b" }; // Rose (Langues étrangères)
    }
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) {
        return { bg: "#8e44ad", text: "#ffffff", border: "#6c3483" }; // Violet (EMC)
    }
    return { bg: "#eaeded", text: "#2c3e50", border: "#bdc3c7" }; // Neutre par défaut
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
    // Fusionner le suivi pour ne jamais perdre le statut "à revoir / à refaire" d'une semaine sur l'autre
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

// Tri du plan : place en priorité absolue les activités "à revoir / à refaire" et les étoiles ⭐
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
// 2. UI, THÈMES VISUELS ET OUTILS
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
// 3. SYNCHRONISATION GOOGLE DRIVE
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
// 4. GESTION DES ELEVES, SEMAINES & DATES
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
    // Intégrer automatiquement en priorité les exercices en attente (à revoir / à refaire) dans la nouvelle semaine préparée
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
    showToast(`Semaine ${e.semaines.length} créée (avec ${planInitial.length} atelier(s) prioritaire(s) reporté(s)) !`, "success");
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
        // Récupérer à la fois les activités en attente ET les activités non validées du plan actuel qui ont un statut a_revoir ou a_refaire
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
            eleve.priorites = [...aTransferer]; // Toutes les activités à refaire/revoir passent en priorité !
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
// 5. VALIDATIONS, LOGO 👩‍🏫 & PLAN HEBDO
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
        
        // Logo de la maîtresse au début de la ligne si "à revoir avec la maitresse"
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

function afficherHistorique() {
    const eleve = eleves[idEleveCourant]; const tbodyHist = document.getElementById('tableHistorique'); const tbodyMasq = document.getElementById('tableMasquees'); if(!tbodyHist || !tbodyMasq) return; tbodyHist.innerHTML = ''; tbodyMasq.innerHTML = '';
    [...eleve.historique].reverse().forEach(hist => { const a = baseDonnees.find(b => b.id === hist.idActivite); if(a) tbodyHist.innerHTML += `<tr><td><strong>${hist.date}</strong></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="desarchiverActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Restaurer</button></td></tr>`; });
    if(eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun historique.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if(a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="demasquerActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Réintégrer</button></td></tr>`; });
    if(eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune activité masquée.</td></tr>';
}

function filtrerParEtoilesDispo(nbEtoiles) {
    filtreEtoilesDispo = nbEtoiles;
    document.querySelectorAll('.btn-filtre-etoile-dispo').forEach(b => b.classList.remove('active'));
    let btnActif = document.getElementById('btn_etoile_dispo_' + nbEtoiles);
    if (btnActif) btnActif.classList.add('active');
    afficherRessourcesDisponibles();
}

function afficherRessourcesDisponibles() {
    const niveau = document.getElementById('selectNiveau').value; const periode = document.getElementById('selectPeriode').value; const matiere = document.getElementById('selectMatiere').value;
    const sequence = document.getElementById('selectSequence').value; const zoneRessources = document.getElementById('zoneRessources'); const tbody = document.getElementById('tableRessourcesDispo');
    if(!sequence || !idEleveCourant) { if(zoneRessources) zoneRessources.style.display = 'none'; return; }
    if(zoneRessources) zoneRessources.style.display = 'block'; if(tbody) tbody.innerHTML = '';

    // Injection dynamique de la barre de filtre par étoiles si elle n'existe pas encore
    if (zoneRessources && !document.getElementById('barreFiltreEtoilesDispo')) {
        let divStars = document.createElement('div');
        divStars.id = 'barreFiltreEtoilesDispo';
        divStars.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap;';
        divStars.innerHTML = `<span style="font-size:12px; font-weight:bold; color:#7f8c8d;">Filtrer par difficulté :</span>
            <button type="button" id="btn_etoile_dispo_0" class="filter-btn btn-filtre-etoile-dispo active" onclick="filtrerParEtoilesDispo(0)">Toutes</button>
            <button type="button" id="btn_etoile_dispo_1" class="filter-btn btn-filtre-etoile-dispo" onclick="filtrerParEtoilesDispo(1)">⭐ Niveau 1</button>
            <button type="button" id="btn_etoile_dispo_2" class="filter-btn btn-filtre-etoile-dispo" onclick="filtrerParEtoilesDispo(2)">⭐⭐ Niveau 2</button>
            <button type="button" id="btn_etoile_dispo_3" class="filter-btn btn-filtre-etoile-dispo" onclick="filtrerParEtoilesDispo(3)">⭐⭐⭐ Niveau 3</button>`;
        zoneRessources.insertBefore(divStars, tbody);
    }
    
    const eleve = eleves[idEleveCourant];
    assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);

    let activites = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere && a.sequence === sequence);
    if(periode) { activites = activites.filter(a => { let key = a.matiere + "|" + a.competence; return programmations[key] && programmations[key].includes(periode); }); }
    if(filtreEtoilesDispo > 0) { activites = activites.filter(a => (parseInt(a.difficulte) || 0) === filtreEtoilesDispo); }
    
    const idsHistorique = eleve.historique.map(h => h.idActivite);
    const idsToutesSemaines = new Set();
    eleve.semaines.forEach(s => { if (s.planHebdo) s.planHebdo.forEach(id => idsToutesSemaines.add(id)); });

    let nbAffichees = 0;
    activites.forEach(a => {
        if(idsHistorique.includes(a.id)) return;
        if(eleve.masquees && eleve.masquees.includes(a.id)) return;
        if(idsToutesSemaines.has(a.id)) return;
        if(eleve.enAttente && eleve.enAttente.includes(a.id)) return;

        nbAffichees++; let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Évaluation</span>` : ''; let rowClass = a.estEvaluation ? 'row-eval' : '';
        tbody.innerHTML += `<tr class="${rowClass}">
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> <br><span style="font-size:11px; color:#7f8c8d;">(${escHTML(a.typeRes)} Atelier: ${escHTML(a.symbole)})</span> ${badge}</td>
            <td style="text-align: right; width: 340px; white-space: nowrap;">
                <select id="jour_dispo_${a.id}" style="padding:5px; font-size:12px; border-radius:4px; border:1px solid #2980b9; margin-right:4px;" title="Choisir un jour imposé ou laisser libre">
                    <option value="">📅 Libre (Au choix)</option>
                    <option value="Lundi">Lundi</option>
                    <option value="Mardi">Mardi</option>
                    <option value="Jeudi">Jeudi</option>
                    <option value="Vendredi">Vendredi</option>
                </select>
                <button type="button" class="btn-add" onclick="ajouterAuPlan('${a.id}')">➕ Plan</button>
                <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')">🏁 Fini</button>
                <button type="button" class="btn-hide" onclick="masquerActivite('${a.id}')">🚫 Masq</button>
            </td>
        </tr>`;
    });
    if(nbAffichees === 0) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#7f8c8d;">Aucune activité disponible pour ces critères (ou toutes sont déjà planifiées).</td></tr>';
}

// ==========================================
// 6. PROGRAMMATION ANNUELLE
// ==========================================
function initProgFilters() {
    let selectNiv = document.getElementById('progNiveau'); let selectMat = document.getElementById('progMatiere'); if(!selectNiv || !selectMat) return;
    let niveauxExistants = new Set(); baseDonnees.forEach(a => { if(a.niveau) a.niveau.split(/[,/]+/).forEach(x => { if(x.trim()) niveauxExistants.add(x.trim().toUpperCase()); }); });
    let nivs = Array.from(niveauxExistants).filter(Boolean); const ordreNiveaux = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    nivs.sort((a,b) => (ordreNiveaux[a] || 99) - (ordreNiveaux[b] || 99));
    let htmlNiv = '<option value="">-- Tous les niveaux --</option>'; nivs.forEach(n => htmlNiv += `<option value="${escHTML(n)}">${escHTML(n)}</option>`);
    let oldNiv = selectNiv.value; selectNiv.innerHTML = htmlNiv; if(nivs.includes(oldNiv)) selectNiv.value = oldNiv;
    
    let mats = [...new Set(baseDonnees.map(a => a.matiere))].filter(Boolean).sort((a,b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));
    let htmlMat = '<option value="">-- Toutes les matières --</option>'; mats.forEach(m => htmlMat += `<option value="${escHTML(m)}">${escHTML(m)}</option>`);
    let oldMat = selectMat.value; selectMat.innerHTML = htmlMat; if(mats.includes(oldMat)) selectMat.value = oldMat;
}

function afficherProgrammation() {
    let selectNiv = document.getElementById('progNiveau'); let selectMat = document.getElementById('progMatiere'); let tbody = document.getElementById('tableProg');
    if(!tbody || !selectNiv || !selectMat) return;
    let niv = selectNiv.value; let mat = selectMat.value;
    let activitesFiltrees = Array.isArray(baseDonnees) ? baseDonnees : [];
    if(niv) activitesFiltrees = activitesFiltrees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niv));
    if(mat) activitesFiltrees = activitesFiltrees.filter(a => a.matiere === mat);
    
    let clesUniques = new Map();
    activitesFiltrees.forEach(a => {
        let m = (a.matiere || "").trim(); let s = (a.sequence || "").trim(); let c = (a.competence || "").trim();
        if(!m && !c) return;
        let key = m + "|" + s + "|" + c;
        if(!clesUniques.has(key)) { clesUniques.set(key, { matiere: m, sequence: s, competence: c }); }
    });
    
    let listeItems = Array.from(clesUniques.values()).sort((a,b) => {
        let mA = nettoyerNomPourTri(a.matiere); let mB = nettoyerNomPourTri(b.matiere);
        if(mA !== mB) return mA.localeCompare(mB, 'fr');
        if(a.sequence !== b.sequence) return a.sequence.localeCompare(b.sequence, 'fr');
        return a.competence.localeCompare(b.competence, 'fr');
    });
    
    let html = ''; let derniereMat = null;
    listeItems.forEach(item => {
        if(item.matiere !== derniereMat) {
            let coul = getCouleurMatiereBandeau(item.matiere);
            html += `<tr><td colspan="7" style="background:${coul.bg}; color:${coul.text}; font-size:14px; padding:10px;"><strong>📚 ${escHTML(item.matiere || 'Sans matière')}</strong></td></tr>`;
            derniereMat = item.matiere;
        }
        let progKey = item.matiere + "|" + item.competence; let progs = programmations[progKey] || [];
        html += `<tr>
            <td>${escHTML(item.sequence)}</td><td><strong>${escHTML(item.competence)}</strong></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P1', this.checked)" ${progs.includes('P1') ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P2', this.checked)" ${progs.includes('P2') ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P3', this.checked)" ${progs.includes('P3') ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P4', this.checked)" ${progs.includes('P4') ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', 'P5', this.checked)" ${progs.includes('P5') ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>
        </tr>`;
    });
    if(listeItems.length === 0) html = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#7f8c8d;">Aucune compétence trouvée dans la base de données.</td></tr>';
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
    let e = eleves[idEleve]; assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
    if(!e.suivi) e.suivi = {}; if(!e.enAttente) e.enAttente = []; if(!e.priorites) e.priorites = [];
    if(!e.suivi[idAct]) e.suivi[idAct] = { statut: '', commentaire: '' };

    if(e.suivi[idAct].statut === statut) {
        if(confirm("Voulez-vous retirer ce statut et remettre l'activité normalement dans le plan actuel ?")) {
            e.suivi[idAct].statut = ''; e.suivi[idAct].commentaire = '';
            let idx = e.enAttente.indexOf(idAct);
            if (idx > -1) { e.enAttente.splice(idx, 1); if (!e.planHebdo.includes(idAct)) e.planHebdo.push(idAct); }
            let nextSem = e.semaines[e.semaineIndex + 1];
            if (nextSem && nextSem.planHebdo.includes(idAct)) {
                nextSem.planHebdo = nextSem.planHebdo.filter(id => id !== idAct);
                if (!e.planHebdo.includes(idAct)) e.planHebdo.push(idAct);
            }
        } else {
            let result = prompt("Modifier le commentaire ou la note :", e.suivi[idAct].commentaire || '');
            if(result !== null) e.suivi[idAct].commentaire = result.trim();
        }
    } else {
        let actionName = statut === 'a_revoir' ? "👩‍🏫 À revoir avec la maîtresse" : "🔄 À refaire seul";
        let result = prompt(`[${actionName}]\nL'activité sera automatiquement placée EN PRIORITÉ dans la semaine suivante (avec le logo 👩‍🏫 si elle est à revoir avec vous).\nAjouter une note (facultatif) :`, e.suivi[idAct].commentaire || '');
        if(result !== null) { 
            e.suivi[idAct].statut = statut; e.suivi[idAct].commentaire = result.trim(); 
            if (e.valides && e.valides[idAct]) { delete e.valides[idAct]; e.historique = e.historique.filter(h => h.idActivite !== idAct); }
            if (!e.priorites.includes(idAct)) e.priorites.push(idAct);

            let idx = e.planHebdo.indexOf(idAct);
            if (idx > -1) e.planHebdo.splice(idx, 1);

            // Si une semaine suivante est déjà préparée d'avance, on l'y injecte directement en priorité !
            let nextSem = e.semaines[e.semaineIndex + 1];
            if (nextSem) {
                if (!nextSem.planHebdo.includes(idAct)) nextSem.planHebdo.unshift(idAct);
                if (!nextSem.priorites) nextSem.priorites = [];
                if (!nextSem.priorites.includes(idAct)) nextSem.priorites.push(idAct);
                if (!nextSem.suivi) nextSem.suivi = {};
                nextSem.suivi[idAct] = { ...e.suivi[idAct] };
            } else {
                if (!e.enAttente.includes(idAct)) e.enAttente.push(idAct);
            }
        }
    }
    sauvegarderEleves(); rafraichirDashboard(); if (idEleveCourant === idEleve) { majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); }
}

function validerDepuisDashboard(idEleve, idAct) {
    let eleve = eleves[idEleve];
    if (!eleve) return;
    if (eleve.valides && eleve.valides[idAct]) {
        delete eleve.valides[idAct];
        eleve.historique = eleve.historique.filter(h => h.idActivite !== idAct);
        sauvegarderEleves(); rafraichirDashboard(); showToast("Validation annulée.", "error");
    } else {
        marquerCommeValideSansRafraichir(idAct, eleve);
        if (eleve.enAttente && eleve.enAttente.includes(idAct)) {
            eleve.enAttente = eleve.enAttente.filter(id => id !== idAct);
            if (!eleve.planHebdo.includes(idAct)) eleve.planHebdo.push(idAct);
        }
        sauvegarderEleves(); rafraichirDashboard(); showToast("Validé !", "success");
    }
    if (idEleveCourant === idEleve) { majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); }
}

function archiverItem(cle) { if (!dashboardArchives.includes(cle)) { dashboardArchives.push(cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); showToast("Archivé", "success"); } }
function restaurerArchive(cle) { dashboardArchives = dashboardArchives.filter(k => k !== cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); showToast("Restauré", "success"); }
function viderArchives() { if (confirm("Supprimer définitivement toutes les archives ?")) { dashboardArchives = []; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); rafraichirDashboard(); } }
function toggleAfficherArchives() { afficherArchivesMode = !afficherArchivesMode; let zone = document.getElementById('zoneArchivesDashboard'); let btn = document.getElementById('btnToggleArchives'); if(zone) zone.style.display = afficherArchivesMode ? 'block' : 'none'; if(btn) btn.innerText = afficherArchivesMode ? "📂 Masquer les archives" : `📂 Voir les archives (${dashboardArchives.length})`; }

function rafraichirDashboard() {
    let groupes = {}; let tabletteGroupes = {}; 
    Object.values(eleves).forEach(e => {
        assurerStructureSemaines(e);
        if(!e.suivi) e.suivi = {}; if(!e.enAttente) e.enAttente = [];
        let idsTousPlans = new Set([...e.planHebdo, ...e.enAttente]);
        e.semaines.forEach(s => { if (s.planHebdo) s.planHebdo.forEach(id => idsTousPlans.add(id)); });

        idsTousPlans.forEach(idAct => {
            let act = baseDonnees.find(b => b.id === idAct);
            if (act && estActiviteTablette(act) && e.planHebdo.includes(idAct)) {
                let cleTabArchive = `tablette_${idAct}`;
                if (!dashboardArchives.includes(cleTabArchive)) {
                    if (!tabletteGroupes[idAct]) tabletteGroupes[idAct] = { act: act, eleves: [] };
                    if (!tabletteGroupes[idAct].eleves.includes(e.nom)) tabletteGroupes[idAct].eleves.push(e.nom);
                }
            }
            let s = e.suivi[idAct];
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire')) {
                let cleArchive = `${e.id}_${idAct}_${s.statut}`;
                if (!dashboardArchives.includes(cleArchive)) {
                    if (!groupes[idAct]) groupes[idAct] = { a_revoir: [], a_refaire: [] };
                    groupes[idAct][s.statut].push({ eleve: e, commentaire: s.commentaire });
                }
            }
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
        assurerStructureSemaines(e);
        let currentPlanLen = e.planHebdo ? e.planHebdo.length : 0; let max = e.maxAteliers || 15; let pct = Math.min(100, Math.round((currentPlanLen / max) * 100)); let colorBar = pct >= 100 ? "#e74c3c" : (pct > 75 ? "#f39c12" : "#27ae60"); let btnExpand = `<button type="button" class="btn-action" style="padding:6px 12px;" onclick="toggleExpandDashboard('${e.id}')">Évaluer ⬇️</button>`;
        let planObjectsTries = getListeTrie([...e.planHebdo, ...(e.enAttente || [])], e.priorites || [], e.suivi || {});
        let planMiniHtml = '<table style="width:100%; font-size:12px; background:#fdfefe; margin-top:5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        
        planObjectsTries.forEach((act, idx) => {
            let idAct = act.id; let s = e.suivi[idAct] || {}; let isAttente = (e.enAttente || []).includes(idAct);
            let estValide = e.valides && e.valides[idAct];
            
            let styleRefaire = s.statut === 'a_refaire' ? 'background:#f39c12; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let styleRevoir = s.statut === 'a_revoir' ? 'background:#e74c3c; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let styleValider = estValide ? 'background:#27ae60; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let texteValider = estValide ? '✅ Validé' : '✅ Valider';

            let infoC = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
            let attenteTag = isAttente ? `<br><span style="color:#e67e22; font-size:11px; font-weight:bold;">⏳ Reporté en priorité</span>` : '';
            let logoDeb = s.statut === 'a_revoir' ? '👩‍🏫 ' : (s.statut === 'a_refaire' ? '🔄 ' : '');
            
            planMiniHtml += `<tr style="${estValide ? 'background:#e8f8f5;' : ''}">
                <td style="width:35px; font-weight:bold; text-align:center; color:#e74c3c;">${logoDeb}#${idx+1}</td>
                <td><strong>${escHTML(act.matiere)}</strong> - ${escHTML(act.competence)}<br>${formaterEtoiles(act.difficulte)}<span style="color:#7f8c8d;">${escHTML(act.ressource)}</span>${infoC}${attenteTag}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="dashboard-eval-btn" style="${styleRefaire} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="setSuivi('${e.id}', '${idAct}', 'a_refaire')">🔄 À refaire</button>
                    <button class="dashboard-eval-btn" style="${styleRevoir} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="setSuivi('${e.id}', '${idAct}', 'a_revoir')">👩‍🏫 À revoir</button>
                    <button class="dashboard-eval-btn" style="${styleValider} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">${texteValider}</button>
                </td>
            </tr>`;
        });
        if(planObjectsTries.length === 0) planMiniHtml += '<tr><td colspan="3" style="text-align:center; padding:15px;">Plan vide.</td></tr>'; planMiniHtml += '</table>';
        let infoSem = e.semaines.length > 1 ? ` <span style="font-size:12px; color:#2980b9;">(Semaine ${e.semaineIndex + 1}/${e.semaines.length})</span>` : '';
        html += `<tr style="border-top: 2px solid #ecf0f1;"><td style="font-size:16px;"><strong>[${e.niveau}] ${escHTML(e.nom)}</strong>${infoSem}</td><td><div class="jauge-container"><div class="jauge-fill" style="width: ${pct}%; background-color: ${colorBar};"></div></div><div class="jauge-text">${currentPlanLen} ateliers en cours sur ${max} max</div></td><td style="text-align: center;">${btnExpand}</td></tr><tr id="dash_details_${e.id}" style="${dashboardExpanded.has(e.id) ? '' : 'display:none;'} background:#f2f4f4;"><td colspan="3" style="padding:15px;">${planMiniHtml}</td></tr>`;
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
    if (!idEleve || idEleve.startsWith("TOUS") || idEleve.startsWith("NIVEAU_")) { zone.innerHTML = '<h3 style="text-align: center; color: #7f8c8d; margin-top: 50px;">Sélectionnez un seul élève pour voir son bilan des évaluations.</h3>'; return; }
    let eleve = eleves[idEleve]; let evalActs = [];
    if(eleve.historique && Array.isArray(eleve.historique)) { eleve.historique.forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if(act && act.estEvaluation) { evalActs.push({ act: act, date: h.date }); } }); }
    if (evalActs.length === 0) { zone.innerHTML = `<h3 style="color:#2c3e50;">Bilan des évaluations - [${eleve.niveau}] ${escHTML(eleve.nom)}</h3><p>Aucune évaluation validée pour le moment.</p>`; return; }

    let nbA = 0, nbPA = 0, nbNA = 0;
    evalActs.forEach(item => {
        let v = (eleve.bilanEvaluations && eleve.bilanEvaluations[item.act.id]) ? eleve.bilanEvaluations[item.act.id] : "";
        if (v === 'A') nbA++; else if (v === 'PA') nbPA++; else if (v === 'NA') nbNA++;
    });

    let html = `<div style="border-bottom: 2px solid #9b59b6; padding-bottom: 10px; margin-bottom: 15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div><h2 style="margin:0; color:#2c3e50;">Bilan des Évaluations : [${eleve.niveau}] ${escHTML(eleve.nom)}</h2><p style="margin:5px 0 0 0; color:#7f8c8d; font-size:13px;">Généré le ${new Date().toLocaleDateString('fr-FR')} (${evalActs.length} évaluation(s))</p></div>
        <div style="display:flex; gap:10px;">
            <span style="background:#e8f8f5; border:1px solid #27ae60; color:#115e59; padding:6px 12px; border-radius:8px; font-weight:bold; font-size:13px;">✅ A : ${nbA}</span>
            <span style="background:#fef5e7; border:1px solid #f39c12; color:#7c2d12; padding:6px 12px; border-radius:8px; font-weight:bold; font-size:13px;">🟠 PA : ${nbPA}</span>
            <span style="background:#fdedec; border:1px solid #e74c3c; color:#881337; padding:6px 12px; border-radius:8px; font-weight:bold; font-size:13px;">❌ NA : ${nbNA}</span>
        </div>
    </div>`;

    let groupes = {}; evalActs.forEach(item => { let mat = item.act.matiere || "Autre"; if (!groupes[mat]) groupes[mat] = []; groupes[mat].push(item); });

    Object.keys(groupes).sort().forEach(mat => {
        let coul = getCouleurMatiereBandeau(mat);
        html += `<h3 style="background:${coul.bg}; color:${coul.text}; padding:6px 12px; border-radius:6px; margin-top:20px; font-size:14px;">${escHTML(mat)}</h3><table style="width:100%; font-size:13px; margin-bottom:15px;"><thead><tr><th>Compétence / Évaluation</th><th style="width:100px; text-align:center;">Date</th><th style="width:140px; text-align:center;">Position (A / PA / NA)</th></tr></thead><tbody>`;
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
    let html = '<option value="">-- Matière --</option>'; matieres.forEach(m => { html += `<option value="${escHTML(m)}">${escHTML(m)}</option>`; }); selectMatiere.innerHTML = html; majCascadeSequence();
}

function majCascadeSequence() {
    const niveau = document.getElementById('selectNiveau').value; const periode = document.getElementById('selectPeriode').value;
    const matiere = document.getElementById('selectMatiere').value; const selectSequence = document.getElementById('selectSequence'); if (!selectSequence) return;
    if(!matiere) { selectSequence.innerHTML = '<option value="">-- --</option>'; selectSequence.disabled = true; let zoneRes = document.getElementById('zoneRessources'); if(zoneRes) zoneRes.style.display = 'none'; return; }
    selectSequence.disabled = false;
    let activitesFiltrees = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere);
    if(periode) { activitesFiltrees = activitesFiltrees.filter(a => { let key = a.matiere + "|" + a.competence; return programmations[key] && programmations[key].includes(periode); }); }
    let sequences = [...new Set(activitesFiltrees.map(a => a.sequence))].filter(s => s).sort((a,b)=>a.localeCompare(b));
    let html = '<option value="">-- Séquence --</option>'; sequences.forEach(s => { html += `<option value="${escHTML(s)}">${escHTML(s)}</option>`; }); selectSequence.innerHTML = html; afficherRessourcesDisponibles();
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
    let symInput = document.getElementById('addSymbole'); if(symInput) symInput.value = a.symbole || '';
    let diffSelect = document.getElementById('addDifficulte'); if(diffSelect) diffSelect.value = a.difficulte || 0;
    document.querySelectorAll('.cb-pers-form').forEach(cb => { cb.checked = a.personnes && a.personnes.includes(cb.value); }); let evalInput = document.getElementById('addIsEval'); if(evalInput) evalInput.checked = a.estEvaluation || false;
    if (a.visuel && (a.visuel.startsWith('http') || a.visuel.startsWith('data:image'))) { document.getElementById('addImage').value = a.visuel; majSelectCouleursRapides('#ffffff'); document.getElementById('addColor').value = '#ffffff'; document.getElementById('addColor').style.display = 'none'; } else if (a.visuel && a.visuel.startsWith('#')) { majSelectCouleursRapides(a.visuel); document.getElementById('addColor').value = a.visuel; document.getElementById('addImage').value = ''; } else { majSelectCouleursRapides('#ffffff'); document.getElementById('addColor').value = '#ffffff'; document.getElementById('addColor').style.display = 'none'; document.getElementById('addImage').value = ''; }
    const box = document.getElementById('boxFormulaireManuel'); if(box) box.classList.add('edit-mode'); let titreForm = document.getElementById('titreFormulaireManuel'); if(titreForm) { titreForm.innerHTML = "✏️ Modifier l'activité"; titreForm.style.color = "#d35400"; }
    const btnValider = document.getElementById('btnValiderForm'); if(btnValider) { btnValider.innerHTML = "💾 Enregistrer"; btnValider.style.backgroundColor = "#d35400"; }
    let btnAnnuler = document.getElementById('btnAnnulerForm'); if(btnAnnuler) btnAnnuler.style.display = "inline-block"; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); isFormLoading = false; 
}

function annulerEdition() {
    idEnCoursEdition = null; couleurManuelleModifiee = false; isFormLoading = false;
    document.querySelectorAll('.cb-niveau-form').forEach(cb => cb.checked = false); document.querySelectorAll('.cb-pers-form').forEach(cb => cb.checked = false);
    let l = document.getElementById('addLecon'); if(l) l.value = ''; let cc = document.getElementById('addCompetenceCustom'); if(cc) cc.value = ''; let ar = document.getElementById('addRessource'); if(ar) ar.value = ''; let as = document.getElementById('addSymbole'); if(as) as.value = ''; let ad = document.getElementById('addDifficulte'); if(ad) ad.value = '0';
    let ats = document.getElementById('addTypeSelect'); if(ats) ats.value = ''; let atc = document.getElementById('addTypeCustom'); if(atc) { atc.style.display = 'none'; atc.value = ''; } let ams = document.getElementById('addMatiereSelect'); if(ams) ams.value = ''; let amc = document.getElementById('addMatiereCustom'); if(amc) { amc.style.display = 'none'; amc.value = ''; } let ass = document.getElementById('addSequenceSelect'); if(ass) ass.value = ''; let asc = document.getElementById('addSequenceCustom'); if(asc) { asc.style.display = 'none'; asc.value = ''; } let adi = document.getElementById('addImage'); if(adi) adi.value = ''; majSelectCouleursRapides('#ffffff'); let adc = document.getElementById('addColor'); if(adc) { adc.value = '#ffffff'; adc.style.display = 'none'; } let aie = document.getElementById('addIsEval'); if(aie) aie.checked = false; 
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
    let diffElem = document.getElementById('addDifficulte'); const difficulte = diffElem ? (parseInt(diffElem.value) || 0) : 0;
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
        if(idx > -1) { baseDonnees[idx] = { id: idEnCoursEdition, niveau: niveauStr, matiere: matiereFinal, sequence: sequenceFinal, lecon: leconElem ? leconElem.value.trim() : '', competence: competenceFinal, ressource: ressource, typeRes: typeFinal, symbole: symbole, difficulte: difficulte, atelier: "", personnes: persStr, correction: "", visuel: visuel, estEvaluation: evalElem ? evalElem.checked : false }; }
        annulerEdition(); 
    } else {
        baseDonnees.push({ id: 'act_' + Date.now() + Math.random().toString(36).substr(2, 9), niveau: niveauStr, matiere: matiereFinal, sequence: sequenceFinal, lecon: leconElem ? leconElem.value.trim() : '', competence: competenceFinal, ressource: ressource, typeRes: typeFinal, symbole: symbole, difficulte: difficulte, atelier: "", personnes: persStr, correction: "", visuel: visuel, estEvaluation: evalElem ? evalElem.checked : false });
        dernierNiveauForm = [...niveauxCoches]; derniereMatiereForm = matiereFinal; derniereSequenceForm = sequenceFinal; derniereCompForm = competenceFinal;
        if(resElem) resElem.value = ''; if(symElem) symElem.value = ''; if(imgElem) imgElem.value = ''; if(evalElem) evalElem.checked = false; if(diffElem) diffElem.value = '0';
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
            assurerStructureSemaines(e);
            if (e.planHebdo) e.planHebdo = e.planHebdo.filter(id => id !== idActivite); if (e.historique) e.historique = e.historique.filter(h => h.idActivite !== idActivite); if (e.masquees) e.masquees = e.masquees.filter(id => id !== idActivite);
            if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite]; if (e.valides && e.valides[idActivite]) delete e.valides[idActivite]; if (e.priorites) e.priorites = e.priorites.filter(id => id !== idActivite); if (e.enAttente) e.enAttente = e.enAttente.filter(id => id !== idActivite); if (e.bilanEvaluations && e.bilanEvaluations[idActivite]) delete e.bilanEvaluations[idActivite]; if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
            e.semaines.forEach(s => { if (s.planHebdo) s.planHebdo = s.planHebdo.filter(id => id !== idActivite); if (s.joursAssignes) delete s.joursAssignes[idActivite]; });
        });
        sauvegarderEleves(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); 
        if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); } rafraichirDashboard(); showToast("Activité supprimée", "success");
    } 
}

function viderBase() { 
    if(confirm("Vider la base ? Attention, cela retirera toutes les activités des plans des élèves.")) { 
        baseDonnees = []; 
        Object.values(eleves).forEach(e => { e.planHebdo = []; e.historique = []; e.masquees = []; e.suivi = {}; e.valides = {}; e.enAttente = []; e.priorites = []; e.bilanEvaluations = {}; e.joursAssignes = {}; e.semaines = []; assurerStructureSemaines(e); });
        sauvegarderEleves(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); 
        if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); } rafraichirDashboard(); showToast("Base vidée", "success");
    } 
}

// ==========================================
// 9. AFFICHAGE DE LA BASE ET ETIQUETTES
// ==========================================
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

        html += `<tr class="${rowClass}"><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${badge}</td><td>${escHTML(a.typeRes)}</td><td class="col-center">${escHTML(a.personnes)}</td><td style="text-align: center; vertical-align: middle;">${previewHtml}${controlsHtml}</td><td style="text-align: center; white-space: nowrap;"><button type="button" onclick="assignerActivite('${a.id}')" title="Assigner à un ou plusieurs élèves">👥</button> <button type="button" onclick="editerActiviteBase('${a.id}')">✏️</button> <button type="button" onclick="supprimerActiviteBase('${a.id}')" style="color:red;">❌</button></td></tr>`; 
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

        html += `<tr><td style="text-align: center;"><input type="checkbox" class="cb-etiquette" data-id="${a.id}" onchange="genererApercuEtiquettes()"></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)} ${visuelApercu} ${badge} <br><span style="font-size:10px; color:#7f8c8d;">Type: ${escHTML(a.typeRes)}</span></td><td style="text-align: center;"><input type="number" class="input-qte-etq" data-id="${a.id}" value="1" min="1" max="20" style="width: 50px; text-align: center; padding: 4px;" oninput="genererApercuEtiquettes()"></td></tr>`;
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

// ==========================================
// 10. SAUVEGARDE, IMPRESSION & INITIALISATION
// ==========================================
function exporterSauvegarde() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel' };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Sauvegarde_Classe_" + new Date().toLocaleDateString('fr-FR').replace(/\//g, '-') + ".json"; a.click();
}

function restaurerSauvegarde() {
    const fileInput = document.getElementById('fileImport'); if(!fileInput || fileInput.files.length === 0) return; const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.base && data.eleves) {
                baseDonnees = Array.isArray(data.base) ? data.base : []; eleves = data.eleves;
                if (data.archives) { dashboardArchives = data.archives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
                if (data.programmations) { programmations = data.programmations; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
                if (data.theme) { appliquerThemeVisuel(data.theme); }
                Object.values(eleves).forEach(el => assurerStructureSemaines(el));
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

function changementEleveImpression() {
    let selImp = document.getElementById('selectEleveImpression'); if(!selImp) return;
    idEleveImpressionCourant = selImp.value;
    let blocSem = document.getElementById('blocSelectSemaineImpression');
    let selSemImp = document.getElementById('selectSemaineImpression');
    let picker = document.getElementById('pdtDateDebutPicker');
    let spanFin = document.getElementById('pdtDateFinAffiche');

    if (idEleveImpressionCourant && eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant];
        assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
        if (blocSem && selSemImp) {
            blocSem.style.display = 'flex';
            let html = '';
            e.semaines.forEach((s, idx) => {
                let dTxt = (s.dateDebut && s.dateFin) ? ` (${s.dateDebut} au ${s.dateFin})` : '';
                html += `<option value="${idx}">Semaine ${idx + 1}${dTxt}</option>`;
            });
            selSemImp.innerHTML = html;
            selSemImp.value = e.semaineIndex;
        }
        if (e.dateDebutISO) {
            if (picker) picker.value = e.dateDebutISO;
            if (spanFin) spanFin.innerText = `➔ au Vendredi ${e.dateFin}`;
        }
    } else if (idEleveImpressionCourant && (idEleveImpressionCourant === 'TOUS_ELEVES' || idEleveImpressionCourant.startsWith('NIVEAU_'))) {
        if (blocSem && selSemImp) {
            blocSem.style.display = 'flex';
            let maxSem = 1;
            Object.values(eleves).forEach(el => { assurerStructureSemaines(el); if (el.semaines.length > maxSem) maxSem = el.semaines.length; });
            let curVal = selSemImp.value || "0";
            let html = '<option value="ACTIVE">Semaine active de chaque élève</option>';
            for (let i = 0; i < maxSem; i++) { html += `<option value="${i}">Semaine ${i + 1} pour tout le groupe</option>`; }
            selSemImp.innerHTML = html;
            selSemImp.value = (curVal === "ACTIVE" || parseInt(curVal) < maxSem) ? curVal : "ACTIVE";
        }
    } else {
        if (blocSem) blocSem.style.display = 'none';
    }
    rafraichirFicheImpression();
}

function changerSemaineDepuisImpression(nouvelIndex) {
    if (idEleveImpressionCourant && eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant];
        chargerSemaineDepuisIndex(e, nouvelIndex);
        sauvegarderEleves();
        changementEleveImpression();
    } else {
        rafraichirFicheImpression();
    }
}

function appliquerDateImpression(dateISO) {
    let res = calculerVendrediDepuisISO(dateISO);
    dateGlobaleDebutISO = dateISO || "";
    dateGlobaleDebutFR = res.debutFR;
    dateGlobaleFinFR = res.finFR;
    let spanFin = document.getElementById('pdtDateFinAffiche');
    if (spanFin) spanFin.innerText = res.finFR ? `➔ au Vendredi ${res.finFR}` : "➔ au --/--";

    if (idEleveImpressionCourant && eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant];
        e.dateDebutISO = dateGlobaleDebutISO;
        e.dateDebut = dateGlobaleDebutFR;
        e.dateFin = dateGlobaleFinFR;
        sauvegarderEleves();
        changementEleveImpression();
    } else {
        rafraichirFicheImpression();
    }
}

function rafraichirFicheImpression() {
    try {
        let selImp = document.getElementById('selectEleveImpression'); if(!selImp) return; idEleveImpressionCourant = selImp.value; 
        const container = document.getElementById('containerFichesImpression'); if(!container) return;
        if(!idEleveImpressionCourant) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;" class="no-print"><h2>Veuillez sélectionner un élève ou un groupe ci-dessus.</h2></div>'; return; }
        
        let selSemImp = document.getElementById('selectSemaineImpression');
        let choixSemGroupe = selSemImp ? selSemImp.value : "ACTIVE";

        if(idEleveImpressionCourant === 'TOUS_ELEVES' || idEleveImpressionCourant.startsWith('NIVEAU_')) {
            let listeEleves = getElevesTries();
            if (idEleveImpressionCourant.startsWith('NIVEAU_')) {
                let nivCible = idEleveImpressionCourant.replace('NIVEAU_', '');
                listeEleves = listeEleves.filter(e => (e.niveau || 'CP').toUpperCase() === nivCible);
            }
            if(listeEleves.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;" class="no-print"><h2>Aucun élève trouvé dans ce groupe.</h2></div>'; return; }
            let htmlGlobal = '';
            listeEleves.forEach(e => {
                assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
                let semIdx = (choixSemGroupe === "ACTIVE" || choiceInvalid(choixSemGroupe, e)) ? e.semaineIndex : parseInt(choixSemGroupe);
                htmlGlobal += genererHtmlFicheEleve(e, false, semIdx);
            });
            container.innerHTML = htmlGlobal;
        } else {
            if(eleves[idEleveImpressionCourant]) {
                let e = eleves[idEleveImpressionCourant];
                assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
                container.innerHTML = genererHtmlFicheEleve(e, true, e.semaineIndex);
            }
        }
    } catch(error) { console.error("Erreur lors de la génération de la fiche :", error); }
}

function choiceInvalid(val, e) {
    let idx = parseInt(val);
    return isNaN(idx) || idx < 0 || idx >= e.semaines.length;
}

function genererHtmlFicheEleve(eleve, estUnique, indexSemaineForce) {
    assurerStructureSemaines(eleve);
    let semObj = (indexSemaineForce !== undefined && eleve.semaines[indexSemaineForce]) ? eleve.semaines[indexSemaineForce] : eleve;
    let planIds = semObj.planHebdo || [];
    let priosIds = semObj.priorites || eleve.priorites || [];
    let joursMap = semObj.joursAssignes || eleve.joursAssignes || {};
    let suiviMap = { ...(eleve.suivi || {}), ...(semObj.suivi || {}) };

    let dateDebut = semObj.dateDebut || dateGlobaleDebutFR || '';
    let dateFin = semObj.dateFin || dateGlobaleFinFR || '';
    let infoDates = (dateDebut && dateFin) ? ` (du ${escHTML(dateDebut)} au ${escHTML(dateFin)})` : (dateDebut ? ` (à partir du ${escHTML(dateDebut)})` : "");
    
    let planObjects = getListeTrie(planIds, priosIds, suiviMap);
    let rowsHtml = ''; let derniereSequence = "";

    let joursJours = { "Lundi": [], "Mardi": [], "Jeudi": [], "Vendredi": [] };

    planObjects.forEach((a, index) => {
        const num = index + 1;
        let jourImpose = joursMap[a.id] || "";
        if (jourImpose && joursJours[jourImpose]) {
            joursJours[jourImpose].push(num);
        }

        if (a.sequence !== derniereSequence) {
            derniereSequence = a.sequence;
            let coul = getCouleurMatiereBandeau(a.matiere);
            rowsHtml += `<tr class="sequence-separator-row"><td colspan="7" style="background-color: ${coul.bg} !important; color: ${coul.text} !important; border-color: ${coul.border} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">📑 Séquence : ${escHTML(a.sequence)} (${escHTML(a.matiere)})</td></tr>`;
        }
        let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Évaluation</span>` : ''; let rowClass = a.estEvaluation ? 'row-eval' : ''; let repereHtml = ""; let typeAct = a.typeRes ? a.typeRes.trim().toLowerCase() : ""; let cfgType = null;
        for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
        let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""); let remplacerNum = (cfgType && typeof cfgType === 'object') ? cfgType.remplacerNum : false;
        let imageFinale = a.visuel || lienImageConfig || ""; imageFinale = formaterLienImage(imageFinale);
        if (imageFinale && !imageFinale.startsWith('#')) { if (remplacerNum) { repereHtml = `<img src="${imageFinale}" style="max-height: 40px; max-width: 70px; border-radius: 3px; vertical-align: middle; display: block; margin: auto;" title="${escHTML(a.typeRes)}">`; } else { let numAtelier = a.symbole ? `<strong>${escHTML(a.symbole)}</strong><br>` : ''; repereHtml = `${numAtelier}<img src="${imageFinale}" style="max-height: 32px; max-width: 60px; margin-top: 2px; border-radius: 2px; display: block; margin-left: auto; margin-right: auto;">`; } } else { repereHtml = `<strong>${escHTML(a.symbole || '')}</strong>`; }
        let bgColor = ""; if (a.visuel && a.visuel.startsWith('#') && a.visuel !== '#ffffff') { bgColor = `background-color: ${a.visuel}; color: ${isDarkColor(a.visuel) ? 'white' : 'black'}; border-radius: 2px; padding: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact;`; }

        let numCellClass = jourImpose ? "col-num num-jour-impose" : "col-num";
        let resStyle = jourImpose ? "text-decoration: underline;" : "";

        // Logo de la maîtresse 👩‍🏫 au début de la ligne si "à revoir avec la maitresse"
        let statutAct = (suiviMap && suiviMap[a.id]) ? suiviMap[a.id].statut : "";
        let logoMaitresseDebut = statutAct === 'a_revoir' ? `<span style="font-size: 13px; margin-right: 2px;">👩‍🏫</span>` : "";

        rowsHtml += `<tr class="${rowClass}">
            <td class="${numCellClass}" style="white-space:nowrap;">${logoMaitresseDebut}${num}</td>
            <td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em><br>' : ''}${escHTML(a.competence)}</td>
            <td>${logoMaitresseDebut}${formaterEtoiles(a.difficulte)}<strong style="${resStyle}">${escHTML(a.ressource)}</strong> ${badge}</td>
            <td class="col-center">${escHTML(a.typeRes || '')}</td>
            <td class="col-center print-visual-cell" style="${bgColor}; width: 80px; text-align: center;">${repereHtml}</td>
            <td class="col-center">${escHTML(a.personnes || '')}</td>
        </tr>`;
    });

    if(planObjects.length === 0) rowsHtml = '<tr><td colspan="7" style="text-align:center;">Le plan de travail est vide pour cet élève.</td></tr>';

    let totalAct = planObjects.length;
    let maxDansUnJour = Math.max(joursJours["Lundi"].length, joursJours["Mardi"].length, joursJours["Jeudi"].length, joursJours["Vendredi"].length);
    let lignesParJour = Math.max(2, Math.ceil(totalAct / 4) + 1, maxDansUnJour + 1);
    
    let planningRowsHtml = '';
    for(let i = 0; i < lignesParJour; i++) {
        let valLun = joursJours["Lundi"][i] !== undefined ? joursJours["Lundi"][i] : "";
        let valMar = joursJours["Mardi"][i] !== undefined ? joursJours["Mardi"][i] : "";
        let valJeu = joursJours["Jeudi"][i] !== undefined ? joursJours["Jeudi"][i] : "";
        let valVen = joursJours["Vendredi"][i] !== undefined ? joursJours["Vendredi"][i] : "";
        planningRowsHtml += `<tr>
            <td><span class="planning-cell-box">${valLun}</span></td>
            <td><span class="planning-cell-box">${valMar}</span></td>
            <td><span class="planning-cell-box">${valJeu}</span></td>
            <td><span class="planning-cell-box">${valVen}</span></td>
        </tr>`;
    }
    let wrapperClass = estUnique ? '' : 'plan-eleve-page';

    return `<div class="panel ${wrapperClass}" style="margin-top: 1px;"><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2c3e50; padding-bottom: 1px; margin-bottom: 2px;"><h2 style="margin:0; font-size: 11px;">Plan de travail - [${eleve.niveau}] ${escHTML(eleve.nom)}</h2><span style="font-size: 9.5px; font-weight: bold; color: #2980b9;">📅 Période${infoDates}</span></div><p style="font-size: 8px; font-style: italic; color: #555; margin: 0 0 2px 0; background: #f8f9f9; padding: 1px 3px; border-radius: 2px; border-left: 2px solid #2980b9;">💡 <strong>Consigne :</strong> Les numéros <u>soulignés</u> sont déjà placés dans ton semainier. Le symbole 👩‍🏫 indique un atelier à faire avec la maîtresse. Entoure le n° commencé et barre-le quand tu as terminé.</p><table><thead><tr><th class="col-num">N°</th><th>Matière & Séquence</th><th>Compétence visée</th><th>Ressource à réaliser</th><th class="col-center">Type</th><th class="col-center" style="width: 80px;">N° Atelier</th><th class="col-center">Nb Pers.</th></tr></thead><tbody>${rowsHtml}</tbody></table><h4 style="margin: 2px 0 1px 0; color: #2c3e50; font-size: 8.5px;">📅 Planification journalière (Écris le N° de l'activité à faire) :</h4><table class="planning-table"><thead><tr><th>Lundi</th><th>Mardi</th><th>Jeudi</th><th>Vendredi</th></tr></thead><tbody>${planningRowsHtml}</tbody></table></div>`;
}

// Injection automatique du bouton Design et de la fenêtre de thème s'ils ne sont pas dans index.html
function initialiserBoutonDesignUI() {
    const navbar = document.querySelector('.navbar');
    if (navbar && !document.querySelector('.btn-theme-config')) {
        const btn = document.createElement('button');
        btn.className = 'btn-theme-config no-print';
        btn.innerHTML = '🎨 Design';
        btn.title = 'Personnaliser le graphisme de l\'application';
        btn.onclick = () => ouvrirModal('modalDesign');
        navbar.appendChild(btn);
    }
    if (!document.getElementById('modalDesign')) {
        const modal = document.createElement('div');
        modal.id = 'modalDesign';
        modal.className = 'modal-overlay no-print';
        modal.innerHTML = `<div class="modal-content">
            <h3 style="margin-top:0; color: #2c3e50;">🎨 Personnaliser le graphisme</h3>
            <p style="font-size: 13px; color: #7f8c8d; margin-bottom: 15px;">Choisissez l'ambiance visuelle de votre application (l'impression des fiches restera toujours sur fond blanc).</p>
            <div class="theme-card" id="card_theme_classique" onclick="appliquerThemeVisuel('classique')"><div><strong>💼 Classique (Origine)</strong><br><span style="font-size: 12px; color: #7f8c8d;">Couleurs franches et contrastées</span></div><div class="theme-preview-dots"><span class="theme-dot" style="background:#2c3e50;"></span><span class="theme-dot" style="background:#2980b9;"></span><span class="theme-dot" style="background:#27ae60;"></span></div></div>
            <div class="theme-card" id="card_theme_pastel" onclick="appliquerThemeVisuel('pastel')"><div><strong>🌸 Pastel Poudré</strong><br><span style="font-size: 12px; color: #7f8c8d;">Teintes douces macaron, lavande et menthe</span></div><div class="theme-preview-dots"><span class="theme-dot" style="background:#e8dff5;"></span><span class="theme-dot" style="background:#a2d2ff;"></span><span class="theme-dot" style="background:#ffcad4;"></span></div></div>
            <div class="theme-card" id="card_theme_doodles" onclick="appliquerThemeVisuel('doodles')"><div><strong>✏️ Carnet Doodles & Pastel</strong><br><span style="font-size: 12px; color: #7f8c8d;">Couleurs pastelles + petits dessins d'école en fond</span></div><div class="theme-preview-dots"><span class="theme-dot" style="background:#fdfbf7;"></span><span class="theme-dot" style="background:#b8c0ff;"></span><span class="theme-dot" style="background:#a3e4d7;"></span></div></div>
            <div class="theme-card" id="card_theme_nature" onclick="appliquerThemeVisuel('nature')"><div><strong>🌿 Nature & Sauge</strong><br><span style="font-size: 12px; color: #7f8c8d;">Tons apaisants vert sauge, lin et bois</span></div><div class="theme-preview-dots"><span class="theme-dot" style="background:#cad2c5;"></span><span class="theme-dot" style="background:#74c69d;"></span><span class="theme-dot" style="background:#e9edc9;"></span></div></div>
            <button onclick="fermerModal('modalDesign')" style="background: #34495e; color: white; border: none; padding: 10px 20px; width: 100%; font-weight: bold; border-radius:8px; cursor:pointer; margin-top: 10px;">Fermer</button>
        </div>`;
        document.body.appendChild(modal);
    }
}

// --- INITIALISATION AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", function() {
    initialiserBoutonDesignUI();
    let themeSauvegarde = localStorage.getItem(KEY_THEME) || 'pastel';
    appliquerThemeVisuel(themeSauvegarde);

    document.addEventListener('click', function(e) { const navBtn = e.target.closest('.nav-btn'); if (navBtn) { e.preventDefault(); let onclickAttr = navBtn.getAttribute('onclick'); if (onclickAttr) { let match = onclickAttr.match(/'(.*?)'/); if (match && match[1]) changerOnglet(match[1], navBtn); } } });
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.addEventListener('touchstart', function(e) { e.preventDefault(); let onclickAttr = this.getAttribute('onclick'); if (onclickAttr) { let match = onclickAttr.match(/'(.*?)'/); if (match && match[1]) changerOnglet(match[1], this); } }, { passive: false }); });
    eliminerDoublonsHistoriques(); majListeTypesSelect(); initialiserSelectsFormulaire(); trierBaseDonnees(); majListeEleves(); afficherBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherChoixEtiquettes(); majSelectCouleursRapides(); tenterConnexionAuto(); calculTailleStockage();
});
