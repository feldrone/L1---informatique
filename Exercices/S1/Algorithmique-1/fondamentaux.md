# ASD 1 — Fondamentaux (suite 1/1)

> **SUPPLEMENTAIRE — NON OFFICIEL** — exercices d'entraînement en pseudo-code, niveau L1 SI.
> Aucune correspondance avec un sujet d'examen UBMA n'est revendiquée.

**Notation de travail** (à adapter au pseudo-code du responsable de matière) :
`ALGORITHME nom()` · `VAR x : entier` · `LIRE(x)` / `ECRIRE(x)` · `SI cond ALORS ... SINON ... FINSI` ·
`POUR i de a à b PAS 1 FAIRE ... FINPOUR` · `TANT QUE cond FAIRE ... FINTANTQUE` · `tableau T[1..n] de réels`.

## A. Variables, types, expressions
1. Déclarer les variables nécessaires pour stocker : un nom d'étudiant, sa note (réelle), l'âge (entier),
   la mention absente/présente (booléen). Donner le type de chacune.
2. Que vaut `x` après : `x ← 7 ; x ← x + 3 ; x ← x DIV 2 ; x ← x * x` (DIV = division entière) ?
3. Écrire un algorithme qui lit deux entiers `a` et `b` (avec `b ≠ 0` garanti) et affiche le quotient entier
   et le reste.

## B. Entrées / sorties
4. Algorithme `PRESENTATION` : demande prénom, nom, groupe ; affiche « Prénom NOM — Groupe G ».
5. Conversion celsius → fahrenheit : `F = C × 9/5 + 32`. Contrôler la priorité des opérateurs.

## C. Conditions
6. Lire trois notes, afficher la plus grande.
7. Lire un entier, afficher « pair » ou « impair » (opérateur `MOD`).
8. Saisie d'une note `n` : la valider (`0 ≤ n ≤ 20`), sinon afficher « note invalide » et redemander.
9. Année `a` : bissextile si `(a MOD 4 = 0 ET a MOD 100 ≠ 0) OU (a MOD 400 = 0)`.

## D. Boucles
10. Afficher la table de multiplication de `k` (1 à 10) — version `POUR`, puis version `TANT QUE`.
11. Calculer `n!` pour un entier `n` lu au clavier.
12. Calculer `PGCD(a, b)` par l'algorithme d'Euclide (itératif).
13. Somme des chiffres d'un entier positif (boucle `TANT QUE n > 0`).
14. Afficher tous les nombres premiers ≤ `N` (test de primalité naïf).

## E. Tableaux
15. Saisir `n` entiers (`n ≤ 100`) dans un tableau, afficher la moyenne, le min, le max.
16. Compter les occurrences d'une valeur `v` lue, dans un tableau.
17. Inverser un tableau **en place** (sans second tableau) et afficher.
18. Tableau 2D `M[1..3][1..4]` : calculer la somme de chaque ligne et de chaque colonne.

## F. Procédures et fonctions
19. Écrire la fonction `EstPremier(n) : booléen`, puis l'utiliser pour lister les premiers ≤ `N` (cf. ex. 14).
20. Procédure `TriSelection(T[], n)` : tri par sélection (tableau en paramètre, `PAR REFERENCE` si le
    langage du cours le distingue).
21. Fonction `RechercheDichotomique(T[], n, v) : entier` sur tableau trié ; renvoyer l'indice ou `-1`.
22. Récursivité (si vue en cours) : `Somme(T, i)` somme des `T[1..i]` ; `Puissance(x, k)`.

## G. Premières notions de coût (➕ selon filière)
23. Compter le nombre d'itérations internes des ex. 14, 20, 21 pour un tableau de taille `n` ; classer
   en O(1), O(n), O(n log n), O(n²) sans preuve formelle.

---
*Pour vérifier : [correction pédagogique](../../../Corrections/S1/Algorithmique-1/fondamentaux-correction.md)
(étiquetée non officielle).*
