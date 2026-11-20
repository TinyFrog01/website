// RARE answer matching: turns what a player typed into one of a prompt's answers.
// Loaded by the page (window.RareMatch) and by the prompt-bank checks in Node.
(function (root) {
  'use strict';

  // Points per tier. Tier 0 is a burnt course: the clock ran out.
  const POINTS = [0, 10, 25, 50, 75, 100];
  const ARTICLE = /^(the|a|an|le|la|les|l|un|une|des|du|de|d)\s+/;
  const AMBIGUOUS = -2;

  // Lower case, no accents, ligatures spelled out, anything that isn't a letter
  // or digit becomes a space.
  function fold(text) {
    return String(text)
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function words(text) {
    let s = fold(text);
    while (ARTICLE.test(s)) s = s.replace(ARTICLE, '');
    return s ? s.split(' ') : [];
  }

  // "Green beans", "green-bean" and "greenbeans" all become "greenbeans".
  const join = (list) => list.join('');

  // The word itself plus its likely singulars (English -s/-es, French -s/-x).
  function variants(key) {
    const out = [key];
    if (key.length > 3 && /[sx]$/.test(key)) out.push(key.slice(0, -1));
    if (key.length > 4 && key.endsWith('es')) out.push(key.slice(0, -2));
    return out;
  }

  // One typo forgiven from 5 letters, two from 9.
  function allowance(length) {
    if (length >= 9) return 2;
    if (length >= 5) return 1;
    return 0;
  }

  // Edit distance where swapping two neighbouring letters counts as one typo.
  function distance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev2 = null;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d = Math.min(d, prev2[j - 2] + 1);
        }
        row.push(d);
        if (d < best) best = d;
      }
      if (best > limit) return limit + 1;
      prev2 = prev;
      prev = row;
    }
    return prev[b.length];
  }

  function add(map, key, index) {
    if (!key) return;
    if (!map.has(key)) map.set(key, index);
    else if (map.get(key) !== index) map.set(key, AMBIGUOUS);
  }

  // "3Lion’s mane|Hydne hérisson|lions mane" → { tier: 3, en, fr, names: [...] }
  function parseAnswer(text) {
    const tier = Number(text[0]);
    const parts = text.slice(1).split('|').map((part) => part.trim());
    const en = parts[0];
    const fr = parts[1] || en;
    return { tier, en, fr, names: [en, fr, ...parts.slice(2)].filter(Boolean) };
  }

  // Builds the lookup tables for one prompt. Three levels, tried in order:
  // the names as written, their singular forms, and the names without the
  // prompt's filler words ("Goat cheese" → "goat").
  function prepare(prompt) {
    const answers = prompt.a.map(parseAnswer);
    const filler = new Set(words(prompt.x || ''));
    const exact = new Map();
    const plural = new Map();
    const short = new Map();
    answers.forEach((answer, index) => {
      for (const name of answer.names) {
        const list = words(name);
        const full = join(list);
        add(exact, full, index);
        for (const v of variants(full).slice(1)) add(plural, v, index);
        const kept = list.filter((w) => !filler.has(w));
        if (kept.length && kept.length < list.length) {
          for (const v of variants(join(kept))) add(short, v, index);
        }
      }
    });
    return { id: prompt.id, en: prompt.en, fr: prompt.fr, answers, filler, exact, plural, short };
  }

  // An index, -1 for no match, or AMBIGUOUS when the name belongs to two answers.
  function lookup(map, keys) {
    for (const key of keys) {
      if (map.has(key)) return map.get(key);
    }
    return -1;
  }

  // Returns the index of the matching answer, or -1.
  function match(prepared, input) {
    const list = words(input);
    if (!list.length) return -1;
    const full = join(list);
    if (full.length < 2) return -1;
    const kept = list.filter((w) => !prepared.filler.has(w));
    const trimmed = kept.length && kept.length < list.length ? join(kept) : null;

    const tries = [
      [prepared.exact, [full]],
      [prepared.plural, variants(full)],
      [prepared.exact, trimmed ? variants(trimmed) : []],
      [prepared.plural, trimmed ? variants(trimmed) : []],
      [prepared.short, variants(full).concat(trimmed ? variants(trimmed) : [])],
    ];
    for (const [map, keys] of tries) {
      const found = lookup(map, keys);
      if (found >= 0) return found;
      if (found === AMBIGUOUS) return -1;
    }

    // Typos: the closest name wins, as long as no other answer is just as close.
    let best = -1;
    let bestDistance = Infinity;
    let tie = false;
    for (const candidate of trimmed ? [full, trimmed] : [full]) {
      const limit = allowance(candidate.length);
      if (!limit) continue;
      for (const map of [prepared.exact, prepared.short]) {
        for (const [key, index] of map) {
          if (index < 0 || allowance(key.length) === 0) continue;
          const d = distance(candidate, key, limit);
          if (d > limit) continue;
          if (d < bestDistance) {
            best = index;
            bestDistance = d;
            tie = false;
          } else if (d === bestDistance && index !== best) {
            tie = true;
          }
        }
      }
    }
    return best >= 0 && !tie ? best : -1;
  }

  const api = { POINTS, fold, words, parseAnswer, prepare, match, AMBIGUOUS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RareMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
