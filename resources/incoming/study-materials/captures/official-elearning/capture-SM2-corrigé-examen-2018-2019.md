# CAPTURE TEXTE — Corrigé Examen Structure Machine 2 — 30 Juin 2019 (UBMA, officiel)
<!-- CAPTURE TEXTE (pont Jina, 4 pages) — n'est PAS le PDF original. -->
- SOURCE: https://elearning-deprecated.univ-annaba.dz/mod/resource/view.php?id=27678
- ACADEMIC YEAR: 2018-2019 — TYPE: CORRIGÉ D'EXAMEN — MODULE: Structure Machine 2 (S2)
- ORIGINAL TITLE: Corrigé Examen Année 2018-2019.pdf — PROVENANCE: OFFICIAL_UBMA — OBTAINED: texte intégral

---
**Corrigé Exercice 2 :** Un demi-additionneur a 2 sorties : S = A⊕B et R = A·B.
- DA1 : R1 = A1·B1 (0.5) ; S1 = A1⊕B1 (0.5)
- DA2 : R'1 = S1·R0 = (A1⊕B1)·R0 (0.5) ; S2 = S1⊕R0 = A1⊕B1⊕R0 (0.5)
- R2 = R1 + R'1 = A1·B1 + R0·(A1⊕B1) (0.5)
- Logigramme : (2 pts)
- **Circuit = ADDITIONNEUR COMPLET** (S2 = somme, R2 = retenue). (0.5)

**Corrigé Exercice 3 (MUX 4:1, select = C,D) :** faire apparaître CD, C D̄, C̄D, C̄D̄ :
H = AB·CD + (D+D̄)·BCF + C D̄E + (C+C̄)(D+D̄)·FE̅ (développement, 0.5 par étape)
→ H = CD(AB + BF + FE̅) + CD̄(BF + E + FE̅) + C̄D·FE̅ + C̄D̄·FE̅
Câblage des entrées du MUX : I0=FE̅, I1=FE̅, I2=BF+E+FE̅, I3=AB+BF+FE̅ ; sortie H.

**Corrigé Exercice 4 (bascule RS) :** table complète :
| R | S | Qn | Qn+1 | Q̄n+1 | Mode |
| 0 | 0 | 0 | 0 | 1 | Mémorisation état précédent |
| 0 | 0 | 1 | 1 | 0 | Mémorisation état précédent |
| 0 | 1 | 0 | 1 | 0 | Mise à 1 (Marche) |
| 0 | 1 | 1 | 1 | 0 | Maintien à 1 |
| 1 | 0 | 0 | 0 | 1 | Remise à 0 (Arrêt) |
| 1 | 0 | 1 | 0 | 1 | Maintien à 0 |
| 1 | 1 | 0 | – | – | Interdit (incohérence) |
| 1 | 1 | 1 | – | – | Interdit (incohérence) |
(0.5 pt × 8 lignes)
NB : l'Exercice 1 (formes canoniques) est énoncé dans le corrigé ; le détail de résolution se lit sur le PDF original (4 p.).
