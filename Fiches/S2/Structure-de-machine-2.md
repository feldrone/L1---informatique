# Fiche — Structure de machine 2 (S2)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S2/04-Structure-de-machine-2/README.md).

---

## 1. Périmètre (à confirmer avec le cours)
Prolongement naturel de Structure de machine 1 (le contenu officiel détaillé n'est pas vérifié dans les
sources consultées). Thèmes usuels : circuits séquentiels, bascules, registres/compteurs, mémoires,
représentation IEEE 754, code correcteur, assembleur/chemin de données — tout ce qui suit est donc une
**fiche générale d'appoint**, à recouper avec le CM.

## 2. Circuits séquentiels (repères)
- **Bascule RS** (Set/Reset) : verrou asynchrone ; états interdits R=S=1 (RS NAND).
- **Bascule D** : mémorise l'entrée sur front d'horloge ; **T** : bascule/compte ; **JK** : RS sans état
  interdit (J=K=1 → bascule).
- **Registre à décalage** : n bascules D en chaîne ; conversion série↔parallèle.
- **Compteur** : binaire (ripple, asynchrone) vs synchrone ; modulo m : décompter puis réarmer.
- Horloge : fréquence f, période T = 1/f ; montée/descente = front actif.

## 3. Mémoires & codage
- Hiérarchie : registres → cache (L1/L2/L3) → RAM → disque ; principe de localité (temporelle/spatiale).
- Capacité 2^k mots de n bits ⇒ k lignes d'adresse, n lignes de données.
- ROM/PROM/EPROM/EEPROM/Flash (repères de cours usuels).
- **Code de Hamming** : r bits de parité avec 2^r ≥ m + r + 1 ; positions des bits de contrôle = puissances de 2 ;
  syndrome = numéro de la position fautive.
- **Parité** CRC (selon cours) : division binaire par le polynôme générateur G (modulo 2).

## 4. Représentation des réels — IEEE 754 simple précision (32 bits)
- 1 bit de signe s, 8 bits d'exposant biaisé (biais 127), 23 bits de mantisse (1 implicitement).
- x = (−1)^s × 1,mantisse₂ × 2^(E−127). Exemple : −6,5 = −110,1₂ = −1,101₂ × 2² → s=1, E=129=10000001₂,
  mantisse 101…0 → **1 10000001 10100000000000000000000**.
- Noter : 0 et dénormalisés (E=0), infinis (E=255, mantisse 0), NaN (E=255, mantisse ≠ 0).

## 5. Pièges fréquents
- Confusion latch (asynchrone) / bascule sensible à l'horloge.
- Compteur « modulo 10 » qui compte 0..10 (il doit compter 0..9 : recopier le bon état de décodage).
- Hamming : placer les bits de parité aux positions 1,2,4,8 (puissances de 2) — pas aux positions utiles.
- IEEE : oublier le « 1 implicite » ; biais à soustraire et non à ajouter ; signe du nombre lui-même.
- Conversion binaire→décimal d'un flottant : regrouper la mantisse dans l'ordre des puissances décroissantes.

## 6. Rappels examen
- Coef/crédits : non vérifiés dans les sources consultées ; matière jumelle d'ASD 2 (UEF22, Catalogue).
