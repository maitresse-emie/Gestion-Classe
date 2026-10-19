// ==========================================
// 1. SETUP, CONSTANTES ET COULEURS MATIÈRES STRICTES
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

// Règles strictes de couleurs par matière :
// Français : bleu foncé | Mathématiques : rouge | Art : marron | EPS : orange
// Histoire-Géo : bleu clair | Sciences : vert | Langues : rose | EMC : violet
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

function importerDonneesUniversel(rawData, sourceLabel = "JSON") {
    if (!rawData) {
        showToast("Aucune donnée trouvée.", "error");
        return false;
    }
    let data = parseSiString(rawData);
    // Si l'objet racine est encapsulé dans classe_data (ex: export racine Firebase)
    if (data.classe_data && typeof data.classe_data === 'object') {
        data = data.classe_data;
    }

    // Détection universelle des ateliers / base
    let nouvBase = data.base || data.ateliers || data.baseDonnees || data[KEY_ATELIERS] || (Array.isArray(data) ? data : null);
    nouvBase = parseSiString(nouvBase);

    // Détection universelle des élèves
    let nouvEleves = data.eleves || data[KEY_ELEVES] || null;
    nouvEleves = parseSiString(nouvEleves);

    // Détection images, programmations, archives
    let nouvImages = parseSiString(data.images || data.imagesParType || data[KEY_IMAGES]);
    let nouvProg = parseSiString(data.programmations || data[KEY_PROG]);
    let nouvArchives = parseSiString(data.archives || data.dashboardArchives || data[KEY_ARCHIVES_TODO]);

    if (!Array.isArray(nouvBase) && (!nouvEleves || typeof nouvEleves !== 'object')) {
        showToast("⚠️ Format non reconnu : ni ateliers ni élèves trouvés dans ces données.", "error");
        console.warn("Structure reçue :", data);
        return false;
    }

    if (Array.isArray(nouvBase)) {
        baseDonnees = nouvBase;
        localStorage.setItem(KEY_ATELIERS, JSON.stringify(baseDonnees));
    }
    if (nouvEleves && typeof nouvEleves === 'object') {
        eleves = nouvEleves;
        Object.values(eleves).forEach(el => assurerStructureSemaines(el));
        localStorage.setItem(KEY_ELEVES, JSON.stringify(eleves));
    }
    if (nouvImages && typeof nouvImages === 'object') {
        imagesParType = nouvImages;
        localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    }
    if (nouvProg && typeof nouvProg === 'object') {
        programmations = nouvProg;
        localStorage.setItem(KEY_PROG, JSON.stringify(programmations));
    }
    if (Array.isArray(nouvArchives)) {
        dashboardArchives = nouvArchives;
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
    }
    if (data.theme) appliquerThemeVisuel(data.theme);

    rafraichirToutApresImport();
    showToast(`✅ Restauration réussie (${baseDonnees.length} ateliers, ${Object.keys(eleves).length} élèves) !`, "success");
    return true;
}

function rafraichirToutApresImport() {
    eliminerDoublonsHistoriques();
    trierBaseDonnees();
    majListeTypesSelect();
    afficherTypesGestion();
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
    if (!input || !input.files || !input.files[0]) {
        showToast("Veuillez sélectionner un fichier .json.", "error");
        return;
    }
    let fichier = input.files[0];
    let lecteur = new FileReader();
    lecteur.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            importerDonneesUniversel(parsed, fichier.name);
        } catch (err) {
            console.error("Erreur lecture JSON:", err);
            showToast("Erreur : ce fichier n'est pas un JSON valide.", "error");
        }
        input.value = "";
    };
    lecteur.readAsText(fichier);
}

function restaurerSauvegarde() {
    let input = document.getElementById('inputFichierJson');
    if (input && input.files && input.files[0]) {
        restaurerFichierJSON({ target: input });
    } else {
        let texte = document.getElementById('textareaJsonSecours');
        if (texte && texte.value.trim() !== "") {
            restaurerDepuisTexteColle();
        } else {
            if (input) input.click();
            showToast("Sélectionnez votre fichier JSON de sauvegarde.", "success");
        }
    }
}
window.restaurerSauvegarde = restaurerSauvegarde;
window.restaurerFichierJSON = restaurerFichierJSON;

function restaurerDepuisTexteColle() {
    let zone = document.getElementById('textareaJsonSecours');
    if (!zone || !zone.value.trim()) {
        showToast("La zone de texte est vide. Collez votre JSON d'abord.", "error");
        return;
    }
    try {
        let parsed = JSON.parse(zone.value.trim());
        if (importerDonneesUniversel(parsed, "Texte collé")) {
            zone.value = "";
        }
    } catch (err) {
        console.error("Erreur JSON collé :", err);
        showToast("Le texte collé n'est pas un JSON valide (vérifiez les accolades).", "error");
    }
}

function exporterSauvegardeJSON() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = {
        base: baseDonnees,
        eleves: eleves,
        images: imagesParType,
        archives: dashboardArchives,
        programmations: programmations,
        theme: localStorage.getItem(KEY_THEME) || 'pastel',
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Sauvegarde_GestionClasse_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("💾 Fichier de sauvegarde téléchargé !", "success");
}

function viderCacheApplication() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let reg of regs) reg.unregister();
        });
    }
    if ('caches' in window) {
        caches.keys().then(keys => {
            for (let k of keys) caches.delete(k);
        });
    }
    showToast("🧹 Cache purgé ! Rechargement...", "success");
    setTimeout(() => location.reload(true), 800);
}

// ==========================================
// 3. SYNCHRONISATION FIREBASE SÉCURISÉE
// ==========================================
let timerFirebaseSave;
const URL_FIREBASE_FIXE = "https://gestionclasse-cc401-default-rtdb.europe-west1.firebasedatabase.app";

async function sauvegarderVersFirebase(forcerManuellement = false) {
    // SÉCURITÉ ANTI-ÉCRASEMENT : Ne jamais écraser Firebase automatiquement si l'application locale est vide
    if (!forcerManuellement && baseDonnees.length === 0 && Object.keys(eleves).length === 0) {
        console.warn("Protection anti-écrasement : envoi automatique bloqué car la base locale est vide.");
        return;
    }
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = {
        base: baseDonnees,
        eleves: eleves,
        images: imagesParType,
        archives: dashboardArchives,
        programmations: programmations,
        theme: localStorage.getItem(KEY_THEME) || 'pastel',
        updatedAt: new Date().toISOString()
    };
    try {
        let res = await fetch(`${URL_FIREBASE_FIXE}/classe_data.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let statut = document.getElementById('statutFirebase');
        if (statut) {
            statut.innerText = `🔥 Synchro Cloud OK (${new Date().toLocaleTimeString()} — ${baseDonnees.length} ateliers, ${Object.keys(eleves).length} élèves)`;
            statut.style.color = "#27ae60";
        }
        if (forcerManuellement) showToast("⬆️ Données envoyées sur Firebase !", "success");
    } catch (e) {
        console.error("Erreur synchro Firebase:", e);
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
                importerDonneesUniversel(data, "Firebase");
            }
            if (statut) {
                statut.innerText = `🔥 Cloud Firebase connecté (${nbBaseCloud} ateliers, ${nbElevesCloud} élèves sur le Cloud)`;
                statut.style.color = "#27ae60";
            }
        } else {
            if (statut) {
                statut.innerText = "ℹ️ Le nœud principal Firebase est actuellement vide. Utilisez l'import JSON ci-dessous pour restaurer vos données.";
                statut.style.color = "#d35400";
            }
            if (forcer) showToast("Aucune donnée trouvée sur /classe_data.json", "error");
        }
    } catch (e) {
        console.error("Erreur lecture Firebase:", e);
        if (statut) { statut.innerText = "⚠️ Erreur de connexion Firebase : " + e.message; statut.style.color = "#e74c3c"; }
    }
}

async function inspecterToutesBranchesFirebase() {
    try {
        showToast("🔍 Inspection de la base Firebase...", "success");
        let res = await fetch(`${URL_FIREBASE_FIXE}/.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let rootData = await res.json();
        if (!rootData) {
            showToast("La base Firebase complète est vide.", "error");
            return;
        }
        if (importerDonneesUniversel(rootData, "Racine Firebase")) {
            return;
        }
        // Si les données sont dans un sous-nœud
        for (let cle of Object.keys(rootData)) {
            if (rootData[cle] && typeof rootData[cle] === 'object') {
                if (importerDonneesUniversel(rootData[cle], "Branche " + cle)) return;
            }
        }
        showToast("Aucune branche exploitable trouvée sur Firebase.", "error");
    } catch (e) {
        showToast("Erreur lors de l'inspection Firebase : " + e.message, "error");
    }
}

function declencherAutoSaveFirebase() {
    clearTimeout(timerFirebaseSave);
    timerFirebaseSave = setTimeout(() => sauvegarderVersFirebase(false), 1800);
}

function tenterConnexionAutoFirebase() {
    chargerDepuisFirebase(false);
}
// ==========================================
// 4. FONCTIONS UTILITAIRES, TRI & THÈMES
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

function getNiveauxCochesFormulaire() {
    let res = [];
    document.querySelectorAll('.cb-niveau-form:checked').forEach(cb => res.push(cb.value));
    return res;
}

function majSelectCouleursRapides(valeurForcee) {
    const select = document.getElementById('selectCouleurRapide'); if (!select) return;
    select.innerHTML = '<option value="">-- Couleur auto par matière/niveau --</option><option value="#ffe599">🟡 Jaune</option><option value="#f6b26b">🟠 Orange</option><option value="#ea9999">🔴 Rouge</option><option value="#d5a6bd">🟣 Violet</option><option value="#b6d7a8">🟢 Vert</option><option value="#9fc5e8">🔵 Bleu</option><option value="#ffffff">⚪ Blanc</option>';
    if (valeurForcee) select.value = valeurForcee;
}

function majListeTypesSelect() {
    const selectType = document.getElementById('selectTypeRessource');
    if (!selectType) return;
    let html = '<option value="">-- Type --</option>';
    if (imagesParType) {
        Object.keys(imagesParType).forEach(t => {
            html += `<option value="${escHTML(t)}">${escHTML(t)}</option>`;
        });
    }
    selectType.innerHTML = html;
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
    let selHeader = document.getElementById('selectThemeHeader');
    if (selHeader) selHeader.value = nomTheme || 'classique';
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
// 5. ONGLET 1 : TABLEAU DE BORD (DASHBOARD)
// ==========================================
function toggleAfficherArchives() {
    afficherArchivesMode = !afficherArchivesMode;
    let btn = document.getElementById('btnToggleArchivesDash');
    if (btn) btn.innerText = afficherArchivesMode ? "🙈 Masquer les éléments archivés" : "👁️ Voir les éléments archivés";
    rafraichirDashboard();
}

function basculerArchiveDashboard(cle) {
    let idx = dashboardArchives.indexOf(cle);
    if (idx > -1) dashboardArchives.splice(idx, 1);
    else dashboardArchives.push(cle);
    localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
    rafraichirDashboard();
}

function ouvrirEleveDepuisDashboard(idEl) {
    idEleveCourant = idEl;
    let sel = document.getElementById('selectEleveProfile');
    if (sel) sel.value = idEl;
    let navBtns = document.querySelectorAll('.nav-btn');
    changerOnglet('pageSuivi', navBtns[1]);
}

function rafraichirDashboard() {
    const cont = document.getElementById('dashboardContent');
    if (!cont) return;
    const listeEl = getElevesTries();
    if (listeEl.length === 0) {
        cont.innerHTML = `<div class="empty-state">
            <h3>Aucun élève enregistré pour le moment.</h3>
            <p style="margin-top:8px;">Rendez-vous dans l'onglet <strong>💾 9. Sauvegarde</strong> pour restaurer votre fichier JSON ou dans <strong>⭐ 2. Suivi Élèves</strong> pour ajouter vos élèves.</p>
        </div>`;
        return;
    }

    // Section 1 : Remédiations / À revoir / À refaire
    let lignesRemediation = '';
    listeEl.forEach(e => {
        assurerStructureSemaines(e);
        (e.planHebdo || []).forEach(idAct => {
            let s = e.suivi && e.suivi[idAct] ? e.suivi[idAct] : null;
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire')) {
                let cle = `${e.id}_${idAct}`;
                let estArch = dashboardArchives.includes(cle);
                if (!afficherArchivesMode && estArch) return;
                let act = baseDonnees.find(b => b.id === idAct);
                if (!act) return;
                let coul = getCouleurMatiereBandeau(act.matiere);
                let badgeStatut = s.statut === 'a_revoir'
                    ? `<span style="background:#fadbd8; color:#922b21; padding:2px 6px; border-radius:4px; font-weight:bold;">👩‍🏫 À revoir avec l'enseignante</span>`
                    : `<span style="background:#fdebd0; color:#b9770e; padding:2px 6px; border-radius:4px; font-weight:bold;">🔄 À refaire</span>`;
                lignesRemediation += `<tr style="${estArch ? 'opacity:0.5;' : ''}">
                    <td><strong>[${escHTML(e.niveau)}] ${escHTML(e.nom)}</strong></td>
                    <td><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${coul.bg}; margin-right:5px;"></span>${escHTML(act.matiere)} — ${escHTML(act.sequence)}</td>
                    <td><strong>${escHTML(act.ressource)}</strong><br><small>${escHTML(act.competence)}</small></td>
                    <td>${badgeStatut}${s.commentaire ? '<br><small>💬 '+escHTML(s.commentaire)+'</small>' : ''}</td>
                    <td style="text-align:center;">
                        <button type="button" class="filter-btn" onclick="basculerArchiveDashboard('${cle}')">${estArch ? '↩️ Désarchiver' : '📥 Archiver'}</button>
                    </td>
                </tr>`;
            }
        });
    });

    let html = '';
    if (lignesRemediation) {
        html += `<div class="card-panel" style="margin-bottom:20px; border-left:5px solid #c0392b;">
            <h3 style="color:#c0392b; margin-bottom:10px;">👩‍🏫 Besoins d'accompagnement & Remédiations en cours</h3>
            <table class="table-classique">
                <thead><tr><th>Élève</th><th>Matière / Séquence</th><th>Activité</th><th>Statut</th><th style="width:110px;">Action</th></tr></thead>
                <tbody>${lignesRemediation}</tbody>
            </table>
        </div>`;
    }

    // Section 2 : Cartes de progression par élève
    html += `<div class="dashboard-grid">`;
    listeEl.forEach(e => {
        let total = (e.planHebdo || []).length;
        let nbValides = (e.planHebdo || []).filter(id => e.valides && e.valides[id]).length;
        let pct = total > 0 ? Math.round((nbValides / total) * 100) : 0;
        let nbTab = (e.planHebdo || []).map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        html += `<div class="dash-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:#1b4f72;">[${escHTML(e.niveau)}] ${escHTML(e.nom)} ${e.fichierJaune ? '📒' : ''}</strong>
                <button type="button" class="filter-btn" onclick="ouvrirEleveDepuisDashboard('${e.id}')">Ouvrir ➔</button>
            </div>
            <div style="font-size:12.5px; color:#555; margin-top:6px;">
                Semaine ${(e.semaineIndex || 0) + 1} ${e.dateDebut ? `(du ${e.dateDebut} au ${e.dateFin})` : ''} • 📱 Tablettes : ${nbTab}/${e.maxTablettes ?? 2}
            </div>
            <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${pct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
                <span>Progression : ${nbValides} / ${total} ateliers</span>
                <span style="color:#27ae60;">${pct}%</span>
            </div>
        </div>`;
    });
    html += `</div>`;
    cont.innerHTML = html;
}

// ==========================================
// 6. ONGLET 2 : SUIVI ÉLÈVES & PLANS HEBDO
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
    if (!selMat) return;
    let valActuelle = selMat.value;
    let matieres = [...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
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
        let perAct = programmations[a.id] || a.periode || "";
        if (per !== 'Toutes' && perAct !== per) return false;
        if (filtreEtoilesDispo > 0 && (parseInt(a.difficulte) || 0) !== filtreEtoilesDispo) return false;
        if (eleve.planHebdo.includes(a.id)) return false;
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
    if (!statut) {
        delete e.suivi[idActivite];
    } else {
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
        }
    });
    sauvegarderEleves(); fermerModal('modalAssigner'); rafraichirDashboard(); if (idEleveCourant) afficherPlanHebdo(); showToast(`Assigné à ${count} élève(s).`, "success");
}

function commencerNouvelleSemaine() {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
    if (confirm(`Clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom} et reporter les ateliers non validés ?`)) {
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
        dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_')); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Nouvelle semaine activée !", "success");
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
    sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard(); showToast("Activités validées !", "success");
}

function estActiviteTablette(act) {
    if (!act || !act.typeRes) return false; let tName = act.typeRes.trim().toLowerCase();
    for (let k in imagesParType) { if (k.trim().toLowerCase() === tName) return Boolean(imagesParType[k] && imagesParType[k].isTablette); } return false;
}

function marquerCommeValideSansRafraichir(idActivite, eleve) {
    const act = baseDonnees.find(b => b.id === idActivite); if (!act) return; const dateValid = new Date().toLocaleDateString('fr-FR');
    if (!eleve.valides) eleve.valides = {}; eleve.valides[idActivite] = dateValid;
    if (!eleve.historique.some(h => h.idActivite === idActivite)) eleve.historique.push({ idActivite: idActivite, date: dateValid });
    if (eleve.suivi && eleve.suivi[idActivite]) delete eleve.suivi[idActivite];
}

function annulerValidationPlan(idActivite) { if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if (eleve.valides && eleve.valides[idActivite]) { delete eleve.valides[idActivite]; eleve.historique = eleve.historique.filter(h => h.idActivite !== idActivite); sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); rafraichirDashboard(); } }
function validerDirectement(idActivite) { if (!idEleveCourant) return; marquerCommeValideSansRafraichir(idActivite, eleves[idEleveCourant]); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Validé !", "success"); }
function masquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant], max = eleve.maxAteliers || 15;
    if (eleve.planHebdo.length >= max) { showToast(`⚠️ Limite maximale (${max}) atteinte.`, "error"); return; }
    const actAjoutee = baseDonnees.find(b => b.id === idActivite);
    if (actAjoutee && estActiviteTablette(actAjoutee)) {
        let maxTab = eleve.maxTablettes ?? 2, nbTabActuels = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        if (nbTabActuels >= maxTab) { showToast(`🚫 Quota tablettes (${maxTab}) atteint pour cet élève.`, "error"); return; }
    }
    let selectJourElem = document.getElementById('jour_dispo_' + idActivite), jourChoisi = selectJourElem ? selectJourElem.value : "";
    eleve.planHebdo.push(idActivite); if (!eleve.joursAssignes) eleve.joursAssignes = {}; if (jourChoisi) eleve.joursAssignes[idActivite] = jourChoisi;
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard();
    showToast(jourChoisi ? `Ajouté (${jourChoisi})` : "Ajouté au plan !");
}

function retirerDuPlan(idActivite) {
    let e = eleves[idEleveCourant], idx = e.planHebdo.indexOf(idActivite);
    if (idx > -1) e.planHebdo.splice(idx, 1);
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite];
    if (e.valides && e.valides[idActivite]) delete e.valides[idActivite];
    if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré du plan");
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
            ? `<span style="color:#27ae60; font-weight:bold; font-size:12px;">✅ Fini (${eleve.valides[a.id]})</span><br><button type="button" class="btn-remove" style="width:100%; margin-top:4px;" onclick="annulerValidationPlan('${a.id}')">↩️ Défaire</button>`
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
    if (eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#7f8c8d; padding:20px;">Le plan de travail de cette semaine est vide. Ajoutez des activités ci-dessus !</td></tr>';
}

function afficherHistorique() {
    const eleve = eleves[idEleveCourant], tbodyHist = document.getElementById('tableHistorique'), tbodyMasq = document.getElementById('tableMasquees'); if (!tbodyHist || !tbodyMasq || !eleve) return; tbodyHist.innerHTML = ''; tbodyMasq.innerHTML = '';
    [...eleve.historique].reverse().forEach(hist => { const a = baseDonnees.find(b => b.id === hist.idActivite); if (a) tbodyHist.innerHTML += `<tr><td><strong>${escHTML(hist.date)}</strong></td><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="desarchiverActivite('${a.id}')">↩️</button></td></tr>`; });
    if (eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Aucune activité validée.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if (a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td><td>${escHTML(a.competence)}</td><td>${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="demasquerActivite('${a.id}')">↩️</button></td></tr>`; });
    if (eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Aucune activité masquée.</td></tr>';
}

// ==========================================
// 7. ONGLET 3 : BASE ATELIERS & TYPES
// ==========================================
function afficherTypesGestion() {
    const cont = document.getElementById('listeTypesConfig');
    if (!cont || !imagesParType) return;
    let html = '';
    Object.keys(imagesParType).forEach(k => {
        let t = imagesParType[k];
        html += `<div style="background:#f8f9fa; border:1px solid #ccc; border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:8px; font-size:13px;">
            ${t.img ? `<img src="${escHTML(formaterLienImage(t.img))}" style="width:22px; height:22px; object-fit:contain;">` : '📦'}
            <strong>${escHTML(k)}</strong> ${t.isTablette ? '📱' : ''}
            <button type="button" class="filter-btn" style="padding:2px 6px; color:#c0392b;" onclick="supprimerTypeRessource('${escJS(k)}')">✖</button>
        </div>`;
    });
    cont.innerHTML = html;
}

function ajouterOuModifierType() {
    let nom = document.getElementById('inputNouveauTypeNom').value.trim();
    if (!nom) { showToast("Indiquez un nom de type.", "error"); return; }
    let img = document.getElementById('inputNouveauTypeImg').value.trim();
    let isTab = document.getElementById('cbNouveauTypeTablette').checked;
    let appCoul = document.getElementById('cbNouveauTypeCouleur').checked;
    imagesParType[nom] = { img: img, remplacerNum: isTab, appliquerCouleur: appCoul, isTablette: isTab };
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    declencherAutoSaveFirebase();
    majListeTypesSelect(); afficherTypesGestion(); afficherBase();
    document.getElementById('inputNouveauTypeNom').value = '';
    document.getElementById('inputNouveauTypeImg').value = '';
    showToast(`Type "${nom}" enregistré !`, "success");
}

function supprimerTypeRessource(nom) {
    if (confirm(`Supprimer le type "${nom}" ?`)) {
        delete imagesParType[nom];
        localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
        majListeTypesSelect(); afficherTypesGestion();
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
    let nivArr = getNiveauxCochesFormulaire();
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7f8c8d; padding:20px;">Aucune activité trouvée.</td></tr>';
        return;
    }

    let html = '';
    liste.forEach(a => {
        let coul = getCouleurMatiereBandeau(a.matiere);
        let per = programmations[a.id] || a.periode || "-";
        let detailsLivres = `${a.pageManuel ? `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 5px; border-radius:4px; font-size:11px;">📘 ${escHTML(a.pageManuel)}</span> ` : ''}${a.varianteJaune ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 5px; border-radius:4px; font-size:11px;">📒 ${escHTML(a.varianteJaune)}</span>` : ''}`;
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong></td>
            <td><span class="filter-btn" style="padding:2px 6px; font-size:11px;">${escHTML(per)}</span></td>
            <td><span style="display:inline-block; padding:2px 7px; border-radius:4px; background:${coul.bg}; color:${coul.text}; font-size:11.5px; font-weight:bold;">${escHTML(a.matiere)}</span><br>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${a.typeRes ? `<small>[${escHTML(a.typeRes)}]</small>` : ''} ${detailsLivres} ${a.estEvaluation ? '<span class="badge-eval">🎯</span>' : ''}</td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button type="button" class="btn-action" style="padding:4px 8px;" onclick="assignerActivite('${a.id}')" title="Assigner à plusieurs élèves">📌 Élèves</button>
                    <button type="button" class="filter-btn" onclick="editerActiviteBase('${a.id}')">✏️</button>
                    <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerActiviteBase('${a.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ==========================================
// 8. ONGLET 4 : PROGRAMMATIONS P1 À P5
// ==========================================
function initProgFilters() {
    const selMat = document.getElementById('selectMatiereProg');
    if (!selMat) return;
    let val = selMat.value || 'Toutes';
    let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
    selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    selMat.value = val;
}

function affecterPeriodeActivite(idAct, per) {
    if (per) programmations[idAct] = per;
    else delete programmations[idAct];
    let act = baseDonnees.find(b => b.id === idAct);
    if (act) act.periode = per;
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

    let html = `<table class="table-classique"><thead><tr><th style="width:70px;">Niveau</th><th style="width:180px;">Matière / Séquence</th><th>Compétence</th><th>Ressource</th><th style="width:150px;">Période assignée</th></tr></thead><tbody>`;
    liste.forEach(a => {
        let p = programmations[a.id] || a.periode || "";
        let coul = getCouleurMatiereBandeau(a.matiere);
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong></td>
            <td><span style="background:${coul.bg}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${escHTML(a.matiere)}</span><br>${escHTML(a.sequence)}</td>
            <td>${escHTML(a.competence)}</td>
            <td><strong>${escHTML(a.ressource)}</strong></td>
            <td>
                <select onchange="affecterPeriodeActivite('${a.id}', this.value)" style="width:100%; font-weight:bold;">
                    <option value="" ${p === '' ? 'selected' : ''}>-- Non affectée --</option>
                    <option value="P1" ${p === 'P1' ? 'selected' : ''}>Période 1</option>
                    <option value="P2" ${p === 'P2' ? 'selected' : ''}>Période 2</option>
                    <option value="P3" ${p === 'P3' ? 'selected' : ''}>Période 3</option>
                    <option value="P4" ${p === 'P4' ? 'selected' : ''}>Période 4</option>
                    <option value="P5" ${p === 'P5' ? 'selected' : ''}>Période 5</option>
                </select>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    cont.innerHTML = html;
}

// ==========================================
// 9. ONGLET 5 : ÉTIQUETTES IMPRIMABLES
// ==========================================
function afficherChoixEtiquettes() {
    const selMat = document.getElementById('selectMatiereEtiquettes');
    if (selMat && selMat.options.length <= 1) {
        let mats = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))];
        selMat.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    }
    const niv = document.getElementById('selectNiveauEtiquettes') ? document.getElementById('selectNiveauEtiquettes').value : 'Tous';
    const mat = selMat ? selMat.value : 'Toutes';
    const cont = document.getElementById('listeChoixEtiquettes');
    if (!cont) return;

    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        if (niv !== 'Tous' && !(a.niveau || "").toUpperCase().includes(niv)) return false;
        if (mat !== 'Toutes' && (a.matiere || "").trim() !== mat) return false;
        return true;
    });

    cont.innerHTML = liste.map(a => `<label style="display:inline-block; width:280px; margin:3px 6px; font-size:13px; cursor:pointer;"><input type="checkbox" class="cb-etiq-item" value="${a.id}" checked> [${escHTML(a.niveau)}] ${escHTML(a.ressource)}</label>`).join('');
    genererEtiquettesAImprimer();
}

function cocherToutesEtiquettes(etat) {
    document.querySelectorAll('.cb-etiq-item').forEach(cb => cb.checked = etat);
    genererEtiquettesAImprimer();
}

function genererEtiquettesAImprimer() {
    const zone = document.getElementById('zoneApercuEtiquettes');
    if (!zone) return;
    let ids = [];
    document.querySelectorAll('.cb-etiq-item:checked').forEach(cb => ids.push(cb.value));
    let html = '';
    ids.forEach(id => {
        let a = baseDonnees.find(b => b.id === id);
        if (!a) return;
        let coul = getCouleurMatiereBandeau(a.matiere);
        let bgEtiq = a.visuel || calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes);
        html += `<div class="etiquette-item" style="background:${bgEtiq}; border-color:${coul.bg};">
            <div style="background:${coul.bg}; color:${coul.text}; font-size:11px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-bottom:6px;">${escHTML(a.matiere)} • ${escHTML(a.niveau)}</div>
            <div style="font-weight:bold; font-size:15px; margin-bottom:4px;">${escHTML(a.ressource)}</div>
            <div style="font-size:12px; color:#333;">${escHTML(a.sequence)} ${a.lecon ? '— '+escHTML(a.lecon) : ''}</div>
            <div style="margin-top:4px;">${formaterEtoiles(a.difficulte)}</div>
        </div>`;
    });
    zone.innerHTML = html;
}

// ==========================================
// 10. ONGLET 6 : FICHES PLANS IMPRIMABLES
// ==========================================
function changementEleveImpression() {
    const sel = document.getElementById('selectEleveImpression');
    const zone = document.getElementById('zoneFichesImpression');
    if (!sel || !zone) return;
    let val = sel.value || 'TOUS_ELEVES';
    idEleveImpressionCourant = val;

    let cibles = [];
    if (val === 'TOUS_ELEVES') cibles = getElevesTries();
    else if (val.startsWith('NIVEAU_')) {
        let niv = val.replace('NIVEAU_', '');
        cibles = getElevesTries().filter(e => (e.niveau || 'CP').toUpperCase() === niv);
    } else if (eleves[val]) cibles = [eleves[val]];

    if (cibles.length === 0) {
        zone.innerHTML = `<div class="empty-state"><p>Aucun élève à imprimer pour cette sélection.</p></div>`;
        return;
    }

    let html = '';
    cibles.forEach(e => {
        assurerStructureSemaines(e);
        let planObjs = getListeTrie(e.planHebdo, e.priorites || [], e.suivi || {});
        // Regroupement par matière avec respect strict des couleurs de bandeau
        let parMatiere = {};
        planObjs.forEach((act, idx) => {
            let m = act.matiere || "Autres";
            if (!parMatiere[m]) parMatiere[m] = [];
            parMatiere[m].push({ act, num: idx + 1 });
        });

        html += `<div class="fiche-plan-print">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1b4f72; padding-bottom:8px; margin-bottom:10px;">
                <div>
                    <h2 style="margin:0; border:none; padding:0; color:#1b4f72;">Plan de travail de ${escHTML(e.nom)} (${escHTML(e.niveau)})</h2>
                    <span style="font-size:13px; color:#555;">Semaine ${(e.semaineIndex || 0) + 1} ${(e.dateDebut && e.dateFin) ? `du ${e.dateDebut} au ${e.dateFin}` : ''}</span>
                </div>
                <div style="font-size:13px; text-align:right;">
                    Bilan : ☀️ ⛅ 🌧️ &nbsp;|&nbsp; Signature : ____________
                </div>
            </div>`;

        Object.keys(parMatiere).forEach(mat => {
            let coul = getCouleurMatiereBandeau(mat);
            html += `<div class="bandeau-matiere-print" style="background:${coul.bg}; color:${coul.text}; border:1px solid ${coul.border};">${escHTML(mat.toUpperCase())}</div>
            <table class="table-classique" style="margin-top:0; margin-bottom:8px;">
                <thead>
                    <tr>
                        <th style="width:38px; text-align:center;">N°</th>
                        <th style="width:150px;">Séquence / Leçon</th>
                        <th>Compétence</th>
                        <th>Activité / Support</th>
                        <th style="width:80px; text-align:center;">Jour</th>
                        <th style="width:55px; text-align:center;">Fait</th>
                        <th style="width:65px; text-align:center;">Bilan</th>
                    </tr>
                </thead>
                <tbody>`;
            parMatiere[mat].forEach(item => {
                let a = item.act;
                let infos = getInfosActivitePourEleve(a, e);
                let jour = (e.joursAssignes && e.joursAssignes[a.id]) ? e.joursAssignes[a.id] : "";
                let estFait = e.valides && e.valides[a.id];
                html += `<tr>
                    <td style="text-align:center; font-weight:bold;">${item.num}</td>
                    <td>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
                    <td>${escHTML(a.competence)}</td>
                    <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infos.badgeLivre}</td>
                    <td style="text-align:center; font-weight:bold;">${escHTML(jour)}</td>
                    <td style="text-align:center; font-size:16px;">${estFait ? '☑️' : '⬜'}</td>
                    <td style="text-align:center;">🟢 🟠 🔴</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        });
        html += `</div>`;
    });
    zone.innerHTML = html;
}

// ==========================================
// 11. ONGLETS 7 & 8 : MATRICE ET BILAN ÉLÈVE
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

function genererBilanEleve() {
    const sel = document.getElementById('selectEleveBilan');
    const cont = document.getElementById('conteneurBilanEleve');
    if (!sel || !cont) return;
    let idEl = sel.value || idEleveCourant;
    if (!idEl || !eleves[idEl]) {
        cont.innerHTML = `<div class="empty-state"><p>Sélectionnez un élève pour afficher le bilan de ses acquisitions.</p></div>`;
        return;
    }
    let e = eleves[idEl];
    let hist = e.historique || [];
    if (hist.length === 0) {
        cont.innerHTML = `<div class="empty-state"><p>Aucune compétence validée dans l'historique de ${escHTML(e.nom)} pour le moment.</p></div>`;
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
        <table class="table-classique"><thead><tr><th style="width:95px;">Date</th><th style="width:180px;">Séquence</th><th>Compétence travaillée</th><th>Atelier validé</th></tr></thead><tbody>`;
        parMat[m].forEach(it => {
            html += `<tr><td>${escHTML(it.date)}</td><td>${escHTML(it.act.sequence)}</td><td><strong>${escHTML(it.act.competence)}</strong></td><td>${escHTML(it.act.ressource)}</td></tr>`;
        });
        html += `</tbody></table>`;
    });
    html += `</div>`;
    cont.innerHTML = html;
}

// ==========================================
// 12. NAVIGATION & INITIALISATION GLOBALE
// ==========================================
function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetPage = document.getElementById(idPage); if (targetPage) targetPage.classList.add('active'); if (element) element.classList.add('active');
    if (idPage === 'pageSuivi') { majListeEleves(); if (idEleveCourant) chargerEleve(); }
    if (idPage === 'pageEtiquettes') { afficherChoixEtiquettes(); }
    if (idPage === 'pageImpression') { if (idEleveCourant) idEleveImpressionCourant = idEleveCourant; majListeEleves(); changementEleveImpression(); }
    if (idPage === 'pageBase') { initNiveaux(); majSelectCouleursRapides(); afficherTypesGestion(); afficherBase(); }
    if (idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if (idPage === 'pageDashboard') { rafraichirDashboard(); }
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
