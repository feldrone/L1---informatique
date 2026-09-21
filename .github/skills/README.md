# Catalogue de skills d'ingénierie agent (15)

Bibliothèque locale de 15 skills généraux d'ingénierie agent, importés de dépôts open source
vérifiés un par un (jamais de dépôt installé à l'aveugle). Sélection par score sur barème maison
(≥ 90/100, sauf indication), audit sécurité du contenu, et licence vérifiée pour **chaque** fichier
copié. Provenance complète : [SOURCES.md](SOURCES.md). Validation : `node .github/skills/validate-skills.mjs`.

## Table des skills

| # | Skill | Source | Purpose | Score | License |
|---|-------|--------|---------|-------|---------|
| 1 | `verification-before-completion` | obra/superpowers | Preuve avant toute affirmation de « terminé » : re-vérifier contre les critères, jamais claims sans evidence | 95 | MIT |
| 2 | `writing-plans` | obra/superpowers | Écrire des plans d'exécution : contexte, décisions, étapes vérifiables, critères de fin | 93 | MIT |
| 3 | `systematic-debugging` | obra/superpowers | Débogage systématique : hypothèses, reproduction, réduction, cause racine — pas de fix au pif | 93 | MIT |
| 4 | `discernment-nudge` | anthropics/skills | Après une réponse substantielle : 2–3 questions de discernement (vérifier faits, sonder le raisonnement, contexte manquant) — anti-face-value | 92 | Apache-2.0 |
| 5 | `test-driven-development` | obra/superpowers | Boucle rouge-vert-refactor + `writing-good-tests.md` (tests qui attrapent de vrais bugs) | 92 | MIT |
| 6 | `requesting-code-review` | obra/superpowers | Demander un review efficace : périmètre, package de review, questions précises (+ `code-reviewer.md`) | 91 | MIT |
| 7 | `security-threat-model` | openai/skills | Threat model d'une app/feature : assets, contrôles, surfaces d'attaque, à partir de prompts structurés | 91 | Apache-2.0 |
| 8 | `brainstorming` | obra/superpowers | Cadrer l'espace des solutions avant d'écrire un plan : questions, options, trade-offs | 90 | MIT |
| 9 | `executing-plans` | obra/superpowers | Exécuter un plan par tâches avec ledger de progrès, BASE commit par tâche, gates de tests (scripts bundlés) | 90 | MIT |
| 10 | `using-git-worktrees` | obra/superpowers | Worktrees git pour isoler le travail par branche/tâche sans casser le checkout courant | 90 | MIT |
| 11 | `finishing-a-development-branch` | obra/superpowers | Finir une branche : QC final, options merge/PR/nettoyage, aucune perte de travail | 90 | MIT |
| 12 | `subagent-driven-development` | obra/superpowers | Orchestration d'implémenteurs sous-agents par tâche, avec reviews et prompts bundlés (scripts audités) | 90 | MIT |
| 13 | `writing-skills` | obra/superpowers | Écrire/maintenir des skills au format SKILL.md ; test sur sous-agents (méta-discipline du catalogue) | 90 | MIT |
| 14 | `security-best-practices` | openai/skills | Revue sécurité par langage/framework (10 références bundled : python JS go, flask/django/fastapi/express/next/react/vue…) | 90 | Apache-2.0 |
| 15 | `receiving-code-review` | obra/superpowers | Recevoir un review sans complaisance ni ego : vérifier avant d'appliquer, contester avec données | 89 | MIT |

Le #15 est le meilleur candidat restant au-dessus du lot mais sous la barre de 90 — consigné
honnêtement plutôt que rempli par du filler.

## Pourquoi ceux-là (et pas d'autres)

- **Utilité directe pour ce dépôt** : le repo est un hub markdown de matières (curriculum + archive
  de 627 fichiers) maintenu par sessions-agent successives avec exigences de preuve, de non-invention
  et de git-safe. `verification-before-completion`, `executing-plans` (ledger + BASE par tâche) et
  `discernment-nudge` recoupent exactement ce contrat. Les skills git (worktrees, finishing) cadrent
  le protocole de branches déjà pratiqué ici (branches dédiées, jamais de force-push).
- **Couverture des catégories visées** : planification/brainstorming (2,8,9), discipline d'implémentation
  (5,9,12), revue (6,15), tests (5), debug (3), sécurité (7,14), docs/qualité d'écriture (13), release
  (11), orchestration (12, 13), git safe (10, 11), recherche/vérification de sources (4, 1).
  Catégories non couvertes **volontairement** : reconnaissance de repo (aucun skill open source trouvé
  ≥90, et le dépôt est déjà entièrement cartographié), frontend/K (le repo n'a pas de code UI ; les
  candidats vercel-labs étaient des stubs orientés fetch distant — rejetés au score 76), backend/API
  runtime (idem), deps/lockfile (repo sans paquets ; la discipline deps est couverte de fait par
  `verification-before-completion` + audit licence de ce catalogue).
- **Non-doublons** : un seul skill de demande de review (#6) + son complément comportemental (#15,
  côté réception) — pas de troisième variante ; un seul meta-skill d'écriture de skills (#13).

## Compatibilité format

- Un répertoire par skill, minuscules-kebab-case, contenant `SKILL.md` avec frontmatter YAML
  `name` + `description` (certains `name` sont entre guillemets côté openai — conforme au format).
- Fichiers compagnons uniquement quand le SKILL.md les référence réellement : prompts markdown,
  `references/` (docs texte), `scripts/` (helpers bash **lus et audités** : locaux, sans réseau,
  sans eval de données externes ; ex. `review-package` refuse tout range non-ancestor).
- `LICENSE.txt` dans chaque répertoire = texte de licence de l'upstream concerné (MIT racine
  superpowers ; LICENSE.txt par skill openai/anthropics — Apache-2.0).
- Adaptations locales : une seule (liens `../using-superpowers/references/…` réécrits dans
  `writing-skills/SKILL.md`, marquée en fin de fichier par `LOCAL ADAPTATION`) — détail dans SOURCES.md.
- Validateur : `node .github/skills/validate-skills.mjs` (exit 0/1, sans dépendances).

## Skill de domaine préservé

`l1-study` (compagnon d'étude L1 Informatique — Université des Antilles) est **exclu de ce quota de 15**
et n'a été **ni touché, ni déplacé, ni supprimé** par cette importation. Le validateur vérifie qu'il
reste intact et le compte à part.

## Audit sécurité résumé (chaque fichier copié a été lu)

- Aucun skill ne demande de credentials, n'envoie de données en réseau (hors `WebFetch` explicite du
  candidat vercel **rejeté**), n'embarque de binaire ou de payload encodé.
- Motifs risqués grepés (`curl|sh`, `base64 -d`, `eval(`, `.env`, `sudo`, `rm -rf`, `api[_-]?key`) :
  une seule occurrence, saine — `rm -rf <workspace>` limité au workspace transitoire du skill #12,
  auto-ignoré par son propre `.gitignore` (`.superpowers/sdd/`).
- Scripts bundlés : relus intégralement (5 scripts bash) — validations d'entrées, chemins relatifs au
  dépôt, aucun exec de contenu distant.
