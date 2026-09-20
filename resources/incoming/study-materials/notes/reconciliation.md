# Réconciliation des comptes — traitement du 2026-09-20

## Conteneurs (matière première fournie par l'utilisateur, dépôt `raw/`)
- 16 archives ZIP, total **350 550 096 octets** (334,3 Mio) — l'estimateur « 432 Mo » est **corrigé** par le mesuré.
- Intégrité : `unzip -t` + CRC python → 16/16 **OK**, 0 corrompue, 0 protégée par mot de passe.
- Chaque archive extraite dans `extracted/L1---informatique-part-NN/` ; `raw/` **intacte** (SHA-256 vérifiés avant/après, cf. notes/archive-inventory.tsv).

## Équation des comptes
| Étape | Compte |
|---|---:|
| Fichiers membres dans les 16 ZIP (somme des inventaires) | **627** |
| Conteneurs imbriqués (.zip/.rar/.7z dans les ZIP) | **0** |
| Fichiers réellement extraits sur disque (`find extracted -type f`) | **627** |
| Lignes de `notes/inventory.tsv` (16 colonnes, 100 % couverture) | **627** |
| Copies dans `organized/` (doublons conservés, rien supprimé) | **627** |

→ **627 = 627 = 627 = 627 = 627.** L'estimation « ~670 fichiers » est ramenée au chiffre prouvé **627**.

## Ventilation
- Semestres : S1 **355** · S2 **108** · UNCLASSIFIED **164** (total 627 ✓)
- Confiance : HIGH **296** · MEDIUM **116** · LOW **215** (total 627 ✓)
- Doublons : 526 nouveaux · **99 doublons exacts** (même SHA-256) · **2 doublons probables** (même contenu, hash différent) — tous conservés, aucun supprimé.
- Contenu : 104 PDF sans couche texte (scans ; **pas d'OCR** — aucun outil OCR promis ni installé), 0 archive bloquée, 0 échec d'extraction.
- Année académique : **234** avec preuve textuelle explicite (2025-2026: 67, 2024-2025: 39, 2023-2024: 29, 2019-2020: 23, 2022-2023: 22, 2021-2022: 19…) · 393 `ACADEMIC_YEAR_UNKNOWN` (dont 155 nombres 4-chiffres « nus » dans le texte **refusés** comme preuve, conformément à la règle d'âge académique strict).
- Source universitaire : 1 OFFICIAL_UBMA, 265 PUBLIC_UNIVERSITY, 361 UNKNOWN. Provenance des 627 : **TELEGRAM_USER_PROVIDED** (fichiers fournis par l'utilisateur via le dépôt ; je n'ai rien téléchargé moi-même).
- Par archive : part-01: 69 · 02: 41 · 03: 200 · 04: 34 · 05: 23 · 06: 97 · 07: 51 · 08: 29 · 09: 12 · 10: 12 · 11: 14 · 12: 12 · 13: 8 · 14: 5 · 15: 17 · 16: 3 = **627** ✓

## Anomalies documentées (non corrigées, règle d'immutabilité)
1. **2 ZIP en racine du dépôt GitHub** (`L1---informatique-part-01.zip`, `L1---informatique-part-07.zip`) : blobs **byte-identiques** à leurs jumeaux de `raw/` (sha1 git `a488e05c…`, `38cc621a…`). Doublons de dépôt — je ne supprime rien ; à purger via l'interface GitHub si vous le souhaitez.
2. Taille totale mesurée : 350,5 Mo (ZIP) vs 432 Mo annoncés ; les tailles exactes par archive sont dans `notes/archive-inventory.tsv`.
3. Le dépôt Git contient les originaux (`raw/*.zip` = source canonique). `extracted/` et `organized/` (≈ 377 Mo chacun, locaux) sont des **sorties régénérables** par `python3 process-incoming.py` ; elles ne sont pas poussées sur GitHub pour ne pas dupliquer ~334 Mo de blobs déjà inclus dans les ZIP — l'inventaire 16 colonnes référence les chemins exacts des deux côtés.
