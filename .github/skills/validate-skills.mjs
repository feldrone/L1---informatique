#!/usr/bin/env node
/**
 * validate-skills.mjs — validateur déterministe du catalogue de skills agents.
 * Usage: node .github/skills/validate-skills.mjs  (depuis la racine du dépôt ou n'importe où)
 * Sortie: lignes "FAIL: ..." / "PASS: ..." puis code retour 0 (tout conforme) ou 1.
 * Règles: exactement 15 skills généraux (hors domaine l1-study), chacun dans un
 * répertoire kebab-case contenant SKILL.md avec frontmatter YAML (name + description),
 * name == nom du répertoire, références relatives existantes, pas de doublons,
 * aucun fichier inattendu (autorisés: SKILL.md, LICENSE.txt, *.md, references/, scripts/, assets/).
 * Aucune dépendance externe, aucun réseau.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const EXCLUDED = new Set(['l1-study']);            // collection domaine L1, hors quota
const EXPECTED_GENERAL = 15;
const fails = [], notes = [];
const fail = (m) => fails.push(m);

const dirs = readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
const general = dirs.filter(d => !EXCLUDED.has(d));
if (general.length !== EXPECTED_GENERAL) fail(`nombre de skills généraux = ${general.length}, attendu ${EXPECTED_GENERAL}`);

const names = new Map();
for (const dir of general) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)) fail(`${dir}: nom de répertoire non kebab-case`);
  const skillPath = join(ROOT, dir, 'SKILL.md');
  if (!existsSync(skillPath)) { fail(`${dir}: SKILL.md absent`); continue; }
  const text = readFileSync(skillPath, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) { fail(`${dir}: frontmatter YAML absent`); continue; }
  const get = (k) => {
    const m1 = fm[1].match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm'));
    if (!m1) return null;
    let v = m1[1].trim();
    if (v === '>' || v === '|' || v === '') { // valeur repliée : prendre les lignes indentées suivantes
      const block = fm[1].slice(m1.index + m1[0].length).match(/(?:\r?\n[ \t]+.+)*/);
      v = block ? block[0].split(/\r?\n/).map(s => s.trim()).filter(Boolean).join(' ') : '';
    }
    return v.replace(/^["']|["']$/g, '').trim();
  };
  const name = get('name'), desc = get('description');
  if (!name) fail(`${dir}: champ name manquant dans le frontmatter`);
  else if (name !== dir) fail(`${dir}: name "${name}" différent du nom de répertoire`);
  if (!desc || desc.length < 20) fail(`${dir}: description absente ou trop courte`);
  if (names.has(name)) fail(`nom de skill dupliqué: ${name} (${names.get(name)} et ${dir})`);
  names.set(name, dir);
  for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)/g)) {
    const rel = m[1];
    if (!existsSync(resolve(dirname(skillPath), rel))) fail(`${dir}/SKILL.md: lien relative cassé -> ${rel}`);
  }
  const walk = (d, depth) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name), r = relative(join(ROOT, dir), p);
      if (e.isDirectory()) {
        if (!['references', 'scripts', 'assets'].includes(e.name) || depth > 0) fail(`${dir}: sous-répertoire inattendu ${r}`);
        else walk(p, depth + 1);
      } else if (!/^(SKILL\.md|LICENSE\.txt|[^/]+\.md)$/.test(r) && !/^(references|scripts|assets)\//.test(r)) {
        fail(`${dir}: fichier inattendu ${r}`);
      }
      if (e.isFile() && /(?<!\.md)$/.test(r) && !/LICENSE\.txt$/.test(r) && statSync(p).size > 60000) notes.push(`${dir}/${r}: >60Ko`);
    }
  };
  walk(join(ROOT, dir), 0);
}
if (!existsSync(join(ROOT, 'l1-study', 'SKILL.md'))) fail('l1-study/SKILL.md manquant — la collection domaine doit rester intacte');
for (const f of ['README.md', 'SOURCES.md']) if (!existsSync(join(ROOT, f))) fail(`${f} manquant`);
fails.forEach(m => console.log('FAIL:', m));
notes.forEach(m => console.log('note:', m));
if (fails.length) { console.log(`VALIDATION=FAIL (${fails.length})`); process.exit(1); }
console.log(`PASS: ${general.length} skills généraux valides + l1-study intact ; ${names.size} noms uniques ; liens relatifs résolus`);
console.log('VALIDATION=PASS');
