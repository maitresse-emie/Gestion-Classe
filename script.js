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
const KEY_FIREBASE_CFG = 'maConfigFirebase_Finale';

let dashboardExpanded = new Set(); 
let dashboardArchives = JSON.parse(localStorage.getItem(KEY_ARCHIVES_TODO)) || [];
let afficherArchivesMode = false;
let programmations = JSON.parse(localStorage.getItem(KEY_PROG)) || {};

let dateGlobaleDebutISO = "", dateGlobaleDebutFR = "", dateGlobaleFinFR = "";
let filtreEtoilesDispo = 0;

let imagesParType = JSON.parse(localStorage.getItem(KEY_IMAGES));
if (!imagesParType) {
    imagesParType = {
        "Atelier": { img: "", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Jeu": { img: "", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Fichier jaune": { img: "", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Vidéo": { img: "", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Anton": { img: "", remplacerNum: true, appliquerCouleur: false, isTablette: true },
        "Scratch": { img: "", remplacerNum: true, appliquerCouleur: false, isTablette: true }
    };
} else {
    if (!imagesParType["Fichier jaune"]) {
        imagesParType["Fichier jaune"] = { img: "", remplacerNum: false, appliquerCouleur: false, isTablette: false };
    }
    Object.keys(imagesParType).forEach(k => {
        if (typeof imagesParType[k] === 'object' && imagesParType[k].isTablette === undefined) {
            imagesParType[k].isTablette = (k.toLowerCase() === 'anton');
        }
    });
}

let baseDonnees = JSON.parse(localStorage.getItem(KEY_ATELIERS));
if (!baseDonnees || !Array.isArray(baseDonnees)) baseDonnees = [];

let eleves = JSON.parse(localStorage.getItem(KEY_ELEVES));
if (!eleves) eleves = {};

function getCouleurMatiereBandeau(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("ecriture")) return { bg: "#1b4f72", text: "#ffffff", border: "#154360" };
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure")) return { bg: "#c0392b", text: "#ffffff", border: "#922b21" };
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie")) return { bg: "#795548", text: "#ffffff", border: "#5d4037" };
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite")) return { bg: "#e67e22", text: "#ffffff", border: "#d35400" };
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) return { bg: "#5dade2", text: "#ffffff", border: "#2e86c1" };
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) return { bg: "#27ae60", text: "#ffffff", border: "#1e8449" };
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol")) return { bg: "#e84393", text: "#ffffff", border: "#c2185b" };
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) return { bg: "#8e44ad", text: "#ffffff", border: "#6c3483" };
    return { bg: "#eaeded", text: "#2c3e50", border: "#bdc3c7" };
}

function getInfosActivitePourEleve(act, eleve) {
    let useJaune = Boolean(eleve && eleve.fichierJaune && act && act.varianteJaune && act.varianteJaune.trim() !== "");
    let detailPage = useJaune ? act.varianteJaune.trim() : (act.pageManuel ? act.pageManuel.trim() : "");
    let badgeLivre = useJaune
        ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 5px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;">📒 ${escHTML(detailPage)}</span>`
        : (detailPage ? `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 5px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>` : "");
    let typeEffectif = useJaune && imagesParType["Fichier jaune"] && imagesParType["Fichier jaune"].img ? "Fichier jaune" : (act.typeRes || "");
    let couleurForcee = useJaune ? "#ffe599" : (act.visuel || "");
    return { useJaune, detailPage, badgeLivre, typeEffectif, couleurForcee };
}

function calculerVendrediDepuisISO(dateISO) {
    if (!dateISO) return { debutFR: "", finFR: "", finISO: "", lundiSuivantISO: "" };
    const parts = dateISO.split('-').map(Number);
    if (parts.length !== 3) return { debutFR: "", finFR: "", finISO: "", lundiSuivantISO: "" };
    const dtDebut = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = dtDebut.getDay();
    let diffVendredi = (5 - day + 7) % 7; if (diffVendredi === 0) diffVendredi = 7;
    const dtFin = new Date(dtDebut); dtFin.setDate(dtDebut.getDate() + diffVendredi);
    let diffLundiSuivant = (8 - day) % 7; if (diffLundiSuivant === 0) diffLundiSuivant = 7;
    const dtLundiSuiv = new Date(dtDebut); dtLundiSuiv.setDate(dtDebut.getDate() + diffLundiSuivant);
    const fmtFR = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    const fmtISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return { debutFR: fmtFR(dtDebut), finFR: fmtFR(dtFin), finISO: fmtISO(dtFin), lundiSuivantISO: fmtISO(dtLundiSuiv) };
}

function assurerStructureSemaines(e) {
    if (!e) return;
    if (!e.maxAteliers) e.maxAteliers = 15;
    if (e.maxTablettes === undefined) e.maxTablettes = 2;
    if (!e.niveau) e.niveau = "CP";
    if (e.fichierJaune === undefined) e.fichierJaune = false;
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
            dateDebutISO: e.dateDebutISO || "", dateDebut: e.dateDebut || "", dateFin: e.dateFin || "",
            planHebdo: [...e.planHebdo], priorites: [...e.priorites], joursAssignes: { ...e.joursAssignes },
            valides: { ...e.valides }, suivi: JSON.parse(JSON.stringify(e.suivi || {}))
        }];
        e.semaineIndex = 0;
    }
    if (e.semaineIndex === undefined || e.semaineIndex < 0 || e.semaineIndex >= e.semaines.length) e.semaineIndex = 0;
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
    declencherAutoSaveDrive(); declencherAutoSaveFirebase();
}
function sauvegarderBase() { localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); declencherAutoSaveDrive(); declencherAutoSaveFirebase(); }
function sauvegarderProgrammations() { localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); declencherAutoSaveDrive(); declencherAutoSaveFirebase(); }

function nettoyerNomPourTri(str) { return (!str) ? "" : str.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, "").trim().toLowerCase(); }
function formaterEtoiles(nb) { let n = parseInt(nb) || 0; return n <= 0 ? "" : `<span style="color:#f39c12; font-size:12px; margin-right:4px;" title="Difficulté : ${n} étoile(s)">${"⭐".repeat(n)}</span>`; }

function trierBaseDonnees() {
    if (!Array.isArray(baseDonnees)) return;
    baseDonnees.sort((a, b) => {
        let matA = nettoyerNomPourTri(a.matiere), matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = (a.sequence || "").trim(), sB = (b.sequence || "").trim();
        if (sA !== sB) return sA.localeCompare(sB, 'fr');
        return (a.ressource || "").localeCompare(b.ressource || "", 'fr');
    });
}

function eliminerDoublonsHistoriques() {
    Object.values(eleves).forEach(e => {
        if (e.historique && Array.isArray(e.historique)) {
            let uniqueMap = new Map();
            e.historique.forEach(h => uniqueMap.set(h.idActivite, h));
            e.historique = Array.from(uniqueMap.values());
        }
    });
}

function getNiveauxCochesFormulaire() { let res = []; document.querySelectorAll('.cb-niveau-form:checked').forEach(cb => res.push(cb.value)); return res; }

function majSelectCouleursRapides(valeurForcee) {
    const select = document.getElementById('selectCouleurRapide'); if (!select) return;
    select.innerHTML = '<option value="">-- Choisir une couleur --</option><option value="#ffe599">🟡 Jaune (Maths CP / Fichier Jaune)</option><option value="#f6b26b">🟠 Orange (Maths CE)</option><option value="#ea9999">🔴 Rouge (Maths CM)</option><option value="#d5a6bd">🟣 Violet (Français CP)</option><option value="#b6d7a8">🟢 Vert (Français CE)</option><option value="#9fc5e8">🔵 Bleu (Français CM)</option><option value="#ffffff">⚪ Blanc</option>';
    if (valeurForcee) select.value = valeurForcee;
}

let idEleveCourant = null, idEleveImpressionCourant = null;
let filtreCourantDB = 'Tous', filtreCourantMatiere = 'Toutes', filtreCourantTypeDB = 'Tous';
let idEnCoursEdition = null, couleurManuelleModifiee = false;

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
        let matA = nettoyerNomPourTri(a.matiere), matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = (a.sequence || "").trim(), sB = (b.sequence || "").trim();
        if (sA !== sB) return sA.localeCompare(sB, 'fr');
        let cA = (a.competence || "").trim(), cB = (b.competence || "").trim();
        if (cA !== cB) return cA.localeCompare(cB, 'fr');
        return (a.estEvaluation ? 1 : 0) - (b.estEvaluation ? 1 : 0);
    });
    return planObjects;
}

function getElevesTries() {
    const ordreNiv = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    return Object.values(eleves).sort((a, b) => {
        let nivA = ordreNiv[(a.niveau || "CP").toUpperCase()] || 99, nivB = ordreNiv[(b.niveau || "CP").toUpperCase()] || 99;
        if (nivA !== nivB) return nivA - nivB;
        return (a.nom || "").localeCompare(b.nom || "", 'fr', { sensitivity: 'base' });
    });
}

// ==========================================
// 2. NAVIGATION, THÈMES ET SYNCHRO CLOUD (FIREBASE + DRIVE)
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
    container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}

const originalAlert = window.alert;
window.alert = function(msg) {
    if (msg.includes("succès") || msg.includes("mise à jour") || msg.includes("enregistrées")) showToast(msg, 'success');
    else if (msg.length < 60) showToast(msg, 'error'); else originalAlert(msg);
};

window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnScrollTop'); if(!btn) return;
    btn.style.display = (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) ? "block" : "none";
});

function formaterLienImage(url) {
    if (!url) return ""; url = url.trim();
    let matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/), matchOpenId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    let fileId = matchFileD ? matchFileD[1] : (matchOpenId ? matchOpenId[1] : null);
    return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : url;
}

function isDarkColor(hex) {
    if(!hex || !hex.startsWith('#')) return false;
    let c = hex.substring(1); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let rgb = parseInt(c, 16);
    return (0.2126 * ((rgb >> 16) & 0xff) + 0.7152 * ((rgb >> 8) & 0xff) + 0.0722 * (rgb & 0xff)) < 128;
}

function calculerCouleurAutomatique(matiere, niveauxStr, typeRes) {
    if (!matiere || !niveauxStr) return "#ffffff";
    let typeKey = ""; 
    if (imagesParType) { for (let k in imagesParType) { if (k.trim().toLowerCase() === (typeRes || "").trim().toLowerCase()) { typeKey = k; break; } } }
    if (typeKey && imagesParType[typeKey] && typeof imagesParType[typeKey] === 'object' && imagesParType[typeKey].appliquerCouleur === false) return "#ffffff";
    let mat = matiere.trim().toLowerCase(), nivs = niveauxStr.toUpperCase();
    let ordreNivs = ["CP", "CE1", "CE2", "CM1", "CM2"], niveauPlusBas = "";
    for (let n of ordreNivs) { if (nivs.includes(n)) { niveauPlusBas = n; break; } }
    if (mat.includes('math')) { if (niveauPlusBas === 'CP') return "#ffe599"; if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#f6b26b"; if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#ea9999"; } 
    else if (mat.includes('français') || mat.includes('francais')) { if (niveauPlusBas === 'CP') return "#d5a6bd"; if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#b6d7a8"; if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#9fc5e8"; }
    return "#ffffff";
}

function calculTailleStockage() {
    let _lsTotal = 0, _xLen, _x;
    for (_x in localStorage) { if (!localStorage.hasOwnProperty(_x)) continue; _xLen = ((localStorage[_x].length + _x.length) * 2); _lsTotal += _xLen; }
    let megaBytes = (_lsTotal / (1024 * 1024)).toFixed(2), pct = Math.min(100, (megaBytes / 5) * 100);
    let texteSto = document.getElementById('texteStockage'); if(texteSto) texteSto.innerText = `${megaBytes} Mo utilisés sur environ 5.00 Mo`;
    let jauge = document.getElementById('jaugeStockageFill');
    if(jauge) { jauge.style.width = pct + "%"; jauge.style.backgroundColor = pct > 80 ? "#e74c3c" : (pct > 50 ? "#f39c12" : "#27ae60"); }
}

let timerFirebaseSave;
let firebaseConfig = JSON.parse(localStorage.getItem(KEY_FIREBASE_CFG)) || { dbUrl: "", apiKey: "", email: "", refreshToken: "", idToken: "" };

function nettoyerUrlFirebase(url) {
    if (!url) return "";
    return url.trim().replace(/\/+$/, "").replace(/\/classe_data\.json$/i, "");
}

async function obtenirTokenFirebaseValide() {
    if (!firebaseConfig.apiKey || !firebaseConfig.refreshToken) return "";
    try {
        let res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(firebaseConfig.refreshToken)}`
        });
        if (!res.ok) return "";
        let data = await res.json();
        if (data.id_token) {
            firebaseConfig.idToken = data.id_token;
            firebaseConfig.refreshToken = data.refresh_token || firebaseConfig.refreshToken;
            localStorage.setItem(KEY_FIREBASE_CFG, JSON.stringify(firebaseConfig));
            return data.id_token;
        }
    } catch (e) { console.warn("Renouvellement Firebase silencieux échoué", e); }
    return "";
}

async function connecterFirebase() {
    let dbUrl = nettoyerUrlFirebase(document.getElementById('fbDbUrl').value);
    let apiKey = (document.getElementById('fbApiKey').value || "").trim();
    let email = (document.getElementById('fbEmail').value || "").trim();
    let pass = (document.getElementById('fbPassword').value || "").trim();
    let statut = document.getElementById('statutFirebase');

    if (!dbUrl) { showToast("Veuillez renseigner l'URL de la base Firebase.", "error"); return; }
    firebaseConfig.dbUrl = dbUrl; firebaseConfig.apiKey = apiKey; firebaseConfig.email = email;

    if (apiKey && email && pass) {
        if (statut) statut.innerText = "⏳ Authentification sécurisée en cours...";
        try {
            let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: pass, returnSecureToken: true })
            });
            let data = await res.json();
            if (data.error) {
                showToast("Erreur d'identifiants Firebase : " + data.error.message, "error");
                if (statut) statut.innerText = "❌ Identifiants refusés.";
                return;
            }
            firebaseConfig.idToken = data.idToken;
            firebaseConfig.refreshToken = data.refreshToken;
        } catch (err) {
            showToast("Erreur réseau lors de la connexion Firebase.", "error");
            return;
        }
    }
    localStorage.setItem(KEY_FIREBASE_CFG, JSON.stringify(firebaseConfig));
    if (statut) { statut.innerText = "✅ Connecté en continu (Cloud actif)"; statut.style.color = "#27ae60"; }
    await chargerDepuisFirebase(false);
}

function deconnecterFirebase() {
    firebaseConfig = { dbUrl: "", apiKey: "", email: "", refreshToken: "", idToken: "" };
    localStorage.removeItem(KEY_FIREBASE_CFG);
    let statut = document.getElementById('statutFirebase');
    if (statut) { statut.innerText = "Non connecté."; statut.style.color = "#7f8c8d"; }
    showToast("Déconnecté de Firebase.", "success");
}

function declencherAutoSaveFirebase() {
    if (!firebaseConfig || !firebaseConfig.dbUrl) return;
    clearTimeout(timerFirebaseSave);
    timerFirebaseSave = setTimeout(() => sauvegarderVersFirebase(), 1500);
}

async function sauvegarderVersFirebase() {
    if (!firebaseConfig || !firebaseConfig.dbUrl) return;
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel', updatedAt: new Date().toISOString() };
    let authParam = "";
    if (firebaseConfig.apiKey && firebaseConfig.refreshToken) {
        let token = await obtenirTokenFirebaseValide();
        if (token) authParam = `?auth=${encodeURIComponent(token)}`;
    }
    try {
        let res = await fetch(`${firebaseConfig.dbUrl}/classe_data.json${authParam}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (res.ok) {
            let statut = document.getElementById('statutFirebase');
            if (statut) { statut.innerText = "🔥 Synchro Cloud OK (" + new Date().toLocaleTimeString() + ")"; statut.style.color = "#27ae60"; }
        }
    } catch (e) { console.warn("Erreur synchro Firebase", e); }
}

async function chargerDepuisFirebase(forcer = false) {
    if (!firebaseConfig || !firebaseConfig.dbUrl) return;
    let statut = document.getElementById('statutFirebase');
    if (statut) statut.innerText = "⏳ Vérification du Cloud Firebase...";
    let authParam = "";
    if (firebaseConfig.apiKey && firebaseConfig.refreshToken) {
        let token = await obtenirTokenFirebaseValide();
        if (token) authParam = `?auth=${encodeURIComponent(token)}`;
    }
    try {
        let res = await fetch(`${firebaseConfig.dbUrl}/classe_data.json${authParam}`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        let data = await res.json();
        if (data && (data.base || data.eleves)) {
            if (forcer || baseDonnees.length === 0 || confirm("Des données ont été trouvées sur votre Cloud Firebase. Voulez-vous charger la version du Cloud sur cet appareil ?")) {
                baseDonnees = Array.isArray(data.base) ? data.base : [];
                eleves = data.eleves || {};
                if (data.images) imagesParType = data.images;
                if (data.programmations) { programmations = data.programmations; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
                if (data.archives) { dashboardArchives = data.archives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
                if (data.theme) appliquerThemeVisuel(data.theme);
                Object.values(eleves).forEach(e => assurerStructureSemaines(e));
                localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees));
                localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
                localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
                postEditGlobal(); majListeEleves(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); majSelectCouleursRapides(); rafraichirDashboard();
                if (idEleveCourant) chargerEleve();
                showToast("🔥 Données synchronisées depuis Firebase !", "success");
            }
            if (statut) { statut.innerText = "🔥 Cloud Firebase actif et synchronisé"; statut.style.color = "#27ae60"; }
        } else {
            await sauvegarderVersFirebase();
            showToast(" Première sauvegarde créée sur Firebase !", "success");
        }
    } catch (e) {
        if (statut) { statut.innerText = "⚠️ Erreur de lecture Firebase (vérifiez l'URL ou les règles)."; statut.style.color = "#e74c3c"; }
    }
}

const CLIENT_ID = '133293729951-pv43qv8a9758rbm4atpiiq3rv0g79vnd.apps.googleusercontent.com';
const API_KEY = ''; const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
let driveAccessToken = null, driveFileId = null, intervalVerificationSession = null, timerAutoSave;

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
        }).catch(() => { if(statut) statut.innerText = "⚠️ Erreur d'initialisation Google."; });
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
        if(data.files && data.files.length > 0) {
            driveFileId = data.files[0].id;
            if (forcerTelechargement || baseDonnees.length === 0) telechargerDepuisDrive(driveFileId);
            else if(statut) { statut.innerText = "✅ Fichier lié (Prêt pour la synchro)."; statut.style.color = "#27ae60"; }
        } else {
            if(statut) statut.innerText = "ℹ️ Création de la sauvegarde initiale sur Drive...";
            sauvegarderVersDriveFichierUnique();
        }
    }).catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else if(statut) statut.innerText = "❌ Erreur de recherche Drive."; });
}

function telechargerDepuisDrive(fileId) {
    const statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Téléchargement depuis le Drive...";
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { 'Authorization': 'Bearer ' + driveAccessToken } })
    .then(async res => {
        if(res.status === 401) throw new Error("TOKEN_EXPIRED");
        if (!res.ok) throw new Error("EMPTY_OR_NEW");
        let text = await res.text();
        return text ? JSON.parse(text) : null;
    })
    .then(data => {
        if(data && (data.base || data.eleves)) {
            baseDonnees = Array.isArray(data.base) ? data.base : []; eleves = data.eleves || {}; 
            if(data.images) imagesParType = data.images;
            if(data.programmations) { programmations = data.programmations; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
            if(data.archives) { dashboardArchives = data.archives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
            if(data.theme) appliquerThemeVisuel(data.theme);
            localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
            Object.values(eleves).forEach(e => assurerStructureSemaines(e));
            localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
            postEditGlobal(); majListeEleves(); initialiserSelectsFormulaire(); afficherChoixEtiquettes(); majSelectCouleursRapides(); rafraichirDashboard();
            if(statut) { statut.innerText = "✅ Synchronisé depuis le Drive !"; statut.style.color = "#27ae60"; } calculTailleStockage();
        } else {
            sauvegarderVersDriveFichierUnique();
        }
    }).catch(e => {
        if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration();
        else { driveFileId = null; sauvegarderVersDriveFichierUnique(); }
    });
}

function sauvegarderVersDriveFichierUnique() {
    if(!driveAccessToken) return;
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel' };
    const fileBlob = new Blob([JSON.stringify(data)], { type: 'application/json' }); const metadata = { 'name': 'Sauvegarde_Classe.json', 'mimeType': 'application/json' }; const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' })); form.append('file', fileBlob);
    let url = driveFileId ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=multipart` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = driveFileId ? 'PATCH' : 'POST';
    fetch(url, { method: method, headers: new Headers({ 'Authorization': 'Bearer ' + driveAccessToken }), body: form })
    .then(response => { if(response.status === 401) throw new Error("TOKEN_EXPIRED"); return response.json(); })
    .then(val => { if(val.id) { if(!driveFileId) driveFileId = val.id; let statut = document.getElementById('statutDrive'); if(statut) { statut.innerText = "✅ Sauvegardé sur Drive à " + new Date().toLocaleTimeString(); statut.style.color = "#27ae60"; } } })
    .catch(e => { if (e.message === "TOKEN_EXPIRED") formaterErreurExpiration(); else { let statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "❌ Erreur de synchro Drive."; } });
}

function formaterErreurExpiration() {
    driveAccessToken = null; localStorage.removeItem('drive_token_cache_final'); if (intervalVerificationSession) clearInterval(intervalVerificationSession);
    let statut = document.getElementById('statutDrive'), btnConn = document.getElementById('btnConnectDrive');
    if(statut) { statut.innerText = "⚠️ Session expirée. Veuillez vous reconnecter."; statut.style.color = "#e74c3c"; } if(btnConn) btnConn.innerText = "☁️ Reconnecter Google Drive";
}

function tenterConnexionAuto() {
    if (firebaseConfig && firebaseConfig.dbUrl) {
        chargerDepuisFirebase(false);
    }
    const cache = JSON.parse(localStorage.getItem('drive_token_cache_final'));
    if(cache && cache.token && cache.expiresAt > Date.now()) {
        let statut = document.getElementById('statutDrive'); if(statut) statut.innerText = "⏳ Reconnexion automatique...";
        gapi.load('client', () => { gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] }).then(() => { driveAccessToken = cache.token; let btnConn = document.getElementById('btnConnectDrive'); if(btnConn) btnConn.innerText = "✅ Connecté (Auto)"; rechercherFichierSauvegarde(false); lancerSurveillanceExpirationSession(cache.expiresAt); }); });
    }
}

// ==========================================
// 3. GESTION DES ELEVES, FICHIER JAUNE & SEMAINES
// ==========================================
function toggleFichierJauneEleve(isChecked) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    eleves[idEleveCourant].fichierJaune = Boolean(isChecked);
    sauvegarderEleves(); majListeEleves(); afficherPlanHebdo(); afficherRessourcesDisponibles();
    showToast(isChecked ? "📒 Mode Fichier Jaune activé pour cet élève !" : "📘 Mode Manuel Standard activé pour cet élève !");
}

function majListeEleves() {
    const select = document.getElementById('selectEleveProfile'), selectImp = document.getElementById('selectEleveImpression'), selectBilan = document.getElementById('selectEleveBilan');
    let optHtml = '<option value="">-- Sélectionner un élève --</option>'; 
    let optImp = '<option value="">-- Choisir un élève ou un groupe --</option><option value="TOUS_ELEVES">📚 TOUS les élèves de la classe</option><option value="NIVEAU_CP">📘 Tous les CP</option><option value="NIVEAU_CE1">📘 Tous les CE1</option><option value="NIVEAU_CE2">📘 Tous les CE2</option><option value="NIVEAU_CM1">📘 Tous les CM1</option><option value="NIVEAU_CM2">📘 Tous les CM2</option>';
    let optBilan = '<option value="">-- Choisir un élève --</option>';

    getElevesTries().forEach(e => { 
        let tagJaune = e.fichierJaune ? " 📒" : "";
        let labelNiv = `[${e.niveau || "CP"}] ${e.nom}${tagJaune}`;
        optHtml += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
        optImp += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
        optBilan += `<option value="${e.id}">${escHTML(labelNiv)}</option>`; 
    });
    if (select) select.innerHTML = optHtml; if (selectImp) selectImp.innerHTML = optImp; if (selectBilan) selectBilan.innerHTML = optBilan;
    
    let btnEdit = document.getElementById('btnEditEleve'), lblJaune = document.getElementById('labelToggleFichierJaune'), cbJaune = document.getElementById('cbFichierJauneBar');
    if(idEleveCourant && eleves[idEleveCourant]) { 
        if (select) select.value = idEleveCourant; if (btnEdit) btnEdit.style.display = "inline-block";
        if (lblJaune) lblJaune.style.display = "inline-flex";
        if (cbJaune) cbJaune.checked = Boolean(eleves[idEleveCourant].fichierJaune);
        let inputMax = document.getElementById('inputMaxAteliersEleve'), inputMaxTab = document.getElementById('inputMaxTablettesEleve'), maxAff = document.getElementById('maxAteliersAffiche');
        if (inputMax) inputMax.value = eleves[idEleveCourant].maxAteliers || 15; if (inputMaxTab) inputMaxTab.value = eleves[idEleveCourant].maxTablettes ?? 2; if (maxAff) maxAff.innerText = eleves[idEleveCourant].maxAteliers || 15; 
    } else {
        if (btnEdit) btnEdit.style.display = "none";
        if (lblJaune) lblJaune.style.display = "none";
    }
    if(idEleveCourant && !idEleveImpressionCourant) idEleveImpressionCourant = idEleveCourant;
    if(idEleveImpressionCourant) { if (selectImp) selectImp.value = idEleveImpressionCourant; if (selectBilan && eleves[idEleveImpressionCourant]) selectBilan.value = idEleveImpressionCourant; }
}

function modifierMaxAteliersEleve() { if(!idEleveCourant) return; let val = Math.min(25, Math.max(1, parseInt(document.getElementById('inputMaxAteliersEleve').value) || 15)); eleves[idEleveCourant].maxAteliers = val; sauvegarderEleves(); let maxAff = document.getElementById('maxAteliersAffiche'); if(maxAff) maxAff.innerText = val; }
function modifierMaxTablettesEleve() { if(!idEleveCourant) return; let val = Math.min(10, Math.max(0, parseInt(document.getElementById('inputMaxTablettesEleve').value) || 0)); eleves[idEleveCourant].maxTablettes = val; sauvegarderEleves(); if(idEleveCourant) afficherPlanHebdo(); }

function creerEleve() { 
    const nomInput = document.getElementById('nouvelEleveNom'), nivSelect = document.getElementById('nouvelEleveNiveau'), cbJauneNew = document.getElementById('nouvelEleveFichierJaune'); if(!nomInput) return;
    const nom = nomInput.value.trim(); if(!nom) return; const niveau = nivSelect ? nivSelect.value : "CP"; const id = 'eleve_' + Date.now(); 
    eleves[id] = { id: id, nom: nom, niveau: niveau, fichierJaune: Boolean(cbJauneNew && cbJauneNew.checked), planHebdo: [], enAttente: [], historique: [], masquees: [], priorites: [], maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {}, joursAssignes: {}, dateDebutISO: "", dateDebut: "", dateFin: "" }; 
    assurerStructureSemaines(eleves[id]); sauvegarderEleves(); nomInput.value = ''; if(cbJauneNew) cbJauneNew.checked = false; majListeInstantaneeEleve(id); rafraichirDashboard(); 
}

function majListeInstantaneeEleve(newId) { majListeEleves(); let sel = document.getElementById('selectEleveProfile'); if(sel) sel.value = newId; chargerEleve(); }

function ouvrirModalEditionEleve() {
    if(!idEleveCourant || !eleves[idEleveCourant]) return; let e = eleves[idEleveCourant];
    document.getElementById('editEleveNomInput').value = e.nom; document.getElementById('editEleveNiveauSelect').value = e.niveau || "CP";
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) cbEditJaune.checked = Boolean(e.fichierJaune);
    ouvrirModal('modalEditEleve');
}

function validerEditionEleve() {
    if(!idEleveCourant || !eleves[idEleveCourant]) return;
    let nouveauNom = document.getElementById('editEleveNomInput').value.trim(), nouveauNiveau = document.getElementById('editEleveNiveauSelect').value;
    if(!nouveauNom) { showToast("Le prénom ne peut pas être vide.", "error"); return; }
    eleves[idEleveCourant].nom = nouveauNom; eleves[idEleveCourant].niveau = nouveauNiveau;
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) eleves[idEleveCourant].fichierJaune = cbEditJaune.checked;
    sauvegarderEleves(); fermerModal('modalEditEleve'); majListeEleves(); chargerEleve(); rafraichirDashboard(); showToast("Élève mis à jour !", "success");
}

function supprimerEleve() { if(!idEleveCourant) return; if(confirm("Supprimer définitivement cet élève ?")) { delete eleves[idEleveCourant]; idEleveCourant = null; idEleveImpressionCourant = null; sauvegarderEleves(); majListeEleves(); chargerEleve(); rafraichirDashboard(); } }

function majBarreSemainesUI() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant]; assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
    const sel = document.getElementById('selectSemaineEleve');
    if (sel) {
        let html = '';
        e.semaines.forEach((s, idx) => {
            let datesTxt = (s.dateDebut && s.dateFin) ? ` (du ${s.dateDebut} au ${s.dateFin})` : '';
            html += `<option value="${idx}">Semaine ${idx + 1}${datesTxt} — ${s.planHebdo.length} act.${idx === 0 ? ' [En cours]' : ' [D\'avance]'}</option>`;
        });
        sel.innerHTML = html; sel.value = e.semaineIndex;
    }
    const btnSuppr = document.getElementById('btnSupprimerSemaine'); if (btnSuppr) btnSuppr.style.display = e.semaines.length > 1 ? 'inline-block' : 'none';
    const inputDate = document.getElementById('dateDebutSemaineInput'), spanFin = document.getElementById('dateFinSemaineAffiche');
    if (inputDate) inputDate.value = e.dateDebutISO || "";
    if (spanFin) spanFin.innerText = e.dateFin ? `➔ au Vendredi ${e.dateFin}` : "➔ Vendredi : --/--";
    const labelTitre = document.getElementById('labelSemaineTitre');
    if (labelTitre) labelTitre.innerText = `Semaine ${e.semaineIndex + 1}${(e.dateDebut && e.dateFin) ? ` du ${e.dateDebut} au ${e.dateFin}` : ""}`;
}

function appliquerDateDebutSemaine(dateISO) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant], res = calculerVendrediDepuisISO(dateISO);
    e.dateDebutISO = dateISO || ""; e.dateDebut = res.debutFR; e.dateFin = res.finFR;
    dateGlobaleDebutISO = e.dateDebutISO; dateGlobaleDebutFR = e.dateDebut; dateGlobaleFinFR = e.dateFin;
    sauvegarderEleves(); majBarreSemainesUI();
}

function changerSemaineActive(nouvelIndex) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    chargerSemaineDepuisIndex(eleves[idEleveCourant], nouvelIndex); sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo();
    if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
    rafraichirDashboard();
}

function ajouterSemaineAvance() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant]; syncEleveVersSemaineActive(e);
    let derniereSem = e.semaines[e.semaines.length - 1], nouvDebutISO = "", nouvDebutFR = "", nouvFinFR = "";
    if (derniereSem && derniereSem.dateDebutISO) {
        let calcPrec = calculerVendrediDepuisISO(derniereSem.dateDebutISO);
        if (calcPrec.lundiSuivantISO) { nouvDebutISO = calcPrec.lundiSuivantISO; let calcNouv = calculerVendrediDepuisISO(nouvDebutISO); nouvDebutFR = calcNouv.debutFR; nouvFinFR = calcNouv.finFR; }
    }
    let planInitial = [...(e.enAttente || [])], priosInitiales = [...(e.enAttente || [])]; e.enAttente = [];
    e.semaines.push({ id: 'sem_' + Date.now(), dateDebutISO: nouvDebutISO, dateDebut: nouvDebutFR, dateFin: nouvFinFR, planHebdo: planInitial, priorites: priosInitiales, joursAssignes: {}, valides: {}, suivi: JSON.parse(JSON.stringify(e.suivi || {})) });
    chargerSemaineDepuisIndex(e, e.semaines.length - 1); sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo();
    if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
    showToast(`Semaine ${e.semaines.length} créée !`, "success");
}

function supprimerSemaineActive() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant]; if (e.semaines.length <= 1) return;
    if (confirm(`Supprimer la Semaine ${e.semaineIndex + 1} préparée pour ${e.nom} ?`)) {
        e.semaines.splice(e.semaineIndex, 1);
        let nouvIdx = Math.max(0, e.semaineIndex - 1), s = e.semaines[nouvIdx];
        e.semaineIndex = nouvIdx; e.planHebdo = [...(s.planHebdo || [])]; e.priorites = [...(s.priorites || [])]; e.joursAssignes = { ...(s.joursAssignes || {}) }; e.valides = { ...(s.valides || {}) }; e.suivi = { ...(e.suivi || {}), ...(s.suivi || {}) }; e.dateDebutISO = s.dateDebutISO || ""; e.dateDebut = s.dateDebut || ""; e.dateFin = s.dateFin || "";
        sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo();
        if (document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
        rafraichirDashboard(); showToast("Semaine supprimée.", "success");
    }
}

function chargerEleve() {
    const sel = document.getElementById('selectEleveProfile'); if (!sel) return; idEleveCourant = sel.value;
    const zoneTravail = document.getElementById('zoneTravail'), message = document.getElementById('messageSelectEleve'), btnEdit = document.getElementById('btnEditEleve'), lblJaune = document.getElementById('labelToggleFichierJaune'), cbJaune = document.getElementById('cbFichierJauneBar');
    if(!idEleveCourant) { if(zoneTravail) zoneTravail.style.display = 'none'; if(message) message.style.display = 'block'; if(btnEdit) btnEdit.style.display = 'none'; if(lblJaune) lblJaune.style.display = 'none'; return; }
    if(zoneTravail) zoneTravail.style.display = 'block'; if(message) message.style.display = 'none'; if(btnEdit) btnEdit.style.display = 'inline-block'; if(lblJaune) lblJaune.style.display = 'inline-flex';
    let e = eleves[idEleveCourant]; assurerStructureSemaines(e);
    if (cbJaune) cbJaune.checked = Boolean(e.fichierJaune);
    document.querySelectorAll('.nomEleveAffiche').forEach(el => el.innerText = e.nom);
    let inputMax = document.getElementById('inputMaxAteliersEleve'), inputMaxTab = document.getElementById('inputMaxTablettesEleve'), maxAff = document.getElementById('maxAteliersAffiche');
    if(inputMax) inputMax.value = e.maxAteliers || 15; if(inputMaxTab) inputMaxTab.value = e.maxTablettes ?? 2; if(maxAff) maxAff.innerText = e.maxAteliers || 15;
    majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); if(document.getElementById('selectSequence') && document.getElementById('selectSequence').value) afficherRessourcesDisponibles();
}

function assignerJour(idActivite, jour) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let eleve = eleves[idEleveCourant]; if (!eleve.joursAssignes) eleve.joursAssignes = {};
    if (jour) eleve.joursAssignes[idActivite] = jour; else delete eleve.joursAssignes[idActivite];
    sauvegarderEleves(); afficherPlanHebdo();
}

function cocherNiveauModal(classeCheckbox, niveauCible) {
    document.querySelectorAll('.' + classeCheckbox + ':not(:disabled)').forEach(cb => {
        let e = eleves[cb.value];
        if (!niveauCible) cb.checked = false;
        else if (niveauCible === 'TOUS') cb.checked = true;
        else if (niveauCible === 'JAUNE') cb.checked = Boolean(e && e.fichierJaune);
        else if (e && (e.niveau || 'CP').toUpperCase() === niveauCible.toUpperCase()) cb.checked = true;
    });
}

function genererBarreSelectionNiveauxHtml(classeCheckbox) {
    return `<div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ccc;">
        <span style="font-size:11px; font-weight:bold; color:#7f8c8d; width:100%;">Sélection rapide par groupe :</span>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'TOUS')">✅ Tous</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', '')">❌ Aucun</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CP')">📘 CP</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE1')">📘 CE1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE2')">📘 CE2</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM1')">📘 CM1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM2')">📘 CM2</button>
        <button type="button" class="filter-btn" style="background:#ffe599; color:#7c2d12;" onclick="cocherNiveauModal('${classeCheckbox}', 'JAUNE')">📒 Fichier Jaune</button>
    </div>`;
}

function ouvrirModalDuplication() {
    if(!idEleveCourant || eleves[idEleveCourant].planHebdo.length === 0) { showToast("Le plan de l'élève est vide.", "error"); return; }
    document.getElementById('nomEleveSourceDupli').innerText = eleves[idEleveCourant].nom;
    let html = genererBarreSelectionNiveauxHtml('cb-dupli-eleve');
    getElevesTries().forEach(e => { if(e.id !== idEleveCourant) html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}${e.fichierJaune ? ' 📒' : ''}</label>`; });
    document.getElementById('listeElevesDupli').innerHTML = html; document.getElementById('modalDupliquer').style.display = 'flex';
}

function validerDuplication() {
    if(!idEleveCourant) return; const planSource = eleves[idEleveCourant].planHebdo, joursSource = eleves[idEleveCourant].joursAssignes || {};
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
    getElevesTries().forEach(e => {
        assurerStructureSemaines(e);
        let dejaPrevu = e.semaines.some(s => s.planHebdo && s.planHebdo.includes(idActivite)) || e.historique.some(h => h.idActivite === idActivite);
        let disabled = dejaPrevu ? "disabled checked" : "", color = disabled ? "color: #95a5a6; text-decoration: line-through;" : "";
        html += `<label style="cursor:pointer; font-size:14px; ${color}"><input type="checkbox" class="cb-assign-eleve" value="${e.id}" ${disabled}> [${e.niveau}] ${escHTML(e.nom)}${e.fichierJaune ? ' 📒' : ''} (Semaine ${e.semaineIndex + 1})</label>`;
    });
    document.getElementById('listeElevesAssign').innerHTML = html; document.getElementById('modalAssigner').style.display = 'flex';
}

function validerAssignationMultiple() {
    if (!activiteAssignationEnCours) return; let checks = document.querySelectorAll('.cb-assign-eleve:checked:not(:disabled)');
    if (checks.length === 0) { document.getElementById('modalAssigner').style.display = 'none'; return; }
    let selJour = document.getElementById('selectJourAssignMultiple'), jourChoisi = selJour ? selJour.value : "", count = 0;
    checks.forEach(cb => {
        let e = eleves[cb.value]; assurerStructureSemaines(e);
        if (e.planHebdo.length < (e.maxAteliers || 15)) {
            e.planHebdo.push(activiteAssignationEnCours);
            if (jourChoisi) { if (!e.joursAssignes) e.joursAssignes = {}; e.joursAssignes[activiteAssignationEnCours] = jourChoisi; }
            syncEleveVersSemaineActive(e); count++;
        }
    });
    sauvegarderEleves(); document.getElementById('modalAssigner').style.display = 'none'; rafraichirDashboard(); if(idEleveCourant) afficherPlanHebdo(); showToast(`Activité assignée à ${count} élève(s).`, "success");
}

function commencerNouvelleSemaine() {
    if(!idEleveCourant) return; let eleve = eleves[idEleveCourant]; assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
    if(confirm(`Clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom} et passer à la suivante ?\n(Les activités "à revoir / à refaire" seront placées EN PRIORITÉ).`)) {
        let aTransferer = [...(eleve.enAttente || [])];
        (eleve.planHebdo || []).forEach(idAct => {
            if (eleve.suivi && eleve.suivi[idAct] && (eleve.suivi[idAct].statut === 'a_revoir' || eleve.suivi[idAct].statut === 'a_refaire')) {
                if (!aTransferer.includes(idAct)) aTransferer.push(idAct);
            }
        });
        eleve.enAttente = [];
        if (eleve.semaines.length > 1) {
            eleve.semaines.splice(eleve.semaineIndex, 1);
            let nextIdx = Math.min(eleve.semaineIndex, eleve.semaines.length - 1), s = eleve.semaines[nextIdx];
            eleve.semaineIndex = nextIdx; if (!s.priorites) s.priorites = [];
            aTransferer.forEach(idAct => { if (!s.planHebdo.includes(idAct)) s.planHebdo.unshift(idAct); if (!s.priorites.includes(idAct)) s.priorites.push(idAct); });
            eleve.planHebdo = [...s.planHebdo]; eleve.priorites = [...s.priorites]; eleve.joursAssignes = { ...(s.joursAssignes || {}) }; eleve.valides = { ...(s.valides || {}) }; eleve.suivi = { ...(eleve.suivi || {}), ...(s.suivi || {}) }; eleve.dateDebutISO = s.dateDebutISO || ""; eleve.dateDebut = s.dateDebut || ""; eleve.dateFin = s.dateFin || "";
        } else {
            let nextISO = "", nextDeb = "", nextFin = "";
            if (eleve.dateDebutISO) { let c = calculerVendrediDepuisISO(eleve.dateDebutISO); if (c.lundiSuivantISO) { nextISO = c.lundiSuivantISO; let c2 = calculerVendrediDepuisISO(nextISO); nextDeb = c2.debutFR; nextFin = c2.finFR; } }
            eleve.planHebdo = [...aTransferer]; eleve.valides = {}; eleve.priorites = [...aTransferer]; eleve.joursAssignes = {}; eleve.dateDebutISO = nextISO; eleve.dateDebut = nextDeb; eleve.dateFin = nextFin;
            eleve.semaines[0] = { id: 'sem_' + Date.now(), dateDebutISO: nextISO, dateDebut: nextDeb, dateFin: nextFin, planHebdo: [...eleve.planHebdo], priorites: [...eleve.priorites], joursAssignes: {}, valides: {}, suivi: JSON.parse(JSON.stringify(eleve.suivi || {})) };
        }
        dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_')); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Semaine suivante activée !", "success");
    }
}

function basculerPriorite(idActivite) {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if (!eleve.priorites) eleve.priorites = [];
    let idx = eleve.priorites.indexOf(idActivite); if (idx > -1) eleve.priorites.splice(idx, 1); else eleve.priorites.push(idActivite);
    sauvegarderEleves(); afficherPlanHebdo();
}

function cocherToutPlan(source) { document.querySelectorAll('.cb-plan-valider:not(:disabled)').forEach(cb => cb.checked = source.checked); }

function validerSelectionPlan() {
    if(!idEleveCourant) return; const checks = document.querySelectorAll('.cb-plan-valider:checked:not(:disabled)');
    if(checks.length === 0) { showToast("Cochez au moins une activité.", "error"); return; }
    checks.forEach(cb => marquerCommeValideSansRafraichir(cb.value, eleves[idEleveCourant]));
    sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard(); showToast("Sélection validée !", "success");
}

function estActiviteTablette(act) {
    if (!act || !act.typeRes) return false; let tName = act.typeRes.trim().toLowerCase();
    for (let k in imagesParType) { if (k.trim().toLowerCase() === tName) return Boolean(imagesParType[k] && imagesParType[k].isTablette); } return false;
}

function marquerCommeValideSansRafraichir(idActivite, eleve) {
    const act = baseDonnees.find(b => b.id === idActivite); if(!act) return; const dateValid = new Date().toLocaleDateString('fr-FR');
    if(!eleve.valides) eleve.valides = {}; eleve.valides[idActivite] = dateValid;
    if (act.estEvaluation) {
        let niveauxAct = (act.niveau || "").toUpperCase().split(/[,/]+/).map(x => x.trim());
        baseDonnees.filter(b => (b.matiere || "").trim().toLowerCase() === (act.matiere || "").trim().toLowerCase() && (b.competence || "").trim().toLowerCase() === (act.competence || "").trim().toLowerCase() && niveauxAct.some(n => (b.niveau || "").toUpperCase().includes(n))).forEach(b => {
            if(!eleve.historique.some(h => h.idActivite === b.id)) eleve.historique.push({ idActivite: b.id, date: dateValid });
            eleve.valides[b.id] = dateValid; if(eleve.suivi && eleve.suivi[b.id]) delete eleve.suivi[b.id]; 
        });
    } else {
        if(!eleve.historique.some(h => h.idActivite === idActivite)) eleve.historique.push({ idActivite: idActivite, date: dateValid });
        if(eleve.suivi && eleve.suivi[idActivite]) delete eleve.suivi[idActivite]; 
    }
}

function annulerValidationPlan(idActivite) { if(!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if(eleve.valides && eleve.valides[idActivite]) { delete eleve.valides[idActivite]; eleve.historique = eleve.historique.filter(h => h.idActivite !== idActivite); sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); rafraichirDashboard(); } }
function annulerAttente(idActivite) { if(!idEleveCourant) return; let e = eleves[idEleveCourant], idx = e.enAttente.indexOf(idActivite); if(idx > -1) { e.enAttente.splice(idx, 1); if (!e.planHebdo.includes(idActivite)) e.planHebdo.unshift(idActivite); if (!e.priorites) e.priorites = []; if (!e.priorites.includes(idActivite)) e.priorites.push(idActivite); sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo(); rafraichirDashboard(); } }
function validerDirectement(idActivite) { if(!idEleveCourant) return; marquerCommeValideSansRafraichir(idActivite, eleves[idEleveCourant]); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Activité validée !", "success"); }
function masquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if(!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant], max = eleve.maxAteliers || 15;
    if (eleve.planHebdo.length >= max) { showToast(`⚠️ Limite maximale atteinte.`, "error"); return; }
    const actAjoutee = baseDonnees.find(b => b.id === idActivite);
    if (actAjoutee && estActiviteTablette(actAjoutee)) { let maxTab = eleve.maxTablettes ?? 2, nbTabActuels = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length; if (nbTabActuels >= maxTab) { showToast(`🚫 Quota atteint : ${maxTab} tablette(s) max.`, "error"); return; } }
    let selectJourElem = document.getElementById('jour_dispo_' + idActivite), jourChoisi = selectJourElem ? selectJourElem.value : "";
    eleve.planHebdo.push(idActivite); if (!eleve.joursAssignes) eleve.joursAssignes = {}; if (jourChoisi) eleve.joursAssignes[idActivite] = jourChoisi;
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard();
    showToast(jourChoisi ? `Ajouté (${jourChoisi}) !` : "Ajouté (Libre) !");
}

function retirerDuPlan(idActivite) { 
    let e = eleves[idEleveCourant], idx = e.planHebdo.indexOf(idActivite); 
    if(idx > -1) e.planHebdo.splice(idx, 1); else { idx = e.enAttente.indexOf(idActivite); if (idx > -1) e.enAttente.splice(idx, 1); }
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite]; if (e.valides && e.valides[idActivite]) delete e.valides[idActivite]; if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré du plan.");
}

function desarchiverActivite(idActivite) { if(!idEleveCourant) return; if(confirm("Annuler la validation de l'historique ?")) { const eleve = eleves[idEleveCourant], index = eleve.historique.findIndex(h => h.idActivite === idActivite); if(index > -1) { eleve.historique.splice(index, 1); sauvegarderEleves(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard();} } }

function afficherPlanHebdo() {
    const eleve = eleves[idEleveCourant], tbodyApercu = document.getElementById('tableApercuPlan'); if(!tbodyApercu || !eleve) return; tbodyApercu.innerHTML = '';
    document.getElementById('compteurAteliersEleve').innerText = eleve.planHebdo.length; document.getElementById('maxAteliersAffiche').innerText = eleve.maxAteliers || 15;
    let nbTabCount = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
    let compteurTabElem = document.getElementById('compteurTablettesEleve'); if(compteurTabElem) compteurTabElem.innerText = `${nbTabCount}/${eleve.maxTablettes ?? 2}`;

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || [], eleve.suivi || {});
    planObjects.forEach((a, index) => {
        const num = index + 1; let badge = a.estEvaluation ? `<span class="badge-eval">🎯</span>` : ''; let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
        let isPrio = (eleve.priorites && eleve.priorites.includes(a.id)) || statutSuivi === 'a_revoir' || statutSuivi === 'a_refaire';
        let logoDebutLigne = statutSuivi === 'a_revoir' ? `<span style="font-size:16px; margin-right:3px;" title="À faire avec la maîtresse">👩‍🏫</span>` : (statutSuivi === 'a_refaire' ? `<span style="font-size:14px; margin-right:3px;">🔄</span>` : "");
        let infosL = getInfosActivitePourEleve(a, eleve);

        let suiviHtml = '';
        if (eleve.suivi && eleve.suivi[a.id]) {
            let s = eleve.suivi[a.id], infoCommentaire = s.commentaire ? `<br><span style="color:#7f8c8d; font-size:11px; font-style:italic;">💬 ${escHTML(s.commentaire)}</span>` : '';
            if (s.statut === 'a_revoir') suiviHtml = `<br><span style="color:#c0392b; font-size:12px; font-weight:bold;">👩‍🏫 À revoir avec maîtresse (Prioritaire)</span>${infoCommentaire}`;
            if (s.statut === 'a_refaire') suiviHtml = `<br><span style="color:#d35400; font-size:12px; font-weight:bold;">🔄 À refaire seul (Prioritaire)</span>${infoCommentaire}`;
        }

        let jourActuel = (eleve.joursAssignes && eleve.joursAssignes[a.id]) ? eleve.joursAssignes[a.id] : "";
        let selectJourHtml = `<select onchange="assignerJour('${a.id}', this.value)" style="width:100%; padding:4px; font-size:12px; border-radius:4px; border:1px solid #bdc3c7; ${jourActuel ? 'background:#fef5e7; font-weight:bold; color:#d35400;' : ''}"><option value="">-- Libre --</option><option value="Lundi" ${jourActuel === 'Lundi' ? 'selected' : ''}>Lundi</option><option value="Mardi" ${jourActuel === 'Mardi' ? 'selected' : ''}>Mardi</option><option value="Jeudi" ${jourActuel === 'Jeudi' ? 'selected' : ''}>Jeudi</option><option value="Vendredi" ${jourActuel === 'Vendredi' ? 'selected' : ''}>Vendredi</option></select>`;
        let actionHtml = estValide ? `<span style="color:#27ae60; font-weight:bold; font-size:12px;">✅ Fini</span><br><button type="button" class="btn-remove" style="width: 100%; margin-top:3px;" onclick="annulerValidationPlan('${a.id}')">↩️ Défaire</button>` : `<button type="button" class="btn-valid" style="width: 100%; margin-bottom: 5px;" onclick="validerDirectement('${a.id}')">🏁 Fini</button><button type="button" class="btn-remove" style="width: 100%;" onclick="retirerDuPlan('${a.id}')">❌ Retirer</button>`;
        let coulMat = getCouleurMatiereBandeau(a.matiere);

        tbodyApercu.innerHTML += `<tr class="${rowClass}">
            <td style="text-align:center;"><input type="checkbox" class="cb-plan-valider" value="${a.id}" ${estValide ? 'checked disabled' : ''} style="transform: scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center; cursor:pointer;" class="badge-prio" onclick="basculerPriorite('${a.id}')" style="${isPrio ? 'color:#f1c40f;' : 'color:#bdc3c7;'}">${isPrio ? '⭐' : '☆'}</td>
            <td class="${jourActuel ? 'col-num num-jour-impose' : 'col-num'}">${logoDebutLigne}${num}</td>
            <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${coulMat.bg}; margin-right:4px;"></span><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td>
            <td>${logoDebutLigne}${formaterEtoiles(a.difficulte)}<strong style="${jourActuel ? 'text-decoration:underline;' : ''}">${escHTML(a.ressource)}</strong> ${infosL.badgeLivre} ${badge} ${suiviHtml}</td>
            <td style="text-align:center;">${selectJourHtml}</td>
            <td>${actionHtml}</td>
        </tr>`;
    });
    if(eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="8" style="text-align:center;">Le plan de cette semaine est vide.</td></tr>';
}

function afficherHistorique() {
    const eleve = eleves[idEleveCourant], tbodyHist = document.getElementById('tableHistorique'), tbodyMasq = document.getElementById('tableMasquees'); if(!tbodyHist || !tbodyMasq) return; tbodyHist.innerHTML = ''; tbodyMasq.innerHTML = '';
    [...eleve.historique].reverse().forEach(hist => { const a = baseDonnees.find(b => b.id === hist.idActivite); if(a) tbodyHist.innerHTML += `<tr><td><strong>${hist.date}</strong></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="desarchiverActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Restaurer</button></td></tr>`; });
    if(eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun historique.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if(a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}<br><span style="font-size:11px">${escHTML(a.sequence)}</span></td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align: center;"><button type="button" onclick="demasquerActivite('${a.id}')" style="background:none; border:none; cursor:pointer;">↩️ Réintégrer</button></td></tr>`; });
    if(eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune activité masquée.</td></tr>';
}

function filtrerParEtoilesDispo(nbEtoiles) {
    filtreEtoilesDispo = nbEtoiles;
    document.querySelectorAll('.btn-filtre-etoile-dispo').forEach(b => b.classList.remove('active'));
    let btnActif = document.getElementById('btn_etoile_dispo_' + nbEtoiles); if (btnActif) btnActif.classList.add('active');
    afficherRessourcesDisponibles();
}

function afficherRessourcesDisponibles() {
    const niveau = document.getElementById('selectNiveau').value, periode = document.getElementById('selectPeriode').value, matiere = document.getElementById('selectMatiere').value, sequence = document.getElementById('selectSequence').value, zoneRessources = document.getElementById('zoneRessources'), tbody = document.getElementById('tableRessourcesDispo');
    if(!sequence || !idEleveCourant) { if(zoneRessources) zoneRessources.style.display = 'none'; return; }
    if(zoneRessources) zoneRessources.style.display = 'block'; if(tbody) tbody.innerHTML = '';
    const eleve = eleves[idEleveCourant]; assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);

    let activites = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere && a.sequence === sequence);
    if(periode) activites = activites.filter(a => programmations[a.matiere + "|" + a.competence] && programmations[a.matiere + "|" + a.competence].includes(periode));
    if(filtreEtoilesDispo > 0) activites = activites.filter(a => (parseInt(a.difficulte) || 0) === filtreEtoilesDispo);
    
    const idsHistorique = eleve.historique.map(h => h.idActivite), idsToutesSemaines = new Set();
    eleve.semaines.forEach(s => { if (s.planHebdo) s.planHebdo.forEach(id => idsToutesSemaines.add(id)); });

    let nbAffichees = 0;
    activites.forEach(a => {
        if(idsHistorique.includes(a.id) || (eleve.masquees && eleve.masquees.includes(a.id)) || idsToutesSemaines.has(a.id) || (eleve.enAttente && eleve.enAttente.includes(a.id))) return;
        nbAffichees++; let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Évaluation</span>` : '', infosL = getInfosActivitePourEleve(a, eleve);
        tbody.innerHTML += `<tr class="${a.estEvaluation ? 'row-eval' : ''}">
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em> - ' : ''}${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infosL.badgeLivre} <br><span style="font-size:11px; color:#7f8c8d;">(${escHTML(infosL.typeEffectif)} Atelier: ${escHTML(a.symbole)})</span> ${badge}</td>
            <td style="text-align: right; width: 340px; white-space: nowrap;">
                <select id="jour_dispo_${a.id}" style="padding:5px; font-size:12px; border-radius:4px; border:1px solid #2980b9; margin-right:4px;"><option value="">📅 Libre (Au choix)</option><option value="Lundi">Lundi</option><option value="Mardi">Mardi</option><option value="Jeudi">Jeudi</option><option value="Vendredi">Vendredi</option></select>
                <button type="button" class="btn-add" onclick="ajouterAuPlan('${a.id}')">➕ Plan</button>
                <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')">🏁 Fini</button>
                <button type="button" class="btn-hide" onclick="masquerActivite('${a.id}')">🚫 Masq</button>
            </td>
        </tr>`;
    });
    if(nbAffichees === 0) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#7f8c8d;">Aucune activité disponible pour ces critères.</td></tr>';
}

function initProgFilters() {
    let selectNiv = document.getElementById('progNiveau'), selectMat = document.getElementById('progMatiere'); if(!selectNiv || !selectMat) return;
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
    let selectNiv = document.getElementById('progNiveau'), selectMat = document.getElementById('progMatiere'), tbody = document.getElementById('tableProg');
    if(!tbody || !selectNiv || !selectMat) return;
    let niv = selectNiv.value, mat = selectMat.value, activitesFiltrees = Array.isArray(baseDonnees) ? baseDonnees : [];
    if(niv) activitesFiltrees = activitesFiltrees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niv));
    if(mat) activitesFiltrees = activitesFiltrees.filter(a => a.matiere === mat);
    let clesUniques = new Map();
    activitesFiltrees.forEach(a => { let m = (a.matiere || "").trim(), s = (a.sequence || "").trim(), c = (a.competence || "").trim(); if(m || c) clesUniques.set(m + "|" + s + "|" + c, { matiere: m, sequence: s, competence: c }); });
    let listeItems = Array.from(clesUniques.values()).sort((a,b) => { let mA = nettoyerNomPourTri(a.matiere), mB = nettoyerNomPourTri(b.matiere); if(mA !== mB) return mA.localeCompare(mB, 'fr'); if(a.sequence !== b.sequence) return a.sequence.localeCompare(b.sequence, 'fr'); return a.competence.localeCompare(b.competence, 'fr'); });
    let html = '', derniereMat = null;
    listeItems.forEach(item => {
        if(item.matiere !== derniereMat) { let coul = getCouleurMatiereBandeau(item.matiere); html += `<tr><td colspan="7" style="background:${coul.bg}; color:${coul.text}; font-size:14px; padding:10px;"><strong>📚 ${escHTML(item.matiere || 'Sans matière')}</strong></td></tr>`; derniereMat = item.matiere; }
        let progs = programmations[item.matiere + "|" + item.competence] || [];
        html += `<tr><td>${escHTML(item.sequence)}</td><td><strong>${escHTML(item.competence)}</strong></td>${['P1','P2','P3','P4','P5'].map(p => `<td style="text-align:center;"><input type="checkbox" onchange="toggleProg('${escJS(item.matiere)}', '${escJS(item.competence)}', '${p}', this.checked)" ${progs.includes(p) ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;"></td>`).join('')}</tr>`;
    });
    tbody.innerHTML = listeItems.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#7f8c8d;">Aucune compétence trouvée.</td></tr>' : html;
}

function toggleProg(matiere, competence, periode, isChecked) {
    let key = matiere + "|" + competence; if(!programmations[key]) programmations[key] = [];
    if(isChecked) { if(!programmations[key].includes(periode)) programmations[key].push(periode); } else programmations[key] = programmations[key].filter(p => p !== periode);
    sauvegarderProgrammations();
}

function toggleExpandDashboard(idEleve) { if(dashboardExpanded.has(idEleve)) dashboardExpanded.delete(idEleve); else dashboardExpanded.add(idEleve); rafraichirDashboard(); }

function setSuivi(idEleve, idAct, statut) {
    let e = eleves[idEleve]; assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
    if(!e.suivi) e.suivi = {}; if(!e.enAttente) e.enAttente = []; if(!e.priorites) e.priorites = [];
    if(!e.suivi[idAct]) e.suivi[idAct] = { statut: '', commentaire: '' };
    if(e.suivi[idAct].statut === statut) {
        if(confirm("Retirer ce statut et remettre l'activité normalement dans le plan actuel ?")) {
            e.suivi[idAct].statut = ''; e.suivi[idAct].commentaire = '';
            let idx = e.enAttente.indexOf(idAct); if (idx > -1) { e.enAttente.splice(idx, 1); if (!e.planHebdo.includes(idAct)) e.planHebdo.push(idAct); }
        } else {
            let result = prompt("Modifier le commentaire :", e.suivi[idAct].commentaire || ''); if(result !== null) e.suivi[idAct].commentaire = result.trim();
        }
    } else {
        let actionName = statut === 'a_revoir' ? "👩‍🏫 À revoir avec la maîtresse" : "🔄 À refaire seul";
        let result = prompt(`[${actionName}]\nL'activité sera placée EN PRIORITÉ dans la semaine suivante.\nNote (facultatif) :`, e.suivi[idAct].commentaire || '');
        if(result !== null) { 
            e.suivi[idAct].statut = statut; e.suivi[idAct].commentaire = result.trim(); 
            if (e.valides && e.valides[idAct]) { delete e.valides[idAct]; e.historique = e.historique.filter(h => h.idActivite !== idAct); }
            if (!e.priorites.includes(idAct)) e.priorites.push(idAct);
            let idx = e.planHebdo.indexOf(idAct); if (idx > -1) e.planHebdo.splice(idx, 1);
            let nextSem = e.semaines[e.semaineIndex + 1];
            if (nextSem) { if (!nextSem.planHebdo.includes(idAct)) nextSem.planHebdo.unshift(idAct); if (!nextSem.priorites) nextSem.priorites = []; if (!nextSem.priorites.includes(idAct)) nextSem.priorites.push(idAct); if (!nextSem.suivi) nextSem.suivi = {}; nextSem.suivi[idAct] = { ...e.suivi[idAct] }; }
            else if (!e.enAttente.includes(idAct)) e.enAttente.push(idAct);
        }
    }
    sauvegarderEleves(); rafraichirDashboard(); if (idEleveCourant === idEleve) { majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); }
}

function validerDepuisDashboard(idEleve, idAct) {
    let eleve = eleves[idEleve]; if (!eleve) return;
    if (eleve.valides && eleve.valides[idAct]) { delete eleve.valides[idAct]; eleve.historique = eleve.historique.filter(h => h.idActivite !== idAct); sauvegarderEleves(); rafraichirDashboard(); showToast("Validation annulée.", "error"); }
    else { marquerCommeValideSansRafraichir(idAct, eleve); if (eleve.enAttente && eleve.enAttente.includes(idAct)) { eleve.enAttente = eleve.enAttente.filter(id => id !== idAct); if (!eleve.planHebdo.includes(idAct)) eleve.planHebdo.push(idAct); } sauvegarderEleves(); rafraichirDashboard(); showToast("Validé !", "success"); }
    if (idEleveCourant === idEleve) { majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); }
}

function archiverItem(cle) { if (!dashboardArchives.includes(cle)) { dashboardArchives.push(cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); declencherAutoSaveFirebase(); rafraichirDashboard(); showToast("Archivé", "success"); } }
function restaurerArchive(cle) { dashboardArchives = dashboardArchives.filter(k => k !== cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); declencherAutoSaveFirebase(); rafraichirDashboard(); showToast("Restauré", "success"); }
function viderArchives() { if (confirm("Supprimer définitivement toutes les archives ?")) { dashboardArchives = []; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); declencherAutoSaveDrive(); declencherAutoSaveFirebase(); rafraichirDashboard(); } }
function toggleAfficherArchives() { afficherArchivesMode = !afficherArchivesMode; let zone = document.getElementById('zoneArchivesDashboard'), btn = document.getElementById('btnToggleArchives'); if(zone) zone.style.display = afficherArchivesMode ? 'block' : 'none'; if(btn) btn.innerText = afficherArchivesMode ? "📂 Masquer les archives" : `📂 Voir les archives (${dashboardArchives.length})`; }

function rafraichirDashboard() {
    let groupes = {}, tabletteGroupes = {}; 
    Object.values(eleves).forEach(e => {
        assurerStructureSemaines(e);
        let idsTousPlans = new Set([...e.planHebdo, ...e.enAttente]);
        e.semaines.forEach(s => { if (s.planHebdo) s.planHebdo.forEach(id => idsTousPlans.add(id)); });
        idsTousPlans.forEach(idAct => {
            let act = baseDonnees.find(b => b.id === idAct);
            if (act && estActiviteTablette(act) && e.planHebdo.includes(idAct) && !dashboardArchives.includes(`tablette_${idAct}`)) {
                if (!tabletteGroupes[idAct]) tabletteGroupes[idAct] = { act: act, eleves: [] };
                if (!tabletteGroupes[idAct].eleves.includes(e.nom)) tabletteGroupes[idAct].eleves.push(e.nom);
            }
            let s = e.suivi[idAct];
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire') && !dashboardArchives.includes(`${e.id}_${idAct}_${s.statut}`)) {
                if (!groupes[idAct]) groupes[idAct] = { a_revoir: [], a_refaire: [] };
                groupes[idAct][s.statut].push({ eleve: e, commentaire: s.commentaire });
            }
        });
    });

    let memoHtml = '';
    for (let idAct in groupes) {
        let act = baseDonnees.find(a => a.id === idAct); if (!act) continue;
        let gdmTag = act.pageGDM ? ` <span style="background:#34495e; color:white; padding:1px 6px; border-radius:4px; font-size:11px;">📖 GDM : ${escHTML(act.pageGDM)}</span>` : '';
        let title = `<strong>${escHTML(act.niveau)} ${escHTML(act.matiere)}</strong> - ${escHTML(act.competence)} (<em>${escHTML(act.ressource)}</em>)${gdmTag}`;
        groupes[idAct].a_revoir.forEach(x => { let cle = `${x.eleve.id}_${idAct}_a_revoir`, infosL = getInfosActivitePourEleve(act, x.eleve); memoHtml += `<div style="background:#fdedec; border-left:4px solid #e74c3c; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>👩‍🏫 <strong>Atelier Dirigé :</strong> ${title} ➔ <strong>${escHTML(x.eleve.nom)}</strong> ${infosL.badgeLivre} ${x.commentaire ? `(💬 ${escHTML(x.commentaire)})` : ''}</div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#c0392b;"><input type="checkbox" onchange="archiverItem('${cle}')"> Archiver</label></div>`; });
        groupes[idAct].a_refaire.forEach(x => { let cle = `${x.eleve.id}_${idAct}_a_refaire`, infosL = getInfosActivitePourEleve(act, x.eleve); memoHtml += `<div style="background:#fef5e7; border-left:4px solid #f39c12; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>🔄 <strong>À refaire seul :</strong> ${title} ➔ <strong>${escHTML(x.eleve.nom)}</strong> ${infosL.badgeLivre} ${x.commentaire ? `(💬 ${escHTML(x.commentaire)})` : ''}</div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#d35400;"><input type="checkbox" onchange="archiverItem('${cle}')"> Archiver</label></div>`; });
    }
    let memoDiv = document.getElementById('memoListContent'); if(memoDiv) memoDiv.innerHTML = memoHtml || '<p style="color:#7f8c8d; font-style:italic;">Aucun groupe de besoin en attente.</p>';

    let tabletteHtml = '';
    for (let idAct in tabletteGroupes) {
        let item = tabletteGroupes[idAct], cleTab = `tablette_${idAct}`;
        tabletteHtml += `<div style="background:#eaf2f8; border-left:4px solid #2980b9; padding:8px 10px; margin-bottom:6px; font-size:14px; display:flex; justify-content:space-between;"><div>💻 <strong>${escHTML(item.act.niveau)} ${escHTML(item.act.matiere)}</strong> - ${escHTML(item.act.competence)} (<em>${escHTML(item.act.ressource)}</em>)<br><span style="font-size:13px;">👥 <strong>${item.eleves.length} élève(s) :</strong> ${escHTML(item.eleves.sort().join(', '))}</span></div><label style="cursor:pointer; font-size:12px; font-weight:bold; color:#2980b9;"><input type="checkbox" onchange="archiverItem('${cleTab}')"> Archiver</label></div>`;
    }
    let tabDiv = document.getElementById('tabletteListContent'); if(tabDiv) tabDiv.innerHTML = tabletteHtml || '<p style="color:#7f8c8d; font-style:italic;">Aucun atelier tablette en cours.</p>';

    const tbody = document.getElementById('tableDashboard'); if(!tbody) return; let html = '', listeEleves = getElevesTries();
    if(listeEleves.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucun élève enregistré.</td></tr>'; return; }

    listeEleves.forEach(e => {
        assurerStructureSemaines(e);
        let currentPlanLen = e.planHebdo ? e.planHebdo.length : 0, max = e.maxAteliers || 15, pct = Math.min(100, Math.round((currentPlanLen / max) * 100)), colorBar = pct >= 100 ? "#e74c3c" : (pct > 75 ? "#f39c12" : "#27ae60");
        let planObjectsTries = getListeTrie([...e.planHebdo, ...(e.enAttente || [])], e.priorites || [], e.suivi || {});
        let planMiniHtml = '<table style="width:100%; font-size:12px; background:#fdfefe; margin-top:5px;">';
        planObjectsTries.forEach((act, idx) => {
            let idAct = act.id, s = e.suivi[idAct] || {}, estValide = e.valides && e.valides[idAct], infosL = getInfosActivitePourEleve(act, e);
            let gdmInfo = act.pageGDM ? ` <span style="color:#2c3e50; font-size:11px;">(📖 GDM: ${escHTML(act.pageGDM)})</span>` : '';
            let styleRefaire = s.statut === 'a_refaire' ? 'background:#f39c12; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let styleRevoir = s.statut === 'a_revoir' ? 'background:#e74c3c; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let styleValider = estValide ? 'background:#27ae60; color:white; font-weight:bold;' : 'background:#ecf0f1; color:#333;';
            let logoDeb = s.statut === 'a_revoir' ? '👩‍🏫 ' : (s.statut === 'a_refaire' ? '🔄 ' : '');
            planMiniHtml += `<tr style="${estValide ? 'background:#e8f8f5;' : ''}"><td style="width:35px; font-weight:bold; text-align:center; color:#e74c3c;">${logoDeb}#${idx+1}</td><td><strong>${escHTML(act.matiere)}</strong> - ${escHTML(act.competence)}${gdmInfo}<br>${formaterEtoiles(act.difficulte)}<span style="color:#7f8c8d;">${escHTML(act.ressource)}</span> ${infosL.badgeLivre}</td><td style="text-align:right; white-space:nowrap;"><button style="${styleRefaire} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="setSuivi('${e.id}', '${idAct}', 'a_refaire')">🔄 À refaire</button> <button style="${styleRevoir} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="setSuivi('${e.id}', '${idAct}', 'a_revoir')">👩‍🏫 À revoir</button> <button style="${styleValider} border:1px solid #bdc3c7; padding:5px 8px; border-radius:4px; cursor:pointer;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">${estValide ? '✅ Validé' : '✅ Valider'}</button></td></tr>`;
        });
        if(planObjectsTries.length === 0) planMiniHtml += '<tr><td colspan="3" style="text-align:center; padding:15px;">Plan vide.</td></tr>'; planMiniHtml += '</table>';
        html += `<tr style="border-top: 2px solid #ecf0f1;"><td style="font-size:16px;"><strong>[${e.niveau}] ${escHTML(e.nom)}${e.fichierJaune ? ' 📒' : ''}</strong></td><td><div class="jauge-container"><div class="jauge-fill" style="width: ${pct}%; background-color: ${colorBar};"></div></div><div class="jauge-text">${currentPlanLen} ateliers en cours sur ${max} max</div></td><td style="text-align: center;"><button type="button" class="btn-action" style="padding:6px 12px;" onclick="toggleExpandDashboard('${e.id}')">Évaluer ⬇️</button></td></tr><tr id="dash_details_${e.id}" style="${dashboardExpanded.has(e.id) ? '' : 'display:none;'} background:#f2f4f4;"><td colspan="3" style="padding:15px;">${planMiniHtml}</td></tr>`;
    });
    tbody.innerHTML = html; genererMatriceCompetences();
}

function cloturerSemaineClasseGlobale() {
    let nbEleves = Object.keys(eleves).length; if (nbEleves === 0) return;
    if (confirm(`Clôturer la semaine en cours et passer à la suivante pour TOUS les ${nbEleves} élèves ?`)) {
        Object.values(eleves).forEach(eleve => {
            assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
            let aTransferer = [...(eleve.enAttente || [])];
            (eleve.planHebdo || []).forEach(idAct => { if (eleve.suivi && eleve.suivi[idAct] && (eleve.suivi[idAct].statut === 'a_revoir' || eleve.suivi[idAct].statut === 'a_refaire')) { if (!aTransferer.includes(idAct)) aTransferer.push(idAct); } });
            eleve.enAttente = [];
            if (eleve.semaines.length > 1) {
                eleve.semaines.splice(eleve.semaineIndex, 1);
                let nextIdx = Math.min(eleve.semaineIndex, eleve.semaines.length - 1), s = eleve.semaines[nextIdx];
                eleve.semaineIndex = nextIdx; if (!s.priorites) s.priorites = [];
                aTransferer.forEach(idAct => { if (!s.planHebdo.includes(idAct)) s.planHebdo.unshift(idAct); if (!s.priorites.includes(idAct)) s.priorites.push(idAct); });
                eleve.planHebdo = [...s.planHebdo]; eleve.priorites = [...s.priorites]; eleve.joursAssignes = { ...(s.joursAssignes || {}) }; eleve.valides = { ...(s.valides || {}) };
            } else {
                eleve.planHebdo = [...aTransferer]; eleve.valides = {}; eleve.priorites = [...aTransferer]; eleve.joursAssignes = {};
                eleve.semaines[0] = { id: 'sem_' + Date.now(), dateDebutISO: "", dateDebut: "", dateFin: "", planHebdo: [...eleve.planHebdo], priorites: [...eleve.priorites], joursAssignes: {}, valides: {}, suivi: JSON.parse(JSON.stringify(eleve.suivi || {})) };
            }
        });
        sauvegarderEleves(); rafraichirDashboard(); if (idEleveCourant) chargerEleve(); showToast("✅ Semaine clôturée pour toute la classe !", "success");
    }
}

function exporterBilanEdulivret() {
    let selectBilan = document.getElementById('selectEleveBilan');
    if (!selectBilan || !selectBilan.value || !eleves[selectBilan.value]) { showToast("Sélectionnez un élève.", "error"); return; }
    let eleve = eleves[selectBilan.value], evalActs = [];
    (eleve.historique || []).forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if(act && act.estEvaluation) evalActs.push(`- [${(eleve.bilanEvaluations && eleve.bilanEvaluations[act.id]) || "Non évalué"}] ${act.matiere} - ${act.competence} (${act.ressource})`); });
    if (evalActs.length === 0) { showToast("Aucune évaluation validée.", "error"); return; }
    navigator.clipboard.writeText(`Bilan des compétences (${eleve.nom}) :\n` + evalActs.join('\n')).then(() => showToast("📋 Résumé copié pour Edulivret/LSU !", "success"));
}

function genererMatriceCompetences() {
    const table = document.getElementById('tableMatrice'); if (!table) return; let listeEleves = getElevesTries(); if (listeEleves.length === 0 || baseDonnees.length === 0) { table.innerHTML = "<tr><td>Aucune donnée.</td></tr>"; return; }
    let compsSet = new Set(); listeEleves.forEach(e => e.historique.forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if (act && act.competence) compsSet.add(act.competence); }));
    let competences = Array.from(compsSet).sort((a,b) => a.localeCompare(b, 'fr'));
    let html = `<thead><tr><th>Élèves \\ Compétences</th>${competences.map(c => `<th><div style="writing-mode: vertical-rl; transform: rotate(180deg); max-height: 120px; margin: auto;">${escHTML(c)}</div></th>`).join('')}</tr></thead><tbody>`;
    listeEleves.forEach(e => { html += `<tr><td>[${e.niveau}] ${escHTML(e.nom)}</td>${competences.map(c => { let v = e.historique.find(h => { let a = baseDonnees.find(b => b.id === h.idActivite); return a && a.competence === c; }); return v ? `<td style="background:#27ae60; color:white; font-weight:bold;">V</td>` : `<td style="background:#ecf0f1; color:#bdc3c7;">-</td>`; }).join('')}</tr>`; });
    table.innerHTML = html + `</tbody>`;
}

function changerBilanEval(idEleve, idAct, valeur) { let eleve = eleves[idEleve]; if(!eleve) return; if(!eleve.bilanEvaluations) eleve.bilanEvaluations = {}; eleve.bilanEvaluations[idAct] = valeur; sauvegarderEleves(); }

function genererBilanEleve() {
    let selectBilan = document.getElementById('selectEleveBilan'), zone = document.getElementById('zoneBilanPrint'); if (!selectBilan || !zone) return;
    let idEleve = selectBilan.value; if (!idEleve || !eleves[idEleve]) { zone.innerHTML = '<h3 style="text-align:center; color:#7f8c8d; margin-top:50px;">Sélectionnez un élève.</h3>'; return; }
    let eleve = eleves[idEleve], evalActs = [];
    (eleve.historique || []).forEach(h => { let act = baseDonnees.find(b => b.id === h.idActivite); if(act && act.estEvaluation) evalActs.push({ act: act, date: h.date }); });
    if (evalActs.length === 0) { zone.innerHTML = `<h3>Bilan - [${eleve.niveau}] ${escHTML(eleve.nom)}</h3><p>Aucune évaluation validée.</p>`; return; }
    let nbA = 0, nbPA = 0, nbNA = 0;
    evalActs.forEach(item => { let v = (eleve.bilanEvaluations && eleve.bilanEvaluations[item.act.id]) || ""; if (v === 'A') nbA++; else if (v === 'PA') nbPA++; else if (v === 'NA') nbNA++; });
    let html = `<div style="border-bottom:2px solid #9b59b6; padding-bottom:10px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;"><div><h2 style="margin:0;">Bilan : [${eleve.niveau}] ${escHTML(eleve.nom)}</h2></div><div style="display:flex; gap:10px;"><span style="background:#e8f8f5; padding:6px 12px; border-radius:8px; font-weight:bold;">✅ A : ${nbA}</span><span style="background:#fef5e7; padding:6px 12px; border-radius:8px; font-weight:bold;">🟠 PA : ${nbPA}</span><span style="background:#fdedec; padding:6px 12px; border-radius:8px; font-weight:bold;">❌ NA : ${nbNA}</span></div></div>`;
    let groupes = {}; evalActs.forEach(item => { let mat = item.act.matiere || "Autre"; if (!groupes[mat]) groupes[mat] = []; groupes[mat].push(item); });
    Object.keys(groupes).sort().forEach(mat => {
        let coul = getCouleurMatiereBandeau(mat);
        html += `<h3 style="background:${coul.bg}; color:${coul.text}; padding:6px 12px; border-radius:6px;">${escHTML(mat)}</h3><table style="width:100%; font-size:13px;"><thead><tr><th>Compétence</th><th style="width:100px; text-align:center;">Date</th><th style="width:140px; text-align:center;">Position</th></tr></thead><tbody>`;
        groupes[mat].forEach(item => {
            let actId = item.act.id, cur = (eleve.bilanEvaluations && eleve.bilanEvaluations[actId]) || "";
            html += `<tr><td><strong>${escHTML(item.act.competence)}</strong><br><span style="font-size:11px; color:#7f8c8d;">${escHTML(item.act.ressource)}</span></td><td style="text-align:center;">${item.date}</td><td style="text-align:center;" class="no-print-eval">${['A','PA','NA'].map(v => `<button type="button" style="background:${cur===v?(v==='A'?'#27ae60':(v==='PA'?'#f39c12':'#e74c3c')):'#ecf0f1'}; color:${cur===v?'white':'#333'}; border:1px solid #bdc3c7; border-radius:3px; padding:4px 8px; font-weight:bold; cursor:pointer;" onclick="changerBilanEval('${eleve.id}','${actId}','${v}'); genererBilanEleve();">${v}</button>`).join(' ')}</td><td style="text-align:center; font-weight:bold; display:none;" class="print-eval-text">${cur || '-'}</td></tr>`;
        });
        html += `</tbody></table>`;
    });
    zone.innerHTML = html;
}

function initNiveaux() {
    const selectNiveau = document.getElementById('selectNiveau'); if(!selectNiveau) return;
    let niveauxSimples = new Set(); baseDonnees.forEach(a => { if(a.niveau) a.niveau.split(/[,/]+/).map(x => x.trim().toUpperCase()).forEach(x => { if(x) niveauxSimples.add(x); }); });
    let niveauxFinaux = Array.from(niveauxSimples); const ordreNiveaux = { "CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5 };
    niveauxFinaux.sort((a, b) => (ordreNiveaux[a] || 99) - (ordreNiveaux[b] || 99));
    let currentVal = selectNiveau.value; selectNiveau.innerHTML = '<option value="">-- Choix --</option>' + niveauxFinaux.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('');
    if (niveauxFinaux.includes(currentVal)) selectNiveau.value = currentVal;
    majCascadeMatiere(); majFiltresNiveaux();
}

function majCascadeMatiere() {
    const niveau = document.getElementById('selectNiveau').value, periode = document.getElementById('selectPeriode').value, selectMatiere = document.getElementById('selectMatiere'), selectSequence = document.getElementById('selectSequence');
    if (!selectMatiere || !selectSequence) return;
    if(!niveau) { selectMatiere.innerHTML = '<option value="">-- --</option>'; selectMatiere.disabled = true; selectSequence.innerHTML = '<option value="">-- --</option>'; selectSequence.disabled = true; return; }
    selectMatiere.disabled = false;
    let actF = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()));
    if(periode) actF = actF.filter(a => programmations[a.matiere + "|" + a.competence] && programmations[a.matiere + "|" + a.competence].includes(periode));
    let matieres = [...new Set(actF.map(a => a.matiere))].filter(Boolean).sort((a,b)=>nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));
    selectMatiere.innerHTML = '<option value="">-- Matière --</option>' + matieres.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    majCascadeSequence();
}

function majCascadeSequence() {
    const niveau = document.getElementById('selectNiveau').value, periode = document.getElementById('selectPeriode').value, matiere = document.getElementById('selectMatiere').value, selectSequence = document.getElementById('selectSequence');
    if (!selectSequence) return;
    if(!matiere) { selectSequence.innerHTML = '<option value="">-- --</option>'; selectSequence.disabled = true; return; }
    selectSequence.disabled = false;
    let actF = baseDonnees.filter(a => a.niveau && a.niveau.toUpperCase().includes(niveau.toUpperCase()) && a.matiere === matiere);
    if(periode) actF = actF.filter(a => programmations[a.matiere + "|" + a.competence] && programmations[a.matiere + "|" + a.competence].includes(periode));
    let sequences = [...new Set(actF.map(a => a.sequence))].filter(Boolean).sort((a,b)=>a.localeCompare(b));
    selectSequence.innerHTML = '<option value="">-- Séquence --</option>' + sequences.map(s => `<option value="${escHTML(s)}">${escHTML(s)}</option>`).join('');
    afficherRessourcesDisponibles();
}

function majFiltresNiveaux() {
    let niveauxExistants = ["CP", "CE1", "CE2", "CM1", "CM2"];
    let dbFilters = document.getElementById('dbFilters'); if (dbFilters) dbFilters.innerHTML = `<button type="button" class="filter-btn ${filtreCourantDB === 'Tous' ? 'active' : ''}" onclick="appliquerFiltreDB('Tous')">📁 Tous</button>` + niveauxExistants.map(n => `<button type="button" class="filter-btn ${filtreCourantDB === n ? 'active' : ''}" onclick="appliquerFiltreDB('${n}')">📘 ${n}</button>`).join('');
    let matieresDispos = getMatieresDisponibles();
    let dbMatFilters = document.getElementById('dbMatiereFilters'); if (dbMatFilters) dbMatFilters.innerHTML = `<button type="button" class="filter-btn ${filtreCourantMatiere === 'Toutes' ? 'active' : ''}" onclick="appliquerFiltreMatiere('Toutes')">📂 Toutes</button>` + matieresDispos.map(m => `<button type="button" class="filter-btn ${filtreCourantMatiere === m ? 'active' : ''}" onclick="appliquerFiltreMatiere('${escJS(m)}')">📗 ${escHTML(m)}</button>`).join('');
    let typesDisposDB = Object.keys(imagesParType).sort();
    let dbTypeFilters = document.getElementById('dbTypeFilters'); if (dbTypeFilters) dbTypeFilters.innerHTML = `<button type="button" class="filter-btn ${filtreCourantTypeDB === 'Tous' ? 'active' : ''}" onclick="appliquerFiltreTypeDB('Tous')">📂 Tous</button>` + typesDisposDB.map(t => `<button type="button" class="filter-btn ${filtreCourantTypeDB === t ? 'active' : ''}" onclick="appliquerFiltreTypeDB('${escJS(t)}')">🏷️ ${escHTML(t)}</button>`).join('');
    let etqTypeCheckboxes = document.getElementById('etqTypeCheckboxes'); if (etqTypeCheckboxes) etqTypeCheckboxes.innerHTML = typesDisposDB.map(t => `<label style="font-size: 13px; cursor: pointer;"><input type="checkbox" class="cb-type-etq" value="${escHTML(t)}" checked onchange="afficherChoixEtiquettes()"> ${escHTML(t)}</label>`).join('');
}

function basculerTousTypes(source) { document.querySelectorAll('.cb-type-etq').forEach(cb => cb.checked = source.checked); afficherChoixEtiquettes(); }
function appliquerFiltreDB(niveau) { filtreCourantDB = niveau; filtreCourantMatiere = 'Toutes'; filtreCourantTypeDB = 'Tous'; majFiltresNiveaux(); afficherBase(); }
function appliquerFiltreMatiere(matiere) { filtreCourantMatiere = matiere; filtreCourantTypeDB = 'Tous'; majFiltresNiveaux(); afficherBase(); }
function appliquerFiltreTypeDB(type) { filtreCourantTypeDB = type; majFiltresNiveaux(); afficherBase(); }

function getMatieresDisponibles() { let mats = [...new Set(baseDonnees.map(a => a.matiere))].filter(Boolean); ["Mathématiques", "Français", "Histoire", "Géographie", "Sciences", "Anglais", "EMC", "Arts"].forEach(d => { if(!mats.includes(d)) mats.push(d); }); return mats.sort((a,b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr')); }
function getSequencesDisponibles(matiere) { return [...new Set(baseDonnees.filter(a => !matiere || matiere === 'AUTRE' || a.matiere === matiere).map(a => a.sequence))].filter(Boolean).sort(); }
function getCompetencesDisponibles(sequence) { return [...new Set(baseDonnees.filter(a => !sequence || sequence === 'AUTRE' || a.sequence === sequence).map(a => a.competence))].filter(Boolean).sort(); }

function initialiserSelectsFormulaire() {
    const selMat = document.getElementById('addMatiereSelect'); if (!selMat) return;
    let matActuelle = selMat.value, mats = getMatieresDisponibles();
    selMat.innerHTML = '<option value="">-- 2. Sélectionner Matière --</option>' + mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('') + `<option value="AUTRE">➕ Autre matière...</option>`;
    if (mats.includes(matActuelle) || matActuelle === 'AUTRE') selMat.value = matActuelle;
    surChangementMatiereForm(selMat.value); majSelectCouleursRapides();
}

function surChangementMatiereForm(valMatiere) {
    const inputCustom = document.getElementById('addMatiereCustom'), selSeq = document.getElementById('addSequenceSelect'); if (!selSeq) return;
    if(inputCustom) inputCustom.style.display = valMatiere === 'AUTRE' ? 'block' : 'none';
    let seqActuelle = selSeq.value, seqs = getSequencesDisponibles(valMatiere);
    selSeq.innerHTML = '<option value="">-- 3. Sélectionner Séquence --</option>' + seqs.map(s => `<option value="${escHTML(s)}">${escHTML(s)}</option>`).join('') + `<option value="AUTRE">➕ Autre séquence...</option>`;
    if (seqs.includes(seqActuelle) || seqActuelle === 'AUTRE') selSeq.value = seqActuelle;
    surChangementSequenceForm(selSeq.value);
}

function surChangementSequenceForm(valSeq) {
    const inputCustom = document.getElementById('addSequenceCustom'), selComp = document.getElementById('addCompetenceSelect'); if (!selComp) return;
    if(inputCustom) inputCustom.style.display = valSeq === 'AUTRE' ? 'block' : 'none';
    let compActuelle = selComp.value, comps = getCompetencesDisponibles(valSeq);
    selComp.innerHTML = '<option value="">-- 5. Sélectionner Compétence --</option>' + comps.map(c => `<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('') + `<option value="AUTRE">➕ Autre compétence...</option>`;
    if (comps.includes(compActuelle) || compActuelle === 'AUTRE') selComp.value = compActuelle;
    surChangementCompetenceForm(selComp.value);
}

function surChangementCompetenceForm(valComp) { const inputCustom = document.getElementById('addCompetenceCustom'); if(inputCustom) inputCustom.style.display = valComp === 'AUTRE' ? 'block' : 'none'; }
function ouvrirModal(idModal) { let m = document.getElementById(idModal); if(m) m.style.display = 'flex'; }
function fermerModal(idModal) { let m = document.getElementById(idModal); if(m) m.style.display = 'none'; initialiserSelectsFormulaire(); }

function afficherListeMatieresModal() { let mats = [...new Set(baseDonnees.map(a => a.matiere))].filter(Boolean).sort(); document.getElementById('listeMatieresModal').innerHTML = '<table style="width:100%; font-size:12px;">' + mats.map(m => `<tr><td><input type="text" class="input-edit-matiere" data-ancienne="${escHTML(m)}" value="${escHTML(m)}" style="width:100%;"></td></tr>`).join('') + '</table><button type="button" onclick="sauvegarderToutesMatieres()" class="btn-valid" style="width:100%; margin-top:10px;">💾 Valider</button>'; }
function sauvegarderToutesMatieres() { document.querySelectorAll('.input-edit-matiere').forEach(inp => { let anc = inp.getAttribute('data-ancienne'), nouv = inp.value.trim(); if(nouv && anc !== nouv) baseDonnees.forEach(a => { if(a.matiere === anc) a.matiere = nouv; }); }); postEditGlobal(); fermerModal('modalMatieres'); }

// --- GESTION ET SUPPRESSION DÉTAILLÉE DES SÉQUENCES ---
let sequenceEnCoursSuppression = null;

function afficherListeSequencesModal() {
    let seqs = [...new Set(baseDonnees.map(a => a.sequence))].filter(Boolean).sort((a,b) => a.localeCompare(b, 'fr'));
    if (seqs.length === 0) {
        document.getElementById('listeSequencesModal').innerHTML = '<p style="text-align:center; color:#7f8c8d;">Aucune séquence enregistrée.</p>';
        return;
    }
    let html = '<table style="width:100%; font-size:12px;"><thead><tr><th>Nom de la séquence (modifiable)</th><th style="width:80px; text-align:center;">Ateliers</th><th style="width:140px; text-align:center;">Action</th></tr></thead><tbody>';
    seqs.forEach(s => {
        let count = baseDonnees.filter(a => a.sequence === s).length;
        html += `<tr>
            <td><input type="text" class="input-edit-sequence" data-ancienne="${escHTML(s)}" value="${escHTML(s)}" style="width:100%;"></td>
            <td style="text-align:center; font-weight:bold; color:#2980b9;">${count}</td>
            <td style="text-align:center;">
                <button type="button" onclick="ouvrirModalSuppressionSequence('${escJS(s)}')" style="background:#e74c3c; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;" title="Choisir quoi faire des ateliers de cette séquence">🗑️ Gérer / Suppr.</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table><button type="button" onclick="sauvegarderToutesSequences()" class="btn-valid" style="width:100%; margin-top:12px;">💾 Enregistrer les renommages</button>';
    document.getElementById('listeSequencesModal').innerHTML = html;
}

function sauvegarderToutesSequences() {
    document.querySelectorAll('.input-edit-sequence').forEach(inp => {
        let anc = inp.getAttribute('data-ancienne'), nouv = inp.value.trim();
        if(nouv && anc !== nouv) baseDonnees.forEach(a => { if(a.sequence === anc) a.sequence = nouv; });
    });
    postEditGlobal(); fermerModal('modalSequences'); showToast("Séquences mises à jour !", "success");
}

function ouvrirModalSuppressionSequence(nomSeq) {
    sequenceEnCoursSuppression = nomSeq;
    fermerModal('modalSequences');
    let ateliersSeq = baseDonnees.filter(a => a.sequence === nomSeq);
    let autresSequences = [...new Set(baseDonnees.map(a => a.sequence))].filter(s => s && s !== nomSeq).sort((a,b) => a.localeCompare(b, 'fr'));

    document.getElementById('titreSeqASupprimer').innerText = nomSeq;
    document.getElementById('nbAteliersSeqASupprimer').innerText = ateliersSeq.length;
    let inpGlobal = document.getElementById('inputGlobalNouvelleSeq');
    if (inpGlobal) { inpGlobal.value = ''; inpGlobal.style.display = 'none'; }

    let optionsExistantesHtml = autresSequences.length > 0
        ? autresSequences.map(s => `<option value="${escHTML(s)}">${escHTML(s)}</option>`).join('')
        : `<option value="">-- Aucune autre séquence existante --</option>`;

    let html = `<table style="width:100%; font-size:12px; border-collapse:collapse;">
        <thead style="position:sticky; top:0; background:#34495e; color:white;">
            <tr>
                <th style="padding:8px;">Atelier / Ressource</th>
                <th style="padding:8px;">Compétence</th>
                <th style="padding:8px; width:210px;">Action pour cet atelier</th>
                <th style="padding:8px; width:230px;">Séquence de destination</th>
            </tr>
        </thead>
        <tbody>`;

    ateliersSeq.forEach(a => {
        let defautAction = autresSequences.length > 0 ? 'existante' : 'supprimer';
        html += `<tr class="ligne-atelier-seq-suppr" data-id="${a.id}" style="border-bottom:1px solid #ecf0f1;">
            <td style="padding:6px;">
                <strong>[${escHTML(a.niveau)}] ${escHTML(a.ressource)}</strong>
                ${a.symbole ? `<span style="color:#7f8c8d; font-size:11px;"> (${escHTML(a.symbole)})</span>` : ''}
                <br><span style="font-size:11px; color:#2980b9;">${escHTML(a.matiere)} ${a.lecon ? '— ' + escHTML(a.lecon) : ''}</span>
            </td>
            <td style="padding:6px; font-size:11px;">${escHTML(a.competence)}</td>
            <td style="padding:6px;">
                <select class="select-action-atelier-seq" onchange="changerActionAtelierSeq(this)" style="width:100%; padding:6px; border-radius:4px; border:1px solid #bdc3c7; font-weight:bold;">
                    <option value="supprimer" ${defautAction === 'supprimer' ? 'selected' : ''}>🗑️ Supprimer l'atelier</option>
                    <option value="existante" ${defautAction === 'existante' ? 'selected' : ''} ${autresSequences.length === 0 ? 'disabled' : ''}>📁 Séquence existante</option>
                    <option value="nouvelle">➕ Nouvelle séquence</option>
                </select>
            </td>
            <td style="padding:6px;">
                <div class="bloc-dest-existante" style="display:${defautAction === 'existante' ? 'block' : 'none'};">
                    <select class="select-dest-existante" style="width:100%; padding:6px; border-radius:4px; border:1px solid #2980b9;">
                        ${optionsExistantesHtml}
                    </select>
                </div>
                <div class="bloc-dest-nouvelle" style="display:none;">
                    <input type="text" class="input-dest-nouvelle" placeholder="Nom de la nouvelle séquence..." style="width:100%; padding:6px; border-radius:4px; border:1px solid #27ae60; background:#f0fdf4;">
                </div>
                <div class="bloc-dest-supprimer" style="display:${defautAction === 'supprimer' ? 'block' : 'none'}; color:#c0392b; font-size:11px; font-style:italic; text-align:center;">
                    Sera retiré définitivement
                </div>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('listeAteliersSeqASupprimer').innerHTML = html;
    ouvrirModal('modalSupprimerSequence');
}

function changerActionAtelierSeq(selectElem) {
    let tr = selectElem.closest('tr');
    if (!tr) return;
    let val = selectElem.value;
    tr.querySelector('.bloc-dest-existante').style.display = (val === 'existante') ? 'block' : 'none';
    tr.querySelector('.bloc-dest-nouvelle').style.display = (val === 'nouvelle') ? 'block' : 'none';
    tr.querySelector('.bloc-dest-supprimer').style.display = (val === 'supprimer') ? 'block' : 'none';
}

function appliquerActionGlobaleSeq(actionType) {
    let inpGlobal = document.getElementById('inputGlobalNouvelleSeq');
    if (inpGlobal) inpGlobal.style.display = (actionType === 'nouvelle') ? 'inline-block' : 'none';
    document.querySelectorAll('.ligne-atelier-seq-suppr').forEach(tr => {
        let sel = tr.querySelector('.select-action-atelier-seq');
        if (!sel) return;
        let opt = sel.querySelector(`option[value="${actionType}"]`);
        if (opt && !opt.disabled) {
            sel.value = actionType;
            changerActionAtelierSeq(sel);
            if (actionType === 'nouvelle' && inpGlobal && inpGlobal.value.trim() !== '') {
                tr.querySelector('.input-dest-nouvelle').value = inpGlobal.value;
            }
        }
    });
}

function copierNomNouvelleSeqGlobale(val) {
    document.querySelectorAll('.ligne-atelier-seq-suppr').forEach(tr => {
        let sel = tr.querySelector('.select-action-atelier-seq');
        if (sel && sel.value === 'nouvelle') {
            let inp = tr.querySelector('.input-dest-nouvelle');
            if (inp) inp.value = val;
        }
    });
}

function nettoyerAtelierSupprimeChezEleves(idAct) {
    Object.values(eleves).forEach(e => {
        if (e.planHebdo) e.planHebdo = e.planHebdo.filter(id => id !== idAct);
        if (e.enAttente) e.enAttente = e.enAttente.filter(id => id !== idAct);
        if (e.priorites) e.priorites = e.priorites.filter(id => id !== idAct);
        if (e.masquees) e.masquees = e.masquees.filter(id => id !== idAct);
        if (e.joursAssignes && e.joursAssignes[idAct]) delete e.joursAssignes[idAct];
        if (e.suivi && e.suivi[idAct]) delete e.suivi[idAct];
        if (e.valides && e.valides[idAct]) delete e.valides[idAct];
        if (e.semaines && Array.isArray(e.semaines)) {
            e.semaines.forEach(s => {
                if (s.planHebdo) s.planHebdo = s.planHebdo.filter(id => id !== idAct);
                if (s.priorites) s.priorites = s.priorites.filter(id => id !== idAct);
                if (s.joursAssignes && s.joursAssignes[idAct]) delete s.joursAssignes[idAct];
                if (s.suivi && s.suivi[idAct]) delete s.suivi[idAct];
                if (s.valides && s.valides[idAct]) delete s.valides[idAct];
            });
        }
    });
}

function validerSuppressionSequence() {
    let lignes = document.querySelectorAll('.ligne-atelier-seq-suppr');
    for (let tr of lignes) {
        let action = tr.querySelector('.select-action-atelier-seq').value;
        if (action === 'existante') {
            let dest = tr.querySelector('.select-dest-existante').value.trim();
            if (!dest) { alert("Veuillez choisir une séquence existante valide pour chaque atelier déplacé."); return; }
        } else if (action === 'nouvelle') {
            let destNouv = tr.querySelector('.input-dest-nouvelle').value.trim();
            if (!destNouv) { alert("Veuillez saisir un nom de nouvelle séquence pour chaque atelier concerné."); return; }
        }
    }

    let nbSuppr = 0, nbDeplaces = 0;
    lignes.forEach(tr => {
        let idAct = tr.getAttribute('data-id');
        let action = tr.querySelector('.select-action-atelier-seq').value;
        if (action === 'supprimer') {
            baseDonnees = baseDonnees.filter(a => a.id !== idAct);
            nettoyerAtelierSupprimeChezEleves(idAct);
            nbSuppr++;
        } else if (action === 'existante') {
            let dest = tr.querySelector('.select-dest-existante').value.trim();
            let act = baseDonnees.find(a => a.id === idAct);
            if (act) { act.sequence = dest; nbDeplaces++; }
        } else if (action === 'nouvelle') {
            let destNouv = tr.querySelector('.input-dest-nouvelle').value.trim();
            let act = baseDonnees.find(a => a.id === idAct);
            if (act) { act.sequence = destNouv; nbDeplaces++; }
        }
    });

    sauvegarderEleves();
    postEditGlobal();
    afficherChoixEtiquettes();
    rafraichirDashboard();
    if (idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); }
    fermerModal('modalSupprimerSequence');
    showToast(`✅ Séquence traitée : ${nbDeplaces} déplacé(s), ${nbSuppr} supprimé(s).`, "success");
}

function afficherListeCompetencesModal() { let comps = [...new Set(baseDonnees.map(a => a.competence))].filter(Boolean).sort(); document.getElementById('listeCompetencesModal').innerHTML = '<table style="width:100%; font-size:12px;">' + comps.map(c => `<tr><td><input type="text" class="input-edit-competence" data-ancienne="${escHTML(c)}" value="${escHTML(c)}" style="width:100%;"></td></tr>`).join('') + '</table><button type="button" onclick="sauvegarderToutesCompetences()" class="btn-valid" style="width:100%; margin-top:10px;">💾 Valider</button>'; }
function sauvegarderToutesCompetences() { document.querySelectorAll('.input-edit-competence').forEach(inp => { let anc = inp.getAttribute('data-ancienne'), nouv = inp.value.trim(); if(nouv && anc !== nouv) baseDonnees.forEach(a => { if(a.competence === anc) a.competence = nouv; }); }); postEditGlobal(); fermerModal('modalCompetences'); }

function afficherListeTypesModal() {
    let html = '<table style="width:100%; font-size:11px;"><thead><tr><th>Type</th><th>Lien image Drive</th><th>N°?</th><th>Coul?</th><th>Tablette?</th><th></th></tr></thead><tbody>';
    Object.keys(imagesParType).sort().forEach(t => {
        let cfg = imagesParType[t], imgVal = (typeof cfg === 'object') ? (cfg.img || "") : (cfg || "");
        html += `<tr><td><strong>${escHTML(t)}</strong></td><td><input type="text" class="input-type-img" data-nom="${escHTML(t)}" value="${escHTML(imgVal)}" style="width:100%;"></td><td style="text-align:center;"><input type="checkbox" class="input-type-remp" data-nom="${escHTML(t)}" ${cfg.remplacerNum ? 'checked' : ''}></td><td style="text-align:center;"><input type="checkbox" class="input-type-coul" data-nom="${escHTML(t)}" ${cfg.appliquerCouleur !== false ? 'checked' : ''}></td><td style="text-align:center;"><input type="checkbox" class="input-type-tablette" data-nom="${escHTML(t)}" ${cfg.isTablette ? 'checked' : ''}></td><td><button type="button" onclick="supprimerType('${escJS(t)}')">🗑️</button></td></tr>`;
    });
    document.getElementById('listeTypesModal').innerHTML = html + '</tbody></table><button type="button" onclick="sauvegarderTousLesTypes()" class="btn-valid" style="width:100%; margin-top:15px;">💾 Valider</button>';
}

function sauvegarderTousLesTypes() {
    document.querySelectorAll('#listeTypesModal tbody tr').forEach(tr => {
        let imgInput = tr.querySelector('.input-type-img'); if(!imgInput) return; let nomType = imgInput.getAttribute('data-nom');
        imagesParType[nomType] = { img: imgInput.value.trim(), remplacerNum: tr.querySelector('.input-type-remp').checked, appliquerCouleur: tr.querySelector('.input-type-coul').checked, isTablette: tr.querySelector('.input-type-tablette').checked };
    });
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); sauvegarderBase(); afficherBase(); if(idEleveCourant) afficherPlanHebdo(); fermerModal('modalTypes'); majListeTypesSelect(); majFiltresNiveaux();
}
function supprimerType(nomType) { if (confirm(`Supprimer le type "${nomType}" ?`)) { delete imagesParType[nomType]; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); majListeTypesSelect(); afficherListeTypesModal(); } }
function majListeTypesSelect() { const selectType = document.getElementById('addTypeSelect'); if(!selectType) return; let cur = selectType.value; selectType.innerHTML = '<option value="">-- 7. Sélectionner un Type --</option>' + Object.keys(imagesParType).sort().map(t => `<option value="${escHTML(t)}">${escHTML(t)}</option>`).join('') + `<option value="AUTRE">➕ Autre type...</option>`; if(cur) selectType.value = cur; }
function postEditGlobal() { trierBaseDonnees(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); }

function editerActiviteBase(idActivite) {
    const a = baseDonnees.find(x => x.id === idActivite); if(!a) return; idEnCoursEdition = idActivite; couleurManuelleModifiee = true;
    document.querySelectorAll('.cb-niveau-form').forEach(cb => cb.checked = Boolean(a.niveau && a.niveau.toUpperCase().includes(cb.value.toUpperCase())));
    initialiserSelectsFormulaire();
    document.getElementById('addMatiereSelect').value = a.matiere || ''; surChangementMatiereForm(a.matiere || '');
    document.getElementById('addSequenceSelect').value = a.sequence || ''; surChangementSequenceForm(a.sequence || '');
    document.getElementById('addLecon').value = a.lecon || '';
    document.getElementById('addCompetenceSelect').value = a.competence || '';
    document.getElementById('addRessource').value = a.ressource || '';
    document.getElementById('addTypeSelect').value = a.typeRes || '';
    document.getElementById('addSymbole').value = a.symbole || '';
    document.getElementById('addDifficulte').value = a.difficulte || 0;
    if (document.getElementById('addPageGDM')) document.getElementById('addPageGDM').value = a.pageGDM || '';
    if (document.getElementById('addPageManuel')) document.getElementById('addPageManuel').value = a.pageManuel || '';
    if (document.getElementById('addVarianteJaune')) document.getElementById('addVarianteJaune').value = a.varianteJaune || '';
    document.querySelectorAll('.cb-pers-form').forEach(cb => cb.checked = Boolean(a.personnes && a.personnes.includes(cb.value)));
    document.getElementById('addIsEval').checked = Boolean(a.estEvaluation);
    document.getElementById('btnValiderForm').innerHTML = "💾 Enregistrer"; document.getElementById('btnAnnulerForm').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annulerEdition() {
    idEnCoursEdition = null; couleurManuelleModifiee = false;
    ['addLecon','addRessource','addSymbole','addImage','addPageGDM','addPageManuel','addVarianteJaune'].forEach(id => { let el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('addDifficulte').value = '0'; document.getElementById('addIsEval').checked = false;
    document.getElementById('btnValiderForm').innerHTML = "➕ Ajouter l'activité"; document.getElementById('btnAnnulerForm').style.display = "none";
}

function sauvegarderFormulaire() {
    let niveauxCoches = getNiveauxCochesFormulaire(); if (niveauxCoches.length === 0) { alert("Cochez au moins un niveau."); return; }
    const niveauStr = niveauxCoches.join(', '); let persCoches = []; document.querySelectorAll('.cb-pers-form:checked').forEach(cb => persCoches.push(cb.value));
    let matSelect = document.getElementById('addMatiereSelect'), matiereFinal = matSelect.value === 'AUTRE' ? document.getElementById('addMatiereCustom').value.trim() : matSelect.value;
    let seqSelect = document.getElementById('addSequenceSelect'), sequenceFinal = seqSelect.value === 'AUTRE' ? document.getElementById('addSequenceCustom').value.trim() : seqSelect.value;
    let compSelect = document.getElementById('addCompetenceSelect'), competenceFinal = compSelect.value === 'AUTRE' ? document.getElementById('addCompetenceCustom').value.trim() : compSelect.value;
    const ressource = document.getElementById('addRessource').value.trim(), symbole = document.getElementById('addSymbole').value.trim();
    const difficulte = parseInt(document.getElementById('addDifficulte').value) || 0;
    const pageGDM = document.getElementById('addPageGDM') ? document.getElementById('addPageGDM').value.trim() : "";
    const pageManuel = document.getElementById('addPageManuel') ? document.getElementById('addPageManuel').value.trim() : "";
    const varianteJaune = document.getElementById('addVarianteJaune') ? document.getElementById('addVarianteJaune').value.trim() : "";
    let selectTypeElem = document.getElementById('addTypeSelect'), typeFinal = selectTypeElem.value === 'AUTRE' ? document.getElementById('addTypeCustom').value.trim() : selectTypeElem.value;

    if(!matiereFinal || !sequenceFinal || !competenceFinal || !ressource) { alert("Remplissez Matière, Séquence, Compétence et Ressource."); return; }
    let visuel = document.getElementById('addImage').value.trim() || document.getElementById('selectCouleurRapide').value || calculerCouleurAutomatique(matiereFinal, niveauStr, typeFinal);

    let objAct = { id: idEnCoursEdition || ('act_' + Date.now() + Math.random().toString(36).substr(2, 5)), niveau: niveauStr, matiere: matiereFinal, sequence: sequenceFinal, lecon: document.getElementById('addLecon').value.trim(), competence: competenceFinal, ressource: ressource, typeRes: typeFinal, symbole: symbole, difficulte: difficulte, pageGDM: pageGDM, pageManuel: pageManuel, varianteJaune: varianteJaune, personnes: persCoches.join(' '), visuel: visuel, estEvaluation: document.getElementById('addIsEval').checked };

    if(idEnCoursEdition) { const idx = baseDonnees.findIndex(a => a.id === idEnCoursEdition); if(idx > -1) baseDonnees[idx] = objAct; annulerEdition(); }
    else { baseDonnees.push(objAct); ['addRessource','addSymbole','addPageManuel','addVarianteJaune'].forEach(id => { let el = document.getElementById(id); if(el) el.value = ''; }); showToast("Activité ajoutée !", "success"); }
    trierBaseDonnees(); sauvegarderBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); afficherChoixEtiquettes();
    if(idEleveCourant) { afficherPlanHebdo(); afficherRessourcesDisponibles(); }
}

function changerCouleurDB(idActivite, nouvelleCouleur) { const idx = baseDonnees.findIndex(a => a.id === idActivite); if(idx > -1) { baseDonnees[idx].visuel = nouvelleCouleur; sauvegarderBase(); afficherBase(); } }
function changerImageDB(idActivite) { const url = prompt("Lien de l'image :"); if(url !== null) { const idx = baseDonnees.findIndex(a => a.id === idActivite); if(idx > -1) { baseDonnees[idx].visuel = url.trim(); sauvegarderBase(); afficherBase(); } } }
function supprimerActiviteBase(idActivite) { if(confirm("Supprimer définitivement cet atelier ?")) { baseDonnees = baseDonnees.filter(a => a.id !== idActivite); nettoyerAtelierSupprimeChezEleves(idActivite); sauvegarderEleves(); sauvegarderBase(); afficherBase(); } }
function viderBase() { if(confirm("Vider toute la base ?")) { baseDonnees = []; sauvegarderBase(); afficherBase(); } }

function afficherBase() {
    const tbody = document.getElementById('tableBase'); if(!tbody) return; let donneesAffichees = baseDonnees;
    const searchInput = document.getElementById('searchBase');
    if (searchInput && searchInput.value) { let terms = searchInput.value.toLowerCase().split(' '); donneesAffichees = donneesAffichees.filter(a => terms.every(term => `${a.niveau} ${a.matiere} ${a.sequence} ${a.competence} ${a.ressource} ${a.pageManuel||''} ${a.varianteJaune||''}`.toLowerCase().includes(term))); }
    if(filtreCourantDB !== 'Tous') donneesAffichees = donneesAffichees.filter(a => a.niveau && a.niveau.toUpperCase().includes(filtreCourantDB));
    if(filtreCourantMatiere !== 'Toutes') donneesAffichees = donneesAffichees.filter(a => a.matiere === filtreCourantMatiere);
    if(filtreCourantTypeDB !== 'Tous') donneesAffichees = donneesAffichees.filter(a => a.typeRes && a.typeRes.toLowerCase() === filtreCourantTypeDB.toLowerCase());

    tbody.innerHTML = donneesAffichees.map(a => {
        let infoManuels = (a.pageGDM ? `<br><span style="font-size:10px; color:#34495e;">📖 GDM: ${escHTML(a.pageGDM)}</span>` : '') + (a.pageManuel ? `<br><span style="font-size:10px; color:#2980b9;">📘 Manuel: ${escHTML(a.pageManuel)}</span>` : '') + (a.varianteJaune ? `<br><span style="font-size:10px; color:#d35400; font-weight:bold;">📒 Jaune: ${escHTML(a.varianteJaune)}</span>` : '');
        return `<tr class="${a.estEvaluation ? 'row-eval' : ''}"><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong>${infoManuels}</td><td>${escHTML(a.typeRes)}</td><td class="col-center">${escHTML(a.personnes)}</td><td style="text-align:center;"><strong>${escHTML(a.symbole)}</strong></td><td style="text-align:center; white-space:nowrap;"><button type="button" onclick="assignerActivite('${a.id}')">👥</button> <button type="button" onclick="editerActiviteBase('${a.id}')">✏️</button> <button type="button" onclick="supprimerActiviteBase('${a.id}')" style="color:red;">❌</button></td></tr>`;
    }).join('');
}

// --- GESTION DE LA SAISIE MULTIPLE EN RAFALE ---
function toggleModeSaisieMultiple() {
    let bloc = document.getElementById('blocSaisieMultiple');
    let btn = document.getElementById('btnToggleModeSaisie');
    if (!bloc) return;
    if (bloc.style.display === 'none' || !bloc.style.display) {
        bloc.style.display = 'block';
        btn.innerText = "Fermer la saisie multiple";
        let tbody = document.getElementById('lignesSaisieMultipleBody');
        if (tbody && tbody.children.length === 0) {
            ajouterLigneSaisieMultiple();
            ajouterLigneSaisieMultiple();
            ajouterLigneSaisieMultiple();
        }
        window.scrollTo({ top: bloc.offsetTop - 50, behavior: 'smooth' });
    } else {
        bloc.style.display = 'none';
        btn.innerText = "🚀 Ouvrir la saisie multiple";
    }
}

function ajouterLigneSaisieMultiple() {
    let tbody = document.getElementById('lignesSaisieMultipleBody');
    if (!tbody) return;
    let tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="multi-lecon" placeholder="Ex: L1" style="width:100%;"></td>
        <td><input type="text" class="multi-competence" placeholder="Intitulé compétence..." style="width:100%;"></td>
        <td><input type="text" class="multi-ressource" placeholder="Ex: Exercice 3 p. 45" style="width:100%;"></td>
        <td><input type="text" class="multi-manuel" placeholder="Ex: p. 45 ex. 3" style="width:100%;"></td>
        <td><input type="text" class="multi-jaune" placeholder="Ex: Fichier p. 18 ex. 2" style="width:100%; background:#fff9db;"></td>
        <td>
            <select class="multi-type" style="width:100%;">
                <option value="Atelier">Atelier</option>
                <option value="Jeu">Jeu</option>
                <option value="Fichier jaune">Fichier jaune</option>
                <option value="Vidéo">Vidéo</option>
            </select>
        </td>
        <td><input type="text" class="multi-symbole" placeholder="N°" style="width:100%; text-align:center;"></td>
        <td style="text-align:center;"><button type="button" onclick="this.closest('tr').remove()" style="background:none; border:none; color:red; cursor:pointer; font-size:16px;" title="Supprimer cette ligne">🗑️</button></td>
    `;
    tbody.appendChild(tr);
}

function enregistrerSaisieMultiple() {
    let niveau = document.getElementById('multiNiveau').value;
    let matiere = document.getElementById('multiMatiere').value.trim();
    let sequence = document.getElementById('multiSequence').value.trim();

    if (!matiere || !sequence) {
        alert("Veuillez renseigner au moins la Matière et la Séquence communes.");
        return;
    }

    let lignes = document.querySelectorAll('#lignesSaisieMultipleBody tr');
    let countAjoutes = 0;

    lignes.forEach(tr => {
        let lecon = tr.querySelector('.multi-lecon').value.trim();
        let competence = tr.querySelector('.multi-competence').value.trim();
        let ressource = tr.querySelector('.multi-ressource').value.trim();
        let pageManuel = tr.querySelector('.multi-manuel').value.trim();
        let varianteJaune = tr.querySelector('.multi-jaune').value.trim();
        let typeRes = tr.querySelector('.multi-type').value;
        let symbole = tr.querySelector('.multi-symbole').value.trim();

        if (ressource && competence) {
            let visuel = calculerCouleurAutomatique(matiere, niveau, typeRes);
            let objAct = {
                id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                niveau: niveau,
                matiere: matiere,
                sequence: sequence,
                lecon: lecon,
                competence: competence,
                ressource: ressource,
                typeRes: typeRes,
                symbole: symbole,
                difficulte: 1,
                pageGDM: "",
                pageManuel: pageManuel,
                varianteJaune: varianteJaune,
                personnes: "👤",
                visuel: visuel,
                estEvaluation: false
            };
            baseDonnees.push(objAct);
            countAjoutes++;
        }
    });

    if (countAjoutes > 0) {
        trierBaseDonnees();
        sauvegarderBase();
        initNiveaux();
        initProgFilters();
        afficherProgrammation();
        afficherBase();
        afficherChoixEtiquettes();
        toggleModeSaisieMultiple();
        showToast(`✅ ${countAjoutes} exercice(s) ajouté(s) avec succès !`, "success");
    } else {
        alert("Aucune ligne valide n'a été trouvée (Vérifiez que chaque ligne possède au moins une Compétence et un Exercice/Ressource).");
    }
}

function afficherChoixEtiquettes() {
    const tbody = document.getElementById('tableChoixEtiquettes'); if(!tbody) return;
    let typesCochés = []; document.querySelectorAll('.cb-type-etq:checked').forEach(cb => typesCochés.push(cb.value.toLowerCase()));
    let liste = baseDonnees.filter(a => a.typeRes && typesCochés.includes(a.typeRes.toLowerCase()));
    tbody.innerHTML = liste.map(a => `<tr><td style="text-align:center;"><input type="checkbox" class="cb-etiquette" data-id="${a.id}" onchange="genererApercuEtiquettes()"></td><td>${escHTML(a.niveau)}</td><td>${escHTML(a.matiere)}</td><td>${escHTML(a.ressource)} <strong>(${escHTML(a.symbole)})</strong></td><td style="text-align:center;"><input type="number" class="input-qte-etq" data-id="${a.id}" value="1" min="1" max="20" style="width:50px;" oninput="genererApercuEtiquettes()"></td></tr>`).join('');
    genererApercuEtiquettes();
}
function cocherToutesEtiquettes(source) { document.querySelectorAll('.cb-etiquette').forEach(cb => cb.checked = source.checked); genererApercuEtiquettes(); }

function genererApercuEtiquettes() {
    const container = document.getElementById('printEtiquettesContainer'); if(!container) return;
    const checkboxes = document.querySelectorAll('.cb-etiquette:checked');
    const w = document.getElementById('etqWidth').value, h = document.getElementById('etqHeight').value, fs = document.getElementById('etqFontSize').value, gap = document.getElementById('etqGap').value;
    container.style.gap = `${gap}mm`; let html = '';
    checkboxes.forEach(cb => {
        const id = cb.getAttribute('data-id'), a = baseDonnees.find(x => x.id === id), qte = parseInt(document.querySelector(`.input-qte-etq[data-id="${id}"]`).value) || 1;
        if(a) {
            let bgStyle = "", textColor = "";
            if (a.visuel && a.visuel.startsWith('#') && a.visuel !== '#ffffff') {
                bgStyle = `background-color: ${a.visuel}; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;
                if (isDarkColor(a.visuel)) textColor = "color: #ffffff;";
            }
            for(let i=0; i<qte; i++) {
                html += `<div class="etiquette-box" style="width:${w}mm; height:${h}mm; font-size:${fs}px; border:1px solid #000; ${bgStyle} ${textColor}"><strong>${escHTML(a.symbole || a.ressource)}</strong></div>`;
            }
        }
    });
    container.innerHTML = html || '<p style="text-align:center; width:100%; color:#7f8c8d;">Cochez des étiquettes.</p>';
}

function lancerImpressionEtiquettes() { window.print(); }

function exporterSauvegarde() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const data = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel' };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })); a.download = "Sauvegarde_Classe.json"; a.click();
}

function restaurerSauvegarde() {
    const fileInput = document.getElementById('fileImport'); if(!fileInput || fileInput.files.length === 0) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.base && data.eleves) {
                baseDonnees = data.base; eleves = data.eleves;
                Object.values(eleves).forEach(el => assurerStructureSemaines(el));
                sauvegarderBase(); sauvegarderEleves(); postEditGlobal(); majListeEleves(); showToast("Données restaurées !", "success");
            }
        } catch(err) { alert("Fichier invalide."); }
    }; reader.readAsText(fileInput.files[0]);
}

function changementEleveImpression() {
    let selImp = document.getElementById('selectEleveImpression'); if(!selImp) return; idEleveImpressionCourant = selImp.value;
    let blocSem = document.getElementById('blocSelectSemaineImpression'), selSemImp = document.getElementById('selectSemaineImpression');
    if (idEleveImpressionCourant && eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant]; assurerStructureSemaines(e); syncEleveVersSemaineActive(e);
        if (blocSem && selSemImp) { blocSem.style.display = 'flex'; selSemImp.innerHTML = e.semaines.map((s, idx) => `<option value="${idx}">Semaine ${idx + 1}</option>`).join(''); selSemImp.value = e.semaineIndex; }
    } else if (blocSem) blocSem.style.display = 'none';
    rafraichirFicheImpression();
}
function changerSemaineDepuisImpression(nouvelIndex) { if (idEleveImpressionCourant && eleves[idEleveImpressionCourant]) { chargerSemaineDepuisIndex(eleves[idEleveImpressionCourant], nouvelIndex); sauvegarderEleves(); changementEleveImpression(); } }
function appliquerDateImpression(dateISO) { let res = calculerVendrediDepuisISO(dateISO); dateGlobaleDebutISO = dateISO || ""; dateGlobaleDebutFR = res.debutFR; dateGlobaleFinFR = res.finFR; let spanFin = document.getElementById('pdtDateFinAffiche'); if (spanFin) spanFin.innerText = res.finFR ? `➔ au Vendredi ${res.finFR}` : "➔ au --/--"; rafraichirFicheImpression(); }

function rafraichirFicheImpression() {
    let selImp = document.getElementById('selectEleveImpression'), container = document.getElementById('containerFichesImpression'); if(!selImp || !container) return;
    idEleveImpressionCourant = selImp.value;
    if(!idEleveImpressionCourant) { container.innerHTML = '<div style="text-align:center; padding:40px; color:#7f8c8d;"><h2>Sélectionnez un élève ou un groupe ci-dessus.</h2></div>'; return; }
    if(idEleveImpressionCourant === 'TOUS_ELEVES' || idEleveImpressionCourant.startsWith('NIVEAU_')) {
        let liste = getElevesTries();
        if (idEleveImpressionCourant.startsWith('NIVEAU_')) liste = liste.filter(e => (e.niveau || 'CP').toUpperCase() === idEleveImpressionCourant.replace('NIVEAU_', ''));
        container.innerHTML = liste.map(e => genererHtmlFicheEleve(e, false, e.semaineIndex)).join('');
    } else if(eleves[idEleveImpressionCourant]) {
        container.innerHTML = genererHtmlFicheEleve(eleves[idEleveImpressionCourant], true, eleves[idEleveImpressionCourant].semaineIndex);
    }
}

function genererHtmlFicheEleve(eleve, estUnique, indexSemaineForce) {
    assurerStructureSemaines(eleve);
    let semObj = (indexSemaineForce !== undefined && eleve.semaines[indexSemaineForce]) ? eleve.semaines[indexSemaineForce] : eleve;
    let planIds = semObj.planHebdo || [], priosIds = semObj.priorites || eleve.priorites || [], joursMap = semObj.joursAssignes || eleve.joursAssignes || {}, suiviMap = { ...(eleve.suivi || {}), ...(semObj.suivi || {}) };
    let dateDebut = semObj.dateDebut || dateGlobaleDebutFR || '', dateFin = semObj.dateFin || dateGlobaleFinFR || '';
    let infoDates = (dateDebut && dateFin) ? ` (du ${escHTML(dateDebut)} au ${escHTML(dateFin)})` : "";
    let planObjects = getListeTrie(planIds, priosIds, suiviMap), rowsHtml = '', derniereSequence = "";
    let joursJours = { "Lundi": [], "Mardi": [], "Jeudi": [], "Vendredi": [] };

    planObjects.forEach((a, index) => {
        const num = index + 1; let jourImpose = joursMap[a.id] || "";
        if (jourImpose && joursJours[jourImpose]) joursJours[jourImpose].push(num);
        if (a.sequence !== derniereSequence) {
            derniereSequence = a.sequence; let coul = getCouleurMatiereBandeau(a.matiere);
            rowsHtml += `<tr class="sequence-separator-row"><td colspan="7" style="background-color:${coul.bg} !important; color:${coul.text} !important; -webkit-print-color-adjust:exact; print-color-adjust:exact;">📑 Séquence : ${escHTML(a.sequence)} (${escHTML(a.matiere)})</td></tr>`;
        }
        let infosL = getInfosActivitePourEleve(a, eleve);
        let typeAct = infosL.typeEffectif.trim().toLowerCase(), cfgType = null;
        for(let key in imagesParType) { if(key.trim().toLowerCase() === typeAct) { cfgType = imagesParType[key]; break; } }
        let lienImageConfig = (cfgType && typeof cfgType === 'object') ? cfgType.img : (cfgType || ""), remplacerNum = Boolean(cfgType && cfgType.remplacerNum);
        let imageFinale = formaterLienImage((!infosL.useJaune && a.visuel && !a.visuel.startsWith('#')) ? a.visuel : (lienImageConfig || ""));
        let repereHtml = (imageFinale && !imageFinale.startsWith('#')) ? (remplacerNum ? `<img src="${imageFinale}" style="max-height:38px; max-width:65px; display:block; margin:auto;">` : `<strong>${escHTML(a.symbole||'')}</strong><br><img src="${imageFinale}" style="max-height:30px; max-width:55px; display:block; margin:auto;">`) : `<strong>${escHTML(a.symbole || '')}</strong>`;
        let bgColor = (infosL.couleurForcee && infosL.couleurForcee.startsWith('#') && infosL.couleurForcee !== '#ffffff') ? `background-color:${infosL.couleurForcee}; -webkit-print-color-adjust:exact; print-color-adjust:exact;` : "";
        let statutAct = (suiviMap && suiviMap[a.id]) ? suiviMap[a.id].statut : "", logoMaitresseDebut = statutAct === 'a_revoir' ? `<span style="font-size:13px; margin-right:2px;">👩‍🏫</span>` : "";

        rowsHtml += `<tr class="${a.estEvaluation ? 'row-eval' : ''}">
            <td class="${jourImpose ? 'col-num num-jour-impose' : 'col-num'}">${logoMaitresseDebut}${num}</td>
            <td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<em>'+escHTML(a.lecon)+'</em><br>' : ''}${escHTML(a.competence)}</td>
            <td>${logoMaitresseDebut}${formaterEtoiles(a.difficulte)}<strong style="${jourImpose ? 'text-decoration:underline;' : ''}">${escHTML(a.ressource)}</strong> ${infosL.badgeLivre}</td>
            <td class="col-center">${escHTML(infosL.typeEffectif)}</td>
            <td class="col-center" style="${bgColor} width:80px; text-align:center;">${repereHtml}</td>
            <td class="col-center">${escHTML(a.personnes || '')}</td>
        </tr>`;
    });
    if(planObjects.length === 0) rowsHtml = '<tr><td colspan="7" style="text-align:center;">Plan de travail vide.</td></tr>';

    let maxDansUnJour = Math.max(joursJours["Lundi"].length, joursJours["Mardi"].length, joursJours["Jeudi"].length, joursJours["Vendredi"].length);
    let lignesParJour = Math.max(2, Math.ceil(planObjects.length / 4) + 1, maxDansUnJour + 1), planningRowsHtml = '';
    for(let i = 0; i < lignesParJour; i++) {
        planningRowsHtml += `<tr><td><span class="planning-cell-box">${joursJours["Lundi"][i] ?? ""}</span></td><td><span class="planning-cell-box">${joursJours["Mardi"][i] ?? ""}</span></td><td><span class="planning-cell-box">${joursJours["Jeudi"][i] ?? ""}</span></td><td><span class="planning-cell-box">${joursJours["Vendredi"][i] ?? ""}</span></td></tr>`;
    }

    let bilanBasPageHtml = `<div style="display:flex; justify-content:space-between; align-items:stretch; gap:8px; margin-top:4px; font-size:9px;">
        <div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-between;">
            <strong>🏁 Bilan de ma semaine :</strong>
            <span style="font-size:10px; font-weight:bold;">Ateliers terminés : ...... / ${planObjects.length}</span>
        </div>
        <div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-around;">
            <strong>🌤️ Météo :</strong>
            <span style="font-size:13px;">😊</span> <span style="font-size:13px;">😐</span> <span style="font-size:13px;">😟</span>
        </div>
        <div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; min-height:28px;">
            <strong>✒️ Signature des parents :</strong>
        </div>
    </div>`;

    return `<div class="panel ${estUnique ? '' : 'plan-eleve-page'}" style="margin-top:1px;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2c3e50; padding-bottom:1px; margin-bottom:2px;"><h2 style="margin:0; font-size:11px;">Plan de travail - [${eleve.niveau}] ${escHTML(eleve.nom)}</h2><span style="font-size:9.5px; font-weight:bold; color:#2980b9;">📅 Période${infoDates}</span></div><p style="font-size:8px; font-style:italic; color:#555; margin:0 0 2px 0; background:#f8f9f9; padding:1px 3px; border-left:2px solid #2980b9;">💡 <strong>Consigne :</strong> Les numéros <u>soulignés</u> sont déjà placés dans ton semainier. Le symbole 👩‍🏫 indique un atelier avec la maîtresse.</p><table><thead><tr><th class="col-num">N°</th><th>Matière & Séquence</th><th>Compétence visée</th><th>Ressource à réaliser</th><th class="col-center">Type</th><th class="col-center" style="width:80px;">N° Atelier</th><th class="col-center">Nb Pers.</th></tr></thead><tbody>${rowsHtml}</tbody></table><h4 style="margin:2px 0 1px 0; color:#2c3e50; font-size:8.5px;">📅 Planification journalière :</h4><table class="planning-table"><thead><tr><th>Lundi</th><th>Mardi</th><th>Jeudi</th><th>Vendredi</th></tr></thead><tbody>${planningRowsHtml}</tbody></table>${bilanBasPageHtml}</div>`;
}

function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetPage = document.getElementById(idPage); if(targetPage) targetPage.classList.add('active'); if(element) element.classList.add('active');
    if(idPage === 'pageSuivi' && idEleveCourant) chargerEleve();
    if(idPage === 'pageEtiquettes') { initNiveaux(); afficherChoixEtiquettes(); }
    if(idPage === 'pageImpression') { if(idEleveCourant) idEleveImpressionCourant = idEleveCourant; majListeEleves(); changementEleveImpression(); } 
    if(idPage === 'pageBase') { majSelectCouleursRapides(); afficherBase(); }
    if(idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if(idPage === 'pageDashboard') rafraichirDashboard();
    if(idPage === 'pageMatrice') genererMatriceCompetences();
    if(idPage === 'pageBilan') { majListeEleves(); genererBilanEleve(); }
    if(idPage === 'pageSave') calculTailleStockage();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function initialiserAmeliorationsUI() {
    let btnEdit = document.getElementById('btnEditEleve');
    if (btnEdit && !document.getElementById('labelToggleFichierJaune')) {
        let lbl = document.createElement('label');
        lbl.id = 'labelToggleFichierJaune';
        lbl.style.cssText = 'display:none; align-items:center; gap:5px; background:#ffe599; color:#7c2d12; padding:6px 10px; border-radius:6px; border:1px solid #f1c40f; font-size:13px; font-weight:bold; cursor:pointer;';
        lbl.title = 'Cochez si cet élève utilise le Fichier Jaune en Français au lieu du manuel';
        lbl.innerHTML = `<input type="checkbox" id="cbFichierJauneBar" onchange="toggleFichierJauneEleve(this.checked)"> 📒 Fichier Jaune`;
        btnEdit.insertAdjacentElement('afterend', lbl);
    }
    let pageSavePanel = document.querySelector('#pageSave .panel');
    if (pageSavePanel && !document.getElementById('blocFirebaseCloud')) {
        let divFb = document.createElement('div');
        divFb.id = 'blocFirebaseCloud';
        divFb.style.cssText = 'background:#fef5e7; border:1px solid #f39c12; padding:20px; border-radius:8px; margin-bottom:20px;';
        divFb.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                <h3 style="margin:0; color:#d35400;">🔥 Synchronisation Cloud Temps Réel (Firebase - Sans expiration)</h3>
                <button type="button" class="btn-action" onclick="chargerDepuisFirebase(true)" style="background:#e67e22;">🔄 Forcer la lecture Cloud</button>
            </div>
            <p style="font-size:13px; color:#555; margin-top:0;">Synchronisation instantanée entre tous vos appareils sans jamais expirer. Collez l'URL de votre <em>Realtime Database</em> Firebase (et optionnellement vos identifiants Email/Mot de passe Firebase Auth) :</p>
            <div class="form-row">
                <input type="text" id="fbDbUrl" placeholder="URL Firebase (ex: https://mon-ecole-default-rtdb.europe-west1.firebasedatabase.app)" value="${escHTML(firebaseConfig.dbUrl || '')}" style="flex:2; min-width:240px;">
                <input type="text" id="fbApiKey" placeholder="Clé API Web Firebase (Optionnel)" value="${escHTML(firebaseConfig.apiKey || '')}" style="flex:1; min-width:160px;">
            </div>
            <div class="form-row">
                <input type="email" id="fbEmail" placeholder="E-mail enseignant (Optionnel)" value="${escHTML(firebaseConfig.email || '')}" style="flex:1;">
                <input type="password" id="fbPassword" placeholder="Mot de passe (Optionnel)" style="flex:1;">
                <button type="button" class="btn-action" onclick="connecterFirebase()" style="background:#d35400;">🔥 Activer la synchro Cloud</button>
                <button type="button" onclick="deconnecterFirebase()" style="background:#95a5a6; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Déconnecter</button>
            </div>
            <span id="statutFirebase" style="font-weight:bold; font-size:13px; color:${firebaseConfig.dbUrl ? '#27ae60' : '#7f8c8d'};">${firebaseConfig.dbUrl ? '🔥 Cloud configuré' : 'Non connecté.'}</span>
        `;
        pageSavePanel.insertBefore(divFb, pageSavePanel.children[1]);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    initialiserAmeliorationsUI();
    appliquerThemeVisuel(localStorage.getItem(KEY_THEME) || 'pastel');
    eliminerDoublonsHistoriques(); majListeTypesSelect(); initialiserSelectsFormulaire(); trierBaseDonnees(); majListeEleves(); afficherBase(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherChoixEtiquettes(); majSelectCouleursRapides(); tenterConnexionAuto(); calculTailleStockage();
});
