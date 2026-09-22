# Multimedia — الدرس 1 (V3 · édition audiovisuelle professionnelle)

## fiche technique — ressource générée, non officielle
| champ | valeur |
|---|---|
| fichier | `lesson1-arabic.mp4` (V3) |
| résolution / cadence | **1920×1080 @ 60 fps réel** (69 612 frames dessinées une à une ; vérifié : flux « 60 fps, 60 tbr » + 6/6 paires de frames consécutives distinctes — aucune duplication) |
| durée | 19:20,2 (1160,20 s — strictement la durée mesurée des 9 clips de narration) |
| poids / débits | 62,6 MiB — vidéo 273 kb/s (H.264 High, yuv420p, CRF 20) + audio 166 kb/s (AAC mono 44,1 kHz) |
| SHA-256 | `0c2d6807bf68626b16c582c258d4404bd2b6948442e45daccc05a178bf319e27` |
| audio | narration arabe (TTS) + sound design conçu pour la bande-son (souffle d'intro, whoosh de transitions, ticks de révélation, thocks de construction du tableau, accord de résolution) ; mix normalisé **−16,9 LUFS / TP −1,2 dB**, narration toujours dominante, aucun silence > 4 s |
| contenu | fidèle au « Chapitre 1 » du support ASD1 : définition + 4 conditions, historique (al-Khwarizmi → algorithme), interprétation vs compilation, pseudo-code / organigramme / 6 formes, exemple complet `compteur < 4` avec exécution animée et tableau de trace (4 passages — pas 3, pas 5), piège off-by-one, variante `≤ 4`, structure `Algorithme / déclarations / Début…Fin`, lois de nommage, introduction de la complexité |
| scènes | 15 scènes ; intro cinématique (grille → nœuds → titre), pipeline à paquets animés, morphing pseudo-code→organigramme, exécution avec surbrillance de nœud actif + ligne de tableau active, carte mentale de synthèse |
| mouvement | easing quintique/cubique + léger ressort ; transitions : wipe directionnel glissant ~0,4 s + assombrissement de la scène sortante ; fondus noir en ouverture/fermeture ; couches ambiantes continues (orbes, grille, barre de progression, ponctuation de scène) |
| typo | hiérarchie stricte 1080p (titres 52 px, corps ≥ 19 px), arabe RTL façonné (reshape+bidi), code/FR en GeistMono isolé LTR |
| sous-titres / poster | produits hors dépôt : `lesson1-ar-v3.vtt` (26 cues, cadencées sur les clips), `poster-v3.jpg` (t = 55 s) — voir `/home/user/asd1-lesson1-v3/video/` |

## versions antérieures (préservées)
- **V2** — 1280×720 @ 15 fps, 33,9 MiB, SHA `5b7f567ad1ca…b550f1` : historique git (commit `b4528c5`) + copie de référence.
- **V1** — 720p @ 12 fps, archivée hors dépôt.

> ⚠️ Ressource d'étude **générée automatiquement** (voix de synthèse + rendu scripté) : elle ne remplace pas les supports de l'enseignant (UBMA). Elle ne prétend pas être produite par l'université. Contenu ancré sur le document de cours capté ; les remarques pédagogiques signées « رأي الشارح » sont des commentaires, non le texte officiel.

## lecture rapide
```bash
mpv lesson1-arabic.mp4 --sub-file=lesson1-ar-v3.vtt     # vtt à copier à côté si besoin
```
