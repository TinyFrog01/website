// Checks RARE's prompt lists after you edit public/rare/menu.js or chef.js:
//   npm run check:game            problems only
//   npm run check:game -- --all   also lists near-identical answers (see below)
//
// It catches a name given to two answers in one prompt, an answer listed
// twice, missing text, and days that can't get seven prompts.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const GAME_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'rare');
const context = vm.createContext({ window: {} });
for (const file of ['menu.js', 'chef.js', 'engine.js']) {
  vm.runInContext(readFileSync(path.join(GAME_DIR, file), 'utf8'), context, { filename: file });
}
const RAW = context.window.RARE_PROMPTS;
const E = context.window.RARE_ENGINE;
const showAll = process.argv.includes('--all');

const problems = [];
const notes = [];
const TIER_KEYS = E.TIERS.slice(1).map((t) => t.key);

for (const menu of ['menu', 'chef']) {
  const ids = new Set();
  for (const raw of RAW[menu]) {
    const where = `${menu}.js "${raw.id}"`;
    if (!raw.id || !raw.en || !raw.fr) problems.push(`${where} needs an id, an English prompt and a French prompt.`);
    if (ids.has(raw.id)) problems.push(`${where}: two prompts use this id.`);
    ids.add(raw.id);
    for (const key of Object.keys(raw)) {
      if (!['id', 'en', 'fr', ...TIER_KEYS].includes(key)) problems.push(`${where}: unknown field "${key}" (tiers are ${TIER_KEYS.join(', ')}).`);
    }
    if (!raw.welldone) problems.push(`${where} has no welldone answers.`);
    for (const key of TIER_KEYS) {
      if (/\?/.test(raw[key] || '')) problems.push(`${where}: an answer in ${key} has a "?" in it.`);
    }

    const p = E.prompt(menu, raw.id);
    const seen = new Map();
    for (const a of p.answers) {
      if (seen.has(a.id)) problems.push(`${where}: "${a.en}" is listed twice (${E.TIERS[seen.get(a.id)].key} and ${E.TIERS[a.tier].key}).`);
      seen.set(a.id, a.tier);
      if (!a.en || !a.fr) problems.push(`${where}: an empty answer near "${a.en || a.fr}".`);
    }

    // One name (once accents, plurals and small words are ignored) can only mean one answer.
    const owners = new Map();
    for (const e of p.index) {
      if (!owners.has(e.key)) owners.set(e.key, new Set());
      owners.get(e.key).add(e.answer.en);
    }
    for (const [key, list] of owners) {
      if (list.size > 1) problems.push(`${where}: "${key}" is a name for ${[...list].join(' and ')}.`);
    }

    // Names close enough that a typo in one could be read as the other.
    // Exact names always win, so this is only worth a look, not an error.
    for (let i = 0; i < p.index.length; i++) {
      for (let j = i + 1; j < p.index.length; j++) {
        const a = p.index[i];
        const b = p.index[j];
        if (a.answer === b.answer) continue;
        const limit = Math.min(E.allowedTypos(a.key), E.allowedTypos(b.key));
        if (limit && E.distance(a.key, b.key, limit) <= limit) {
          notes.push(`${where}: "${a.key}" (${a.answer.en}) and "${b.key}" (${b.answer.en}) are a typo apart.`);
        }
      }
    }

    if (menu === 'chef' && !E.chefCanPlay(p)) {
      notes.push(`${where} can't be the "Beat the chef" course (it needs a Rare answer and three Blue or Tartare ones).`);
    }
  }
}

// The next 120 days: seven different prompts per menu, none repeated from the
// day before, and a chef's answer to beat.
const start = Math.max(0, E.dayIndex(new Date().toISOString().slice(0, 10)));
let prev = null;
for (let d = start; d < start + 120; d++) {
  const key = new Date(Date.parse(E.FIRST_DAY) + d * 86400000).toISOString().slice(0, 10);
  const day = E.day(key);
  for (const menu of ['menu', 'chef']) {
    const ids = day[menu].map((p) => p.id);
    if (new Set(ids).size !== E.ROUNDS) problems.push(`${key}: ${menu} gets ${new Set(ids).size} different prompts, not ${E.ROUNDS}.`);
    if (prev) {
      const again = ids.filter((id) => prev[menu].includes(id));
      if (again.length) problems.push(`${key}: ${menu} repeats yesterday's ${again.join(', ')}.`);
    }
  }
  if (!day.chefAnswer) problems.push(`${key}: no chef's answer to beat.`);
  prev = { menu: day.menu.map((p) => p.id), chef: day.chef.map((p) => p.id) };
}

for (const menu of ['menu', 'chef']) {
  const prompts = E.MENUS[menu];
  const counts = TIER_KEYS.map((_, i) => prompts.reduce((n, p) => n + p.answers.filter((a) => a.tier === i + 1).length, 0));
  const total = counts.reduce((a, b) => a + b, 0);
  console.log(`${menu === 'menu' ? 'Today’s menu' : 'Chef’s Table'}: ${prompts.length} prompts, ${total} answers (${TIER_KEYS.map((k, i) => `${k} ${counts[i]}`).join(', ')}).`);
}

if (notes.length) {
  if (showAll) console.log(`\n${notes.length} note(s):\n- ${notes.join('\n- ')}`);
  else console.log(`${notes.length} note(s) about near-identical answers; run with --all to see them.`);
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('All good.');
