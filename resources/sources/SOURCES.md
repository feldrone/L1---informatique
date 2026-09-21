# Registre des sources officielles — L1 Systèmes Informatiques (UBMA)

Chaque enregistrement ci-dessous documente une source **consultée** lors de la construction du dépôt
(première compilation : 20 septembre 2026). Seules les sources publiées par l'université, la faculté
ou le département sont référencées ici comme officielles. Toute autre ressource doit être ajoutée avec
l'étiquette explicite **SUPPLEMENTAIRE — NON OFFICIEL**.

**Niveaux de source (hiérarchie de confiance — à rappeler dans tout enregistrement)**

| Niveau | Nature | Exemples dans ce registre | Force |
|---|---|---|---|
| **OFFICIEL UBMA** | Publication du site `univ-annaba.dz` / du département / de la faculté, datée | S1–S8 | Fait autorité pour le dépôt |
| **CORROBORATION STRUCTURELLE EXTERNE** | Document national ou d'une autre université (canevas, arrêté…) — utile pour comprendre une structure, **jamais** preuve d'un fait propre à l'UBMA | S9 | Étayage uniquement |
| **PREUVE DE SALLE — NON OFFICIEL** | Témoignage de première main (tableau de salle, annonce orale, emploi du temps photographié) | C1 | Indication à recouper ; **ne vaut jamais document officiel** tant qu'il n'est pas confirmé par une source UBMA datée |

En cas de divergence : la **structure académique du dépôt suit la source officielle la plus récente** ; la preuve de
salle est documentée comme divergence (voir `resources/PROGRAMME.md`, section « Confrontation S1 — 2026/2027 »).

Format d'un enregistrement :

```
# Source
- Institution:
- Département:
- Document:
- Année universitaire:
- URL:
- Date de consultation:
- Ce que cette source vérifie:
```

---

# Source S1 — Catalogue des formations (Faculty of Technology)

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: « Catalogue des formations / مسارات التكوين — Course catalog » (PDF), publié sur la page « Parcours de formation » du département ; la page Licence « Systèmes Informatiques » décrit le domaine (Mathématique–Informatique), la filière (Informatique), les objectifs et la composition des formations par semestre, unités (UEF/UEM/UED/UET) et matières
- Année universitaire: non daté explicitement dans l'extrait consulté ; contient une séquence de programme « actuelle » et une séquence « Ancien » pour la Licence SI
- URL: page d'accès — https://factec.univ-annaba.dz/departements/informatique/scolarite/parcours-de-formation/ — PDF — https://drive.google.com/file/d/1frdOBCqQ_oShLY9Z6N_mOcOoh0rICj4h/view
- Date de consultation: 2026-09-20
- Ce que cette source vérifie:
  - L'existence de la Licence « Systèmes Informatiques » (code SINF) sous le domaine « Mathématique–Informatique », filière « Informatique », à la Faculté de Technologie de l'UBMA ;
  - La composition des semestres de L1 SI lue dans le document (extraction texte du PDF) :
    - S1 — UEF11 : Analyse 1 (coefficient 4, 6 crédits, 2 Cours / 2 TD), Algèbre 1 (coefficient 2, 4 crédits, 1 Cours / 1 TD) ; UEM11 : Logiciels libres (open source) ; UEF12 : Algorithmique et structures de données 1, Structure de machine 1 ; UED11 : Électricité générale ; UET11 : Histoire ;
    - S2 — UEF21 : Analyse 2 (coefficient 4, 6 crédits, 2 Cours / 1 TD), Algèbre 2 (coefficient 2, 4 crédits, 1 Cours / 1 TD) ; UEM21 : Logique mathématique, Introduction à l'intelligence artificielle ; UEF22 : Algorithmique et structures de données 2, Structure de machine 2 ; UET21 : Électronique générale, Citoyenneté et patriotisme ;
  - Une variante « ancien programme » du même document place : en S1 — UEM11 : Terminologie scientifique et expression écrite, Anglais 1 ; UED11 : Électronique et composants des systèmes ; en S2 — UEM21 : Introduction aux probabilités et statistique descriptive, Technologie de l'information et de la communication, Outils de programmation pour les mathématiques ; UET21 : Électricité générale.
  - ⚠️ Limites : l'extraction texte du PDF a perdu les coefficients/crédits affichés en superposition pour la plupart des matières ; les valeurs ci-dessus ne sont données que pour les matières où elles étaient lisibles. L'appariement exact des deux variantes aux années universitaires n'est pas daté dans le document lui-même.

# Source S2 — Page ANNONCES du Département d'Informatique

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « ANNONCES » du département (fil officiel des annonces pédagogiques)
- Année universitaire: 2025/2026 (extraits consultés), consultée aussi pour 2026/2027
- URL: https://factec.univ-annaba.dz/departements/informatique/annonces/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie:
  - « Séances supplémentaires de TD — Module "Algebra 1" — L1 SI » (15/12/2025) → Algèbre 1 est un module de S1 en 2025/2026 ;
  - « Cours d'anglais - L1 SI » (25/11/2025, cours en ligne) et « Examen en ligne du module d'anglais - L1-SI » (11/01/2026, pendant la période des examens S1) → Anglais est un module de S1 en 2025/2026 ;
  - « ف/ي مادة الكهرباء العامة (Électricité générale) … المادة تدرس في السداسي الأول » (02/11/2025 : la matière s'enseigne au Semestre 1 — précision adressée aux étudiants endettés/redoublants) + annulation exceptionnelle d'un cours de « Basic electricity » du samedi 27/09/2025 (25/09/2025) + début des TD le 25/10/2025 + cours de renfort en novembre 2025 → Électricité générale est un module de S1 du programme courant, avec CM (amphi, groupes A/B) et TD ;
  - « درسا مادة برمجيات حرة (مفتوحة المصدر) - مستوى ل1 أنظمة معلوماتية » (cours de Free software (open source) en ligne, 27/09/2025, groupes A et B) → Logiciels libres (open source) est un module de S1 en 2025/2026 ;
  - Obligation de présence aux cours des matières sans TD/TP (03/11/2025) ; règles relatives aux matières à dette conformément au Guide ministériel 1165 du 04/10/2025 (02/11/2025).

# Source S3 — Page EMPLOIS DU TEMPS du Département d'Informatique

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « EMPLOIS DU TEMPS » — onglets par niveau (L1/L2/L3 Systèmes Informatiques, L1-L3 MIAGE, L1-L3 Médecine et informatique, M1/M2)
- Année universitaire: 2026/2027 — Semestre 1 (page mise à jour le 13/09/2026 ; les liens de téléchargement étaient encore en place holder « # » à la consultation) ; la version archivée de la page affichait « 2025/2026 - Semestre 2 »
- URL: https://factec.univ-annaba.dz/departements/informatique/scolarite/emplois-du-temps/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: la rentrée 2026/2027 (Semestre 1) est en préparation au département et la grille L1 SI y est publiée par semestre (document joint à récupérer dès mise en ligne).

# Source S4 — Page PLANNING DES EXAMENS du Département d'Informatique

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « PLANNING DES EXAMENS » — « Année universitaire : 2026/2027 — Semestre 1 - A afficher en session d'examen »
- Année universitaire: 2026/2027
- URL: https://factec.univ-annaba.dz/departements/informatique/scolarite/planning-des-examens/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: l'organisation des examens par semestre et par niveau avec plannings publiés par le département (les fichiers de janvier 2026 pour le S1 2025/2026 ont été annoncés via les ANNONCES des 04/01/2026 et 07/01/2026 avec modification du planning de tous les niveaux de licence SI).

# Source S5 — Page CORRIGES DES EXAMENS (consultation des copies)

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « CONSULTATIONS / planning des consultations des copies d'examens » (annoncée dans les ANNONCES du 25/01/2026 pour le S1 2025/2026)
- Année universitaire: 2026/2027 (placeholder au moment de la consultation)
- URL: https://factec.univ-annaba.dz/departements/informatique/scolarite/corriges-des-examens/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: le canal officiel du département pour les corrigés/consultations de copies ; les corrigés archivés via cette page doivent être enregistrés sous `Corrections/` avec la mention « officiel — UBMA » + source.

# Source S6 — Page DELIBERATIONS (résultats)

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « DELIBERATIONS » + annonce du 08/02/2026 : « Les résultats du niveau L1 (Systèmes Informatiques) [S1] peuvent être consultés sur ce lien »
- Année universitaire: 2025/2026
- URL: https://factec.univ-annaba.dz/departements/informatique/scolarite/deliberations/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: la publication des résultats S1 2025/2026 par délibération (délibérations affichées sur le site du département).

# Source S7 — Page LISTES DES ETUDIANTS

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « LISTES DES ETUDIANTS » (ليسانس LICENCE — L1 Systèmes Informatiques أنظمة معلوماتية)
- Année universitaire: 2025/2026 (annonce de rentrée du 17/09/2025 dans les ANNONCES)
- URL: https://factec.univ-annaba.dz/departements/informatique/scolarite/listes-des-etudiants/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: l'intitulé officiel du niveau « L1 — Systèmes Informatiques » (LICENCE) au Département d'Informatique.

# Source S8 — Informations sur les examens (site Factec, historique)

- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: page « Informations sur les examens — informatique » — «قسم الإعلام الآلي - مواقيت الامتحانات : 2025/2024 — Département d'informatique - Planning des examens : 2024/2025 »
- Année universitaire: 2024/2025 (rattrapages S1-S2 de L1-SI)
- URL: https://factec-dev.univ-annaba.dz/2024/05/05/informations-sur-les-examens-informatique/
- Date de consultation: 2026-09-20
- Ce que cette source vérifie: pour l'ancien programme 2024/2025, des modules « Électronique et composants système » et « Anglais » figuraient dans le planning de rattrapage S1-S2 du L1-SI → cohérent avec la variante « Ancien » du Catalogue (électronique/composants en S1, anglais dès le L1). Source au statut mixte (sous-domaine « dev » de la Faculté) — conservée comme indice, à confirmer par tout document d'archive du département.

---

# Source S9 — Canevas national de conformité LMD — Licence Informatique / Systèmes Informatiques

- Classification: **CORROBORATION STRUCTURELLE EXTERNE — NOT an official UBMA source** (document national/hébergé
  par une autre université ; la publication d'une structure par un établissement tiers ne doit jamais être présentée
  comme une publication de l'UBMA)
- Institution: Ministère de l'Enseignement Supérieur et de la Recherche Scientifique — canevas type de mise en
  conformité LMD (champs « Établissement / Faculté / Département » laissés vides dans l'exemplaire consulté)
- Département: n/a — Domaine « Mathématiques et Informatique », Filière « Informatique », Spécialité
  « Systèmes Informatiques (SI) »
- Document: « Canevas de mise en conformité — Offre de formation L.M.D. — Licence académique » (PDF)
- Année universitaire: affichée 2025-2026 sur le document ; mis en ligne en avril 2026 par l'établissement hôte
- URL: http://sciences.univ-alger.dz/wp-content/uploads/2026/04/CANEVAS-Licence-informatique.pdf
- Date de consultation: 2026-09-21
- Ce que cette source vérifie (au titre d'étayage externe uniquement):
  - L'existence d'un canevas national dont le S1 « SI » correspond code par code et heure par heure au Catalogue
    UBMA relevé (source S1) : UEF111 Analyse 1 (84 h, coef 4, 6 crédits), UEF112 Algèbre 1 (42 h, coef 2,
    4 crédits), UEF121 ASD 1 (105 h dont 3 h de TP, coef 5, 7 crédits), UEF122 Structure machine 1 (42 h),
    UEM111 Logiciels libres (21 h), UET111 Langue Étrangère (21 h), UED111 Electricité générale (42 h) — total 30
    crédits ;
  - La mention, dans ce canevas, du « langage C » comme support recommandé des TP d'ASD 1 (« Ces algorithmes seront
    développés en TP en utilisant le langage C sous Unix ») — cohérent avec le « TP C » relevé au tableau de salle ;
  - L'**absence** de tout module « TCE / Techniques de communication et d'expression » et de tout module nommé
    « Physique » en S1 de ce canevas national.
- Ce que cette source NE vérifie PAS : le programme effectivement arrêté par l'UBMA pour 2026/2027, les
  coefficients/crédits propres à l'UBMA, l'existence d'une variante locale (ajouts/retraits de modules UEM/UED).

# Source S10 — Vérification web officielle négative (site du Département d'Informatique)

- Classification: OFFICIEL UBMA — contrôle d'absence (négatif), daté
- Institution: Université Badji Mokhtar — Annaba
- Département: Département d'Informatique (Faculté de Technologie)
- Document: (1) flux ANNONCES — dernier enregistrement au 2026-06-07 ; (2) moteur de recherche interne du site
  WordPress (`/wp-json/wp/v2/search`), interrogeant toutes les pages/posts publiés du site Factec
- Année universitaire: consultation portant sur l'absence de publication 2026/2027
- URL: https://factec.univ-annaba.dz/departements/informatique/annonces/ et https://factec.univ-annaba.dz/wp-json/wp/v2/search
- Date de consultation: 2026-09-21
- Ce que cette source vérifie:
  - **Aucun document officiel UBMA consulté ce jour ne publie de liste complète des modules S1 pour 2026/2027** ;
  - **Aucune trace** sur le site du département d'un module « TCE / Techniques de Communication et d'Expression »
    pour la L1 SI (recherche « Techniques de communication » : 0 résultat ; idem « TCE ») ;
  - **Aucune trace** d'un module « Physique » au département d'informatique (les rares résultats « Physique »
    concernent la Faculté des Sciences, hors informatique) ;
  - Témoin de fonctionnement du moteur : la requête « logiciels libres » renvoie bien la page ANNONCES du
    département → les résultats nuls ci-dessus sont interprétables comme des absences de publication, non comme
    des pannes de recherche ;
  - Réserve : une absence de publication web n'établit pas une absence d'enseignement (le relevé de salle C1 reste
    non recoupé, en attente de publication officielle).

# Source C1 — Tableau de salle / première main — NON OFFICIEL

- Classification: **Preuve de salle / first-hand evidence — NON OFFICIEL** (ni un document officiel UBMA, ni une
  source web ; témoignage de première main à recouper)
- Nature: relevé du tableau affiché en salle de cours (L1 Systèmes Informatiques, S1), transmis par l'étudiant
- Institution concernée: Université Badji Mokhtar — Annaba (fait d'enseigner, non fait de publier)
- Année universitaire: 2026/2027 (rentrée de septembre 2026)
- Date de relevé / de consignation: 2026-09-21
- Contenu relevé (6 items) : Analyse 1 · Algèbre 1 · Algorithmique 1 + TP C · Structure Machine 1 (« St.m 1 ») ·
  TCE 1 — Techniques de Communication et d'Expression 1 · Physique (« Phy », description relevée : « concepts
  d'électricité / mécanique »)
- Ce que cette source étaye: l'existence d'un enseignement 2026/2027 de ces six intitulés en salle ; des
  appellations/abrégés réellement employés (« Algorithmique 1 », « St.m 1 », « Phy ») ; l'indice d'un module
  d'expression/communication (TCE 1) et d'une appellation « Physique » pour l'UE de découverte — **non confirmés**
  sur le web officiel à la date du 2026-09-21 (voir S10).
- Ce que cette source NE peut établir: coefficients, crédits, rattachement UE, volumes horaires, suppression de
  modules (Logiciels libres, Anglais 1, Histoire n'étaient pas sur le tableau — absence non concluante), renommage
  officiel d'un module. Tant que la hiérarchie des sources n'est pas inversée par une publication UBMA datée, le
  dépôt conserve la structure du Catalogue (voir `resources/PROGRAMME.md`).

---

## Politique de traçabilité

1. Un document n'est « officiel » que s'il provient de `univ-annaba.dz` (et sous-domaines), d'une publication
   du Département d'Informatique, de la Faculté de Technologie ou du Ministère de l'Enseignement Supérieur.
2. Chaque ressource archivée doit indiquer : origine, année universitaire, semestre, module, date de publication
   si connue. Ne jamais deviner une date ou une session.
3. Le matériel pédagogique produit pour ce dépôt est étiqueté **SUPPLEMENTAIRE — NON OFFICIEL** dès l'en-tête du fichier.
4. En cas de divergence entre deux sources officielles (ex. « Catalogue des formations » vs annonces), la
   divergence est **documentée** dans le module concerné et dans `resources/PROGRAMME.md` — jamais tranchée en silence.
5. Les informations relevées en salle (catégorie « preuve de salle », enregistrements C*) ne sont **jamais**
   consignées comme officielles tant qu'elles ne sont pas confirmées par une source UBMA datée ; elles sont
   enregistrées sur le modèle C1, étiquetées **NON OFFICIEL**, et la structure du dépôt reste celle de la
   documentation officielle la plus récente (principe conservateur).
