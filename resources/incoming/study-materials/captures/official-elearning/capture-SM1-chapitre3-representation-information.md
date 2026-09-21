# CAPTURE TEXTE — SM1 Chapitre 3 : La représentation de l'information
<!-- CAPTURE TEXTE (pont Jina) — PAS le PDF original. -->
- SOURCE: UBMA — Département Mathématiques & Informatique — e-learning officiel
- ORIGINAL URL: https://elearning-deprecated.univ-annaba.dz/pluginfile.php/29145/mod_resource/content/1/Chapitre%203.pdf
- UBMA COURSE ID: 1529 (N. Kobsi)
- ACADEMIC YEAR: 2019-2020 (pied de page interne)
- MODULE: Structure de Machine 1 (S1)
- DOCUMENT TYPE: COURS
- CAPTURE METHOD: Jina markdown parser (accès invité)
- ORIGINAL FILE SIZE: inconnu
- PAGE COUNT: 14
- DATE ACCESSED: 2026-09-20
- PROVENANCE LABEL: OFFICIAL_UBMA
- ÉTAT DE CAPTURE: PARTIELLE (page 1 « Introduction » non rendue par le parseur — contenu commençant au titre I ; fin du document (détails IEEE 754, code alphanumérique le cas échéant) non incluse — chunk 1/2 sur 2 sauvegardé. Re-capture via l'URL complète.)

## TOPICS (présents dans le document capturé)
- I.1 Entiers naturels : n bits → 0..2ⁿ−1 (ex. 8 bits : 0-255 car 2⁸=256)
- I.2 Entiers relatifs, 3 méthodes :
  · Signe/Valeur Absolue (S/VA) : MSB = signe ; table 4 bits ±0..±3 ; double zéro (+0/−0) ; échec arithmétique illustré (2+(−2)=−4)
  · Complément à 1 : N+N′=2ⁿ−1 ; inversion bits ; CA1(CA1(N))=N ; zéro double ; intervalle −(2ⁿ⁻¹−1)..+(2ⁿ⁻¹−1) ; exemple décodage 101010 (6 bits) → −21
  · Complément à 2 : CA1+1 ; zéro unique ; CA2(CA2(N))=N ; intervalle −2ⁿ⁻¹..+(2ⁿ⁻¹−1) ; −19 sur 8 bits → 11101101 (19→00010011→11101100→+1)
- Opérations arithmétiques en CA2 : +9+4=01101 ; +9−4 (report ignoré) → 00101=+5 ; −9−4 → 11001 = −13 ; −9+9 → 00000
- Retenue vs débordement (overflow) : débordement ssi (+)+(+)<0 ou (−)+(−)>0 ; jamais si signes différents
- II. Nombres réels : virgule fixe (ex. (11.01)₂,(75.23)₈,(E7,A4)₁₆) vs virgule flottante (mantisse normalisée × base^exposant, ex. 31,41592 → 0,3141592×10²) ; introduction de la norme IEEE 754 (sections suivantes non incluses dans cette capture)
