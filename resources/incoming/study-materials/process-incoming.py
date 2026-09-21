#!/usr/bin/env python3
"""Traitement du dépôt raw/ — cf. PROCESSING.md. raw/ est en lecture seule."""
import os, re, sys, json, shutil, zipfile, hashlib, unicodedata
ROOT=os.getcwd(); RAW=os.path.join(ROOT,'raw'); EXT=os.path.join(ROOT,'extracted'); ORG=os.path.join(ROOT,'organized'); NOTES=os.path.join(ROOT,'notes')
COLS=['original_archive','original_filename','extracted_path','sha256','module','semester','material_type','academic_year','source','provenance','classification_confidence','organized_location','duplicate_status','duplicate_of','content_status','notes']
def norm(s):
    s=unicodedata.normalize('NFD',(s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c)!='Mn')
def sha256(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda:f.read(1<<20),b''):h.update(c)
    return h.hexdigest()
def magic(p):
    with open(p,'rb') as f:b=f.read(16)
    if b[:4]==b'%PDF':return 'pdf'
    if b[:4]==b'PK\x03\x04':return 'zipfam'
    if b[:8]==b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':return 'ole'
    if b[:4]==b'Rar!':return 'rar'
    if b[:6]==b'7z\xbc\xaf\x27\x1c':return '7z'
    if b[:8]==b'\x89PNG\r\n\x1a\n':return 'png'
    if b[:3]==b'\xff\xd8\xff':return 'jpeg'
    if b[:4]==b'GIF8':return 'gif'
    if b[:5]==b'%PDF-':return 'pdf'
    return 'other'
MOD={
'S1/Structure-de-machine-1':(r'structure\s*de\s*(la\s*)?machine\s*1|\bsm\s*1\b|\bstrm\s*1\b|\bstrm1\b',{}),
'S2/Structure-de-machine-2':(r'structure\s*de\s*(la\s*)?machine\s*2|\bsm\s*2\b|\bstrm\s*2\b|\bstrm2\b',{}),
'S1/Analyse-1':(r'\banalyse\s*1\b',{}),
'S2/Analyse-2':(r'\banalyse\s*2\b',{}),
'S1/Algebre-1':(r'algebre\s*1\b',{}),
'S2/Algebre-2':(r'algebre\s*2\b',{}),
'S1/Algorithmique-1':(r'algorithmique\s*1|\balgo\s*1\b|\basd\s*1\b',{}),
'S2/ASD-2':(r'algorithmique\s*et\s*structures?\s*de\s*donnees\s*2|\basd\s*k?\s*2\b',{}),
'S1/Electricite-generale':(r'electricite\s*(generale|generalisee)|electrostatique|electrocinetique',{}),
'S1/Logiciels-libres':(r'logiciels?\s*libres?|open\s*source\s*(course|cours)',{}),
'S1/Anglais-1':(r'\banglais\s*1\b|english\s*for\s*(academic|engineers)|\benglish\s*1\b',{}),
'S1/Histoire':(r'\bhistoire\b',{}),
'S2/Logique-mathematique':(r'logique\s*mathematique|\blogique\s*1\b',{}),
'S2/Introduction-a-l-IA':(r'intelligence\s*artificielle|introduction\s*a\s*l.{0,3}\sia\b|\bia\b',{}),
'S2/Electronique-generale':(r'electronique\s*(generale|analogique|numerique)?',{}),
'S2/Citoyennete-et-patriotisme':(r'citoyennete|patriotisme',{}),
}
KW={
'S1/Structure-de-machine-1':{'numerotation':3,'binaire':1,'octal':3,'hexadecimal':2,'complement a deux':4,'ieee 754':4,'algebre de boole':3,'codage':1,'base 2':3,'systemes de numeration':4},
'S2/Structure-de-machine-2':{'additionneur':4,'demi additionneur':5,'multiplexeur':4,'demultiplexeur':4,'bascule':4,'compteur asynchrone':5,'logique sequentielle':5,'logique combinatoire':4,'karnaugh':3,'decodeur':3,'soustracteur':4,'registre a decalage':5},
'S1/Analyse-1':{'suite numerique':4,'limite':1,'continuite':3,'derivabilite':3,'developpement limite':4,'taylor':4,'equivalent':2,'primitive':2,'numerabilite':3,'recurrence':2,'encadrement':2,'partie entiere':3,'suites monotones':4},
'S2/Analyse-2':{'integrale impropre':5,'integration':1,'serie entiere':5,'serie de fourier':5,'calcul differentiel':5,'equation differentielle':4,'champ scalaire':5,'champs vectoriels':5,'suites et series de fonctions':5,'integrale double':5,'convolution':3},
'S1/Algebre-1':{'divisibilite':3,'congruence':4,'pgcd':3,'ppcm':3,'z/nz':5,'nombres premiers':3,'arithmetique':2,'systeme modulaire':4,'division euclidienne':4,'bezout':4,'chinois (reste':3,'premier entre eux':3},
'S2/Algebre-2':{'espace vectoriel':5,'application lineaire':5,'matrice':1,'determinant':3,'groupe':1,'anneau':4,'polynome':1,'structure algebrique':5,'noyau':1,'image':1,'base (alg':3,'dimension':3,'endomorphisme':5,'sous-espace':4,'bilibaire':4,'quadratique':3,'algebraic structure':4,'linear map':3,'vector space':4},
'S1/Algorithmique-1':{'algorithme':2,'pseudo-code':4,'affectation':3,'tant que':2,'pour la':1,'organigramme':4,'algorithme de tri':4,'saisie':2,'traitement':1,'structure de donnees':2,'variable':1,'condition':1,'boucle':2,'ppl':3,'invariant':2},
'S2/ASD-2':{'liste chainee':5,'maillon':5,'pointeur':3,'allocation dynamique':5,'arbre binaire':5,'graphe':1,'file d attente':3,'pile (structure':4,'fichier binaire':4,'double chainee':5,'language c':3,'programmation en c':4,'#include':5,'struct ':4,'malloc':5,'free(':3,'table de hachage':5,'parcours (arbre':4},
'S1/Electricite-generale':{"loi d'ohm":4,'ohm':2,'courant':1,'tension':1,'resistance':2,'condensateur':4,'bobine':4,'thevenin':5,'norton':5,'mailles':4,'noeuds':4,'kirchhoff':5,'dipole':3,'champ electrique':4,'electrostatique':5,'capacite':1,'self-induction':5,'fluux':3,'gauss':4,'charges electriques':4},
'S1/Logiciels-libres':{'linux':4,'ligne de commande':4,'bash':4,'ubuntu':4,'debian':3,'terminal':2,'open source':4,'logiciels libres':5,'gnu':4,'free software':4,'editeur':1,'vim':3,'emacs':3,'systeme d exploitation':2,'chmod':5,'grep':5},
'S1/Anglais-1':{'english':3,'vocabulary':4,'grammar':4,'reading comprehension':4,'present simple':5,'past tense':4,'writing skills':4,'phrasal verb':5,'tenses':3,'listening':3,'french':1},
'S1/Histoire':{'histoire':2,'civilisation':2,'colonisation':3,'revolution':1,'patrimoine':2,'guerre mondiale':4,'algerie (histoire':4,'mouvement national':4,'egypte ancienne':4,'mesopotamie':4,'antiquite':3},
'S2/Logique-mathematique':{'logique':3,'propositions':3,'predicats':5,'quantificateurs':5,'tautologie':5,'contradiction':3,'modele (logique':4,'raisonnement':2,'demonstration':2,'validite':3,'inférence':1,'deduction':3,'semantique':2,'syntaxe (logique':4,'formalisation':3},
'S2/Introduction-a-l-IA':{'agent intelligent':5,'heuristique':4,'recherche a*':5,'a-star':4,'apprentissage':2,'systemes experts':5,'logique floue':5,'resolution':1,'unification':5,'graphes (et':1,'intelligence artificielle':5,'machine learning':3,'perceptron':5,'recherche locale':4,'informed search':4,'algorithme gen':3},
'S2/Electronique-generale':{'diode':5,'transistor':5,'jonction pn':5,'aop':5,'amplificateur':5,'polarisation':3,'mosfet':5,'bjt':5,'redresseur':5,'filtre actif':4,'electrique (circuit':1,'oscilloscope':3,'bode':4,'hacheur':5,'thyristor':5,'regulateur':4},
'S2/Citoyennete-et-patriotisme':{'societe civile':4,'droits de l homme':4,'valeurs':1,'developpement durable':2,'citoyen':3,'constitution':2,'democratie':3,'engagement':1,'ethique':2,'devoirs':2,'patrie':4,'national (sentiment':3,'identite':2},
}
TYPE=[('corrig','Corrigé'),('corrige','Corrigé'),('reponse','Corrigé'),('solution','Corrigé'),('annale','Annales'),('examen','Examen'),('epreuve','Examen'),('emd','Examen'),('rattrapage','Examen'),('partiel','Examen'),('test','Examen'),('serie','Série'),('td','TD'),('travaux diriges','TD'),('tp','TP'),('travaux pratiques','TP'),('resume','Résumé'),('revision','Résumé'),('fiche','Résumé'),('cours','Cours'),('chapitre','Cours'),('chapter','Cours'),('polycopie','Cours'),('support','Support'),('presentation','Support'),('diaporama','Support')]
def mtype(fn,txt):
    h=norm(fn)+' '+norm(txt[:400])
    toks=set(re.findall(r'[a-z]+',norm(fn)))
    for k,v in TYPE:
        if k in h:return v
    return 'Other'
def year(fn,txt):
    h=norm(fn+' '+txt[:2500])
    m=re.search(r'(20(?:1[5-9]|2[0-9]))\s*[-/–]\s*(?:20)?(?:\s*)(1[6-9]|2[0-9])',h)
    if m:
        a=int(m.group(1));b=int('20'+m.group(2))
        return f'{a}-{b}' if b==a+1 else f'{a}-{b}'
    m=re.search(r'(?:annee|session)\s*(?:universitaire)?\s*[:( ]?\s*(20\d\d)',h)
    if m:
        a=int(m.group(1));return f'{a}-{a+1}'
    ms=re.findall(r'\b(20\d\d)\b',h)
    return (f'{ms[0]} (explicite dans le contenu)' if ms else 'ACADEMIC_YEAR_UNKNOWN')
def university(txt,fn):
    h=norm(txt[:3000]+' '+fn)
    if 'annaba' in h or 'badji' in h or 'ubma' in h:return 'OFFICIAL_UBMA'
    if 'univ' in h or 'universite' in h or 'faculte' in h or 'fac ' in h:return 'PUBLIC_UNIVERSITY'
    return 'UNKNOWN'
def text_of(p,t):
    try:
        if t in('pdf',):
            from pypdf import PdfReader
            r=PdfReader(p);n=len(r.pages)
            txt=''
            for pg in r.pages[:12]:txt+=(pg.extract_text() or '')+'\n'
            return ('PDF_NO_TEXT_LAYER' if len(txt.strip())<40 else 'pdf_parsed'),txt[:8000],n
        if t=='zipfam':
            with zipfile.ZipFile(p) as z:
                names=z.namelist()
            if any(x.startswith('word/') for x in names) or any(x.startswith('ppt/') for x in names) or any(x.startswith('xl/') for x in names):
                with zipfile.ZipFile(p) as z:
                    parts=[x for x in z.namelist() if x=='word/document.xml' or x.startswith('ppt/slides/slide') or x=='xl/sharedStrings.xml']
                    buf=''
                    for nm in parts[:40]:
                        try:buf+=re.sub(r'<[^>]+>',' ',z.read(nm).decode('utf8','ignore'))+' '
                        except Exception:pass
                    return 'office_parsed',buf[:8000],len(parts)
            return None,None,None
        if t=='ole':
            data=open(p,'rb').read(3_000_000)
            chunks=re.findall(rb'[\x20-\x7e]{6,}',data)
            txt=' '.join(c.decode() for c in chunks)[:5000]
            return ('ole_crude_text' if len(txt)>200 else 'ole_unreadable'),txt,None
        if t in('png','jpeg','gif'):return 'IMAGE_NO_OCR','',None
        if t=='rar':return 'ARCHIVE_BLOCKED(rar)',norm(os.path.basename(p)),None
        if t=='7z':return 'ARCHIVE_BLOCKED(7z)',norm(os.path.basename(p)),None
        raw=open(p,'rb').read(10000)
        try:
            s=raw.decode('utf8')
            return 'text',s,None
        except Exception:pass
        return 'binary_no_text','',None
    except Exception as e:
        return 'parse_error:'+type(e).__name__,'',None
def safe_join(base,name):
    name=name.replace('\\','/').replace('..','_dot_').lstrip('/')
    p=os.path.join(base,name);os.makedirs(os.path.dirname(p) or base,exist_ok=True)
    return p
def uniq(p):
    if not os.path.exists(p):return p
    b,e=os.path.splitext(p);i=2
    while os.path.exists(f'{b}__dup{i}{e}'):i+=1
    return f'{b}__dup{i}{e}'
def classify(fn,txt):
    hay=norm(fn)+' \n'+norm(txt)
    sc={}
    for m,(rx,kw) in MOD.items():
        s=0;ev=[]
        if re.search(rx,hay):s+=6;ev.append('nom/explicite')
        for k,w in KW[m].items():
            c=hay.count(norm(k))
            if c:s+=min(c,3)*w;ev.append(k)
        sc[m]=(s,ev)
    ranked=sorted(sc.items(),key=lambda kv:-kv[1][0])
    top,ts0=ranked[0][0],ranked[0][1][0]
    ts=ts0
    sec=ranked[1][1][0] if len(ranked)>1 else 0
    if ts>=6 and ts>=2*max(sec,1):mod,conf=top,'HIGH'
    elif ts>=4 and ts>sec:mod,conf=top,'MEDIUM'
    elif ts>=2 and ts>sec:mod,conf=top,'LOW'
    else:mod,conf=None,'LOW'
    return mod,conf,top,ts,sec
rows=[];bysha={};bytext={}
agg=dict(zips=0,zok=0,zbad=0,files=0,dirs=0,high=0,med=0,low=0,unc=0,edup=0,ldup=0,blocked=0,notext=0,orgcopied=0)
arch_rows=[]
def record(archive,origname,path_rel,sha,mod,conf,top,ts,sec,mt,yr,src,cs,txt,np_,extra=''):
    n=len(rows)+1
    if not mod:
        sem='UNCLASSIFIED';mstr='UNCLASSIFIED';dest=os.path.join(ORG,'UNCLASSIFIED')
        if cs.startswith('ARCHIVE_BLOCKED'):mstr='UNCLASSIFIED';extra=(extra+'; ' if extra else '')+'ARCHIVE_BLOCKED: gardé mais illisible sans outil 7z/rar'
    else:
        sem=mstr=mod;dest=os.path.join(ORG,*mod.split('/'))
    if not mt:mt='Other'
    tgt=uniq(safe_join(dest,os.path.basename(path_rel) if path_rel else origname))
    try:
        if path_rel and os.path.exists(os.path.join(ROOT,path_rel)):
            shutil.copy2(os.path.join(ROOT,path_rel),tgt);agg['orgcopied']+=1
        orgrel=os.path.relpath(tgt,ROOT)
    except Exception as e:orgrel='COPY_FAIL:'+type(e).__name__
    dup='NEW';dupof=''
    if sha in bysha:
        dup='EXACT_DUPLICATE';dupof=bysha[sha];agg['edup']+=1
    else:
        bysha[sha]=f'{archive}/{path_rel or origname}'
        if len(txt)>200:
            th=hashlib.sha256(re.sub(r'\s+',' ',norm(txt))[:3000].encode()).hexdigest()
            if th in bytext:
                dup='LIKELY_DUPLICATE';dupof=bytext[th];agg['ldup']+=1
            else:bytext[th]=f'{archive}/{path_rel or origname}'
    if conf=='HIGH':agg['high']+=1
    elif conf=='MEDIUM':agg['med']+=1
    else:agg['low']+=1
    if not mod:agg['unc']+=1
    if cs in('PDF_NO_TEXT_LAYER','ole_unreadable','IMAGE_NO_OCR','binary_no_text'):agg['notext']+=1
    rows.append({COLS[0]:archive,COLS[1]:origname,COLS[2]:path_rel,COLS[3]:sha,COLS[4]:mstr,COLS[5]:sem.split('/')[0] if mod else 'UNCLASSIFIED',COLS[6]:mt,COLS[7]:yr,COLS[8]:src,COLS[9]:'TELEGRAM_USER_PROVIDED',COLS[10]:conf,COLS[11]:orgrel,COLS[12]:dup,COLS[13]:dupof,COLS[14]:cs+(f' ({np_}p)' if np_ else ''),COLS[15]:extra})
def handle(archive,fp,origname):
    sha=sha256(fp);t=magic(fp)
    if t=='zipfam':
        try:
            with zipfile.ZipFile(fp) as z:
                names=z.namelist()
            if not any(x.startswith(('word/','ppt/','xl/')) for x in names):
                sub=fp+'_nested';mem=[]
                with zipfile.ZipFile(fp) as z2:
                    mem=[i for i in z2.infolist() if not i.is_dir()]
                    for i in mem:
                        d2=uniq(safe_join(sub,i.filename))
                        with z2.open(i) as src2:
                            with open(d2,'wb') as out2:
                                shutil.copyfileobj(src2,out2)
                        handle(archive,d2,origname+' :: '+i.filename)
                return
        except Exception:pass
    cs,txt,np_=text_of(fp,t)
    if cs is None:cs='unknown_format'
    if cs.startswith('ARCHIVE_BLOCKED'):agg['blocked']+=1
    mod,conf,top,ts,sec=classify(origname,txt or '')
    note_extra=''
    _hn=norm(origname)
    _fm=None
    for _m,(_rx,_kw) in MOD.items():
        if re.search(_rx,_hn):_fm=_m;break
    if _fm and _fm!=mod:
        if mod:note_extra='contradiction nom/contenu (contenu->'+mod+')'
        mod,conf=_fm,'MEDIUM'
    elif _fm and _fm==mod and conf=='LOW':conf='MEDIUM'
    mt=mtype(origname,txt or '');yr=year(origname,txt or '');src=university(txt or '',origname)
    rel=os.path.relpath(fp,ROOT)
    record(archive,origname,rel,sha,mod,conf,top,ts,sec,mt,yr,src,cs,txt or '',np_,note_extra)
for zn in sorted(os.listdir(RAW)):
    zp=os.path.join(RAW,zn)
    if not zn.lower().endswith('.zip') or not os.path.isfile(zp):continue
    agg['zips']+=1;zsha=sha256(zp);outdir=os.path.join(EXT,zn[:-4]);os.makedirs(outdir,exist_ok=True)
    try:zf=zipfile.ZipFile(zp)
    except Exception as e:
        agg['zbad']+=1;arch_rows.append([zn,os.path.relpath(zp,ROOT),os.path.getsize(zp),zsha,'CORRUPTED','0',f'ERR {e}','']);continue
    agg['zok']+=1;cnt=0;bad=zf.testzip();nerr=1 if bad else 0
    for i in zf.infolist():
        if i.is_dir():agg['dirs']+=1;continue
        d=uniq(safe_join(outdir,i.filename))
        try:
            with zf.open(i) as s,open(d,'wb') as o:shutil.copyfileobj(s,o)
        except Exception as e:
            cnt+=1;record(zn,i.filename,'',hashlib.sha256(i.filename.encode()).hexdigest(),None,'LOW',None,0,0,'Other','ACADEMIC_YEAR_UNKNOWN','UNKNOWN','EXTRACT_FAIL:'+type(e).__name__,'',None,extra='extraction impossible: '+str(e)[:60]);continue
        cnt+=1;handle(zn,d,i.filename)
    agg['files']+=cnt
    arch_rows.append([zn,os.path.relpath(zp,ROOT),os.path.getsize(zp),zsha,'OK' if not nerr else 'CRC_ERROR_IN:'+str(bad)[:40],str(cnt),'extracted to '+os.path.relpath(outdir,ROOT),''])
os.makedirs(NOTES,exist_ok=True)
with open(os.path.join(NOTES,'inventory.tsv'),'w',encoding='utf8') as f:
    f.write('\t'.join(COLS)+'\n')
    for r in rows:f.write('\t'.join((r[c] or '').replace('\t',' ').replace('\n',' ') for c in COLS)+'\n')
with open(os.path.join(NOTES,'archive-inventory.tsv'),'w',encoding='utf8') as f:
    f.write('archive_filename\tarchive_path\tsize_bytes\tsha256\tarchive_status\tcontained_file_count\textraction_status\tnotes\n')
    for r in arch_rows:f.write('\t'.join(str(x) for x in r)+'\n')
agg['rows']=len(rows)
json.dump(agg,open('/tmp/agg.json','w'),indent=1)
print(json.dumps(agg,indent=1))
print('modules:',json.dumps({m:sum(1 for r in rows if r['module']==m) for m in set(r['module'] for r in rows)},ensure_ascii=False))
print('types:',json.dumps({t:sum(1 for r in rows if r['material_type']==t) for t in set(r['material_type'] for r in rows)},ensure_ascii=False))
