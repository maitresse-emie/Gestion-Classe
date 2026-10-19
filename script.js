// ==========================================
// 1. SETUP, CONSTANTES ET COULEURS MATIÈRES
// ==========================================
function escJS(str) { return (str || "").toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function escHTML(str) { return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

function ouvrirModal(id) { let m = document.getElementById(id); if (m) m.style.display = 'flex'; }
function fermerModal(id) { let m = document.getElementById(id); if (m) m.style.display = 'none'; }

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
let modeSaisieMultipleActif = false;

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
            imagesParType[k].isTablette = (k.toLowerCase() === 'anton' || k.toLowerCase() === 'scratch');
        }
    });
}

let baseDonnees = JSON.parse(localStorage.getItem(KEY_ATELIERS));
if (!baseDonnees || !Array.isArray(baseDonnees)) baseDonnees = [];

let eleves = JSON.parse(localStorage.getItem(KEY_ELEVES));
if (!eleves || typeof eleves !== 'object') eleves = {};

function getCouleurMatiereBandeau(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("vocabulaire") || m.includes("ecriture") || m.includes("phonologie")) return { bg: "#1b4f72", text: "#ffffff", border: "#154360" };
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure") || m.includes("probleme")) return { bg: "#c0392b", text: "#ffffff", border: "#922b21" };
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie") || m.includes("plastique")) return { bg: "#795548", text: "#ffffff", border: "#5d4037" };
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite") || m.includes("natation")) return { bg: "#e67e22", text: "#ffffff", border: "#d35400" };
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) return { bg: "#5dade2", text: "#ffffff", border: "#2e86c1" };
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) return { bg: "#27ae60", text: "#ffffff", border: "#1e8449" };
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol") || m.includes("lv")) return { bg: "#e84393", text: "#ffffff", border: "#c2185b" };
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) return { bg: "#8e44ad", text: "#ffffff", border: "#6c3483" };
    return { bg: "#34495e", text: "#ffffff", border: "#2c3e50" };
}

function getInfosActivitePourEleve(act, eleve) {
    let useJaune = Boolean(eleve && eleve.fichierJaune && act && act.varianteJaune && act.varianteJaune.trim() !== "");
    let detailPage = useJaune ? act.varianteJaune.trim() : (act.pageManuel ? act.pageManuel.trim() : "");
    let badgeLivre = useJaune
        ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;">📒 ${escHTML(detailPage)}</span>`
        : (detailPage ? `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>` : "");
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
    e.suivi = { ...(s.suivi || {}) };
    e.dateDebutISO = s.dateDebutISO || "";
    e.dateDebut = s.dateDebut || "";
    e.dateFin = s.dateFin || "";
}

Object.values(eleves).forEach(e => assurerStructureSemaines(e));
localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));

function sauvegarderEleves() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
    declencherAutoSaveFirebase();
}
function sauvegarderBase() {
    localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees));
    declencherAutoSaveFirebase();
}
function sauvegarderProgrammations() {
    localStorage.setItem(KEY_PROG, JSON.stringify(programmations));
    declencherAutoSaveFirebase();
}

// ==========================================
// 2. RESTAURATION UNIVERSELLE JSON & FIREBASE
// ==========================================
function parseSiString(val) {
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
}

function importerDonneesUniversel(rawData) {
    if (!rawData) { showToast("Aucune donnée trouvée.", "error"); return false; }
    let data = parseSiString(rawData);
    if (data.classe_data && typeof data.classe_data === 'object') data = data.classe_data;

    let nouvBase = parseSiString(data.base || data.ateliers || data.baseDonnees || data[KEY_ATELIERS] || (Array.isArray(data) ? data : null));
    let nouvEleves = parseSiString(data.eleves || data[KEY_ELEVES] || null);
    let nouvImages = parseSiString(data.images || data.imagesParType || data[KEY_IMAGES]);
    let nouvProg = parseSiString(data.programmations || data[KEY_PROG]);
    let nouvArchives = parseSiString(data.archives || data.dashboardArchives || data[KEY_ARCHIVES_TODO]);

    if (!Array.isArray(nouvBase) && (!nouvEleves || typeof nouvEleves !== 'object')) {
        showToast("⚠️ Format non reconnu : ni ateliers ni élèves trouvés.", "error");
        return false;
    }

    if (Array.isArray(nouvBase)) { baseDonnees = nouvBase; localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees)); }
    if (nouvEleves && typeof nouvEleves === 'object') {
        eleves = nouvEleves;
        Object.values(eleves).forEach(el => assurerStructureSemaines(el));
        localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
    }
    if (nouvImages && typeof nouvImages === 'object') { imagesParType = nouvImages; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); }
    if (nouvProg && typeof nouvProg === 'object') { programmations = nouvProg; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
    if (Array.isArray(nouvArchives)) { dashboardArchives = nouvArchives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
    if (data.theme) appliquerThemeVisuel(data.theme);

    rafraichirToutApresImport();
    showToast(`✅ Restauration réussie (${baseDonnees.length} ateliers, ${Object.keys(eleves).length} élèves) !`, "success");
    return true;
}

function rafraichirToutApresImport() {
    eliminerDoublonsHistoriques();
    trierBaseDonnees();
    majListeTypesSelect();
    initialiserSelectsFormulaire();
    majListeEleves();
    initNiveaux();
    initProgFilters();
    afficherProgrammation();
    afficherBase();
    afficherChoixEtiquettes();
    majSelectCouleursRapides();
    calculTailleStockage();
    rafraichirDashboard();
    if (idEleveCourant && eleves[idEleveCourant]) chargerEleve();
}

function restaurerFichierJSON(event) {
    let input = (event && event.target) ? event.target : document.getElementById('inputFichierJson');
    if (!input || !input.files || !input.files[0]) { showToast("Sélectionnez un fichier .json.", "error"); return; }
    let fichier = input.files[0];
    let lecteur = new FileReader();
    lecteur.onload = function(e) {
        try {
            importerDonneesUniversel(JSON.parse(e.target.result));
        } catch (err) {
            showToast("Erreur : ce fichier n'est pas un JSON valide.", "error");
        }
        input.value = "";
    };
    lecteur.readAsText(fichier);
}

function restaurerSauvegarde() {
    let input = document.getElementById('inputFichierJson');
    if (input && input.files && input.files[0]) restaurerFichierJSON({ target: input });
    else {
        let texte = document.getElementById('textareaJsonSecours');
        if (texte && texte.value.trim() !== "") restaurerDepuisTexteColle();
        else { if (input) input.click(); showToast("Sélectionnez votre fichier JSON.", "success"); }
    }
}
window.restaurerSauvegarde = restaurerSauvegarde;
window.restaurerFichierJSON = restaurerFichierJSON;

function restaurerDepuisTexteColle() {
    let zone = document.getElementById('textareaJsonSecours');
    if (!zone || !zone.value.trim()) { showToast("Collez votre JSON d'abord.", "error"); return; }
    try {
        if (importerDonneesUniversel(JSON.parse(zone.value.trim()))) zone.value = "";
    } catch (err) {
        showToast("Le texte collé n'est pas un JSON valide.", "error");
    }
}

function exporterSauvegardeJSON() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel', exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sauvegarde_GestionClasse_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("💾 Fichier de sauvegarde téléchargé !", "success");
}

function viderCacheApplication() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.unregister(); });
    if ('caches' in window) caches.keys().then(keys => { for (let k of keys) caches.delete(k); });
    showToast("🧹 Cache purgé ! Rechargement...", "success");
    setTimeout(() => location.reload(true), 800);
}

let timerFirebaseSave;
const URL_FIREBASE_FIXE = "https://gestionclasse-cc401-default-rtdb.europe-west1.firebasedatabase.app";

async function sauvegarderVersFirebase(forcerManuellement = false) {
    if (!forcerManuellement && baseDonnees.length === 0 && Object.keys(eleves).length === 0) return;
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, theme: localStorage.getItem(KEY_THEME) || 'pastel', updatedAt: new Date().toISOString() };
    try {
        let res = await fetch(`${URL_FIREBASE_FIXE}/classe_data.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let statut = document.getElementById('statutFirebase');
        if (statut) { statut.innerText = `🔥 Synchro Cloud OK (${new Date().toLocaleTimeString()} — ${baseDonnees.length} ateliers, ${Object.keys(eleves).length} élèves)`; statut.style.color = "#27ae60"; }
        if (forcerManuellement) showToast("⬆️ Données envoyées sur Firebase !", "success");
    } catch (e) {
        if (forcerManuellement) showToast("Erreur Firebase : " + e.message, "error");
    }
}

async function chargerDepuisFirebase(forcer = false) {
    let statut = document.getElementById('statutFirebase');
    if (statut) { statut.innerText = "⏳ Recherche des données sur Firebase..."; statut.style.color = "#f39c12"; }
    try {
        let res = await fetch(`${URL_FIREBASE_FIXE}/classe_data.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        let nbBaseCloud = (data && Array.isArray(data.base)) ? data.base.length : 0;
        let nbElevesCloud = (data && data.eleves) ? Object.keys(data.eleves).length : 0;

        if (data && (nbBaseCloud > 0 || nbElevesCloud > 0)) {
            let localEstVide = (baseDonnees.length === 0 && Object.keys(eleves).length === 0);
            if (forcer || localEstVide || confirm(`Cloud Firebase trouvé (${nbBaseCloud} ateliers, ${nbElevesCloud} élèves). Charger ces données ?`)) {
                importerDonneesUniversel(data);
            }
            if (statut) { statut.innerText = `🔥 Cloud Firebase connecté (${nbBaseCloud} ateliers, ${nbElevesCloud} élèves)`; statut.style.color = "#27ae60"; }
        } else {
            if (statut) { statut.innerText = "ℹ️ Cloud vide ou prêt. Vos données locales sont conservées."; statut.style.color = "#2980b9"; }
            if (baseDonnees.length > 0 || Object.keys(eleves).length > 0) sauvegarderVersFirebase(false);
        }
    } catch (e) {
        if (statut) { statut.innerText = "⚠️ Erreur de connexion Firebase : " + e.message; statut.style.color = "#e74c3c"; }
    }
}

async function inspecterToutesBranchesFirebase() {
    try {
        let res = await fetch(`${URL_FIREBASE_FIXE}/.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let rootData = await res.json();
        if (!rootData) { showToast("La base Firebase est vide.", "error"); return; }
        if (importerDonneesUniversel(rootData)) return;
        for (let cle of Object.keys(rootData)) {
            if (rootData[cle] && typeof rootData[cle] === 'object' && importerDonneesUniversel(rootData[cle])) return;
        }
        showToast("Aucune sauvegarde exploitable trouvée.", "error");
    } catch (e) { showToast("Erreur : " + e.message, "error"); }
}

function declencherAutoSaveFirebase() {
    clearTimeout(timerFirebaseSave);
    timerFirebaseSave = setTimeout(() => sauvegarderVersFirebase(false), 1800);
}
function tenterConnexionAutoFirebase() { chargerDepuisFirebase(false); }

// ==========================================
// 3. UTILITAIRES, TRI & THÈMES VISUELS
// ==========================================
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
            e.historique.forEach(h => { if (h && h.idActivite) uniqueMap.set(h.idActivite, h); });
            e.historique = Array.from(uniqueMap.values());
        }
    });
}

function getNiveauxCochesFormulaire(classe = '.cb-niveau-form') {
    let res = [];
    document.querySelectorAll(classe + ':checked').forEach(cb => res.push(cb.value));
    return res;
}

function majSelectCouleursRapides(valeurForcee) {
    const select = document.getElementById('selectCouleurRapide'); if (!select) return;
    select.innerHTML = '<option value="">-- Couleur auto par matière/niveau --</option><option value="#ffe599">🟡 Jaune</option><option value="#f6b26b">🟠 Orange</option><option value="#ea9999">🔴 Rouge</option><option value="#d5a6bd">🟣 Violet</option><option value="#b6d7a8">🟢 Vert</option><option value="#9fc5e8">🔵 Bleu</option><option value="#ffffff">⚪ Blanc</option>';
    if (valeurForcee) select.value = valeurForcee;
}

function majListeTypesSelect() {
    const selectType = document.getElementById('selectTypeRessource');
    const selectTypeEtiq = document.getElementById('selectTypeEtiquettes');
    let html = '<option value="">-- Type --</option>';
    let htmlEtiq = '<option value="Tous">Tous les supports</option>';
    if (imagesParType) {
        Object.keys(imagesParType).forEach(t => {
            html += `<option value="${escHTML(t)}">${escHTML(t)}</option>`;
            htmlEtiq += `<option value="${escHTML(t)}">${escHTML(t)}</option>`;
        });
    }
    if (selectType) selectType.innerHTML = html;
    if (selectTypeEtiq) selectTypeEtiq.innerHTML = htmlEtiq;
}

let idEleveCourant = null, idEleveImpressionCourant = null;
let filtreCourantDB = 'Tous', filtreCourantMatiere = 'Toutes', filtreCourantTypeDB = 'Tous';
let idEnCoursEdition = null;

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
    const container = document.getElementById('toast-container'); if (!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerText = message;
    container.appendChild(toast); setTimeout(() => toast.remove(), 3200);
}

window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnScrollTop'); if (!btn) return;
    btn.style.display = (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) ? "block" : "none";
});

function formaterLienImage(url) {
    if (!url) return ""; url = url.trim();
    let matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/), matchOpenId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    let fileId = matchFileD ? matchFileD[1] : (matchOpenId ? matchOpenId[1] : null);
    return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : url;
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
    let texteSto = document.getElementById('texteStockage'); if (texteSto) texteSto.innerText = `${megaBytes} Mo utilisés sur environ 5.00 Mo (${baseDonnees.length} ateliers, ${Object.keys(eleves).length} élèves en mémoire)`;
    let jauge = document.getElementById('jaugeStockageFill');
    if (jauge) { jauge.style.width = pct + "%"; jauge.style.backgroundColor = pct > 80 ? "#e74c3c" : (pct > 50 ? "#f39c12" : "#27ae60"); }
}

// ==========================================
// 4. ONGLET 1 : PLAN & SUIVI ÉLÈVES (+ FILE D'ATTENTE & ÉVALS)
// ==========================================
function toggleFichierJauneEleve(isChecked) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    eleves[idEleveCourant].fichierJaune = Boolean(isChecked);
    sauvegarderEleves(); majListeEleves(); afficherPlanHebdo(); afficherRessourcesDisponibles();
    showToast(isChecked ? "📒 Mode Fichier Jaune activé !" : "📘 Mode Manuel Standard activé !");
}

function majListeEleves() {
    const select = document.getElementById('selectEleveProfile'), selectImp = document.getElementById('selectEleveImpression'), selectBilan = document.getElementById('selectEleveBilan');
    let optHtml = '<option value="">-- Sélectionner un élève --</option>';
    let optImp = '<option value="TOUS_ELEVES">📚 TOUS les élèves de la classe</option><option value="NIVEAU_CP">📘 Groupe CP</option><option value="NIVEAU_CE1">📘 Groupe CE1</option><option value="NIVEAU_CE2">📘 Groupe CE2</option><option value="NIVEAU_CM1">📘 Groupe CM1</option><option value="NIVEAU_CM2">📘 Groupe CM2</option>';
    let optBilan = '<option value="">-- Choisir un élève --</option>';

    getElevesTries().forEach(e => {
        let tagJaune = e.fichierJaune ? " 📒" : "";
        let labelNiv = `[${e.niveau || "CP"}] ${e.nom}${tagJaune}`;
        optHtml += `<option value="${e.id}">${escHTML(labelNiv)}</option>`;
        optImp += `<option value="${e.id}">${escHTML(labelNiv)}</option>`;
        optBilan += `<option value="${e.id}">${escHTML(labelNiv)}</option>`;
    });
    if (select) select.innerHTML = optHtml;
    if (selectImp) selectImp.innerHTML = optImp;
    if (selectBilan) selectBilan.innerHTML = optBilan;

    let btnEdit = document.getElementById('btnEditEleve'), btnSuppr = document.getElementById('btnSupprEleve');
    if (idEleveCourant && eleves[idEleveCourant]) {
        if (select) select.value = idEleveCourant;
        if (btnEdit) btnEdit.style.display = "inline-block";
        if (btnSuppr) btnSuppr.style.display = "inline-block";
    } else {
        if (btnEdit) btnEdit.style.display = "none";
        if (btnSuppr) btnSuppr.style.display = "none";
    }
    if (idEleveCourant && !idEleveImpressionCourant) idEleveImpressionCourant = idEleveCourant;
    if (idEleveImpressionCourant) {
        if (selectImp) selectImp.value = idEleveImpressionCourant;
        if (selectBilan && eleves[idEleveImpressionCourant]) selectBilan.value = idEleveImpressionCourant;
    }
}

function modifierMaxAteliersEleve() {
    if (!idEleveCourant) return;
    let val = Math.min(25, Math.max(1, parseInt(document.getElementById('inputMaxAteliersEleve').value) || 15));
    eleves[idEleveCourant].maxAteliers = val; sauvegarderEleves();
    let maxAff = document.getElementById('maxAteliersAffiche'); if (maxAff) maxAff.innerText = val;
}
function modifierMaxTablettesEleve() {
    if (!idEleveCourant) return;
    let val = Math.min(10, Math.max(0, parseInt(document.getElementById('inputMaxTablettesEleve').value) || 0));
    eleves[idEleveCourant].maxTablettes = val; sauvegarderEleves();
    if (idEleveCourant) afficherPlanHebdo();
}

function creerEleve() {
    const nomInput = document.getElementById('nouvelEleveNom'), nivSelect = document.getElementById('nouvelEleveNiveau'), cbJauneNew = document.getElementById('nouvelEleveFichierJaune');
    if (!nomInput) return;
    const nom = nomInput.value.trim(); if (!nom) { showToast("Indiquez le prénom de l'élève.", "error"); return; }
    const niveau = nivSelect ? nivSelect.value : "CP"; const id = 'eleve_' + Date.now();
    eleves[id] = { id: id, nom: nom, niveau: niveau, fichierJaune: Boolean(cbJauneNew && cbJauneNew.checked), planHebdo: [], enAttente: [], historique: [], masquees: [], priorites: [], maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {}, joursAssignes: {}, dateDebutISO: "", dateDebut: "", dateFin: "" };
    assurerStructureSemaines(eleves[id]); sauvegarderEleves();
    nomInput.value = ''; if (cbJauneNew) cbJauneNew.checked = false;
    majListeInstantaneeEleve(id); rafraichirDashboard();
    showToast(`Élève ${nom} (${niveau}) ajouté !`, "success");
}

function majListeInstantaneeEleve(newId) { majListeEleves(); let sel = document.getElementById('selectEleveProfile'); if (sel) sel.value = newId; chargerEleve(); }

function ouvrirModalEditionEleve() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return; let e = eleves[idEleveCourant];
    document.getElementById('editEleveNomInput').value = e.nom;
    document.getElementById('editEleveNiveauSelect').value = e.niveau || "CP";
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) cbEditJaune.checked = Boolean(e.fichierJaune);
    ouvrirModal('modalEditEleve');
}

function validerEditionEleve() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let nouveauNom = document.getElementById('editEleveNomInput').value.trim(), nouveauNiveau = document.getElementById('editEleveNiveauSelect').value;
    if (!nouveauNom) { showToast("Le prénom ne peut pas être vide.", "error"); return; }
    eleves[idEleveCourant].nom = nouveauNom; eleves[idEleveCourant].niveau = nouveauNiveau;
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) eleves[idEleveCourant].fichierJaune = cbEditJaune.checked;
    sauvegarderEleves(); fermerModal('modalEditEleve'); majListeEleves(); chargerEleve(); rafraichirDashboard(); showToast("Élève mis à jour !", "success");
}

function supprimerEleve() {
    if (!idEleveCourant) return;
    if (confirm("Supprimer définitivement cet élève et son historique ?")) {
        delete eleves[idEleveCourant]; idEleveCourant = null; idEleveImpressionCourant = null;
        sauvegarderEleves(); majListeEleves(); chargerEleve(); rafraichirDashboard();
    }
}

function postEditGlobal() {
    trierBaseDonnees();
    sauvegarderBase();
    initialiserSelectsFormulaire();
    initNiveaux();
    initProgFilters();
    afficherProgrammation();
    afficherBase();
}

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
    afficherRessourcesDisponibles(); rafraichirDashboard();
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
    afficherRessourcesDisponibles();
    showToast(`Semaine ${e.semaines.length} créée !`, "success");
}

function supprimerSemaineActive() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant]; if (e.semaines.length <= 1) return;
    if (confirm(`Supprimer la Semaine ${e.semaineIndex + 1} préparée pour ${e.nom} ?`)) {
        e.semaines.splice(e.semaineIndex, 1);
        let nouvIdx = Math.max(0, e.semaineIndex - 1), s = e.semaines[nouvIdx];
        e.semaineIndex = nouvIdx; e.planHebdo = [...(s.planHebdo || [])]; e.priorites = [...(s.priorites || [])]; e.joursAssignes = { ...(s.joursAssignes || {}) }; e.valides = { ...(s.valides || {}) }; e.suivi = { ...(s.suivi || {}) }; e.dateDebutISO = s.dateDebutISO || ""; e.dateDebut = s.dateDebut || ""; e.dateFin = s.dateFin || "";
        sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo(); afficherRessourcesDisponibles(); rafraichirDashboard(); showToast("Semaine supprimée.", "success");
    }
}

function chargerEleve() {
    const sel = document.getElementById('selectEleveProfile'); if (!sel) return; idEleveCourant = sel.value;
    const zoneTravail = document.getElementById('zoneTravail'), message = document.getElementById('messageSelectEleve'), btnEdit = document.getElementById('btnEditEleve'), btnSuppr = document.getElementById('btnSupprEleve');
    if (!idEleveCourant || !eleves[idEleveCourant]) {
        if (zoneTravail) zoneTravail.style.display = 'none';
        if (message) message.style.display = 'block';
        if (btnEdit) btnEdit.style.display = 'none';
        if (btnSuppr) btnSuppr.style.display = 'none';
        return;
    }
    if (zoneTravail) zoneTravail.style.display = 'block';
    if (message) message.style.display = 'none';
    if (btnEdit) btnEdit.style.display = 'inline-block';
    if (btnSuppr) btnSuppr.style.display = 'inline-block';
    let e = eleves[idEleveCourant]; assurerStructureSemaines(e);
    document.querySelectorAll('.nomEleveAffiche').forEach(el => el.innerText = `${e.nom} (${e.niveau})`);
    let inputMax = document.getElementById('inputMaxAteliersEleve'), inputMaxTab = document.getElementById('inputMaxTablettesEleve'), maxAff = document.getElementById('maxAteliersAffiche'), cbJaune = document.getElementById('cbFichierJauneEleve');
    if (inputMax) inputMax.value = e.maxAteliers || 15;
    if (inputMaxTab) inputMaxTab.value = e.maxTablettes ?? 2;
    if (maxAff) maxAff.innerText = e.maxAteliers || 15;
    if (cbJaune) cbJaune.checked = Boolean(e.fichierJaune);
    initialiserSelectsFormulaire();
    majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles();
}

function initialiserSelectsFormulaire() {
    const selMat = document.getElementById('selectMatiere');
    let matieres = [...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let sequences = [...new Set(baseDonnees.map(b => (b.sequence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let competences = [...new Set(baseDonnees.map(b => (b.competence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

    let dlMat = document.getElementById('listeMatieresConnues');
    if (dlMat) dlMat.innerHTML = matieres.map(m => `<option value="${escHTML(m)}">`).join('');
    let dlSeq = document.getElementById('listeSequencesConnues');
    if (dlSeq) dlSeq.innerHTML = sequences.map(s => `<option value="${escHTML(s)}">`).join('');
    let dlComp = document.getElementById('listeCompetencesConnues');
    if (dlComp) dlComp.innerHTML = competences.map(c => `<option value="${escHTML(c)}">`).join('');

    if (!selMat) return;
    let valActuelle = selMat.value;
    let html = '<option value="">-- 1. Choisir une matière (ou Toutes) --</option><option value="TOUTES_MATIERES">📚 Toutes les matières</option>';
    matieres.forEach(m => { html += `<option value="${escHTML(m)}">${escHTML(m)}</option>`; });
    selMat.innerHTML = html;
    if (valActuelle) selMat.value = valActuelle;
}

function changementMatiereSelection() {
    const selMat = document.getElementById('selectMatiere'), selSeq = document.getElementById('selectSequence');
    if (!selMat || !selSeq) return;
    let mat = selMat.value;
    let sequences = [...new Set(baseDonnees.filter(b => !mat || mat === 'TOUTES_MATIERES' || (b.matiere || "").trim() === mat).map(b => (b.sequence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let html = '<option value="TOUTES_SEQUENCES">-- Toutes les séquences --</option>';
    sequences.forEach(s => { html += `<option value="${escHTML(s)}">${escHTML(s)}</option>`; });
    selSeq.innerHTML = html;
    afficherRessourcesDisponibles();
}

function filtrerEtoilesDispo(nb) {
    filtreEtoilesDispo = nb;
    [0, 1, 2, 3].forEach(n => {
        let btn = document.getElementById('btnEtoile' + n);
        if (btn) btn.classList.toggle('active', n === nb);
    });
    afficherRessourcesDisponibles();
}

function afficherRessourcesDisponibles() {
    const tbody = document.getElementById('tableRessourcesDispo');
    if (!tbody || !idEleveCourant || !eleves[idEleveCourant]) return;
    const eleve = eleves[idEleveCourant];
    const mat = document.getElementById('selectMatiere') ? document.getElementById('selectMatiere').value : "";
    const seq = document.getElementById('selectSequence') ? document.getElementById('selectSequence').value : "";
    const per = document.getElementById('selectPeriodeDispo') ? document.getElementById('selectPeriodeDispo').value : "Toutes";

    if (!mat) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7f8c8d;">Choisissez une matière ci-dessus pour voir les activités correspondantes.</td></tr>';
        return;
    }

    let nivEleve = (eleve.niveau || "CP").toUpperCase();
    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        let nivAct = (a.niveau || "").toUpperCase();
        if (nivAct && !nivAct.includes(nivEleve) && nivAct !== "TOUS") return false;
        if (mat !== 'TOUTES_MATIERES' && (a.matiere || "").trim() !== mat) return false;
        if (seq && seq !== 'TOUTES_SEQUENCES' && (a.sequence || "").trim() !== seq) return false;
        let cleCompProg = `${a.matiere}||${a.sequence}||${a.competence}`;
        let perAct = programmations[a.id] || programmations[cleCompProg] || a.periode || "";
        if (per !== 'Toutes' && !perAct.includes(per)) return false;
        if (filtreEtoilesDispo > 0 && (parseInt(a.difficulte) || 0) !== filtreEtoilesDispo) return false;
        if (eleve.planHebdo.includes(a.id) || (eleve.enAttente && eleve.enAttente.includes(a.id))) return false;
        if (eleve.historique.some(h => h.idActivite === a.id)) return false;
        if (eleve.masquees && eleve.masquees.includes(a.id)) return false;
        return true;
    });

    if (liste.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7f8c8d;">Aucune activité disponible avec ces critères pour le niveau ' + escHTML(nivEleve) + '.</td></tr>';
        return;
    }

    let html = '';
    liste.forEach(a => {
        let infos = getInfosActivitePourEleve(a, eleve);
        let coul = getCouleurMatiereBandeau(a.matiere);
        let perAct = programmations[a.id] || a.periode || "-";
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong><br><small style="color:#7f8c8d;">${escHTML(perAct)}</small></td>
            <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${coul.bg}; margin-right:4px;"></span><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infos.badgeLivre} ${a.estEvaluation ? '<span class="badge-eval">🎯 Éval</span>' : ''}</td>
            <td>
                <select id="jour_dispo_${a.id}" style="width:100%; padding:4px; font-size:12px;">
                    <option value="">-- Libre --</option>
                    <option value="Lundi">Lundi</option>
                    <option value="Mardi">Mardi</option>
                    <option value="Jeudi">Jeudi</option>
                    <option value="Vendredi">Vendredi</option>
                </select>
            </td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button type="button" class="btn-action" onclick="ajouterAuPlan('${a.id}')">➕ Plan</button>
                    <button type="button" class="filter-btn" onclick="mettreEnAttente('${a.id}')" title="Mettre en réserve pour la semaine suivante">⏳</button>
                    <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')" title="Marquer comme déjà acquis">✅</button>
                    <button type="button" class="filter-btn" onclick="masquerActivite('${a.id}')" title="Masquer pour cet élève">🙈</button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
function assignerJour(idActivite, jour) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let eleve = eleves[idEleveCourant]; if (!eleve.joursAssignes) eleve.joursAssignes = {};
    if (jour) eleve.joursAssignes[idActivite] = jour; else delete eleve.joursAssignes[idActivite];
    sauvegarderEleves(); afficherPlanHebdo();
}

function definirStatutSuivi(idActivite, statut) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    if (!e.suivi) e.suivi = {};
    if (!statut) delete e.suivi[idActivite];
    else {
        let commActuel = (e.suivi[idActivite] && e.suivi[idActivite].commentaire) ? e.suivi[idActivite].commentaire : "";
        let comm = prompt("Commentaire ou consigne (optionnel) :", commActuel);
        e.suivi[idActivite] = { statut: statut, commentaire: comm || "" };
    }
    sauvegarderEleves(); afficherPlanHebdo(); rafraichirDashboard();
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
        <span style="font-size:11px; font-weight:bold; color:#7f8c8d; width:100%;">Sélection rapide :</span>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'TOUS')">✅ Tous</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', '')">❌ Aucun</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CP')">CP</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE1')">CE1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CE2')">CE2</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM1')">CM1</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'CM2')">CM2</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'JAUNE')">📒 Fichier Jaune</button>
    </div>`;
}

function ouvrirModalDuplication() {
    if (!idEleveCourant || eleves[idEleveCourant].planHebdo.length === 0) { showToast("Le plan actuel est vide.", "error"); return; }
    document.getElementById('nomEleveSourceDupli').innerText = eleves[idEleveCourant].nom;
    let html = genererBarreSelectionNiveauxHtml('cb-dupli-eleve');
    getElevesTries().forEach(e => { if (e.id !== idEleveCourant) html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}</label>`; });
    document.getElementById('listeElevesDupli').innerHTML = html; ouvrirModal('modalDupliquer');
}

function validerDuplication() {
    if (!idEleveCourant) return; const planSource = eleves[idEleveCourant].planHebdo, joursSource = eleves[idEleveCourant].joursAssignes || {};
    let checks = document.querySelectorAll('.cb-dupli-eleve:checked');
    if (checks.length === 0) { showToast("Sélectionnez au moins un élève.", "error"); return; } let msgCount = 0;
    checks.forEach(cb => {
        const target = eleves[cb.value]; assurerStructureSemaines(target); if (!target.joursAssignes) target.joursAssignes = {};
        planSource.forEach(idAct => {
            if (!target.planHebdo.includes(idAct) && !target.historique.some(h => h.idActivite === idAct) && target.planHebdo.length < (target.maxAteliers || 15)) {
                target.planHebdo.push(idAct); if (joursSource[idAct]) target.joursAssignes[idAct] = joursSource[idAct]; msgCount++;
            }
        });
        syncEleveVersSemaineActive(target);
    });
    sauvegarderEleves(); fermerModal('modalDupliquer'); rafraichirDashboard(); showToast(`${msgCount} activités copiées !`, "success");
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
        html += `<label style="cursor:pointer; font-size:14px; ${color}"><input type="checkbox" class="cb-assign-eleve" value="${e.id}" ${disabled}> [${e.niveau}] ${escHTML(e.nom)}</label>`;
    });
    document.getElementById('listeElevesAssign').innerHTML = html; ouvrirModal('modalAssigner');
}

function validerAssignationMultiple() {
    if (!activiteAssignationEnCours) return; let checks = document.querySelectorAll('.cb-assign-eleve:checked:not(:disabled)');
    if (checks.length === 0) { fermerModal('modalAssigner'); return; }
    let selJour = document.getElementById('selectJourAssignMultiple'), jourChoisi = selJour ? selJour.value : "", count = 0;
    checks.forEach(cb => {
        let e = eleves[cb.value]; assurerStructureSemaines(e);
        if (e.planHebdo.length < (e.maxAteliers || 15)) {
            e.planHebdo.push(activiteAssignationEnCours);
            if (jourChoisi) { if (!e.joursAssignes) e.joursAssignes = {}; e.joursAssignes[activiteAssignationEnCours] = jourChoisi; }
            syncEleveVersSemaineActive(e); count++;
        } else {
            if (!e.enAttente) e.enAttente = [];
            if (!e.enAttente.includes(activiteAssignationEnCours)) e.enAttente.push(activiteAssignationEnCours);
            count++;
        }
    });
    sauvegarderEleves(); fermerModal('modalAssigner'); rafraichirDashboard(); if (idEleveCourant) afficherPlanHebdo(); showToast(`Assigné à ${count} élève(s).`, "success");
}

function cloreSemainePourUnEleve(eleve) {
    assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
    let aTransferer = [...(eleve.enAttente || [])];
    (eleve.planHebdo || []).forEach(idAct => {
        let estVal = eleve.valides && eleve.valides[idAct];
        if (!estVal || (eleve.suivi && eleve.suivi[idAct] && (eleve.suivi[idAct].statut === 'a_revoir' || eleve.suivi[idAct].statut === 'a_refaire'))) {
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
    dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_'));
}

function commencerNouvelleSemaine() {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if (confirm(`Clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom} et reporter les ateliers non validés ?`)) {
        cloreSemainePourUnEleve(eleve);
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Semaine suivante activée !", "success");
    }
}

function cloturerSemaineClasseGlobale() {
    if (confirm("🏁 Clôturer la semaine en cours pour TOUS les élèves de la classe et reporter leurs activités non terminées ?")) {
        Object.values(eleves).forEach(e => cloreSemainePourUnEleve(e));
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); if (idEleveCourant) chargerEleve(); rafraichirDashboard();
        showToast("🏁 Semaine clôturée pour toute la classe !", "success");
    }
}

function basculerPriorite(idActivite) {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if (!eleve.priorites) eleve.priorites = [];
    let idx = eleve.priorites.indexOf(idActivite); if (idx > -1) eleve.priorites.splice(idx, 1); else eleve.priorites.push(idActivite);
    sauvegarderEleves(); afficherPlanHebdo();
}

function cocherToutPlan(source) { document.querySelectorAll('.cb-plan-valider:not(:disabled)').forEach(cb => cb.checked = source.checked); }

function validerSelectionPlan() {
    if (!idEleveCourant) return; const checks = document.querySelectorAll('.cb-plan-valider:checked:not(:disabled)');
    if (checks.length === 0) { showToast("Cochez au moins une activité.", "error"); return; }
    checks.forEach(cb => marquerCommeValideSansRafraichir(cb.value, eleves[idEleveCourant]));
    sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard(); showToast("Validé !", "success");
}

function estActiviteTablette(act) {
    if (!act || !act.typeRes) return false; let tName = act.typeRes.trim().toLowerCase();
    for (let k in imagesParType) { if (k.trim().toLowerCase() === tName) return Boolean(imagesParType[k] && imagesParType[k].isTablette); } return false;
}

// Restaure la validation automatique de toute la compétence si c'est une Évaluation
function marquerCommeValideSansRafraichir(idActivite, eleve) {
    const act = baseDonnees.find(b => b.id === idActivite); if (!act) return; const dateValid = new Date().toLocaleDateString('fr-FR');
    if (!eleve.valides) eleve.valides = {}; eleve.valides[idActivite] = dateValid;
    if (act.estEvaluation) {
        let niveauxAct = (act.niveau || "").toUpperCase().split(/[,/]+/).map(x => x.trim());
        baseDonnees.filter(b => (b.matiere || "").trim().toLowerCase() === (act.matiere || "").trim().toLowerCase() && (b.competence || "").trim().toLowerCase() === (act.competence || "").trim().toLowerCase() && niveauxAct.some(n => (b.niveau || "").toUpperCase().includes(n))).forEach(b => {
            if (!eleve.historique.some(h => h.idActivite === b.id)) eleve.historique.push({ idActivite: b.id, date: dateValid });
            eleve.valides[b.id] = dateValid; if (eleve.suivi && eleve.suivi[b.id]) delete eleve.suivi[b.id];
        });
    } else {
        if (!eleve.historique.some(h => h.idActivite === idActivite)) eleve.historique.push({ idActivite: idActivite, date: dateValid });
        if (eleve.suivi && eleve.suivi[idActivite]) delete eleve.suivi[idActivite];
    }
}

function annulerValidationPlan(idActivite) { if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if (eleve.valides && eleve.valides[idActivite]) { delete eleve.valides[idActivite]; eleve.historique = eleve.historique.filter(h => h.idActivite !== idActivite); sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); rafraichirDashboard(); } }
function validerDirectement(idActivite) { if (!idEleveCourant) return; marquerCommeValideSansRafraichir(idActivite, eleves[idEleveCourant]); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Validé !", "success"); }
function masquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant], max = eleve.maxAteliers || 15;
    if (eleve.planHebdo.length >= max) {
        if (!eleve.enAttente) eleve.enAttente = [];
        if (!eleve.enAttente.includes(idActivite)) eleve.enAttente.push(idActivite);
        sauvegarderEleves(); afficherRessourcesDisponibles(); afficherPlanHebdo();
        showToast(`⚠️ Quota (${max}) atteint : placé en file d'attente pour la semaine suivante !`, "error");
        return;
    }
    const actAjoutee = baseDonnees.find(b => b.id === idActivite);
    if (actAjoutee && estActiviteTablette(actAjoutee)) {
        let maxTab = eleve.maxTablettes ?? 2, nbTabActuels = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        if (nbTabActuels >= maxTab) { showToast(`🚫 Quota tablettes (${maxTab}) atteint.`, "error"); return; }
    }
    let selectJourElem = document.getElementById('jour_dispo_' + idActivite), jourChoisi = selectJourElem ? selectJourElem.value : "";
    eleve.planHebdo.push(idActivite); if (!eleve.joursAssignes) eleve.joursAssignes = {}; if (jourChoisi) eleve.joursAssignes[idActivite] = jourChoisi;
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard();
    showToast(jourChoisi ? `Ajouté (${jourChoisi})` : "Ajouté au plan !");
}

function mettreEnAttente(idActivite) {
    if (!idEleveCourant) return;
    let eleve = eleves[idEleveCourant]; if (!eleve.enAttente) eleve.enAttente = [];
    if (!eleve.enAttente.includes(idActivite)) eleve.enAttente.push(idActivite);
    sauvegarderEleves(); afficherRessourcesDisponibles(); afficherPlanHebdo();
    showToast("⏳ Placé en attente pour la semaine suivante.");
}

function annulerAttente(idActivite, basculerDansPlan = false) {
    if (!idEleveCourant) return;
    let eleve = eleves[idEleveCourant];
    eleve.enAttente = (eleve.enAttente || []).filter(id => id !== idActivite);
    if (basculerDansPlan) {
        eleve.planHebdo.push(idActivite);
    }
    sauvegarderEleves(); afficherPlanHebdo(); afficherRessourcesDisponibles();
}

function retirerDuPlan(idActivite) {
    let e = eleves[idEleveCourant], idx = e.planHebdo.indexOf(idActivite);
    if (idx > -1) e.planHebdo.splice(idx, 1);
    else { idx = (e.enAttente || []).indexOf(idActivite); if (idx > -1) e.enAttente.splice(idx, 1); }
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite];
    if (e.valides && e.valides[idActivite]) delete e.valides[idActivite];
    if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré");
}

function desarchiverActivite(idActivite) {
    if (!idEleveCourant) return;
    const eleve = eleves[idEleveCourant], index = eleve.historique.findIndex(h => h.idActivite === idActivite);
    if (index > -1) { eleve.historique.splice(index, 1); if (eleve.valides) delete eleve.valides[idActivite]; sauvegarderEleves(); afficherHistorique(); afficherPlanHebdo(); afficherRessourcesDisponibles(); rafraichirDashboard(); }
}

function afficherPlanHebdo() {
    const eleve = eleves[idEleveCourant], tbodyApercu = document.getElementById('tableApercuPlan'); if (!tbodyApercu || !eleve) return; tbodyApercu.innerHTML = '';
    document.getElementById('compteurAteliersEleve').innerText = eleve.planHebdo.length; document.getElementById('maxAteliersAffiche').innerText = eleve.maxAteliers || 15;
    let nbTabCount = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
    let compteurTabElem = document.getElementById('compteurTablettesEleve'); if (compteurTabElem) compteurTabElem.innerText = `${nbTabCount}/${eleve.maxTablettes ?? 2}`;

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || [], eleve.suivi || {});
    planObjects.forEach((a, index) => {
        const num = index + 1; let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Éval</span>` : ''; let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
        let isPrio = (eleve.priorites && eleve.priorites.includes(a.id)) || statutSuivi === 'a_revoir' || statutSuivi === 'a_refaire';
        let logoDebutLigne = statutSuivi === 'a_revoir' ? `👩‍🏫 ` : (statutSuivi === 'a_refaire' ? `🔄 ` : "");
        let infosL = getInfosActivitePourEleve(a, eleve);

        let suiviHtml = `<div style="margin-top:4px; display:flex; gap:4px; flex-wrap:wrap;">
            <button type="button" class="filter-btn" style="font-size:11px; padding:2px 6px; ${statutSuivi === 'a_revoir' ? 'background:#c0392b; color:#fff;' : ''}" onclick="definirStatutSuivi('${a.id}', '${statutSuivi === 'a_revoir' ? '' : 'a_revoir'}')">👩‍🏫 À revoir</button>
            <button type="button" class="filter-btn" style="font-size:11px; padding:2px 6px; ${statutSuivi === 'a_refaire' ? 'background:#e67e22; color:#fff;' : ''}" onclick="definirStatutSuivi('${a.id}', '${statutSuivi === 'a_refaire' ? '' : 'a_refaire'}')">🔄 À refaire</button>
        </div>`;
        if (eleve.suivi && eleve.suivi[a.id] && eleve.suivi[a.id].commentaire) {
            suiviHtml += `<div style="color:#7f8c8d; font-size:11px; margin-top:2px;">💬 ${escHTML(eleve.suivi[a.id].commentaire)}</div>`;
        }

        let jourActuel = (eleve.joursAssignes && eleve.joursAssignes[a.id]) ? eleve.joursAssignes[a.id] : "";
        let selectJourHtml = `<select onchange="assignerJour('${a.id}', this.value)" style="width:100%; padding:4px; font-size:12px; ${jourActuel ? 'background:#fef5e7; font-weight:bold; color:#d35400;' : ''}"><option value="">-- Libre --</option><option value="Lundi" ${jourActuel === 'Lundi' ? 'selected' : ''}>Lundi</option><option value="Mardi" ${jourActuel === 'Mardi' ? 'selected' : ''}>Mardi</option><option value="Jeudi" ${jourActuel === 'Jeudi' ? 'selected' : ''}>Jeudi</option><option value="Vendredi" ${jourActuel === 'Vendredi' ? 'selected' : ''}>Vendredi</option></select>`;
        let actionHtml = estValide
            ? `<span style="color:#27ae60; font-weight:bold; font-size:12px;">✅ Fini</span><br><button type="button" class="btn-remove" style="width:100%; margin-top:4px;" onclick="annulerValidationPlan('${a.id}')">↩️ Défaire</button>`
            : `<button type="button" class="btn-valid" style="width:100%; margin-bottom:4px;" onclick="validerDirectement('${a.id}')">🏁 Fini</button><button type="button" class="btn-remove" style="width:100%;" onclick="retirerDuPlan('${a.id}')">❌ Retirer</button>`;
        let coulMat = getCouleurMatiereBandeau(a.matiere);

        tbodyApercu.innerHTML += `<tr class="${rowClass}">
            <td style="text-align:center;"><input type="checkbox" class="cb-plan-valider" value="${a.id}" ${estValide ? 'checked disabled' : ''} style="transform: scale(1.3); cursor:pointer;"></td>
            <td style="text-align:center; cursor:pointer; font-size:18px;" onclick="basculerPriorite('${a.id}')" style="${isPrio ? 'color:#f1c40f;' : 'color:#bdc3c7;'}">${isPrio ? '⭐' : '☆'}</td>
            <td class="${jourActuel ? 'col-num num-jour-impose' : 'col-num'}">${logoDebutLigne}${num}</td>
            <td><span style="display:inline-block; padding:2px 8px; border-radius:4px; background:${coulMat.bg}; color:${coulMat.text}; font-weight:bold; font-size:12px; margin-bottom:3px;">${escHTML(a.matiere)}</span><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<strong>'+escHTML(a.lecon)+'</strong> - ' : ''}${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infosL.badgeLivre} ${badge} ${suiviHtml}</td>
            <td style="text-align:center;">${selectJourHtml}</td>
            <td>${actionHtml}</td>
        </tr>`;
    });
    if (eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#7f8c8d; padding:20px;">Plan vide.</td></tr>';

    // Affichage de la file d'attente (enAttente)
    const blocAtt = document.getElementById('blocEnAttenteEleve'), tbodyAtt = document.getElementById('tableEnAttente'), cptAtt = document.getElementById('compteurAttenteEleve');
    if (blocAtt && tbodyAtt) {
        let attList = (eleve.enAttente || []).map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
        if (cptAtt) cptAtt.innerText = attList.length;
        if (attList.length > 0) {
            blocAtt.style.display = 'block';
            tbodyAtt.innerHTML = attList.map(a => `<tr>
                <td><strong>${escHTML(a.matiere)}</strong> — ${escHTML(a.sequence)}</td>
                <td>${escHTML(a.competence)}</td>
                <td><strong>${escHTML(a.ressource)}</strong></td>
                <td>
                    <button type="button" class="btn-action" style="padding:4px 8px;" onclick="annulerAttente('${a.id}', true)">⬆️ Mettre au plan</button>
                    <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="annulerAttente('${a.id}', false)">❌</button>
                </td>
            </tr>`).join('');
        } else {
            blocAtt.style.display = 'none';
        }
    }
}

function afficherHistorique() {
    const eleve = eleves[idEleveCourant], tbodyHist = document.getElementById('tableHistorique'), tbodyMasq = document.getElementById('tableMasquees'); if (!tbodyHist || !tbodyMasq || !eleve) return; tbodyHist.innerHTML = ''; tbodyMasq.innerHTML = '';
    [...eleve.historique].reverse().forEach(hist => { const a = baseDonnees.find(b => b.id === hist.idActivite); if (a) tbodyHist.innerHTML += `<tr><td><strong>${escHTML(hist.date)}</strong></td><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="desarchiverActivite('${a.id}')">↩️</button></td></tr>`; });
    if (eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7f8c8d;">Aucun.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if (a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td>${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="demasquerActivite('${a.id}')">↩️</button></td></tr>`; });
    if (eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Aucune.</td></tr>';
}

// ==========================================
// 5. ONGLET 2 : IMPRESSION FICHES ÉLÈVES (A4/A5, LOGOS & SEMAINES)
// ==========================================
function changementEleveImpression() {
    const sel = document.getElementById('selectEleveImpression');
    const selSem = document.getElementById('selectSemaineImpression');
    const dateInp = document.getElementById('dateImpressionInput');
    if (!sel) return;
    idEleveImpressionCourant = sel.value || 'TOUS_ELEVES';

    if (eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant];
        assurerStructureSemaines(e);
        if (selSem) {
            selSem.innerHTML = e.semaines.map((s, i) => `<option value="${i}">Semaine ${i + 1} ${s.dateDebut ? `(${s.dateDebut})` : ''}</option>`).join('');
            selSem.value = e.semaineIndex || 0;
        }
        if (dateInp) dateInp.value = e.dateDebutISO || "";
    } else {
        if (selSem) selSem.innerHTML = '<option value="0">Semaine active de chaque élève</option>';
    }
    rafraichirFicheImpression();
}

function changerSemaineDepuisImpression(val) {
    if (eleves[idEleveImpressionCourant]) {
        chargerSemaineDepuisIndex(eleves[idEleveImpressionCourant], parseInt(val) || 0);
        sauvegarderEleves();
        rafraichirFicheImpression();
    }
}

function appliquerDateImpression(dateISO) {
    if (!dateISO) return;
    let res = calculerVendrediDepuisISO(dateISO);
    if (eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant];
        e.dateDebutISO = dateISO; e.dateDebut = res.debutFR; e.dateFin = res.finFR;
        syncEleveVersSemaineActive(e);
    } else {
        Object.values(eleves).forEach(e => {
            e.dateDebutISO = dateISO; e.dateDebut = res.debutFR; e.dateFin = res.finFR;
            syncEleveVersSemaineActive(e);
        });
    }
    sauvegarderEleves();
    rafraichirFicheImpression();
}

function genererHtmlFicheEleve(e, format = 'A4') {
    assurerStructureSemaines(e);
    let planObjs = getListeTrie(e.planHebdo, e.priorites || [], e.suivi || {});
    let parMatiere = {};
    planObjs.forEach((act, idx) => {
        let m = act.matiere || "Autres";
        if (!parMatiere[m]) parMatiere[m] = [];
        parMatiere[m].push({ act, num: idx + 1 });
    });

    let html = `<div class="fiche-plan-print ${format === 'A4' ? 'a4-page' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1b4f72; padding-bottom:6px; margin-bottom:8px;">
            <div>
                <h2 style="margin:0; border:none; padding:0; font-size:18px; color:#1b4f72;">Plan de travail — ${escHTML(e.nom)} (${escHTML(e.niveau)})</h2>
                <span style="font-size:12.5px; color:#444; font-weight:bold;">Semaine ${(e.semaineIndex || 0) + 1} ${(e.dateDebut && e.dateFin) ? `du ${e.dateDebut} au ${e.dateFin}` : ''}</span>
            </div>
            <div style="font-size:12px; text-align:right;">
                Bilan : ☀️ ⛅ 🌧️ &nbsp;|&nbsp; Signature : ____________
            </div>
        </div>`;

    Object.keys(parMatiere).forEach(mat => {
        let coul = getCouleurMatiereBandeau(mat);
        html += `<div class="bandeau-matiere-print" style="background:${coul.bg}; color:${coul.text}; border:1px solid ${coul.border};">${escHTML(mat.toUpperCase())}</div>
        <table class="table-classique" style="margin-top:0; margin-bottom:6px;">
            <thead>
                <tr>
                    <th style="width:45px; text-align:center;">N°</th>
                    <th style="width:140px;">Séquence / Leçon</th>
                    <th>Compétence</th>
                    <th>Activité / Support</th>
                    <th style="width:75px; text-align:center;">Jour</th>
                    <th style="width:45px; text-align:center;">Fait</th>
                    <th style="width:65px; text-align:center;">Bilan</th>
                </tr>
            </thead>
            <tbody>`;
        parMatiere[mat].forEach(item => {
            let a = item.act;
            let infos = getInfosActivitePourEleve(a, e);
            let jour = (e.joursAssignes && e.joursAssignes[a.id]) ? e.joursAssignes[a.id] : "";
            let estFait = e.valides && e.valides[a.id];
            let statutSuivi = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
            let iconeSuivi = statutSuivi === 'a_revoir' ? '👩‍🏫 ' : (statutSuivi === 'a_refaire' ? '🔄 ' : '');

            let typeCfg = imagesParType[infos.typeEffectif] || null;
            let cellNumContent = `${iconeSuivi}${item.num}`;
            if (typeCfg && typeCfg.img && typeCfg.remplacerNum) {
                cellNumContent = `<img src="${escHTML(formaterLienImage(typeCfg.img))}" style="width:24px; height:24px; object-fit:contain; vertical-align:middle;">`;
            } else if (typeCfg && typeCfg.img) {
                cellNumContent = `${iconeSuivi}${item.num} <img src="${escHTML(formaterLienImage(typeCfg.img))}" style="width:16px; height:16px; object-fit:contain; vertical-align:middle;">`;
            }

            let bgCell = infos.couleurForcee || calculerCouleurAutomatique(a.matiere, a.niveau, infos.typeEffectif);
            let imgSpec = a.imageSpecifique ? `<img src="${escHTML(formaterLienImage(a.imageSpecifique))}" style="height:22px; object-fit:contain; vertical-align:middle; margin-left:4px;">` : '';

            html += `<tr>
                <td style="text-align:center; font-weight:bold; background:${bgCell};">${cellNumContent}</td>
                <td>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
                <td>${escHTML(a.competence)}</td>
                <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infos.badgeLivre} ${a.estEvaluation ? '<span class="badge-eval">🎯</span>' : ''} ${imgSpec}</td>
                <td style="text-align:center; font-weight:bold;">${escHTML(jour)}</td>
                <td style="text-align:center; font-size:15px;">${estFait ? '☑️' : '⬜'}</td>
                <td style="text-align:center; font-size:11px;">🟢 🟠 🔴</td>
            </tr>`;
        });
        html += `</tbody></table>`;
    });
    html += `</div>`;
    return html;
}

function rafraichirFicheImpression() {
    const sel = document.getElementById('selectEleveImpression');
    const fmt = document.getElementById('selectFormatImpression') ? document.getElementById('selectFormatImpression').value : 'A4';
    const zone = document.getElementById('zoneFichesImpression');
    if (!zone) return;
    let val = sel ? (sel.value || 'TOUS_ELEVES') : 'TOUS_ELEVES';

    let cibles = [];
    if (val === 'TOUS_ELEVES') cibles = getElevesTries();
    else if (val.startsWith('NIVEAU_')) {
        let niv = val.replace('NIVEAU_', '');
        cibles = getElevesTries().filter(e => (e.niveau || 'CP').toUpperCase() === niv);
    } else if (eleves[val]) cibles = [eleves[val]];

    if (cibles.length === 0) {
        zone.innerHTML = `<div class="empty-state"><p>Aucun élève à imprimer.</p></div>`;
        return;
    }

    if (fmt === 'A5') {
        let html = '';
        for (let i = 0; i < cibles.length; i += 2) {
            html += `<div class="conteneur-a5-pair">`;
            html += genererHtmlFicheEleve(cibles[i], 'A5');
            if (cibles[i + 1]) html += genererHtmlFicheEleve(cibles[i + 1], 'A5');
            html += `</div>`;
        }
        zone.innerHTML = html;
    } else {
        zone.innerHTML = cibles.map(e => genererHtmlFicheEleve(e, 'A4')).join('');
    }
}

// ==========================================
// 6. ONGLET 3 : TABLEAU DE BORD COMPLET (BESOINS, TABLETTES & ACTIONS DIRECTES)
// ==========================================
function toggleAfficherArchives() {
    afficherArchivesMode = !afficherArchivesMode;
    let btn = document.getElementById('btnToggleArchivesDash');
    if (btn) btn.innerText = afficherArchivesMode ? "🙈 Masquer les archives" : "👁️ Voir les archives";
    rafraichirDashboard();
}

function archiverItem(cle) {
    if (!dashboardArchives.includes(cle)) dashboardArchives.push(cle);
    localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
    rafraichirDashboard();
}

function restaurerArchive(cle) {
    dashboardArchives = dashboardArchives.filter(k => k !== cle);
    localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
    rafraichirDashboard();
}

function viderArchives() {
    if (confirm("Vider la liste des éléments archivés du Tableau de bord ?")) {
        dashboardArchives = [];
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        rafraichirDashboard();
    }
}

function setSuivi(idEl, idAct, statut) {
    let e = eleves[idEl]; if (!e) return;
    if (!e.suivi) e.suivi = {};
    if (!statut) delete e.suivi[idAct];
    else e.suivi[idAct] = { statut: statut, commentaire: (e.suivi[idAct] && e.suivi[idAct].commentaire) || "" };
    sauvegarderEleves(); rafraichirDashboard();
}

function validerDepuisDashboard(idEl, idAct) {
    let e = eleves[idEl]; if (!e) return;
    marquerCommeValideSansRafraichir(idAct, e);
    sauvegarderEleves(); rafraichirDashboard();
    showToast(`Activité validée pour ${e.nom} !`, "success");
}

function toggleExpandEleveDash(idEl) {
    if (dashboardExpanded.has(idEl)) dashboardExpanded.delete(idEl);
    else dashboardExpanded.add(idEl);
    rafraichirDashboard();
}

function ouvrirEleveDepuisDashboard(idEl) {
    idEleveCourant = idEl;
    let sel = document.getElementById('selectEleveProfile');
    if (sel) sel.value = idEl;
    let navBtns = document.querySelectorAll('.nav-btn');
    changerOnglet('pageSuivi', navBtns[0]);
}

function rafraichirDashboard() {
    const cont = document.getElementById('dashboardContent');
    if (!cont) return;
    const listeEl = getElevesTries();
    if (listeEl.length === 0) {
        cont.innerHTML = `<div class="empty-state"><h3>Aucun élève enregistré.</h3></div>`;
        return;
    }

    let lignesRemediation = '';
    let tachesTablettesMap = {};

    listeEl.forEach(e => {
        assurerStructureSemaines(e);
        (e.planHebdo || []).forEach(idAct => {
            let act = baseDonnees.find(b => b.id === idAct);
            if (!act) return;
            let estVal = e.valides && e.valides[idAct];

            // 1. Remédiations
            let s = e.suivi && e.suivi[idAct] ? e.suivi[idAct] : null;
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire')) {
                let cleRem = `${e.id}_${idAct}`;
                let estArch = dashboardArchives.includes(cleRem);
                if (afficherArchivesMode || !estArch) {
                    let coul = getCouleurMatiereBandeau(act.matiere);
                    lignesRemediation += `<tr style="${estArch ? 'opacity:0.5;' : ''}">
                        <td><strong>[${escHTML(e.niveau)}] ${escHTML(e.nom)}</strong></td>
                        <td><span style="background:${coul.bg}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">${escHTML(act.matiere)}</span> ${escHTML(act.sequence)}</td>
                        <td><strong>${escHTML(act.ressource)}</strong><br><small>${escHTML(act.competence)}</small></td>
                        <td>${s.statut === 'a_revoir' ? '👩‍🏫 À revoir' : '🔄 À refaire'}</td>
                        <td>
                            <button type="button" class="btn-valid" style="padding:3px 7px;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">✅ Valider</button>
                            <button type="button" class="filter-btn" style="padding:3px 7px;" onclick="${estArch ? `restaurerArchive('${cleRem}')` : `archiverItem('${cleRem}')`}">${estArch ? '↩️' : '📥'}</button>
                        </td>
                    </tr>`;
                }
            }

            // 2. Préparation des Tablettes (Anton / Scratch)
            if (!estVal && estActiviteTablette(act)) {
                let cleTab = `tab_${act.id}`;
                let estArchTab = dashboardArchives.includes(cleTab);
                if (afficherArchivesMode || !estArchTab) {
                    if (!tachesTablettesMap[act.id]) tachesTablettesMap[act.id] = { act, elevesNoms: [], cleTab, estArchTab };
                    tachesTablettesMap[act.id].elevesNoms.push(`${e.nom} (${e.niveau})`);
                }
            }
        });
    });

    let html = `<div class="grid-2-cols" style="margin-bottom:20px;">`;

    // Colonne Besoins / Ateliers dirigés
    html += `<div class="card-panel" style="border-left:5px solid #c0392b;">
        <h3 style="color:#c0392b; margin-bottom:10px;">👩‍🏫 Besoins d'ateliers dirigés & Remédiations</h3>
        ${lignesRemediation ? `<table class="table-classique"><thead><tr><th>Élève</th><th>Matière</th><th>Atelier</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${lignesRemediation}</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune demande de remédiation en cours.</p>`}
    </div>`;

    // Colonne Préparation Tablettes / Anton
    let tabKeys = Object.keys(tachesTablettesMap);
    html += `<div class="card-panel" style="border-left:5px solid #8e44ad;">
        <h3 style="color:#6c3483; margin-bottom:10px;">📱 Préparation Tablettes (Anton / Scratch)</h3>
        ${tabKeys.length > 0 ? `<table class="table-classique"><thead><tr><th>Support / Matière</th><th>Activité à épingler</th><th>Élèves concernés</th><th>Action</th></tr></thead><tbody>` + tabKeys.map(k => {
            let item = tachesTablettesMap[k];
            return `<tr style="${item.estArchTab ? 'opacity:0.5;' : ''}">
                <td><strong>${escHTML(item.act.typeRes)}</strong><br><small>${escHTML(item.act.matiere)}</small></td>
                <td><strong>${escHTML(item.act.ressource)}</strong><br><small>${escHTML(item.act.sequence)}</small></td>
                <td>${escHTML(item.elevesNoms.join(', '))}</td>
                <td><button type="button" class="filter-btn" onclick="${item.estArchTab ? `restaurerArchive('${item.cleTab}')` : `archiverItem('${item.cleTab}')`}">${item.estArchTab ? '↩️' : '☑️ Prêt'}</button></td>
            </tr>`;
        }).join('') + `</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune activité tablette à préparer.</p>`}
    </div></div>`;

    // Cartes élèves dépliables
    html += `<div class="dashboard-grid">`;
    listeEl.forEach(e => {
        let total = (e.planHebdo || []).length;
        let nbValides = (e.planHebdo || []).filter(id => e.valides && e.valides[id]).length;
        let pct = total > 0 ? Math.round((nbValides / total) * 100) : 0;
        let nbTab = (e.planHebdo || []).map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        let isExp = dashboardExpanded.has(e.id);

        let detailsPlanHtml = '';
        if (isExp) {
            let planObjs = getListeTrie(e.planHebdo, e.priorites || [], e.suivi || {});
            detailsPlanHtml = `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed #ccc; font-size:12.5px;">` + planObjs.map((a, idx) => {
                let fait = e.valides && e.valides[a.id];
                let st = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f1f5f9;">
                    <span style="${fait ? 'text-decoration:line-through; color:#27ae60;' : ''}"><strong>${idx + 1}.</strong> ${escHTML(a.ressource)}</span>
                    <div style="display:flex; gap:3px;">
                        ${!fait ? `<button type="button" class="filter-btn" style="padding:1px 5px;" onclick="validerDepuisDashboard('${e.id}', '${a.id}')" title="Valider">✅</button>
                        <button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_revoir' ? 'background:#c0392b; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_revoir' ? '' : 'a_revoir'}')" title="À revoir">👩‍🏫</button>
                        <button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_refaire' ? 'background:#e67e22; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_refaire' ? '' : 'a_refaire'}')" title="À refaire">🔄</button>` : '✅'}
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }

        html += `<div class="dash-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:#1b4f72; cursor:pointer;" onclick="toggleExpandEleveDash('${e.id}')">${isExp ? '▼' : '▶'} [${escHTML(e.niveau)}] ${escHTML(e.nom)} ${e.fichierJaune ? '📒' : ''}</strong>
                <button type="button" class="filter-btn" onclick="ouvrirEleveDepuisDashboard('${e.id}')">Plan ➔</button>
            </div>
            <div style="font-size:12.5px; color:#555; margin-top:6px;">
                Semaine ${(e.semaineIndex || 0) + 1} ${e.dateDebut ? `(${e.dateDebut})` : ''} • 📱 Tablettes : ${nbTab}/${e.maxTablettes ?? 2}
            </div>
            <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${pct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
                <span>${nbValides} / ${total} validés</span>
                <span style="color:#27ae60;">${pct}%</span>
            </div>
            ${detailsPlanHtml}
        </div>`;
    });
    html += `</div>`;
    cont.innerHTML = html;
}

// ==========================================
// 7. ONGLET 4 : BASE DE DONNÉES, SAISIE MULTIPLE & 4 MODALES DE GESTION
// ==========================================
function toggleModeSaisieMultiple() {
    modeSaisieMultipleActif = !modeSaisieMultipleActif;
    let bSimple = document.getElementById('blocSaisieSimpleBase');
    let bMulti = document.getElementById('blocSaisieMultipleBase');
    let btn = document.getElementById('btnToggleSaisieMulti');
    if (modeSaisieMultipleActif) {
        if (bSimple) bSimple.style.display = 'none';
        if (bMulti) bMulti.style.display = 'block';
        if (btn) btn.innerText = "📝 Revenir au formulaire de saisie simple";
        let tbody = document.getElementById('tbodySaisieMultiple');
        if (tbody && tbody.children.length === 0) ajouterLigneSaisieMultiple(4);
    } else {
        if (bSimple) bSimple.style.display = 'block';
        if (bMulti) bMulti.style.display = 'none';
        if (btn) btn.innerText = "⚡ Passer en mode Saisie Multiple (plusieurs exercices d'un coup)";
    }
}

function ajouterLigneSaisieMultiple(nbLignes = 1) {
    const tbody = document.getElementById('tbodySaisieMultiple');
    if (!tbody) return;
    let optsTypes = `<option value="">-- Support --</option>` + Object.keys(imagesParType || {}).map(t => `<option value="${escHTML(t)}">${escHTML(t)}</option>`).join('');
    for (let i = 0; i < nbLignes; i++) {
        let tr = document.createElement('tr');
        tr.className = 'ligne-saisie-multi';
        tr.innerHTML = `
            <td><input type="text" class="m-lecon" placeholder="Ex: N1" style="width:100%;"></td>
            <td><input type="text" class="m-comp" list="listeCompetencesConnues" placeholder="Compétence..." style="width:100%;"></td>
            <td><input type="text" class="m-res" placeholder="Nom de l'exercice / atelier..." style="width:100%;"></td>
            <td><select class="m-type" style="width:100%;">${optsTypes}</select></td>
            <td><input type="text" class="m-page" placeholder="p. 12 ex 1" style="width:100%;"></td>
            <td><input type="text" class="m-jaune" placeholder="Fichier p. 8" style="width:100%;"></td>
            <td>
                <select class="m-diff" style="width:100%;">
                    <option value="0">0</option>
                    <option value="1">⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                </select>
            </td>
            <td style="text-align:center;"><input type="checkbox" class="m-eval" style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><button type="button" class="btn-remove" style="padding:3px 7px;" onclick="this.closest('tr').remove()">✖</button></td>
        `;
        tbody.appendChild(tr);
    }
}

function enregistrerSaisieMultiple() {
    let nivArr = getNiveauxCochesFormulaire('.cb-niveau-multi');
    let niveauStr = nivArr.length > 0 ? nivArr.join(', ') : 'CP';
    let matiere = document.getElementById('multiMatiere').value.trim();
    let sequence = document.getElementById('multiSequence').value.trim();
    let periode = document.getElementById('multiPeriode').value;

    if (!matiere || !sequence) {
        showToast("Veuillez renseigner la Matière et la Séquence communes en haut.", "error");
        return;
    }

    let lignes = document.querySelectorAll('#tbodySaisieMultiple .ligne-saisie-multi');
    let nbAjoutes = 0;
    lignes.forEach(tr => {
        let ressource = tr.querySelector('.m-res').value.trim();
        if (!ressource) return;
        let lecon = tr.querySelector('.m-lecon').value.trim();
        let competence = tr.querySelector('.m-comp').value.trim();
        let typeRes = tr.querySelector('.m-type').value;
        let pageManuel = tr.querySelector('.m-page').value.trim();
        let varianteJaune = tr.querySelector('.m-jaune').value.trim();
        let difficulte = parseInt(tr.querySelector('.m-diff').value) || 0;
        let estEval = tr.querySelector('.m-eval').checked;
        let couleur = calculerCouleurAutomatique(matiere, niveauStr, typeRes);
        let newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

        baseDonnees.push({
            id: newId, matiere, sequence, lecon, competence, ressource, typeRes,
            pageManuel, varianteJaune, periode, difficulte, niveau: niveauStr,
            visuel: couleur, imageSpecifique: "", estEvaluation: estEval
        });
        if (periode) programmations[newId] = periode;
        nbAjoutes++;
    });

    if (nbAjoutes === 0) {
        showToast("Remplissez au moins un nom d'exercice dans le tableau.", "error");
        return;
    }

    sauvegarderProgrammations();
    postEditGlobal();
    document.getElementById('tbodySaisieMultiple').innerHTML = '';
    ajouterLigneSaisieMultiple(4);
    showToast(`✅ ${nbAjoutes} exercice(s) ajouté(s) d'un coup dans "${sequence}" !`, "success");
}

// Modales de gestion (Matières, Séquences, Compétences, Types)
function ouvrirModalGestionMatieres() { afficherListeMatieresModal(); ouvrirModal('modalMatieres'); }
function afficherListeMatieresModal() {
    let mats = [...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeMatieresModalContainer');
    if (!cont) return;
    cont.innerHTML = mats.map(m => `<div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
        <input type="text" class="input-rename-mat" data-old="${escHTML(m)}" value="${escHTML(m)}" style="flex:1;">
        <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerMatiereModal('${escJS(m)}')">🗑️</button>
    </div>`).join('');
}
function sauvegarderToutesMatieres() {
    document.querySelectorAll('.input-rename-mat').forEach(inp => {
        let oldV = inp.getAttribute('data-old'), newV = inp.value.trim();
        if (oldV && newV && oldV !== newV) {
            baseDonnees.forEach(b => { if ((b.matiere || "").trim() === oldV) b.matiere = newV; });
        }
    });
    postEditGlobal(); fermerModal('modalMatieres'); showToast("Matières mises à jour !", "success");
}
function supprimerMatiereModal(m) {
    if (confirm(`Supprimer toutes les activités de la matière "${m}" ?`)) {
        baseDonnees = baseDonnees.filter(b => (b.matiere || "").trim() !== m);
        postEditGlobal(); afficherListeMatieresModal();
    }
}

function ouvrirModalGestionSequences() {
    let sel = document.getElementById('filtreMatiereModalSeq');
    let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
    if (sel) sel.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    afficherListeSequencesModal(); ouvrirModal('modalSequences');
}
function afficherListeSequencesModal() {
    let matFiltre = document.getElementById('filtreMatiereModalSeq') ? document.getElementById('filtreMatiereModalSeq').value : 'Toutes';
    let seqs = [...new Set(baseDonnees.filter(b => matFiltre === 'Toutes' || (b.matiere || "").trim() === matFiltre).map(b => (b.sequence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeSequencesModalContainer');
    if (!cont) return;
    cont.innerHTML = seqs.map(s => `<div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
        <input type="text" class="input-rename-seq" data-old="${escHTML(s)}" value="${escHTML(s)}" style="flex:1;">
        <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerSequenceModal('${escJS(s)}')">🗑️</button>
    </div>`).join('');
}
function sauvegarderToutesSequences() {
    document.querySelectorAll('.input-rename-seq').forEach(inp => {
        let oldV = inp.getAttribute('data-old'), newV = inp.value.trim();
        if (oldV && newV && oldV !== newV) {
            baseDonnees.forEach(b => { if ((b.sequence || "").trim() === oldV) b.sequence = newV; });
        }
    });
    postEditGlobal(); fermerModal('modalSequences'); showToast("Séquences mises à jour !", "success");
}
function supprimerSequenceModal(s) {
    if (confirm(`Supprimer toutes les activités de la séquence "${s}" ?`)) {
        baseDonnees = baseDonnees.filter(b => (b.sequence || "").trim() !== s);
        postEditGlobal(); afficherListeSequencesModal();
    }
}

function ouvrirModalGestionCompetences() {
    let sel = document.getElementById('filtreMatiereModalComp');
    let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
    if (sel) sel.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    afficherListeCompetencesModal(); ouvrirModal('modalCompetences');
}
function afficherListeCompetencesModal() {
    let matFiltre = document.getElementById('filtreMatiereModalComp') ? document.getElementById('filtreMatiereModalComp').value : 'Toutes';
    let comps = [...new Set(baseDonnees.filter(b => matFiltre === 'Toutes' || (b.matiere || "").trim() === matFiltre).map(b => (b.competence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeCompetencesModalContainer');
    if (!cont) return;
    cont.innerHTML = comps.map(c => `<div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
        <input type="text" class="input-rename-comp" data-old="${escHTML(c)}" value="${escHTML(c)}" style="flex:1;">
    </div>`).join('');
}
function sauvegarderToutesCompetences() {
    document.querySelectorAll('.input-rename-comp').forEach(inp => {
        let oldV = inp.getAttribute('data-old'), newV = inp.value.trim();
        if (oldV && newV && oldV !== newV) {
            baseDonnees.forEach(b => { if ((b.competence || "").trim() === oldV) b.competence = newV; });
        }
    });
    postEditGlobal(); fermerModal('modalCompetences'); showToast("Compétences mises à jour !", "success");
}

function ouvrirModalGestionTypes() { afficherListeTypesModal(); ouvrirModal('modalTypes'); }
function afficherListeTypesModal() {
    const cont = document.getElementById('listeTypesModalContainer');
    if (!cont || !imagesParType) return;
    cont.innerHTML = Object.keys(imagesParType).map(k => {
        let t = imagesParType[k];
        return `<div class="ligne-type-modal" data-key="${escHTML(k)}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #eee; flex-wrap:wrap;">
            <strong style="width:120px;">${escHTML(k)}</strong>
            <input type="text" class="t-img" value="${escHTML(t.img || '')}" placeholder="URL logo..." style="flex:1;">
            <label style="font-size:12px;"><input type="checkbox" class="t-remp" ${t.remplacerNum ? 'checked' : ''}> Logo remplace N°</label>
            <label style="font-size:12px;"><input type="checkbox" class="t-coul" ${t.appliquerCouleur !== false ? 'checked' : ''}> Colorer</label>
            <label style="font-size:12px;"><input type="checkbox" class="t-tab" ${t.isTablette ? 'checked' : ''}> 📱 Tablette</label>
            <button type="button" class="btn-remove" style="padding:3px 7px;" onclick="supprimerTypeRessource('${escJS(k)}')">🗑️</button>
        </div>`;
    }).join('');
}
function sauvegarderTousLesTypes() {
    document.querySelectorAll('.ligne-type-modal').forEach(div => {
        let k = div.getAttribute('data-key');
        if (imagesParType[k]) {
            imagesParType[k].img = div.querySelector('.t-img').value.trim();
            imagesParType[k].remplacerNum = div.querySelector('.t-remp').checked;
            imagesParType[k].appliquerCouleur = div.querySelector('.t-coul').checked;
            imagesParType[k].isTablette = div.querySelector('.t-tab').checked;
        }
    });
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    declencherAutoSaveFirebase();
    majListeTypesSelect(); fermerModal('modalTypes'); afficherBase();
    showToast("Types et logos mis à jour !", "success");
}

function ajouterOuModifierType() {
    let nom = document.getElementById('inputNouveauTypeNom').value.trim();
    if (!nom) { showToast("Indiquez un nom de type.", "error"); return; }
    let img = document.getElementById('inputNouveauTypeImg').value.trim();
    let remp = document.getElementById('cbNouveauTypeRempNum') ? document.getElementById('cbNouveauTypeRempNum').checked : false;
    let isTab = document.getElementById('cbNouveauTypeTablette').checked;
    let appCoul = document.getElementById('cbNouveauTypeCouleur').checked;
    imagesParType[nom] = { img: img, remplacerNum: remp, appliquerCouleur: appCoul, isTablette: isTab };
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    declencherAutoSaveFirebase();
    majListeTypesSelect(); afficherListeTypesModal(); afficherBase();
    document.getElementById('inputNouveauTypeNom').value = '';
    document.getElementById('inputNouveauTypeImg').value = '';
    showToast(`Type "${nom}" enregistré !`, "success");
}

function supprimerTypeRessource(nom) {
    if (confirm(`Supprimer le type "${nom}" ?`)) {
        delete imagesParType[nom];
        localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
        majListeTypesSelect(); afficherListeTypesModal();
    }
}

function changerCouleurDB(idAct, nouvCouleur) {
    let a = baseDonnees.find(b => b.id === idAct);
    if (a) { a.visuel = nouvCouleur; sauvegarderBase(); afficherBase(); }
}

function changerImageDB(idAct) {
    let a = baseDonnees.find(b => b.id === idAct);
    if (!a) return;
    let url = prompt("URL de l'image spécifique pour cet atelier (ou laisser vide pour retirer) :", a.imageSpecifique || "");
    if (url !== null) { a.imageSpecifique = url.trim(); sauvegarderBase(); afficherBase(); }
}

function viderBase() {
    if (confirm("⚠️ Voulez-vous vraiment vider l'intégralité de la base de données d'ateliers ?")) {
        baseDonnees = [];
        postEditGlobal();
        showToast("Base de données vidée.", "success");
    }
}

function enregistrerActiviteBase() {
    let matiere = document.getElementById('inputMatiere').value.trim();
    let sequence = document.getElementById('inputSequence').value.trim();
    let lecon = document.getElementById('inputLecon').value.trim();
    let competence = document.getElementById('inputCompetence').value.trim();
    let ressource = document.getElementById('inputRessource').value.trim();
    let typeRes = document.getElementById('selectTypeRessource').value;
    let pageManuel = document.getElementById('inputPageManuel').value.trim();
    let varianteJaune = document.getElementById('inputVarianteJaune').value.trim();
    let periode = document.getElementById('selectPeriodeForm').value;
    let difficulte = parseInt(document.getElementById('selectDifficulte').value) || 0;
    let nivArr = getNiveauxCochesFormulaire('.cb-niveau-form');
    let niveauStr = nivArr.length > 0 ? nivArr.join(', ') : 'CP';
    let couleur = document.getElementById('selectCouleurRapide').value || calculerCouleurAutomatique(matiere, niveauStr, typeRes);
    let imgAct = document.getElementById('inputImageAct').value.trim();
    let estEval = document.getElementById('cbEstEvaluation').checked;

    if (!matiere || !ressource) {
        showToast("Veuillez remplir au minimum la Matière et le Nom de la ressource.", "error");
        return;
    }

    if (idEnCoursEdition) {
        let act = baseDonnees.find(b => b.id === idEnCoursEdition);
        if (act) {
            Object.assign(act, { matiere, sequence, lecon, competence, ressource, typeRes, pageManuel, varianteJaune, periode, difficulte, niveau: niveauStr, visuel: couleur, imageSpecifique: imgAct, estEvaluation: estEval });
            if (periode) programmations[act.id] = periode;
        }
        idEnCoursEdition = null;
        document.getElementById('btnAnnulerEditBase').style.display = 'none';
        document.getElementById('titreFormulaireBase').innerText = "➕ Ajouter ou modifier une activité";
        showToast("Activité modifiée !", "success");
    } else {
        let newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        baseDonnees.push({ id: newId, matiere, sequence, lecon, competence, ressource, typeRes, pageManuel, varianteJaune, periode, difficulte, niveau: niveauStr, visuel: couleur, imageSpecifique: imgAct, estEvaluation: estEval });
        if (periode) programmations[newId] = periode;
        showToast("Nouvelle activité ajoutée !", "success");
    }
    sauvegarderProgrammations();
    postEditGlobal();
    document.getElementById('inputRessource').value = '';
    document.getElementById('inputPageManuel').value = '';
    document.getElementById('inputVarianteJaune').value = '';
}

function editerActiviteBase(idAct) {
    if (modeSaisieMultipleActif) toggleModeSaisieMultiple();
    let a = baseDonnees.find(b => b.id === idAct);
    if (!a) return;
    idEnCoursEdition = idAct;
    document.getElementById('inputMatiere').value = a.matiere || '';
    document.getElementById('inputSequence').value = a.sequence || '';
    document.getElementById('inputLecon').value = a.lecon || '';
    document.getElementById('inputCompetence').value = a.competence || '';
    document.getElementById('inputRessource').value = a.ressource || '';
    document.getElementById('selectTypeRessource').value = a.typeRes || '';
    document.getElementById('inputPageManuel').value = a.pageManuel || '';
    document.getElementById('inputVarianteJaune').value = a.varianteJaune || '';
    document.getElementById('selectPeriodeForm').value = programmations[a.id] || a.periode || '';
    document.getElementById('selectDifficulte').value = a.difficulte || 0;
    document.getElementById('selectCouleurRapide').value = a.visuel || '';
    document.getElementById('inputImageAct').value = a.imageSpecifique || '';
    document.getElementById('cbEstEvaluation').checked = Boolean(a.estEvaluation);
    document.querySelectorAll('.cb-niveau-form').forEach(cb => {
        cb.checked = (a.niveau || "").toUpperCase().includes(cb.value);
    });
    document.getElementById('titreFormulaireBase').innerText = "✏️ Modification de : " + a.ressource;
    document.getElementById('btnAnnulerEditBase').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annulerEditionBase() {
    idEnCoursEdition = null;
    document.getElementById('titreFormulaireBase').innerText = "➕ Ajouter ou modifier une activité";
    document.getElementById('btnAnnulerEditBase').style.display = 'none';
}

function supprimerActiviteBase(idAct) {
    if (confirm("Supprimer cette activité de la base de données ?")) {
        baseDonnees = baseDonnees.filter(b => b.id !== idAct);
        postEditGlobal();
        showToast("Activité supprimée.", "success");
    }
}

function initNiveaux() {
    const barre = document.getElementById('barreFiltresNiveauxBase');
    if (barre) {
        let nivs = ['Tous', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
        barre.innerHTML = nivs.map(n => `<button type="button" class="filter-btn ${filtreCourantDB === n ? 'active' : ''}" onclick="filtrerBaseNiveau('${n}')">${n}</button>`).join('');
    }
    const selMat = document.getElementById('selectFiltreMatiereBase');
    if (selMat) {
        let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
        selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}" ${filtreCourantMatiere === m ? 'selected' : ''}>Matière : ${escHTML(m)}</option>`).join('');
    }
    const selType = document.getElementById('selectFiltreTypeBase');
    if (selType) {
        let types = ['Tous', ...Object.keys(imagesParType || {})];
        selType.innerHTML = types.map(t => `<option value="${escHTML(t)}" ${filtreCourantTypeDB === t ? 'selected' : ''}>Support : ${escHTML(t)}</option>`).join('');
    }
}

function filtrerBaseNiveau(n) { filtreCourantDB = n; initNiveaux(); afficherBase(); }
function filtrerBaseMatiere(m) { filtreCourantMatiere = m; afficherBase(); }
function filtrerBaseType(t) { filtreCourantTypeDB = t; afficherBase(); }

function afficherBase() {
    const tbody = document.getElementById('tableBaseDonnees');
    if (!tbody) return;
    let q = (document.getElementById('inputRechercheBase') ? document.getElementById('inputRechercheBase').value : "").toLowerCase().trim();
    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        if (filtreCourantDB !== 'Tous' && !(a.niveau || "").toUpperCase().includes(filtreCourantDB)) return false;
        if (filtreCourantMatiere !== 'Toutes' && (a.matiere || "").trim() !== filtreCourantMatiere) return false;
        if (filtreCourantTypeDB !== 'Tous' && (a.typeRes || "").trim() !== filtreCourantTypeDB) return false;
        if (q) {
            let txt = `${a.matiere} ${a.sequence} ${a.lecon} ${a.competence} ${a.ressource} ${a.pageManuel}`.toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    let cpt = document.getElementById('compteurBaseAffichee');
    if (cpt) cpt.innerText = liste.length;

    if (liste.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">Aucune activité trouvée.</td></tr>';
        return;
    }

    let html = '';
    liste.forEach(a => {
        let coul = getCouleurMatiereBandeau(a.matiere);
        let per = programmations[a.id] || a.periode || "-";
        let detailsLivres = `${a.pageManuel ? `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 5px; border-radius:4px; font-size:11px;">📘 ${escHTML(a.pageManuel)}</span> ` : ''}${a.varianteJaune ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 5px; border-radius:4px; font-size:11px;">📒 ${escHTML(a.varianteJaune)}</span>` : ''}`;
        let coulVisuel = a.visuel || calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes);
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong></td>
            <td><span class="filter-btn" style="padding:2px 6px; font-size:11px;">${escHTML(per)}</span></td>
            <td><span style="display:inline-block; padding:2px 7px; border-radius:4px; background:${coul.bg}; color:${coul.text}; font-size:11.5px; font-weight:bold;">${escHTML(a.matiere)}</span><br>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${a.typeRes ? `<small>[${escHTML(a.typeRes)}]</small>` : ''} ${detailsLivres} ${a.estEvaluation ? '<span class="badge-eval">🎯</span>' : ''}</td>
            <td style="text-align:center;">
                <input type="color" value="${coulVisuel.startsWith('#') ? coulVisuel : '#ffffff'}" onchange="changerCouleurDB('${a.id}', this.value)" title="Couleur étiquette" style="width:28px; height:24px; border:none; cursor:pointer; vertical-align:middle;">
                <button type="button" class="filter-btn" style="padding:2px 6px;" onclick="changerImageDB('${a.id}')" title="Image spécifique">${a.imageSpecifique ? '🖼️' : '➕🖼️'}</button>
            </td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button type="button" class="btn-action" style="padding:4px 8px;" onclick="assignerActivite('${a.id}')" title="Assigner aux élèves">📌</button>
                    <button type="button" class="filter-btn" onclick="editerActiviteBase('${a.id}')">✏️</button>
                    <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerActiviteBase('${a.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ==========================================
// 8. ONGLET 5 : PROGRAMMATIONS P1 À P5 (BOUTONS P1-P5 CLIQUABLES)
// ==========================================
function initProgFilters() {
    const selMat = document.getElementById('selectMatiereProg');
    if (!selMat) return;
    let val = selMat.value || 'Toutes';
    let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
    selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    selMat.value = val;
}

function toggleProg(idAct, per) {
    let actuel = programmations[idAct] || "";
    if (actuel === per) delete programmations[idAct];
    else programmations[idAct] = per;
    let act = baseDonnees.find(b => b.id === idAct);
    if (act) act.periode = programmations[idAct] || "";
    sauvegarderProgrammations(); sauvegarderBase();
    afficherProgrammation();
}

function afficherProgrammation() {
    const cont = document.getElementById('contenuProgrammation');
    if (!cont) return;
    let niv = document.getElementById('selectNiveauProg') ? document.getElementById('selectNiveauProg').value : 'Tous';
    let mat = document.getElementById('selectMatiereProg') ? document.getElementById('selectMatiereProg').value : 'Toutes';
    let perFiltre = document.getElementById('selectPeriodeProg') ? document.getElementById('selectPeriodeProg').value : 'Toutes';

    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        if (niv !== 'Tous' && !(a.niveau || "").toUpperCase().includes(niv)) return false;
        if (mat !== 'Toutes' && (a.matiere || "").trim() !== mat) return false;
        let p = programmations[a.id] || a.periode || "";
        if (perFiltre === 'Non_affecte' && p !== "") return false;
        if (perFiltre !== 'Toutes' && perFiltre !== 'Non_affecte' && p !== perFiltre) return false;
        return true;
    });

    if (liste.length === 0) {
        cont.innerHTML = `<div class="empty-state"><p>Aucune activité pour ce filtre.</p></div>`;
        return;
    }

    let html = `<table class="table-classique"><thead><tr><th style="width:70px;">Niveau</th><th style="width:180px;">Matière / Séquence</th><th>Compétence</th><th>Ressource</th><th style="width:230px; text-align:center;">Périodes (P1 à P5)</th></tr></thead><tbody>`;
    liste.forEach(a => {
        let p = programmations[a.id] || a.periode || "";
        let coul = getCouleurMatiereBandeau(a.matiere);
        let btns = ['P1', 'P2', 'P3', 'P4', 'P5'].map(per => `<button type="button" class="prog-pill ${p === per ? 'active' : ''}" onclick="toggleProg('${a.id}', '${per}')">${per}</button>`).join('');
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong></td>
            <td><span style="background:${coul.bg}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${escHTML(a.matiere)}</span><br>${escHTML(a.sequence)}</td>
            <td>${escHTML(a.competence)}</td>
            <td><strong>${escHTML(a.ressource)}</strong></td>
            <td style="text-align:center;">${btns}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    cont.innerHTML = html;
}

// ==========================================
// 9. ONGLET 6 : STUDIO D'IMPRESSION D'ÉTIQUETTES
// ==========================================
function afficherChoixEtiquettes() {
    const selMat = document.getElementById('selectMatiereEtiquettes');
    if (selMat && selMat.options.length <= 1) {
        let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
        selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    }
    const niv = document.getElementById('selectNiveauEtiquettes') ? document.getElementById('selectNiveauEtiquettes').value : 'Tous';
    const mat = selMat ? selMat.value : 'Toutes';
    const typeF = document.getElementById('selectTypeEtiquettes') ? document.getElementById('selectTypeEtiquettes').value : 'Tous';
    const cont = document.getElementById('listeChoixEtiquettes');
    if (!cont) return;

    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        if (niv !== 'Tous' && !(a.niveau || "").toUpperCase().includes(niv)) return false;
        if (mat !== 'Toutes' && (a.matiere || "").trim() !== mat) return false;
        if (typeF !== 'Tous' && (a.typeRes || "").trim() !== typeF) return false;
        return true;
    });

    cont.innerHTML = liste.map(a => `<label style="display:inline-block; width:280px; margin:3px 6px; font-size:13px; cursor:pointer;"><input type="checkbox" class="cb-etiq-item" value="${a.id}" checked onchange="genererApercuEtiquettes()"> [${escHTML(a.niveau)}] ${escHTML(a.ressource)}</label>`).join('');
    genererApercuEtiquettes();
}

function cocherToutesEtiquettes(etat) {
    document.querySelectorAll('.cb-etiq-item').forEach(cb => cb.checked = etat);
    genererApercuEtiquettes();
}

function genererApercuEtiquettes() {
    const zone = document.getElementById('printEtiquettesContainer');
    if (!zone) return;
    let w = parseInt(document.getElementById('etiqLargeurInput') ? document.getElementById('etiqLargeurInput').value : 220) || 220;
    let h = parseInt(document.getElementById('etiqHauteurInput') ? document.getElementById('etiqHauteurInput').value : 95) || 95;
    let fs = parseInt(document.getElementById('etiqFontInput') ? document.getElementById('etiqFontInput').value : 14) || 14;
    let showComp = document.getElementById('cbEtiqShowComp') ? document.getElementById('cbEtiqShowComp').checked : true;
    let showImg = document.getElementById('cbEtiqShowImg') ? document.getElementById('cbEtiqShowImg').checked : true;

    let ids = [];
    document.querySelectorAll('.cb-etiq-item:checked').forEach(cb => ids.push(cb.value));
    let html = '';
    ids.forEach(id => {
        let a = baseDonnees.find(b => b.id === id);
        if (!a) return;
        let coul = getCouleurMatiereBandeau(a.matiere);
        let bgEtiq = a.visuel || calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes);
        let typeCfg = imagesParType[a.typeRes] || null;
        let imgUrl = a.imageSpecifique || (typeCfg && typeCfg.img ? typeCfg.img : "");

        html += `<div class="etiquette-item" style="width:${w}px; min-height:${h}px; background:${bgEtiq}; border-color:${coul.bg}; font-size:${fs}px;">
            <div style="background:${coul.bg}; color:${coul.text}; font-size:${Math.max(10, fs - 3)}px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-bottom:5px;">${escHTML(a.matiere)} • ${escHTML(a.niveau)}</div>
            ${showImg && imgUrl ? `<div style="margin:4px 0;"><img src="${escHTML(formaterLienImage(imgUrl))}" style="max-height:38px; object-fit:contain;"></div>` : ''}
            <div style="font-weight:bold; font-size:${fs + 1}px; margin-bottom:3px;">${escHTML(a.ressource)}</div>
            <div style="font-size:${Math.max(10, fs - 2)}px; color:#333;">${escHTML(a.sequence)} ${a.lecon ? '— '+escHTML(a.lecon) : ''}</div>
            ${showComp && a.competence ? `<div style="font-size:${Math.max(9, fs - 3)}px; color:#555; margin-top:3px; font-style:italic;">${escHTML(a.competence)}</div>` : ''}
            <div style="margin-top:4px;">${formaterEtoiles(a.difficulte)}</div>
        </div>`;
    });
    zone.innerHTML = html;
}

function lancerImpressionEtiquettes() {
    genererApercuEtiquettes();
    window.print();
}

// ==========================================
// 10. ONGLETS 7 & 8 : MATRICE ET BILAN ÉLÈVE (+ EXPORT EDULIVRET / LSU)
// ==========================================
function genererMatriceCompetences() {
    const selMat = document.getElementById('selectMatiereMatrice');
    if (selMat && selMat.options.length <= 1) {
        let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
        selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    }
    const niv = document.getElementById('selectNiveauMatrice') ? document.getElementById('selectNiveauMatrice').value : 'CP';
    const mat = selMat ? selMat.value : 'Toutes';
    const cont = document.getElementById('conteneurMatrice');
    if (!cont) return;

    let elevesNiv = getElevesTries().filter(e => (e.niveau || 'CP').toUpperCase() === niv);
    let acts = baseDonnees.filter(a => a && (a.niveau || "").toUpperCase().includes(niv) && (mat === 'Toutes' || (a.matiere || "").trim() === mat));

    if (elevesNiv.length === 0 || acts.length === 0) {
        cont.innerHTML = `<div class="empty-state"><p>Aucun élève ou activité pour le niveau ${escHTML(niv)}.</p></div>`;
        return;
    }

    let html = `<table class="table-classique"><thead><tr><th>Matière / Compétence / Ressource</th>`;
    elevesNiv.forEach(e => { html += `<th style="text-align:center;">${escHTML(e.nom)}</th>`; });
    html += `</tr></thead><tbody>`;

    acts.forEach(a => {
        let coul = getCouleurMatiereBandeau(a.matiere);
        html += `<tr><td><span style="background:${coul.bg}; color:#fff; padding:1px 6px; border-radius:4px; font-size:11px;">${escHTML(a.matiere)}</span> <strong>${escHTML(a.ressource)}</strong><br><small>${escHTML(a.competence)}</small></td>`;
        elevesNiv.forEach(e => {
            let valide = e.historique && e.historique.some(h => h.idActivite === a.id);
            let enCours = e.planHebdo && e.planHebdo.includes(a.id);
            html += `<td style="text-align:center; font-size:16px;">${valide ? '✅' : (enCours ? '⏳' : '—')}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    cont.innerHTML = html;
}

function changerBilanEval(idEl, cleComp, valeur) {
    let e = eleves[idEl]; if (!e) return;
    if (!e.bilanEvaluations) e.bilanEvaluations = {};
    e.bilanEvaluations[cleComp] = valeur;
    sauvegarderEleves();
    showToast("Niveau d'acquisition enregistré !", "success");
}

function genererBilanEleve() {
    const sel = document.getElementById('selectEleveBilan');
    const cont = document.getElementById('conteneurBilanEleve');
    if (!sel || !cont) return;
    let idEl = sel.value || idEleveCourant;
    if (!idEl || !eleves[idEl]) {
        cont.innerHTML = `<div class="empty-state"><p>Sélectionnez un élève pour afficher et éditer son bilan de compétences.</p></div>`;
        return;
    }
    sel.value = idEl;
    let e = eleves[idEl];
    if (!e.bilanEvaluations) e.bilanEvaluations = {};
    let hist = e.historique || [];
    if (hist.length === 0) {
        cont.innerHTML = `<div class="empty-state"><p>Aucune activité validée dans l'historique de ${escHTML(e.nom)} pour le moment.</p></div>`;
        return;
    }

    let parMat = {};
    hist.forEach(h => {
        let a = baseDonnees.find(b => b.id === h.idActivite);
        if (!a) return;
        let m = a.matiere || "Autres";
        if (!parMat[m]) parMat[m] = [];
        parMat[m].push({ act: a, date: h.date });
    });

    let html = `<div class="card-panel"><h3>📋 Bilan des acquisitions de ${escHTML(e.nom)} (${escHTML(e.niveau)}) — ${hist.length} activités validées</h3>`;
    Object.keys(parMat).forEach(m => {
        let coul = getCouleurMatiereBandeau(m);
        html += `<div class="bandeau-matiere-print" style="background:${coul.bg}; color:${coul.text}; margin-top:15px;">${escHTML(m.toUpperCase())}</div>
        <table class="table-classique"><thead><tr><th style="width:90px;">Date</th><th style="width:160px;">Séquence</th><th>Compétence travaillée</th><th>Atelier validé</th><th style="width:170px;">Maîtrise (LSU)</th></tr></thead><tbody>`;
        parMat[m].forEach(it => {
            let cleComp = `${it.act.matiere}||${it.act.competence || it.act.ressource}`;
            let nivMaitrise = e.bilanEvaluations[cleComp] || "Atteint";
            html += `<tr>
                <td>${escHTML(it.date)}</td>
                <td>${escHTML(it.act.sequence)}</td>
                <td><strong>${escHTML(it.act.competence)}</strong></td>
                <td>${escHTML(it.act.ressource)} ${it.act.estEvaluation ? '<span class="badge-eval">🎯 Éval</span>' : ''}</td>
                <td>
                    <select onchange="changerBilanEval('${e.id}', '${escJS(cleComp)}', this.value)" style="width:100%; font-weight:bold;">
                        <option value="Dépassé" ${nivMaitrise === 'Dépassé' ? 'selected' : ''}>✨ Dépassé</option>
                        <option value="Atteint" ${nivMaitrise === 'Atteint' ? 'selected' : ''}>✅ Atteint</option>
                        <option value="Partiellement atteint" ${nivMaitrise === 'Partiellement atteint' ? 'selected' : ''}>🟠 Partiellement atteint</option>
                        <option value="Non atteint" ${nivMaitrise === 'Non atteint' ? 'selected' : ''}>🔴 Non atteint</option>
                    </select>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
    });
    html += `</div>`;
    cont.innerHTML = html;
}

function exporterBilanEdulivret() {
    const sel = document.getElementById('selectEleveBilan');
    let idEl = sel ? sel.value : idEleveCourant;
    if (!idEl || !eleves[idEl]) { showToast("Sélectionnez d'abord un élève.", "error"); return; }
    let e = eleves[idEl];
    let hist = e.historique || [];
    let parMat = {};
    hist.forEach(h => {
        let a = baseDonnees.find(b => b.id === h.idActivite);
        if (!a) return;
        let m = a.matiere || "Autres";
        if (!parMat[m]) parMat[m] = new Set();
        let cleComp = `${a.matiere}||${a.competence || a.ressource}`;
        let niv = (e.bilanEvaluations && e.bilanEvaluations[cleComp]) ? e.bilanEvaluations[cleComp] : "Atteint";
        parMat[m].add(`- ${a.competence || a.ressource} (${a.sequence}) : ${niv}`);
    });

    let lignes = [`BILAN DES COMPÉTENCES — ${e.nom.toUpperCase()} (${e.niveau})\n`];
    Object.keys(parMat).forEach(m => {
        lignes.push(`=== ${m.toUpperCase()} ===`);
        parMat[m].forEach(item => lignes.push(item));
        lignes.push('');
    });

    let zone = document.getElementById('zoneExportEdulivret');
    let ta = document.getElementById('textareaExportLSU');
    if (zone && ta) {
        zone.style.display = 'block';
        ta.value = lignes.join('\n');
        ta.select();
        navigator.clipboard?.writeText(ta.value).catch(() => {});
        showToast("📋 Bilan généré et copié dans le presse-papiers !", "success");
    }
}

// ==========================================
// 11. NAVIGATION & INITIALISATION GLOBALE
// ==========================================
function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetPage = document.getElementById(idPage); if (targetPage) targetPage.classList.add('active'); if (element) element.classList.add('active');
    if (idPage === 'pageSuivi') { majListeEleves(); if (idEleveCourant) chargerEleve(); }
    if (idPage === 'pageImpression') { if (idEleveCourant) idEleveImpressionCourant = idEleveCourant; majListeEleves(); changementEleveImpression(); }
    if (idPage === 'pageDashboard') { rafraichirDashboard(); }
    if (idPage === 'pageBase') { initNiveaux(); majSelectCouleursRapides(); afficherBase(); }
    if (idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if (idPage === 'pageEtiquettes') { afficherChoixEtiquettes(); }
    if (idPage === 'pageMatrice') { genererMatriceCompetences(); }
    if (idPage === 'pageBilan') { majListeEleves(); genererBilanEleve(); }
    if (idPage === 'pageSave') { calculTailleStockage(); tenterConnexionAutoFirebase(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener("DOMContentLoaded", function() {
    appliquerThemeVisuel(localStorage.getItem(KEY_THEME) || 'pastel');
    rafraichirToutApresImport();
    tenterConnexionAutoFirebase();
});
