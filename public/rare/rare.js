// RARE: the screens. Rules live in game.js, answer matching in match.js and
// the prompts in prompts.js.
(() => {
  'use strict';

  const G = window.RareGame;
  const M = window.RareMatch;
  const BANK = window.RARE_PROMPTS;
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);

  const TEXT = {
    en: {
      puzzle: (n) => `No. ${n}`,
      mode: { menu: 'Today’s menu', chef: 'Chef’s Table' },
      start: 'Start',
      resume: 'Keep going',
      results: 'See my results',
      statusNew: '7 courses · 25 seconds each',
      statusResume: (n) => `Course ${n} of 7 is waiting for you`,
      statusDone: (score, rank) => `Served today: ${score} pts · ${rank}`,
      hours: (h, m) => (h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`),
      course: (n) => `Course ${n} of 7`,
      pts: (n) => `${n} pts`,
      plusPts: (n) => `+${n} pts`,
      answerLabel: 'Your answer',
      placeholder: 'Type your answer',
      serve: 'Serve',
      secondsUnit: ' seconds left',
      secondsLeft: (n) => `${n} seconds left`,
      empty: 'Type an answer first.',
      notOnMenu: 'Not on our menu. Try another answer.',
      chefsOwn: 'That’s the chef’s answer. Find your own.',
      chefEyebrow: 'Beat the chef',
      chefServed: 'The chef served',
      chefGoal: 'Serve something rarer to win.',
      chefGoalMax: 'Only a Tartare answer beats it.',
      youServed: 'You served',
      burnt: 'Time’s up. This course is burnt.',
      mostCommon: 'Most common',
      rarerFinds: 'Rarer finds',
      next: 'Next course',
      finish: 'See my results',
      verdict: { beat: 'You beat the chef.', tie: 'You matched the chef.', lost: 'The chef wins this one.' },
      verdictShort: { beat: 'Beat the chef: won', tie: 'Beat the chef: tied', lost: 'Beat the chef: lost' },
      outOf: (n) => `out of ${n}`,
      rankIntro: 'Your kitchen rank today',
      toNext: (pts, rank) => `${pts} more points and you’d be ${rank}.`,
      topRank: 'The top of the brigade.',
      share: 'Share my score',
      copied: 'Copied. Paste it anywhere.',
      copyFailed: 'Couldn’t copy. Select the text below and copy it.',
      back: 'Back to the menus',
      playOther: { menu: 'Play today’s menu', chef: 'Try the Chef’s Table' },
      comeBack: (t) => `New menus in ${t}.`,
      noAnswer: 'No answer',
      stat: { played: 'Played', best: 'Best score', streak: 'Day streak', maxStreak: 'Longest streak', beatChef: 'Chef beaten' },
      rankRange: (min, max) => (max == null ? `${min}+` : `${min}–${max}`),
      tierLegend: (pts) => `${pts} pts`,
    },
    fr: {
      puzzle: (n) => `No ${n}`,
      mode: { menu: 'Menu du jour', chef: 'Table du chef' },
      start: 'Commencer',
      resume: 'Continuer',
      results: 'Voir mes résultats',
      statusNew: '7 plats · 25 secondes chacun',
      statusResume: (n) => `Le plat ${n} sur 7 t’attend`,
      statusDone: (score, rank) => `Servi aujourd’hui : ${score} pts · ${rank}`,
      hours: (h, m) => (h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`),
      course: (n) => `Plat ${n} sur 7`,
      pts: (n) => `${n} pts`,
      plusPts: (n) => `+${n} pts`,
      answerLabel: 'Ta réponse',
      placeholder: 'Écris ta réponse',
      serve: 'Servir',
      secondsUnit: ' secondes restantes',
      secondsLeft: (n) => `${n} secondes restantes`,
      empty: 'Écris d’abord une réponse.',
      notOnMenu: 'Pas à notre menu. Essaie une autre réponse.',
      chefsOwn: 'C’est la réponse du chef. Trouve la tienne.',
      chefEyebrow: 'Bats le chef',
      chefServed: 'Le chef a servi',
      chefGoal: 'Sers plus rare pour gagner.',
      chefGoalMax: 'Seule une réponse Tartare peut le battre.',
      youServed: 'Tu as servi',
      burnt: 'Temps écoulé. Ce plat est carbonisé.',
      mostCommon: 'Les plus courantes',
      rarerFinds: 'Trouvailles rares',
      next: 'Plat suivant',
      finish: 'Voir mes résultats',
      verdict: { beat: 'Tu as battu le chef.', tie: 'Égalité avec le chef.', lost: 'Le chef gagne cette fois-ci.' },
      verdictShort: { beat: 'Bats le chef : gagné', tie: 'Bats le chef : égalité', lost: 'Bats le chef : perdu' },
      outOf: (n) => `sur ${n}`,
      rankIntro: 'Ton rang en cuisine aujourd’hui',
      toNext: (pts, rank) => `Encore ${pts} points et tu serais ${rank}.`,
      topRank: 'Le sommet de la brigade.',
      share: 'Partager mon score',
      copied: 'Copié. Colle-le où tu veux.',
      copyFailed: 'Impossible de copier. Sélectionne le texte ci-dessous et copie-le.',
      back: 'Retour aux menus',
      playOther: { menu: 'Jouer le menu du jour', chef: 'Essayer la Table du chef' },
      comeBack: (t) => `Nouveaux menus dans ${t}.`,
      noAnswer: 'Aucune réponse',
      stat: { played: 'Parties', best: 'Meilleur score', streak: 'Jours de suite', maxStreak: 'Plus longue série', beatChef: 'Chef battu' },
      rankRange: (min, max) => (max == null ? `${min} et +` : `${min} à ${max}`),
      tierLegend: (pts) => `${pts} pts`,
    },
  };

  const lang = () => (root.lang === 'fr' ? 'fr' : 'en');
  const t = () => TEXT[lang()];
  const name = (item) => item[lang()];

  // Builds an element: h('p', { class: 'x', text: 'Hi' }, child, 'text', …)
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? '' : value);
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.append(child.nodeType ? child : String(child));
    }
    return el;
  }

  // Like el.replaceChildren(), but skips empty parts (which would print as "null").
  function fill(el, ...children) {
    el.replaceChildren(...children.flat().filter((child) => child != null && child !== false));
  }

  // A doneness label with its colour dot.
  function tierBadge(tier, withPoints = true) {
    const info = G.TIERS[tier];
    return h(
      'span',
      { class: `tier tier-${tier}` },
      h('span', { class: 'tier-dot', 'aria-hidden': 'true' }),
      withPoints ? `${name(info)} · ${t().pts(info.points)}` : name(info),
    );
  }

  // Prompts --------------------------------------------------------------------

  const promptById = new Map();
  for (const mode of G.MODES) for (const p of BANK[mode]) promptById.set(p.id, p);
  const prepared = new Map();
  function prep(id) {
    if (!prepared.has(id)) prepared.set(id, M.prepare(promptById.get(id)));
    return prepared.get(id);
  }

  // Saved games ----------------------------------------------------------------

  const data = G.load();
  let today = G.dayKey();
  let game = null; // the game on screen
  let view = 'home';

  const gameId = (mode, day) => `${mode}:${day}`;

  function gameFor(mode, day, create) {
    const id = gameId(mode, day);
    let saved = data.games[id];
    // A prompt that no longer exists (the bank changed) means the game can't continue.
    if (saved && !(Array.isArray(saved.ids) && saved.ids.length === G.COURSES && saved.ids.every((x) => promptById.has(x)))) {
      saved = null;
      delete data.games[id];
    }
    if (!saved && create) {
      saved = G.newGame(BANK, mode, day);
      if (mode === 'chef') {
        const last = prep(saved.ids[G.COURSES - 1]);
        const answer = G.chefAnswer(last, day);
        saved.chef = { answer, tier: last.answers[answer].tier, result: null };
      }
      data.games[id] = saved;
      G.save(data);
    }
    return saved || null;
  }

  function persist() {
    G.save(data);
  }

  // Views ----------------------------------------------------------------------

  const views = { home: $('#home'), play: $('#play'), results: $('#results') };

  function show(next) {
    view = next;
    for (const [key, el] of Object.entries(views)) el.hidden = key !== next;
    window.scrollTo(0, 0);
  }

  // Home -----------------------------------------------------------------------

  function countdownText() {
    const minutes = Math.ceil(G.msUntilNextDay() / 60000);
    return t().hours(Math.floor(minutes / 60), minutes % 60);
  }

  function renderHome() {
    const tx = t();
    $('[data-puzzle]').textContent = tx.puzzle(G.puzzleNumber(today));
    for (const mode of G.MODES) {
      const card = $(`[data-card="${mode}"]`);
      const saved = gameFor(mode, today, false);
      const status = $('[data-status]', card);
      const button = $('[data-play]', card);
      card.classList.toggle('is-done', Boolean(saved && saved.done));
      if (saved && saved.done) {
        const score = G.total(saved);
        status.textContent = tx.statusDone(score, name(G.RANKS[G.rankFor(score)]));
        button.textContent = tx.results;
      } else if (saved && (saved.course > 0 || saved.started != null || saved.courses.length)) {
        status.textContent = tx.statusResume(saved.course + 1);
        button.textContent = tx.resume;
      } else {
        status.textContent = tx.statusNew;
        button.textContent = tx.start;
      }
    }
    $('[data-countdown]').textContent = countdownText();

    const scale = $('[data-scale]');
    scale.replaceChildren(
      ...[1, 2, 3, 4, 5, 0].map((tier) =>
        h(
          'li',
          { class: `scale-step tier-${tier}` },
          h('span', { class: 'scale-swatch', 'aria-hidden': 'true' }),
          h('span', { class: 'scale-name', text: name(G.TIERS[tier]) }),
          h('span', { class: 'scale-points', text: tx.tierLegend(G.TIERS[tier].points) }),
        ),
      ),
    );

    const ranks = $('[data-ranks]');
    ranks.replaceChildren(
      ...G.RANKS.map((rank, i) => {
        const nextRank = G.RANKS[i + 1];
        return h(
          'li',
          { class: 'rank' },
          h('span', { class: 'rank-name', text: name(rank) }),
          h('span', { class: 'rank-range', text: tx.rankRange(rank.min, nextRank ? nextRank.min - 1 : null) }),
        );
      }),
    );

    const played = G.MODES.some((mode) => data.stats[mode].played > 0);
    $('[data-stats-section]').hidden = !played;
    if (played) {
      $('[data-stats]').replaceChildren(
        ...G.MODES.filter((mode) => data.stats[mode].played > 0).map((mode) => {
          const s = data.stats[mode];
          const items = [
            ['played', s.played],
            ['best', s.best],
            ['streak', s.streak],
            ['maxStreak', s.maxStreak],
          ];
          if (mode === 'chef') items.push(['beatChef', s.beatChef]);
          return h(
            'div',
            { class: 'stats-group' },
            h('h3', { class: 'stats-title', text: tx.mode[mode] }),
            h(
              'dl',
              { class: 'stats-list' },
              items.map(([key, value]) => h('div', { class: 'stat' }, h('dt', { text: tx.stat[key] }), h('dd', { text: value }))),
            ),
          );
        }),
      );
    }
  }

  // Language ---------------------------------------------------------------------

  function applyLanguage(next, remember) {
    root.lang = next;
    document.querySelectorAll('[data-set-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.setLang === next));
    });
    const title = root.getAttribute(`data-${next}-title`);
    if (title) document.title = title;
    if (remember) {
      try {
        localStorage.setItem('cuisigo-lang', next);
      } catch {}
    }
    renderHome();
    if (view === 'play') renderCourseText();
    if (view === 'results') renderResults();
  }

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.setLang, true));
  });

  // A course -----------------------------------------------------------------

  const live = $('[data-live]');
  const reveal = $('[data-reveal]');
  const form = $('[data-answer-form]');
  const input = $('#answer');
  const feedback = $('[data-feedback]');
  const timerBox = $('[data-timer]');
  const timerFill = $('[data-timer-fill]');
  const timerText = $('[data-timer-text]');
  const announcer = $('[data-timer-announce]');
  let frame = 0;
  let timeout = 0;
  let lastSecond = null;
  let feedbackKey = null;

  const currentPrompt = () => promptById.get(game.ids[game.course]);
  const served = () => game.courses[game.course];
  const isChefCourse = () => game.mode === 'chef' && game.course === G.COURSES - 1 && Boolean(game.chef);

  function arrow() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'arrow');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M1 8h13M9 3l5 5-5 5');
    svg.append(path);
    return svg;
  }

  function chefLine() {
    const last = prep(game.ids[G.COURSES - 1]);
    return [t().chefServed, ' ', h('strong', { text: name(last.answers[game.chef.answer]) }), ' ', tierBadge(game.chef.tier)];
  }

  function say(key) {
    feedbackKey = key;
    feedback.textContent = key ? t()[key] : '';
    if (key) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function renderCourseText() {
    if (!game) return;
    const tx = t();
    const index = Math.min(game.course, G.COURSES - 1);
    $('[data-play-mode]').textContent = `${tx.mode[game.mode]} · ${tx.puzzle(G.puzzleNumber(game.day))}`;
    $('[data-play-score]').textContent = tx.pts(G.total(game));
    $('[data-play-count]').textContent = tx.course(index + 1);
    $('[data-dots]').replaceChildren(
      ...game.ids.map((_, i) => {
        const c = game.courses[i];
        return h('li', { class: `dot${c ? ` tier-${c.tier} is-served` : ''}${i === game.course ? ' is-current' : ''}` });
      }),
    );
    $('[data-prompt]').textContent = name(currentPrompt());

    const callout = $('[data-chef]');
    callout.hidden = !isChefCourse();
    if (isChefCourse()) {
      callout.replaceChildren(
        h('p', { class: 'eyebrow' }, h('span', { class: 'eyebrow-dot', 'aria-hidden': 'true' }), tx.chefEyebrow),
        h('p', { class: 'chef-line' }, chefLine()),
        h('p', { class: 'chef-goal', text: game.chef.tier >= 4 ? tx.chefGoalMax : tx.chefGoal }),
      );
    }

    $('[data-answer-label]').textContent = tx.answerLabel;
    input.placeholder = tx.placeholder;
    $('[data-serve]').replaceChildren(tx.serve, arrow());
    $('[data-timer-unit]').textContent = tx.secondsUnit;
    if (feedbackKey) feedback.textContent = tx[feedbackKey];
    if (!reveal.hidden) renderReveal();
  }

  function stopTimer() {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
  }

  function tick() {
    if (!game || served()) return;
    const left = G.remaining(game);
    timerFill.style.transform = `scaleX(${left / (G.SECONDS * 1000)})`;
    const seconds = Math.ceil(left / 1000);
    if (seconds !== lastSecond) {
      timerText.textContent = seconds;
      if (lastSecond != null && (seconds === 10 || seconds === 5)) announcer.textContent = t().secondsLeft(seconds);
      lastSecond = seconds;
    }
    timerBox.classList.toggle('is-low', left <= 5000);
    if (left <= 0) {
      expire();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function playCourse() {
    stopTimer();
    if (served()) {
      showReveal();
      return;
    }
    live.hidden = false;
    reveal.hidden = true;
    input.value = '';
    say(null);
    announcer.textContent = '';
    lastSecond = null;
    if (game.started == null) {
      game.started = Date.now();
      persist();
    }
    renderCourseText();
    if (G.remaining(game) <= 0) {
      expire();
      return;
    }
    input.focus();
    tick();
    // Animation frames pause in background tabs; this makes sure the clock still runs out.
    timeout = setTimeout(tick, G.remaining(game) + 50);
  }

  function expire() {
    stopTimer();
    if (!game || served()) return;
    G.burn(game);
    afterServe();
  }

  function reject() {
    input.select();
    const field = input.closest('.field');
    field.classList.remove('is-wrong');
    void field.offsetWidth; // restart the shake
    field.classList.add('is-wrong');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!game || view !== 'play' || served()) return;
    if (G.remaining(game) <= 0) {
      expire();
      return;
    }
    const value = input.value.trim();
    if (!value) {
      say('empty');
      input.focus();
      return;
    }
    const p = prep(game.ids[game.course]);
    const index = M.match(p, value);
    if (index < 0) {
      say('notOnMenu');
      reject();
      return;
    }
    if (isChefCourse() && index === game.chef.answer) {
      say('chefsOwn');
      reject();
      return;
    }
    stopTimer();
    G.serve(game, value, index, p.answers[index].tier);
    afterServe();
  });

  input.addEventListener('input', () => {
    if (feedbackKey) say(null);
  });

  function afterServe() {
    if (isChefCourse()) game.chef.result = G.chefResult(served().points, game.chef.tier);
    persist();
    showReveal();
  }

  // After each course: how it was cooked ---------------------------------------

  function showReveal() {
    stopTimer();
    live.hidden = true;
    reveal.hidden = false;
    renderCourseText();
    const next = $('[data-next]', reveal);
    if (next) next.focus({ preventScroll: true });
  }

  function exampleList(label, p, tier, skip) {
    const picks = G.examples(p, tier, 3, `${game.day}:${p.id}:${tier}`, skip);
    if (!picks.length) return null;
    return h(
      'div',
      { class: 'example' },
      h('dt', {}, tierBadge(tier, false), ' ', label),
      h('dd', { text: picks.map((i) => name(p.answers[i])).join(' · ') }),
    );
  }

  function renderReveal() {
    const tx = t();
    const c = served();
    const p = prep(game.ids[game.course]);
    const last = game.course === G.COURSES - 1;
    const result = isChefCourse() ? game.chef.result : null;
    fill(reveal,
      h(
        'p',
        { class: `reveal-tier tier-${c.tier}` },
        h('span', { class: 'reveal-doneness', text: name(G.TIERS[c.tier]) }),
        h('span', { class: 'reveal-points', text: tx.plusPts(c.points) }),
      ),
      c.answer >= 0
        ? h('p', { class: 'reveal-answer' }, `${tx.youServed} `, h('strong', { text: name(p.answers[c.answer]) }))
        : h('p', { class: 'reveal-answer', text: tx.burnt }),
      h(
        'ol',
        { class: 'meter', 'aria-hidden': 'true' },
        [1, 2, 3, 4, 5].map((tier) =>
          h('li', { class: `meter-step tier-${tier}${tier === c.tier ? ' is-hit' : ''}` }, h('span', { text: name(G.TIERS[tier]) })),
        ),
      ),
      result ? h('div', { class: `verdict verdict-${result}` }, h('p', { class: 'verdict-title', text: tx.verdict[result] }), h('p', {}, chefLine())) : null,
      h('dl', { class: 'examples' }, exampleList(tx.mostCommon, p, 1, c.answer), exampleList(tx.rarerFinds, p, 5, c.answer)),
      h('button', { class: 'btn', type: 'button', 'data-next': true, onclick: nextCourse }, last ? tx.finish : tx.next, arrow()),
    );
  }

  function nextCourse() {
    if (!game || !served()) return;
    const finished = G.advance(data, game);
    persist();
    if (finished || game.done) {
      showResults();
      return;
    }
    playCourse();
  }

  // Results --------------------------------------------------------------------

  const results = $('[data-results]');

  function shareText() {
    const tx = t();
    const score = G.total(game);
    const lines = [
      `RARE ${tx.puzzle(G.puzzleNumber(game.day))} · ${tx.mode[game.mode]}`,
      `${score}/${G.MAX_SCORE} · ${name(G.RANKS[G.rankFor(score)])}`,
      game.courses.map((c) => G.TIERS[c.tier].emoji).join(''),
    ];
    if (game.mode === 'chef' && game.chef && game.chef.result) lines.push(tx.verdictShort[game.chef.result]);
    lines.push('cuisigo.ca/rare');
    return lines.join('\n');
  }

  async function share(status, box) {
    const text = shareText();
    const tx = t();
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = tx.copied;
      box.hidden = true;
    } catch {
      status.textContent = tx.copyFailed;
      box.value = text;
      box.hidden = false;
      box.select();
    }
  }

  function renderResults() {
    if (!game) return;
    const tx = t();
    const score = G.total(game);
    const rankIndex = G.rankFor(score);
    const nextRank = G.RANKS[rankIndex + 1];
    const other = game.mode === 'menu' ? 'chef' : 'menu';
    const otherGame = gameFor(other, today, false);
    const status = h('p', { class: 'share-status', 'aria-live': 'polite' });
    const box = h('textarea', { class: 'share-box', rows: '5', readonly: true, hidden: true, 'aria-label': tx.share });

    fill(results,
      h('p', { class: 'eyebrow' }, h('span', { class: 'eyebrow-dot', 'aria-hidden': 'true' }), `${tx.mode[game.mode]} · ${tx.puzzle(G.puzzleNumber(game.day))}`),
      h(
        'h2',
        { class: 'results-score', id: 'results-title' },
        h('span', { class: 'results-number', text: score }),
        h('span', { class: 'results-outof', text: tx.outOf(G.MAX_SCORE) }),
      ),
      h(
        'div',
        { class: 'results-rank' },
        h('p', { class: 'results-rank-intro', text: tx.rankIntro }),
        h('p', { class: 'results-rank-name', text: name(G.RANKS[rankIndex]) }),
        h('p', { class: 'results-rank-next', text: nextRank ? tx.toNext(nextRank.min - score, name(nextRank)) : tx.topRank }),
      ),
      h(
        'ol',
        { class: 'ladder', 'aria-hidden': 'true' },
        G.RANKS.map((rank, i) => h('li', { class: `ladder-step${i <= rankIndex ? ' is-reached' : ''}${i === rankIndex ? ' is-current' : ''}`, text: name(rank) })),
      ),
      game.mode === 'chef' && game.chef && game.chef.result
        ? h('div', { class: `verdict verdict-${game.chef.result}` }, h('p', { class: 'verdict-title', text: tx.verdict[game.chef.result] }), h('p', {}, chefLine()))
        : null,
      h(
        'ol',
        { class: 'plates' },
        game.courses.map((c, i) => {
          const p = prep(game.ids[i]);
          return h(
            'li',
            { class: 'plate' },
            h('span', { class: 'plate-num', text: String(i + 1).padStart(2, '0') }),
            h(
              'span',
              { class: 'plate-body' },
              h('span', { class: 'plate-prompt', text: name(promptById.get(game.ids[i])) }),
              h('span', { class: `plate-answer${c.answer < 0 ? ' is-empty' : ''}`, text: c.answer >= 0 ? name(p.answers[c.answer]) : tx.noAnswer }),
            ),
            tierBadge(c.tier),
          );
        }),
      ),
      h(
        'div',
        { class: 'results-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => share(status, box) }, tx.share, arrow()),
        otherGame && otherGame.done
          ? null
          : h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => startGame(other) }, tx.playOther[other]),
        h('button', { class: 'link-btn', type: 'button', onclick: goHome }, tx.back),
      ),
      status,
      box,
      h('p', { class: 'rare-note results-next', text: tx.comeBack(countdownText()) }),
    );
  }

  function showResults() {
    stopTimer();
    show('results');
    renderResults();
    views.results.focus({ preventScroll: true });
  }

  function goHome() {
    stopTimer();
    game = null;
    show('home');
    renderHome();
    $('#rare-title').focus({ preventScroll: true });
  }

  function startGame(mode) {
    today = G.dayKey();
    game = gameFor(mode, today, true);
    if (game.done) {
      showResults();
      return;
    }
    show('play');
    playCourse();
  }

  // Start ------------------------------------------------------------------------

  document.querySelectorAll('[data-play]').forEach((button) => {
    button.addEventListener('click', () => startGame(button.dataset.play));
  });

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // The countdown, and a fresh menu at midnight.
  setInterval(() => {
    const now = G.dayKey();
    if (now !== today && view === 'home') {
      today = now;
      renderHome();
    }
    $('[data-countdown]').textContent = countdownText();
  }, 15000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && view === 'play' && game && !served()) tick();
  });

  $('#rare-title').setAttribute('tabindex', '-1');
  applyLanguage(lang(), false);
  show('home');

  // A course whose clock is already running (the page was reloaded mid-course)
  // carries on where it was: the clock doesn't stop for a reload.
  const running = G.MODES.map((mode) => gameFor(mode, today, false)).find(
    (g) => g && !g.done && g.started != null && !g.courses[g.course],
  );
  if (running) startGame(running.mode);
})();
