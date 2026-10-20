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
// ==========================================
// 4. ONGLET 1 : PLAN & SUIVI ÉLÈVES
// ==========================================
function majVisibiliteParcoursCreation(niveau) {
    let selParc = document.getElementById('nouvelEleveParcours');
    if (!selParc) return;
    if (estEleveCM(niveau)) {
        selParc.style.display = 'inline-block';
        selParc.value = (niveau.toUpperCase() === 'CM2') ? 'orange' : 'jaune';
    } else {
        selParc.style.display = 'none';
    }
}

function majVisibiliteParcoursEdition(niveau) {
    let bloc = document.getElementById('blocEditEleveParcours');
    let sel = document.getElementById('editEleveParcoursSelect');
    if (!bloc || !sel) return;
    if (estEleveCM(niveau)) {
        bloc.style.display = 'block';
        if (idEleveCourant && eleves[idEleveCourant] && eleves[idEleveCourant].parcours) {
            sel.value = eleves[idEleveCourant].parcours;
        } else {
            sel.value = (niveau.toUpperCase() === 'CM2') ? 'orange' : 'jaune';
        }
    } else {
        bloc.style.display = 'none';
    }
}

function changerParcoursEleve(nouvParcours) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    if (!estEleveCM(e)) return;
    e.parcours = (nouvParcours === 'orange') ? 'orange' : 'jaune';
    sauvegarderEleves(); majListeEleves(); afficherPlanHebdo(); afficherRessourcesDisponibles();
    showToast(e.parcours === 'orange' ? "🟠 Parcours Orange sélectionné !" : "🟡 Parcours Jaune sélectionné !");
}

function toggleFichierJauneEleve(isChecked) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    eleves[idEleveCourant].fichierJaune = Boolean(isChecked);
    sauvegarderEleves(); majListeEleves(); afficherPlanHebdo(); afficherRessourcesDisponibles();
    showToast(isChecked ? "📒 Mode Fichier Jaune activé !" : "📘 Mode Manuel Standard activé !");
}

function creerEleve() {
    const nomInput = document.getElementById('nouvelEleveNom'), nivSelect = document.getElementById('nouvelEleveNiveau'), parcSelect = document.getElementById('nouvelEleveParcours'), cbJauneNew = document.getElementById('nouvelEleveFichierJaune');
    if (!nomInput) return;
    const nom = nomInput.value.trim(); if (!nom) { showToast("Indiquez le prénom de l'élève.", "error"); return; }
    const niveau = nivSelect ? nivSelect.value : "CP";
    const id = 'eleve_' + Date.now();
    let nouvEl = {
        id: id, nom: nom, niveau: niveau,
        fichierJaune: Boolean(cbJauneNew && cbJauneNew.checked),
        planHebdo: [], enAttente: [], historique: [], masquees: [], priorites: [],
        maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {}, joursAssignes: {},
        dateDebutISO: "", dateDebut: "", dateFin: ""
    };
    if (estEleveCM(niveau)) nouvEl.parcours = parcSelect ? parcSelect.value : (niveau === "CM2" ? "orange" : "jaune");
    eleves[id] = nouvEl;
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
    majVisibiliteParcoursEdition(e.niveau || "CP");
    let selParc = document.getElementById('editEleveParcoursSelect');
    if (selParc && estEleveCM(e)) selParc.value = e.parcours || (e.niveau.toUpperCase() === "CM2" ? "orange" : "jaune");
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) cbEditJaune.checked = Boolean(e.fichierJaune);
    ouvrirModal('modalEditEleve');
}

function validerEditionEleve() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let nouveauNom = document.getElementById('editEleveNomInput').value.trim(), nouveauNiveau = document.getElementById('editEleveNiveauSelect').value;
    if (!nouveauNom) { showToast("Le prénom ne peut pas être vide.", "error"); return; }
    let e = eleves[idEleveCourant];
    e.nom = nouveauNom; e.niveau = nouveauNiveau;
    if (estEleveCM(nouveauNiveau)) {
        let selParc = document.getElementById('editEleveParcoursSelect');
        e.parcours = selParc ? selParc.value : (nouveauNiveau === "CM2" ? "orange" : "jaune");
    } else { delete e.parcours; }
    let cbEditJaune = document.getElementById('editEleveFichierJauneInput'); if (cbEditJaune) e.fichierJaune = cbEditJaune.checked;
    sauvegarderEleves(); fermerModal('modalEditEleve'); majListeEleves(); chargerEleve(); rafraichirDashboard(); showToast("Élève mis à jour !", "success");
}

function supprimerEleve() {
    if (!idEleveCourant) return;
    if (confirm("Supprimer définitivement cet élève et son historique ?")) {
        delete eleves[idEleveCourant]; idEleveCourant = null; idEleveImpressionCourant = null;
        sauvegarderEleves(); majListeEleves(); chargerEleve(); rafraichirDashboard();
    }
}

function postEditGlobal() { trierBaseDonnees(); sauvegarderBase(); initialiserSelectsFormulaire(); initNiveaux(); initProgFilters(); afficherProgrammation(); afficherBase(); }

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
    afficherRessourcesDisponibles(); showToast(`Semaine ${e.semaines.length} créée !`, "success");
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
        if (zoneTravail) zoneTravail.style.display = 'none'; if (message) message.style.display = 'block';
        if (btnEdit) btnEdit.style.display = 'none'; if (btnSuppr) btnSuppr.style.display = 'none'; return;
    }
    if (zoneTravail) zoneTravail.style.display = 'block'; if (message) message.style.display = 'none';
    if (btnEdit) btnEdit.style.display = 'inline-block'; if (btnSuppr) btnSuppr.style.display = 'inline-block';
    let e = eleves[idEleveCourant]; assurerStructureSemaines(e);
    document.querySelectorAll('.nomEleveAffiche').forEach(el => el.innerText = `${e.nom} (${e.niveau})`);
    let inputMax = document.getElementById('inputMaxAteliersEleve'), inputMaxTab = document.getElementById('inputMaxTablettesEleve'), maxAff = document.getElementById('maxAteliersAffiche'), cbJaune = document.getElementById('cbFichierJauneEleve');
    if (inputMax) inputMax.value = e.maxAteliers || 15; if (inputMaxTab) inputMaxTab.value = e.maxTablettes ?? 2; if (maxAff) maxAff.innerText = e.maxAteliers || 15;
    if (cbJaune) cbJaune.checked = Boolean(e.fichierJaune);

    let blocParc = document.getElementById('blocParcoursEleveSuivi'), selParc = document.getElementById('selectParcoursEleve');
    if (blocParc && selParc) {
        if (estEleveCM(e)) { blocParc.style.display = 'inline-block'; selParc.value = e.parcours || (e.niveau.toUpperCase() === "CM2" ? "orange" : "jaune"); }
        else { blocParc.style.display = 'none'; }
    }
    initialiserSelectsFormulaire(); majBarreSemainesUI(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles();
}

function initialiserSelectsFormulaire() {
    const selMat = document.getElementById('selectMatiere');
    let matieres = [...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let sequences = [...new Set(baseDonnees.map(b => (b.sequence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let competences = [...new Set(baseDonnees.map(b => (b.competence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

    let dlMat = document.getElementById('listeMatieresConnues'); if (dlMat) dlMat.innerHTML = matieres.map(m => `<option value="${escHTML(m)}">`).join('');
    let dlSeq = document.getElementById('listeSequencesConnues'); if (dlSeq) dlSeq.innerHTML = sequences.map(s => `<option value="${escHTML(s)}">`).join('');
    let dlComp = document.getElementById('listeCompetencesConnues'); if (dlComp) dlComp.innerHTML = competences.map(c => `<option value="${escHTML(c)}">`).join('');

    if (!selMat) return;
    let valActuelle = selMat.value;
    let html = '<option value="">-- 1. Choisir une matière (ou Toutes) --</option><option value="TOUTES_MATIERES">📚 Toutes les matières</option>';
    matieres.forEach(m => { html += `<option value="${escHTML(m)}">${escHTML(m)}</option>`; });
    selMat.innerHTML = html; if (valActuelle) selMat.value = valActuelle;
}

function changementMatiereSelection() {
    const selMat = document.getElementById('selectMatiere'), selSeq = document.getElementById('selectSequence');
    if (!selMat || !selSeq) return;
    let mat = selMat.value;
    let sequences = [...new Set(baseDonnees.filter(b => !mat || mat === 'TOUTES_MATIERES' || (b.matiere || "").trim() === mat).map(b => (b.sequence || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let html = '<option value="TOUTES_SEQUENCES">-- Toutes les séquences --</option>';
    sequences.forEach(s => { html += `<option value="${escHTML(s)}">${escHTML(s)}</option>`; });
    selSeq.innerHTML = html; afficherRessourcesDisponibles();
}

function filtrerEtoilesDispo(nb) {
    filtreEtoilesDispo = nb;
    [0, 1, 2, 3].forEach(n => { let btn = document.getElementById('btnEtoile' + n); if (btn) btn.classList.toggle('active', n === nb); });
    afficherRessourcesDisponibles();
}

function afficherRessourcesDisponibles() {
    const tbody = document.getElementById('tableRessourcesDispo'); if (!tbody || !idEleveCourant || !eleves[idEleveCourant]) return;
    const eleve = eleves[idEleveCourant];
    const mat = document.getElementById('selectMatiere') ? document.getElementById('selectMatiere').value : "";
    const seq = document.getElementById('selectSequence') ? document.getElementById('selectSequence').value : "";
    const per = document.getElementById('selectPeriodeDispo') ? document.getElementById('selectPeriodeDispo').value : "Toutes";

    if (!mat) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7f8c8d;">Choisissez une matière ci-dessus.</td></tr>'; return; }

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

    if (liste.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7f8c8d;">Aucune activité disponible.</td></tr>'; return; }

    let html = '';
    liste.forEach(a => {
        let infos = getInfosActivitePourEleve(a, eleve), rep = getRepereAtelierHtml(a, eleve, 24);
        let coul = getCouleurMatiereBandeau(a.matiere), perAct = programmations[a.id] || a.periode || "-";
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong><br><small style="color:#7f8c8d;">${escHTML(perAct)}</small></td>
            <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${coul.bg}; margin-right:4px;"></span><strong>${escHTML(a.matiere)}</strong><br>${escHTML(a.sequence)} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${escHTML(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infos.badgeLivre} ${a.estEvaluation ? '<span class="badge-eval">🎯 Éval</span>' : ''}</td>
            <td style="text-align:center; background:${rep.bg};">${rep.html}</td>
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
                    <button type="button" class="filter-btn" onclick="mettreEnAttente('${a.id}')">⏳</button>
                    <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')">✅</button>
                    <button type="button" class="filter-btn" onclick="masquerActivite('${a.id}')">🙈</button>
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
    let e = eleves[idEleveCourant]; if (!e.suivi) e.suivi = {};
    if (!statut) delete e.suivi[idActivite];
    else {
        let comm = prompt("Commentaire ou consigne (optionnel) :", (e.suivi[idActivite] && e.suivi[idActivite].commentaire) || "");
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
        else if (niveauCible === 'PARCOURS_JAUNE') cb.checked = Boolean(e && estEleveCM(e) && e.parcours === 'jaune');
        else if (niveauCible === 'PARCOURS_ORANGE') cb.checked = Boolean(e && estEleveCM(e) && e.parcours === 'orange');
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
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'PARCOURS_JAUNE')">🟡 Jaune</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'PARCOURS_ORANGE')">🟠 Orange</button>
        <button type="button" class="filter-btn" onclick="cocherNiveauModal('${classeCheckbox}', 'JAUNE')">📒 F. Jaune</button>
    </div>`;
}

function ouvrirModalDuplication() {
    if (!idEleveCourant || eleves[idEleveCourant].planHebdo.length === 0) { showToast("Le plan est vide.", "error"); return; }
    document.getElementById('nomEleveSourceDupli').innerText = eleves[idEleveCourant].nom;
    let html = genererBarreSelectionNiveauxHtml('cb-dupli-eleve');
    getElevesTries().forEach(e => { if (e.id !== idEleveCourant) html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}</label>`; });
    document.getElementById('listeElevesDupli').innerHTML = html; ouvrirModal('modalDupliquer');
}

function validerDuplication() {
    if (!idEleveCourant) return; const planSource = eleves[idEleveCourant].planHebdo, joursSource = eleves[idEleveCourant].joursAssignes || {};
    let checks = document.querySelectorAll('.cb-dupli-eleve:checked');
    if (checks.length === 0) { showToast("Sélectionnez un élève.", "error"); return; } let msgCount = 0;
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
        eleve.planHebdo = [...s.planHebdo]; eleve.priorites = [...s.priorites]; eleve.joursAssignes = { ...(s.joursAssignes || {}) }; eleve.valides = { ...(s.valides || {}) }; eleve.suivi = { ...(s.suivi || {}), ...(s.suivi || {}) }; eleve.dateDebutISO = s.dateDebutISO || ""; eleve.dateDebut = s.dateDebut || ""; eleve.dateFin = s.dateFin || "";
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
    if (confirm(`Clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom} et reporter les non validés ?`)) {
        cloreSemainePourUnEleve(eleve);
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); chargerEleve(); rafraichirDashboard(); showToast("✅ Semaine suivante activée !", "success");
    }
}

function cloturerSemaineClasseGlobale() {
    if (confirm("🏁 Clôturer la semaine en cours pour TOUTE la classe ?")) {
        Object.values(eleves).forEach(e => cloreSemainePourUnEleve(e));
        localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives));
        sauvegarderEleves(); if (idEleveCourant) chargerEleve(); rafraichirDashboard();
        showToast("🏁 Semaine clôturée pour toute la classe !", "success");
    }
}

function basculerPriorite(idActivite) {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant]; if (!eleve.priorites) eleve.priorites = [];
    let idx = eleve.priorites.indexOf(idActivite); if (idx > -1) eleve.prior
