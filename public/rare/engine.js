// RARE engine: reading the prompt lists, matching typed answers, and choosing
// each day's prompts. No DOM here, so `npm run check:game` can run it in Node.

window.RARE_ENGINE = (function (LISTS) {
  // Doneness, from no answer to almost nobody says it. The index is the tier.
  var TIERS = [
    { key: 'burnt', points: 0 },
    { key: 'welldone', points: 10 },
    { key: 'medium', points: 25 },
    { key: 'rare', points: 50 },
    { key: 'blue', points: 75 },
    { key: 'tartare', points: 100 },
  ];

  var ROUNDS = 7;
  var FIRST_DAY = '2026-11-19'; // game #1
  var DAY_MS = 86400000;

  // Text ---------------------------------------------------------------------------

  var STOP = {};
  ('a an the some my of and n s le la les l un une des du de d au aux et en')
    .split(' ')
    .forEach(function (w) {
      STOP[w] = true;
    });

  // Lower case, no accents or punctuation, no filler words, rough singulars:
  // "Les Crêpes!" -> "crepe", "Piment d'Espelette" -> "piment espelette".
  function norm(s, keepWords) {
    var words = String(s)
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    if (keepWords) return words.join(' ');
    return words
      .filter(function (w) {
        return !STOP[w];
      })
      .map(function (w) {
        return w.length > 3 ? w.replace(/[sx]$/, '') : w;
      })
      .join(' ');
  }

  function slug(s) {
    return norm(s, true).replace(/ /g, '-');
  }

  // Optimal string alignment distance (Levenshtein plus swapped letters).
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = null;
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev.push(j);
    for (var i = 1; i <= a.length; i++) {
      var cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur.push(v);
        if (v < best) best = v;
      }
      if (best > max) return max + 1;
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  function allowedTypos(key) {
    var n = key.replace(/ /g, '').length;
    return n >= 9 ? 2 : n >= 5 ? 1 : 0;
  }

  // Prompts ------------------------------------------------------------------------

  // Each answer is 'Name|alias|alias', or 'English / French|alias' when the two
  // languages show it differently. Answers are separated by commas.
  function parseAnswer(entry, tier) {
    var names = entry.split('|').map(function (s) {
      return s.trim();
    }).filter(Boolean);
    var shown = names[0].split(' / ');
    var en = shown[0].trim();
    var fr = (shown[1] || shown[0]).trim();
    return { id: slug(en), tier: tier, en: en, fr: fr, names: [en, fr].concat(names.slice(1)) };
  }

  function parsePrompt(raw, menu) {
    var answers = [];
    for (var tier = 1; tier < TIERS.length; tier++) {
      String(raw[TIERS[tier].key] || '')
        .split(',')
        .forEach(function (entry) {
          if (entry.trim()) answers.push(parseAnswer(entry, tier));
        });
    }
    var index = [];
    var byId = {};
    answers.forEach(function (a) {
      byId[a.id] = a;
      var seen = {};
      a.names.forEach(function (name) {
        var key = norm(name);
        if (!key || seen[key]) return;
        seen[key] = true;
        var words = key.split(' ');
        index.push({ key: key, words: words, sorted: words.slice().sort().join(' '), answer: a });
      });
    });
    return { id: raw.id, menu: menu, en: raw.en, fr: raw.fr, answers: answers, index: index, byId: byId };
  }

  var MENUS = {};
  var PROMPT_BY_ID = {};
  ['menu', 'chef'].forEach(function (menu) {
    MENUS[menu] = (LISTS[menu] || []).map(function (raw) {
      return parsePrompt(raw, menu);
    });
    PROMPT_BY_ID[menu] = {};
    MENUS[menu].forEach(function (p) {
      PROMPT_BY_ID[menu][p.id] = p;
    });
  });

  function prompt(menu, id) {
    return PROMPT_BY_ID[menu][id] || null;
  }

  // Matching what people type ------------------------------------------------------

  // What someone meant: { answer }, { several: true } when they typed two
  // answers at once, or null. Tries, in order: an exact name, a name with a typo
  // or two, the same words in another order, then a name inside a slightly
  // longer answer ("béarnaise sauce", "fresh basil").
  function match(p, text) {
    var key = norm(text);
    if (!key) return null;
    var index = p.index;
    var i, e;
    for (i = 0; i < index.length; i++) {
      if (index[i].key === key) return { answer: index[i].answer };
    }

    var max = allowedTypos(key);
    var best = null;
    var bestD = max + 1;
    for (i = 0; i < index.length && max > 0; i++) {
      e = index[i];
      var limit = Math.min(max, allowedTypos(e.key));
      var d = distance(key, e.key, limit);
      if (d <= limit && d < bestD) {
        bestD = d;
        best = e.answer;
      }
    }
    if (best) return { answer: best };

    var words = key.split(' ');
    var sorted = words.slice().sort().join(' ');
    for (i = 0; i < index.length; i++) {
      if (index[i].sorted === sorted) return { answer: index[i].answer };
    }

    var found = [];
    for (i = 0; i < index.length; i++) {
      e = index[i];
      var k = e.words.length;
      if (k >= words.length || words.length > k + 2) continue;
      var lim = allowedTypos(e.key);
      for (var s = 0; s + k <= words.length; s++) {
        var part = words.slice(s, s + k).join(' ');
        var dist = part === e.key ? 0 : lim ? distance(part, e.key, lim) : 1;
        if (dist <= lim) found.push({ answer: e.answer, start: s, end: s + k, len: e.key.length, d: dist });
      }
    }
    if (!found.length) return null;
    found.sort(function (a, b) {
      return b.len - a.len || a.d - b.d;
    });
    var top = found[0];
    for (i = 1; i < found.length; i++) {
      var f = found[i];
      if (f.answer !== top.answer && (f.end <= top.start || f.start >= top.end)) return { several: true };
    }
    return { answer: top.answer };
  }

  // Seeded randomness, so everyone gets the same prompts on the same day ----------

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rand) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // Day 0 is FIRST_DAY. Keys are dates like "2026-11-19".
  function dayIndex(key) {
    return Math.round((Date.parse(key) - Date.parse(FIRST_DAY)) / DAY_MS);
  }

  // The prompts for every day from day 0, worked out in order: each day takes
  // the prompts that have waited longest, with a little shuffle so the same
  // seven don't keep turning up together. A prompt never comes back within
  // `gap` days. Changing a list changes the days from then on.
  var schedules = {};

  function schedule(menu, upTo) {
    var list = MENUS[menu];
    var sched = schedules[menu];
    if (!sched) {
      sched = schedules[menu] = { days: [], last: list.map(function () { return -Infinity; }) };
    }
    var cycle = list.length / ROUNDS;
    var gap = Math.max(2, Math.floor(cycle / 2));
    while (sched.days.length <= upTo) {
      var d = sched.days.length;
      var rand = rng(hash('rare:' + menu + ':' + d));
      var ranked = list
        .map(function (p, i) {
          var age = d - sched.last[i];
          return { i: i, ok: age >= gap, score: Math.min(age, 1e6) + rand() * (cycle / 1.5) };
        })
        .filter(function (r) {
          return r.ok;
        })
        .sort(function (a, b) {
          return b.score - a.score || a.i - b.i;
        })
        .slice(0, ROUNDS);
      var picked = shuffle(ranked.map(function (r) {
        return r.i;
      }), rand);
      picked.forEach(function (i) {
        sched.last[i] = d;
      });
      sched.days.push(picked);
    }
    return sched.days[upTo].map(function (i) {
      return list[i];
    });
  }

  // A prompt can be the chef's course if there's room to beat a Rare answer.
  function chefCanPlay(p) {
    var above = p.answers.filter(function (a) {
      return a.tier >= 4;
    }).length;
    return above >= 3 && p.answers.some(function (a) {
      return a.tier === 3;
    });
  }

  // The day's two menus. Today's menu is seven prompts; the Chef's Table is
  // seven harder ones, the last of which comes with the chef's own answer to beat.
  function day(key) {
    var d = Math.max(0, dayIndex(key));
    var out = { number: d + 1, menu: schedule('menu', d), chef: schedule('chef', d), chefAnswer: null };

    var rand = rng(hash('rare:chef-answer:' + d));
    var courses = out.chef.slice();
    var spot = -1;
    for (var i = courses.length - 1; i >= 0; i--) {
      if (chefCanPlay(courses[i])) {
        spot = i;
        break;
      }
    }
    if (spot !== -1) {
      var p = courses.splice(spot, 1)[0];
      courses.push(p);
      var tartare = p.answers.filter(function (a) { return a.tier === 5; });
      var tier = tartare.length >= 3 && rand() < 0.35 ? 4 : 3;
      var pool = p.answers.filter(function (a) { return a.tier === tier; });
      if (!pool.length) {
        tier = 3;
        pool = p.answers.filter(function (a) { return a.tier === 3; });
      }
      out.chefAnswer = { id: pool[Math.floor(rand() * pool.length)].id, tier: tier };
    }
    out.chef = courses;
    return out;
  }

  // A few answers worth knowing, after a round: rarer ones than yours, rarest
  // first and spread over the tiers. Always the same ones for a given seed.
  function examples(p, tier, exclude, seed, count) {
    var rand = rng(hash('rare:examples:' + seed));
    var from = tier >= 5 ? 5 : tier + 1;
    var lists = [];
    for (var t = 5; t >= Math.max(1, from); t--) {
      lists.push(shuffle(p.answers.filter(function (a) {
        return a.tier === t && exclude.indexOf(a.id) === -1;
      }), rand));
    }
    var out = [];
    for (var round = 0; out.length < count && round < 50; round++) {
      for (var i = 0; i < lists.length && out.length < count; i++) {
        if (lists[i][round]) out.push(lists[i][round]);
      }
    }
    return out;
  }

  return {
    TIERS: TIERS,
    ROUNDS: ROUNDS,
    FIRST_DAY: FIRST_DAY,
    MENUS: MENUS,
    prompt: prompt,
    norm: norm,
    distance: distance,
    allowedTypos: allowedTypos,
    match: match,
    day: day,
    dayIndex: dayIndex,
    chefCanPlay: chefCanPlay,
    examples: examples,
  };
})(window.RARE_PROMPTS || {});
