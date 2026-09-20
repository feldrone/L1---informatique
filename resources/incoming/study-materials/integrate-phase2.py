#!/usr/bin/env python3
"""Phase 2 — intégration académique : relit le contenu de chaque fichier, normalise type/sous-topic,
place les copies canoniques dans organized/ (schéma S1|S2/module/type), lie doublons et paires
examen<->correction, réécrit notes/inventory.tsv (21 colonnes). raw/ et extracted/ ne sont jamais touchés."""
import os,re,json,shutil,unicodedata,collections,hashlib,subprocess,functools
SM=os.getcwd()
def norm(x):
    x=unicodedata.normalize('NFD',(x or '').lower());return ''.join(c for c in x if unicodedata.category(c)!='Mn')
def sha256(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda:f.read(1<<20),b''):h.update(c)
    return h.hexdigest()
MODULES_V2=['S1/Analyse-1','S1/Algebre-1','S1/Algorithmique-ASD-1','S1/Structure-de-machine-1','S1/Electricite-generale','S1/Logiciels-libres','S1/Anglais-1-TCE-1','S1/Histoire','S2/Analyse-2','S2/Algebre-2','S2/ASD-2','S2/Structure-de-machine-2','S2/Logique-mathematique','S2/Introduction-a-l-IA','S2/Electronique-generale','S2/Citoyennete-et-patriotisme']
NEWK={'S1/Algorithmique-1':'S1/Algorithmique-ASD-1','S1/Anglais-1':'S1/Anglais-1-TCE-1'}
def M2(m):return NEWK.get(m,m)
TOPICS={
'S1/Analyse-1':[('suites',r'suites? (numeriques|reelles|monotones|convergentes|de)'),('limites',r'limites? de|la limite|lim _'),('continuité',r'continuit|intermediaires?'),('dérivabilité',r'derivabilite|derivee|hopital|deriver'),('développements-limités',r'developpement(s)? (limite|dl)|taylor|equivalents?'),('primitives-intégrales',r'primitive|integrale|riemann|integrer'),('nombres-réels',r'corps des reels|partie entiere|densite|numerabilite|recurrence')],
'S1/Algebre-1':[('arithmétique',r'divisibilite|pgcd|ppcm|congruence|z/nz|bezout|premiers?|euclide|arithmetique'),('systèmes-linéaires',r'systeme (lineaire|d equations)|gauss|matrici'),('polynômes',r'polynome')],
'S1/Algorithmique-ASD-1':[('fondamentaux',r'variables?|affectation|instruction|algorithme (de |en |du )?(debutant|base)'),('conditions',r'si .*(sinon|alors)|condition|choix'),('boucles',r'boucle|tant que|pour (tout|la|de)|repeter|iteration'),('tableaux',r'tableau(x)?'),('tri',r'tri (par|a|d|insertion|bulle|selection|rapide|fusion|par)|trier|tri\s*'),('recherche',r'recherche (sequentielle|dichotomique|binaire|dans)'),('procédures-fonctions',r'procedure|fonction|parametre|recursiv')],
'S1/Structure-de-machine-1':[('numérations',r'numerat|base (2|8|10|16)|binaire|octal|hexadecimal|conversion'),('complément-à-deux',r'complement (a|de) (deux|un)|signe (et|de) magnitude|overflow|depassement'),('flottants-IEEE',r'ieee|flottant|mantisse|exposant|virgule'),('codes-caractères',r'ascii|ebcdic|unicode|codage des caracteres|bade?|code (des caracteres|de transmission)'),('algèbre-de-bool',r'boole|alg bre|portes? (logiques?|de base)|simplification')],
'S1/Electricite-generale':[('électrostatique',r'electrostatique|coulomb|champ electrique|gauss|potentiel|flux'),('circuits-continu',r'ohm|kirchhoff|mailles?|noeuds?|thevenin|norton|resistances?'),('capacités-inductances',r'condensateur|capacite|bobine|self|inductance'),('puissance-énergie',r'puissance|energie|effet joule|bilan')],
'S1/Logiciels-libres':[('philosophie-du-libre',r'logiciel libre|open source|gnu|copyleft|gpl|stallman|philosophie|free software'),('linux',r'linux|noyau|systemd|distribution|debian|ubuntu'),('commandes-shell',r'commandes? (linux|de|shell)|shell|bash|terminal|chmod|grep|ls\b|cd\b|pipe|redirection'),('éditeurs-outils',r'vim|emacs|nano|editeur'),('bureautique-libre',r'libreoffice|openoffice|gimp|mozilla|calcul|writer|impress')],
'S1/Anglais-1-TCE-1':[('grammaire-temps',r'tenses?|present simple|past (simple|continuous|tense)|future|perfect|grammar|modal|passive'),('vocabulaire',r'vocabulary|vocab|word (list|building)|terminolog|technical english|idiom'),('compréhension-écrite',r'reading|comprehension|skimming|scanning|text'),('expression-écrite',r'writing|essay|email|letter|paragraph|composition|report'),('oral',r'listening|speaking|pronunciation|dialog|conversation')],
'S1/Histoire':[('antiquité',r'antiquite|egypte|mesopotamie|grece|rome|pharaon|proche orient'),('civilisation-islamique',r'islamique|musulmane|andalouse|abbasside|omeyyade|age d.or|haroun|bagdad'),('algérie-coloniale',r'colonisation|resistance|revolution (algerienne|du 1er)|abdelkader|1830|1954|front de liberation|guerre de'),('sciences-techniques',r'histoire des (sciences|techniques)|invent|epistemologie|scientifique (musulmane|de)')],
'S2/Analyse-2':[('séries',r'series (entieres|de fonctions|numeriques)|convergence|fourier'),('intégrales-impropres',r'impropres?|integrale (generalisee|multiple|double|triple)'),('calcul-différentiel',r'derivees? partielles|differentielle|jacobien|gradient|implicite?|extrema|taylor (de )?f('),('équations-différentielles',r'equations? differentielles|lineaires? (du|a)|cauchy y'),('formes-différentielles',r'formes differentielles|lineaires? (et |)exactes|primitives.*(champ|le long)')],
'S2/Algebre-2':[('structures-algébriques',r'groupes?|anneaux?|corp s|monoide|structure(s)? algebrique|algebraic struct'),('espaces-vectoriels',r'espaces? vectoriels|sous.espaces?|base |dimension|linear (map|dependence)|independance|famille (libre|generatrice)|vector space'),('applications-linéaires',r'applications? lineaires?|noyau|image|rang|endomorphisme|diagonalis|reduction|matrice|determinant|matrix'),('polynômes-fractions',r'polynome|fractions? rationnelles?|elements simples')],
'S2/ASD-2':[('listes-chaînées',r'listes? (chainees|simplement|doublement|de)|maillon|linked (list|chain)|enchain'),('piles-files',r'pile|stack|file d attente|queue|fifo|lifo'),('arbres',r'arbres? (binaires?|d|de recherche|equilibres?)?|binary (search )?tree|avl|parcours|noeud|racine|tas|heap'),('graphes',r'graphes?|sommets?|aretes?|dijkstra|bfs|dfs'),('fichiers',r'fichiers? (binaires?|de|texte)|lecture ecrire|tete de fichier|fseek|fprintf'),('allocation-mémoire',r'allocation|malloc|free|pointeur|struct|dynamique'),('hachage-dictionnaires',r'hachage|hash|dictionnaire|tables? (de|des) (hachage|symboles)|collision'),('langage-C',r'langage c|#include|programmation (en )?c\b|int main|void')],
'S2/Structure-de-machine-2':[('logique-combinatoire',r'combinatoire|multiplexeur|demultiplexeur|codeur|decodeur|additionneur|soustracteur|comparateur|karnaugh'),('bascules',r'bascule|flip.?flop|latch|bascules? (rs|d|jk|t)|maitre esclave'),('registres',r'registres?|decalage|shift|(a (dec|ch)argement|parallel[e]? (a|vers)|comptage'),('mémoires',r'memoire|ram|rom|prom|flash|cache|adressage|cycles? d.acces|actualisation|refresh|selection'),('compteurs',r'compteurs?|modulo|synchrones?|asynchrones?|presets?|preset'),('convertisseurs',r'convertisseurs?|c2n|n2c|can|rac|sigma|echantillon|successives')],
'S2/Logique-mathematique':[('logique-des-propositions',r'proposition|connecteurs?|tables? de verite|tautologie|contradiction|implication|equivalen|cnf|dnf|nand|nor|syntaxe|semantique|validite|satisfai|interpretation|modele'),('logique-des-prédicats',r'predicats?|quantificateurs?|prenex|li(e|s) libre|portee|clauses?|resolution|herbrand|unification|refutation|skolem|holles?'),('théorie-des-ensembles',r'ensemble|inclusion|union|intersection|relation|equivalence|ordre|cardinal|denombrable|venn|part (de|d un|)')],
'S2/Introduction-a-l-IA':[('recherche-informée',r'best.?first|hill.?climbing|a\*|astar|heuristique|manhattan|euclidienne|hamming|admissible|uniform cost|ucs|co?t de revient'),('recherche-aveugle',r'largeur|profondeur|uniform.(cost)?|blind|uninformed|iterative|dfs|bfs'),('adversariale',r'adversar|minimax|alpha.?beta|jeu'),('contraintes',r'contraintes|csp|backtracking|arc|coloriage|reines|n.queens'),('logique-et-inférence',r'resolution|chainage|inf erence|backward|forward|base de connaissance|floue|fuzzy|predicat'),('apprentissage',r'apprentissage|machine learning|neural|perceptron|decision tree|arbre de d|expert')],
'S2/Electronique-generale':[('diodes',r'diodes?|zener|redresseur|clamp|pn'),('transistors',r'transistors?|bjt|mosfet|jfet|igbt|polarisation|emet|collect|droite de charge'),('amplificateurs',r'amplificateur|a.o.p|aop|op.?amp|suiveur|inverseur|gain|contre.?reaction|reaction negative'),('filtres',r'filtres?|passe.(bande|bas|haut)|bode|coupure|rejection'),('régulation',r'regulateur|stabilis|reference|zener (de|en)')],
'S2/Citoyennete-et-patriotisme':[('citoyenneté',r'citoyen|devoirs|droits|constitution|institutions|democratie|societe'),('patriotisme',r'patriotisme|defense|symboles? (nationaux|de)|drapeau|hymne|valeurs nationales')],
}
def subtopic(mod,fn,txt):
    h=norm(fn+' '+txt[:1500])
    for lab,rx in TOPICS.get(mod,[]):
        try:
            if re.search(rx,h):return lab
        except re.error:pass
    return 'general'
TDIR={'COURSE':'Cours','LECTURE':'Cours','CHAPTER':'Cours','TD':'TD','TP':'TP','PRACTICAL':'TP','EXAM':'Examens','EXAM_CORRECTION':'Corriges','CORRECTION':'Corriges','EXERCISES':'Series','SUMMARY':'Revisions','REVISION':'Revisions','PROJECT':'Supports','REFERENCE':'Supports','OTHER':'Autres'}
def type2(fn,txt):
    h=norm(fn)+' '+norm(txt[:400])
    def has(*ws):return any(w in h for w in ws)
    exam=has('examen','epreuve','emd','rattrapage','partiel','session ordinaire','test ')
    cor=has('corrig','corrige','reponses','answers','solutions')
    if exam and cor:return 'EXAM_CORRECTION'
    if exam:return 'EXAM'
    if cor:return 'CORRECTION'
    if re.search(r'\btp\b|travaux pratiques|practical',h):return 'TP'
    if re.search(r'\btd\b|travaux diriges',h):return 'TD'
    if has('serie','exercices'):return 'EXERCISES'
    if has('resume','summary') or 'fiche de revision' in h or 'revision' in h:return 'SUMMARY' if 'resume' in h or 'summary' in h else 'REVISION'
    if re.search(r'chapitre \d|chapter \d|chapter\d',h):return 'CHAPTER'
    if has('cours','lecture','polycopie','amphi'):return 'COURSE'
    if has('projet','project'):return 'PROJECT'
    if has('presentation','diapo','slide','powerpoint'):return 'LECTURE'
    if has('plan','programme','syllabus','reglement','info ') or h.endswith(('.xlsx','.docx')):return 'REFERENCE'
    return 'OTHER'
def uniq(p):
    if not os.path.exists(p):return p
    b,e=os.path.splitext(p);i=2
    while os.path.exists(f'{b}__v{i}{e}'):i+=1
    return f'{b}__v{i}{e}'
from pypdf import PdfReader
@functools.lru_cache(maxsize=4096)
def peek(path):
    p=os.path.join(SM,path)
    if not path or not os.path.exists(p):return ''
    if p.lower().endswith('.pdf'):
        try:
            r=PdfReader(p,strict=False);t=''
            for pg in r.pages[:4]:t+=(pg.extract_text() or '')+'\n'
            return t[:2500]
        except Exception:return ''
    if os.path.getsize(p)>8_000_000:return ''
    try:return open(p,encoding='utf8',errors='ignore').read(2500)
    except Exception:return ''
ORG=os.path.join(SM,'organized')
for root,dirs,fs in os.walk(ORG):
    for f in fs:
        if f!='README.md':os.remove(os.path.join(root,f))
subprocess.run(['find',ORG,'-mindepth','1','-type','d','-empty','-delete'],check=False)
os.makedirs(os.path.join(ORG,'UNCLASSIFIED','Autres'),exist_ok=True)
for m in MODULES_V2:
    d=os.path.join(ORG,m);os.makedirs(d,exist_ok=True);open(os.path.join(d,'.gitkeep'),'a').close()
BK='notes/inventory-v1-backup.tsv'
if not os.path.exists(BK):shutil.copy2('notes/inventory.tsv',BK)
lines=open(BK,encoding='utf8').read().rstrip('\n').split('\n')
COLS=lines[0].split('\t');rows=[l.split('\t') for l in lines[1:]]
assert all(len(r)==16 for r in rows) and len(rows)==627
NEWCOLS=COLS+['subtopic','integration_status','canonical_info']
acc=[];counts=collections.Counter();bymod=collections.defaultdict(collections.Counter);bysub=collections.defaultdict(collections.Counter)
for (zn,fn,xp,sha,mod,sem,mt,yr,src,prov,conf,oldloc,dup,dupof,cs,notes) in rows:
    mod=M2(mod) if mod and mod!='UNCLASSIFIED' else ('UNCLASSIFIED' if mod in(None,'UNCLASSIFIED','—') else mod)
    txt=peek(xp) if xp else ''
    t2=type2(fn,txt);st=subtopic(mod,fn,txt)
    integ='—';canon='';loc='—'
    if dup=='EXACT_DUPLICATE':
        integ='DUPLICATE_NOT_COPIED';canon='canonical: '+ (dupof if dupof else '—')
    elif not xp:
        integ='NOT_PLACABLE_EXTRACT_FAIL';canon='conteneur original documente dans archive-inventory.tsv'
    else:
        mdir=mod if mod in MODULES_V2 else 'UNCLASSIFIED'
        sub=TDIR.get(t2,'Autres') if mdir!='UNCLASSIFIED' else 'Autres'
        destdir=os.path.join(ORG,mdir,sub) if mdir!='UNCLASSIFIED' else os.path.join(ORG,'UNCLASSIFIED','Autres')
        os.makedirs(destdir,exist_ok=True)
        base=os.path.basename(fn) or os.path.basename(xp)
        tgt=uniq(os.path.join(destdir,base))
        shutil.copy2(os.path.join(SM,xp),tgt)
        assert sha256(tgt)==sha or dup=='LIKELY_DUPLICATE'
        loc=os.path.relpath(tgt,SM)
        integ='PLACED_LIKELY_DUP' if dup=='LIKELY_DUPLICATE' else 'PLACED_CANONICAL'
        canon=loc
        counts['placed']+=1;bymod[mdir][t2]+=1;bysub[(mdir,st)][t2]+=1
    counts[integ.split('_')[0]]+=1
    acc.append([zn,fn,xp,sha,mod,sem,t2,yr,src,prov,conf,loc,dup,dupof,cs,notes,st,integ,canon])
# liens doublon -> chemin canonique réel
path_by_sha={r[11]:1 for r in acc}
sha2loc={}
for r in acc:
    if r[17].startswith('PLACED'):sha2loc.setdefault(r[3],r[11])
nlinks=0
for r in acc:
    if r[12]=='EXACT_DUPLICATE' and r[3] in sha2loc:
        r[18]='canonical copy: '+sha2loc[r[3]];nlinks+=1
    if r[17]=='PLACED_CANONICAL':
        n=sum(1 for x in acc if x[3]==r[3] and x is not r)
        r[18]='canonical'+(f' of {n} exact duplicates' if n else '')
# paires examen<->correction (jaccard>=.5, même dossier)
def tk(p):
    bn=re.sub(r'\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|txt)$','',os.path.basename(p).lower(),flags=re.I)
    return set(re.findall(r'[a-z0-9]{3,}',norm(bn)))-{'examen','corrig','corrige','solution','solutions','reponse','reponses','avec','de','la','le','les','des','un','une','pour','du','et','n','mi','l1','s1','s2','2023','2024','2025','2026','2021','2022','2019','2020','pdf'}
cand={}
for i,r in enumerate(acc):
    if r[11] in('—','') or not os.path.exists(os.path.join(SM,r[11])):continue
    t=tk(r[11])
    if len(t)>=2:cand.setdefault(os.path.dirname(r[11]),[]).append((i,t))
npair=0
for d,lst in cand.items():
    exs=[(i,t) for i,t in lst if acc[i][6] in('EXAM','EXAM_CORRECTION')]
    cos=[(i,t) for i,t in lst if acc[i][6] in('CORRECTION','EXAM_CORRECTION') and acc[i][6]!='EXAM']
    for i,ti in exs:
        for j,tj in cos:
            if i==j:continue
            if len(ti&tj)/max(1,len(ti|tj))>=0.5:
                acc[i][15]=(acc[i][15]+'; ' if acc[i][15] else '')+'pair-correction: '+acc[j][11]
                acc[j][15]=(acc[j][15]+'; ' if acc[j][15] else '')+'pair-examen: '+acc[i][11]
                npair+=1;acc[i][6]='EXAM_CORRECTION';break
with open('notes/inventory.tsv','w',encoding='utf8') as f:
    f.write('\t'.join(NEWCOLS)+'\n')
    for r in acc:f.write('\t'.join(x.replace('\t',' ') for x in r)+'\n')
res=dict(rows=len(acc),counts=dict(counts),links=nlinks,pairs=npair,
 modules={m:dict(c) for m,c in bymod.items()},
 subtopics={'/'.join(k):dict(v) for k,v in bysub.items()},
 total_placed_on_disk=sum(1 for r in acc if r[11]!='—' and r[11] and os.path.exists(os.path.join(SM,r[11]))))
json.dump(res,open('/tmp/phase2.json','w'),indent=1,ensure_ascii=False)
print(json.dumps(dict(rows=res['rows'],counts=res['counts'],links=nlinks,pairs=npair,placed=res['total_placed_on_disk']),indent=1))
print('modules:',json.dumps({m:sum(c.values()) for m,c in bymod.items()},ensure_ascii=False))
