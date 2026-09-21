# SINF-S1-LOCK — verrouillage du curriculum vérifié (2026-09-21)
<!-- Registre de verrouillage. Ne remplace aucun fichier de curriculum ; le consigne avec ses preuves. -->

## A. Liste verrouillée — L1 · Semestre 1 · Licence LMD **Systèmes Informatiques (SINF)**
Référentiel public le plus fort à date : **Catalogue des formations, Faculté de Technologie, section SINF (séquence « courante »), 2025-2026** (texte restitué 2026-09-21, `evidence/ubma-si-lmd-2026-09/FINDINGS-SI-LMD-2026-09-21.md` §1) + annonces du département 2025-2026 (S2 du registre `resources/sources/SOURCES.md`).

| # | Module (intitulé officiel) | UE | Coef | Crédits | Volumes | Statut du verrou |
|---|---|---|---|---|---|---|
| 1 | Analyse 1 | UEF11 | 4 | 6 | 2 CM + 2 TD | **VERROUILLÉ (A)** — valeurs lues |
| 2 | Algèbre 1 | UEF11 | 2 | 4 | 1 CM + 1 TD | **VERROUILLÉ (A)** — valeurs lues |
| 3 | Algorithmique et structures de données 1 | UEF12 | 🟡 n.p. | 🟡 n.p. | TP enseigné (C) | VERROUILLÉ (A, module) |
| 4 | Structure de machine 1 | UEF12 | 🟡 n.p. | 🟡 n.p. | 🟡 n.p. | VERROUILLÉ (A, module) |
| 5 | Logiciels libres (open source) | UEM11 | 🟡 n.p. | 🟡 n.p. | cours en ligne A/B | VERROUILLÉ (A, module) |
| 6 | Électricité générale | UED11 | 🟡 n.p. | 🟡 n.p. | CM amphi + TD | VERROUILLÉ (A, module + annonce 02/11/2025) |
| 7 | Anglais 1 | unité non extraite | 🟡 n.p. | 🟡 n.p. | en ligne (25/11/2025) | VERROUILLÉ (A par annonces ; absent du rendu Catalogue, documenté) |
| 8 | Histoire | UET11 | 🟡 n.p. | 🟡 n.p. | 🟡 n.p. | VERROUILLÉ (A, module) |

n.p. = « non publié en texte lisible dans les sources consultées ». Ne jamais inventer ces valeurs.

**EXCLUS explicitement du S1 SINF courant** (avec justification dans `evidence/ubma-si-lmd-2026-09/FINDINGS…md` §3) :
- « Bureautique » — jamais module SINF S1 (aucune occurrence dans le catalogue courant **ni ancien**) ; legacy = TP du tronc commun MI ; le contenu à 3 chapitres circulant comme « Bureautique » = programme « Communication écrite et orale » d'**une autre faculté UBMA** (`facsct.univ-annaba.dz/?p=2404`).
- « Système d'exploitation 1 » — module SINF **réel mais semestre 4** (UEF41 ; variante ancienne 3/5, 1 CM/1 TD/1 TP). Ne jamais renommer « Logiciels libres » en SE1.
- « Électronique fondamentale » — correspond au module « Électronique générale » (en. *Fundamental electronics*) **S2, UET21** du catalogue courant ; l'ancien SINF plaçait « Électronique et composants des systèmes » en **S1 UED11** → matériau legacy à étiqueter **LEGACY_YEAR_SPECIFIC**, jamais mélangé au S1 2025-26.

**Préservé sans promotion** : « Terminologie scientifique et expression écrite » (variante ancienne du catalogue, UEM11) — pas de dossier créé ; « Bureautique » user-supplied — classement `USER_SUPPLIED / NON-SINF-S1-VERIFIED` (étiquette de contenu, pas de module).

## C. Verrou de chapitres (preuves « Programmes de la Matière » 2020-2021, classe B — captures dans `evidence/ubma-si-lmd-2026-09/`)
- **ASD 1** : Ch1 intro · Ch2 algorithme séquentiel simple (+traduction C) · Ch3 conditionnelles · Ch4 boucles · Ch5 tableaux & chaînes · Ch6 types personnalisés (énumérations, structures). → Les 5 topics « user » sont **exactement** Ch2→Ch6. Verrou : les six chapitres, année 2020-21, classe B (chapitrage SINF 2025-26 non publié → statut « soutenu, non arrêté »).
- **SM 1** : Ch1 intro · Ch2 systèmes de numération · Ch3 représentation de l'information (Gray, DCB, excédentaire de 3, ASCII/EBCDIC/UTF, complément à 1/2, IEEE 754) · Ch4 algèbre de Boole **incluant Karnaugh et Quine-McCluskey et NAND/NOR exclusifs**. Interdits S1 : combinatoire usuelle (additionneurs/mux), séquentielle/bascules/registres/**mémoires**/automates/compteurs, circuits intégrés → **SM2/S2** (programme 2019-20). « Machine pédagogique » : **NOT VERIFIED** (zéro trace dans toute source UBMA consultée).
- **Analyse 1** : ChI corps ℝ · **ChII nombres complexes (en Analyse, pas en Algèbre)** · ChIII suites · ChIV fonctions réelles, limites, continuité, Landau · ChV fonctions dérivables **incluant formule de Taylor** · ChVI fonctions élémentaires (ln/exp/puissance/hyperboliques). **Intégration/primitives : NON établie en S1** par les programmes récupérés (à traiter comme matière d'Analyse 2 sauf preuve contraire). Développement limité : pas de chapitre autonome — la formule de Taylor figure au ChV ; conserver les DL du plan comme supplément d'entraînement, étiquetés SUPPLEMENTAIRE.
- **Algèbre 1** : Ch1 logique · Ch2 ensembles/applications · Ch3 relations binaires · Ch4 structures algébriques (groupes, anneaux, corps ; ℤ/nℤ, S₃, ℤ/pℤ) · Ch5 anneau des polynômes. **Arithmétique dans ℤ : NOT VERIFIED** comme chapitre SINF S1 (absente des deux référentiels officiels consultés) — le matériau existant du dépôt est **conservé** comme ➕ SUPPLEMENTAIRE, sans étiquette « confirmé ».
- **Logiciels libres / Électricité / Anglais / Histoire** : pas de chapitrage publié trouvé ; KEEP tels quels.

## Règles d'application
1. Toute promotion future (ex. complex numbers « retirés d'Analyse ») exige une source **A** (UBMA SINF, datée, courante).
2. Les captures 2020-21 sont des preuves de matière **de l'ère tronc commun MI** — utilisables comme contenu d'étude et comme forte présomption de structure, jamais comme arrêté SINF 2026-27.
3. Matériel existant : ne rien déplacer, ne rien supprimer ; reclasser uniquement sur preuve de **contenu** (précédent : micro-fix `Examen d'algèbre 2025 – Solution.pdf`, SHA identique).
4. Écart d'année toujours affiché : 2020-21 « Algèbre 1 = 3/5 », 2025-26 « Algèbre 1 = 2/4 » → divergence `notes/programme-conflicts.md` n°1, non résolue, non fusionnée.
