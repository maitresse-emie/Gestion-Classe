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
const KEY_PRINT_CFG = 'maConfigImpression_Finale';

let dashboardExpanded = new Set();
let dashboardArchives = JSON.parse(localStorage.getItem(KEY_ARCHIVES_TODO)) || [];
let afficherArchivesMode = false;
let programmations = JSON.parse(localStorage.getItem(KEY_PROG)) || {};

let printConfig = JSON.parse(localStorage.getItem(KEY_PRINT_CFG)) || {
    titre: "Plan de travail",
    consigne: "",
    meteo: "meteo",
    afficherCompteur: true,
    afficherSignature: true,
    afficherCommentaire: false
};

let dateGlobaleDebutISO = "", dateGlobaleDebutFR = "", dateGlobaleFinFR = "";
let filtreEtoilesDispo = 0;
let modeSaisieMultipleActif = false;

let imagesParType = JSON.parse(localStorage.getItem(KEY_IMAGES));
if (!imagesParType) {
    imagesParType = {
        "Atelier": { img: "", emoji: "🧩", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Jeu": { img: "", emoji: "🎲", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Fichier jaune": { img: "", emoji: "📒", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Vidéo": { img: "", emoji: "💻", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Anton": { img: "", emoji: "📱", remplacerNum: true, appliquerCouleur: false, isTablette: true },
        "Scratch": { img: "", emoji: "🐱", remplacerNum: true, appliquerCouleur: false, isTablette: true }
    };
} else {
    if (!imagesParType["Fichier jaune"]) {
        imagesParType["Fichier jaune"] = { img: "", emoji: "📒", remplacerNum: false, appliquerCouleur: false, isTablette: false };
    }
    Object.keys(imagesParType).forEach(k => {
        if (typeof imagesParType[k] === 'object' && imagesParType[k].isTablette === undefined) {
            imagesParType[k].isTablette = (k.toLowerCase() === 'anton' || k.toLowerCase() === 'scratch');
        }
        if (typeof imagesParType[k] === 'object' && imagesParType[k].emoji === undefined) {
            imagesParType[k].emoji = (k.toLowerCase() === 'jeu' ? '🎲' : (k.toLowerCase() === 'atelier' ? '🧩' : '📌'));
        }
    });
}

let baseDonnees = JSON.parse(localStorage.getItem(KEY_ATELIERS));
if (!baseDonnees || !Array.isArray(baseDonnees)) baseDonnees = [];

let eleves = JSON.parse(localStorage.getItem(KEY_ELEVES));
if (!eleves || typeof eleves !== 'object') eleves = {};

function getEmojiMatiere(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("vocabulaire") || m.includes("ecriture") || m.includes("phonologie")) return "🔤";
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure") || m.includes("probleme")) return "🔢";
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie") || m.includes("plastique")) return "🎨";
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite") || m.includes("natation")) return "🏃";
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) return "🗺️";
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) return "🧬";
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol") || m.includes("lv")) return "🇬🇧";
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) return "⚖️";
    return "📘";
}

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

// ==========================================
// GESTION DES PARCOURS & VISUELS ATELIERS
// ==========================================
function estEleveCM(eleveOuNiveau) {
    let niv = typeof eleveOuNiveau === 'string' ? eleveOuNiveau : (eleveOuNiveau && eleveOuNiveau.niveau ? eleveOuNiveau.niveau : "");
    niv = niv.toUpperCase().trim();
    return (niv === "CM1" || niv === "CM2");
}

function calculerPagePlusUn(val) {
    if (!val || !val.trim()) return "";
    let str = val.trim();
    let m = str.match(/^(.*?p\.?\s*)(\d+)(.*)$/i);
    if (m) return m[1] + (parseInt(m[2], 10) + 1) + m[3];
    let mNum = str.match(/^(\d+)(.*)$/);
    if (mNum) return (parseInt(mNum[1], 10) + 1) + mNum[2];
    return str;
}

function getInfosActivitePourEleve(act, eleve) {
    let useJaune = Boolean(eleve && eleve.fichierJaune && act && act.varianteJaune && act.varianteJaune.trim() !== "");
    if (useJaune) {
        let detailPage = act.varianteJaune.trim();
        let badgeLivre = `<span style="background:#ffe599; color:#7c2d12; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;">📒 ${escHTML(detailPage)}</span>`;
        let typeEffectif = (imagesParType["Fichier jaune"] && imagesParType["Fichier jaune"].img) ? "Fichier jaune" : (act.typeRes || "");
        return { useJaune: true, detailPage, badgeLivre, typeEffectif, couleurForcee: "#ffe599" };
    }

    let detailPage = (act && act.pageManuel) ? act.pageManuel.trim() : "";
    let badgeLivre = "";

    if (eleve && estEleveCM(eleve)) {
        let parcoursEl = eleve.parcours || (eleve.niveau.toUpperCase() === "CM2" ? "orange" : "jaune");
        let aDeuxParcours = Boolean(act && act.pageOrange && act.pageOrange.trim() !== "");
        if (parcoursEl === "orange" && aDeuxParcours) {
            detailPage = act.pageOrange.trim();
            badgeLivre = `<span style="background:#fdebd0; color:#9c640c; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f39c12;" title="Parcours Orange">${escHTML(detailPage)}</span>`;
        } else if (detailPage) {
            if (aDeuxParcours) {
                badgeLivre = `<span style="background:#fef9e7; color:#7d6608; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;" title="Parcours Jaune">${escHTML(detailPage)}</span>`;
            } else {
                badgeLivre = `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>`;
            }
        }
    } else {
        if (detailPage) {
            badgeLivre = `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>`;
        }
    }

    return {
        useJaune: false,
        detailPage,
        badgeLivre,
        typeEffectif: (act && act.typeRes) ? act.typeRes : "",
        couleurForcee: (act && act.visuel) ? act.visuel : ""
    };
}

// Ordre demandé : [Image du type] [Emoji matière] [N° Atelier (Symbole)]
function getRepereAtelierHtml(act, eleve, tailleMaxImg = 28) {
    let infos = getInfosActivitePourEleve(act, eleve);
    let typeKey = "";
    if (imagesParType) {
        for (let k in imagesParType) {
            if (k.trim().toLowerCase() === (infos.typeEffectif || "").trim().toLowerCase()) {
                typeKey = k;
                break;
            }
        }
    }
    let typeCfg = typeKey ? imagesParType[typeKey] : null;
    let imgUrl = "";
    if (act && act.imageSpecifique && act.imageSpecifique.trim() !== "") {
        imgUrl = formaterLienImage(act.imageSpecifique);
    } else if (typeCfg && typeCfg.img && typeCfg.img.trim() !== "") {
        imgUrl = formaterLienImage(typeCfg.img);
    }

    let emojiType = (typeCfg && typeCfg.emoji) ? typeCfg.emoji : "";
    let emojiMat = getEmojiMatiere(act ? act.matiere : "");
    let sym = (act && act.symbole) ? act.symbole.trim() : "";

    let visualPrefix = "";
    if (imgUrl && !imgUrl.startsWith('#')) {
        visualPrefix = `<img src="${escHTML(imgUrl)}" style="max-height:${tailleMaxImg}px; max-width:50px; object-fit:contain; vertical-align:middle; margin-right:3px;">`;
    } else if (emojiType) {
        visualPrefix = `<span style="font-size:${tailleMaxImg}px; vertical-align:middle; margin-right:3px;">${emojiType}</span>`;
    }

    let html = `${visualPrefix}<span style="vertical-align:middle; font-size:${Math.max(12, tailleMaxImg - 6)}px; margin-right:3px;">${emojiMat}</span><strong>${escHTML(sym)}</strong>`;
    let bg = infos.couleurForcee || calculerCouleurAutomatique(act ? act.matiere : "", act ? act.niveau : "", infos.typeEffectif);
    return { html, bg, typeEffectif: infos.typeEffectif };
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
    if (estEleveCM(e)) {
        if (e.parcours !== "jaune" && e.parcours !== "orange") {
            e.parcours = (e.niveau.toUpperCase() === "CM2") ? "orange" : "jaune";
        }
    } else {
        delete e.parcours;
    }
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
    let nouvPrintCfg = parseSiString(data.printConfig || data[KEY_PRINT_CFG]);

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
    if (nouvPrintCfg && typeof nouvPrintCfg === 'object') { printConfig = { ...printConfig, ...nouvPrintCfg }; localStorage.setItem(KEY_PRINT_CFG, JSON.stringify(printConfig)); }
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
    chargerConfigImpressionUI();
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
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, printConfig: printConfig, theme: localStorage.getItem(KEY_THEME) || 'pastel', exportedAt: new Date().toISOString() };
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
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, printConfig: printConfig, theme: localStorage.getItem(KEY_THEME) || 'pastel', updatedAt: new Date().toISOString() };
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
            if (statut) { statut.innerText = "ℹ️ Cloud prêt. Vos données locales sont conservées."; statut.style.color = "#2980b9"; }
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
// 3. UTILITAIRES, TRI FIXE & THÈMES VISUELS
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

function getListeTrie(idsArray, priosArray = []) {
    if (!idsArray) return [];
    let planObjects = idsArray.map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
    planObjects.sort((a, b) => {
        let prioA = (priosArray && priosArray.includes(a.id)) ? 1 : 0;
        let prioB = (priosArray && priosArray.includes(b.id)) ? 1 : 0;
        if (prioA !== prioB) return prioB - prioA;
        let matA = nettoyerNomPourTri(a.matiere), matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = (a.sequence || "").trim(), sB = (b.sequence || "").trim();
        if (sA !== sB) return sA.localeCompare(sB, 'fr');
        let cA = (a.competence || "").trim(), cB = (b.competence || "").trim();
        if (cA !== cB) return cA.localeCompare(cB, 'fr');
        let evalDiff = (a.estEvaluation ? 1 : 0) - (b.estEvaluation ? 1 : 0);
        if (evalDiff !== 0) return evalDiff;
        return (a.ressource || "").localeCompare(b.ressource || "", 'fr');
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
// Fonction dédiée pour récupérer l'émoji exact correspondant à la matière ou la séquence renseignée dans votre base
function getEmojiMatiere(matiere, sequence = "") {
    let text = ((matiere || "") + " " + (sequence || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (text.includes("orthographe")) return "✅";
    if (text.includes("ecriture")) return "✏️";
    if (text.includes("conjugaison")) return "📚";
    if (text.includes("grammaire")) return "🔤";
    if (text.includes("lexique") || text.includes("vocabulaire")) return "🧑‍🎓";
    
    if (text.includes("algebre") || text.includes("proportionnalite") || text.includes("calcul") || text.includes("operation")) return "➗";
    if (text.includes("mesure")) return "📏";
    if (text.includes("geometrie") || text.includes("espace")) return "🔷";
    if (text.includes("programmation") || text.includes("scratch")) return "🤖";
    if (text.includes("numeration") || text.includes("nombre")) return "🧮";

    // Par défaut selon la matière générale
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("poesie")) return "🔤";
    if (m.includes("math")) return "🔢";
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("plastique")) return "🎨";
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite")) return "🏃";
    if (m.includes("histoire") || m.includes("geographie") || m.includes("temps") || m.includes("espace")) return "🗺️";
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere")) return "🧬";
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol")) return "🇬🇧";
    if (m.includes("emc") || m.includes("moral") || m.includes("civique")) return "⚖️";
    return "📘";
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
    if (basculerDansPlan) eleve.planHebdo.push(idActivite);
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

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || []);
    planObjects.forEach((a, index) => {
        const num = index + 1;
        let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Éval</span>` : '';
        let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
        let isPrio = (eleve.priorites && eleve.priorites.includes(a.id));
        let logoDebutLigne = statutSuivi === 'a_revoir' ? `👩‍🏫 ` : (statutSuivi === 'a_refaire' ? `🔄 ` : "");
        let infosL = getInfosActivitePourEleve(a, eleve);
        let rep = getRepereAtelierHtml(a, eleve, 28);

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
            <td style="text-align:center; background:${rep.bg};">${rep.html}</td>
            <td style="text-align:center;">${selectJourHtml}</td>
            <td>${actionHtml}</td>
        </tr>`;
    });
    if (eleve.planHebdo.length === 0) tbodyApercu.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#7f8c8d; padding:20px;">Plan vide.</td></tr>';

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
// 5. ONGLET 2 : IMPRESSION FICHES ÉLÈVES (N° FIXES + TABLEAU SEMAINIER)
// ==========================================
function chargerConfigImpressionUI() {
    let t = document.getElementById('printInputTitre'); if (t) t.value = printConfig.titre || "Plan de travail";
    let c = document.getElementById('printInputConsigne'); if (c) c.value = printConfig.consigne || "";
    let m = document.getElementById('printSelectMeteo'); if (m) m.value = printConfig.meteo || "meteo";
    let cbCpt = document.getElementById('printCbCompteur'); if (cbCpt) cbCpt.checked = printConfig.afficherCompteur !== false;
    let cbSig = document.getElementById('printCbSignature'); if (cbSig) cbSig.checked = printConfig.afficherSignature !== false;
    let cbCom = document.getElementById('printCbCommentaire'); if (cbCom) cbCom.checked = Boolean(printConfig.afficherCommentaire);
}

function sauvegarderConfigImpression() {
    let t = document.getElementById('printInputTitre'), c = document.getElementById('printInputConsigne'), m = document.getElementById('printSelectMeteo');
    let cbCpt = document.getElementById('printCbCompteur'), cbSig = document.getElementById('printCbSignature'), cbCom = document.getElementById('printCbCommentaire');
    printConfig = {
        titre: t ? t.value : "Plan de travail",
        consigne: c ? c.value : "",
        meteo: m ? m.value : "meteo",
        afficherCompteur: cbCpt ? cbCpt.checked : true,
        afficherSignature: cbSig ? cbSig.checked : true,
        afficherCommentaire: cbCom ? cbCom.checked : false
    };
    localStorage.setItem(KEY_PRINT_CFG, JSON.stringify(printConfig));
    declencherAutoSaveFirebase();
    rafraichirFicheImpression();
}

function changementEleveImpression() {
    const sel = document.getElementById('selectEleveImpression'), selSem = document.getElementById('selectSemaineImpression'), dateInp = document.getElementById('dateImpressionInput');
    if (!sel) return;
    idEleveImpressionCourant = sel.value || 'TOUS_ELEVES';
    if (eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant]; assurerStructureSemaines(e);
        if (selSem) { selSem.innerHTML = e.semaines.map((s, i) => `<option value="${i}">Semaine ${i + 1} ${s.dateDebut ? `(${s.dateDebut})` : ''}</option>`).join(''); selSem.value = e.semaineIndex || 0; }
        if (dateInp) dateInp.value = e.dateDebutISO || "";
    } else if (selSem) selSem.innerHTML = '<option value="0">Semaine active de chaque élève</option>';
    rafraichirFicheImpression();
}

function changerSemaineDepuisImpression(val) {
    if (eleves[idEleveImpressionCourant]) { chargerSemaineDepuisIndex(eleves[idEleveImpressionCourant], parseInt(val) || 0); sauvegarderEleves(); rafraichirFicheImpression(); }
}

function appliquerDateImpression(dateISO) {
    if (!dateISO) return;
    let res = calculerVendrediDepuisISO(dateISO);
    if (eleves[idEleveImpressionCourant]) {
        let e = eleves[idEleveImpressionCourant]; e.dateDebutISO = dateISO; e.dateDebut = res.debutFR; e.dateFin = res.finFR; syncEleveVersSemaineActive(e);
    } else {
        Object.values(eleves).forEach(e => { e.dateDebutISO = dateISO; e.dateDebut = res.debutFR; e.dateFin = res.finFR; syncEleveVersSemaineActive(e); });
    }
    sauvegarderEleves(); rafraichirFicheImpression();
}

function genererHtmlFicheEleve(e, format = 'A4') {
    assurerStructureSemaines(e);
    let planObjects = getListeTrie(e.planHebdo, e.priorites || []);

    let titreFiche = (printConfig && printConfig.titre) ? printConfig.titre.trim() : "Plan de travail";
    let consignePerso = (printConfig && printConfig.consigne && printConfig.consigne.trim() !== "")
        ? escHTML(printConfig.consigne.trim())
        : `Choisis tes ateliers et écris leur <strong>N°</strong> dans le semainier (les numéros <u>soulignés</u> sont déjà placés au jour imposé, 👩‍🏫 = avec la maîtresse). <strong>Entoure</strong> le numéro quand tu commences, <strong>barre-le</strong> quand c'est terminé !`;

    let joursJours = { "Lundi": [], "Mardi": [], "Jeudi": [], "Vendredi": [] };
    planObjects.forEach((a, idx) => {
        let num = idx + 1;
        let jImp = (e.joursAssignes && e.joursAssignes[a.id]) ? e.joursAssignes[a.id] : "";
        if (jImp && joursJours[jImp]) {
            let st = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
            let icone = st === 'a_revoir' ? '👩‍🏫' : (st === 'a_refaire' ? '🔄' : '');
            joursJours[jImp].push(`${icone}<u>${num}</u>`);
        }
    });

    let nbLignesPlanning = Math.max(4, Math.ceil(planObjects.length / 3), joursJours["Lundi"].length, joursJours["Mardi"].length, joursJours["Jeudi"].length, joursJours["Vendredi"].length);
    let planningRowsHtml = "";
    for (let i = 0; i < nbLignesPlanning; i++) {
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

    let planningTableHtml = `<div style="margin-bottom:8px;">
        <table class="planning-table">
            <thead>
                <tr><th>LUNDI</th><th>MARDI</th><th>JEUDI</th><th>VENDREDI</th></tr>
            </thead>
            <tbody>${planningRowsHtml}</tbody>
        </table>
    </div>`;

    let rowsHtml = "";
    let derniereCleSeq = "";

    planObjects.forEach((a, index) => {
        const num = index + 1;
        let cleSeq = `${a.matiere || ''}||${a.sequence || ''}`;
        if (cleSeq !== derniereCleSeq) {
            derniereCleSeq = cleSeq;
            let coul = getCouleurMatiereBandeau(a.matiere);
            rowsHtml += `<tr class="sequence-separator-row">
                <td colspan="7" style="background-color: ${coul.bg} !important; color: ${coul.text} !important; border-color: ${coul.border} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    📑 ${escHTML((a.matiere || '').toUpperCase())} — Séquence : ${escHTML(a.sequence || '')}
                </td>
            </tr>`;
        }

        let infos = getInfosActivitePourEleve(a, e);
        let rep = getRepereAtelierHtml(a, e, 32);
        let jourImp = (e.joursAssignes && e.joursAssignes[a.id]) ? e.joursAssignes[a.id] : "";
        let estValide = e.valides && e.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
        let logoMaitresseDebut = statutSuivi === 'a_revoir' ? '👩‍🏫 ' : (statutSuivi === 'a_refaire' ? '🔄 ' : '');
        let numCellClass = jourImp ? 'col-num num-jour-impose' : 'col-num';
        let resStyle = jourImp ? 'text-decoration:underline;' : '';
        let badgeEval = a.estEvaluation ? ` <span class="badge-eval">🎯 Éval</span>` : '';

        rowsHtml += `<tr class="${rowClass}">
            <td class="${numCellClass}" style="white-space:nowrap;">${logoMaitresseDebut}${num}</td>
            <td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)}</td>
            <td>${a.lecon ? '<em>' + escHTML(a.lecon) + '</em><br>' : ''}${escHTML(a.competence)}</td>
            <td>${logoMaitresseDebut}${formaterEtoiles(a.difficulte)}<strong style="${resStyle}">${escHTML(a.ressource)}</strong> ${infos.badgeLivre}${badgeEval}</td>
            <td class="col-center">${escHTML(infos.typeEffectif)}</td>
            <td class="col-center print-visual-cell" style="background-color:${rep.bg} !important; width:80px; text-align:center;">${rep.html}</td>
            <td class="col-center">${escHTML(a.personnes || '')}</td>
        </tr>`;
    });

    if (planObjects.length === 0) {
        rowsHtml = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d;">Aucune activité.</td></tr>`;
    }

    let blocsPied = [];
    if (!printConfig || printConfig.afficherCompteur !== false) {
        blocsPied.push(`<div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-between;"><strong>🏁 Bilan :</strong><span style="font-size:10.5px; font-weight:bold;">Ateliers terminés : ...... / ${planObjects.length}</span></div>`);
    }
    if (!printConfig || printConfig.meteo !== 'aucun') {
        let icones = `<span style="font-size:13px;">☀️</span> <span style="font-size:13px;">⛅</span> <span style="font-size:13px;">🌧️</span>`;
        if (printConfig && printConfig.meteo === 'smileys') icones = `<span style="font-size:13px;">😊</span> <span style="font-size:13px;">😐</span> <span style="font-size:13px;">😟</span>`;
        if (printConfig && printConfig.meteo === 'etoiles') icones = `<span style="font-size:13px;">⭐</span> <span style="font-size:13px;">⭐</span> <span style="font-size:13px;">⭐</span>`;
        blocsPied.push(`<div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-around;"><strong>🌤️ Bilan :</strong> ${icones}</div>`);
    }
    if (!printConfig || printConfig.afficherSignature !== false) {
        blocsPied.push(`<div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-between;"><strong>✍️ Signature :</strong> <span>..................</span></div>`);
    }

    let bilanBasPageHtml = blocsPied.length > 0 ? `<div style="display:flex; justify-content:space-between; align-items:stretch; gap:8px; margin-top:6px; font-size:10px;">${blocsPied.join('')}</div>` : '';
    let commBasHtml = (printConfig && printConfig.afficherCommentaire) ? `<div style="margin-top:6px; border:1px dashed #7f8c8d; border-radius:4px; padding:5px 8px; font-size:11px; min-height:32px;"><strong>💬 Mot de l'enseignante :</strong></div>` : '';

    return `<div class="fiche-plan-print plan-eleve-page ${format === 'A4' ? 'a4-page' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1b4f72; padding-bottom:5px; margin-bottom:6px;">
            <h2 style="margin:0; border:none; padding:0; font-size:17px; color:#1b4f72;">${escHTML(titreFiche)} — ${escHTML(e.nom)} (${escHTML(e.niveau)})</h2>
            <span style="font-size:12px; color:#2c3e50; font-weight:bold;">Semaine ${(e.semaineIndex || 0) + 1} ${(e.dateDebut && e.dateFin) ? `du ${e.dateDebut} au${e.dateFin}` : ''}</span>
        </div>
        <div style="background:#f8f9fa; border-left:4px solid #1b4f72; padding:4px 8px; font-size:11px; margin-bottom:6px; border-radius:4px;">📌 ${consignePerso}</div>
        ${planningTableHtml}
        <table class="table-classique" style="margin-top:0; margin-bottom:6px;">
            <thead>
                <tr>
                    <th class="col-num">N°</th>
                    <th style="width:135px;">Matière & Séquence</th>
                    <th>Compétence visée</th>
                    <th>Ressource à réaliser</th>
                    <th class="col-center" style="width:75px;">Type</th>
                    <th class="col-center" style="width:80px;">N° Atelier</th>
                    <th class="col-center" style="width:55px;">Nb Pers.</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        ${bilanBasPageHtml}
        ${commBasHtml}
    </div>`;
}

function rafraichirFicheImpression() {
    const sel = document.getElementById('selectEleveImpression');
    const fmt = document.getElementById('selectFormatImpression') ? document.getElementById('selectFormatImpression').value : 'A4';
    const zone = document.getElementById('zoneFichesImpression'); if (!zone) return;
    let val = sel ? (sel.value || 'TOUS_ELEVES') : 'TOUS_ELEVES';
    let cibles = [];
    if (val === 'TOUS_ELEVES') cibles = getElevesTries();
    else if (val.startsWith('NIVEAU_')) cibles = getElevesTries().filter(e => (e.niveau || 'CP').toUpperCase() === val.replace('NIVEAU_', ''));
    else if (eleves[val]) cibles = [eleves[val]];
    if (cibles.length === 0) { zone.innerHTML = `<div class="empty-state"><p>Aucun élève à imprimer.</p></div>`; return; }

    if (fmt === 'A5') {
        let html = '';
        for (let i = 0; i < cibles.length; i += 2) {
            html += `<div class="conteneur-a5-pair">` + genererHtmlFicheEleve(cibles[i], 'A5') + (cibles[i + 1] ? genererHtmlFicheEleve(cibles[i + 1], 'A5') : '') + `</div>`;
        }
        zone.innerHTML = html;
    } else {
        zone.innerHTML = cibles.map(e => genererHtmlFicheEleve(e, 'A4')).join('');
    }
}

// ==========================================
// 6. TABLEAU DE BORD, PROG, ÉTIQUETTES, MATRICE & NAVIGATION
// ==========================================
function toggleAfficherArchives() {
    afficherArchivesMode = !afficherArchivesMode;
    let btn = document.getElementById('btnToggleArchivesDash');
    if (btn) btn.innerText = afficherArchivesMode ? "🙈 Masquer les archives" : "👁️ Voir les archives";
    rafraichirDashboard();
}
function archiverItem(cle) { if (!dashboardArchives.includes(cle)) dashboardArchives.push(cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); rafraichirDashboard(); }
function restaurerArchive(cle) { dashboardArchives = dashboardArchives.filter(k => k !== cle); localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); rafraichirDashboard(); }
function viderArchives() { if (confirm("Vider les archives ?")) { dashboardArchives = []; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); rafraichirDashboard(); } }
function setSuivi(idEl, idAct, statut) {
    let e = eleves[idEl]; if (!e) return;
    if (!e.suivi) e.suivi = {};
    if (!statut) delete e.suivi[idAct];
    else e.suivi[idAct] = { statut: statut, commentaire: (e.suivi[idAct] && e.suivi[idAct].commentaire) || "" };
    sauvegarderEleves(); rafraichirDashboard();
}
function validerDepuisDashboard(idEl, idAct) { let e = eleves[idEl]; if (!e) return; marquerCommeValideSansRafraichir(idAct, e); sauvegarderEleves(); rafraichirDashboard(); showToast("Validé !", "success"); }
function toggleExpandEleveDash(idEl) { if (dashboardExpanded.has(idEl)) dashboardExpanded.delete(idEl); else dashboardExpanded.add(idEl); rafraichirDashboard(); }
function ouvrirEleveDepuisDashboard(idEl) { idEleveCourant = idEl; let sel = document.getElementById('selectEleveProfile'); if (sel) sel.value = idEl; changerOnglet('pageSuivi', document.querySelectorAll('.nav-btn')[0]); }

function rafraichirDashboard() {
    const cont = document.getElementById('dashboardContent'); if (!cont) return;
    const listeEl = getElevesTries();
    if (listeEl.length === 0) { cont.innerHTML = `<div class="empty-state"><h3>Aucun élève enregistré.</h3></div>`; return; }

    let lignesRemediation = '', tachesTablettesMap = {};
    listeEl.forEach(e => {
        assurerStructureSemaines(e);
        (e.planHebdo || []).forEach(idAct => {
            let act = baseDonnees.find(b => b.id === idAct); if (!act) return;
            let estVal = e.valides && e.valides[idAct], s = e.suivi && e.suivi[idAct] ? e.suivi[idAct] : null;
            if (s && (s.statut === 'a_revoir' || s.statut === 'a_refaire')) {
                let cleRem = `${e.id}_${idAct}`, estArch = dashboardArchives.includes(cleRem);
                if (afficherArchivesMode || !estArch) {
                    let coul = getCouleurMatiereBandeau(act.matiere);
                    lignesRemediation += `<tr style="${estArch ? 'opacity:0.5;' : ''}"><td><strong>[${escHTML(e.niveau)}] ${escHTML(e.nom)}</strong></td><td><span style="background:${coul.bg}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">${escHTML(act.matiere)}</span> ${escHTML(act.sequence)}</td><td><strong>${escHTML(act.ressource)}</strong></td><td>${s.statut === 'a_revoir' ? '👩‍🏫' : '🔄'}</td><td><button type="button" class="btn-valid" style="padding:3px 7px;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">✅</button><button type="button" class="filter-btn" style="padding:3px 7px;" onclick="${estArch ? `restaurerArchive('${cleRem}')` : `archiverItem('${cleRem}')`}">${estArch ? '↩️' : '📥'}</button></td></tr>`;
                }
            }
            if (!estVal && estActiviteTablette(act)) {
                let cleTab = `tab_${act.id}`, estArchTab = dashboardArchives.includes(cleTab);
                if (afficherArchivesMode || !estArchTab) {
                    if (!tachesTablettesMap[act.id]) tachesTablettesMap[act.id] = { act, elevesNoms: [], cleTab, estArchTab };
                    tachesTablettesMap[act.id].elevesNoms.push(`${e.nom} (${e.niveau})`);
                }
            }
        });
    });

    let tabKeys = Object.keys(tachesTablettesMap);
    let html = `<div class="grid-2-cols" style="margin-bottom:20px;">
        <div class="card-panel" style="border-left:5px solid #c0392b;"><h3 style="color:#c0392b; margin-bottom:10px;">👩‍🏫 Remédiations</h3>${lignesRemediation ? `<table class="table-classique"><thead><tr><th>Élève</th><th>Matière</th><th>Atelier</th><th>Statut</th><th>Action</th></tr></thead><tbody>${lignesRemediation}</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune remédiation en cours.</p>`}</div>
        <div class="card-panel" style="border-left:5px solid #8e44ad;"><h3 style="color:#6c3483; margin-bottom:10px;">📱 Tablettes (Anton / Scratch)</h3>${tabKeys.length > 0 ? `<table class="table-classique"><thead><tr><th>Support</th><th>Activité</th><th>Élèves</th><th>Action</th></tr></thead><tbody>` + tabKeys.map(k => {
            let item = tachesTablettesMap[k];
            return `<tr style="${item.estArchTab ? 'opacity:0.5;' : ''}"><td><strong>${escHTML(item.act.typeRes)}</strong></td><td><strong>${escHTML(item.act.ressource)}</strong></td><td>${escHTML(item.elevesNoms.join(', '))}</td><td><button type="button" class="filter-btn" onclick="${item.estArchTab ? `restaurerArchive('${item.cleTab}')` : `archiverItem('${item.cleTab}')`}">${item.estArchTab ? '↩️' : '☑️'}</button></td></tr>`;
        }).join('') + `</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune activité tablette.</p>`}</div>
    </div><div class="dashboard-grid">`;

    listeEl.forEach(e => {
        let total = (e.planHebdo || []).length, nbValides = (e.planHebdo || []).filter(id => e.valides && e.valides[id]).length;
        let pct = total > 0 ? Math.round((nbValides / total) * 100) : 0;
        let nbTab = (e.planHebdo || []).map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        let isExp = dashboardExpanded.has(e.id), badgeParc = estEleveCM(e) ? ((e.parcours === 'orange') ? ' 🟠' : ' 🟡') : '';
        let detailsPlanHtml = isExp ? `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed #ccc; font-size:12.5px;">` + getListeTrie(e.planHebdo, e.priorites || []).map((a, idx) => {
            let fait = e.valides && e.valides[a.id], st = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f1f5f9;"><span style="${fait ? 'text-decoration:line-through; color:#27ae60;' : ''}"><strong>${idx + 1}.</strong> ${escHTML(a.ressource)}</span><div style="display:flex; gap:3px;">${!fait ? `<button type="button" class="filter-btn" style="padding:1px 5px;" onclick="validerDepuisDashboard('${e.id}', '${a.id}')">✅</button><button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_revoir' ? 'background:#c0392b; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_revoir' ? '' : 'a_revoir'}')">👩‍🏫</button><button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_refaire' ? 'background:#e67e22; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_refaire' ? '' : 'a_refaire'}')">🔄</button>` : '✅'}</div></div>`;
        }).join('') + `</div>` : '';

        html += `<div class="dash-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:#1b4f72; cursor:pointer;" onclick="toggleExpandEleveDash('${e.id}')">${isExp ? '▼' : '▶'} [${escHTML(e.niveau)}] ${escHTML(e.nom)}${badgeParc} ${e.fichierJaune ? '📒' : ''}</strong>
                <button type="button" class="filter-btn" onclick="ouvrirEleveDepuisDashboard('${e.id}')">Plan ➔</button>
            </div>
            <div style="font-size:12.5px; color:#555; margin-top:6px;">Semaine ${(e.semaineIndex || 0) + 1} • 📱 Tablettes : ${nbTab}/${e.maxTablettes ?? 2}</div>
            <div class="dash-progress-bar"><div class="dash-progress-fill" style="width:${pct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;"><span>${nbValides} / ${total} validés</span><span style="color:#27ae60;">${pct}%</span></div>
            ${detailsPlanHtml}
        </div>`;
    });
    cont.innerHTML = html + `</div>`;
}

function changeronglet(idPage, element) { changerOnglet(idPage, element); }
function changerOnglet(idPage, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetPage = document.getElementById(idPage); if (targetPage) targetPage.classList.add('active'); if (element) element.classList.add('active');
    if (idPage === 'pageSuivi') { majListeEleves(); if (idEleveCourant) chargerEleve(); }
    if (idPage === 'pageImpression') { if (idEleveCourant) idEleveImpressionCourant = idEleveCourant; majListeEleves(); chargerConfigImpressionUI(); changementEleveImpression(); }
    if (idPage === 'pageDashboard') { rafraichirDashboard(); }
    if (idPage === 'pageBase') { initNiveaux(); majSelectCouleursRapides(); verifierNiveauxCMFormSimple(); afficherBase(); }
    if (idPage === 'pageProg') { initProgFilters(); afficherProgrammation(); }
    if (idPage === 'pageEtiquettes') { afficherChoixEtiquettes(); }
    if (idPage === 'pageMatrice') { genererMatriceCompetences(); }
    if (idPage === 'pageBilan') { majListeEleves(); genererBilanEleve(); }
    if (idPage === 'pageSave') { calculTailleStockage(); tenterConnexionAutoFirebase(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener("DOMContentLoaded", function() {
    appliquerThemeVisuel(localStorage.getItem(KEY_THEME) || 'pastel');
    majVisibiliteParcoursCreation(document.getElementById('nouvelEleveNiveau')?.value || 'CP');
    verifierNiveauxCMFormSimple();
    rafraichirToutApresImport();
    tenterConnexionAutoFirebase();
});
