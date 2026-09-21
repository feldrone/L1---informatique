# PROCESSING — pipeline de traitement du dépôt `raw/` (contrat agent)

## Workflow utilisateur (volontairement trivial)
1. Déposer TOUS les fichiers d'étude (PDF, DOCX, PPTX, ZIP, images, mélangés, non renommés) dans :
   `resources/incoming/study-materials/raw/`
2. Demander à l'agent : « traite raw/ ».

## Traitement automatique (agent), pour chaque fichier RÉEL de `raw/` absent de l'inventaire
1. **Inspecter** : taille > 0, signature binaire (via `raw-index.py` : %PDF, PK/ZIP→docx/pptx, PNG/JPEG, RAR, 7z…).
2. **Lire le contenu** : PDF/DOCX/PPTX parsés (pont texte dans cet environnement ; localement pypdf/python-docx si installable).
   Un ZIP est listé puis ses entrées traitées individuellement (extraits copiés vers `extracted/<nom-du-zip>/`).
3. **Sujet** : d'après le contenu réel (titre de cours, en-tête d'établissement, exercices) — JAMAIS le nom seul.
4. **Semestre S1/S2** : par le contenu (mention « S1/1er semestre », module de S2, etc.).
5. **Type** : Cours | TD | TP | Série | Examen | Corrigé | Résumé | Support | Other.
6. **Année académique** : uniquement si evidence interne (« 2020/2021 » dans l'en-tête, date d'épreuve) ; sinon `ACADEMIC_YEAR_UNKNOWN`.
7. **Université/source** : en-tête du document ; sinon source du dépôt (Telegram msg-id si connu, email, etc.) ; sinon `UNKNOWN`.
8. **SHA-256** : calculé localement, indépendant (jamais copié d'une source externe).
9. **Doublons exacts** : même sha256 → `duplicate_of:<fichier>` ; l'original du dépôt win, le doublon est signalé (non supprimé de raw/).
10. **Doublons probables de contenu** : même taille ou titres/textes quasi identiques sous noms différents → `likely_duplicate_of:<fichier>` + justification (hachage de texte normalisé si besoin).
11. **Confiance** : `high` (contenu explicite) / `medium` (indices concordants) / `low`.
12. **Incertitude** : confiance ≠ high OU module non établi ⇒ copie uniquement vers `organized/UNCLASSIFIED/`,
    avec `note` expliquant pourquoi. Jamais de devinette.

## Invariants
- `raw/` = **zone immuable** : jamais de modification, renommage, suppression des originaux.
- `organized/` = **copies** triées ; le curriculum réel (`/S1`, `/S2` à la racine) n'est JAMAIS touché
  sans autorisation séparée (§7 de la mission).
- Hachages fournis par des tiers (ex. empreintes Telegram) = références à COMPARER, jamais des données à recopier comme vérifiées.
- Provenance : `OFFICIAL_UBMA | PUBLIC_UNIVERSITY | PUBLIC_MIRROR | TELEGRAM_METADATA_ONLY | ACCESS_RESTRICTED | UNKNOWN`.
- Aucun fichier n'est déclaré « obtenu » sans octets réellement lus ; aucune capture texte n'est présentée comme l'original.

## Artefacts mis à jour à chaque traitement
- `inventory.tsv` (1 ligne par fichier ; colonnes figées en en-tête)
- éventuels ajouts dans `MANIFEST.md` / `notes/` (journal)
- commit + push sur la branche autorisée du moment (jamais de force push)
