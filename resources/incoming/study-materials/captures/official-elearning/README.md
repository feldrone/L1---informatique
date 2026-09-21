# captures/official-elearning — Inventaire des ressources officielles UBMA trouvées accessibles

> ⚠️ Ce dossier ne contient **aucun binaire** : le pont texte de l'agent ne **parse** les PDF que pour la
> lecture ; les octets originaux restent sur le serveur officiel de l'UBMA (URLs ci-dessous, accessibles
> publiquement/invité — testé : rendu effectif sans session, le pont a suivi `view.php` → `pluginfile.php`
> → PDF parsé).

## Source : elearning-deprecated.univ-annaba.dz (Moodle officiel « Télé-enseignement », Fac. des Sciences / Dép. Math & Info)

### Cours Structure Machine 1 — S1 — Année 2019-2020 (course id 1529)
| Fichier officiel | Page ressource (view) | Fichier brut (pluginfile) | État capture texte |
|---|---|---|---|
| Chapitre 1.pdf (numération, historiques) | /mod/resource/view.php?id=12440 | /pluginfile.php/29143/mod_resource/content/1/Chapitre%201.pdf | ✅ parsé (2 chunks) — contenu vérifié : systèmes de numération |
| Chapitre 2.pdf (bases, conversions) | /mod/resource/view.php?id=12441 | /pluginfile.php/29144/mod_resource/content/1/Chapitre%202.pdf | ✅ parsé — conversions déc/binaire/oct/hex, virgule flottante |
| Chapitre 3.pdf (entiers, CA1/CA2, débordement) | /mod/resource/view.php?id=12442 | /pluginfile.php/29145/mod_resource/content/1/Chapitre%203.pdf | ✅ parsé — codage entiers/réels, retenue/overflow |
| Chapitre 4.pdf (Boole, combinatoire) | /mod/resource/view.php?id=12443 | /pluginfile.php/29146/mod_resource/content/1/Chapitre%204.pdf | ✅ parsé — portes, tables de vérité, De Morgan |

### Exams & corrigés officiels repérés (SM2 + ASD, à confirmer par requêtes ciblées ultérieures)
| Fichier | URL directe (publique, testée via recherche) | Intérêt |
|---|---|---|
| Examen Année 2018-2019 + Corrigé — Structure Machine 2 | /mod/resource/view.php?id=27674 (+ cours 1206, TD 1478) | S2 — énoncés/corrigés OFFICIELS |
| Examen 2018-2019.pdf (C · listes chaînées — ASD) | /pluginfile.php/60296/mod_resource/content/1/Examen%202018-2019.pdf | Épreuve C, cohérente avec « TP C » de salle |
| « Comment calculer votre moyenne… Nouveau Programme.doc » | /pluginfile.php/65158/mod_resource/content/1/Comment%20calculer%20votre%20Moyenne%20et%20votre%20Cr%C3%A9dits%20Nouveau%20Programme.doc | **OFFICIEL** — coef/crédits variant ancien (Algèbre 1: 3/5 ; SM1: 3/5 ; UEF1/UEF2=7 ; note unique Français/Anglais) ⚠️ diverge du Catalogue (Algèbre 1: 2/4) — NE PAS intégrer sans arbitrage, documenter |

## Capacité de capture prouvée
`fetch_page` suit les liens Moodle guest → parse les PDF (≤30 pages). Toute future intégration devrait
soit reprendre ces URL officielles comme **sources**, soit attendre le dépôt manuel des originaux par
l'étudiant dans `../../` (inbox).

## Captures texte sauvegardées (2026-09-20)
| Fichier local | Document source | Année | Type |
|---|---|---|---|
| capture-ASD2-examen-2018-2019.md | Examen ASD2 EMD (60296) | 2018-2019 | EXAMEN |
| capture-SM2-examen-2018-2019.md | Examen SM2 (view 27674/27677) | 2018-2019 | EXAMEN |
| capture-SM2-corrigé-examen-2018-2019.md | Corrigé examen SM2 (view 27678) | 2018-2019 | CORRIGÉ |

## Inventaire TD Structure Machine 2 (cours 1478) — 22 fichiers nommés avec IDs (URLs view.php?id=N)
Séries: 1→12492, 2→15734, 3→12493 · Corrigés séries: 12494, 15735, 12495
Solutions détaillées S2 (PPT/PDF): 25951 25952 24437 20751 24438 24439 25947 24441
Solutions détaillées S3: 25954 24980 20744 · Examen 27677 + Corrigé 27678 · emails 24059 · liens vidéos WebTV 27344
Tous accessibles en invité via https://elearning-deprecated.univ-annaba.dz/mod/resource/view.php?id=<N>
→ **Capture additionnelle à la demande** : préfixer l'URL de `https://r.jina.ai/` (le pont parse le PDF).
