# Study materials — archive intégrée (L1 Informatique)

Collection d'étudiants (16 ZIP « L1---informatique-part-01…16 ») **fournie par l'utilisateur** (canal Telegram),
traitée, vérifiée et intégrée : **627 fichiers réels** → **528 copies canoniques classées** dans `organized/`,
99 doublons exacts référencés sans recopie, 0 supprimé, 0 original modifié.

## Contenu
- `raw/` — **les 16 ZIP originaux, immuables** (SHA-256 dans `notes/archive-inventory.tsv`).
- `organized/S1/<module>/<Type>/` + `organized/UNCLASSIFIED/` — copies de travail (**lot S1 UNIQUEMENT**, corrigé 2026-09-21 ; `organized/S2/` n'existe pas : le lot S2 sera uploadé plus tard), prêtes à parcourir sur GitHub (Cours, TD, TP, Series, Examens, Corriges, Revisions, Supports, Autres) + `organized/UNCLASSIFIED/`.
- `extracted/` — extraction brute locale (hors git, régénérable via `python3 process-incoming.py`).
- `notes/` — registres : `inventory.tsv` (maître, 19 colonnes × 627), `archive-inventory.tsv`, `module-map.md`, `study-index.md`, `material-coverage.md`, `reconciliation.md`, sauvegardes d'états antérieurs.
- `AI-STUDY-GUIDE.md` — protocole complet pour agents IA. `PROCESSING.md` — contrat de traitement.
- Scripts reproductibles : `process-incoming.py` (ZIP → inventaire), `integrate-phase2.py` (inventaire → integrated tree + liens/paires).

## Garanties
Chaque pièce porte : SHA-256 réel, format par signature binaire, type & module déterminés par CONTENU (le nom de fichier n'est que secondaire), confiance HIGH/MEDIUM/LOW, année uniquement si écrite dans le document, provenance `TELEGRAM_USER_PROVIDED` (le dépôt ne contient AUCUN téléchargement fait par l'agent). Les non-preuves sont `UNKNOWN`/`UNCLASSIFIED` — jamais devinées.

## Pour étudier
Racine du dépôt : **`STUDY-HUB.md`** (par module : ce qui existe, où, quelles années). Cursus officiel (non modifié) : `S1/`, `S2/`, `resources/PROGRAMME.md`.
