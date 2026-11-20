// RARE game rules: the daily menus, scores, kitchen ranks and saved progress.
// No page code here: rare.js draws the screens.
(function (root) {
  'use strict';

  const COURSES = 7;
  const SECONDS = 25;
  const MAX_SCORE = COURSES * 100;
  // Everyone gets the same menus on the same day, and the day changes at
  // midnight in Montréal.
  const TIME_ZONE = 'America/Toronto';
  // Day 1 of RARE. Puzzle numbers count from here.
  const LAUNCH = Date.UTC(2026, 10, 19);
  const DAY_MS = 864e5;
  const STORE = 'rare-v1';
  const KEEP_DAYS = 14;

  // Index = tier. Tier 0 is a burnt course: the clock ran out.
  const TIERS = [
    { id: 'burnt', points: 0, en: 'Burnt', fr: 'Carbonisé', emoji: '⬛' },
    { id: 'welldone', points: 10, en: 'Well done', fr: 'Bien cuit', emoji: '🟫' },
    { id: 'medium', points: 25, en: 'Medium', fr: 'À point', emoji: '🟧' },
    { id: 'rare', points: 50, en: 'Rare', fr: 'Saignant', emoji: '🟥' },
    { id: 'blue', points: 75, en: 'Blue', fr: 'Bleu', emoji: '🟪' },
    { id: 'tartare', points: 100, en: 'Tartare', fr: 'Tartare', emoji: '🥩' },
  ];

  // The daily total (out of 700) decides the rank. All Well done = 70,
  // all Medium = 175, all Rare = 350, all Blue = 525.
  const RANKS = [
    { min: 0, en: 'Dishwasher', fr: 'Plongeur' },
    { min: 70, en: 'Prep Cook', fr: 'Commis' },
    { min: 175, en: 'Line Cook', fr: 'Cuisinier' },
    { min: 300, en: 'Station Chef', fr: 'Chef de partie' },
    { min: 425, en: 'Sous Chef', fr: 'Sous-chef' },
    { min: 550, en: 'Head Chef', fr: 'Chef de cuisine' },
  ];

  const MODES = ['menu', 'chef'];

  // Days ---------------------------------------------------------------------

  function zoneParts(now) {
    const parts = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(now))
      .forEach((p) => {
        parts[p.type] = Number(p.value);
      });
    return parts;
  }

  // "2026-11-19"
  function dayKey(now = Date.now()) {
    const p = zoneParts(now);
    return keyFromIndex(Math.round((Date.UTC(p.year, p.month - 1, p.day) - LAUNCH) / DAY_MS));
  }

  function dayIndex(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.max(0, Math.round((Date.UTC(y, m - 1, d) - LAUNCH) / DAY_MS));
  }

  function keyFromIndex(index) {
    return new Date(LAUNCH + Math.max(0, index) * DAY_MS).toISOString().slice(0, 10);
  }

  const puzzleNumber = (key) => dayIndex(key) + 1;

  // Milliseconds until the next menu (midnight in Montréal).
  function msUntilNextDay(now = Date.now()) {
    const p = zoneParts(now);
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const offset = wall - Math.floor(now / 1000) * 1000;
    return Math.max(0, Date.UTC(p.year, p.month - 1, p.day + 1) - offset - now);
  }

  // Seeded randomness, so every visitor draws the same menu -------------------

  function seed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function random(text) {
    let a = seed(text);
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, text) {
    const out = list.slice();
    const rand = random(text);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // Menus ----------------------------------------------------------------------
  //
  // Each pool is shuffled into a cycle that serves every prompt once before any
  // repeats (28 everyday prompts = a 4-day cycle). A new cycle never opens with
  // a prompt from the day before.

  const cycles = new Map();

  function cycleOrder(mode, ids, cycle) {
    const memo = `${mode}|${ids.join(',')}`;
    if (!cycles.has(memo)) cycles.set(memo, []);
    const done = cycles.get(memo);
    const perDay = COURSES;
    const days = Math.floor(ids.length / perDay);
    for (let c = done.length; c <= cycle; c++) {
      let order = shuffle(ids, `${mode}:${c}`);
      if (c > 0) {
        const yesterday = new Set(done[c - 1].slice((days - 1) * perDay, days * perDay));
        order = order.filter((id) => !yesterday.has(id)).concat(order.filter((id) => yesterday.has(id)));
      }
      done.push(order);
    }
    return done[cycle];
  }

  function promptsFor(bank, mode, key) {
    const pool = bank[mode];
    const ids = pool.map((p) => p.id).sort();
    const days = Math.floor(ids.length / COURSES);
    const index = dayIndex(key);
    const order = cycleOrder(mode, ids, Math.floor(index / days));
    const slot = index % days;
    return order.slice(slot * COURSES, slot * COURSES + COURSES);
  }

  // Beat the chef: the chef serves a Rare or Blue answer to the last Chef's
  // Table course. Your answer has to score more.
  function chefAnswer(prepared, key) {
    const options = [];
    prepared.answers.forEach((a, i) => {
      if (a.tier === 3 || a.tier === 4) options.push(i);
    });
    if (!options.length) return -1;
    return options[Math.floor(random(`chef:${key}:${prepared.id}`)() * options.length)];
  }

  // A few answers to show after a course, picked the same way for everyone.
  function examples(prepared, tier, count, text, skip) {
    const list = [];
    prepared.answers.forEach((a, i) => {
      if (a.tier === tier && i !== skip) list.push(i);
    });
    return tier === 1 ? list.slice(0, count) : shuffle(list, text).slice(0, count);
  }

  function rankFor(total) {
    let index = 0;
    RANKS.forEach((r, i) => {
      if (total >= r.min) index = i;
    });
    return index;
  }

  // Saved progress (this browser only) ---------------------------------------

  function emptyStats() {
    return { played: 0, best: 0, streak: 0, maxStreak: 0, last: null, beatChef: 0 };
  }

  function load() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(STORE) || 'null');
    } catch {}
    if (!data || typeof data !== 'object') data = {};
    if (!data.games || typeof data.games !== 'object') data.games = {};
    if (!data.stats || typeof data.stats !== 'object') data.stats = {};
    for (const mode of MODES) data.stats[mode] = { ...emptyStats(), ...(data.stats[mode] || {}) };
    return data;
  }

  function save(data) {
    const today = dayIndex(dayKey());
    for (const id of Object.keys(data.games)) {
      const game = data.games[id];
      if (!game || today - dayIndex(game.day || '2000-01-01') > KEEP_DAYS) delete data.games[id];
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch {}
  }

  // One game = one mode on one day ---------------------------------------------

  function newGame(bank, mode, key) {
    return {
      mode,
      day: key,
      ids: promptsFor(bank, mode, key),
      course: 0,
      started: null,
      courses: [],
      done: false,
    };
  }

  const total = (game) => game.courses.reduce((sum, c) => sum + c.points, 0);

  // Milliseconds left on the current course's clock.
  function remaining(game, now = Date.now()) {
    if (game.started == null) return SECONDS * 1000;
    return Math.max(0, SECONDS * 1000 - (now - game.started));
  }

  function serve(game, input, answer, tier) {
    game.courses[game.course] = { input, answer, tier, points: TIERS[tier].points };
    game.started = null;
  }

  function burn(game) {
    serve(game, '', -1, 0);
  }

  // Moves to the next course. Returns true when the game just finished.
  function advance(data, game) {
    if (game.done) return false;
    game.course += 1;
    game.started = null;
    if (game.course < COURSES) return false;
    game.done = true;
    const stats = data.stats[game.mode];
    const score = total(game);
    const yesterday = keyFromIndex(dayIndex(game.day) - 1);
    stats.played += 1;
    stats.best = Math.max(stats.best, score);
    stats.streak = stats.last === yesterday ? stats.streak + 1 : stats.last === game.day ? stats.streak : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.last = game.day;
    if (game.mode === 'chef' && game.chef && game.chef.result === 'beat') stats.beatChef += 1;
    return true;
  }

  // Compares the last Chef's Table course with the chef's answer.
  function chefResult(points, chefTier) {
    const chefPoints = TIERS[chefTier].points;
    if (points > chefPoints) return 'beat';
    if (points === chefPoints) return 'tie';
    return 'lost';
  }

  root.RareGame = {
    COURSES,
    SECONDS,
    MAX_SCORE,
    TIERS,
    RANKS,
    MODES,
    dayKey,
    dayIndex,
    keyFromIndex,
    puzzleNumber,
    msUntilNextDay,
    promptsFor,
    chefAnswer,
    examples,
    rankFor,
    load,
    save,
    newGame,
    total,
    remaining,
    serve,
    burn,
    advance,
    chefResult,
  };
})(typeof window !== 'undefined' ? window : globalThis);
