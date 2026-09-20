# Fiche — Algèbre 1 (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/02-Algebre-1/README.md).

---

## 1. Définitions à tenir
- **Relation d'équivalence** sur E : réflexive, symétrique, transitive. Classe [x] = {y ∈ E : yRx} ;
  les classes forment une partition de E ; E/R = ensemble quotient ; la projection x ↦ [x] est surjective.
- **Relation d'ordre** : réflexive, antisymétrique, transitive ; parties majorées/minorées ;
  plus petit élément ≠ minorant (les deux ne coïncident que si l'ensemble est… bien ordonné — vérifier l'appartenance).
- **Groupe** (G, ⋆) : associativité + élément neutre + symétriques ; abélien si commutatif ; ordre = cardinal.
- **Anneau** (A, +, ×) : (A,+) abélien, × associative, distributivité bilatérale ; unitaire (1) ; commutatif ;
  intègre (pas de diviseurs de 0) ; corps = commutatif unitaire, tout non nul inversible.

## 2. Arithmétique dans ℤ
- Division euclidienne : b ≠ 0, ∃!(q,r) ∈ ℤ², a = bq + r, 0 ≤ r < |b|.
- Algorithme d'Euclide ; **Bezout** : ∃(u,v), au + bv = gcd(a,b) ⇒ gcd(a,b) = 1 ⇔ a ∧ b premiers entre eux ;
  **Gauss** : a | bc et gcd(a,b)=1 ⇒ a | c.
- Congruences : a ≡ b [n] ⇔ n | (a−b) ; compatibles à +, ×, puissances ; (ℤ/nℤ) anneau, corps ssi n premier.

## 3. Polynômes & nombres complexes
- K[X] intègre : deg(PQ) = deg P + deg Q ; P(a) = 0 ⇔ (X−a) | P ; décomposition en facteurs irréductibles
  sur ℝ : facteurs (X−a) et binômes X²+bX+c (Δ<0) ; multiplicité d'une racine = valuation.
- ℂ : i² = −1 ; z = x + iy = r·e^(iθ) avec r = |z| ; conjugué z̄, |z|² = z·z̄ ; arg(zz′) = arg z + arg z′ [2π] ;
  **Moivre** : (cos θ + i sin θ)ⁿ = cos nθ + i sin nθ ; racines n-ièmes de 1 : exp(2iπk/n), k = 0..n−1.

## 4. Pièges fréquents
- Sous-groupe : critère à vérifier (non vide + xy⁻¹ ∈ H) — « stable par ⋆ » ne suffit PAS.
- |z₁ + z₂| ≠ |z₁| + |z₂| en général (inégalité triangulaire seulement).
- Confondre irréductible/premier hors de l'arithmétique usuelle (dans K[X] : c'est équivalent sur un corps).
- Diviser par une quantité nulle ou un polynôme nul dans une « preuve » (division par (X−a) avec a racine multiple).
- Somme des racines = −b/a (et non +b/a) ; produit = c/a (monic quadratique).

## 5. Exemples éclair
- 2026 = 2 × 3² × 113 ; Euclide : 2026 = 15·128 + 82 ; 128 = 82 + 46 ; 82 = 46 + 36 ; 46 = 36 + 10 ;
  36 = 3·10 + 6 ; 10 = 6 + 4 ; 6 = 4 + 2 ; 4 = 2·2 ⇒ gcd = 2.
- X³ − 1 = (X−1)(X² + X + 1) ; racines = 1, e^(2iπ/3), e^(4iπ/3).
- Somme des racines cubiques de 1 = 0.

## 6. Rappels examen
- Datas Catalogue : coef. 2 · 4 crédits · 1 CM + 1 TD (🟡). Des TD supplémentaires peuvent être annoncés
  (ex. du 15/12/2025) — surveille les ANNONCES.
