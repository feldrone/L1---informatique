# Fiche — Algorithmique et structures de données 2 (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/03-Algorithmique-2/README.md).

---

## 1. Définitions à tenir
- **Enregistrement (record/struct)** : agrégat de champs hétérogènes ; accès `etudiant.note` ; tableau
  d'enregistrements ; paramètres : passer l'enregistrement entier (valeur/référence) plutôt que champ à champ.
- **Chaîne de caractères** : suite finie + délimiteur selon langage ; opérations : longueur, copie, concaténation,
  comparaison lexicographique, recherche.
- **Récursivité** : fonction qui s'appelle elle-même — cas de base + réduction ; pile d'appels ; exemples :
  factorielle, Fibonacci (naïf = exponentiel), parcours, diviser-régner.
- **Pile** (LIFO : empiler/dépiler au sommet) vs **file** (FIFO : défiler en tête) vs **liste chaînée**
  (maillons {info, suivant}) — les trois structures dynamiques usuelles du S2 (selon le chapitrage du cours).
- **Tri** : bulle O(n²), insertion O(n²) (simple, efficace sur presque trié), sélection O(n²), rapide (quick
  sort) O(n log n) en moyenne. **Recherche** : linéaire O(n), dichotomique O(log n) (tableau trié).

## 2. Schémas à connaître
```
// tri à bulles
POUR i DE 1 A n−1 FAIRE
  POUR j DE 1 A n−i FAIRE
    SI T[j] > T[j+1] ALORS échanger T[j], T[j+1] FINSI
  FINPOUR
FINPOUR

// factorielle récursive
FONCTION f(k : entier) : entier
  SI k <= 1 ALORS renvoyer 1
  SINON renvoyer k * f(k − 1)
FINSI

// insertion d'un maillon en tête de liste
nouveau.suivant ← tete ; tete ← nouveau
```

## 3. Complexité (premiers pas)
- Compter les comparaisons/échanges dominants ; classes usuelles : O(1) < O(log n) < O(n) < O(n log n) < O(n²).
- Récurrence de coût type diviser-régner : T(n) = 2T(n/2) + cn ⇒ O(n log n) (résultat admis de cours).

## 4. Pièges fréquents
- Récursion sans cas de base ou argument qui ne décroît pas (ex. f(k) = k·f(k)) → plantage par pile.
- Sur des enregistrements : modifier un champ local (passage par valeur) puis s'étonner que rien ne change.
- Dichotomie sur tableau NON trié — la recherche dichotomique suppose le tri préalable.
- Confusion pile/file : dépiler une file au mauvais bout.
- Tri « qui marche » sur un seul exemple : tester cas vides, taille 1, doublons, déjà trié, à l'envers.
- Oublier l'initialisation des compteurs avant la boucle (bug n°1 des TP notés).

## 5. Exemple éclair
- Tri par sélection : invariant « T[1..i−1] est trié et ≤ T[i..n] » → preuve rapide de correction.
- Pile : vérifier un équilibrage de parenthèses — empiler les ouvrantes, dépiler à la fermante, pile vide = OK.

## 6. Rappels examen
- Le module est vérifié (UEF22, Catalogue) — chapitrage exact et barème : non vérifiés, à confirmer avec le
  responsable. TP notés et micro-interrogations : pratiques annoncées par le département.
