# evidence/ubma-official-2026-09 — preuves de récupération de sources officielles (mission « Source Recovery »)

Dossier **de preuve**, séparé de `organized/` et de `captures/official-elearning/` (ce dernier reste la
référence des captures UBMA du 2026-09-20). Contenu : documents-texte officiels UBMA relevés le 2026-09-21
via le pont de lecture, inventaires, et conclusions de résolution des écarts de
`resources/incoming/study-materials/notes/reconciliation.md`.

**Règles appliquées ici** : captures texte étiquetées « pas l'original » ; aucun SHA-256 inventé ;
aucun contenu S2 vers `organized/S1/` ; aucune création de module non prouvé ; les fichiers existants du
dépôt (`PROGRAMME.md`, `S1/**`, `notes/reconciliation.md`, captures antérieures) ne sont **pas** modifiés.

## Résolution des 7 items (état au 2026-09-21)

| # | Item | Verdict | Preuve déterminante |
|---|---|---|---|
| A | Nombres complexes : Analyse 1 ou Algèbre 1 ? | **REQUIRES OFFICIAL VERIFICATION** (inchangé) | Les documents UBMA « Nouveau Programme du 1er Semestre » (cours Affichages MI) existent mais leurs IDs ne sont pas accessibles en invité. Ni la plateforme ni le canevas national 2025-2026 consultés ne publient la liste de chapitres. La divergence à trois sens (user : Analyse 1 / archive : Algèbre 1 / plan initial) est **préservée**, non tranchée. |
| B | Arithmétique ℤ + polynômes en S1 ? | **REQUIRES OFFICIAL VERIFICATION** | Canevas national : Algèbre 1 couvre structures/arithmétique-polynômes au niveau L1 (fiches SECONDARY concordantes, non UBMA). Rien chez UBMA ne permet de retirer le contenu J18/J27 ; rien ne permet de le proclamer officiel UBMA. |
| C | Développements limités / intégration en S1 ? | **REQUIRES OFFICIAL VERIFICATION** | La liste user-supplied (Analyse 1 sans DL ni intégration) ≈ canevas Batna-type ; le dépôt garde DL en Analyse-2 et intégration en Analyse-1 (archives). Aucun document UBMA 2025-2026 consulté ne tranche. |
| D | SM : chapitres 5-8 (combinatoire/séquentielle/mémoires) = S1 ? | **RÉSOLU — contre le placement S1** (matériel officiel UBMA 2019-2020) | `capture-SM2-programme-officiel-2019-2020.md` : Ch2 combinatoire, Ch3 séquentielle + bascules/registres/mémoires, Ch4 circuits intégrés = **SM2 (S2)**. SM1 officiel (captures existantes Ch1-Ch4) s'arrête à Boole + initiation combinatoire. « Machine pédagogique » : **UNVERIFIED** (aucune occurrence UBMA). |
| E | Système d'exploitation 1 / Unix 9 chapitres en S1 ? | **RÉSOLU — pas un module S1 de la L1 SI UBMA** | Canevas national 2025-2026 : SE1 = **S4** (UEF411) ; Batna : S4 ; aucune annonce UBMA L1-SI avec SE1. Le contenu Unix du document user correspond aux thèmes du module **Logiciels libres** (UEM111, S1, UBMA) — déjà couvert dans le dépôt (archive `command-linux-part1.pdf`, `Workshop_1` sous `organized/S1/Logiciels-libres/`). |
| F | « Électronique fondamentale » en S1 ? | **RÉSOLU — pas en S1 au canevas courant** | Canevas national 2025-2026 : Électronique fondamentale = **UED211, S2** ; le S1 national porte Électricité générale. Chez UBMA : Catalogue 2025-2026 = Électricité générale (S1) / Électronique générale (S2) ; la plateforme officielle montre un ancien module « Electronique et composantes 2018-2019 » (tronc commun MI, vue « Affichages », ressource listée sans ID accessible) et le canevas Batna 2018-2019 permettait un **choix S1** Électronique-et-composants — une variante LEGACY nationale, pas UBMA courante. |
| G | « Bureautique » : titre et existence | **PARTIELLEMENT RÉSOLU** | **EXISTE** sur l'infrastructure officielle UBMA sous forme de TP : `TP Bureautique 1+2`, `3+4`, `5`, `6+7` (inventaire `capture-affichages-mi-inventaire-ressources.md`) — tronc commun MI historique, années non confirmées. **ABSENT** du Catalogue UBMA 2025-2026 et du canevas national S1 2025-2026. Les 3 chapitres user (communication écrite / prise de notes / synthèse) ne correspondent ni aux TP observés ni au contenu du cours « Terminologie scientifique » UBMA (chapitre 1 = initiation terminologique informatique, pluginfile 130051). Titre en vigueur 2026/27 : **REQUIRES OFFICIAL VERIFICATION**. |

## Impact sur le plan du Mois 1 (rapport, pas de réécriture)

- **KEEP** : toutes les lignes du plan du Mois 1 (aucune ne reposait sur les items contestés ; SM du Mois 1
  = numération/base/représentation/Boole — exactement le périmètre SM1 officiel).
- **KEEPS/EXPAND (confirmé)** : Électricité générale en S1 (canevas national + Catalogue concordants) ;
  Logiciels libres comme support des réflexes Unix (l'item E « SE1/Unix » est absorbé par cette ligne existante).
- **DEFER (inchangé)** : la logique combinatoire avancée (additionneurs/multiplexeurs) et tout ce qui suit
  restent hors du Mois 1 ; le passage en revue SM « complète » relève du semestre 2 (SM2) et/ou de M2+.
- **REQUIRES VERIFICATION (aucune action automatique)** : A/B/C et G. Points de contact suggérés à
  l'étudiant : récupérer les trois documents « Nouveau Programme »/« Programme MI » depuis une session
  authentifiée de la plateforme (ou l'affichage du département), et le PDF « Arrêté / programme L1 SI »
  de la Faculté de Technologie.

## Contrôle négatif daté (2026-09-21)
- `factec.univ-annaba.dz` : recherche ciblée du 2026-09-21 → uniquement des « LISTES DES ETUDIANTS »,
  aucun programme de modules publié (cohérent avec le contrôle négatif S10 déjà consigné dans
  `resources/sources/SOURCES.md`).
- `univ-annaba.dz` : l'offre « Licence Systèmes informatiques » est listée sous le domaine
  Mathématiques & Informatique **sans page de programme en ligne** (le lien de la licence mène à la liste des
  formations ; aucun document de chapitres L1 publié sur le site central).
