# ASD 1 — Fondamentaux : correction pédagogique

> **Correction pédagogique — non officielle.** Éléments de réponse produits pour l'auto-évaluation.
> Le barème, la notation et le pseudo-code officiels sont ceux du responsable de matière à l'UBMA.
> Sujet : [`../../../Exercices/S1/Algorithmique-1/fondamentaux.md`](../../../Exercices/S1/Algorithmique-1/fondamentaux.md).

## A2 — Trace de `x`
`7 → 10 → 5 → 25` (DIV entière : 10 DIV 2 = 5).

## A3 — Quotient / reste
```
ALGORITHME QuoReste
VAR a, b : entier
DEBUT
  LIRE(a) ; LIRE(b)
  ECRIRE(a DIV b)   // quotient entier
  ECRIRE(a MOD b)   // reste
FIN
```
Précaution : `b ≠ 0` (sinon erreur) — à tester si l'énoncé ne le garantit pas.

## C6 — Max de trois
```
max ← a
SI b > max ALORS max ← b FINSI
SI c > max ALORS max ← c FINSI
ECRIRE(max)
```

## C9 — Bissextilité
```
SI (a MOD 4 = 0 ET a MOD 100 <> 0) OU (a MOD 400 = 0) ALORS ECRIRE("bissextile")
SINON ECRIRE("non bissextile")
FINSI
```
Ordre d'évaluation : parenthéser chaque groupe (`ET` avant `OU` dans la plupart des conventions de cours).

## D10 — Table de `k`
```
POUR i DE 1 A 10 FAIRE ECRIRE(k, " x ", i, " = ", k*i) FINPOUR
// TANT QUE : i ← 1 ; TANT QUE i <= 10 FAIRE ... ; i ← i+1 FINTANTQUE
```

## D12 — PGCD d'Euclide
```
TANT QUE b <> 0 FAIRE
  r ← a MOD b ; a ← b ; b ← r
FINTANTQUE
ECRIRE(a)
```

## E15 — Moyenne / min / max d'un tableau
```
somme ← 0 ; min ← T[1] ; max ← T[1]
POUR i DE 1 A n FAIRE
  somme ← somme + T[i]
  SI T[i] < min ALORS min ← T[i] FINSI
  SI T[i] > max ALORS max ← T[i] FINSI
FINPOUR
ECRIRE(somme / n) ; ECRIRE(min) ; ECRIRE(max)
```
Erreur fréquente : initialiser `min` à `0` (faux si toutes les valeurs > 0 — on initialise à `T[1]`).

## E17 — Inversion en place
```
POUR i DE 1 A n DIV 2 FAIRE
  aux ← T[i] ; T[i] ← T[n-i+1] ; T[n-i+1] ← aux
FINPOUR
```

## F20 — Tri par sélection (esquisse)
```
POUR i DE 1 A n-1 FAIRE
  imin ← i
  POUR j DE i+1 A n FAIRE
    SI T[j] < T[imin] ALORS imin ← j FINSI
  FINPOUR
  échanger T[i] et T[imin]
FINPOUR
```

## F21 — Recherche dichotomique (esquisse)
```
g ← 1 ; d ← n
TANT QUE g <= d FAIRE
  m ← (g + d) DIV 2
  SI T[m] = v ALORS renvoyer m FINSI
  SI T[m] < v ALORS g ← m + 1 SINON d ← m - 1 FINSI
FINTANTQUE
renvoyer -1
```

## G23 — Coûts attendus
Ex. 14 (crible naïf) : O(N√N) ≈ quadratique-ish selon le test utilisé ; ex. 20 : O(n²) ;
ex. 21 : O(log n). (Estimations de cours, sans preuve formelle.)
