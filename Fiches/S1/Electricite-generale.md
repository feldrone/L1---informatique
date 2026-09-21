# Fiche — Électricité générale (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/06-Electricite-generale/README.md).

---

## 1. Grandeurs & unités (SI)
- Tension U (V) — courant I (A) — résistance R (Ω) — charge Q (C) — puissance P (W) — énergie E (J ; 1 W·h = 3600 J)
  — capacité C (F) — inductance L (H) — fréquence f (Hz), période T = 1/f, ω = 2πf.
- Sens conventionnel du courant : du + vers le − à l'extérieur du générateur.
- Récepteur (consume) vs générateur (fournit) ; conventions récepteur pour R, L, C.

## 2. Lois fondamentales
- **Ohm** : U = R·I. **Puissance** : P = U·I = R·I² = U²/R. Charge : Q = I·t.
- **Série** : même courant, R_eq = ΣRᵢ (tension partagée proportionnellement aux R).
  **Dérivation (parallèle)** : même tension, 1/R_eq = Σ1/Rᵢ ; conductance G = 1/R s'ajoute en parallèle.
- **Pont diviseur** (à vide) : U₂ = E·R₂/(R₁+R₂) ; **pont diviseur de courant** pour deux dérivations.
- **Kirchhoff** : nœud → somme algébrique des courants = 0 ; maille → somme des tensions = 0.
- **Condensateur** : i = C·du/dt ; q = C·u ; E = ½Cu² ; u ne peut pas varier brusquement.
- **Bobine** : u = L·di/dt ; E = ½Li² ; i ne peut pas varier brusquement.

## 3. Régimes transitoires RC / RL
- RC (charge) : u_C(t) = E(1 − e^(−t/τ)), **τ = RC** ; décharge : u_C(t) = E·e^(−t/τ). Établi ≈ 5τ.
- RL : i(t) = (E/R)(1 − e^(−t/τ)), **τ = L/R**.
- Méthode : valeur initiale (continuité u_C, i_L) + valeur finale (C → circuit ouvert, L → court-circuit en DC)
  + τ → expression complète u(t) = u(∞) + [u(0) − u(∞)]e^(−t/τ).

## 4. Régime sinusoïdal (repères)
- u(t) = U₀·sin(ωt + φ) ; valeur efficace U_eff = U₀/√2 (idem courant) ; puissance moyenne P = U_eff·I_eff·cos φ.
- Déphasages : bobine pure → I en retard de π/2 sur U ; condensateur pur → I en avance de π/2.
- Résonance série RLC : ω₀ = 1/√(LC) ; à la résonance I max et circuit purement résistif.

## 5. Pièges fréquents
- Confondre puissance (W) et énergie (Wh) ; P = U²/R avec U crête au lieu de U_eff (facteur 2 d'erreur).
- Pont diviseur en charge : la résistance de charge se met en parallèle avec R₂ (méthode de Thévenin pour corriger).
- « u(0⁺) = 0 » sans justification : c'est la continuité de u_C (état déchargé avant t = 0).
- Signes de Kirchhoff : se fixer une convention (entrants + par exemple) et la garder partout.
- Associer condensateur = court-circuit en DC : c'est l'inverse (circuit ouvert en régime établi).

## 6. Exemple éclair
- E = 10 V ; R₁ = 2 kΩ en série avec (R₂ = 3 kΩ ∥ R₃ = 6 kΩ = 2 kΩ) → I = 10/4 kΩ = 2,5 mA ; U aux bornes du
  groupe parallèle = 5 V ; courant dans R₂ = 5/3 kΩ ≈ 1,67 mA.
- RC : E = 5 V, R = 10 kΩ, C = 100 µF ⇒ τ = 1 s ; à t = 1 s : u_C = 5(1 − e⁻¹) ≈ 3,16 V.

## 7. Rappels examen
- Organisation vérifiée (2025/2026) : CM en amphi (groupes A/B), TD dès le 25/10/2025, cours supplémentaires
  en novembre (annonces du département) — matière bien du **S1**. Coef/crédits : non vérifiés.
