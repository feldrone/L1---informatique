# Examens — archives L1 SI (UBMA)

## Règles d'archivage (obligatoires)

- **Préserver le nom de fichier d'origine** (canevas officiel du département : on renomme uniquement s'il est
  illisible, et l'original est noté dans le README du dossier).
- Pour chaque sujet ajouté, renseigner **uniquement ce qui est prouvable** : année universitaire, semestre,
  module, session, date, salle/amphi, source (page, enseignant, scan). **Ne jamais inventer une date ou une session.**
- Arborescence cible (créée au fur et à mesure du contenu, jamais vide) :

```
Examens/
├── S1/AAAA-AAAA/Normal/        ← sujets de la session normale du S1
│            Rattrapage/        ← session de rattrapage (le département dit « rattrapage »)
└── S2/AAAA-AAAA/Normal/
              Rattrapage/
```

- Les annonces du département mentionnent également des **« examens de remplacement »** (décalage horaire
 /conflictuel, ex. annonce du 22/01/2026) : créer une catégorie `Remplacement/` seulement lorsque des données
  précises l'exigent.
- Micro-interrogations : les consigner à part (`Micro-interrogations/`) avec l'étiquette de source.

## Sources officielles des sujets
- Planning/corrigés : pages *Planning des examens* et *Corrigés des examens* du département (voir le registre).
- Sujets affichés avec la répartition des salles (icône « List » sur le planning — annonce du 10/01/2026).

## État à ce jour
Aucun sujet d'examen archivé dans ce dépôt (2026-09-20) : le département publie plannings et corrigés via
ses pages `scolarite/`, sans dépôt public de sujets par année. Ajouter chaque fichier avec sa fiche
métadonnée (`meta.md`) dans le dossier de session correspondant.
