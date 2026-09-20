# Sélection de matériel (quelle pièce ouvrir, dans quel ordre)
1. Filtrer `notes/inventory.tsv` : module (col 5) + type (col 7) + confiance (col 11) + année (col 8).
2. Ordre de préférence : HIGH > MEDIUM ; pour réviser un chapitre précis, filtrer col 17 subtopic.
3. Écarter d'office pour l'EXPLICATION : lignes content_status=PDF_NO_TEXT_LAYER (scans : lisibles par l'humain, pas par l'agent sans OCR) et images OTHER sans texte.
4. Années : préférer 2023-2024 → 2025-2026 pour la conformité au programme courant ; une pièce 2007-2015 reste utilisable en l'étiquetant « annale ancienne ».
5. Université : source (col 9) = institution CITÉE dans le document. Une annale de Jijel/Tlemcen reste un bon entraînement mais ne s'appelle jamais « sujet officiel UBMA ».
6. Doublons : si `duplicate_status=EXACT_DUPLICATE`, utiliser la copie canonique (col 19 `canonical copy:`).
7. Rien trouvé ? → dire ce qui manque (Gap mode, SKILL.md) et passer au plan de cours officiel du cursus pour structurer une réponse « non officielle ».
Requêtes utiles :
```
# tous les TD de SM1 :
awk -F'\t' 'NR>1 && $5=="S1/Structure-de-machine-1" && $7=="TD"{print $12, "("$11", " $8 ")"}' resources/incoming/study-materials/notes/inventory.tsv
# examens récents avec corrigé appareillé :
awk -F'\t' 'NR>1 && $7=="EXAM_CORRECTION"{print $12}' resources/incoming/study-materials/notes/inventory.tsv
```

## ⚠️ Périmètre du lot (2026-09-21)
Archive d'étude actuelle = **S1 uniquement**. **Archive d'étude S2 : pas encore uploadée.**
Ne jamais classer/présenter une pièce du lot comme « matériau S2 » ; contenu ambigu → `organized/UNCLASSIFIED/`.
Curriculum officiel S2 (racine `S2/`) = structure, pas du matériel uploadé.
