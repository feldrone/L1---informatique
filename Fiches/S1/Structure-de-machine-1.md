# Fiche — Structure de machine 1 (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/04-Structure-de-machine-1/README.md).

---

## 1. Définitions à tenir
- **Base b** : N = Σ aᵢ·bⁱ avec 0 ≤ aᵢ < b. Conversion décimale → b : divisions euclidiennes successives
  (écrire les restes à l'envers) ; b → décimal : méthode de Horner ; partie fractionnaire : multiplications
  successives par b.
- **Entiers signés en complément à 2 sur n bits** : plage [−2^(n−1) , 2^(n−1) − 1] ; négatif : ¬x + 1.
- **ASCII** : caractères sur 7 bits (extensions 8 bits) ; ne pas confondre le caractère et son code binaire.
- **Flottants (selon cours)** : signe, exposant, mantisse ; normalisation ; IEEE 754 simple précision = 32 bits.
- **Algèbre de Boole** : variables 0/1 ; ET (·), OU (+), NON (overline) ; dualité ; axiomes de base :
  x+0 = x ; x·1 = x ; x+x̄ = 1 ; x·x̄ = 0 ; absorption ; De Morgan : overline(x·y) = x̄ + ȳ.
- **Portes logiques** : AND, OR, NOT, NAND, NOR, XOR, XNOR ; NAND et NOR sont fonctionnellement complètes.
- **Fonction booléenne** : table de vérité ; forme canonique Σm (somme de mintermes, f = 1) et ΠM
  (produit de maxtermes, f = 0).

## 2. Simplification — tableaux de Karnaugh
- Cases adjacentes = d'un seul bit ; grouper des paquets de taille 2^k, le plus grand possible, avec
  enveloppement des bords ; la variable qui change dans un groupe est éliminée.
- Exemple : f(a,b,c) = Σm(0,2,4,6) ⇒ f = b̄ (b = 0 partout).

## 3. Arithmétique binaire & opérateurs bit à bit
- Addition avec retenues en chaîne ; débordement (overflow) en complément à 2 : opérandes de même signe et
  résultat de signe contraire.
- Décalage à gauche = ×2 (attention au dépassement), à droite = ÷2 (arithmétique : propagation du signe).
- Masques : AND pour extraire, OR pour forcer à 1, XOR pour tester/comparer (x⊕x = 0).
- **Parité** : bit = XOR de tous les bits — détecte un nombre impair d'inversions.

## 4. Organisation d'une machine (repères)
- CPU = UC + ALU + registres ; mémoire (RAM volatile / ROM) ; bus (adresses, données, contrôle) ;
  mot machine = largeur du bus de données ; hiérarchie registre → cache → RAM → stockage.
- Unités : bit, octet = 8 bits, KiB = 1024 octets ; adresse = numéro d'octet ; adressage sur n bits ⇒ 2^n cases.

## 5. Pièges fréquents
- En complément à 2, le bit de poids fort EST le signe (poids −2^(n−1)) — pas un simple drapeau.
- « 8 bits signés = 255 valeurs » : FAUX, 256 valeurs (−128…127).
- Karnaugh : groupes de taille 3 interdits ; cases « don't care » utiles pour agrandir un groupe.
- XOR n'est PAS un OU : 1⊕1 = 0.
- Oublier d'aligner les retenues en écriture manuscrite (erreur n°1 des copies).

## 6. Exemple éclair
- −13 sur 8 bits : 13 = 00001101 → ¬ = 11110010 → +1 → **11110011**.
- (11110011) + (00000111) = 1 00000010 → sur 8 bits : 00000010 = +2 ✓ (report du bit de signe ignoré, pas
  d'overflow : opérandes de signes contraires).
- f = majorité(a,b,c) = Σm(3,5,6,7) = ab + ac + bc.

## 7. Rappels examen
- Coef/crédits : non vérifiés dans les sources consultées (Catalogue) ; voir la fiche du module.
