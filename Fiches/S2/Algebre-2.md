# Fiche — Algèbre 2 (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/02-Algebre-2/README.md).

---

## 1. Définitions à tenir
- **Espace vectoriel** E sur K : (E,+) abélien + multiplication par scalaire (axiomes) ; sous-espace vectoriel
  (non vide, stable par combinaison linéaire — critère : Vect(X) ⊂ E).
- **Combinaison linéaire / famille génératrice / libre / liée** ; **base** (génératrice + libre) ; **dimension**
  (finie) ; **rang** d'une famille.
- **Applications linéaires** u : u(λx+μy) = λu(x)+μu(y) ; **noyau** Ker u et **image** Im u sont des s.e.v. ;
  rang d'une matrice = dimension de l'image ; matrice de u dans des bases données.
- **Déterminant** : n×n ; multilineéaire alternée ; det(AB) = det A·det B ; A inversible ⇔ det A ≠ 0.
- **Systèmes linéaires** AX = B ; homogène toujours soluble (0) ; méthode du pivot de Gauss (inversibles
  ⇔ solutions uniques selon le rang).

## 2. Méthodes types
- Montrer "libre" : supposer Σλᵢxᵢ = 0 et prouver λᵢ = 0. Montrer "génératrice" : exprimer un vecteur quelconque.
- Résoudre un système : Gauss → échelonné → discussion (rang, paramètres libres).
- noyau : résoudre Ax = 0 ; image : colonnes de A → extraire une base des pivots.
- Inverse d'une matrice : Gauss-Jordan (A | I) → (I | A⁻¹) ou (1/det)·comatrice transposée (petites tailles).
- Diagonalisation (si au programme) : polynôme caractéristique, valeurs propres (racines), espaces propres ;
  base de diagonalisation ⇔ somme des dimensions des E_λ = n.

## 3. Polynômes & fractions rationnelles (rappel S1 utile)
- Décomposition en éléments simples : pôles simples → A/(X−a) ; pôles doubles → A/(X−a) + B/(X−a)² ;
  binômes irréductibles → (CX+D)/Q.

## 4. Pièges fréquents
- Oublier de vérifier que le sous-ensemble est non vide (critère s.e.v.) — et que 0 ∈ Ker u (toujours).
- « det(A+B) = det A + det B » : FAUX ; « A² = 0 ⇒ A = 0 » : FAUX (nilpotentes).
- Compter les inconnues plutôt que le rang pour la liberté d'une famille.
- Mélanger les lignes ET les colonnes dans un même Gauss (les deux ne sont pas permis dans un système).
- Confondre base et famille génératrice ; et « dim Vect » avec le nombre total de vecteurs donnés.
- Déterminant de la transposée ≠ « transposer change le signe » : det(Aᵗ) = det A.

## 5. Exemple éclair
- A = (1 2 ; 3 4) : det = 4−6 = −2 ≠ 0 → inversible ; A⁻¹ = (−2 1 ; 3/2 −1/2)… (calculer : (1/det)·(4 −2 ; −3 1)).
- Familles (1,1,0), (0,1,1), (1,2,1) : liée car v₃ = v₁+v₂.

## 6. Rappels examen
- Datas Catalogue : coef. 2 · 4 crédits · 1 CM + 1 TD (🟡). Barème/CC : non vérifié — se référer au responsible.
