# Fiche — Analyse 2 (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/01-Analyse-2/README.md).

---

## 1. Définitions à tenir
- **Intégrale de Riemann** ∫ₐᵇ f : aire signée ; linéarité, relation de Chasles, positivité (f ≥ 0 ⇒ ∫ ≥ 0),
  croissance (f ≤ g ⇒ ∫f ≤ ∫g).
- **Théorème fondamental de l'analyse** : si f continue sur I, F(x) = ∫ₐˣ f(t)dt est de classe C¹ et F′ = f ;
  ∫ₐᵇ f = G(b) − G(a) pour toute primitive G de f.
- **Intégration par parties** : ∫ u dv = uv − ∫ v du. **Changement de variable** : ∫ₐᵇ f(φ(t))φ′(t)dt = ∫_{φ(a)}^{φ(b)} f(x)dx.
- **Équation différentielle linéaire 1ᵉʳ ordre** : y′ + a(x)y = b(x) ; homogène : y = C·e^{−A} (A primitive de a) ;
  générale = homogène + solution particulière (variation de la constante).
- **Suites numériques** : convergence, bornitude ; **monotone + bornée ⇒ convergente** ; théorème du point fixe
  (f continue sur [α,β] stable, u(n+1)=f(u(n)) ⇒ toute limite est point fixe).
- **Séries** (selon le chapitrage) : série géométrique Σqⁿ = 1/(1−q) si |q|<1 ; critère spécial des séries
  alternées ; comparaisons ; Riemann Σ1/n^α (converge ssi α > 1).

## 2. Techniques de calcul (à dérouler sans réfléchir)
- Substitution : ∫ f(g(x))g′(x)dx = F(g(x)).
- Fraction rationnelle P/Q : décomposition en éléments simples (racines simples/doubles, binômes Δ<0).
- Parties usuelles : ∫ dx/(1+x²) = arctan x ; ∫ dx/√(1−x²) = arcsin x.
- Éq. y′ = ay + b : y = C e^{ax} − b/a (a ≠ 0) ; y′ + ω²y = 0 : y = A cos ωx + B sin ωx.
- Encadrement/estimation : |∫ₐᵇ f| ≤ (b−a)·sup|f|.

## 3. Pièges fréquents
- Oublier la constante C (ou les deux pour le 2ᵉ ordre) ; mal appliquer uv|ₐᵇ (termes aux bornes oubliés).
- Changement de variable sans changer les bornes.
- Intégrale de fonction non continue : vérifier l'hypothèse avant d'utiliser le TFA.
- Série géométrique de raison q ≥ 1 « sommée » quand même (divergence !).
- Confondre suite convergente et série convergente (lien : Σuₙ converge ⇒ uₙ → 0, la réciproque est fausse).

## 4. Exemples éclair
- ∫₀^1 x eˣ dx = [x eˣ]₀¹ − ∫₀¹ eˣ dx = e − (e − 1) = 1.
- y′ − 2y = 3 : homogène C e^{2x}, particulière −3/2 ; y = C e^{2x} − 3/2.
- u(n+1) = u(n)/2 + 1, u₀ = 0 : croissante majorée par 2 → limite ℓ = ℓ/2 + 1 ⇒ ℓ = 2.

## 5. Rappels examen
- Datas Catalogue : coef. 4 · 6 crédits · 2 CM + 1 TD (🟡 à confirmer original). Examen en fin de S2, planning
  publié par le département (page *Planning des examens*).
