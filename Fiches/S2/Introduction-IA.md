# Fiche — Introduction à l'intelligence artificielle (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/06-Introduction-IA/README.md).

---

## 0. Préambule
Module vérifié par le Catalogue (UEM21, variante courante — « 1 Cours ») ; le descriptif officiel n'a pas été
retrouvé dans les sources consultées. Cette fiche couvre le socle usuel d'une Introduction à l'IA en licence
— à recouper impérativement avec le CM du département.

## 1. Vocabulaire & repères
- **Agent intelligent** : perçoit son environnement (capteurs) et agit (actionneurs) pour maximiser une
  fonction de performance ; rationnel ≠ omniscient.
- Types d'environnements : observable/partial, déterministe/stochastique, épisodique/séquentiel, statique/dynamique,
  discret/continu, multi-agents.
- **Résolution de problèmes** : état initial, espace d'états, actions, fonction objectif/coût, solution = chemin.
  Exemples canoniques : 8-puzzle, tours de Hanoï, missionnaires-et-orphelins.

## 2. Recherche
- **Aveugle** : largeur d'abord (BFS, complet et optimal si coûts unitaires), profondeur (DFS, mémoire faible,
  optimalité non garantie), coût uniforme (optimal). Complexités : B^d (B facteur de branchement, d profondeur).
- **Heuristique** h(n) : estimation du coût restant ; **admissible** (ne surestime pas) et **cohérente**
  (inégalité triangulaire) ⇒ **A\*** est complet et optimal. h(n)=0 redonne UniCost.
- Grimpette de colline (greedy) : rapide mais minima locaux.

## 3. Représentation des connaissances & raisonnement
- Logique des prédicats (cf. Logique mathématique S2) : faits, règles (Modus Ponens), résolution (unification)
  — le socle des systèmes experts (moteur d'inférence + base de règles ; avant/arrière).
- Réseaux sémantiques / frames (selon cours) ; incertitude : facteurs de certitude (MYCIN) ou probabilités.

## 4. Apprentissage (aperçu usuel)
- Supervisé (classification/régression — train/test, erreur de généralisation), non supervisé (clustering),
  renforcement (agent, récompense) ; surapprentissage et régularisation (notions).

## 5. Pièges classiques (QCM)
- Croire A* optimal sans heuristique admissible ; dire « BFS est toujours optimal » (seulement si coûts
  unitaires / égaux).
- Confondre agent rationnel et agent parfait/omniscient.
- Confondre admissible et cohérente (cohérente ⇒ admissible, l'inverse faux).
- Mélanger Modus Ponens (A, A⇒B ⊢ B) et Affirmation du conséquant (B, A⇒B ⊬ A — faute de logique fréquente).
- Attribuer la « mémoire » d'un système expert à la recherche heuristique (rôles distincts).

## 6. Rappels examen
- Coef/crédits : non vérifiés ; évaluation : non vérifiée — vérifier via le responsable et les annonces du
  département.
