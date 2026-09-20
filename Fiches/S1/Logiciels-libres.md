# Fiche — Logiciels libres (open source) (S1)

> **SUPPLEMENTAIRE — NON OFFICIEL.** Fiche de révision produite pour ce dépôt (L1 SI, UBMA Annaba).
> Elle ne reproduit pas un programme officiel : recoupe toujours avec le CM/TD de ton responsable de matière.
> Statut du module (vérifié) : voir [la fiche du module](../../S1/05-Logiciels-libres/README.md).

---

## 1. Les notions à savoir citer
- **Logiciel libre ≠ gratuit** : les 4 libertés (utiliser, étudier/modifier, copier/redistribuer,
  distribuer des versions modifiées) — définition du projet GNU ; l'open source met l'accent sur le code
  source accessible ; un logiciel propriétaire peut être gratuit, un logiciel libre peut être payant.
- **Copyleft** : la licence impose la transmission des libertés aux œuvres dérivées (GPL) ; **permissives** :
  MIT, BSD, Apache-2.0 (peu de contraintes) ; les licences Creative Commons concernent surtout les contenus.
- **GNU/Linux** : noyau Linux + outils GNU ; une **distribution** = noyau + gestionnaire de paquets + logiciels
  assemblés (ex. Debian, Fedora, Ubuntu).
- Formats : `.deb` (paquets Debian/Ubuntu), `.rpm` (Fedora), tarballs `.tar.gz` (archives + sources).

## 2. Terminal — commandes de base (à connaître sans hésiter)
| Objectif | Commande |
|---|---|
| position / se déplacer | `pwd` ; `cd dossier` ; `cd ..` ; `cd ~` |
| lister | `ls -l` ; `ls -a` (masqués) ; `ls -la` |
| créer | `mkdir dossier` (option `-p` parents) ; `touch fichier` |
| copier/déplacer/supprimer | `cp source cible` (`-r` dossiers) ; `mv` ; `rm` (`-r` dossiers, prudence !) |
| lire | `cat f` ; `less f` ; `head -n 5 f` ; `tail -f log` |
| chercher | `grep mot fichier` (`-r` récursif, `-n` numéros) ; `find . -name motif` |
| redirections | `cmd > f` (écrase) ; `cmd >> f` (ajoute) ; `cmd < f` ; `cmd1 | cmd2` (pipeline) |
| droits | `ls -l` ; `chmod u+x script` ; `chmod 644 fichier` (r w− r − r−) |
| identité / processus | `whoami` ; `id` ; `ps aux` ; `top` ; `kill PID` |
| compresser | `tar -czvf a.tar.gz dossier/` ; `tar -xzvf a.tar.gz` |
| réseau / distant | `ping hote` ; `ssh user@hote` ; `scp fichier user@hote:` |
| aide | `man commande` ; `commande --help` |
| paquetage | `apt install paquet` (Deb) ; `dnf install paquet` (RPM) — avec `sudo` |

## 3. Droits Linux — les lire
`-rwxr-xr-x` : type, user, group, other ; lecture 4 + écriture 2 + exécution 1 → `755` = rwxr-xr-x ;
`644` = rw-r--r--. Dossier : `x` = traverser/accéder, `r` = lister.

## 4. Éditeurs et flux de travail type d'un TP
- `nano` (Ctrl+O sauver, Ctrl+X quitter) ou `vi` (`i` insertion ; Échap ; `:wq`).
- Compiler : `gcc prog.c -o prog` ; exécuter : `./prog` (le `./` est obligatoire : le répertoire courant
  n'est pas dans le PATH).
- Script shell : éditer → `chmod +x script.sh` → `./script.sh` ; shebang `#!/bin/bash` en tête.
- Versionnement de base : `git init` ; `git add .` ; `git commit -m "message"` ; `git status` ; `git log`.

## 5. Pièges fréquents (examens/oraux)
- Confusion libre/gratuit, et open source ≠ « domaine public » (la licence reste opposable).
- `>` qui écrase un fichier non sauvegardé ; `rm` sans corbeille ni confirmation ; wildcard `rm *` dans le
  mauvais répertoire.
- Oublier `./` devant un binaire local ; oublier `chmod +x` sur un script.
- Chemins relatifs vs absolus : `/home/user/docs` (absolu), `../docs` (relatif) ; `~` = home de l'utilisateur
  courant ; `/root` = home du superutilisateur.
- `bin/bash` ≠ `/bin/bash` : l'un est un mot, l'autre un chemin complet.

## 6. Rappels examen (organisation vérifiée)
- Le module est organisé en **cours par groupes A/B** (cours en ligne confirmés aux annonces de rentrée
  2025/2026) ; la **présence aux cours est obligatoire** pour les matières sans TD/TP (annonce du 03/11/2025).
- Coef/crédits : non vérifiés dans les sources consultées.
