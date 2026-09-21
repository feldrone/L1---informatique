# CONTRIBUTING — L1 SI · UBMA Annaba

Objectif : une base de connaissances **propre, structurée, traçable**, à jour de l'année universitaire en cours,
pour l'étudiant de L1 Systèmes Informatiques de l'Université Badji Mokhtar — Annaba.

## 1. Règle absolue : ne rien inventer

Il est interdit de fabriquer ou de « déduire » : noms officiels de modules, coefficients, crédits, volumes
horaires, dates ou sessions d'examen, noms d'enseignants, PDF « officiels ».

- Donnée **vérifiée** → citer la source dans `resources/sources/SOURCES.md` (format d'enregistrement imposé).
- Donnée **non trouvée** → écrire : « Non vérifié dans les sources officielles consultées. »
- Contenu **pédagogique produit pour le dépôt** → étiquette obligatoire :
  `SUPPLEMENTAIRE — NON OFFICIEL` (corrigés : `Correction pédagogique — non officielle`).

## 2. Autorités officielles

Seules `univ-annaba.dz` et ses sous-domaines (dont `factec.univ-annaba.dz`) — et les documents du Ministère
de l'Enseignement Supérieur — font foi. Forums, blogs, réseaux sociaux, vidéos et sites d'autres universités
ne sont jamais une preuve : au mieux un pointeur signalé comme non officiel.

## 3. Structure

- Un module = un dossier `S1/NN-Nom/` ou `S2/NN-Nom/` : `README.md` (fiche du module, gabarit ci-dessous)
  + uniquement les sous-dossiers utiles (`Cours/`, `TD/`, `TP/`, …). Pas de dossiers vides.
- Exercices, Corrections, Fiches, Examens : dossiers **centraux** à la racine (éviter les doublons ; lien
  relatif vers le fichier canonique quand le fichier vit déjà dans le module).
- Intitulés **en français** pour le contenu, noms de dossiers ASCII sans accents (ex. `02-Algebre-1`).

## 4. Gabarit du README d'un module

```
# <Nom officiel>
> **Statut des données** 🟩✅/🟨🟡…
## Niveau · Université · Faculté/Département · Semestre · Type
## Objectifs · Programme · CM · TD · TP · Évaluation · Coefficient · Crédits · Ressources · Sources officielles
```

Chaque champ non vérifié porte la mention « Non vérifié dans les sources officielles consultées. ».

## 5. Métadonnées d'une ressource

Pour tout fichier ajouté (sujet, corrigé, PDF de cours) : source exacte, auteur enseignant **si publié**,
année universitaire, semestre, session (Normal / Rattrapage / Remplacement — **uniquement si prouvable**),
date de publication/consultation. Préserver le nom de fichier d'origine quand il est lisible.

## 6. Git

Travailler sur une branche de travail (ex. `build/l1-si-annaba-curriculum`), jamais directement sur `main`.
Commit atomiques et explicites en français (ex. `S1/Logiciels-libres : ajout TP de rentrée 2025/2026`).
Interdits : `push --force`, `reset --hard`, réécriture d'historique, suppression de contenu existant
« pour faire propre ». Avant chaque push : `git status --short`, `git diff --check`, contrôle des liens
relatifs (`grep -r "](" --include='*.md'` sur les fichiers modifiés) et des fichiers vides.

## 7. Qualité (checklist de fin de contribution)

- [ ] Arborescence : `find . -maxdepth 3 -type d | sort` cohérente avec `INDEX.md`
- [ ] Aucun lien relatif mort ; aucun fichier vide oublié
- [ ] Encodage UTF-8 ; noms ASCII pour les dossiers
- [ ] Étiquettes OFFICIEL / ENSEIGNANT / SUPPLEMENTAIRE présentes
- [ ] Sources ajoutées au registre `resources/sources/SOURCES.md`
