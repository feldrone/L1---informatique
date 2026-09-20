# Fiche — Logique mathématique (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/05-Logique-mathematique/README.md).

---

## 1. Calcul propositionnel
- Connecteurs : ¬ (NON), ∧, ∨, ⇒ (implication), ⇔ (équivalence) ; précédence usuelle : ¬, ∧, ∨, ⇒, ⇔ — parenthéser.
- **Tautologie** (vraie toujours) ; **contradiction** ; **satisfaisabilité**.
- Équivalences à connaître : De Morgan ¬(A∧B) ≡ ¬A∨¬B ; A⇒B ≡ ¬A∨B ≡ ¬B⇒¬A (contraposée) ;
  distributivité ∧/∨ ; double négation ; absorption.
- **Formes normales** : CNF (conjonction de clauses = disjonctions de littéraux), DNF/DCF. Méthode : table de
  vérité → mintermes (DNF) ou clauses des lignes 0 (CNF).
- Tables de vérité : n variables ⇒ 2ⁿ lignes — compter avec soin (impair = erreurs).

## 2. Calcul des prédicats
- Prédicat P(x) sur un domaine E ; quantificateurs ∀, ∃ ; **négation** : ¬(∀x P(x)) ≡ ∃x ¬P(x) ;
  ¬(∃x P(x)) ≡ ∀x ¬P(x).
- Portée d'un quantificateur ; variables libres/liées ; traduire : « tout entier a un prédécesseur » =
  ∀a ∃b (b + 1 = a) — attention au domaine (ℕ : FAUX pour 0 ; ℤ : VRAI).
- Ordre des quantificateurs : ∀x∃y ≠ ∃y∀x (classique : x femme → mère ; inverse : une seule mère pour toutes).

## 3. Méthodes de démonstration (le cœur du module)
- **Directe** : supposer l'hypothèse, enchaîner des implications connues.
- **Contraposée** : prouver ¬Q ⇒ ¬P.
- **Par l'absurde** : supposer ¬Q, aboutir à une contradiction (classique : irrationalité de √2, infinitude des premiers).
- **Récurrence** : initialisation + hérédité (P(n) ⇒ P(n+1)) ; forte : « P(k) pour tout k ≤ n » ; structure
  l'énoncé comme ∀n ∈ ℕ, P(n).
- **Analyse-synthèse** (remonter de la conclusion) autorisée si chaque étape est équivalente.

## 4. Preuves de cours types à savoir refaire
- Irrationalité de √2 (absurde : a/b premier entre eux, 2b² = a² ⇒ a pair ⇒ b pair, contradiction).
- Somme 1+…+n = n(n+1)/2 (récurrence).
- Infinité des premiers d'Euclide (absurde/récurrence : N = p₁…p_k + 1 possède un premier diviseur nouveau).
- |x| ≤ ε ⇒ x = 0 (absurde : si x ≠ 0, ε = |x|/2 donne |x| ≤ |x|/2).

## 5. Pièges fréquents
- Nier un ∀∃ sans retourner l'ordre des quantificateurs ; oublier un quantificateur implicite.
- Confondre « implication » et « équivalence » (le converse n'est PAS vrai : A⇒B mais B⇒A ? contre-exemple !).
- Écrire P(n+1) « qui découle de » P(n) sans démontrer (récurrence incomplète = 0).
- Contradiction mal nommée : arriver à P ∧ ¬P, pas juste à « ça me semble faux ».
- Table de vérité de A ⇒ B : FAUSSE seulement quand A vrai, B faux.

## 6. Rappels examen
- Coef/crédits : non vérifiés dans les sources consultées ; le module (UEM21 du S2, Catalogue — variante
  courante ; ⚠️ variante « ancien » : S3) — vérifier la répartition sur l'emploi du temps de l'année.
