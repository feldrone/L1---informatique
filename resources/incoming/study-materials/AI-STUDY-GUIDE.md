# AI-STUDY-GUIDE — Mode d'emploi du dépôt pour un agent d'étude

> Ce fichier enseigne à un agent IA (moi, ou un futur agent) comment exploiter CE dépôt.
> Il ne décrit AUCUNE capacité plateforme : uniquement des fichiers et conventions locales.

## 1. Structure du dépôt
```
S1/, S2/                     → Cursus officiel vérifié (module → chapitre → plan de study). NE JAMAIS modifier.
resources/PROGRAMME.md       → Programme officiel L1 Informatique (source d'autorité).
resources/sources/SOURCES.md → Sources officielles citées.
Corrections/ Examens/ Exercices/ Fiches/ → Note pédagogique de la base de connaissance (Markdown).
resources/incoming/study-materials/
  raw/                       → 16 ZIP d'origine FOURNIS PAR L'UTILISATEUR (Telegram). Sacrés : jamais modifier/renommer/supprimer.
  extracted/                 → Extraction brute (locale, régénérable, hors git).
  organized/                 → ARCHIVE DE TRAVAIL intégrée : S1/<module>/<Type>/fichier (528 copies canoniques vérifiées).
  notes/inventory.tsv        → REGISTRE MAÎTRE 19 colonnes, 627 lignes, 1 fichier = 1 ligne.
  notes/archive-inventory.tsv→ Les 16 conteneurs ZIP (SHA-256 réels).
  notes/module-map.md        → Cursus ↔ archive : compteurs, types, années, sous-topiques par module.
  notes/study-index.md       → Index feuilletable de toutes les pièces avec confiance/année/paires.
  notes/material-coverage.md → Couverture et lacunes.
  notes/reconciliation.md    → Preuves de comptes (627 = 528+99).
  notes/inventory-legacy-discovery.tsv / inventory-v1-backup.tsv → archives des états antérieurs.
STUDY-HUB.md (racine)        → Entrée humaine : par module, ce qui existe et où.
.github/skills/l1-study/     → Compétences d'étude localisées (workflows Markdown pour agent compatible).
```

## 2. Mapping semestre/module (autorités)
- S1 (curriculum racine) : 01-Analyse-1 · 02-Algebre-1 · 03-Algorithmique-1 · 04-Structure-de-machine-1 · 05-Logiciels-libres · 06-Electricite-generale · 07-Anglais-1 · 08-Histoire.
- S2 : 01-Analyse-2 · 02-Algebre-2 · 03-Algorithmique-2 (ASD-2) · 04-Structure-de-machine-2 · 05-Logique-mathematique · 06-Introduction-IA · 07-Electronique-generale · 08-Citoyennete-et-patriotisme.
- Archive d'étude : `organized/S1/<Module>/…`, noms alignés (Algorithmique-ASD-1 = module 03 S1 ; Anglais-1-TCE-1 = module 07 S1 ; ASD-2 = module 03 S2).
- **Ne jamais mélanger S1 et S2, ni L1-SI avec MIAGE/MBD.** « Analyse » sans numéro ≠ Analyse-2 : vérifier le contenu ; si ambigu → `UNCLASSIFIED`.

## 3. Où trouver quoi
| Besoin | Emplacement |
|---|---|
| Cours / chapitres | `organized/<sem>/<module>/Cours/` |
| TD | `…/TD/` · Séries d'exercices : `…/Series/` · TP : `…/TP/` |
| Examens | `…/Examens/` · Corrigés & examens+corrige : `…/Corriges/` |
| Résumés / fiches | `…/Revisions/` |
| Supports, projets, diaporamas | `…/Supports/` |
| Fourre-tout non classé | `…/Autres/` et `organized/UNCLASSIFIED/Autres/` |
| L'original exact d'une pièce | colonne `extracted_path` du registre, ou ré-extraire du ZIP `raw/` (SHA-256 en colonne 4) |

## 4. Lire notes/inventory.tsv (TSV, 19 colonnes, tabulation = séparateur)
1 original_archive · 2 original_filename · 3 extracted_path · 4 sha256 · 5 module · 6 semester · 7 material_type (vocabulaire : COURSE/CHAPTER/LECTURE/TD/TP/PRACTICAL/EXAM/EXAM_CORRECTION/EXERCISES/CORRECTION/SUMMARY/REVISION/PROJECT/REFERENCE/OTHER) · 8 academic_year · 9 source (institution citée dans le document) · 10 provenance (TELEGRAM_USER_PROVIDED pour tout) · 11 classification_confidence (HIGH/MEDIUM/LOW) · 12 organized_location (— = non copié) · 13 duplicate_status (NEW/EXACT_DUPLICATE/LIKELY_DUPLICATE) · 14 duplicate_of · 15 content_status (pdf_parsed (Np) / PDF_NO_TEXT_LAYER = scan sans OCR / office_parsed / text / …) · 16 notes (peut contenir `pair-correction: <chemin>` / `pair-examen: …`) · 17 subtopic (thème détecté dans le CONTENU) · 18 integration_status (PLACED_CANONICAL / PLACED_LIKELY_DUP / DUPLICATE_NOT_COPIED / NOT_PLACABLE_*) · 19 canonical_info.
Exemple : lister les examens de Structure-de-machine-1 →
`awk -F'\t' '$5=="S1/Structure-de-machine-1" && ($7=="EXAM"||$7=="EXAM_CORRECTION")' notes/inventory.tsv`

## 5. Provenance — hiérarchie de confiance
1. **Officiel daté UBMA** → uniquement ce qui est dans `S1/`, `S2/`, `resources/` et sourcé (captures de l'e-learning UBMA dans `captures/official-elearning/`). Rien d'autre ne peut être présenté comme « officiel ».
2. **Archive étudiante fournie par l'utilisateur** (les 627) → matériel exploitable (exercices, annales d'autres universités) mais : université variable (1 pièce cite l'UBMA, 265 une université publique, 361 aucune), année parfois absente (393 UNKNOWN), qualité variable. Citer comme « document partagé (provenance télégram), vu dans <chemin> ».
3. **Contenu généré par l'agent** → toujours marqué comme tel, jamais mélangé aux faits vérifiés.

## 6. Répondre à un étudiant (protocole)
1. Identifier semestre + module (si ambigu, DEMANDER ou traiter les deux, sans deviner).
2. Consulter `notes/inventory.tsv` (filtrer colonnes 5-7-11) → sélectionner documents HIGH > MEDIUM ; ignorer `PDF_NO_TEXT_LAYER` pour l'explication de contenu (on ne peut pas lire un scan sans OCR — le dire).
3. Ouvrir le fichier via `organized_location` (ou extracted_path) ; citer le CHEMIN du dépôt pour chaque fait tiré du document.
4. Séparer explicitement : « D'après le document X (chemin) » vs « Explication pédagogique générée ».
5. Année/session : uniquement colonne 8 ; sinon dire « année non précisée ». Jamais l'âge du fichier, jamais la date d'upload.
6. Incertitude : LOW/UNCLASSIFIED → le dire. **Ne jamais inventer cours, note, coefficient, examinateur, sujet d'examen.**

## 7. Générer (plans, fiches, quiz, examens, corrections, explications)
- **Plan de révision** : alterner Cours → TD/Series → Examens d'un même module ; prioriser HIGH-confiance et années récentes (2024-2026 majoritaires dans l'index) ; signaler les lacunes (Analyse-2, IA, Citoyenneté, Élec-gén, Histoire = 0-1 doc → appuyer sur le plan de cours du cursus racine, pas sur l'archive).
- **Fiche de révision** : structure depuis `S1|S2/*/` (chapitres officiels) ; contenu illustré par les PDF de l'archive (citer chemin) ; jamais de contenu « officiel » inventé.
- **QCM/exercices** : s'inspirer du style des TD/Examens du module et de l'année visée (colonne 8) ; indiquer les sources imitées.
- **Examen blanc** : composer depuis les Examens réels du module (couper/recoller des questions N'EST PAS autorisé légalement hors usage privé — pour l'entraînement uniquement) ; format : barème, durée = à définir explicitement comme « simulé, non officiel ».
- **Corrigés** : d'abord chercher `pair-correction` dans notes (colonne 16) et `…/Corriges/` ; sinon produire « Proposition de corrigé — non officielle » avec raisonnement complet.
- **Analyse de lacunes** : `notes/material-coverage.md` + compter par module/type ; croiser avec la progression de l'étudiant.
- Compétences détaillées : `.github/skills/l1-study/`.

## 8. Doublons & intégrité
- Doublon exact (99) : même SHA-256 ; une seule copie canonique dans `organized/` ; la ligne dup pointe `canonical copy: <chemin>`. **Aucun fichier supprimé, jamais.**
- Doublon probable : contenu quasi-identique, hash différent — conservés côte à côte, marqués LIKELY.
- raw/ = référence : après toute opération, re-vérifier `sha256sum` des 16 ZIP contre `notes/archive-inventory.tsv`.

## 9. Interdits permanents
Modifier/détruire/renommer un ZIP ou un original ; toucher S1/, S2/, PROGRAMME.md, SOURCES.md, I ; réécrire l'histoire git / force-push ; promettre de l'OCR (non installé) ; présenter un PDF d'un autre établissement comme « cours officiel UBMA » ; inventer une classification, une année, un enseignant, un coefficient ; supprimer un doublon.
