#!/usr/bin/env python3
"""Pré-inventaire du dépôt raw/ : sha256, taille, type réel (signatures), doublons exacts.
Ne classe pas les modules (réservé à l'agent, sur preuve de contenu). Ne modifie jamais raw/."""
import hashlib, os, sys
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw')
MAGIC = [(b'%PDF', 'pdf'), (b'PK\x03\x04', 'zip-office-or-zip'), (b'\x89PNG', 'png'),
         (b'\xff\xd8\xff', 'jpeg'), (b'GIF8', 'gif'), (b'Rar!', 'rar'), (b'7z\xbc\xaf', '7z'),
         (b'%!PS', 'postscript'), (b'\xd0\xcf\x11\xe0', 'ole-doc-legacy')]
def sig(head):
    for m, t in MAGIC:
        if head.startswith(m): return t
    return 'unknown-binary' if any(b > 127 for b in head[:64]) else 'text'
rows, seen, dup = [], {}, []
for name in sorted(os.listdir(RAW)):
    p = os.path.join(RAW, name)
    if not os.path.isfile(p) or name in ('README.md', '.gitkeep'): continue
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''): h.update(chunk)
    size = os.path.getsize(p)
    with open(p, 'rb') as f: head = f.read(64)
    d = h.hexdigest()
    status = 'NEW'
    if d in seen: status, dup_msg = 'EXACT_DUPLICATE', f'{name} == {seen[d]}'
    else: seen[d] = name
    if size == 0: status = 'EMPTY-SUSPECT'
    rows.append((name, str(size), sig(head), d[:16], status))
for r in rows: print('\t'.join(r))
print(f'# {len(rows)} fichier(s) scanné(s) dans raw/', file=sys.stderr)
