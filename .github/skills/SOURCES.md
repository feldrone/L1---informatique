# SOURCES.md — provenance des 15 skills

Tous les fichiers ont été téléchargés le **2026-09-21** depuis les commits exacts indiqués, via
`gh api repos/<repo>/contents/<path>?ref=<sha>` (base64 décodé, copie byte-exact), contrôlés puis
installés. SHA courts tels que renvoyés par l'API GitHub à cette date. `Aucune modification` =
contenu SKILL.md identique à l'upstream (vérifié par taille/hash au contrôle final du commit).

## Dépôts sources

| Repo | URL | Commit utilisé | pushed_at | Licence |
|------|-----|----------------|-----------|---------|
| obra/superpowers | https://github.com/obra/superpowers | `5bf4e7801107` | 2026-09-20 | MIT (LICENSE.txt racine, © Jesse Vincent) |
| openai/skills | https://github.com/openai/skills | `49f948faa925` | 2026-09-08 | Apache-2.0 (LICENSE.txt par skill, dépôt `skills/.curated/`) |
| anthropics/skills | https://github.com/anthropics/skills | `34040c9c5685` | 2026-09-10 | par skill (ici LICENSE.txt Apache-2.0 du skill) |
| vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills | `063bee94c3f4` | 2026-08-28 | MIT déclarée dans README uniquement — candidats rejetés, rien copié |

## Par destination (sous `.github/skills/`)

| Destination | Chemin amont | Auteur | Licence copiée | Modifications locales |
|-------------|--------------|--------|----------------|----------------------|
| `verification-before-completion/` | `skills/verification-before-completion/SKILL.md` | obra/superpowers (Jesse Vincent) | MIT → `LICENSE.txt` (depuis racine amont) | Aucune |
| `writing-plans/` | `skills/writing-plans/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune |
| `systematic-debugging/` | `skills/systematic-debugging/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune |
| `test-driven-development/` | `skills/test-driven-development/{SKILL.md,writing-good-tests.md}` | idem | MIT → `LICENSE.txt` | Aucune |
| `requesting-code-review/` | `skills/requesting-code-review/{SKILL.md,code-reviewer.md}` | idem | MIT → `LICENSE.txt` | Aucune |
| `receiving-code-review/` | `skills/receiving-code-review/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune |
| `brainstorming/` | `skills/brainstorming/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune (scripts whiteboard HTML non repris : SKILL.md ne les référence pas en lien) |
| `executing-plans/` | `skills/executing-plans/{SKILL.md,scripts/task-start,scripts/task-done}` | idem | MIT → `LICENSE.txt` | Aucune (2 scripts bundlés, lus/audités, mode +x) |
| `using-git-worktrees/` | `skills/using-git-worktrees/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune |
| `finishing-a-development-branch/` | `skills/finishing-a-development-branch/SKILL.md` | idem | MIT → `LICENSE.txt` | Aucune |
| `subagent-driven-development/` | `skills/subagent-driven-development/{SKILL.md,implementer-prompt.md,re-review-prompt.md,task-reviewer-prompt.md,scripts/{sdd-workspace,task-brief,review-package}}` | idem | MIT → `LICENSE.txt` | Aucune (3 prompts + 3 scripts bundlés, lus/audités) |
| `writing-skills/` | `skills/writing-skills/{SKILL.md,testing-skills-with-subagents.md}` + `skills/using-superpowers/references/{codex-tools.md,gemini-tools.md}` | idem | MIT → `LICENSE.txt` | **LOCAL ADAPTATION** : 2 liens `](../using-superpowers/references/X.md)` réécrits `](references/X.md)` (fichiers copiés ici, le skill `using-superpowers` n'étant pas installé) ; note HTML en fin de SKILL.md. Diff = exactement ces 2 remplacements + la note. |
| `security-best-practices/` | `skills/.curated/security-best-practices/{SKILL.md,LICENSE.txt,references/*-security.md}` (10 refs complètes) | openai/skills | Apache-2.0 (`LICENSE.txt` du skill, recopié) | Aucune |
| `security-threat-model/` | `skills/.curated/security-threat-model/{SKILL.md,LICENSE.txt,references/{prompt-template.md,security-controls-and-assets.md}}` | openai/skills | Apache-2.0 (`LICENSE.txt` du skill) | Aucune |
| `discernment-nudge/` | `skills/discernment-nudge/{SKILL.md,LICENSE.txt}` | anthropics/skills | Apache-2.0 (`LICENSE.txt` du skill) | Aucune |

## Rejetés (avec raison) — rien de leur contenu n'est copié

| Candidat | Raison |
|----------|--------|
| anthropics `doc-coauthoring` | **Licence non claire** : pas de `LICENSE.txt` dans le répertoire du skill (politique anthropics = licence par skill) → non copié, règle « unclear licensing → do not copy » |
| vercel-labs `web-design-guidelines`, `writing-guidelines` | Stubs de ~1,2 Ko déléguant le contenu à un fetch distant (Web d'un autre repo) ; licence = simple ligne « MIT » du README, pas de fichier LICENSE ; utilité frontend pour ce dépôt markdown ≈ nulle. Scores 76 / 82 < barre |
| microsoft/skills (whole repo) | Skills spécifiques Azure SDK ; zéro utilité pour ce dépôt. Étudiés, non copiés |
| openai `define-goal` (85), `gh-fix-ci` (86) | Sous la barre 90 pour ce dépôt (solo / pas de CI) — gardés comme prochains candidats si besoin |
| superpowers `using-superpowers`, `diagnosing-superpowers`, `dispatching-parallel-agents` | Méta-skills d'activation du plugin superpowers ou recouvrant #12 ; évité par la règle non-doublon |

## Conformité aux règles de la mission

- Attribution et textes de licence conservés à côté de chaque skill (fichier `LICENSE.txt` dédié).
- Une seule adaptation locale sur 15 (listée ci-dessus, marquée dans le fichier et ici).
- `l1-study` (skill de domaine existant) : intact, hors quota, non listé ci-dessus.
- Aucun fichier de `resources/`, du curriculum ou de l'archive 627 fichiers n'a été lu pour modification, déplacé ou réécrit par cette tâche.
