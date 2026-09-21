# Fiche — Analyse 1 (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/01-Analyse-1/README.md).

---

## 1. Définitions à tenir
- **Majorée / minorée / bornée** : un ensemble E est borné s'il est majoré **et** minoré.
- **Borne supérieure** sup E : plus petit majorant de E ; borne inférieure inf E : plus grand minorant.
  Axiome de complétude de ℝ : toute partie non vide majorée admet une borne supérieure dans ℝ.
- **Suite monotone** : croissante (u(n+1) ≥ u(n)) ou décroissante ; **suites adjacentes** : croissante,
  décroissante, écart → 0 ⇒ convergence vers la même limite.
- **Continuité en a** : lim(x→a) f(x) = f(a) ; continue sur I si continue en tout point de I
  (image d'un intervalle par f continue sur I = intervalle).
- **Dérivée en a** : f'(a) = lim h→0 [f(a+h) − f(a)]/h si elle existe.

## 2. Formules / limites usuelles
- lim x→0 sin x / x = 1 ; lim x→0 (eˣ − 1)/x = 1 ; lim x→+∞ ln x / x = 0 ; lim x→+∞ xⁿ e⁻ˣ = 0
  (croissances comparées) ; (1 + x/n)ⁿ → eˣ.
- Équivalents usuels en 0 : sin x ~ x ; 1 − cos x ~ x²/2 ; ln(1+x) ~ x ; eˣ − 1 ~ x ; (1+x)^α − 1 ~ αx.
- Primitives : ∫xⁿ dx = xⁿ⁺¹/(n+1) (n ≠ −1) ; ∫eˣ dx = eˣ ; ∫1/x dx = ln|x| ; ∫cos x dx = sin x ;
  ∫sin x dx = −cos x.
- **TVI** : f continue sur [a,b], f(a)·f(b) < 0 ⇒ ∃ c ∈ ]a,b[, f(c) = 0 (unicité si f strictement monotone).
- **Bijection** : f continue et strictement monotone sur I ⇒ bijection de I sur f(I) ; réciproque continue,
  même sens de variation ; (f⁻¹)'(y) = 1/f'(f⁻¹(y)).

## 3. Méthodes types
- Suites récurrentes u(n+1) = f(u(n)) : montrer la stabilité d'un intervalle [α,β], monotonie via f′, puis
  limite = point fixe de f (après avoir prouvé la convergence).
- Fonctions par morceaux : continuité en a via limites à gauche/à droite.
- Formes indéterminées : factoriser par le terme dominant ou utiliser les DL usuels.

## 4. Pièges fréquents
- Confondre majorant et borne supérieure ; « toute suite croissante converge » est FAUX (il faut aussi majorée).
- Supposer la limite pour prouver la convergence (cercle vicieux) — d'abord monotonie + bornitude.
- Dériver une composée sans chaîne : (f∘g)′ = g′ · (f′∘g).
- Oublier le domaine : ln(x²) = 2 ln|x|, pas 2 ln x sur ℝ\{0}.
- Écrire « f admet une dérivée » sans vérifier la limite du taux d'accroissement aux bornes.

## 5. Exemples éclair
- u(0) = 1, u(n+1) = √(u(n) + 2) : croissante, majorée par 2 ⇒ converge ; ℓ = √(ℓ+2) ⇒ ℓ = 2.
- lim x→0 (1 − cos x)/x² = 1/2 (équivalent).
- f(x) = x + ln x sur ]0,+∞[ : strictement croissante, bijectivité sur ℝ ; (f⁻¹)′(y) = 1/(1 + 1/x) au point x = f⁻¹(y).

## 6. Rappels examen (module vérifié ; barème non vérifié)
- Datas Catalogue : coef. 4 · 6 crédits · 2 CM + 2 TD (🟡 à confirmer sur le document original).
- Examen en fin de S1 (janvier) — planning officiel : page *Planning des examens* du département.
