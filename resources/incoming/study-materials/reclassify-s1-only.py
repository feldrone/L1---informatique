#!/usr/bin/env python3
"""Correction S1-only (2026-09-21) : le lot actuel de 627 fichiers = collection S1 de l'utilisateur.
Retire toute affectation S2 : re-audit par preuve, déplacement des copies organized/, ré-écriture de
l'inventaire. Ne touche JAMAIS raw/ ni extracted/."""
import os,re,shutil,collections,unicodedata,functools,hashlib,json
SM=os.getcwd()
def norm(x):
    x=unicodedata.normalize('NFD',(x or '').lower());return ''.join(c for c in x if unicodedata.category(c)!='Mn')
def sha256(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda:f.read(1<<20),b''):h.update(c)
    return h.hexdigest()
@functools.lru_cache(maxsize=4096)
def peek(relpath):
    p=os.path.join(SM,relpath) if relpath else ''
    if not relpath or not os.path.exists(p):return ''
    if p.lower().endswith('.pdf'):
        try:
            from pypdf import PdfReader
            r=PdfReader(p,strict=False);t=''
            for pg in r.pages[:4]:t+=(pg.extract_text() or '')+'\n'
            return t[:1500]
        except Exception:return ''
    try:return open(p,encoding='utf8',errors='ignore').read(1500)
    except Exception:return ''
S1EX={
'S1/Structure-de-machine-1':r'structure (de la |du )?machine\s*1|\bstrm\s*1\b|\bsm\s*1\b|sm1\b',
'S1/Analyse-1':r'analyse\s*1\b|analys(1|e1)\b',
'S1/Algebre-1':r'algebre\s*1\b',
'S1/Algorithmique-ASD-1':r'algorithmique\s*(1|s1)|\basd\s*1\b|\basdk\s*1\b|\balgo\s*1\b|algo1\b',
'S1/Anglais-1-TCE-1':r'anglais\s*1\b|english\s*(1|s1)\b|\btce\s*1\b',
'S1/Logiciels-libres':r'(logiciels? libres?|open ?source|linux|bash|shell)\b',
'S1/Electricite-generale':r'electricit(e|e) (generale|g(e|é)n)|electrostatique|kirchhoff|thevenin|norton|loi d.?ohm',
'S1/Histoire':r'\bhistoire\b|colonisation|civilisation|rev\.? algerienne',
}
S2HINT=r'analyse\s*2\b|algebre\s*2\b|structure (de la )?machine\s*2|\bstrm2\b|\bsm2\b|\basd\s*2\b|\basdk\s*2\b|logique\s*math|predicats|quantificateurs|intelligence artificielle|\belectronique\b|citoyennete|patriotisme|semestre\s*2\b|\bs2\b|licence ?2'
BK='notes/inventory-pre-s1only.tsv'
if not os.path.exists(BK):shutil.copy2('notes/inventory.tsv',BK)
lines=open(BK,encoding='utf8').read().rstrip('\n').split('\n')
COLS=lines[0].split('\t');rows=[l.split('\t') for l in lines[1:]]
assert len(rows)==627 and all(len(r)==19 for r in rows)
C=collections.Counter()
def uniq(p):
    if not os.path.exists(p):return p
    b,e=os.path.splitext(p);i=2
    while os.path.exists(f'{b}__r{i}{e}'):i+=1
    return f'{b}__r{i}{e}'
moved=[]
for r in rows:
    (zn,fn,xp,sha,mod,sem,typ,yr,src,prov,conf,loc,dup,dupof,cs,notes,st,integ,canon)=r
    if sem=='S2' or mod.startswith('S2/'):
        C['audit']+=1
        hay=norm(fn)+' '+norm(peek(xp))
        newmod=None;why=''
        for m,rx in S1EX.items():
            if re.search(rx,hay):
                # refus si le marqueur S1 est contredit par une mention S2 explicite du MÊME module
                if m=='S1/Analyse-1' and re.search(r'analyse\s*2',hay):continue
                if m=='S1/Algebre-1' and re.search(r'algebre\s*2',hay):continue
                if m=='S1/Structure-de-machine-1' and re.search(r'(machine\s*2|\bsm\s*2\b|strm2)',hay):continue
                newmod=m;why='preuve S1 explicite (contenu/nom)';conf=conf if conf=='HIGH' else 'MEDIUM';break
        if not newmod:
            C['to-unc']+=1
            hint='; contenu évocateur d\'un programme S2 (logique/analyse 2/ASD-C/électronique/…)' if re.search(S2HINT,hay) else ''
            newmod='UNCLASSIFIED'
            why='aucune preuve rattachable aux 8 modules S1 — en attente du lot S2 pour arbitrage'+hint
            conf='LOW'
        else:C['to-s1']+=1
        oldloc=loc
        if integ.startswith('PLACED') and loc not in('—',''):
            destdir=os.path.join(SM,'organized',newmod,'Autres' if newmod=='UNCLASSIFIED' else os.path.dirname(loc).split('/')[-1])
            os.makedirs(destdir,exist_ok=True)
            tgt=uniq(os.path.join(destdir,os.path.basename(loc)))
            shutil.copy2(os.path.join(SM,loc),tgt)
            assert sha256(tgt)==sha
            os.remove(os.path.join(SM,loc));moved.append((loc,os.path.relpath(tgt,SM)))
            loc=os.path.relpath(tgt,SM)
        r[4]=newmod;r[5]='S1'
        r[11]=loc if r[11] not in('—','') or not integ.startswith('PLACED') else '—'
        if dup=='EXACT_DUPLICATE':r[11]='—'
        r[15]=(notes+'; ' if notes else '')+f'Corr. S1-only 2026-09-21 : ancien module {mod} retiré (lot courant = S1 uniquement) — {why}'
    elif sem=='UNCLASSIFIED':
        r[5]='S1';C['sem-forced']+=1
    elif sem=='S1':
        pass
# réindexation des liens canoniques des doublons (certains ont bougé)
sha2loc={}
for r in rows:
    if r[17].startswith('PLACED') and r[11] not in('—',''):sha2loc.setdefault(r[3],r[11])
nfix=0
for r in rows:
    if r[12]=='EXACT_DUPLICATE':
        newc=sha2loc.get(r[3])
        if newc and (not r[18].endswith(newc)):
            r[18]='canonical copy: '+newc;nfix+=1
    if r[17]=='PLACED_CANONICAL':
        n=sum(1 for x in rows if x[3]==r[3] and x is not r)
        r[18]='canonical'+(f' of {n} exact duplicates' if n else '')
# purge du vieil arbre S2 local (.gitkeep + dossiers vides) — copies uniquement, jamais les originaux
for root,dirs,fs in os.walk(os.path.join(SM,'organized','S2'),topdown=False):
    for f in fs:
        if os.path.getsize(os.path.join(root,f))==0:os.remove(os.path.join(root,f))
    for d in dirs:
        try:os.rmdir(os.path.join(root,d))
        except OSError:pass
try:os.rmdir(os.path.join(SM,'organized','S2'))
except OSError:pass
with open('notes/inventory.tsv','w',encoding='utf8') as f:
    f.write('\t'.join(COLS)+'\n')
    for r in rows:f.write('\t'.join(x.replace('\t',' ') for x in r)+'\n')
json.dump(dict(audit=C['audit'],to_s1=C['to-s1'],to_unc=C['to-unc'],sem_forced_untouched=C['sem-forced'],
 canonical_relinks=nfix,moved_copies=len(moved),moves=moved[:40]),open('/tmp/s1fix.json','w'),indent=1,ensure_ascii=False)
print(json.dumps(dict(audit=C['audit'],to_s1=C['to-s1'],to_unc=C['to-unc'],canonical_relinks=nfix,moved=len(moved)),indent=1))
print('restants S2 modules:',sum(1 for r in rows if r[4].startswith('S2/')),'| sem S2:',sum(1 for r in rows if r[5]=='S2'))
print('nouveaux modules:',json.dumps(dict(collections.Counter(r[4] for r in rows)),ensure_ascii=False))
