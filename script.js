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
const KEY_SEQ_CUSTOM = 'mesSequencesCustom_Finale';
const KEY_LECONS_PROF = 'mesLeconsProf_Finale';

const MATIERES_DEFAUT_LISTE = [
    "✅Français - Orthographe",
    "✏️Français - Écriture",
    "📚Français - Conjugaison",
    "🔤Français - Grammaire",
    "🧑‍🎓Français - Lexique",
    "🧑‍🎓Français - Vocabulaire",
    "🧮Mathématiques - Numération",
    "➗Mathématiques - Algèbre et Proportionnalité",
    "📏Mathématiques - Mesure",
    "🔷Mathématiques - Géométrie",
    "🤖Mathématiques - Programmation"
];

const PERIODES_LISTE = ['P1', 'P2', 'P3', 'P4', 'P5'];

let dashboardExpanded = new Set();
let dashboardArchives = JSON.parse(localStorage.getItem(KEY_ARCHIVES_TODO)) || [];
let afficherArchivesMode = false;
let programmations = JSON.parse(localStorage.getItem(KEY_PROG)) || {};
let sequencesCustom = JSON.parse(localStorage.getItem(KEY_SEQ_CUSTOM)) || [];
let planningLeconsProf = JSON.parse(localStorage.getItem(KEY_LECONS_PROF)) || { semaineIndex: 0, semaines: [] };
let selectionGroupeeBase = new Set();
let competencesSelectionneesSimple = [];
let sequencesSelectionneesSimple = [];
let sequencesSelectionneesMulti = [];

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
        "Atelier": { img: "", emoji: "", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Jeu": { img: "", emoji: "🎲", remplacerNum: false, appliquerCouleur: true, isTablette: false },
        "Fichier jaune": { img: "", emoji: "📒", remplacerNum: false, appliquerCouleur: false, isTablette: false },
        "Vidéo": { img: "", emoji: "💻", remplacerNum: true, appliquerCouleur: false, isTablette: false },
        "Anton": { img: "", emoji: "📱", remplacerNum: true, appliquerCouleur: false, isTablette: true },
        "Scratch": { img: "", emoji: "🤖", remplacerNum: true, appliquerCouleur: false, isTablette: true }
    };
} else {
    if (!imagesParType["Fichier jaune"]) {
        imagesParType["Fichier jaune"] = { img: "", emoji: "📒", remplacerNum: false, appliquerCouleur: false, isTablette: false };
    }
    Object.keys(imagesParType).forEach(k => {
        if (typeof imagesParType[k] === 'object') {
            if (imagesParType[k].isTablette === undefined) {
                imagesParType[k].isTablette = (k.toLowerCase() === 'anton' || k.toLowerCase() === 'scratch');
            }
            if (imagesParType[k].emoji === undefined) {
                imagesParType[k].emoji = (k.toLowerCase() === 'jeu' ? '🎲' : '');
            }
        }
    });
}

let baseDonnees = JSON.parse(localStorage.getItem(KEY_ATELIERS));
if (!baseDonnees || !Array.isArray(baseDonnees)) baseDonnees = [];

let eleves = JSON.parse(localStorage.getItem(KEY_ELEVES));
if (!eleves || typeof eleves !== 'object') eleves = {};

// Émojis exacts par matière renseignés dans la base
function getEmojiMatiere(matiere, sequence = "") {
    let matRaw = (matiere || "").trim();
    if (matRaw.startsWith("🧑‍🎓")) return "🧑‍🎓";
    if (matRaw.startsWith("✅")) return "✅";
    if (matRaw.startsWith("✏️")) return "✏️";
    if (matRaw.startsWith("➗")) return "➗";
    if (matRaw.startsWith("📏")) return "📏";
    if (matRaw.startsWith("📚")) return "📚";
    if (matRaw.startsWith("🔤")) return "🔤";
    if (matRaw.startsWith("🔷")) return "🔷";
    if (matRaw.startsWith("🤖")) return "🤖";
    if (matRaw.startsWith("🧮")) return "🧮";

    let matchEmojiDebut = matRaw.match(/^([^\w\sÀ-ÿ]+)/u);
    if (matchEmojiDebut && matchEmojiDebut[1].trim()) {
        return matchEmojiDebut[1].trim();
    }

    let text = (matRaw + " " + (sequence || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (text.includes("orthographe")) return "✅";
    if (text.includes("ecriture")) return "✏️";
    if (text.includes("algebre") || text.includes("proportionnalite")) return "➗";
    if (text.includes("mesure")) return "📏";
    if (text.includes("conjugaison")) return "📚";
    if (text.includes("grammaire")) return "🔤";
    if (text.includes("geometrie")) return "🔷";
    if (text.includes("programmation") || text.includes("scratch")) return "🤖";
    if (text.includes("lexique") || text.includes("vocabulaire")) return "🧑‍🎓";
    if (text.includes("numeration") || text.includes("nombre") || text.includes("calcul")) return "🧮";

    return "";
}

function getCouleurMatiereBandeau(matiere) {
    let m = (matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (m.includes("francais") || m.includes("lecture") || m.includes("grammaire") || m.includes("orthographe") || m.includes("conjugaison") || m.includes("lexique") || m.includes("vocabulaire") || m.includes("ecriture") || m.includes("phonologie")) return { bg: "#1b4f72", text: "#ffffff", border: "#154360" };
    if (m.includes("math") || m.includes("numeration") || m.includes("calcul") || m.includes("geometrie") || m.includes("mesure") || m.includes("algebre") || m.includes("proportionnalite") || m.includes("programmation") || m.includes("probleme")) return { bg: "#c0392b", text: "#ffffff", border: "#922b21" };
    if (m.includes("art") || m.includes("musique") || m.includes("chant") || m.includes("poesie") || m.includes("plastique")) return { bg: "#795548", text: "#ffffff", border: "#5d4037" };
    if (m.includes("eps") || m.includes("sport") || m.includes("physique") || m.includes("motricite") || m.includes("natation")) return { bg: "#e67e22", text: "#ffffff", border: "#d35400" };
    if (m.includes("histoire") || m.includes("geographie") || m.includes("espace") || m.includes("temps")) return { bg: "#5dade2", text: "#ffffff", border: "#2e86c1" };
    if (m.includes("science") || m.includes("techno") || m.includes("vivant") || m.includes("matiere") || m.includes("monde")) return { bg: "#27ae60", text: "#ffffff", border: "#1e8449" };
    if (m.includes("anglais") || m.includes("langue") || m.includes("allemand") || m.includes("espagnol") || m.includes("lv")) return { bg: "#e84393", text: "#ffffff", border: "#c2185b" };
    if (m.includes("emc") || m.includes("moral") || m.includes("civique") || m.includes("citoyen")) return { bg: "#8e44ad", text: "#ffffff", border: "#6c3483" };
    return { bg: "#34495e", text: "#ffffff", border: "#2c3e50" };
}

function extraireListeCompetences(compStr) {
    if (!compStr) return [];
    if (Array.isArray(compStr)) return compStr.map(s => String(s).trim()).filter(Boolean);
    return compStr.toString().split(/[;|]+/).map(s => s.trim()).filter(Boolean);
}

function formaterAffichageCompetences(compStr) {
    let list = extraireListeCompetences(compStr);
    if (list.length <= 1) return escHTML(compStr || "");
    return list.map(c => `<span style="display:inline-block; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:1px 6px; margin:1px 2px; font-size:11.5px;">${escHTML(c)}</span>`).join(' ');
}

// ==========================================
// GESTION MULTI-SÉQUENCES & PROGRAMMATION MULTI-PÉRIODES PAR SÉQUENCE
// ==========================================
function extraireListeSequences(seqStr) {
    if (!seqStr) return [];
    if (Array.isArray(seqStr)) return seqStr.map(s => String(s).trim()).filter(Boolean);
    return seqStr.toString().split(/[;|]+/).map(s => s.trim()).filter(Boolean);
}

function activiteAppartientASequence(act, nomSequence) {
    if (!act) return false;
    let cibles = extraireListeSequences(act.sequence).map(s => s.toLowerCase());
    let s = (nomSequence || "").trim().toLowerCase();
    if (!s) return cibles.length === 0;
    return cibles.includes(s);
}

function formaterAffichageSequences(seqStr) {
    let list = extraireListeSequences(seqStr);
    if (list.length === 0) return `<span style="color:#e67e22; font-weight:bold;">⚠️ Sans séquence</span>`;
    if (list.length === 1) return escHTML(list[0]);
    return list.map(s => `<span style="display:inline-block; background:#fef9e7; color:#7d6608; border:1px solid #f5b041; border-radius:6px; padding:1px 6px; margin:1px 2px; font-size:11.5px; font-weight:600;">📑 ${escHTML(s)}</span>`).join(' ');
}

// Clé de programmation propre à une séquence (Matière + Séquence)
function getCleProgSequence(matiere, sequence) {
    return `SEQ||${(matiere || "").trim()}||${(sequence || "").trim()}`;
}

function extrairePeriodesArray(perRaw) {
    if (!perRaw) return [];
    if (Array.isArray(perRaw)) return PERIODES_LISTE.filter(p => perRaw.includes(p));
    let str = String(perRaw).toUpperCase();
    return PERIODES_LISTE.filter(p => str.includes(p));
}

// Récupère la liste des périodes (ex: ['P1', 'P3']) d'une séquence donnée
function getPeriodesSequence(matiere, sequence) {
    if (!sequence || !sequence.trim()) return [];
    let cle = getCleProgSequence(matiere, sequence);
    if (programmations[cle] !== undefined) {
        return extrairePeriodesArray(programmations[cle]);
    }
    // Rétrocompatibilité : si des ateliers de cette séquence avaient déjà une période enregistrée, on les récupère automatiquement
    let setP = new Set();
    baseDonnees.forEach(a => {
        if (!a) return;
        if (matiere && (a.matiere || "").trim() !== (matiere || "").trim()) return;
        if (activiteAppartientASequence(a, sequence)) {
            let pAct = programmations[a.id] || a.periode || "";
            extrairePeriodesArray(pAct).forEach(p => setP.add(p));
        }
    });
    return PERIODES_LISTE.filter(p => setP.has(p));
}

// Récupère les périodes effectives d'une activité (à partir de ses séquences programmées ou de sa période propre)
function getPeriodesActivite(act) {
    if (!act) return [];
    let setP = new Set();
    let seqs = extraireListeSequences(act.sequence);
    seqs.forEach(s => {
        getPeriodesSequence(act.matiere, s).forEach(p => setP.add(p));
    });
    if (setP.size === 0) {
        let pDirect = programmations[act.id] || act.periode || "";
        extrairePeriodesArray(pDirect).forEach(p => setP.add(p));
    }
    return PERIODES_LISTE.filter(p => setP.has(p));
}

function getPeriodesActiviteTexte(act) {
    let arr = getPeriodesActivite(act);
    if (arr.length === 5) return "P1 à P5";
    return arr.length > 0 ? arr.join(', ') : "-";
}

function estActiviteValideePourSequence(eleve, act, seqCible) {
    if (!eleve || !act) return false;
    let seqsAct = extraireListeSequences(act.sequence);
    let targetNorm = (seqCible || "").trim().toLowerCase();

    return (eleve.historique || []).some(h => {
        if (!h || h.idActivite !== act.id) return false;
        let hSeqNorm = (h.sequence || "").trim().toLowerCase();
        if (seqsAct.length <= 1) {
            return true;
        }
        if (!targetNorm) {
            return false;
        }
        if (hSeqNorm) {
            return hSeqNorm === targetNorm;
        }
        return seqsAct[0].toLowerCase() === targetNorm;
    });
}

function getSequenceActivePourEleve(eleve, act) {
    let seqs = extraireListeSequences(act ? act.sequence : "");
    if (eleve && eleve.sequencesChoisies && eleve.sequencesChoisies[act.id]) {
        let choisie = eleve.sequencesChoisies[act.id];
        if (seqs.some(s => s.toLowerCase() === choisie.toLowerCase())) return choisie;
    }
    return seqs[0] || "";
}

// ==========================================
// GESTION DES PARCOURS (JAUNE / ORANGE / FICHIER JAUNE) & VISUELS ATELIERS
// ==========================================
function estEleveCM(eleveOuNiveau) {
    let niv = typeof eleveOuNiveau === 'string' ? eleveOuNiveau : (eleveOuNiveau && eleveOuNiveau.niveau ? eleveOuNiveau.niveau : "");
    niv = niv.toUpperCase().trim();
    return (niv === "CM1" || niv === "CM2");
}

function getInfosActivitePourEleve(act, eleve) {
    let estTypeJaune = Boolean(act && (act.typeRes || "").toLowerCase().includes("fichier jaune"));
    let aVarJaune = Boolean(act && act.varianteJaune && act.varianteJaune.trim() !== "");
    let useJaune = Boolean(eleve && eleve.fichierJaune && (aVarJaune || estTypeJaune));

    if (useJaune) {
        let detailPage = aVarJaune ? act.varianteJaune.trim() : ((act && act.pageManuel) ? act.pageManuel.trim() : "");
        let badgeLivre = detailPage
            ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;">📒 ${escHTML(detailPage)}</span>`
            : `<span style="background:#ffe599; color:#7c2d12; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;">📒 F. Jaune</span>`;
        let typeEffectif = (imagesParType["Fichier jaune"] && (imagesParType["Fichier jaune"].img || imagesParType["Fichier jaune"].emoji)) ? "Fichier jaune" : (act.typeRes || "Fichier jaune");
        return { useJaune: true, detailPage, badgeLivre, typeEffectif, couleurForcee: "#ffe599" };
    }

    let pageJaune = (act && act.pageManuel) ? act.pageManuel.trim() : "";
    let pageOrange = (act && act.pageOrange) ? act.pageOrange.trim() : "";
    let detailPage = pageJaune || pageOrange;
    let badgeLivre = "";

    if (eleve && estEleveCM(eleve)) {
        let parcoursEl = eleve.parcours || (eleve.niveau.toUpperCase() === "CM2" ? "orange" : "jaune");
        if (parcoursEl === "orange") {
            detailPage = pageOrange || pageJaune;
            if (detailPage) {
                badgeLivre = pageOrange
                    ? `<span style="background:#fdebd0; color:#9c640c; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f39c12;" title="Parcours Orange">🟠 ${escHTML(detailPage)}</span>`
                    : `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>`;
            }
        } else {
            detailPage = pageJaune || pageOrange;
            if (detailPage) {
                badgeLivre = (pageJaune && pageOrange)
                    ? `<span style="background:#fef9e7; color:#7d6608; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #f1c40f;" title="Parcours Jaune">🟡 ${escHTML(detailPage)}</span>`
                    : `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>`;
            }
        }
    } else {
        if (detailPage) {
            badgeLivre = `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold;">📘 ${escHTML(detailPage)}</span>`;
        }
    }

    let coulAct = (act && act.visuel && act.visuel.startsWith('#')) ? act.visuel : "";
    return {
        useJaune: false,
        detailPage,
        badgeLivre,
        typeEffectif: (act && act.typeRes) ? act.typeRes : "",
        couleurForcee: coulAct
    };
}

function extraireNumeroAtelierPropre(symboleBrut, emojiType, emojiMat) {
    let s = (symboleBrut || "").trim();
    if (!s) return "";
    if (emojiType && s.startsWith(emojiType)) s = s.slice(emojiType.length).trim();
    if (emojiMat && s.startsWith(emojiMat)) s = s.slice(emojiMat.length).trim();
    const emojisConnus = ["🎲", "🧩", "📒", "💻", "📱", "🤖", "🧑‍🎓", "✅", "✏️", "➗", "📏", "📚", "🔤", "🔷", "🧮"];
    let modifie = true;
    while (modifie) {
        modifie = false;
        for (let em of emojisConnus) {
            if (s.startsWith(em)) {
                s = s.slice(em.length).trim();
                modifie = true;
            }
        }
    }
    return s;
}

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
    } else if (act && act.visuel && (act.visuel.startsWith('http') || act.visuel.includes('drive.google'))) {
        imgUrl = formaterLienImage(act.visuel);
    }

    let emojiType = (typeCfg && typeCfg.emoji) ? typeCfg.emoji.trim() : "";
    if (!emojiType && typeKey.toLowerCase() === "jeu") emojiType = "🎲";

    let emojiMat = getEmojiMatiere(act ? act.matiere : "", act ? act.sequence : "");
    let symBrut = (act && act.symbole) ? act.symbole.trim() : "";
    let numPropre = extraireNumeroAtelierPropre(symBrut, emojiType, emojiMat);

    let remplacerNumParLogo = Boolean(typeCfg && typeCfg.remplacerNum);
    let bg = infos.couleurForcee;
    if (!bg || bg === "#ffffff") {
        bg = calculerCouleurAutomatique(act ? act.matiere : "", act ? act.niveau : "", infos.typeEffectif);
    }

    let html = "";
    if (imgUrl && !imgUrl.startsWith('#')) {
        let tagImg = `<img src="${escHTML(imgUrl)}" style="max-height:${tailleMaxImg}px; max-width:52px; object-fit:contain; vertical-align:middle; display:inline-block;">`;
        if (remplacerNumParLogo && !numPropre) {
            html = tagImg;
        } else if (numPropre || symBrut) {
            html = `${tagImg} <strong style="vertical-align:middle;">${escHTML(emojiMat + numPropre)}</strong>`;
        } else {
            html = tagImg;
        }
    } else {
        if (numPropre || symBrut) {
            let codeComplet = `${emojiType}${emojiMat}${numPropre}`;
            html = `<strong style="font-size:${Math.max(12, Math.round(tailleMaxImg * 0.6))}px; letter-spacing:0.4px;">${escHTML(codeComplet)}</strong>`;
        } else if (emojiType) {
            html = `<span style="font-size:${Math.max(13, tailleMaxImg - 4)}px;">${escHTML(emojiType)}</span>`;
        } else {
            html = "";
        }
    }

    return {
        html,
        bg,
        typeEffectif: infos.typeEffectif,
        emojiType,
        emojiMat,
        numPropre,
        imgUrl,
        codeTexte: (numPropre || symBrut) ? `${emojiType}${emojiMat}${numPropre}` : ""
    };
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
    if (!e.recurrents || !Array.isArray(e.recurrents)) e.recurrents = [];
    if (!e.enAttente || !Array.isArray(e.enAttente)) e.enAttente = [];
    if (!e.historique || !Array.isArray(e.historique)) e.historique = [];
    if (!e.masquees || !Array.isArray(e.masquees)) e.masquees = [];
    if (!e.priorites) e.priorites = [];
    if (!e.bilanEvaluations) e.bilanEvaluations = {};
    if (!e.joursAssignes) e.joursAssignes = {};
    if (!e.sequencesChoisies) e.sequencesChoisies = {};
    if (!e.dateDebutISO) e.dateDebutISO = "";
    if (!e.dateDebut) e.dateDebut = "";
    if (!e.dateFin) e.dateFin = "";

    e.recurrents.forEach(idRec => {
        if (baseDonnees.some(b => b.id === idRec) && !e.planHebdo.includes(idRec)) {
            e.planHebdo.push(idRec);
        }
    });

    if (!e.semaines || !Array.isArray(e.semaines) || e.semaines.length === 0) {
        e.semaines = [{
            id: 'sem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            dateDebutISO: e.dateDebutISO || "", dateDebut: e.dateDebut || "", dateFin: e.dateFin || "",
            planHebdo: [...e.planHebdo], priorites: [...e.priorites], joursAssignes: { ...e.joursAssignes },
            sequencesChoisies: { ...e.sequencesChoisies },
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
    e.semaines[idx].sequencesChoisies = { ...(e.sequencesChoisies || {}) };
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
    (e.recurrents || []).forEach(idRec => {
        if (baseDonnees.some(b => b.id === idRec) && !e.planHebdo.includes(idRec)) {
            e.planHebdo.push(idRec);
        }
    });
    e.priorites = [...(s.priorites || [])];
    e.joursAssignes = { ...(s.joursAssignes || {}) };
    e.sequencesChoisies = { ...(s.sequencesChoisies || {}) };
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
    localStorage.setItem(KEY_SEQ_CUSTOM, JSON.stringify(sequencesCustom));
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
    let nouvSeqCustom = parseSiString(data.sequencesCustom || data[KEY_SEQ_CUSTOM]);
    let nouvLeconsProf = parseSiString(data.planningLeconsProf || data[KEY_LECONS_PROF]);

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
    if (nouvImages && typeof nouvImages === 'object') {
        imagesParType = nouvImages;
        Object.keys(imagesParType).forEach(k => {
            if (typeof imagesParType[k] === 'object' && imagesParType[k].emoji === undefined) {
                imagesParType[k].emoji = (k.toLowerCase() === 'jeu' ? '🎲' : '');
            }
        });
        localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    }
    if (nouvProg && typeof nouvProg === 'object') { programmations = nouvProg; localStorage.setItem(KEY_PROG, JSON.stringify(programmations)); }
    if (Array.isArray(nouvArchives)) { dashboardArchives = nouvArchives; localStorage.setItem(KEY_ARCHIVES_TODO, JSON.stringify(dashboardArchives)); }
    if (nouvPrintCfg && typeof nouvPrintCfg === 'object') { printConfig = { ...printConfig, ...nouvPrintCfg }; localStorage.setItem(KEY_PRINT_CFG, JSON.stringify(printConfig)); }
    if (Array.isArray(nouvSeqCustom)) { sequencesCustom = nouvSeqCustom; localStorage.setItem(KEY_SEQ_CUSTOM, JSON.stringify(sequencesCustom)); }
    if (nouvLeconsProf && typeof nouvLeconsProf === 'object') { planningLeconsProf = nouvLeconsProf; localStorage.setItem(KEY_LECONS_PROF, JSON.stringify(planningLeconsProf)); }
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
    let txt = zone.value.trim();
    if (txt.startsWith('"') && txt.endsWith('"')) {
        try { txt = JSON.parse(txt); } catch (e) {}
    }
    try {
        let parsed = typeof txt === 'string' ? JSON.parse(txt) : txt;
        if (importerDonneesUniversel(parsed)) zone.value = "";
    } catch (err) {
        showToast("Le texte collé n'est pas un JSON valide.", "error");
    }
}

function exporterSauvegardeJSON() {
    Object.values(eleves).forEach(e => syncEleveVersSemaineActive(e));
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, sequencesCustom: sequencesCustom, planningLeconsProf: planningLeconsProf, printConfig: printConfig, theme: localStorage.getItem(KEY_THEME) || 'pastel', exportedAt: new Date().toISOString() };
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
    const payload = { base: baseDonnees, eleves: eleves, images: imagesParType, archives: dashboardArchives, programmations: programmations, sequencesCustom: sequencesCustom, planningLeconsProf: planningLeconsProf, printConfig: printConfig, theme: localStorage.getItem(KEY_THEME) || 'pastel', updatedAt: new Date().toISOString() };
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
// 3. UTILITAIRES, TRI FIXE & COULEURS AUTO
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
            e.historique.forEach(h => {
                if (h && h.idActivite) {
                    let cle = `${h.idActivite}||${(h.sequence || "").toLowerCase()}`;
                    uniqueMap.set(cle, h);
                }
            });
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
    select.innerHTML = '<option value="">-- Couleur auto par matière/niveau --</option><option value="#ffe599">🟡 Jaune (Maths CP)</option><option value="#f6b26b">🟠 Orange (Maths CE)</option><option value="#ea9999">🔴 Rouge (Maths CM)</option><option value="#d5a6bd">🟣 Violet (Français CP)</option><option value="#b6d7a8">🟢 Vert (Français CE)</option><option value="#9fc5e8">🔵 Bleu (Français CM)</option><option value="#ffffff">⚪ Blanc</option>';
    if (valeurForcee) select.value = valeurForcee;
}

function majListeTypesSelect() {
    const selectType = document.getElementById('selectTypeRessource');
    const selectTypeEtiq = document.getElementById('selectTypeEtiquettes');
    const bulkType = document.getElementById('bulkSelectType');
    let html = '<option value="">-- Type --</option>';
    let htmlEtiq = '<option value="Tous">Tous les supports</option>';
    let htmlBulk = '<option value="">-- Changer Support --</option>';
    if (imagesParType) {
        Object.keys(imagesParType).forEach(t => {
            let em = imagesParType[t].emoji ? imagesParType[t].emoji + " " : "";
            html += `<option value="${escHTML(t)}">${escHTML(em + t)}</option>`;
            htmlEtiq += `<option value="${escHTML(t)}">${escHTML(em + t)}</option>`;
            htmlBulk += `<option value="${escHTML(t)}">${escHTML(em + t)}</option>`;
        });
    }
    if (selectType) selectType.innerHTML = html;
    if (selectTypeEtiq) selectTypeEtiq.innerHTML = htmlEtiq;
    if (bulkType) bulkType.innerHTML = htmlBulk;
}

let idEleveCourant = null, idEleveImpressionCourant = null;
let filtreCourantDB = 'Tous', filtreCourantMatiere = 'Toutes', filtreCourantSequenceDB = 'Toutes', filtreCourantTypeDB = 'Tous';
let idEnCoursEdition = null;

function getListeTrie(idsArray, priosArray = [], eleveContext = null) {
    if (!idsArray) return [];
    let planObjects = idsArray.map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
    planObjects.sort((a, b) => {
        let prioA = (priosArray && priosArray.includes(a.id)) ? 1 : 0;
        let prioB = (priosArray && priosArray.includes(b.id)) ? 1 : 0;
        if (prioA !== prioB) return prioB - prioA;
        let matA = nettoyerNomPourTri(a.matiere), matB = nettoyerNomPourTri(b.matiere);
        if (matA !== matB) return matA.localeCompare(matB, 'fr');
        let sA = eleveContext ? getSequenceActivePourEleve(eleveContext, a) : (a.sequence || "").trim();
        let sB = eleveContext ? getSequenceActivePourEleve(eleveContext, b) : (b.sequence || "").trim();
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
    let mat = matiere.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), nivs = niveauxStr.toUpperCase();
    let ordreNivs = ["CP", "CE1", "CE2", "CM1", "CM2"], niveauPlusBas = "";
    for (let n of ordreNivs) { if (nivs.includes(n)) { niveauPlusBas = n; break; } }
    if (mat.includes('math') || mat.includes('numeration') || mat.includes('geometrie') || mat.includes('mesure') || mat.includes('algebre') || mat.includes('calcul')) {
        if (niveauPlusBas === 'CP') return "#ffe599";
        if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#f6b26b";
        if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#ea9999";
    } else if (mat.includes('francais') || mat.includes('grammaire') || mat.includes('orthographe') || mat.includes('conjugaison') || mat.includes('vocabulaire') || mat.includes('lexique') || mat.includes('ecriture')) {
        if (niveauPlusBas === 'CP') return "#d5a6bd";
        if (niveauPlusBas === 'CE1' || niveauPlusBas === 'CE2') return "#b6d7a8";
        if (niveauPlusBas === 'CM1' || niveauPlusBas === 'CM2') return "#9fc5e8";
    }
    return "#ffffff";
}

function majCouleurAutoFormSimple() {
    if (idEnCoursEdition) return;
    let selCoul = document.getElementById('selectCouleurRapide');
    if (!selCoul) return;
    let mat = document.getElementById('inputMatiere') ? document.getElementById('inputMatiere').value : "";
    let typeR = document.getElementById('selectTypeRessource') ? document.getElementById('selectTypeRessource').value : "";
    let nivs = getNiveauxCochesFormulaire('.cb-niveau-form').join(', ');
    let coul = calculerCouleurAutomatique(mat, nivs, typeR);
    selCoul.value = coul;
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
// 4. ONGLET 1 : PLAN & SUIVI ÉLÈVES (ADAPTATION AUTO PARCOURS, MULTI-SÉQUENCES & RITUELS)
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

function toggleRecurrentEleve(idActivite) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    if (!e.recurrents) e.recurrents = [];
    let idx = e.recurrents.indexOf(idActivite);
    if (idx > -1) {
        e.recurrents.splice(idx, 1);
        showToast("🔄 Activité retirée des rituels hebdomadaires de l'élève.");
    } else {
        e.recurrents.push(idActivite);
        if (!e.planHebdo.includes(idActivite)) {
            e.planHebdo.push(idActivite);
        }
        showToast("🔄 Activité épinglée chaque semaine pour cet élève !", "success");
    }
    sauvegarderEleves();
    afficherPlanHebdo();
    afficherRessourcesDisponibles();
}

function afficherBandeauRecurrentsEleve() {
    let bloc = document.getElementById('blocRecurrentsEleve');
    let cont = document.getElementById('listeBadgesRecurrentsEleve');
    if (!bloc || !cont || !idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant];
    let recs = (e.recurrents || []).map(id => baseDonnees.find(b => b.id === id)).filter(Boolean);
    if (recs.length === 0) {
        bloc.style.display = 'none';
        return;
    }
    bloc.style.display = 'block';
    cont.innerHTML = recs.map(a => `
        <span class="comp-tag-pill" style="background:#fff; border-color:#8e44ad; color:#6c3483;">
            🔄 ${escHTML(a.ressource)} <small style="opacity:0.75;">(${escHTML(a.matiere)})</small>
            <span class="comp-tag-remove" title="Ne plus répéter chaque semaine" onclick="toggleRecurrentEleve('${a.id}')">✖</span>
        </span>
    `).join('');
}

function majListeEleves() {
    const select = document.getElementById('selectEleveProfile'), selectImp = document.getElementById('selectEleveImpression'), selectBilan = document.getElementById('selectEleveBilan');
    let optHtml = '<option value="">-- Sélectionner un élève --</option>';
    let optImp = '<option value="TOUS_ELEVES">📚 TOUS les élèves de la classe</option><option value="NIVEAU_CP">📘 Groupe CP</option><option value="NIVEAU_CE1">📘 Groupe CE1</option><option value="NIVEAU_CE2">📘 Groupe CE2</option><option value="NIVEAU_CM1">📘 Groupe CM1</option><option value="NIVEAU_CM2">📘 Groupe CM2</option>';
    let optBilan = '<option value="">-- Choisir un élève --</option>';

    getElevesTries().forEach(e => {
        let tagParcours = "";
        if (estEleveCM(e)) {
            let p = e.parcours || (e.niveau.toUpperCase() === "CM2" ? "orange" : "jaune");
            tagParcours = (p === "orange") ? " 🟠" : " 🟡";
        }
        let tagJaune = e.fichierJaune ? " 📒" : "";
        let labelNiv = `[${e.niveau || "CP"}] ${e.nom}${tagParcours}${tagJaune}`;
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
    const nomInput = document.getElementById('nouvelEleveNom'), nivSelect = document.getElementById('nouvelEleveNiveau'), parcSelect = document.getElementById('nouvelEleveParcours'), cbJauneNew = document.getElementById('nouvelEleveFichierJaune');
    if (!nomInput) return;
    const nom = nomInput.value.trim(); if (!nom) { showToast("Indiquez le prénom de l'élève.", "error"); return; }
    const niveau = nivSelect ? nivSelect.value : "CP";
    const id = 'eleve_' + Date.now();
    let nouvEl = {
        id: id, nom: nom, niveau: niveau,
        fichierJaune: Boolean(cbJauneNew && cbJauneNew.checked),
        planHebdo: [], recurrents: [], enAttente: [], historique: [], masquees: [], priorites: [],
        maxAteliers: 15, maxTablettes: 2, suivi: {}, valides: {}, bilanEvaluations: {}, joursAssignes: {}, sequencesChoisies: {},
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
    let planInitial = [...new Set([...(e.recurrents || []), ...(e.enAttente || [])])];
    let priosInitiales = [...(e.enAttente || [])];
    e.enAttente = [];
    e.semaines.push({ id: 'sem_' + Date.now(), dateDebutISO: nouvDebutISO, dateDebut: nouvDebutFR, dateFin: nouvFinFR, planHebdo: planInitial, priorites: priosInitiales, joursAssignes: {}, sequencesChoisies: { ...(e.sequencesChoisies || {}) }, valides: {}, suivi: JSON.parse(JSON.stringify(e.suivi || {})) });
    chargerSemaineDepuisIndex(e, e.semaines.length - 1); sauvegarderEleves(); majBarreSemainesUI(); afficherPlanHebdo();
    afficherRessourcesDisponibles(); showToast(`Semaine ${e.semaines.length} créée !`, "success");
}

function supprimerSemaineActive() {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let e = eleves[idEleveCourant]; if (e.semaines.length <= 1) return;
    if (confirm(`Supprimer la Semaine ${e.semaineIndex + 1} préparée pour ${e.nom} ?`)) {
        e.semaines.splice(e.semaineIndex, 1);
        let nouvIdx = Math.max(0, e.semaineIndex - 1), s = e.semaines[nouvIdx];
        e.semaineIndex = nouvIdx; e.planHebdo = [...(s.planHebdo || [])]; e.priorites = [...(s.priorites || [])]; e.joursAssignes = { ...(s.joursAssignes || {}) }; e.sequencesChoisies = { ...(s.sequencesChoisies || {}) }; e.valides = { ...(s.valides || {}) }; e.suivi = { ...(s.suivi || {}) }; e.dateDebutISO = s.dateDebutISO || ""; e.dateDebut = s.dateDebut || ""; e.dateFin = s.dateFin || "";
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
    let matieres = [...new Set([...MATIERES_DEFAUT_LISTE, ...baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean)])].sort((a, b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));

    let toutesSeqs = [...sequencesCustom];
    baseDonnees.forEach(b => extraireListeSequences(b.sequence).forEach(s => toutesSeqs.push(s)));
    let sequences = [...new Set(toutesSeqs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

    let toutesComps = [];
    baseDonnees.forEach(b => extraireListeCompetences(b.competence).forEach(c => toutesComps.push(c)));
    let competences = [...new Set(toutesComps)].sort((a, b) => a.localeCompare(b, 'fr'));

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
    let toutesSeqs = [];
    baseDonnees.filter(b => !mat || mat === 'TOUTES_MATIERES' || (b.matiere || "").trim() === mat).forEach(b => {
        extraireListeSequences(b.sequence).forEach(s => toutesSeqs.push(s));
    });
    let sequences = [...new Set(toutesSeqs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
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
        if (seq && seq !== 'TOUTES_SEQUENCES' && !activiteAppartientASequence(a, seq)) return false;

        // Filtrage par période (basé sur les périodes de la séquence ou de l'atelier)
        if (per !== 'Toutes') {
            let periodesAct = (seq && seq !== 'TOUTES_SEQUENCES')
                ? getPeriodesSequence(a.matiere, seq)
                : getPeriodesActivite(a);
            if (!periodesAct.includes(per)) return false;
        }

        if (filtreEtoilesDispo > 0 && (parseInt(a.difficulte) || 0) !== filtreEtoilesDispo) return false;
        if (eleve.planHebdo.includes(a.id) || (eleve.enAttente && eleve.enAttente.includes(a.id))) return false;
        if (eleve.masquees && eleve.masquees.includes(a.id)) return false;

        let isRec = eleve.recurrents && eleve.recurrents.includes(a.id);
        if (isRec) return true;

        let seqsAct = extraireListeSequences(a.sequence);
        if (seq && seq !== 'TOUTES_SEQUENCES') {
            if (estActiviteValideePourSequence(eleve, a, seq)) return false;
        } else {
            if (seqsAct.length <= 1) {
                if (estActiviteValideePourSequence(eleve, a, seqsAct[0] || "")) return false;
            } else {
                let toutesSeqsFaites = seqsAct.every(s => estActiviteValideePourSequence(eleve, a, s));
                if (toutesSeqsFaites) return false;
            }
        }
        return true;
    });

    if (liste.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7f8c8d;">Aucune activité disponible.</td></tr>'; return; }

    let html = '';
    liste.forEach(a => {
        let infos = getInfosActivitePourEleve(a, eleve), rep = getRepereAtelierHtml(a, eleve, 24);
        let coul = getCouleurMatiereBandeau(a.matiere), perAct = getPeriodesActiviteTexte(a);
        let seqsAct = extraireListeSequences(a.sequence);
        let seqRestantes = seqsAct.filter(s => !estActiviteValideePourSequence(eleve, a, s));
        if (seqRestantes.length === 0) seqRestantes = seqsAct;

        let seqAfficheHtml = '';
        if (seq && seq !== 'TOUTES_SEQUENCES') {
            seqAfficheHtml = `<span style="background:#fef9e7; color:#7d6608; border:1px solid #f5b041; border-radius:4px; padding:1px 5px; font-size:11.5px; font-weight:bold;">📑 ${escHTML(seq)}</span><input type="hidden" id="seq_dispo_${a.id}" value="${escHTML(seq)}">`;
        } else if (seqRestantes.length > 1) {
            seqAfficheHtml = `<select id="seq_dispo_${a.id}" style="width:100%; padding:2px 4px; font-size:11.5px; font-weight:bold; background:#fef9e7; color:#7d6608; border:1px solid #f5b041; border-radius:4px; margin-top:2px;">` +
                seqRestantes.map(s => `<option value="${escHTML(s)}">📑 Séq : ${escHTML(s)}</option>`).join('') +
                `</select>`;
        } else if (seqRestantes.length === 1) {
            seqAfficheHtml = `${escHTML(seqRestantes[0])}<input type="hidden" id="seq_dispo_${a.id}" value="${escHTML(seqRestantes[0])}">`;
        } else {
            seqAfficheHtml = `<span style="color:#e67e22; font-weight:bold;">⚠️ Sans séquence</span><input type="hidden" id="seq_dispo_${a.id}" value="">`;
        }

        let badgeLien = (a.lienExterne && a.lienExterne.trim()) ? ` <a href="${escHTML(a.lienExterne.trim())}" target="_blank" rel="noopener noreferrer" style="background:#f5eef8; color:#6c3483; padding:1px 5px; border-radius:4px; font-size:11px; font-weight:bold; text-decoration:none; border:1px solid #d7bde2;" title="Ouvrir le lien direct">🔗 Anton ↗</a>` : '';
        let isRec = eleve.recurrents && eleve.recurrents.includes(a.id);
        html += `<tr>
            <td><strong>${escHTML(a.niveau)}</strong><br><small style="color:#7f8c8d;">${escHTML(perAct)}</small></td>
            <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${coul.bg}; margin-right:4px;"></span><strong>${escHTML(a.matiere)}</strong><br>${seqAfficheHtml} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${formaterAffichageCompetences(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infos.badgeLivre}${badgeLien} ${a.estEvaluation ? '<span class="badge-eval">🎯 Éval</span>' : ''}</td>
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
                    <button type="button" class="filter-btn" style="${isRec ? 'background:#8e44ad; color:#fff;' : ''}" title="Épingler comme rituel récurrent chaque semaine pour cet élève" onclick="toggleRecurrentEleve('${a.id}')">🔄 Hebdo</button>
                    <button type="button" class="filter-btn" onclick="mettreEnAttente('${a.id}')" title="Mettre en réserve">⏳</button>
                    <button type="button" class="btn-valid" onclick="validerDirectement('${a.id}')" title="Valider pour cette séquence">✅</button>
                    <button type="button" class="filter-btn" onclick="masquerActivite('${a.id}')" title="Masquer">🙈</button>
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

function changerSequenceChoisiePlan(idActivite, nouvSeq) {
    if (!idEleveCourant || !eleves[idEleveCourant]) return;
    let eleve = eleves[idEleveCourant];
    if (!eleve.sequencesChoisies) eleve.sequencesChoisies = {};
    eleve.sequencesChoisies[idActivite] = nouvSeq;
    sauvegarderEleves();
    afficherPlanHebdo();
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
    getElevesTries().forEach(e => {
        if (e.id !== idEleveCourant) {
            let tagParc = estEleveCM(e) ? ((e.parcours === 'orange') ? ' 🟠' : ' 🟡') : '';
            let tagJaune = e.fichierJaune ? ' 📒' : '';
            html += `<label style="cursor:pointer; font-size:14px;"><input type="checkbox" class="cb-dupli-eleve" value="${e.id}"> [${e.niveau}] ${escHTML(e.nom)}${tagParc}${tagJaune}</label>`;
        }
    });
    document.getElementById('listeElevesDupli').innerHTML = html; ouvrirModal('modalDupliquer');
}

function trouverActiviteAdapteePourEleve(actSource, eleveSource, eleveTarget, seqCible) {
    if (!actSource || !eleveTarget) return actSource;

    let nivTarget = (eleveTarget.niveau || "CP").toUpperCase();
    let isTargetCM = estEleveCM(eleveTarget);
    let parcTarget = isTargetCM ? (eleveTarget.parcours || (nivTarget === "CM2" ? "orange" : "jaune")) : "";
    let targetUseJaune = Boolean(eleveTarget.fichierJaune);

    let aVarJauneIntegre = Boolean(actSource.varianteJaune && actSource.varianteJaune.trim() !== "");
    let aDeuxPagesCMIntegre = Boolean(actSource.pageManuel && actSource.pageManuel.trim() !== "" && actSource.pageOrange && actSource.pageOrange.trim() !== "");

    let nivActSrc = (actSource.niveau || "").toUpperCase();
    let compatibleNiveau = !nivActSrc || nivActSrc.includes(nivTarget) || nivActSrc === "TOUS" || (isTargetCM && (nivActSrc.includes("CM1") || nivActSrc.includes("CM2")));

    if (compatibleNiveau) {
        if (targetUseJaune && (aVarJauneIntegre || (actSource.typeRes || "").toLowerCase().includes("fichier jaune"))) {
            return actSource;
        }
        if (!targetUseJaune && isTargetCM && aDeuxPagesCMIntegre) {
            return actSource;
        }
    }

    let matSrc = (actSource.matiere || "").trim().toLowerCase();
    let resSrc = (actSource.ressource || "").trim().toLowerCase();
    let resSrcClean = resSrc.replace(/\b(jaune|orange|parcours\s*jaune|parcours\s*orange|fichier\s*jaune|cm1|cm2)\b/gi, "").trim();
    let leconSrc = (actSource.lecon || "").trim().toLowerCase();
    let compSrc = (actSource.competence || "").trim().toLowerCase();

    let candidats = baseDonnees.filter(b => {
        if (!b || b.id === actSource.id) return false;
        if ((b.matiere || "").trim().toLowerCase() !== matSrc) return false;
        if (Boolean(b.estEvaluation) !== Boolean(actSource.estEvaluation)) return false;

        if (seqCible) {
            if (!activiteAppartientASequence(b, seqCible)) return false;
        } else {
            let seqsSrc = extraireListeSequences(actSource.sequence).map(s => s.toLowerCase());
            let seqsB = extraireListeSequences(b.sequence).map(s => s.toLowerCase());
            if (seqsSrc.length > 0 && !seqsB.some(s => seqsSrc.includes(s))) return false;
        }

        let resB = (b.ressource || "").trim().toLowerCase();
        let resBClean = resB.replace(/\b(jaune|orange|parcours\s*jaune|parcours\s*orange|fichier\s*jaune|cm1|cm2)\b/gi, "").trim();
        let memeRessource = (resB === resSrc) || (resSrcClean !== "" && resBClean === resSrcClean);
        let memeLeconComp = (leconSrc !== "" && (b.lecon || "").trim().toLowerCase() === leconSrc && (b.competence || "").trim().toLowerCase() === compSrc);

        return memeRessource || memeLeconComp;
    });

    if (candidats.length === 0) return actSource;

    if (targetUseJaune) {
        let candJaune = candidats.find(b =>
            (b.varianteJaune && b.varianteJaune.trim() !== "") ||
            (b.typeRes || "").toLowerCase().includes("fichier jaune") ||
            (b.ressource || "").toLowerCase().includes("fichier jaune")
        );
        if (candJaune) return candJaune;
    } else if ((actSource.typeRes || "").toLowerCase().includes("fichier jaune")) {
        let candStandard = candidats.find(b => !(b.typeRes || "").toLowerCase().includes("fichier jaune") && ((b.niveau || "").toUpperCase().includes(nivTarget)));
        if (candStandard) return candStandard;
    }

    if (isTargetCM) {
        let candParcours = candidats.find(b => {
            let nivB = (b.niveau || "").toUpperCase();
            let txtB = `${b.ressource || ''} ${b.pageManuel || ''} ${b.pageOrange || ''}`.toLowerCase();
            if (parcTarget === "jaune") {
                return (b.pageManuel && b.pageManuel.trim() !== "" && (!b.pageOrange || b.pageOrange.trim() === "")) ||
                       txtB.includes("jaune") ||
                       (nivB.includes("CM1") && !nivB.includes("CM2"));
            } else {
                return (b.pageOrange && b.pageOrange.trim() !== "") ||
                       txtB.includes("orange") ||
                       (nivB.includes("CM2") && !nivB.includes("CM1"));
            }
        });
        if (candParcours) return candParcours;
    }

    let candNiveau = candidats.find(b => (b.niveau || "").toUpperCase().includes(nivTarget));
    if (candNiveau) return candNiveau;

    return actSource;
}

function validerDuplication() {
    if (!idEleveCourant) return;
    const srcEl = eleves[idEleveCourant];
    const planSource = srcEl.planHebdo, joursSource = srcEl.joursAssignes || {}, recSource = srcEl.recurrents || [], seqsSource = srcEl.sequencesChoisies || {};
    let checks = document.querySelectorAll('.cb-dupli-eleve:checked');
    if (checks.length === 0) { showToast("Sélectionnez un élève.", "error"); return; }

    let msgCount = 0;
    let nbAdaptes = 0;

    checks.forEach(cb => {
        const target = eleves[cb.value];
        assurerStructureSemaines(target);
        if (!target.joursAssignes) target.joursAssignes = {};
        if (!target.recurrents) target.recurrents = [];
        if (!target.sequencesChoisies) target.sequencesChoisies = {};

        planSource.forEach(idActSrc => {
            let actOrigine = baseDonnees.find(b => b.id === idActSrc);
            if (!actOrigine) return;

            let seqCible = seqsSource[idActSrc] || getSequenceActivePourEleve(srcEl, actOrigine);
            let actAdaptee = trouverActiviteAdapteePourEleve(actOrigine, srcEl, target, seqCible);
            let idActFinal = actAdaptee.id;

            if (idActFinal !== idActSrc) nbAdaptes++;

            let estRecSource = Array.isArray(recSource) && recSource.includes(idActSrc);
            let seqFinale = activiteAppartientASequence(actAdaptee, seqCible) ? seqCible : getSequenceActivePourEleve(target, actAdaptee);

            if (!target.planHebdo.includes(idActFinal) && (estRecSource || !estActiviteValideePourSequence(target, actAdaptee, seqFinale)) && target.planHebdo.length < (target.maxAteliers || 15)) {
                target.planHebdo.push(idActFinal);
                if (joursSource[idActSrc]) target.joursAssignes[idActFinal] = joursSource[idActSrc];
                if (seqFinale) target.sequencesChoisies[idActFinal] = seqFinale;
                if (estRecSource && !target.recurrents.includes(idActFinal)) target.recurrents.push(idActFinal);
                msgCount++;
            }
        });
        syncEleveVersSemaineActive(target);
    });

    sauvegarderEleves();
    fermerModal('modalDupliquer');
    rafraichirDashboard();
    showToast(`✅ ${msgCount} activité(s) dupliquée(s)${nbAdaptes > 0 ? ` (dont ${nbAdaptes} adaptée(s) au parcours/fichier)` : ''} !`, "success");
}

let activiteAssignationEnCours = null;
function assignerActivite(idActivite) {
    activiteAssignationEnCours = idActivite; let act = baseDonnees.find(a => a.id === idActivite); if (!act) return;
    document.getElementById('nomActiviteAssign').innerText = act.ressource;
    let selJour = document.getElementById('selectJourAssignMultiple'); if (selJour) selJour.value = "";
    let cbRec = document.getElementById('cbAssignRecurrentMultiple'); if (cbRec) cbRec.checked = false;

    let seqsAct = extraireListeSequences(act.sequence);
    let blocSeq = document.getElementById('blocChoixSequenceAssignModal');
    let selSeq = document.getElementById('selectSequenceAssignMultiple');
    if (blocSeq && selSeq) {
        if (seqsAct.length > 1) {
            blocSeq.style.display = 'block';
            selSeq.innerHTML = seqsAct.map(s => `<option value="${escHTML(s)}">📑 ${escHTML(s)}</option>`).join('');
            selSeq.onchange = () => rafraichirListeElevesModalAssign(act, selSeq.value);
        } else {
            blocSeq.style.display = 'none';
            selSeq.innerHTML = `<option value="${escHTML(seqsAct[0] || '')}">${escHTML(seqsAct[0] || '')}</option>`;
        }
    }
    rafraichirListeElevesModalAssign(act, seqsAct[0] || "");
    ouvrirModal('modalAssigner');
}

function rafraichirListeElevesModalAssign(act, seqCible) {
    let html = genererBarreSelectionNiveauxHtml('cb-assign-eleve');
    getElevesTries().forEach(e => {
        assurerStructureSemaines(e);
        let dejaDansPlan = e.semaines.some(s => s.planHebdo && s.planHebdo.includes(act.id));
        let dejaValidePourCetteSeq = estActiviteValideePourSequence(e, act, seqCible) && !(e.recurrents && e.recurrents.includes(act.id));
        let disabled = (dejaDansPlan || dejaValidePourCetteSeq) ? "disabled checked" : "";
        let color = disabled ? "color: #95a5a6; text-decoration: line-through;" : "";
        html += `<label style="cursor:pointer; font-size:14px; ${color}"><input type="checkbox" class="cb-assign-eleve" value="${e.id}" ${disabled}> [${e.niveau}] ${escHTML(e.nom)}</label>`;
    });
    document.getElementById('listeElevesAssign').innerHTML = html;
}

function validerAssignationMultiple() {
    if (!activiteAssignationEnCours) return; let checks = document.querySelectorAll('.cb-assign-eleve:checked:not(:disabled)');
    if (checks.length === 0) { fermerModal('modalAssigner'); return; }
    let selJour = document.getElementById('selectJourAssignMultiple'), jourChoisi = selJour ? selJour.value : "";
    let selSeq = document.getElementById('selectSequenceAssignMultiple'), seqChoisie = selSeq ? selSeq.value : "";
    let cbRec = document.getElementById('cbAssignRecurrentMultiple'), isRecurrent = Boolean(cbRec && cbRec.checked);
    let count = 0;
    checks.forEach(cb => {
        let e = eleves[cb.value]; assurerStructureSemaines(e);
        if (!e.sequencesChoisies) e.sequencesChoisies = {};
        if (seqChoisie) e.sequencesChoisies[activiteAssignationEnCours] = seqChoisie;
        if (isRecurrent) {
            if (!e.recurrents) e.recurrents = [];
            if (!e.recurrents.includes(activiteAssignationEnCours)) e.recurrents.push(activiteAssignationEnCours);
        }
        if (e.planHebdo.length < (e.maxAteliers || 15) || isRecurrent) {
            if (!e.planHebdo.includes(activiteAssignationEnCours)) e.planHebdo.push(activiteAssignationEnCours);
            if (jourChoisi) { if (!e.joursAssignes) e.joursAssignes = {}; e.joursAssignes[activiteAssignationEnCours] = jourChoisi; }
            syncEleveVersSemaineActive(e); count++;
        } else {
            if (!e.enAttente) e.enAttente = [];
            if (!e.enAttente.includes(activiteAssignationEnCours)) e.enAttente.push(activiteAssignationEnCours);
            count++;
        }
    });
    sauvegarderEleves(); fermerModal('modalAssigner'); rafraichirDashboard(); if (idEleveCourant) afficherPlanHebdo();
    showToast(isRecurrent ? `🔄 Épinglé en rituel hebdo à ${count} élève(s) !` : `Assigné à ${count} élève(s).`, "success");
}

function cloreSemainePourUnEleve(eleve) {
    assurerStructureSemaines(eleve); syncEleveVersSemaineActive(eleve);
    let aTransferer = [...new Set([...(eleve.recurrents || []), ...(eleve.enAttente || [])])];
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
        aTransferer.forEach(idAct => {
            if (!s.planHebdo.includes(idAct)) s.planHebdo.unshift(idAct);
            if (!(eleve.recurrents && eleve.recurrents.includes(idAct)) && !s.priorites.includes(idAct)) s.priorites.push(idAct);
        });
        (eleve.recurrents || []).forEach(idRec => {
            if (s.valides && s.valides[idRec]) delete s.valides[idRec];
        });
        eleve.planHebdo = [...s.planHebdo]; eleve.priorites = [...s.priorites]; eleve.joursAssignes = { ...(s.joursAssignes || {}) }; eleve.sequencesChoisies = { ...(eleve.sequencesChoisies || {}), ...(s.sequencesChoisies || {}) }; eleve.valides = { ...(s.valides || {}) }; eleve.suivi = { ...(eleve.suivi || {}), ...(s.suivi || {}) }; eleve.dateDebutISO = s.dateDebutISO || ""; eleve.dateDebut = s.dateDebut || ""; eleve.dateFin = s.dateFin || "";
    } else {
        let nextISO = "", nextDeb = "", nextFin = "";
        if (eleve.dateDebutISO) { let c = calculerVendrediDepuisISO(eleve.dateDebutISO); if (c.lundiSuivantISO) { nextISO = c.lundiSuivantISO; let c2 = calculerVendrediDepuisISO(nextISO); nextDeb = c2.debutFR; nextFin = c2.finFR; } }
        let priosReport = aTransferer.filter(idAct => !(eleve.recurrents && eleve.recurrents.includes(idAct)));
        eleve.planHebdo = [...aTransferer]; eleve.valides = {}; eleve.priorites = priosReport; eleve.joursAssignes = {}; eleve.dateDebutISO = nextISO; eleve.dateDebut = nextDeb; eleve.dateFin = nextFin;
        eleve.semaines[0] = { id: 'sem_' + Date.now(), dateDebutISO: nextISO, dateDebut: nextDeb, dateFin: nextFin, planHebdo: [...eleve.planHebdo], priorites: [...eleve.priorites], joursAssignes: {}, sequencesChoisies: { ...(eleve.sequencesChoisies || {}) }, valides: {}, suivi: JSON.parse(JSON.stringify(eleve.suivi || {})) };
    }
    dashboardArchives = dashboardArchives.filter(cle => !cle.startsWith(eleve.id + '_'));
}

function commencerNouvelleSemaine() {
    if (!idEleveCourant) return; let eleve = eleves[idEleveCourant];
    if (confirm(`Clôturer la Semaine ${eleve.semaineIndex + 1} de ${eleve.nom}, reporter les non validés et réinitialiser ses rituels hebdomadaires ?`)) {
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

function marquerCommeValideSansRafraichir(idActivite, eleve, seqForcee = null) {
    const act = baseDonnees.find(b => b.id === idActivite); if (!act) return;
    const dateValid = new Date().toLocaleDateString('fr-FR');
    if (!eleve.valides) eleve.valides = {};
    eleve.valides[idActivite] = dateValid;

    let seqCible = (seqForcee !== null && seqForcee !== undefined && seqForcee !== "")
        ? seqForcee
        : getSequenceActivePourEleve(eleve, act);

    let isRec = eleve.recurrents && eleve.recurrents.includes(idActivite);
    let dejaHistPourSeq = estActiviteValideePourSequence(eleve, act, seqCible);

    if (!dejaHistPourSeq) {
        eleve.historique.push({ idActivite: idActivite, date: dateValid, sequence: seqCible });
    } else if (isRec) {
        let hExist = eleve.historique.find(h => h.idActivite === idActivite && (!seqCible || (h.sequence || "").toLowerCase() === seqCible.toLowerCase()));
        if (hExist) hExist.date = dateValid;
    }
    if (eleve.suivi && eleve.suivi[idActivite]) delete eleve.suivi[idActivite];

    let seqNorm = (seqCible || "").trim().toLowerCase();
    let matAct = (act.matiere || "").trim().toLowerCase();
    if (act.estEvaluation && seqNorm !== "") {
        let nivEleve = (eleve.niveau || "CP").toUpperCase();

        let activitesMemeSequence = baseDonnees.filter(b => {
            if (!b) return false;
            if ((b.matiere || "").trim().toLowerCase() !== matAct) return false;
            if (!activiteAppartientASequence(b, seqCible)) return false;
            let nivB = (b.niveau || "").toUpperCase();
            return !nivB || nivB.includes(nivEleve) || nivB === "TOUS";
        });

        let evalsDeLaSequence = activitesMemeSequence.filter(b => b.estEvaluation);

        let toutesEvalsFaites = evalsDeLaSequence.length > 0 && evalsDeLaSequence.every(ev => {
            return (eleve.valides && eleve.valides[ev.id]) || estActiviteValideePourSequence(eleve, ev, seqCible);
        });

        if (toutesEvalsFaites) {
            activitesMemeSequence.forEach(b => {
                if (!estActiviteValideePourSequence(eleve, b, seqCible)) {
                    eleve.historique.push({ idActivite: b.id, date: dateValid, sequence: seqCible });
                }
                let seqBActive = getSequenceActivePourEleve(eleve, b);
                if (!seqBActive || seqBActive.toLowerCase() === seqNorm) {
                    eleve.valides[b.id] = dateValid;
                    if (eleve.suivi && eleve.suivi[b.id]) delete eleve.suivi[b.id];
                    if (eleve.enAttente) eleve.enAttente = eleve.enAttente.filter(idA => idA !== b.id);
                }
            });
            showToast(`🎯 Séquence "${seqCible}" validée et archivée en entier !`, "success");
        } else {
            let nbRestantes = evalsDeLaSequence.filter(ev => !(eleve.valides && eleve.valides[ev.id]) && !estActiviteValideePourSequence(eleve, ev, seqCible)).length;
            showToast(`🎯 Évaluation validée (${nbRestantes} autre(s) évaluation(s) restante(s) pour archiver la séquence "${seqCible}").`, "success");
        }
    }
}

function annulerValidationPlan(idActivite) {
    if (!idEleveCourant) return;
    let eleve = eleves[idEleveCourant];
    let act = baseDonnees.find(b => b.id === idActivite);
    let seqActive = act ? getSequenceActivePourEleve(eleve, act) : "";
    if (eleve.valides && eleve.valides[idActivite]) {
        delete eleve.valides[idActivite];
        eleve.historique = eleve.historique.filter(h => {
            if (h.idActivite !== idActivite) return true;
            if (seqActive && h.sequence) return h.sequence.toLowerCase() !== seqActive.toLowerCase();
            return false;
        });
        sauvegarderEleves(); afficherPlanHebdo(); afficherHistorique(); afficherRessourcesDisponibles(); rafraichirDashboard();
    }
}

function validerDirectement(idActivite) {
    if (!idEleveCourant) return;
    let eleve = eleves[idEleveCourant];
    let seqInput = document.getElementById('seq_dispo_' + idActivite);
    let seqCible = seqInput ? seqInput.value : null;
    marquerCommeValideSansRafraichir(idActivite, eleve, seqCible);
    sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); afficherPlanHebdo(); rafraichirDashboard();
}
function masquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees.push(idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }
function demasquerActivite(idActivite) { if (!idEleveCourant) return; eleves[idEleveCourant].masquees = eleves[idEleveCourant].masquees.filter(id => id !== idActivite); sauvegarderEleves(); afficherRessourcesDisponibles(); afficherHistorique(); }

function ajouterAuPlan(idActivite) {
    const eleve = eleves[idEleveCourant], max = eleve.maxAteliers || 15;
    let seqInput = document.getElementById('seq_dispo_' + idActivite);
    let seqChoisie = seqInput ? seqInput.value : "";
    if (!eleve.sequencesChoisies) eleve.sequencesChoisies = {};
    if (seqChoisie) eleve.sequencesChoisies[idActivite] = seqChoisie;

    if (eleve.planHebdo.length >= max) {
        if (!eleve.enAttente) eleve.enAttente = [];
        if (!eleve.enAttente.includes(idActivite)) eleve.enAttente.push(idActivite);
        sauvegarderEleves(); afficherRessourcesDisponibles(); afficherPlanHebdo();
        showToast(`⚠️ Quota (${max}) atteint : placé en file d'attente !`, "error");
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
    let seqInput = document.getElementById('seq_dispo_' + idActivite);
    if (seqInput && seqInput.value) {
        if (!eleve.sequencesChoisies) eleve.sequencesChoisies = {};
        eleve.sequencesChoisies[idActivite] = seqInput.value;
    }
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
    let e = eleves[idEleveCourant];
    if (e.recurrents && e.recurrents.includes(idActivite)) {
        if (!confirm("Cette activité est épinglée en rituel hebdomadaire (🔄). Voulez-vous aussi la retirer des rituels récurrents de cet élève ?")) {
            let idxOnly = e.planHebdo.indexOf(idActivite);
            if (idxOnly > -1) e.planHebdo.splice(idxOnly, 1);
            sauvegarderEleves(); afficherPlanHebdo(); return;
        }
        e.recurrents = e.recurrents.filter(id => id !== idActivite);
    }
    let idx = e.planHebdo.indexOf(idActivite);
    if (idx > -1) e.planHebdo.splice(idx, 1);
    else { idx = (e.enAttente || []).indexOf(idActivite); if (idx > -1) e.enAttente.splice(idx, 1); }
    if (e.suivi && e.suivi[idActivite]) delete e.suivi[idActivite];
    if (e.valides && e.valides[idActivite]) delete e.valides[idActivite];
    if (e.joursAssignes && e.joursAssignes[idActivite]) delete e.joursAssignes[idActivite];
    sauvegarderEleves(); majBarreSemainesUI(); afficherRessourcesDisponibles(); afficherPlanHebdo(); rafraichirDashboard(); showToast("Retiré");
}

function desarchiverActivite(idActivite, seqSpecifique = "") {
    if (!idEleveCourant) return;
    const eleve = eleves[idEleveCourant];
    const index = eleve.historique.findIndex(h => h.idActivite === idActivite && (!seqSpecifique || (h.sequence || "") === seqSpecifique));
    if (index > -1) {
        eleve.historique.splice(index, 1);
        if (eleve.valides) delete eleve.valides[idActivite];
        sauvegarderEleves(); afficherHistorique(); afficherPlanHebdo(); afficherRessourcesDisponibles(); rafraichirDashboard();
    }
}

function afficherPlanHebdo() {
    const eleve = eleves[idEleveCourant], tbodyApercu = document.getElementById('tableApercuPlan'); if (!tbodyApercu || !eleve) return; tbodyApercu.innerHTML = '';
    afficherBandeauRecurrentsEleve();
    document.getElementById('compteurAteliersEleve').innerText = eleve.planHebdo.length; document.getElementById('maxAteliersAffiche').innerText = eleve.maxAteliers || 15;
    let nbTabCount = eleve.planHebdo.map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
    let compteurTabElem = document.getElementById('compteurTablettesEleve'); if (compteurTabElem) compteurTabElem.innerText = `${nbTabCount}/${eleve.maxTablettes ?? 2}`;

    let planObjects = getListeTrie(eleve.planHebdo, eleve.priorites || [], eleve);
    planObjects.forEach((a, index) => {
        const num = index + 1;
        let isRec = eleve.recurrents && eleve.recurrents.includes(a.id);
        let badge = a.estEvaluation ? `<span class="badge-eval">🎯 Éval</span>` : '';
        let badgeRecHtml = isRec ? ` <span class="badge-recurrent" title="Revient automatiquement chaque semaine">🔄 Hebdo</span>` : '';
        let badgeLien = (a.lienExterne && a.lienExterne.trim()) ? ` <a href="${escHTML(a.lienExterne.trim())}" target="_blank" rel="noopener noreferrer" style="background:#f5eef8; color:#6c3483; padding:1px 5px; border-radius:4px; font-size:11px; font-weight:bold; text-decoration:none; border:1px solid #d7bde2;" title="Ouvrir sur Anton">🔗 Anton ↗</a>` : '';
        let estValide = eleve.valides && eleve.valides[a.id];
        let rowClass = a.estEvaluation ? 'row-eval' : (estValide ? 'row-valide' : '');
        let statutSuivi = (eleve.suivi && eleve.suivi[a.id]) ? eleve.suivi[a.id].statut : "";
        let isPrio = (eleve.priorites && eleve.priorites.includes(a.id));
        let logoDebutLigne = statutSuivi === 'a_revoir' ? `👩‍🏫 ` : (statutSuivi === 'a_refaire' ? `🔄 ` : "");
        let infosL = getInfosActivitePourEleve(a, eleve);
        let rep = getRepereAtelierHtml(a, eleve, 28);

        let seqsAct = extraireListeSequences(a.sequence);
        let seqActive = getSequenceActivePourEleve(eleve, a);
        let seqPlanHtml = seqsAct.length > 1
            ? `<select onchange="changerSequenceChoisiePlan('${a.id}', this.value)" style="width:100%; padding:2px 4px; font-size:11.5px; font-weight:bold; background:#fef9e7; color:#7d6608; border:1px solid #f5b041; border-radius:4px; margin-top:2px;">` +
              seqsAct.map(s => `<option value="${escHTML(s)}" ${s === seqActive ? 'selected' : ''}>📑 ${escHTML(s)}</option>`).join('') +
              `</select>`
            : escHTML(seqActive);

        let suiviHtml = `<div style="margin-top:4px; display:flex; gap:4px; flex-wrap:wrap;">
            <button type="button" class="filter-btn" style="font-size:11px; padding:2px 6px; ${statutSuivi === 'a_revoir' ? 'background:#c0392b; color:#fff;' : ''}" onclick="definirStatutSuivi('${a.id}', '${statutSuivi === 'a_revoir' ? '' : 'a_revoir'}')">👩‍🏫 À revoir</button>
            <button type="button" class="filter-btn" style="font-size:11px; padding:2px 6px; ${statutSuivi === 'a_refaire' ? 'background:#e67e22; color:#fff;' : ''}" onclick="definirStatutSuivi('${a.id}', '${statutSuivi === 'a_refaire' ? '' : 'a_refaire'}')">🔄 À refaire</button>
            <button type="button" class="filter-btn" style="font-size:11px; padding:2px 6px; ${isRec ? 'background:#8e44ad; color:#fff; border-color:#6c3483;' : ''}" title="Épingler/Désépingler comme rituel hebdomadaire pour cet élève" onclick="toggleRecurrentEleve('${a.id}')">${isRec ? '🔄 Hebdo actif' : '➕🔄 Hebdo'}</button>
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
            <td><span style="display:inline-block; padding:2px 8px; border-radius:4px; background:${coulMat.bg}; color:${coulMat.text}; font-weight:bold; font-size:12px; margin-bottom:3px;">${escHTML(a.matiere)}</span><br>${seqPlanHtml}</td>
            <td>${a.lecon ? '<strong>'+escHTML(a.lecon)+'</strong> - ' : ''}${formaterAffichageCompetences(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${infosL.badgeLivre}${badgeLien} ${badge}${badgeRecHtml} ${suiviHtml}</td>
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
                <td><strong>${escHTML(a.matiere)}</strong> — ${escHTML(getSequenceActivePourEleve(eleve, a))}</td>
                <td>${formaterAffichageCompetences(a.competence)}</td>
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
    [...eleve.historique].reverse().forEach(hist => {
        const a = baseDonnees.find(b => b.id === hist.idActivite);
        if (a) {
            let seqHist = hist.sequence || a.sequence || "";
            tbodyHist.innerHTML += `<tr><td><strong>${escHTML(hist.date)}</strong></td><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(seqHist)}</td><td>${formaterAffichageCompetences(a.competence)}</td><td>${formaterEtoiles(a.difficulte)}${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="desarchiverActivite('${a.id}', '${escJS(hist.sequence || '')}')">↩️</button></td></tr>`;
        }
    });
    if (eleve.historique.length === 0) tbodyHist.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7f8c8d;">Aucun.</td></tr>';
    eleve.masquees.forEach(idAct => { const a = baseDonnees.find(b => b.id === idAct); if (a) tbodyMasq.innerHTML += `<tr><td>${escHTML(a.niveau)}</td><td><strong>${escHTML(a.matiere)}</strong><br>${formaterAffichageSequences(a.sequence)}</td><td>${formaterAffichageCompetences(a.competence)}</td><td>${escHTML(a.ressource)}</td><td style="text-align:center;"><button type="button" class="filter-btn" onclick="demasquerActivite('${a.id}')">↩️</button></td></tr>`; });
    if (eleve.masquees.length === 0) tbodyMasq.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Aucune.</td></tr>';
}

// ==========================================
// 5. ONGLET 2 : IMPRESSION FICHES ÉLÈVES (N° FIXES + SEMAINIER)
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
    let planObjects = getListeTrie(e.planHebdo, e.priorites || [], e);

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
        let seqEleve = getSequenceActivePourEleve(e, a);
        let cleSeq = `${a.matiere || ''}||${seqEleve || ''}`;
        if (cleSeq !== derniereCleSeq) {
            derniereCleSeq = cleSeq;
            let coul = getCouleurMatiereBandeau(a.matiere);
            rowsHtml += `<tr class="sequence-separator-row">
                <td colspan="7" style="background-color: ${coul.bg} !important; color: ${coul.text} !important; border-color: ${coul.border} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    📑 ${escHTML(a.matiere || '')} — Séquence : ${escHTML(seqEleve || 'Sans séquence')}
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
            <td><strong>${escHTML(a.matiere)}</strong><br>${escHTML(seqEleve)}</td>
            <td>${a.lecon ? '<em>' + escHTML(a.lecon) + '</em><br>' : ''}${formaterAffichageCompetences(a.competence)}</td>
            <td>${logoMaitresseDebut}${formaterEtoiles(a.difficulte)}<strong style="${resStyle}">${escHTML(a.ressource)}</strong> ${infos.badgeLivre}${badgeEval}</td>
            <td class="col-center">${escHTML(infos.typeEffectif)}</td>
            <td class="col-center print-visual-cell" style="background-color:${rep.bg} !important; width:85px; text-align:center;">${rep.html}</td>
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
        blocsPied.push(`<div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-around;"><strong>🌤️ Météo :</strong> ${icones}</div>`);
    }
    if (!printConfig || printConfig.afficherSignature !== false) {
        blocsPied.push(`<div style="flex:1; border:1px solid #7f8c8d; border-radius:4px; padding:4px 8px; display:flex; align-items:center; justify-content:space-between;"><strong>✍️ Signature :</strong> <span>..................</span></div>`);
    }

    let bilanBasPageHtml = blocsPied.length > 0 ? `<div style="display:flex; justify-content:space-between; align-items:stretch; gap:8px; margin-top:6px; font-size:10px;">${blocsPied.join('')}</div>` : '';
    let commBasHtml = (printConfig && printConfig.afficherCommentaire) ? `<div style="margin-top:6px; border:1px dashed #7f8c8d; border-radius:4px; padding:5px 8px; font-size:11px; min-height:32px;"><strong>💬 Mot de l'enseignante :</strong></div>` : '';

    return `<div class="fiche-plan-print plan-eleve-page ${format === 'A4' ? 'a4-page' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1b4f72; padding-bottom:5px; margin-bottom:6px;">
            <h2 style="margin:0; border:none; padding:0; font-size:17px; color:#1b4f72;">${escHTML(titreFiche)} — ${escHTML(e.nom)} (${escHTML(e.niveau)})</h2>
            <span style="font-size:12px; color:#2c3e50; font-weight:bold;">Semaine ${(e.semaineIndex || 0) + 1} ${(e.dateDebut && e.dateFin) ? `du ${e.dateDebut} au ${e.dateFin}` : ''}</span>
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
                    <th class="col-center" style="width:85px;">N° Atelier</th>
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
// 6. ONGLET 3 : TABLEAU DE BORD & PLAN DE TRAVAIL ENSEIGNANTE (ORDRE DE HAUT EN BAS + IMPRESSION ÉLÈVES)
// ==========================================
const JOURS_SEMAINE_PROF = ["Lundi", "Mardi", "Jeudi", "Vendredi"];
const GROUPES_NIVEAUX_PROF = ["CP", "CE1", "CE2", "CM1-CM2"];

function getStyleNiveauProf(pole, niv) {
    if (pole === 'francais') {
        if (niv === 'CP') return { bg: '#d5a6bd', text: '#2c3e50' };
        if (niv === 'CE1' || niv === 'CE2') return { bg: '#b6d7a8', text: '#1b4332' };
        if (niv === 'CM1-CM2') return { bg: '#9fc5e8', text: '#154360' };
    } else {
        if (niv === 'CP') return { bg: '#ffe599', text: '#7c2d12' };
        if (niv === 'CE1' || niv === 'CE2') return { bg: '#f6b26b', text: '#784212' };
        if (niv === 'CM1-CM2') return { bg: '#ea9999', text: '#641e16' };
    }
    return { bg: '#ecf0f1', text: '#2c3e50' };
}

function creerSemaineProfVide(dateDebutISO = "", dateDebut = "", dateFin = "") {
    let grilles = { francais: {}, maths: {} };
    ["francais", "maths"].forEach(mat => {
        JOURS_SEMAINE_PROF.forEach(j => {
            grilles[mat][j] = GROUPES_NIVEAUX_PROF.map(niv => ({
                niveau: niv,
                texte: "",
                fait: false
            }));
        });
    });
    return {
        id: 'semprof_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        dateDebutISO: dateDebutISO,
        dateDebut: dateDebut,
        dateFin: dateFin,
        francais: grilles.francais,
        maths: grilles.maths
    };
}

function assurerStructurePlanningProf() {
    if (!planningLeconsProf || typeof planningLeconsProf !== 'object') {
        planningLeconsProf = { semaineIndex: 0, semaines: [] };
    }
    if (!Array.isArray(planningLeconsProf.semaines) || planningLeconsProf.semaines.length === 0) {
        planningLeconsProf.semaines = [creerSemaineProfVide()];
        planningLeconsProf.semaineIndex = 0;
    }
    if (planningLeconsProf.semaineIndex < 0 || planningLeconsProf.semaineIndex >= planningLeconsProf.semaines.length) {
        planningLeconsProf.semaineIndex = 0;
    }

    planningLeconsProf.semaines.forEach(s => {
        ["francais", "maths"].forEach(mat => {
            if (!s[mat]) s[mat] = {};
            if (!Array.isArray(s[mat]["Lundi"])) {
                let ancien = s[mat];
                let nouvMat = {};
                JOURS_SEMAINE_PROF.forEach(j => {
                    let temp = [];
                    GROUPES_NIVEAUX_PROF.forEach((niv, idx) => {
                        let oldCell = (ancien[niv] && ancien[niv][j]) ? ancien[niv][j] : { texte: "", ordre: "", fait: false };
                        let rang = parseInt(oldCell.ordre) || (idx + 1);
                        temp.push({ niveau: niv, texte: oldCell.texte || "", fait: Boolean(oldCell.fait), rang: rang });
                    });
                    temp.sort((a, b) => a.rang - b.rang);
                    nouvMat[j] = temp.map(x => ({ niveau: x.niveau, texte: x.texte, fait: x.fait }));
                });
                s[mat] = nouvMat;
            }
            JOURS_SEMAINE_PROF.forEach(j => {
                if (!Array.isArray(s[mat][j]) || s[mat][j].length < 4) {
                    s[mat][j] = GROUPES_NIVEAUX_PROF.map((niv, idx) => {
                        let exist = (Array.isArray(s[mat][j]) && s[mat][j][idx]) ? s[mat][j][idx] : null;
                        return exist ? { niveau: exist.niveau ?? niv, texte: exist.texte || "", fait: Boolean(exist.fait) } : { niveau: niv, texte: "", fait: false };
                    });
                }
            });
        });
    });
}

function sauvegarderPlanningProf() {
    assurerStructurePlanningProf();
    localStorage.setItem(KEY_LECONS_PROF, JSON.stringify(planningLeconsProf));
    declencherAutoSaveFirebase();
}

function changerSemaineProf(nouvIdx) {
    assurerStructurePlanningProf();
    planningLeconsProf.semaineIndex = parseInt(nouvIdx) || 0;
    sauvegarderPlanningProf();
    rafraichirDashboard();
}

function appliquerDateSemaineProf(dateISO) {
    assurerStructurePlanningProf();
    let sem = planningLeconsProf.semaines[planningLeconsProf.semaineIndex];
    let calc = calculerVendrediDepuisISO(dateISO);
    sem.dateDebutISO = dateISO || "";
    sem.dateDebut = calc.debutFR;
    sem.dateFin = calc.finFR;
    sauvegarderPlanningProf();
    rafraichirDashboard();
}

function ajouterSemaineProfAvance() {
    assurerStructurePlanningProf();
    let derniere = planningLeconsProf.semaines[planningLeconsProf.semaines.length - 1];
    let nouvISO = "", nouvDeb = "", nouvFin = "";
    if (derniere && derniere.dateDebutISO) {
        let calcPrec = calculerVendrediDepuisISO(derniere.dateDebutISO);
        if (calcPrec.lundiSuivantISO) {
            nouvISO = calcPrec.lundiSuivantISO;
            let calcNouv = calculerVendrediDepuisISO(nouvISO);
            nouvDeb = calcNouv.debutFR;
            nouvFin = calcNouv.finFR;
        }
    }
    let nouvSem = creerSemaineProfVide(nouvISO, nouvDeb, nouvFin);
    planningLeconsProf.semaines.push(nouvSem);
    planningLeconsProf.semaineIndex = planningLeconsProf.semaines.length - 1;
    sauvegarderPlanningProf();
    rafraichirDashboard();
    showToast(`📅 Semaine ${planningLeconsProf.semaines.length} de leçons créée !`, "success");
}

function supprimerSemaineProfActive() {
    assurerStructurePlanningProf();
    if (planningLeconsProf.semaines.length <= 1) return;
    if (confirm(`Supprimer la Semaine ${planningLeconsProf.semaineIndex + 1} de votre agenda de leçons ?`)) {
        planningLeconsProf.semaines.splice(planningLeconsProf.semaineIndex, 1);
        planningLeconsProf.semaineIndex = Math.max(0, planningLeconsProf.semaineIndex - 1);
        sauvegarderPlanningProf();
        rafraichirDashboard();
        showToast("Semaine de leçons supprimée.", "success");
    }
}

function cloreSemaineProfActive() {
    assurerStructurePlanningProf();
    let idx = planningLeconsProf.semaineIndex;
    let semActuelle = planningLeconsProf.semaines[idx];
    if (!confirm(`Clôturer la Semaine ${idx + 1} de vos leçons explicites ?\n\n💡 Les leçons non cochées (non faites) seront automatiquement reportées sur la semaine suivante en conservant leur ordre de passage.`)) return;

    let cibleSem = null;
    if (planningLeconsProf.semaines.length > 1 && idx < planningLeconsProf.semaines.length - 1) {
        cibleSem = planningLeconsProf.semaines[idx + 1];
    } else {
        let nouvISO = "", nouvDeb = "", nouvFin = "";
        if (semActuelle.dateDebutISO) {
            let c = calculerVendrediDepuisISO(semActuelle.dateDebutISO);
            if (c.lundiSuivantISO) {
                nouvISO = c.lundiSuivantISO;
                let c2 = calculerVendrediDepuisISO(nouvISO);
                nouvDeb = c2.debutFR;
                nouvFin = c2.finFR;
            }
        }
        cibleSem = creerSemaineProfVide(nouvISO, nouvDeb, nouvFin);
        planningLeconsProf.semaines.push(cibleSem);
    }

    ["francais", "maths"].forEach(mat => {
        JOURS_SEMAINE_PROF.forEach(j => {
            for (let slot = 0; slot < 4; slot++) {
                let cellOld = semActuelle[mat][j][slot];
                if (cellOld && cellOld.texte.trim() !== "" && !cellOld.fait) {
                    if (!cibleSem[mat][j][slot].texte) {
                        cibleSem[mat][j][slot].niveau = cellOld.niveau;
                        cibleSem[mat][j][slot].texte = cellOld.texte;
                    }
                }
            }
        });
    });

    planningLeconsProf.semaines.splice(idx, 1);
    planningLeconsProf.semaineIndex = Math.min(idx, planningLeconsProf.semaines.length - 1);
    sauvegarderPlanningProf();
    rafraichirDashboard();
    showToast("✅ Semaine de leçons clôturée (non faites reportées) !", "success");
}

function majSlotLeconProf(pole, jour, slotIdx, champ, valeur) {
    assurerStructurePlanningProf();
    let sem = planningLeconsProf.semaines[planningLeconsProf.semaineIndex];
    if (!sem || !sem[pole] || !sem[pole][jour] || !sem[pole][jour][slotIdx]) return;
    sem[pole][jour][slotIdx][champ] = valeur;
    sauvegarderPlanningProf();
    if (champ !== 'texte') {
        rafraichirDashboard();
    } else {
        let spanPrint = document.getElementById(`print_txt_${pole}_${jour}_${slotIdx}`);
        if (spanPrint) spanPrint.innerText = valeur || "—";
    }
}

function deplacerSlotLeconProf(pole, jour, slotIdx, direction) {
    assurerStructurePlanningProf();
    let sem = planningLeconsProf.semaines[planningLeconsProf.semaineIndex];
    let nouvIdx = slotIdx + direction;
    if (nouvIdx < 0 || nouvIdx >= 4) return;
    let temp = sem[pole][jour][slotIdx];
    sem[pole][jour][slotIdx] = sem[pole][jour][nouvIdx];
    sem[pole][jour][nouvIdx] = temp;
    sauvegarderPlanningProf();
    rafraichirDashboard();
}

function imprimerPlanningLeconsProf() {
    document.body.classList.add('print-lecons-only');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('print-lecons-only');
    }, 600);
}

function genererDatalistSuggestionsLecons(pole, niveauGroupe) {
    let suggestions = new Set();
    let nivCibles = niveauGroupe === "CM1-CM2" ? ["CM1", "CM2"] : (niveauGroupe ? [niveauGroupe] : ["CP", "CE1", "CE2", "CM1", "CM2"]);
    baseDonnees.forEach(a => {
        if (!a) return;
        let matNorm = (a.matiere || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let estBonPole = (pole === 'francais')
            ? (matNorm.includes('francais') || matNorm.includes('grammaire') || matNorm.includes('conjugaison') || matNorm.includes('orthographe') || matNorm.includes('lexique') || matNorm.includes('vocabulaire') || matNorm.includes('ecriture'))
            : (matNorm.includes('math') || matNorm.includes('numeration') || matNorm.includes('calcul') || matNorm.includes('geometrie') || matNorm.includes('mesure') || matNorm.includes('algebre') || matNorm.includes('programmation'));
        if (!estBonPole) return;
        let nivAct = (a.niveau || "").toUpperCase();
        if (!nivCibles.some(n => nivAct.includes(n))) return;

        let prefixLecon = a.lecon ? `${a.lecon} - ` : "";
        extraireListeCompetences(a.competence).forEach(c => suggestions.add(`${prefixLecon}${c}`));
        extraireListeSequences(a.sequence).forEach(s => suggestions.add(`${prefixLecon}${s}`));
    });
    return Array.from(suggestions).sort((a, b) => a.localeCompare(b, 'fr'));
}

function genererTableauLeconsPoleHtml(pole, titre, couleurBandeau, sem) {
    let datalistsHtml = "";
    GROUPES_NIVEAUX_PROF.forEach(niv => {
        let idDl = `dl_prof_${pole}_${niv.replace('-', '_')}`;
        let suggs = genererDatalistSuggestionsLecons(pole, niv);
        datalistsHtml += `<datalist id="${idDl}">${suggs.map(s => `<option value="${escHTML(s)}">`).join('')}</datalist>`;
    });

    const labelsOrdre = ["1er passage", "2e passage", "3e passage", "4e passage"];

    let rowsHtml = [0, 1, 2, 3].map(slotIdx => {
        let cellsHtml = JOURS_SEMAINE_PROF.map(jour => {
            let cell = (sem[pole][jour] && sem[pole][jour][slotIdx]) ? sem[pole][jour][slotIdx] : { niveau: GROUPES_NIVEAUX_PROF[slotIdx], texte: "", fait: false };
            let stNiv = getStyleNiveauProf(pole, cell.niveau);
            let idDl = cell.niveau ? `dl_prof_${pole}_${cell.niveau.replace('-', '_')}` : '';
            let bgCell = cell.fait ? "#d4efdf" : "#ffffff";

            let optionsNiv = `<option value="" ${!cell.niveau ? 'selected' : ''}>-- Pause / Libre --</option>` +
                GROUPES_NIVEAUX_PROF.map(n => `<option value="${n}" ${cell.niveau === n ? 'selected' : ''}>Groupe ${n}</option>`).join('');

            return `<td style="background:${bgCell}; padding:6px; vertical-align:top; border:1px solid #cbd5e1;">
                <div class="no-print">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; gap:3px;">
                        <select onchange="majSlotLeconProf('${pole}', '${jour}', ${slotIdx}, 'niveau', this.value)" style="background:${stNiv.bg}; color:${stNiv.text}; font-weight:bold; font-size:12px; padding:2px 6px; border-radius:5px; border:1px solid rgba(0,0,0,0.18); cursor:pointer;">
                            ${optionsNiv}
                        </select>
                        <div style="display:flex; align-items:center; gap:2px;">
                            ${slotIdx > 0 ? `<button type="button" class="filter-btn" style="padding:1px 4px; font-size:10px;" title="Monter ce groupe plus tôt" onclick="deplacerSlotLeconProf('${pole}', '${jour}', ${slotIdx}, -1)">▲</button>` : ''}
                            ${slotIdx < 3 ? `<button type="button" class="filter-btn" style="padding:1px 4px; font-size:10px;" title="Descendre ce groupe plus tard" onclick="deplacerSlotLeconProf('${pole}', '${jour}', ${slotIdx}, 1)">▼</button>` : ''}
                            <label style="font-size:11px; font-weight:bold; color:${cell.fait ? '#1e8449' : '#7f8c8d'}; cursor:pointer; margin-left:3px; display:flex; align-items:center; gap:2px;" title="Cocher quand la leçon a été donnée">
                                <input type="checkbox" ${cell.fait ? 'checked' : ''} onchange="majSlotLeconProf('${pole}', '${jour}', ${slotIdx}, 'fait', this.checked)" style="cursor:pointer;">
                                ${cell.fait ? '✅' : ''}
                            </label>
                        </div>
                    </div>
                    <input type="text" list="${idDl}" value="${escHTML(cell.texte || '')}" placeholder="Leçon / notion..." oninput="majSlotLeconProf('${pole}', '${jour}', ${slotIdx}, 'texte', this.value)" style="width:100%; padding:5px 7px; font-size:12.5px; font-weight:${cell.texte ? '600' : 'normal'}; border:1px solid #cbd5e1; border-radius:5px; ${cell.fait ? 'text-decoration:line-through; color:#1e8449; background:#e8f8f5;' : 'background:#fff;'}">
                </div>

                <div class="only-print-lecons" style="text-align:center; padding:3px 2px;">
                    ${cell.niveau ? `<div style="display:inline-block; background:${stNiv.bg} !important; color:${stNiv.text} !important; font-weight:bold; font-size:11.5pt; padding:2px 10px; border-radius:6px; border:1px solid #2c3e50; margin-bottom:4px;">${escHTML(cell.niveau)}</div>` : ''}
                    <div id="print_txt_${pole}_${jour}_${slotIdx}" style="font-size:11pt; font-weight:bold; color:#1e293b; line-height:1.2; ${cell.fait ? 'text-decoration:line-through; opacity:0.6;' : ''}">
                        ${escHTML(cell.texte || '—')}
                    </div>
                </div>
            </td>`;
        }).join('');

        return `<tr>
            <td style="font-weight:bold; font-size:12.5px; text-align:center; background:#f1f5f9; color:#1e293b; width:88px;">
                <span style="display:inline-block; background:${couleurBandeau}; color:#fff; border-radius:50%; width:22px; height:22px; line-height:22px; font-size:12px; margin-bottom:2px;">${slotIdx + 1}</span><br>
                <small>${labelsOrdre[slotIdx]}</small>
            </td>
            ${cellsHtml}
        </tr>`;
    }).join('');

    return `<div class="card-panel card-pole-lecon" style="border-top:4px solid ${couleurBandeau}; padding:12px 14px;">
        <div style="background:${couleurBandeau} !important; color:#ffffff !important; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>${titre}</span>
            <small style="font-weight:normal; opacity:0.95;">⬇ Ordre de passage de haut en bas (1er ➔ 4e)</small>
        </div>
        ${datalistsHtml}
        <div style="overflow-x:auto;">
            <table class="table-classique" style="table-layout:fixed; min-width:620px;">
                <thead>
                    <tr>
                        <th style="width:88px; text-align:center;">Passage</th>
                        <th style="text-align:center;">LUNDI</th>
                        <th style="text-align:center;">MARDI</th>
                        <th style="text-align:center;">JEUDI</th>
                        <th style="text-align:center;">VENDREDI</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    </div>`;
}

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

function definirLienRapideDepuisDash(idAct) {
    let a = baseDonnees.find(b => b.id === idAct);
    if (!a) return;
    let url = prompt(`Collez ici le lien direct Anton pour "${a.ressource}" :`, a.lienExterne || "");
    if (url !== null) {
        a.lienExterne = url.trim();
        sauvegarderBase();
        rafraichirDashboard();
        afficherBase();
        showToast("🔗 Lien Anton enregistré !", "success");
    }
}

function rafraichirDashboard() {
    const cont = document.getElementById('dashboardContent'); if (!cont) return;
    assurerStructurePlanningProf();
    let semProf = planningLeconsProf.semaines[planningLeconsProf.semaineIndex];

    let optionsSemProf = planningLeconsProf.semaines.map((s, idx) => {
        let dTxt = (s.dateDebut && s.dateFin) ? ` (du ${s.dateDebut} au ${s.dateFin})` : '';
        return `<option value="${idx}" ${idx === planningLeconsProf.semaineIndex ? 'selected' : ''}>Semaine ${idx + 1}${dTxt}${idx === 0 ? ' [En cours]' : ' [D\'avance]'}</option>`;
    }).join('');

    let titreDatesAffiche = (semProf.dateDebut && semProf.dateFin) ? `Semaine du ${semProf.dateDebut} au ${semProf.dateFin}` : `Semaine ${planningLeconsProf.semaineIndex + 1}`;

    let blocAgendaProfHtml = `
    <div id="blocPlanningLeconsPrint" class="card-panel" style="margin-bottom:22px; background:#f8fbff; border:2px solid #1b4f72;">
        <div class="only-print-lecons" style="text-align:center; border-bottom:3px solid #1b4f72; padding-bottom:8px; margin-bottom:12px;">
            <h1 style="margin:0; font-size:20pt; color:#1b4f72;">👩‍🏫 PLANNING DES LEÇONS AVEC LA MAÎTRESSE — ${escHTML(titreDatesAffiche)}</h1>
            <p style="margin:4px 0 0 0; font-size:11pt; color:#333;">Ordre de passage des groupes de haut en bas (1<sup>er</sup> passage ➔ 4<sup>e</sup> passage)</p>
        </div>

        <div class="semaines-flex no-print" style="margin-bottom:14px; padding-bottom:10px; border-bottom:1px dashed #bdc3c7;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <h3 style="margin:0; color:#1b4f72;">👩‍🏫 Planning des Leçons Explicites (Ordre de haut en bas)</h3>
                <select onchange="changerSemaineProf(this.value)" style="font-weight:bold; padding:6px 10px; border-radius:6px; border:1px solid #1b4f72;">
                    ${optionsSemProf}
                </select>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <label style="font-size:13px; font-weight:bold;">Lundi : <input type="date" min="2025-01-01" max="2035-12-31" value="${escHTML(semProf.dateDebutISO || '')}" onchange="appliquerDateSemaineProf(this.value)"></label>
                <span style="font-weight:bold; color:#1b4f72; font-size:13px;">${semProf.dateFin ? `➔ au Vendredi ${escHTML(semProf.dateFin)}` : '➔ Vendredi : --/--'}</span>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn-action" onclick="imprimerPlanningLeconsProf()" style="background:#8e44ad !important; color:#fff !important;" title="Imprimer ce planning de leçons pour l'afficher aux élèves">🖨️ Imprimer l'affichage élèves</button>
                <button type="button" class="btn-action" onclick="ajouterSemaineProfAvance()">➕ Semaine d'avance</button>
                ${planningLeconsProf.semaines.length > 1 ? `<button type="button" class="btn-danger" onclick="supprimerSemaineProfActive()">🗑️ Suppr.</button>` : ''}
                <button type="button" class="btn-valid" onclick="cloreSemaineProfActive()">🏁 Clôturer & Suivante</button>
            </div>
        </div>

        <div class="grid-2-cols grid-lecons-poles">
            ${genererTableauLeconsPoleHtml('francais', '📘 FRANÇAIS — Ordre des leçons explicites', '#1b4f72', semProf)}
            ${genererTableauLeconsPoleHtml('maths', '📕 MATHÉMATIQUES — Ordre des leçons explicites', '#c0392b', semProf)}
        </div>
    </div>`;

    const listeEl = getElevesTries();
    if (listeEl.length === 0) {
        cont.innerHTML = blocAgendaProfHtml + `<div class="empty-state no-print-lecons"><h3>Aucun élève enregistré pour le suivi individuel.</h3></div>`;
        return;
    }

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
                    lignesRemediation += `<tr style="${estArch ? 'opacity:0.5;' : ''}"><td><strong>[${escHTML(e.niveau)}] ${escHTML(e.nom)}</strong></td><td><span style="background:${coul.bg}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">${escHTML(act.matiere)}</span> ${escHTML(getSequenceActivePourEleve(e, act))}</td><td><strong>${escHTML(act.ressource)}</strong></td><td>${s.statut === 'a_revoir' ? '👩‍🏫' : '🔄'}</td><td><button type="button" class="btn-valid" style="padding:3px 7px;" onclick="validerDepuisDashboard('${e.id}', '${idAct}')">✅</button><button type="button" class="filter-btn" style="padding:3px 7px;" onclick="${estArch ? `restaurerArchive('${cleRem}')` : `archiverItem('${cleRem}')`}">${estArch ? '↩️' : '📥'}</button></td></tr>`;
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
    let html = blocAgendaProfHtml + `<div class="grid-2-cols no-print-lecons" style="margin-bottom:20px;">
        <div class="card-panel" style="border-left:5px solid #c0392b;"><h3 style="color:#c0392b; margin-bottom:10px;">👩‍🏫 Besoins d'ateliers dirigés & Remédiations</h3>${lignesRemediation ? `<table class="table-classique"><thead><tr><th>Élève</th><th>Matière</th><th>Atelier</th><th>Statut</th><th>Action</th></tr></thead><tbody>${lignesRemediation}</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune remédiation en cours.</p>`}</div>
        <div class="card-panel" style="border-left:5px solid #8e44ad;"><h3 style="color:#6c3483; margin-bottom:10px;">📱 Préparation Tablettes (Anton / Scratch)</h3>${tabKeys.length > 0 ? `<table class="table-classique"><thead><tr><th>Support</th><th>Activité & Lien direct</th><th>Élèves à épingler</th><th>Action</th></tr></thead><tbody>` + tabKeys.map(k => {
            let item = tachesTablettesMap[k];
            let btnLien = (item.act.lienExterne && item.act.lienExterne.trim() !== "")
                ? `<a href="${escHTML(item.act.lienExterne.trim())}" target="_blank" rel="noopener noreferrer" class="btn-action" style="display:inline-block; text-decoration:none; padding:3px 8px; font-size:11.5px; margin-top:4px; background:#8e44ad !important; color:#fff !important;">🔗 Ouvrir ${escHTML(item.act.typeRes || 'Anton')} ↗</a> <button type="button" class="filter-btn" style="padding:2px 5px; font-size:10px; margin-top:4px;" onclick="definirLienRapideDepuisDash('${item.act.id}')" title="Modifier le lien">✏️</button>`
                : `<button type="button" class="filter-btn" style="padding:2px 6px; font-size:10.5px; margin-top:3px;" onclick="definirLienRapideDepuisDash('${item.act.id}')" title="Ajouter le lien direct Anton">➕🔗 Ajouter lien</button>`;
            return `<tr style="${item.estArchTab ? 'opacity:0.5;' : ''}">
                <td><strong>${escHTML(item.act.typeRes)}</strong><br><small style="color:#666;">${escHTML(item.act.matiere)}</small></td>
                <td><strong>${escHTML(item.act.ressource)}</strong><br><small style="color:#555;">${escHTML(item.act.sequence)} ${item.act.lecon ? '('+escHTML(item.act.lecon)+')' : ''}</small><br>${btnLien}</td>
                <td><strong>${escHTML(item.elevesNoms.join(', '))}</strong></td>
                <td style="text-align:center;"><button type="button" class="filter-btn" title="Marquer comme épinglé sur Anton" onclick="${item.estArchTab ? `restaurerArchive('${item.cleTab}')` : `archiverItem('${item.cleTab}')`}">${item.estArchTab ? '↩️' : '☑️ Épinglé'}</button></td>
            </tr>`;
        }).join('') + `</tbody></table>` : `<p style="color:#7f8c8d; font-size:13px;">Aucune activité tablette à préparer.</p>`}</div>
    </div><div class="dashboard-grid no-print-lecons">`;

    listeEl.forEach(e => {
        let total = (e.planHebdo || []).length, nbValides = (e.planHebdo || []).filter(id => e.valides && e.valides[id]).length;
        let pct = total > 0 ? Math.round((nbValides / total) * 100) : 0;
        let nbTab = (e.planHebdo || []).map(id => baseDonnees.find(b => b.id === id)).filter(b => b && estActiviteTablette(b)).length;
        let isExp = dashboardExpanded.has(e.id), badgeParc = estEleveCM(e) ? ((e.parcours === 'orange') ? ' 🟠' : ' 🟡') : '';
        let detailsPlanHtml = isExp ? `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed #ccc; font-size:12.5px;">` + getListeTrie(e.planHebdo, e.priorites || [], e).map((a, idx) => {
            let fait = e.valides && e.valides[a.id], st = (e.suivi && e.suivi[a.id]) ? e.suivi[a.id].statut : "";
            let iconeLien = (a.lienExterne && a.lienExterne.trim()) ? ` <a href="${escHTML(a.lienExterne.trim())}" target="_blank" rel="noopener noreferrer" title="Ouvrir sur Anton" style="text-decoration:none;">🔗</a>` : '';
            let isRec = e.recurrents && e.recurrents.includes(a.id);
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f1f5f9;"><span style="${fait ? 'text-decoration:line-through; color:#27ae60;' : ''}"><strong>${idx + 1}.</strong> ${escHTML(a.ressource)}${isRec ? ' 🔄' : ''}${iconeLien}</span><div style="display:flex; gap:3px;">${!fait ? `<button type="button" class="filter-btn" style="padding:1px 5px;" onclick="validerDepuisDashboard('${e.id}', '${a.id}')">✅</button><button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_revoir' ? 'background:#c0392b; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_revoir' ? '' : 'a_revoir'}')">👩‍🏫</button><button type="button" class="filter-btn" style="padding:1px 5px; ${st === 'a_refaire' ? 'background:#e67e22; color:#fff;' : ''}" onclick="setSuivi('${e.id}', '${a.id}', '${st === 'a_refaire' ? '' : 'a_refaire'}')">🔄</button>` : '✅'}</div></div>`;
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

// ==========================================
// 7. ONGLET 4 : BASE DE DONNÉES, TAGS MULTI-SÉQUENCES & MULTI-COMPÉTENCES, CHANGEMENT DE MATIÈRE D'UNE SÉQUENCE
// ==========================================

function renderTagsSequencesSimple() {
    let cont = document.getElementById('tagsSequencesSimple');
    let hidden = document.getElementById('inputSequence');
    let picker = document.getElementById('inputSequencePickerSimple');
    if (!cont || !hidden) return;

    cont.innerHTML = sequencesSelectionneesSimple.map((s, idx) => `
        <span class="seq-tag-pill">
            📑 ${escHTML(s)}
            <span class="comp-tag-remove" title="Retirer cette séquence" onclick="retirerTagSequenceSimple(${idx})">✖</span>
        </span>
    `).join('');

    let textePicker = picker ? picker.value.trim() : "";
    let toutes = [...sequencesSelectionneesSimple];
    if (textePicker && !toutes.includes(textePicker)) toutes.push(textePicker);
    hidden.value = toutes.join(' ; ');
}

function ajouterTagSequenceSimple(valForcee) {
    let picker = document.getElementById('inputSequencePickerSimple');
    let val = (valForcee !== undefined ? valForcee : (picker ? picker.value : "")).trim();
    if (!val) return;
    extraireListeSequences(val).forEach(item => {
        if (!sequencesSelectionneesSimple.includes(item)) {
            sequencesSelectionneesSimple.push(item);
        }
    });
    if (picker) picker.value = "";
    renderTagsSequencesSimple();
}

function retirerTagSequenceSimple(idx) {
    sequencesSelectionneesSimple.splice(idx, 1);
    renderTagsSequencesSimple();
}

function verifierSelectionDatalistSeqSimple(inputElem) {
    let val = inputElem.value.trim();
    if (!val) {
        renderTagsSequencesSimple();
        return;
    }
    let dl = document.getElementById('listeSequencesConnues');
    if (dl && Array.from(dl.options).some(opt => opt.value === val)) {
        ajouterTagSequenceSimple(val);
        return;
    }
    renderTagsSequencesSimple();
}

function renderTagsSequencesMulti() {
    let cont = document.getElementById('tagsSequencesMulti');
    let hidden = document.getElementById('multiSequence');
    let picker = document.getElementById('multiSequencePicker');
    if (!cont || !hidden) return;

    cont.innerHTML = sequencesSelectionneesMulti.map((s, idx) => `
        <span class="seq-tag-pill">
            📑 ${escHTML(s)}
            <span class="comp-tag-remove" title="Retirer cette séquence" onclick="retirerTagSequenceMulti(${idx})">✖</span>
        </span>
    `).join('');

    let textePicker = picker ? picker.value.trim() : "";
    let toutes = [...sequencesSelectionneesMulti];
    if (textePicker && !toutes.includes(textePicker)) toutes.push(textePicker);
    hidden.value = toutes.join(' ; ');
}

function ajouterTagSequenceMulti(valForcee) {
    let picker = document.getElementById('multiSequencePicker');
    let val = (valForcee !== undefined ? valForcee : (picker ? picker.value : "")).trim();
    if (!val) return;
    extraireListeSequences(val).forEach(item => {
        if (!sequencesSelectionneesMulti.includes(item)) {
            sequencesSelectionneesMulti.push(item);
        }
    });
    if (picker) picker.value = "";
    renderTagsSequencesMulti();
}

function retirerTagSequenceMulti(idx) {
    sequencesSelectionneesMulti.splice(idx, 1);
    renderTagsSequencesMulti();
}

function verifierSelectionDatalistSeqMulti(inputElem) {
    let val = inputElem.value.trim();
    if (!val) {
        renderTagsSequencesMulti();
        return;
    }
    let dl = document.getElementById('listeSequencesConnues');
    if (dl && Array.from(dl.options).some(opt => opt.value === val)) {
        ajouterTagSequenceMulti(val);
        return;
    }
    renderTagsSequencesMulti();
}

function renderTagsCompetencesSimple() {
    let cont = document.getElementById('tagsCompetencesSimple');
    let hidden = document.getElementById('inputCompetence');
    let picker = document.getElementById('inputCompetencePickerSimple');
    if (!cont || !hidden) return;

    cont.innerHTML = competencesSelectionneesSimple.map((c, idx) => `
        <span class="comp-tag-pill">
            🎯 ${escHTML(c)}
            <span class="comp-tag-remove" title="Retirer cette compétence" onclick="retirerTagCompetenceSimple(${idx})">✖</span>
        </span>
    `).join('');

    let texteActuelPicker = picker ? picker.value.trim() : "";
    let toutes = [...competencesSelectionneesSimple];
    if (texteActuelPicker && !toutes.includes(texteActuelPicker)) {
        toutes.push(texteActuelPicker);
    }
    hidden.value = toutes.join(' ; ');
}

function ajouterTagCompetenceSimple(valForcee) {
    let picker = document.getElementById('inputCompetencePickerSimple');
    let val = (valForcee !== undefined ? valForcee : (picker ? picker.value : "")).trim();
    if (!val) return;
    extraireListeCompetences(val).forEach(item => {
        if (!competencesSelectionneesSimple.includes(item)) {
            competencesSelectionneesSimple.push(item);
        }
    });
    if (picker) picker.value = "";
    renderTagsCompetencesSimple();
}

function retirerTagCompetenceSimple(idx) {
    competencesSelectionneesSimple.splice(idx, 1);
    renderTagsCompetencesSimple();
}

function verifierSelectionDatalistCompSimple(inputElem) {
    let val = inputElem.value.trim();
    if (!val) {
        renderTagsCompetencesSimple();
        return;
    }
    let dl = document.getElementById('listeCompetencesConnues');
    if (dl) {
        let existeDansListe = Array.from(dl.options).some(opt => opt.value === val);
        if (existeDansListe) {
            ajouterTagCompetenceSimple(val);
            return;
        }
    }
    renderTagsCompetencesSimple();
}

function getTagsLigneMulti(tr) {
    try {
        return JSON.parse(tr.dataset.compTags || "[]");
    } catch (e) {
        return [];
    }
}

function setTagsLigneMulti(tr, tagsArray) {
    tr.dataset.compTags = JSON.stringify(tagsArray || []);
    renderTagsCompetencesLigneMulti(tr);
}

function renderTagsCompetencesLigneMulti(tr) {
    if (!tr) return;
    let tags = getTagsLigneMulti(tr);
    let cont = tr.querySelector('.m-comp-tags');
    let picker = tr.querySelector('.m-comp-picker');
    let hidden = tr.querySelector('.m-comp');
    if (cont) {
        cont.innerHTML = tags.map((c, idx) => `
            <span class="comp-tag-pill">
                🎯 ${escHTML(c)}
                <span class="comp-tag-remove" title="Retirer" onclick="retirerTagCompetenceMulti(this, ${idx})">✖</span>
            </span>
        `).join('');
    }
    let toutes = [...tags];
    let txtPicker = picker ? picker.value.trim() : "";
    if (txtPicker && !toutes.includes(txtPicker)) toutes.push(txtPicker);
    if (hidden) hidden.value = toutes.join(' ; ');
}

function ajouterTagCompetenceMulti(btnOrInput, valForcee) {
    let tr = btnOrInput.closest('tr');
    if (!tr) return;
    let picker = tr.querySelector('.m-comp-picker');
    let val = (valForcee !== undefined ? valForcee : (picker ? picker.value : "")).trim();
    if (!val) return;
    let tags = getTagsLigneMulti(tr);
    extraireListeCompetences(val).forEach(item => {
        if (!tags.includes(item)) tags.push(item);
    });
    if (picker) picker.value = "";
    setTagsLigneMulti(tr, tags);
    gererSaisieChampMulti(tr.querySelector('.m-comp'), 'comp');
}

function retirerTagCompetenceMulti(spanElem, idx) {
    let tr = spanElem.closest('tr');
    if (!tr) return;
    let tags = getTagsLigneMulti(tr);
    tags.splice(idx, 1);
    setTagsLigneMulti(tr, tags);
    gererSaisieChampMulti(tr.querySelector('.m-comp'), 'comp');
}

function verifierSelectionDatalistCompMulti(inputElem) {
    let tr = inputElem.closest('tr');
    if (!tr) return;
    let val = inputElem.value.trim();
    if (val) {
        let dl = document.getElementById('listeCompetencesConnues');
        if (dl && Array.from(dl.options).some(opt => opt.value === val)) {
            ajouterTagCompetenceMulti(inputElem, val);
            return;
        }
    }
    renderTagsCompetencesLigneMulti(tr);
    gererSaisieChampMulti(tr.querySelector('.m-comp'), 'comp');
}

function estCMSelectionneFormSimple() {
    let nivs = getNiveauxCochesFormulaire('.cb-niveau-form');
    return nivs.includes('CM1') || nivs.includes('CM2');
}

function estCMSelectionneFormMulti() {
    let nivs = getNiveauxCochesFormulaire('.cb-niveau-multi');
    return nivs.includes('CM1') || nivs.includes('CM2');
}

function verifierNiveauxCMFormSimple() {
    let inpOrange = document.getElementById('inputPageOrange');
    if (inpOrange) {
        if (estCMSelectionneFormSimple()) {
            inpOrange.disabled = false;
        } else {
            inpOrange.value = "";
            inpOrange.disabled = true;
        }
    }
    majCouleurAutoFormSimple();
}

function estColonneMultiCopiee(typeChamp) {
    let cb = document.getElementById('cbCopyMulti_' + typeChamp);
    return Boolean(cb && cb.checked);
}

function toggleDuplicationColonneMulti(typeChamp, isChecked) {
    if (!isChecked) return;
    let tbody = document.getElementById('tbodySaisieMultiple');
    if (!tbody) return;
    let lignes = Array.from(tbody.querySelectorAll('.ligne-saisie-multi'));
    if (lignes.length < 2) return;

    if (typeChamp === 'comp') {
        let tagsL1 = getTagsLigneMulti(lignes[0]);
        let txtPickerL1 = lignes[0].querySelector('.m-comp-picker')?.value || "";
        for (let i = 1; i < lignes.length; i++) {
            let cibPicker = lignes[i].querySelector('.m-comp-picker');
            if (cibPicker) cibPicker.value = txtPickerL1;
            delete lignes[i].querySelector('.m-comp').dataset.manual;
            setTagsLigneMulti(lignes[i], [...tagsL1]);
        }
        return;
    }

    let classe = '.m-' + typeChamp;
    let premierElem = lignes[0].querySelector(classe);
    if (!premierElem) return;
    let valL1 = premierElem.value;

    for (let i = 1; i < lignes.length; i++) {
        let cible = lignes[i].querySelector(classe);
        if (cible && !cible.disabled) {
            cible.value = valL1;
            delete cible.dataset.manual;
        }
    }
}

function gererSaisieChampMulti(elem, typeChamp) {
    let tbody = document.getElementById('tbodySaisieMultiple');
    if (!tbody) return;
    let lignes = Array.from(tbody.querySelectorAll('.ligne-saisie-multi'));
    let tr = elem.closest('tr');
    let idxLigne = lignes.indexOf(tr);

    if (idxLigne > 0) {
        elem.dataset.manual = "true";
        return;
    }

    if (idxLigne === 0 && estColonneMultiCopiee(typeChamp)) {
        if (typeChamp === 'comp') {
            let tagsL1 = getTagsLigneMulti(lignes[0]);
            let txtPickerL1 = lignes[0].querySelector('.m-comp-picker')?.value || "";
            for (let i = 1; i < lignes.length; i++) {
                let cibComp = lignes[i].querySelector('.m-comp');
                if (cibComp && cibComp.dataset.manual !== "true") {
                    let cibPicker = lignes[i].querySelector('.m-comp-picker');
                    if (cibPicker) cibPicker.value = txtPickerL1;
                    setTagsLigneMulti(lignes[i], [...tagsL1]);
                }
            }
            return;
        }

        let classe = '.m-' + typeChamp;
        for (let i = 1; i < lignes.length; i++) {
            let cible = lignes[i].querySelector(classe);
            if (cible && !cible.disabled && cible.dataset.manual !== "true") {
                cible.value = elem.value;
            }
        }
    }
}

function verifierNiveauxCMMulti() {
    let isCM = estCMSelectionneFormMulti();
    document.querySelectorAll('#tbodySaisieMultiple .ligne-saisie-multi').forEach(tr => {
        let inpOrange = tr.querySelector('.m-orange');
        if (!inpOrange) return;
        if (isCM) {
            inpOrange.disabled = false;
        } else {
            inpOrange.value = "";
            inpOrange.disabled = true;
        }
    });
    if (isCM && estColonneMultiCopiee('orange')) {
        toggleDuplicationColonneMulti('orange', true);
    }
}

function toggleModeSaisieMultiple() {
    modeSaisieMultipleActif = !modeSaisieMultipleActif;
    let bSimple = document.getElementById('blocSaisieSimpleBase'), bMulti = document.getElementById('blocSaisieMultipleBase'), btn = document.getElementById('btnToggleSaisieMulti');
    if (modeSaisieMultipleActif) {
        if (bSimple) bSimple.style.display = 'none';
        if (bMulti) bMulti.style.display = 'block';
        if (btn) btn.innerText = "📝 Revenir au formulaire de saisie simple";
        let tbody = document.getElementById('tbodySaisieMultiple');
        if (tbody && tbody.children.length === 0) ajouterLigneSaisieMultiple(4);
        verifierNiveauxCMMulti();
        renderTagsSequencesMulti();
    } else {
        if (bSimple) bSimple.style.display = 'block';
        if (bMulti) bMulti.style.display = 'none';
        if (btn) btn.innerText = "⚡ Passer en mode Saisie Multiple (plusieurs exercices d'un coup)";
    }
}

function ajouterLigneSaisieMultiple(nbLignes = 1) {
    const tbody = document.getElementById('tbodySaisieMultiple'); if (!tbody) return;
    let isCM = estCMSelectionneFormMulti();
    let optsTypes = `<option value="">-- Support * --</option>` + Object.keys(imagesParType || {}).map(t => `<option value="${escHTML(t)}">${escHTML((imagesParType[t].emoji ? imagesParType[t].emoji + ' ' : '') + t)}</option>`).join('');

    let premiereLigne = tbody.querySelector('.ligne-saisie-multi');
    let getValSiCoche = (champ) => {
        if (!premiereLigne || !estColonneMultiCopiee(champ)) return "";
        let el = premiereLigne.querySelector('.m-' + champ);
        return el ? el.value : "";
    };

    let defLecon = getValSiCoche('lecon');
    let defTagsComp = (premiereLigne && estColonneMultiCopiee('comp')) ? getTagsLigneMulti(premiereLigne) : [];
    let defPickerComp = (premiereLigne && estColonneMultiCopiee('comp')) ? (premiereLigne.querySelector('.m-comp-picker')?.value || "") : "";
    let defType = getValSiCoche('type');
    let defPers = getValSiCoche('pers');
    let defPage = getValSiCoche('page');
    let defOrange = isCM ? getValSiCoche('orange') : "";
    let defJaune = getValSiCoche('jaune');
    let defDiff = getValSiCoche('diff');

    for (let i = 0; i < nbLignes; i++) {
        let tr = document.createElement('tr');
        tr.className = 'ligne-saisie-multi';
        tr.innerHTML = `
            <td><input type="text" class="m-lecon" value="${escHTML(defLecon)}" placeholder="Ex: G1" oninput="gererSaisieChampMulti(this, 'lecon')" style="width:100%;"></td>
            <td>
                <div class="m-comp-tags comp-tags-container"></div>
                <div style="display:flex; gap:4px;">
                    <input type="text" class="m-comp-picker" list="listeCompetencesConnues" value="${escHTML(defPickerComp)}" placeholder="🔍 Mot-clé ou nouvelle..." oninput="verifierSelectionDatalistCompMulti(this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); ajouterTagCompetenceMulti(this);}" style="flex:1;">
                    <button type="button" class="filter-btn" style="padding:3px 7px;" title="Ajouter cette compétence" onclick="ajouterTagCompetenceMulti(this)">➕</button>
                </div>
                <input type="hidden" class="m-comp" value="">
            </td>
            <td><input type="text" class="m-res" placeholder="Ex: Ex 1" style="width:100%;"></td>
            <td><select class="m-type" onchange="gererSaisieChampMulti(this, 'type')" style="width:100%;">${optsTypes}</select></td>
            <td><input type="text" class="m-symbole" placeholder="1" style="width:100%;"></td>
            <td><input type="text" class="m-pers" value="${escHTML(defPers)}" placeholder="👤" oninput="gererSaisieChampMulti(this, 'pers')" style="width:100%;"></td>
            <td><input type="text" class="m-page" value="${escHTML(defPage)}" placeholder="p9" oninput="gererSaisieChampMulti(this, 'page')" style="width:100%;"></td>
            <td><input type="text" class="m-orange" value="${escHTML(defOrange)}" placeholder="p10" ${isCM ? '' : 'disabled'} oninput="gererSaisieChampMulti(this, 'orange')" style="width:100%;"></td>
            <td><input type="text" class="m-jaune" value="${escHTML(defJaune)}" placeholder="1 p4" oninput="gererSaisieChampMulti(this, 'jaune')" style="width:100%;"></td>
            <td><input type="text" class="m-lien" placeholder="https://anton.app/..." style="width:100%;"></td>
            <td>
                <select class="m-diff" onchange="gererSaisieChampMulti(this, 'diff')" style="width:100%;">
                    <option value="">-- Étoiles --</option>
                    <option value="0">0 étoile</option>
                    <option value="1">⭐ (1)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                </select>
            </td>
            <td style="text-align:center;"><input type="checkbox" class="m-eval" style="transform:scale(1.2);"></td>
            <td style="text-align:center;"><button type="button" class="btn-remove" style="padding:3px 7px;" onclick="this.closest('tr').remove()">✖</button></td>
        `;
        if (defType) tr.querySelector('.m-type').value = defType;
        if (defDiff !== "") tr.querySelector('.m-diff').value = defDiff;
        tbody.appendChild(tr);
        setTagsLigneMulti(tr, [...defTagsComp]);
    }
}

function enregistrerSaisieMultiple() {
    renderTagsSequencesMulti();
    let nivArr = getNiveauxCochesFormulaire('.cb-niveau-multi');
    let niveauStr = nivArr.length > 0 ? nivArr.join(', ') : 'CP';
    let isCM = nivArr.includes('CM1') || nivArr.includes('CM2');
    let matiere = document.getElementById('multiMatiere').value.trim();
    let sequence = document.getElementById('multiSequence').value.trim();
    let periode = document.getElementById('multiPeriode').value;

    let lignes = Array.from(document.querySelectorAll('#tbodySaisieMultiple .ligne-saisie-multi'));
    lignes.forEach(tr => renderTagsCompetencesLigneMulti(tr));

    let lignesActives = lignes.filter(tr => {
        return tr.querySelector('.m-res').value.trim() !== "" || tr.querySelector('.m-comp').value.trim() !== "";
    });

    if (lignesActives.length === 0) {
        showToast("Aucune ligne d'exercice renseignée dans le tableau.", "error");
        return;
    }

    let champsManquants = [];
    if (!matiere) champsManquants.push("• Matière commune (en haut)");
    if (!sequence) champsManquants.push("• Nom de la séquence commune (en haut)");

    lignesActives.forEach((tr, idx) => {
        let numL = idx + 1;
        let comp = tr.querySelector('.m-comp').value.trim();
        let res = tr.querySelector('.m-res').value.trim();
        let typeR = tr.querySelector('.m-type').value.trim();
        let diffVal = tr.querySelector('.m-diff').value;
        let oublisLigne = [];
        if (!comp) oublisLigne.push("Compétence");
        if (!res) oublisLigne.push("Nom de l'exercice");
        if (!typeR) oublisLigne.push("Type de matériel (Support)");
        if (diffVal === "") oublisLigne.push("Étoiles (Difficulté)");
        if (oublisLigne.length > 0) {
            champsManquants.push(`• Ligne ${numL} : ${oublisLigne.join(', ')}`);
        }
    });

    if (champsManquants.length > 0) {
        let msg = "⚠️ Attention, certaines cases importantes ne sont pas remplies :\n\n" + champsManquants.join("\n") + "\n\nVoulez-vous quand même enregistrer ces exercices ?";
        if (!confirm(msg)) return;
    }

    let nbAjoutes = 0;
    lignesActives.forEach(tr => {
        let ressource = tr.querySelector('.m-res').value.trim() || "Exercice";
        let lecon = tr.querySelector('.m-lecon').value.trim();
        let competence = tr.querySelector('.m-comp').value.trim();
        let typeRes = tr.querySelector('.m-type').value;
        let symbole = tr.querySelector('.m-symbole') ? tr.querySelector('.m-symbole').value.trim() : "";
        let personnes = tr.querySelector('.m-pers') ? tr.querySelector('.m-pers').value.trim() : "";
        let pageManuel = tr.querySelector('.m-page').value.trim();
        let pageOrange = isCM ? (tr.querySelector('.m-orange').value.trim()) : "";
        let varianteJaune = tr.querySelector('.m-jaune').value.trim();
        let lienExterne = tr.querySelector('.m-lien') ? tr.querySelector('.m-lien').value.trim() : "";
        let difficulte = parseInt(tr.querySelector('.m-diff').value) || 0;
        let estEval = tr.querySelector('.m-eval').checked;
        let couleur = calculerCouleurAutomatique(matiere, niveauStr, typeRes);
        let newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

        baseDonnees.push({
            id: newId, matiere, sequence, lecon, competence, ressource, typeRes,
            symbole, personnes, pageManuel, pageOrange, varianteJaune, lienExterne, periode,
            difficulte, niveau: niveauStr, visuel: couleur, imageSpecifique: "", estEvaluation: estEval
        });
        if (periode) programmations[newId] = periode;
        nbAjoutes++;
    });

    extraireListeSequences(sequence).forEach(sq => {
        if (sq && !sequencesCustom.includes(sq)) sequencesCustom.push(sq);
        if (periode && matiere) {
            programmations[getCleProgSequence(matiere, sq)] = periode;
        }
    });
    sauvegarderProgrammations(); postEditGlobal();
    document.getElementById('tbodySaisieMultiple').innerHTML = '';
    ajouterLigneSaisieMultiple(4);
    showToast(`✅ ${nbAjoutes} exercice(s) ajouté(s) d'un coup !`, "success");
}

function ouvrirModalGestionMatieres() { afficherListeMatieresModal(); ouvrirModal('modalMatieres'); }
function afficherListeMatieresModal() {
    let mats = [...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeMatieresModalContainer'); if (!cont) return;
    cont.innerHTML = mats.map(m => `<div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;"><input type="text" class="input-rename-mat" data-old="${escHTML(m)}" value="${escHTML(m)}" style="flex:1;"><button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerMatiereModal('${escJS(m)}')">🗑️</button></div>`).join('');
}
function sauvegarderToutesMatieres() {
    document.querySelectorAll('.input-rename-mat').forEach(inp => {
        let oldV = inp.getAttribute('data-old'), newV = inp.value.trim();
        if (oldV && newV && oldV !== newV) baseDonnees.forEach(b => { if ((b.matiere || "").trim() === oldV) b.matiere = newV; });
    });
    postEditGlobal(); fermerModal('modalMatieres'); showToast("Matières mises à jour !", "success");
}
function supprimerMatiereModal(m) { if (confirm(`Supprimer toutes les activités de la matière "${m}" ?`)) { baseDonnees = baseDonnees.filter(b => (b.matiere || "").trim() !== m); postEditGlobal(); afficherListeMatieresModal(); } }

// ==========================================
// MODALE SÉQUENCES : RENOMMER + CHANGER LA MATIÈRE D'UNE SÉQUENCE COMPLÈTE + RÉASSIGNER
// ==========================================
function ouvrirModalGestionSequences() {
    let sel = document.getElementById('filtreMatiereModalSeq');
    let mats = ['Toutes', ...new Set([...MATIERES_DEFAUT_LISTE, ...baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean)])];
    if (sel) sel.innerHTML = mats.map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    afficherListeSequencesModal();
    ouvrirModal('modalSequences');
}

function creerNouvelleSequenceModal() {
    let inp = document.getElementById('inputNouvelleSeqModal');
    if (!inp || !inp.value.trim()) { showToast("Écrivez le nom de la nouvelle séquence.", "error"); return; }
    let nomSeq = inp.value.trim();
    if (!sequencesCustom.includes(nomSeq)) sequencesCustom.push(nomSeq);
    inp.value = "";
    sauvegarderBase();
    initialiserSelectsFormulaire();
    afficherListeSequencesModal();
    showToast(`Séquence "${nomSeq}" créée et disponible !`, "success");
}

function afficherBlocOrphelinsDansModal(orphelines) {
    let blocOrph = document.getElementById('blocOrphelinsSeqModal');
    if (!blocOrph) return;
    if (orphelines.length === 0) {
        blocOrph.style.display = 'none';
        return;
    }
    blocOrph.style.display = 'block';
    blocOrph.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid #e67e22;">
        <strong style="color:#d35400;">⚠️ ${orphelines.length} activité(s) en attente de séquence :</strong>
        <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" id="inputReassignLotSeq" list="listeSequencesConnues" placeholder="Séquence pour TOUTES..." style="width:190px; padding:5px 8px;">
            <button type="button" class="btn-valid" style="padding:5px 10px; font-size:12px;" onclick="reassignerToutesOrphelinesModal()">Réassigner tout</button>
        </div>
    </div>` + orphelines.map(o => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12.5px; padding:5px 0; border-bottom:1px dashed #f39c12;">
            <span style="flex:1;"><strong>[${escHTML(o.niveau)}]</strong> ${escHTML(o.matiere)} — <strong>${escHTML(o.ressource)}</strong> <small style="color:#666;">(${escHTML(o.competence)})</small></span>
            <div style="display:flex; gap:4px; align-items:center;">
                <input type="text" id="inp_orph_${o.id}" list="listeSequencesConnues" placeholder="Choisir ou écrire..." style="width:165px; padding:4px 6px; font-size:12px;">
                <button type="button" class="btn-action" style="padding:4px 8px; font-size:12px;" onclick="reassignerActiviteSequence('${o.id}', document.getElementById('inp_orph_${o.id}').value)">OK</button>
            </div>
        </div>
    `).join('');
}

function afficherListeSequencesModal() {
    let nivFiltre = document.getElementById('filtreNiveauModalSeq') ? document.getElementById('filtreNiveauModalSeq').value : 'Tous';
    let matFiltre = document.getElementById('filtreMatiereModalSeq') ? document.getElementById('filtreMatiereModalSeq').value : 'Toutes';

    let actsFiltrees = baseDonnees.filter(b => {
        if (!b) return false;
        if (nivFiltre !== 'Tous' && !(b.niveau || "").toUpperCase().includes(nivFiltre)) return false;
        if (matFiltre !== 'Toutes' && (b.matiere || "").trim() !== matFiltre) return false;
        return true;
    });

    let seqMap = new Map();
    actsFiltrees.forEach(b => {
        let seqs = extraireListeSequences(b.sequence);
        seqs.forEach(s => {
            if (!seqMap.has(s)) seqMap.set(s, { count: 0, niveaux: new Set(), matieres: new Set() });
            let info = seqMap.get(s);
            info.count++;
            (b.niveau || "").split(/[,/]+/).map(x => x.trim()).filter(Boolean).forEach(n => info.niveaux.add(n));
            if (b.matiere) info.matieres.add(b.matiere.trim());
        });
    });

    if (nivFiltre === 'Tous' && matFiltre === 'Toutes') {
        sequencesCustom.forEach(s => {
            if (s && !seqMap.has(s)) seqMap.set(s, { count: 0, niveaux: new Set(), matieres: new Set() });
        });
    }

    let toutesMatieresDispo = [...new Set([...MATIERES_DEFAUT_LISTE, ...baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean)])].sort((a, b) => nettoyerNomPourTri(a).localeCompare(nettoyerNomPourTri(b), 'fr'));

    let seqKeys = Array.from(seqMap.keys()).sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeSequencesModalContainer');
    if (cont) {
        if (seqKeys.length === 0) {
            cont.innerHTML = `<p style="color:#7f8c8d; text-align:center; padding:12px;">Aucune séquence pour ce filtre.</p>`;
        } else {
            cont.innerHTML = seqKeys.map(s => {
                let info = seqMap.get(s);
                let nivTxt = Array.from(info.niveaux).join(', ') || 'Nouvelle';
                let matsArray = Array.from(info.matieres);
                let matUnique = matsArray.length === 1 ? matsArray[0] : "";
                let labelMat = matsArray.length > 1 ? `Mixte (${matsArray.join(' / ')})` : (matUnique || "Sans matière");

                let optionsMatHtml = `<option value="">-- Matière actuelle : ${escHTML(labelMat)} --</option>` +
                    toutesMatieresDispo.map(m => `<option value="${escHTML(m)}" ${m === matUnique ? 'selected' : ''}>📚 Mettre dans : ${escHTML(m)}</option>`).join('');

                return `<div class="ligne-seq-modal" style="display:flex; gap:8px; align-items:center; margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid #f1f5f9; flex-wrap:wrap;">
                    <span class="filter-btn" style="font-size:11px; padding:2px 6px; white-space:nowrap;">${escHTML(nivTxt)} • ${info.count} act.</span>
                    <input type="text" class="input-rename-seq" data-old="${escHTML(s)}" value="${escHTML(s)}" style="flex:1; min-width:170px;" title="Renommer cette séquence">
                    <select class="select-matiere-seq" data-seq="${escHTML(s)}" data-old-mat="${escHTML(matUnique)}" style="width:240px; padding:5px; font-size:12px; background:#f8fbff; border:1px solid #2980b9; border-radius:5px; font-weight:600;" title="Changer la matière de tous les ateliers de cette séquence">
                        ${optionsMatHtml}
                    </select>
                    <button type="button" class="btn-remove" style="padding:4px 8px;" title="Retirer cette séquence (les activités passeront en 'Sans séquence')" onclick="supprimerSequenceModal('${escJS(s)}')">🗑️</button>
                </div>`;
            }).join('');
        }
    }

    let orphelines = baseDonnees.filter(b => {
        if (!b || extraireListeSequences(b.sequence).length > 0) return false;
        if (nivFiltre !== 'Tous' && !(b.niveau || "").toUpperCase().includes(nivFiltre)) return false;
        if (matFiltre !== 'Toutes' && (b.matiere || "").trim() !== matFiltre) return false;
        return true;
    });

    afficherBlocOrphelinsDansModal(orphelines);
}

function reassignerActiviteSequence(idAct, nouvSeq) {
    if (!nouvSeq || !nouvSeq.trim()) {
        showToast("Choisissez ou écrivez un nom de séquence.", "error");
        return;
    }
    let cleanSeq = nouvSeq.trim();
    let a = baseDonnees.find(b => b.id === idAct);
    if (a) {
        a.sequence = cleanSeq;
        if (!sequencesCustom.includes(cleanSeq)) sequencesCustom.push(cleanSeq);
        postEditGlobal();
        afficherListeSequencesModal();
        showToast(`Activité réassignée à "${cleanSeq}" !`, "success");
    }
}

function reassignerToutesOrphelinesModal() {
    let inp = document.getElementById('inputReassignLotSeq');
    if (!inp || !inp.value.trim()) { showToast("Indiquez une séquence de destination.", "error"); return; }
    let nouvSeq = inp.value.trim();
    let nivFiltre = document.getElementById('filtreNiveauModalSeq') ? document.getElementById('filtreNiveauModalSeq').value : 'Tous';
    let matFiltre = document.getElementById('filtreMatiereModalSeq') ? document.getElementById('filtreMatiereModalSeq').value : 'Toutes';

    let count = 0;
    baseDonnees.forEach(b => {
        if (!b || extraireListeSequences(b.sequence).length > 0) return;
        if (nivFiltre !== 'Tous' && !(b.niveau || "").toUpperCase().includes(nivFiltre)) return;
        if (matFiltre !== 'Toutes' && (b.matiere || "").trim() !== matFiltre) return;
        b.sequence = nouvSeq;
        count++;
    });
    if (!sequencesCustom.includes(nouvSeq)) sequencesCustom.push(nouvSeq);
    postEditGlobal();
    afficherListeSequencesModal();
    showToast(`✅ ${count} activité(s) réassignée(s) dans "${nouvSeq}" !`, "success");
}

function sauvegarderToutesSequences() {
    let nivFiltre = document.getElementById('filtreNiveauModalSeq') ? document.getElementById('filtreNiveauModalSeq').value : 'Tous';
    let matFiltre = document.getElementById('filtreMatiereModalSeq') ? document.getElementById('filtreMatiereModalSeq').value : 'Toutes';

    document.querySelectorAll('.select-matiere-seq').forEach(sel => {
        let seqName = sel.getAttribute('data-seq');
        let oldMat = sel.getAttribute('data-old-mat') || "";
        let newMat = sel.value.trim();
        if (seqName && newMat && newMat !== oldMat) {
            if (oldMat) {
                let oldKey = getCleProgSequence(oldMat, seqName);
                let newKey = getCleProgSequence(newMat, seqName);
                if (programmations[oldKey] !== undefined) {
                    programmations[newKey] = programmations[oldKey];
                    delete programmations[oldKey];
                }
            }
            baseDonnees.forEach(b => {
                if (!b) return;
                if (nivFiltre !== 'Tous' && !(b.niveau || "").toUpperCase().includes(nivFiltre)) return;
                if (matFiltre !== 'Toutes' && (b.matiere || "").trim() !== matFiltre) return;
                if (activiteAppartientASequence(b, seqName)) {
                    b.matiere = newMat;
                    b.visuel = calculerCouleurAutomatique(b.matiere, b.niveau, b.typeRes);
                }
            });
        }
    });

    document.querySelectorAll('.input-rename-seq').forEach(inp => {
        let oldV = inp.getAttribute('data-old');
        let newV = inp.value.trim();
        if (oldV && oldV !== newV) {
            Object.keys(programmations).forEach(k => {
                if (k.startsWith('SEQ||') && k.endsWith('||' + oldV)) {
                    let parts = k.split('||');
                    if (newV) {
                        programmations[`SEQ||${parts[1]}||${newV}`] = programmations[k];
                    }
                    delete programmations[k];
                }
            });
            baseDonnees.forEach(b => {
                if (!b) return;
                let list = extraireListeSequences(b.sequence);
                if (list.some(s => s.toLowerCase() === oldV.toLowerCase())) {
                    if (newV) {
                        b.sequence = [...new Set(list.map(s => s.toLowerCase() === oldV.toLowerCase() ? newV : s))].join(' ; ');
                    } else {
                        b.sequence = list.filter(s => s.toLowerCase() !== oldV.toLowerCase()).join(' ; ');
                    }
                }
            });
            if (newV) {
                sequencesCustom = sequencesCustom.map(s => s === oldV ? newV : s);
            } else {
                sequencesCustom = sequencesCustom.filter(s => s !== oldV);
            }
        }
    });

    sauvegarderProgrammations();
    postEditGlobal();
    fermerModal('modalSequences');
    showToast("✅ Séquences et matières mises à jour !", "success");
}

function supprimerSequenceModal(s) {
    if (confirm(`Retirer la séquence "${s}" ?\n\n✅ AUCUNE activité ne sera supprimée : si une activité n'avait que cette séquence, elle passera en attente ("⚠️ Sans séquence") juste en dessous pour être réassignée.`)) {
        let nbTouch = 0;
        baseDonnees.forEach(b => {
            if (!b) return;
            let list = extraireListeSequences(b.sequence);
            if (list.some(item => item.toLowerCase() === s.toLowerCase())) {
                b.sequence = list.filter(item => item.toLowerCase() !== s.toLowerCase()).join(' ; ');
                nbTouch++;
            }
        });
        sequencesCustom = sequencesCustom.filter(seq => seq !== s);
        if (baseDonnees.some(b => extraireListeSequences(b.sequence).length === 0)) {
            filtreCourantSequenceDB = 'SANS_SEQUENCE';
        }
        postEditGlobal();
        afficherListeSequencesModal();
        showToast(`Séquence retirée sur ${nbTouch} activité(s).`, "success");
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
    let toutesComps = [];
    baseDonnees.filter(b => matFiltre === 'Toutes' || (b.matiere || "").trim() === matFiltre).forEach(b => {
        extraireListeCompetences(b.competence).forEach(c => toutesComps.push(c));
    });
    let comps = [...new Set(toutesComps)].sort((a, b) => a.localeCompare(b, 'fr'));
    let cont = document.getElementById('listeCompetencesModalContainer'); if (!cont) return;
    cont.innerHTML = comps.map(c => `<div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;"><input type="text" class="input-rename-comp" data-old="${escHTML(c)}" value="${escHTML(c)}" style="flex:1;"></div>`).join('');
}
function sauvegarderToutesCompetences() {
    document.querySelectorAll('.input-rename-comp').forEach(inp => {
        let oldV = inp.getAttribute('data-old'), newV = inp.value.trim();
        if (oldV && newV && oldV !== newV) {
            baseDonnees.forEach(b => {
                let list = extraireListeCompetences(b.competence);
                if (list.includes(oldV)) {
                    b.competence = list.map(item => item === oldV ? newV : item).join(' ; ');
                }
            });
        }
    });
    postEditGlobal(); fermerModal('modalCompetences'); showToast("Compétences mises à jour !", "success");
}

function ouvrirModalGestionTypes() {
    afficherListeTypesModal();
    ouvrirModal('modalTypes');
}

function afficherListeTypesModal() {
    const cont = document.getElementById('listeTypesModalContainer'); if (!cont || !imagesParType) return;
    cont.innerHTML = Object.keys(imagesParType).map(k => {
        let t = imagesParType[k];
        return `<div class="ligne-type-modal" data-key="${escHTML(k)}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #eee; flex-wrap:wrap;">
            <strong style="width:130px;">${escHTML(k)}</strong>
            <input type="text" class="t-emoji" value="${escHTML(t.emoji || '')}" placeholder="Émoji (🎲)" title="Émoji affiché en premier sur l'étiquette" style="width:75px; text-align:center;">
            <input type="text" class="t-img" value="${escHTML(t.img || '')}" placeholder="ou URL image/logo..." style="flex:1; min-width:140px;">
            <label style="font-size:12px;"><input type="checkbox" class="t-remp" ${t.remplacerNum ? 'checked' : ''}> Logo seul</label>
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
            let emInput = div.querySelector('.t-emoji');
            imagesParType[k].emoji = emInput ? emInput.value.trim() : "";
            imagesParType[k].img = div.querySelector('.t-img').value.trim();
            imagesParType[k].remplacerNum = div.querySelector('.t-remp').checked;
            imagesParType[k].appliquerCouleur = div.querySelector('.t-coul').checked;
            imagesParType[k].isTablette = div.querySelector('.t-tab').checked;
        }
    });
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    declencherAutoSaveFirebase(); majListeTypesSelect(); fermerModal('modalTypes'); afficherBase();
    showToast("Types, émojis et logos mis à jour !", "success");
}

function ajouterOuModifierType() {
    let nom = document.getElementById('inputNouveauTypeNom').value.trim(); if (!nom) { showToast("Indiquez un nom de type.", "error"); return; }
    let em = document.getElementById('inputNouveauTypeEmoji') ? document.getElementById('inputNouveauTypeEmoji').value.trim() : "";
    let img = document.getElementById('inputNouveauTypeImg').value.trim();
    let remp = document.getElementById('cbNouveauTypeRempNum') ? document.getElementById('cbNouveauTypeRempNum').checked : false;
    let isTab = document.getElementById('cbNouveauTypeTablette').checked, appCoul = document.getElementById('cbNouveauTypeCouleur').checked;
    imagesParType[nom] = { img: img, emoji: em, remplacerNum: remp, appliquerCouleur: appCoul, isTablette: isTab };
    localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType));
    declencherAutoSaveFirebase(); majListeTypesSelect(); afficherListeTypesModal(); afficherBase();
    document.getElementById('inputNouveauTypeNom').value = '';
    if (document.getElementById('inputNouveauTypeEmoji')) document.getElementById('inputNouveauTypeEmoji').value = '';
    document.getElementById('inputNouveauTypeImg').value = '';
    showToast(`Type "${nom}" enregistré !`, "success");
}
function supprimerTypeRessource(nom) { if (confirm(`Supprimer le type "${nom}" ?`)) { delete imagesParType[nom]; localStorage.setItem(KEY_IMAGES, JSON.stringify(imagesParType)); majListeTypesSelect(); afficherListeTypesModal(); } }
function changerCouleurDB(idAct, nouvCouleur) { let a = baseDonnees.find(b => b.id === idAct); if (a) { a.visuel = nouvCouleur; sauvegarderBase(); afficherBase(); } }
function changerImageDB(idAct) { let a = baseDonnees.find(b => b.id === idAct); if (!a) return; let url = prompt("URL de l'image spécifique :", a.imageSpecifique || ""); if (url !== null) { a.imageSpecifique = url.trim(); sauvegarderBase(); afficherBase(); } }
function viderBase() { if (confirm("⚠️ Vider l'intégralité de la base de données d'ateliers ?")) { baseDonnees = []; postEditGlobal(); showToast("Base de données vidée.", "success"); } }

function enregistrerActiviteBase() {
    renderTagsSequencesSimple();
    renderTagsCompetencesSimple();
    let matiere = document.getElementById('inputMatiere').value.trim();
    let sequence = document.getElementById('inputSequence').value.trim();
    let lecon = document.getElementById('inputLecon').value.trim();
    let competence = document.getElementById('inputCompetence').value.trim();
    let ressource = document.getElementById('inputRessource').value.trim();
    let typeRes = document.getElementById('selectTypeRessource').value;
    let symbole = document.getElementById('inputSymbole') ? document.getElementById('inputSymbole').value.trim() : "";
    let personnes = document.getElementById('inputPersonnes') ? document.getElementById('inputPersonnes').value.trim() : "";
    let pageManuel = document.getElementById('inputPageManuel').value.trim();
    let nivArr = getNiveauxCochesFormulaire('.cb-niveau-form');
    let niveauStr = nivArr.length > 0 ? nivArr.join(', ') : 'CP';
    let isCM = nivArr.includes('CM1') || nivArr.includes('CM2');
    let pageOrange = isCM && document.getElementById('inputPageOrange') ? document.getElementById('inputPageOrange').value.trim() : "";
    let varianteJaune = document.getElementById('inputVarianteJaune').value.trim();
    let periode = document.getElementById('selectPeriodeForm').value;
    let diffRaw = document.getElementById('selectDifficulte').value;
    let difficulte = parseInt(diffRaw) || 0;
    let couleur = document.getElementById('selectCouleurRapide').value || calculerCouleurAutomatique(matiere, niveauStr, typeRes);
    let imgAct = document.getElementById('inputImageAct').value.trim();
    let lienExterne = document.getElementById('inputLienExterne') ? document.getElementById('inputLienExterne').value.trim() : "";
    let estEval = document.getElementById('cbEstEvaluation').checked;

    let oublis = [];
    if (!matiere) oublis.push("• La matière");
    if (!sequence) oublis.push("• Le nom de la séquence");
    if (!competence) oublis.push("• La compétence");
    if (!ressource) oublis.push("• Le nom de l'exercice");
    if (!typeRes) oublis.push("• Le type de matériel (Support)");
    if (diffRaw === "") oublis.push("• Les étoiles (Difficulté)");

    if (oublis.length > 0) {
        let msg = "⚠️ Attention, les cases suivantes ne sont pas remplies :\n\n" + oublis.join("\n") + "\n\nVoulez-vous quand même enregistrer cette activité ?";
        if (!confirm(msg)) return;
    }

    if (idEnCoursEdition) {
        let act = baseDonnees.find(b => b.id === idEnCoursEdition);
        if (act) {
            Object.assign(act, { matiere, sequence, lecon, competence, ressource, typeRes, symbole, personnes, pageManuel, pageOrange, varianteJaune, lienExterne, periode, difficulte, niveau: niveauStr, visuel: couleur, imageSpecifique: imgAct, estEvaluation: estEval });
            if (periode) programmations[act.id] = periode;
        }
        idEnCoursEdition = null;
        document.getElementById('btnAnnulerEditBase').style.display = 'none';
        document.getElementById('titreFormulaireBase').innerText = "➕ Ajouter ou modifier une activité";
        showToast("Activité modifiée !", "success");
    } else {
        let newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        baseDonnees.push({ id: newId, matiere, sequence, lecon, competence, ressource, typeRes, symbole, personnes, pageManuel, pageOrange, varianteJaune, lienExterne, periode, difficulte, niveau: niveauStr, visuel: couleur, imageSpecifique: imgAct, estEvaluation: estEval });
        if (periode) programmations[newId] = periode;
        showToast("Nouvelle activité ajoutée !", "success");
    }
    extraireListeSequences(sequence).forEach(sq => {
        if (sq && !sequencesCustom.includes(sq)) sequencesCustom.push(sq);
        if (periode && matiere) {
            programmations[getCleProgSequence(matiere, sq)] = periode;
        }
    });
    sauvegarderProgrammations(); postEditGlobal();
    document.getElementById('inputRessource').value = '';
    if (document.getElementById('inputSymbole')) document.getElementById('inputSymbole').value = '';
    document.getElementById('inputPageManuel').value = '';
    if (document.getElementById('inputPageOrange')) document.getElementById('inputPageOrange').value = '';
    document.getElementById('inputVarianteJaune').value = '';
    if (document.getElementById('inputLienExterne')) document.getElementById('inputLienExterne').value = '';
    if (document.getElementById('inputCompetencePickerSimple')) document.getElementById('inputCompetencePickerSimple').value = '';
    if (document.getElementById('inputSequencePickerSimple')) document.getElementById('inputSequencePickerSimple').value = '';
}

function editerActiviteBase(idAct) {
    if (modeSaisieMultipleActif) toggleModeSaisieMultiple();
    let a = baseDonnees.find(b => b.id === idAct); if (!a) return;
    idEnCoursEdition = idAct;
    document.getElementById('inputMatiere').value = a.matiere || '';
    sequencesSelectionneesSimple = extraireListeSequences(a.sequence);
    if (document.getElementById('inputSequencePickerSimple')) document.getElementById('inputSequencePickerSimple').value = '';
    renderTagsSequencesSimple();

    document.getElementById('inputLecon').value = a.lecon || '';
    competencesSelectionneesSimple = extraireListeCompetences(a.competence);
    if (document.getElementById('inputCompetencePickerSimple')) document.getElementById('inputCompetencePickerSimple').value = '';
    renderTagsCompetencesSimple();

    document.getElementById('inputRessource').value = a.ressource || '';
    document.getElementById('selectTypeRessource').value = a.typeRes || '';
    if (document.getElementById('inputSymbole')) document.getElementById('inputSymbole').value = a.symbole || '';
    if (document.getElementById('inputPersonnes')) document.getElementById('inputPersonnes').value = a.personnes || '';
    document.getElementById('inputPageManuel').value = a.pageManuel || '';
    if (document.getElementById('inputPageOrange')) document.getElementById('inputPageOrange').value = a.pageOrange || '';
    document.getElementById('inputVarianteJaune').value = a.varianteJaune || '';
    if (document.getElementById('inputLienExterne')) document.getElementById('inputLienExterne').value = a.lienExterne || '';
    document.getElementById('selectPeriodeForm').value = programmations[a.id] || a.periode || '';
    document.getElementById('selectDifficulte').value = (a.difficulte !== undefined && a.difficulte !== null) ? String(a.difficulte) : "0";
    document.getElementById('selectCouleurRapide').value = (a.visuel && a.visuel.startsWith('#')) ? a.visuel : calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes);
    document.getElementById('inputImageAct').value = a.imageSpecifique || '';
    document.getElementById('cbEstEvaluation').checked = Boolean(a.estEvaluation);
    document.querySelectorAll('.cb-niveau-form').forEach(cb => { cb.checked = (a.niveau || "").toUpperCase().includes(cb.value); });
    verifierNiveauxCMFormSimple();
    document.getElementById('titreFormulaireBase').innerText = "✏️ Modification de : " + a.ressource;
    document.getElementById('btnAnnulerEditBase').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annulerEditionBase() {
    idEnCoursEdition = null;
    competencesSelectionneesSimple = [];
    sequencesSelectionneesSimple = [];
    if (document.getElementById('inputCompetencePickerSimple')) document.getElementById('inputCompetencePickerSimple').value = '';
    if (document.getElementById('inputSequencePickerSimple')) document.getElementById('inputSequencePickerSimple').value = '';
    renderTagsCompetencesSimple();
    renderTagsSequencesSimple();
    document.getElementById('titreFormulaireBase').innerText = "➕ Ajouter ou modifier une activité";
    document.getElementById('btnAnnulerEditBase').style.display = 'none';
}

function supprimerActiviteBase(idAct) {
    if (confirm("Supprimer cette activité de la base de données ?")) {
        baseDonnees = baseDonnees.filter(b => b.id !== idAct);
        selectionGroupeeBase.delete(idAct);
        postEditGlobal();
        showToast("Activité supprimée.", "success");
    }
}

function toggleCheckActiviteBase(idAct, checked) {
    if (checked) selectionGroupeeBase.add(idAct);
    else selectionGroupeeBase.delete(idAct);
    majBarreActionGroupeeBase();
}

function cocherToutBase(checked) {
    document.querySelectorAll('.cb-select-base').forEach(cb => {
        cb.checked = checked;
        if (checked) selectionGroupeeBase.add(cb.value);
        else selectionGroupeeBase.delete(cb.value);
    });
    majBarreActionGroupeeBase();
}

function majBarreActionGroupeeBase() {
    let barre = document.getElementById('barreActionGroupeeBase');
    let cpt = document.getElementById('nbAteliersCochesBase');
    if (!barre || !cpt) return;
    cpt.innerText = selectionGroupeeBase.size;
    barre.style.display = selectionGroupeeBase.size > 0 ? 'block' : 'none';
}

function appliquerModificationGroupeeBase() {
    if (selectionGroupeeBase.size === 0) return;
    let nouvType = document.getElementById('bulkSelectType')?.value || "";
    let nouvMat = document.getElementById('bulkInputMatiere')?.value.trim() || "";
    let nouvSeq = document.getElementById('bulkInputSequence')?.value.trim() || "";
    let addSeq = document.getElementById('bulkInputAddSequence')?.value.trim() || "";
    let nouvPer = document.getElementById('bulkSelectPeriode')?.value || "";
    let nouvEt = document.getElementById('bulkSelectEtoiles')?.value ?? "";
    let nouvPers = document.getElementById('bulkInputPersonnes')?.value.trim() || "";

    if (!nouvType && !nouvMat && !nouvSeq && !addSeq && !nouvPer && nouvEt === "" && !nouvPers) {
        showToast("Choisissez au moins un élément à appliquer aux activités cochées.", "error");
        return;
    }

    let count = 0;
    baseDonnees.forEach(a => {
        if (a && selectionGroupeeBase.has(a.id)) {
            if (nouvType) a.typeRes = nouvType;
            if (nouvMat) a.matiere = nouvMat;
            if (nouvSeq) a.sequence = nouvSeq;
            if (addSeq) {
                let list = extraireListeSequences(a.sequence);
                extraireListeSequences(addSeq).forEach(s => {
                    if (!list.some(ex => ex.toLowerCase() === s.toLowerCase())) list.push(s);
                });
                a.sequence = list.join(' ; ');
            }
            if (nouvPer === "VIDER") {
                a.periode = "";
                delete programmations[a.id];
            } else if (nouvPer) {
                a.periode = nouvPer;
                programmations[a.id] = nouvPer;
                extraireListeSequences(a.sequence).forEach(s => {
                    programmations[getCleProgSequence(a.matiere, s)] = nouvPer;
                });
            }
            if (nouvEt !== "") a.difficulte = parseInt(nouvEt) || 0;
            if (nouvPers) a.personnes = nouvPers;
            a.visuel = calculerCouleurAutomatique(a.matiere, a.niveau, a.typeRes);
            count++;
        }
    });

    [nouvSeq, addSeq].forEach(raw => {
        extraireListeSequences(raw).forEach(sq => {
            if (sq && !sequencesCustom.includes(sq)) sequencesCustom.push(sq);
        });
    });

    document.getElementById('bulkSelectType').value = "";
    document.getElementById('bulkInputMatiere').value = "";
    document.getElementById('bulkInputSequence').value = "";
    if (document.getElementById('bulkInputAddSequence')) document.getElementById('bulkInputAddSequence').value = "";
    document.getElementById('bulkSelectPeriode').value = "";
    document.getElementById('bulkSelectEtoiles').value = "";
    document.getElementById('bulkInputPersonnes').value = "";

    selectionGroupeeBase.clear();
    let cbAll = document.getElementById('cbToutCocherBase'); if (cbAll) cbAll.checked = false;
    majBarreActionGroupeeBase();
    sauvegarderProgrammations();
    postEditGlobal();
    showToast(`✅ ${count} activité(s) modifiée(s) en lot !`, "success");
}

function supprimerSelectionGroupeeBase() {
    if (selectionGroupeeBase.size === 0) return;
    if (confirm(`Supprimer définitivement les ${selectionGroupeeBase.size} activité(s) cochée(s) ?`)) {
        baseDonnees = baseDonnees.filter(a => !selectionGroupeeBase.has(a.id));
        selectionGroupeeBase.clear();
        let cbAll = document.getElementById('cbToutCocherBase'); if (cbAll) cbAll.checked = false;
        majBarreActionGroupeeBase();
        postEditGlobal();
        showToast("Activités cochées supprimées.", "success");
    }
}

function initNiveaux() {
    const barre = document.getElementById('barreFiltresNiveauxBase');
    if (barre) barre.innerHTML = ['Tous', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'].map(n => `<button type="button" class="filter-btn ${filtreCourantDB === n ? 'active' : ''}" onclick="filtrerBaseNiveau('${n}')">${n}</button>`).join('');
    const selMat = document.getElementById('selectFiltreMatiereBase');
    if (selMat) selMat.innerHTML = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].map(m => `<option value="${escHTML(m)}" ${filtreCourantMatiere === m ? 'selected' : ''}>Matière : ${escHTML(m)}</option>`).join('');
    const selSeq = document.getElementById('selectFiltreSequenceBase');
    if (selSeq) {
        let toutesSeqs = [];
        baseDonnees.filter(b => (filtreCourantDB === 'Tous' || (b.niveau || '').toUpperCase().includes(filtreCourantDB)) && (filtreCourantMatiere === 'Toutes' || (b.matiere || '').trim() === filtreCourantMatiere)).forEach(b => {
            extraireListeSequences(b.sequence).forEach(s => toutesSeqs.push(s));
        });
        let seqsDispo = [...new Set(toutesSeqs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
        let nbSansSeq = baseDonnees.filter(b => extraireListeSequences(b.sequence).length === 0).length;
        selSeq.innerHTML = `<option value="Toutes" ${filtreCourantSequenceDB === 'Toutes' ? 'selected' : ''}>Séquence : Toutes</option>`
            + (nbSansSeq > 0 ? `<option value="SANS_SEQUENCE" ${filtreCourantSequenceDB === 'SANS_SEQUENCE' ? 'selected' : ''}>⚠️ Sans séquence (${nbSansSeq})</option>` : '')
            + seqsDispo.map(s => `<option value="${escHTML(s)}" ${filtreCourantSequenceDB === s ? 'selected' : ''}>Séquence : ${escHTML(s)}</option>`).join('');
    }
    const selType = document.getElementById('selectFiltreTypeBase');
    if (selType) selType.innerHTML = ['Tous', ...Object.keys(imagesParType || {})].map(t => `<option value="${escHTML(t)}" ${filtreCourantTypeDB === t ? 'selected' : ''}>Support : ${escHTML(t)}</option>`).join('');
}

function filtrerBaseNiveau(n) { filtreCourantDB = n; initNiveaux(); afficherBase(); }
function filtrerBaseMatiere(m) { filtreCourantMatiere = m; filtreCourantSequenceDB = 'Toutes'; initNiveaux(); afficherBase(); }
function filtrerBaseSequence(s) { filtreCourantSequenceDB = s; afficherBase(); }
function filtrerBaseType(t) { filtreCourantTypeDB = t; afficherBase(); }

function afficherBase() {
    const tbody = document.getElementById('tableBaseDonnees'); if (!tbody) return;
    let q = (document.getElementById('inputRechercheBase') ? document.getElementById('inputRechercheBase').value : "").toLowerCase().trim();
    let liste = baseDonnees.filter(a => {
        if (!a) return false;
        if (filtreCourantDB !== 'Tous' && !(a.niveau || "").toUpperCase().includes(filtreCourantDB)) return false;
        if (filtreCourantMatiere !== 'Toutes' && (a.matiere || "").trim() !== filtreCourantMatiere) return false;
        if (filtreCourantSequenceDB === 'SANS_SEQUENCE' && extraireListeSequences(a.sequence).length > 0) return false;
        if (filtreCourantSequenceDB !== 'Toutes' && filtreCourantSequenceDB !== 'SANS_SEQUENCE' && !activiteAppartientASequence(a, filtreCourantSequenceDB)) return false;
        if (filtreCourantTypeDB !== 'Tous' && (a.typeRes || "").trim() !== filtreCourantTypeDB) return false;
        if (q && !`${a.matiere} ${a.sequence} ${a.lecon} ${a.competence} ${a.ressource} ${a.symbole || ''} ${a.pageManuel} ${a.pageOrange || ''}`.toLowerCase().includes(q)) return false;
        return true;
    });

    let cpt = document.getElementById('compteurBaseAffichee'); if (cpt) cpt.innerText = liste.length;
    if (liste.length === 0) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#7f8c8d; padding:20px;">Aucune activité trouvée.</td></tr>'; return; }

    let html = '';
    liste.forEach(a => {
        let coul = getCouleurMatiereBandeau(a.matiere), per = getPeriodesActiviteTexte(a);
        let badgePages = '';
        if (a.pageManuel && a.pageOrange) {
            badgePages = `<span style="background:#fef9e7; color:#7d6608; padding:1px 5px; border-radius:4px; font-size:11px; border:1px solid #f1c40f;">🟡 ${escHTML(a.pageManuel)}</span> <span style="background:#fdebd0; color:#9c640c; padding:1px 5px; border-radius:4px; font-size:11px; border:1px solid #f39c12;">🟠 ${escHTML(a.pageOrange)}</span> `;
        } else if (a.pageManuel) {
            badgePages = `<span style="background:#eaf2f8; color:#1b4f72; padding:1px 5px; border-radius:4px; font-size:11px;">📘 ${escHTML(a.pageManuel)}</span> `;
        } else if (a.pageOrange) {
            badgePages = `<span style="background:#fdebd0; color:#9c640c; padding:1px 5px; border-radius:4px; font-size:11px; border:1px solid #f39c12;">🟠 ${escHTML(a.pageOrange)}</span> `;
        }
        let detailsLivres = `${badgePages}${a.varianteJaune ? `<span style="background:#ffe599; color:#7c2d12; padding:1px 5px; border-radius:4px; font-size:11px;">📒 ${escHTML(a.varianteJaune)}</span> ` : ''}`;
        let badgeLien = (a.lienExterne && a.lienExterne.trim())
            ? `<a href="${escHTML(a.lienExterne.trim())}" target="_blank" rel="noopener noreferrer" style="background:#f5eef8; color:#6c3483; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:bold; text-decoration:none; border:1px solid #d7bde2;" title="Ouvrir sur Anton">🔗 Anton ↗</a> `
            : '';
        let rep = getRepereAtelierHtml(a, null, 26);
        let coulVisuel = rep.bg;
        let isChecked = selectionGroupeeBase.has(a.id);
        let seqHtml = extraireListeSequences(a.sequence).length > 0
            ? formaterAffichageSequences(a.sequence)
            : `<span style="color:#e67e22; font-weight:bold; cursor:pointer;" onclick="ouvrirModalGestionSequences()" title="Cliquez pour réassigner">⚠️ Sans séquence</span>`;

        html += `<tr>
            <td style="text-align:center;"><input type="checkbox" class="cb-select-base" value="${a.id}" ${isChecked ? 'checked' : ''} onchange="toggleCheckActiviteBase('${a.id}', this.checked)" style="transform:scale(1.2); cursor:pointer;"></td>
            <td><strong>${escHTML(a.niveau)}</strong></td>
            <td><span class="filter-btn" style="padding:2px 6px; font-size:11px;">${escHTML(per)}</span></td>
            <td><span style="display:inline-block; padding:2px 7px; border-radius:4px; background:${coul.bg}; color:${coul.text}; font-size:11.5px; font-weight:bold; margin-bottom:2px;">${escHTML(a.matiere)}</span><br>${seqHtml} ${a.lecon ? '('+escHTML(a.lecon)+')' : ''}</td>
            <td>${formaterAffichageCompetences(a.competence)}</td>
            <td>${formaterEtoiles(a.difficulte)}<strong>${escHTML(a.ressource)}</strong> ${detailsLivres}${badgeLien}${a.estEvaluation ? '<span class="badge-eval">🎯</span>' : ''}</td>
            <td>${escHTML(a.typeRes || '')}</td>
            <td style="text-align:center;">${escHTML(a.personnes || '')}</td>
            <td style="text-align:center; background:${coulVisuel};">
                ${rep.html}
                <div style="margin-top:3px;">
                    <input type="color" value="${coulVisuel.startsWith('#') ? coulVisuel : '#ffffff'}" onchange="changerCouleurDB('${a.id}', this.value)" style="width:22px; height:18px; border:none; cursor:pointer; vertical-align:middle;">
                    <button type="button" class="filter-btn" style="padding:1px 4px; font-size:10px;" onclick="changerImageDB('${a.id}')">${a.imageSpecifique ? '🖼️' : '➕🖼️'}</button>
                    <button type="button" class="filter-btn" style="padding:1px 4px; font-size:10px;" title="Ajouter ou modifier le lien direct Anton" onclick="definirLienRapideDepuisDash('${a.id}')">${a.lienExterne ? '🔗' : '➕🔗'}</button>
                </div>
            </td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button type="button" class="btn-action" style="padding:4px 8px;" onclick="assignerActivite('${a.id}')">📌</button>
                    <button type="button" class="filter-btn" onclick="editerActiviteBase('${a.id}')">✏️</button>
                    <button type="button" class="btn-remove" style="padding:4px 8px;" onclick="supprimerActiviteBase('${a.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
    majBarreActionGroupeeBase();
}

// ==========================================
// 8. ONGLETS 5, 6, 7 & 8 : PROGRAMMATION PAR SÉQUENCES MULTI-PÉRIODES, ÉTIQUETTES 3x8, MATRICE & BILANS
// ==========================================
function initProgFilters() {
    const selMat = document.getElementById('selectMatiereProg'); if (!selMat) return;
    let val = selMat.value || 'Toutes';
    selMat.innerHTML = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    selMat.value = val;
}

// Permet de cocher/décocher une période (P1 à P5) ou TOUTES les périodes ("TOUTES") sur une séquence entière,
// et répercute automatiquement ces périodes sur tous les ateliers appartenant à cette séquence !
function toggleProgSequence(matiere, sequence, per) {
    let actuelles = getPeriodesSequence(matiere, sequence);
    let nouvelles = [];

    if (per === 'TOUTES') {
        if (actuelles.length === PERIODES_LISTE.length) {
            nouvelles = [];
        } else {
            nouvelles = [...PERIODES_LISTE];
        }
    } else {
        if (actuelles.includes(per)) {
            nouvelles = actuelles.filter(p => p !== per);
        } else {
            nouvelles = PERIODES_LISTE.filter(p => actuelles.includes(p) || p === per);
        }
    }

    let cleSeq = getCleProgSequence(matiere, sequence);
    if (nouvelles.length === 0) {
        programmations[cleSeq] = "";
    } else {
        programmations[cleSeq] = nouvelles.join(', ');
    }

    // Met à jour la période sur chaque atelier lié à cette séquence
    baseDonnees.forEach(a => {
        if (!a) return;
        if ((a.matiere || "").trim() === (matiere || "").trim() && activiteAppartientASequence(a, sequence)) {
            let pUnion = new Set();
            extraireListeSequences(a.sequence).forEach(s => {
                getPeriodesSequence(a.matiere, s).forEach(p => pUnion.add(p));
            });
            let strP = PERIODES_LISTE.filter(p => pUnion.has(p)).join(', ');
            a.periode = strP;
            if (strP) programmations[a.id] = strP;
            else delete programmations[a.id];
        }
    });

    sauvegarderProgrammations();
    sauvegarderBase();
    afficherProgrammation();
    afficherBase();
}

function afficherProgrammation() {
    const cont = document.getElementById('contenuProgrammation'); if (!cont) return;
    let niv = document.getElementById('selectNiveauProg') ? document.getElementById('selectNiveauProg').value : 'Tous';
    let mat = document.getElementById('selectMatiereProg') ? document.getElementById('selectMatiereProg').value : 'Toutes';
    let perFiltre = document.getElementById('selectPeriodeProg') ? document.getElementById('selectPeriodeProg').value : 'Toutes';

    // Regrouper la base de données par (Matière + Séquence)
    let groupesSeqMap = new Map();
    baseDonnees.forEach(a => {
        if (!a) return;
        if (niv !== 'Tous' && !(a.niveau || "").toUpperCase().includes(niv)) return;
        if (mat !== 'Toutes' && (a.matiere || "").trim() !== mat) return;

        let seqs = extraireListeSequences(a.sequence);
        if (seqs.length === 0) return;

        seqs.forEach(s => {
            let matClean = (a.matiere || "").trim();
            let cleGroupe = `${matClean}||${s}`;
            if (!groupesSeqMap.has(cleGroupe)) {
                groupesSeqMap.set(cleGroupe, {
                    matiere: matClean,
                    sequence: s,
                    niveaux: new Set(),
                    competences: new Set(),
                    nbAteliers: 0,
                    nbEvals: 0
                });
            }
            let g = groupesSeqMap.get(cleGroupe);
            g.nbAteliers++;
            if (a.estEvaluation) g.nbEvals++;
            (a.niveau || "").split(/[,/]+/).map(x => x.trim()).filter(Boolean).forEach(n => g.niveaux.add(n));
            extraireListeCompetences(a.competence).forEach(c => g.competences.add(c));
        });
    });

    let listeSeqs = Array.from(groupesSeqMap.values()).filter(g => {
        let pArr = getPeriodesSequence(g.matiere, g.sequence);
        if (perFiltre === 'Non_affecte') return pArr.length === 0;
        if (perFiltre !== 'Toutes') return pArr.includes(perFiltre);
        return true;
    });

    listeSeqs.sort((a, b) => {
        let mA = nettoyerNomPourTri(a.matiere), mB = nettoyerNomPourTri(b.matiere);
        if (mA !== mB) return mA.localeCompare(mB, 'fr');
        return a.sequence.localeCompare(b.sequence, 'fr');
    });

    if (listeSeqs.length === 0) {
        cont.innerHTML = `<div class="empty-state"><p>Aucune séquence trouvée pour ce filtre.</p></div>`;
        return;
    }

    cont.innerHTML = `<table class="table-classique">
        <thead>
            <tr>
                <th style="width:90px;">Niveau(x)</th>
                <th style="width:200px;">Matière</th>
                <th style="width:230px;">Séquence</th>
                <th>Compétence(s) & Ateliers inclus</th>
                <th style="width:310px; text-align:center;">Périodes (multi-sélection possible)</th>
            </tr>
        </thead>
        <tbody>` + listeSeqs.map(g => {
            let pArr = getPeriodesSequence(g.matiere, g.sequence);
            let toutesCochees = pArr.length === PERIODES_LISTE.length;
            let coul = getCouleurMatiereBandeau(g.matiere);
            let nivTxt = Array.from(g.niveaux).join(', ');
            let compsHtml = Array.from(g.competences).map(c => `<span style="display:inline-block; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:1px 6px; margin:1px 2px; font-size:11px;">${escHTML(c)}</span>`).join(' ');

            let btnsPeriodes = PERIODES_LISTE.map(per =>
                `<button type="button" class="prog-pill ${pArr.includes(per) ? 'active' : ''}" onclick="toggleProgSequence('${escJS(g.matiere)}', '${escJS(g.sequence)}', '${per}')" title="Activer/Désactiver ${per} pour cette séquence">${per}</button>`
            ).join('') +
            `<button type="button" class="prog-pill all-periods ${toutesCochees ? 'active' : ''}" onclick="toggleProgSequence('${escJS(g.matiere)}', '${escJS(g.sequence)}', 'TOUTES')" title="Sélectionner ou désélectionner toutes les périodes (P1 à P5)">🌟 Année</button>`;

            return `<tr>
                <td><strong>${escHTML(nivTxt)}</strong></td>
                <td><span style="background:${coul.bg}; color:#fff; padding:3px 8px; border-radius:4px; font-size:11.5px; font-weight:bold; display:inline-block;">${escHTML(g.matiere)}</span></td>
                <td><strong style="font-size:13.5px; color:#1b4f72;">📑 ${escHTML(g.sequence)}</strong><br><small style="color:#666;">${g.nbAteliers} activité(s)${g.nbEvals > 0 ? ` dont ${g.nbEvals} 🎯 éval.` : ''}</small></td>
                <td>${compsHtml || '<em style="color:#999;">Aucune compétence renseignée</em>'}</td>
                <td style="text-align:center;">${btnsPeriodes}</td>
            </tr>`;
        }).join('') + `</tbody></table>`;
}

function afficherChoixEtiquettes() {
    const selMat = document.getElementById('selectMatiereEtiquettes');
    if (selMat && selMat.options.length <= 1) selMat.innerHTML = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    const niv = document.getElementById('selectNiveauEtiquettes') ? document.getElementById('selectNiveauEtiquettes').value : 'Tous';
    const mat = selMat ? selMat.value : 'Toutes', typeF = document.getElementById('selectTypeEtiquettes') ? document.getElementById('selectTypeEtiquettes').value : 'Tous';
    const cont = document.getElementById('listeChoixEtiquettes'); if (!cont) return;
    let liste = baseDonnees.filter(a => a && (niv === 'Tous' || (a.niveau || "").toUpperCase().includes(niv)) && (mat === 'Toutes' || (a.matiere || "").trim() === mat) && (typeF === 'Tous' || (a.typeRes || "").trim() === typeF));
    cont.innerHTML = liste.map(a => {
        let rep = getRepereAtelierHtml(a, null, 18);
        return `<label style="display:inline-block; width:280px; margin:3px 6px; font-size:13px; cursor:pointer;"><input type="checkbox" class="cb-etiq-item" value="${a.id}" checked onchange="genererApercuEtiquettes()"> [${escHTML(a.niveau)}] ${rep.codeTexte ? '<strong>'+escHTML(rep.codeTexte)+'</strong> — ' : ''}${escHTML(a.ressource)}</label>`;
    }).join('');
    genererApercuEtiquettes();
}

function cocherToutesEtiquettes(etat) { document.querySelectorAll('.cb-etiq-item').forEach(cb => cb.checked = etat); genererApercuEtiquettes(); }

function genererApercuEtiquettes() {
    const zone = document.getElementById('printEtiquettesContainer'); if (!zone) return;
    let wMm = parseFloat(document.getElementById('etiqLargeurInput')?.value) || 66;
    let hMm = parseFloat(document.getElementById('etiqHauteurInput')?.value) || 33.8;
    let fsPt = parseFloat(document.getElementById('etiqFontInput')?.value) || 10.5;
    let nbCols = parseInt(document.getElementById('etiqColsInput')?.value) || 3;

    let showCode = document.getElementById('cbEtiqShowCode') ? document.getElementById('cbEtiqShowCode').checked : true;
    let showMatiere = document.getElementById('cbEtiqShowMatiere') ? document.getElementById('cbEtiqShowMatiere').checked : true;
    let showNiveau = document.getElementById('cbEtiqShowNiveau') ? document.getElementById('cbEtiqShowNiveau').checked : true;
    let showNom = document.getElementById('cbEtiqShowNom') ? document.getElementById('cbEtiqShowNom').checked : true;
    let showSeq = document.getElementById('cbEtiqShowSeq') ? document.getElementById('cbEtiqShowSeq').checked : true;
    let showComp = document.getElementById('cbEtiqShowComp') ? document.getElementById('cbEtiqShowComp').checked : true;
    let showEtoiles = document.getElementById('cbEtiqShowEtoiles') ? document.getElementById('cbEtiqShowEtoiles').checked : true;
    let showPers = document.getElementById('cbEtiqShowPers') ? document.getElementById('cbEtiqShowPers').checked : true;
    let showBorder = document.getElementById('cbEtiqShowBorder') ? document.getElementById('cbEtiqShowBorder').checked : true;

    zone.style.gridTemplateColumns = `repeat(${nbCols}, ${wMm}mm)`;
    zone.style.gap = "0mm";

    let ids = []; document.querySelectorAll('.cb-etiq-item:checked').forEach(cb => ids.push(cb.value));

    zone.innerHTML = ids.map(id => {
        let a = baseDonnees.find(b => b.id === id); if (!a) return '';
        let coul = getCouleurMatiereBandeau(a.matiere);
        let rep = getRepereAtelierHtml(a, null, Math.round(fsPt * 2.1));
        let bgEtiq = rep.bg;
        let borderCss = showBorder ? `0.4mm solid ${coul.bg}` : `none`;

        let bandeauHtml = (showMatiere || showNiveau) ? `
            <div style="background:${coul.bg} !important; color:${coul.text} !important; font-size:${Math.max(7, fsPt - 2.5)}pt; font-weight:bold; padding:1px 5px; border-radius:3px; display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span>${showMatiere ? escHTML(a.matiere) : ''}</span>
                <span>${showNiveau ? escHTML(a.niveau) : ''}</span>
            </div>` : '';

        let codeHtml = (showCode && rep.html) ? `
            <div style="font-size:${Math.round(fsPt * 1.35)}pt; font-weight:bold; margin:1px 0; padding:1px 6px; background:rgba(255,255,255,0.72); border-radius:4px; display:inline-block; align-self:center; line-height:1.1;">
                ${rep.html}
            </div>` : '';

        let nomHtml = showNom ? `<div style="font-weight:bold; font-size:${fsPt}pt; color:#1e293b; line-height:1.15;">${escHTML(a.ressource)}</div>` : '';
        let seqHtml = (showSeq && (a.sequence || a.lecon)) ? `<div style="font-size:${Math.max(7, fsPt - 2)}pt; color:#333; line-height:1.1;">${escHTML(a.sequence || '')} ${a.lecon ? '— ' + escHTML(a.lecon) : ''}</div>` : '';
        let compHtml = (showComp && a.competence) ? `<div style="font-size:${Math.max(6.5, fsPt - 2.5)}pt; color:#444; font-style:italic; line-height:1.1;">${escHTML(a.competence)}</div>` : '';
        let piedHtml = (showEtoiles || showPers) ? `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:${Math.max(7, fsPt - 2.5)}pt; width:100%;">
                <span>${showEtoiles ? formaterEtoiles(a.difficulte) : ''}</span>
                <span>${showPers ? escHTML(a.personnes || '') : ''}</span>
            </div>` : '';

        return `<div class="etiquette-item" style="width:${wMm}mm; height:${hMm}mm; background:${bgEtiq} !important; border:${borderCss}; font-size:${fsPt}pt;">
            ${bandeauHtml}
            ${codeHtml}
            ${nomHtml}
            ${seqHtml}
            ${compHtml}
            ${piedHtml}
        </div>`;
    }).join('');
}
function lancerImpressionEtiquettes() {
    document.body.classList.remove('print-lecons-only');
    genererApercuEtiquettes();
    window.print();
}

function genererMatriceCompetences() {
    const selMat = document.getElementById('selectMatiereMatrice');
    if (selMat && selMat.options.length <= 1) selMat.innerHTML = ['Toutes', ...new Set(baseDonnees.map(b => (b.matiere || "").trim()).filter(Boolean))].map(m => `<option value="${escHTML(m)}">${escHTML(m)}</option>`).join('');
    const niv = document.getElementById('selectNiveauMatrice')?.value || 'CP', per = document.getElementById('selectPeriodeMatrice')?.value || 'Toutes', mat = selMat ? selMat.value : 'Toutes';
    const evalOnly = document.getElementById('cbEvalOnlyMatrice') ? document.getElementById('cbEvalOnlyMatrice').checked : false;
    const cont = document.getElementById('conteneurMatrice'); if (!cont) return;

    let elevesNiv = getElevesTries().filter(e => (e.niveau || 'CP').toUpperCase() === niv);
    let acts = baseDonnees.filter(a => {
        if (!a || !(a.niveau || "").toUpperCase().includes(niv)) return false;
        if (mat !== 'Toutes' && (a.matiere || "").trim() !== mat) return false;
        let pArr = getPeriodesActivite(a);
        if (per === 'Non_affecte' && pArr.length > 0) return false;
        if (per !== 'Toutes' && per !== 'Non_affecte' && !pArr.includes(per)) return false;
        if (evalOnly && !a.estEvaluation) return false;
        return true;
    });
    if (elevesNiv.length === 0 || acts.length === 0) { cont.innerHTML = `<div class="empty-state"><p>Aucun élève ou activité pour ces critères.</p></div>`; return; }

    let html = `<table class="table-classique"><thead><tr><th>Matière / Période(s) / Compétence / Ressource</th>` + elevesNiv.map(e => `<th style="text-align:center;">${escHTML(e.nom)}</th>`).join('') + `</tr></thead><tbody>`;
    acts.forEach(a => {
        let coul = getCouleurMatiereBandeau(a.matiere), p = getPeriodesActiviteTexte(a);
        let badgePer = p !== '-' ? `<span class="filter-btn" style="padding:1px 5px; font-size:10.5px; margin-left:4px;">${escHTML(p)}</span>` : '';
        html += `<tr><td><span style="background:${coul.bg}; color:#fff; padding:1px 6px; border-radius:4px; font-size:11px;">${escHTML(a.matiere)}</span>${badgePer} <strong>${escHTML(a.ressource)}</strong> ${a.estEvaluation ? '<span class="badge-eval">🎯</span>' : ''}<br><small>${escHTML(a.sequence)} — ${escHTML(a.competence)}</small></td>` + elevesNiv.map(e => {
            let valide = e.historique && e.historique.some(h => h.idActivite === a.id), enCours = e.planHebdo && e.planHebdo.includes(a.id);
            return `<td style="text-align:center; font-size:16px;">${valide ? '✅' : (enCours ? '⏳' : '—')}</td>`;
        }).join('') + `</tr>`;
    });
    cont.innerHTML = html + `</tbody></table>`;
}

function changerBilanEval(idEl, cleComp, valeur) {
    let e = eleves[idEl]; if (!e) return;
    if (!e.bilanEvaluations) e.bilanEvaluations = {};
    e.bilanEvaluations[cleComp] = valeur; sauvegarderEleves(); showToast("Niveau d'acquisition enregistré !", "success");
}
function genererBilanEleve() {
    const sel = document.getElementById('selectEleveBilan'), cont = document.getElementById('conteneurBilanEleve'); if (!sel || !cont) return;
    let idEl = sel.value || idEleveCourant;
    if (!idEl || !eleves[idEl]) { cont.innerHTML = `<div class="empty-state"><p>Sélectionnez un élève pour afficher son bilan.</p></div>`; return; }
    sel.value = idEl; let e = eleves[idEl]; if (!e.bilanEvaluations) e.bilanEvaluations = {};
    let hist = e.historique || [];
    if (hist.length === 0) { cont.innerHTML = `<div class="empty-state"><p>Aucune activité validée pour ${escHTML(e.nom)}.</p></div>`; return; }

    let parMat = {};
    hist.forEach(h => { let a = baseDonnees.find(b => b.id === h.idActivite); if (!a) return; let m = a.matiere || "Autres"; if (!parMat[m]) parMat[m] = []; parMat[m].push({ act: a, date: h.date, sequence: h.sequence || a.sequence }); });
    let html = `<div class="card-panel"><h3>📋 Bilan des acquisitions de ${escHTML(e.nom)} (${escHTML(e.niveau)}) — ${hist.length} activités validées</h3>`;
    Object.keys(parMat).forEach(m => {
        let coul = getCouleurMatiereBandeau(m);
        html += `<div class="bandeau-matiere-print" style="background:${coul.bg}; color:${coul.text}; margin-top:15px;">${escHTML(m.toUpperCase())}</div><table class="table-classique"><thead><tr><th style="width:90px;">Date</th><th style="width:160px;">Séquence</th><th>Compétence(s)</th><th>Atelier validé</th><th style="width:170px;">Maîtrise (LSU)</th></tr></thead><tbody>` + parMat[m].map(it => {
            let cleComp = `${it.act.matiere}||${it.act.competence || it.act.ressource}`, nivMaitrise = e.bilanEvaluations[cleComp] || "Atteint";
            return `<tr><td>${escHTML(it.date)}</td><td>${escHTML(it.sequence)}</td><td><strong>${formaterAffichageCompetences(it.act.competence)}</strong></td><td>${escHTML(it.act.ressource)}</td><td><select onchange="changerBilanEval('${e.id}', '${escJS(cleComp)}', this.value)" style="width:100%; font-weight:bold;"><option value="Dépassé" ${nivMaitrise === 'Dépassé' ? 'selected' : ''}>✨ Dépassé</option><option value="Atteint" ${nivMaitrise === 'Atteint' ? 'selected' : ''}>✅ Atteint</option><option value="Partiellement atteint" ${nivMaitrise === 'Partiellement atteint' ? 'selected' : ''}>🟠 Partiellement atteint</option><option value="Non atteint" ${nivMaitrise === 'Non atteint' ? 'selected' : ''}>🔴 Non atteint</option></select></td></tr>`;
        }).join('') + `</tbody></table>`;
    });
    cont.innerHTML = html + `</div>`;
}
function exporterBilanEdulivret() {
    const sel = document.getElementById('selectEleveBilan'); let idEl = sel ? sel.value : idEleveCourant;
    if (!idEl || !eleves[idEl]) { showToast("Sélectionnez d'abord un élève.", "error"); return; }
    let e = eleves[idEl], parMat = {};
    (e.historique || []).forEach(h => {
        let a = baseDonnees.find(b => b.id === h.idActivite); if (!a) return;
        let m = a.matiere || "Autres"; if (!parMat[m]) parMat[m] = new Set();
        let cleComp = `${a.matiere}||${a.competence || a.ressource}`, niv = (e.bilanEvaluations && e.bilanEvaluations[cleComp]) ? e.bilanEvaluations[cleComp] : "Atteint";
        parMat[m].add(`- ${a.competence || a.ressource} (${h.sequence || a.sequence}) : ${niv}`);
    });
    let lignes = [`BILAN DES COMPÉTENCES — ${e.nom.toUpperCase()} (${e.niveau})\n`];
    Object.keys(parMat).forEach(m => { lignes.push(`=== ${m.toUpperCase()} ===`); parMat[m].forEach(it => lignes.push(it)); lignes.push(''); });
    let zone = document.getElementById('zoneExportEdulivret'), ta = document.getElementById('textareaExportLSU');
    if (zone && ta) { zone.style.display = 'block'; ta.value = lignes.join('\n'); ta.select(); navigator.clipboard?.writeText(ta.value).catch(() => {}); showToast("📋 Bilan copié dans le presse-papiers !", "success"); }
}

// ==========================================
// 9. NAVIGATION & INITIALISATION GLOBALE
// ==========================================
function changerOnglet(idPage, element) {
    document.body.classList.remove('print-lecons-only');
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
    let inpMat = document.getElementById('inputMatiere');
    if (inpMat) inpMat.addEventListener('input', majCouleurAutoFormSimple);
    let selType = document.getElementById('selectTypeRessource');
    if (selType) selType.addEventListener('change', majCouleurAutoFormSimple);
    verifierNiveauxCMFormSimple();
    renderTagsSequencesSimple();
    renderTagsCompetencesSimple();
    rafraichirToutApresImport();
    tenterConnexionAutoFirebase();
});
