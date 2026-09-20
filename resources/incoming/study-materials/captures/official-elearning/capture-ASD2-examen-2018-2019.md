# CAPTURE TEXTE — Examen ASD2 (EMD) Juin 2019 — UBMA OFFICIELLE
<!-- CAPTURE: ce fichier est une extraction TEXTE du PDF, pas le binaire original. -->
<!-- Ne jamais le renommer en .pdf ni le présenter comme l'original. -->

- SOURCE: https://elearning-deprecated.univ-annaba.dz/pluginfile.php/60296/mod_resource/content/1/Examen%202018-2019.pdf
- UNIVERSITY: Université Badji Mokhtar — Annaba (UBMA), Département M.I (Maths & Informatique)
- ACADEMIC YEAR: 2018-2019 (examen EMD, juin 2019 ; fichier publié sur Moodle le 2020-05-03)
- MODULE: Algorithmique et Structures de Données 2 (S2)
- TYPE: EXAMEN (énoncé seul, sans corrigé)
- ORIGINAL TITLE: Examen 2018-2019.pdf
- PROVENANCE LABEL: OFFICIAL_UBMA
- PAGES: 1 — OBTAINED: texte intégral via pont Jina (2026-09-20)

---

Département M.I — Algorithmique et structures de données — Juin 2019 — (18-19)

**Algorithmique et structures de données 2 — E.M.D (durée 1h30)**

Soit une séquence de nombres entiers positifs classés dans l'ordre croissant (du plus
petit au plus grand). La séquence se termine par 999 et en aucun cas ne dépassant 100 valeurs.

En utilisant ces déclarations :

```c
typedef struct cellule
{ int val ;
  struct cellule *suiv ;
} typecellule ;
typecellule *tete = NULL ;
int T[100] ;
```

Ecrire en C les sous-programmes suivants :

a) Test si un nombre est premier ou non. (4 pts)
b) Sauvegarde des nombres impairs de la séquence dans T. (4 pts)
c) Enregistrement de ce tableau T dans un fichier binaire nommé « fichierT » sous le format
   suivant : une première valeur indiquant le nombre d'éléments du tableau puis toutes les
   valeurs du tableau. (4 pts)
d) Création d'une liste chaînée pointée par tete contenant uniquement les nombres premiers
   du fichier « fichierT ». (4 pts)
e) Affichage de cette liste chaînée dans l'ordre décroissant (du plus grand au plus petit). (4 pts)
