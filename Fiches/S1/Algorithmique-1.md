# Fiche — Algorithmique et structures de données 1 (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/03-Algorithmique-1/README.md).

---

## 1. Définitions à tenir
- **Algorithme** : suite finie et non ambiguë d'instructions résolvant un problème ; **programme** = sa
  traduction dans un langage exécutable.
- **Variable** (nom, type, portée locale/globale) vs **constante** ; types primitifs usuels : entier, réel,
  booléen, caractère, chaîne.
- **Affectation** (←) ≠ test d'**égalité** (=) ; expression évaluée selon la priorité des opérateurs.
- **Structures de contrôle** : séquence ; alternative (SI … ALORS … SINON … FINSI) ; itératives
  (POUR … FAIRE, TANT QUE … FAIRE, REPETER … JUSQU'A).
- **Tableau** T[1..n] : accès indexé en O(1) ; **procédure** (sous-programme qui exécute) vs
  **fonction** (retourne une valeur).
- Passage de paramètres : par **valeur** (copie locale) vs par **référence/variable** (le sous-programme
  modifie l'original).

## 2. Schémas à connaître par cœur
```
// somme, min, max en un parcours
s ← 0 ; min ← T[1] ; max ← T[1]
POUR i DE 2 A n FAIRE
    s ← s + T[i]
    SI T[i] < min ALORS min ← T[i] FINSI
    SI T[i] > max ALORS max ← T[i] FINSI
FINPOUR

// recherche linéaire avec drapeau OU arrêt anticipé
i ← 1 ; trouve ← FAUX
TANT QUE (i <= n) ET NON trouve FAIRE
    SI T[i] = v ALORS trouve ← VRAI SINON i ← i + 1 FINSI
FINTANTQUE

// inversion en place
POUR i DE 1 A n DIV 2 FAIRE
    aux ← T[i] ; T[i] ← T[n − i + 1] ; T[n − i + 1] ← aux
FINPOUR
```

## 3. Points-clés
- Écrire dans le pseudo-code EXACTEMENT celui du responsable de matière (mots-clés, indentation, accentuation) :
  le style est noté.
- Pré/post-condition et **invariant de boucle** (ex. tri par sélection : T[1..i−1] trié et ≤ T[i..n]).
- Tableaux 2D : double POUR (parcours ligne par ligne) ; addition de matrices mêmes tailles ; produit si (n×m)(m×p).
- Récursivité (si traitée) : cas de base + argument qui décroît — sinon pile d'appels infinie.
- Coût : compter les opérations dominantes — linéaire O(n) vs quadratique O(n²) vs dichotomie O(log n)
  (➕ introduit selon les enseignants).

## 4. Pièges fréquents (copies)
- Modifier n dans une boucle POUR bornée par n ; indices hors bornes (i = n+1 en sortie de TANT QUE de recherche).
- Confondre `←` et `=` ; oublier FINSI/FINPOUR/FINTANTQUE ; accumuler AVANT d'initialiser.
- Oublier le PAR REFERENCE quand la procédure doit modifier le tableau.
- Cas dégénérés non traités : n = 0, tableau vide, diviseur nul, saisie hors bornes.
- Comparer des réels avec `=` à cause des erreurs d'arrondi (utiliser |x − y| < eps).

## 5. Exemples éclair
- Palindrome de tableau : comparer T[i] et T[n−i+1], s'arrêter à la première différence.
- Saisie validée : `REPETER LIRE(n) JUSQU'A (n >= 1) ET (n <= 100)`.
- Compter les éléments > seuil : un compteur, un seul parcours — pas de tableau auxiliaire.

## 6. Rappels examen
- Le département pratique des micro-interrogations/contrôles continus annoncés via les ANNONCES ; les TP sur
  machine complètent le CM. Entraînement : [fondamentaux.md](../../Exercices/S1/Algorithmique-1/fondamentaux.md) (avec sa [correction pédagogique non officielle](../../Corrections/S1/Algorithmique-1/fondamentaux-correction.md)).
