# ACCESS-REPORT — Telegram `computerscience2026L1` (collecte 2026-09-20/21)

## Contexte environnement (preuves à l'appui)

| Capacité | Test | Résultat |
|---|---|---|
| Réseau bash général | `curl https://example.com`, `https://t.me/s/durov` | ❌ bloqué (`SSL_ERROR_SYSCALL`, exit 35) |
| Réseau bash — liste blanche | `pip3 download pypdf` (PyPI) | ✅ fonctionne |
| Réseau bash — GitHub | `curl https://github.com` | ✅ HTTP 200 (git push confirmé par ailleurs) |
| Réseaux Telegram depuis bash | `telegram.org`, `api.telegram.org`, `web.telegram.org`, `cdn4/5.telesco.pe` | ❌ tous bloqués |
| Pont web de l'agent (`fetch_page`) | n'importe quelle URL, y c. `t.me` | ✅ fonctionne (contrôle positif : `/s/durov` → historique complet rendu) |
| Proxy de lecture tiers `r.jina.ai` via le pont | rendu de pages t.me | ✅ utilisable (confirme les résultats du pont) |

**Conséquence** : toute navigation Telegram passe par le pont texte de l'agent ; **aucun octet binaire ne peut
être écrit dans le dépôt depuis les CDN Telegram** (le pont extrait des documents, il ne télécharge pas de
fichiers ; le CDN est hors liste blanche bash ; GitHub Actions ne sera pas détourné comme relais réseau —
ce serait contourner la politique d'accès de l'environnement, ce qui est exclu).

## Méthodes d'accès Telegram testées (Phase 2)

| # | Méthode | Résultat |
|---|---|---|
| 1 | Aperçu web public du canal `https://t.me/computerscience2026L1` | ✅ **Page d'information obtenue** : nom « Useful Resources for L1 Computer Science 🗣 », 1 584 membres / 196 en ligne, description « Structured topics for S1 & S2 — Lessons & Summaries — TD, Exams & Interros — Check Topics for all modules » |
| 2 | Historique web `/s/` du groupe (`t.me/s/computerscience2026L1`) | ❌ **Non disponible** : renvoie seulement la page d'info (contrôle positif `t.me/s/durov` prouve que le pont sait lire un `/s/` : comportement propre aux groupes à Topics, pas une limitation de l'agent) |
| 3 | URLs publiques de messages `t.me/computerscience2026L1/<id>?embed=1` | ✅ **Fonctionne** — chaque message (texte, document, carte d'album) est rendu individuellement. C'est la seule fenêtre d'énumération disponible |
| 4 | Vue fil de topic `?thread=<id>` | ⚠️ Rendu limité à la carte unique (pas de liste du fil) |
| 5 | Connecteur/plugin Telegram dans l'environnement | ❌ aucun outil Telegram/MTProto disponible ; `pip` permet d'installer Telethon/Pyrogram mais **nécessite des identifiants de compte (api_id/api_hash + session)** — non fournis, création d'un compte = hors limites → **BLOCKED, non tenté par contournement** |
| 6 | Capacité Telegram authentifiée existante de l'agent | ❌ aucune session Telegram dans le sandbox (seuls gh/net GitHub authentifiés) |
| 7 | Liens/fichiers référencés par les publications du groupe | ✅ **22 documents découverts via les cartes d'embed** (voir MANIFEST) ; canaux d'origine des renvois testés : `math_informatique_Dz` → **restreint** (« Please open Telegram to view this post ») ; `Mik_emm` etc. inaccessibles pareil (non sondés individuellement — hors budget) |
| 8 | Indexation moteur de recherche du canal | ❌ `web_search "computerscience2026L1"` et `"t.me/computerscience2026L1"` : **aucun message indexé** (seuls des canaux homonymes sans rapport remontent) |
| 9 | Miroirs publics / annuaires | ❌ TGStat : canal non indexé (404) ; tgram.io : absent ; telegramchannels.me : absent. Aucun miroir trouvé |
| 10 | Pages canaux amont | ⚠️ `alikhatoui1998` : `/s/` **ouvert** (id max ~1864) mais contenu = annonces d'orientation, pas les polycopiés UBMA ; non réindexé ici (provenance tierce) |

## Bornes d'ids et couverture

- Plage vivante déterminée par recherche binaire : **min ∈ (400, 500], max ∈ (8500, 8750)** ; ids ≤ 1446
  partiellement supprimés (ex. 650, 850, 1446, 1448 : « Post not found » alors que voisins existent) →
  **des purges existent**, une couverture 100 % est même déjà impossible en principe par sondage.
- Densité observée ≈ 70 ids/jour (messages de service comptés). L'espace ≈ 8 300 ids ; budget de sondage
  consommé ≈ 55 ; **le sondage unitaire ne peut donc pas être exhaustif** — c'est documenté, pas dissimulé.
- Grappes balayées en densité autour de chaque contenu matériel : 2990–3050, 4990–5002, 5695–5705,
  7495–7505, 1435–1450, ids référencés (620, 947, 1724, 1731, 5433, 5443, 5422).

## SUCCESS ✅

- Identification et vérification du canal cible (nom, taille, structure, thème).
- Énumération par embeds avec **22 pièces documentaires** (nom, taille exacte, message-id, date, posteur,
  canal d'origine du renvoi) — dont 12 examens (Algo 1 × 9 ; Structure machine 1 × 8 avec doublons de
  sessions ?), 2 séries VF-EN, 1 cours Logique, 1 album « séries + solutions » (Sn1.pdf…), 1 fichier HTML
  de modèle — et classification S1/S2 (voir MANIFEST).
- Preuve du fonctionnement du pont (contrôles positifs) rendant les négatifs interprétables.

## PARTIAL 🔶

- **Contenu des fichiers** : cartes et tailles connues, **octets non récupérables** dans cet environnement
  (raison ci-dessus). Chaque fichier reste accessible aux membres via l'app Telegram ; l'utilisateur peut
  déposer le ZIP dans `resources/incoming/study-materials/` (inbox prête).
- Album « séries + solutions » : les ids 5700–~5716 n'ont pas tous été feuilletés (budget).
- Topics par module : structure confirmée par la description, **non adressable publiquement**.

## BLOCKED ⛔

- Téléchargement binaire direct : CDN `telesco.pe`/`t.me/file/...` hors liste blanche egress ; le pont texte
  ne restitue pas les URL de téléchargement `/file/` (jetons injectés en JS client).
- Chaîne d'origine `math_informatique_Dz` : paramètre Telegram « Restrict Saving Content » activé côté
  éditeur → embeds = « Please open Telegram ». **Non contournable** (et non contourné).
- API MTProto : exige api_id/api_hash de compte → aucune identité disponible.

## NOT FOUND ❌

- **Aucun fichier ZIP/RAR/7Z** dans la zone sondée (le ZIP promis par la mission est attendu côté utilisateur).
- **Aucun lien Google Drive/OneDrive/Mega/GitHub de dépôt de cours** dans les ~55 messages observés.
- Pas de matériel « Physique » distinct ; Électricité générale : **aucun fichier trouvé** dans la zone sondée
  (absence ≠ inexistence).
- TCE : **aucun fichier TCE** trouvé dans la zone sondée ; l'existence même du module reste ⚪ (cf. PROGRAMME.md).
- Anglais/Histoire : aucun fichier dans la zone sondée.

## Intégrité

- `raw/` : vide — **0 téléchargement revendiqué, aucun placeholder inventé**. `extracted/` : vide — aucune
  archive découverte à dépaqueter. `pages/` : vide (le pont ne renvoie que du texte markdown, hors pièce à
  conviction binaire).
- Vérification : `git status` — seuls des fichiers sous `resources/incoming/study-materials/**` sont nouveaux ;
  rien de touché dans `S1/`, `S2/`, `resources/PROGRAMME.md`, `resources/sources/SOURCES.md` ; aucun commit,
  aucun push effectués dans cette mission.


## Addendum capacité binaire (2e passe, même date)

| Capacité testée | Commande/épreuve | Résultat |
|---|---|---|
| api.github.com contents (base64) | `gh api repos/octocat/Hello-World/contents/README` → décodé | ✅ **VOIE BINAIRE RÉELLE** (GitHub uniquement) |
| codeload tarballs | `curl https://codeload.github.com/octocat/Hello-World/tar.gz/refs/heads/main` | ✅ répond (404 = test sur mauvais nom de branche ; hôte opérationnel, même chemins valides → binaire) |
| objects.githubusercontent.com | `curl -I https://objects.githubusercontent.com/` | ❌ bloqué |
| storage.googleapis.com / drive.usercontent.google.com (Drive direct) | `curl -I` | ❌ bloqués |
| archive.org, jsDelivr (x), gitlab, dropbox, mega, onedrive | `curl -I` | ❌ tous bloqués |
| Copie GitHub des 8 PDF visés | 4 recherches (`in:path`, noms exacts, fragments, dépôts annaba/UBMA) | ❌ **aucune trouvée** |
| Index `coursuniversitaire/cours.univ.pdf` | llms.txt | ⚠️ **paywall** → contournement refusé |
| PDF officiels UBMA (Moodle) | `view.php?id=12440-12443` via pont | ✅ parsés (texte) — **les originaux existent mais sur hôte non binaire-joignable** |

**Conclusion technique (exhaustive)** : l'environnement peut écrire des octets **uniquement** pour des
fichiers déjà hébergés sur GitHub. Les 8 fichiers Telegram n'y existent pas publiquement ; toute autre voie
impliquerait un contournement (paywall/CDN bloqués) — interdit par la mission. **Aucun téléchargement n'est
revendiqué ; `raw/` reste vide.**


## Addendum 3e passe — pont Jina = capacité de CAPTURE TEXTE de tout PDF public
`https://r.jina.ai/<url PDF>` (en cas de bug proxy : encoder en %3A%2F%2F) renvoie le contenu markdown
complet + métadonnées. Utilisé pour 3 captures officielles UBMA (SM2 examen+corrigé, ASD2 examen).
Ceci est documenté comme CAPTURE, jamais comme original. Binaires : toujours limités aux hôtes GitHub
(0 copie publique des 8 examens Telegram).


## Addendum 4e passe — méthode de capture stabilisée
`https://r.jina.ai/` + URL cible ENCODÉE en %3A%2F%2F contourne le bug de réécriture du proxy de session ;
le pont renvoie titre/nb-pages/date-HTTP/texte markdown. Taux de succès ce run : 8/9 fetch (1 échec = re-tenté chunk final, non critique).
Aucun binaire écrit (aucun disponible), raw/ inchangé (README only), hachages utilisateur toujours NON VÉRIFIÉS.
