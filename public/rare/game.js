// RARE: seven food prompts a day, 25 seconds each. The less common the
// answer, the rarer it's cooked and the more it scores. Two menus a day:
// today's menu and the harder Chef's Table, whose last course is Beat the chef.
(() => {
  const E = window.RARE_ENGINE;
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);

  const ROUNDS = E.ROUNDS;
  const ROUND_MS = 25000;
  const MAX_SCORE = ROUNDS * 100;
  // Everyone gets the same prompts on the same day, Montréal time.
  const TIME_ZONE = 'America/Toronto';
  const STORE_KEY = 'rare-v1';
  const MENUS = ['menu', 'chef'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared-results squares, one per doneness (index = tier).
  const SQUARES = ['⬛', '🟫', '🟧', '🟥', '🟪', '🥩'];

  // The kitchen brigade, from the dish pit to the pass.
  const RANKS = [
    { key: 'dishwasher', from: 0 },
    { key: 'prep', from: 80 },
    { key: 'line', from: 170 },
    { key: 'partie', from: 270 },
    { key: 'sous', from: 370 },
    { key: 'head', from: 480 },
  ];

  const TEXT = {
    en: {
      title: 'Rare · A daily food game by Cuisigo',
      tier: {
        burnt: 'Burnt',
        welldone: 'Well done',
        medium: 'Medium',
        rare: 'Rare',
        blue: 'Blue',
        tartare: 'Tartare',
      },
      tierNote: {
        burnt: 'No answer, no points.',
        welldone: 'The answer most people give.',
        medium: 'Plenty of people say it.',
        rare: 'Not many people think of it.',
        blue: 'Only real food people get this one.',
        tartare: 'Almost nobody says it.',
      },
      rank: {
        dishwasher: 'Dishwasher',
        prep: 'Prep cook',
        line: 'Line cook',
        partie: 'Chef de partie',
        sous: 'Sous-chef',
        head: 'Head Chef',
      },
      menuName: { menu: 'Today’s menu', chef: 'Chef’s Table' },
      daily: 'Daily game #{n}',
      start: { menu: 'Start today’s menu', chef: 'Sit at the Chef’s Table' },
      resume: 'Continue: course {n} of 7',
      seeResults: { menu: 'See today’s results', chef: 'See your Chef’s Table' },
      course: 'Course {n} of 7',
      beatTheChef: 'Beat the chef',
      pointsLabel: 'points',
      points: '{p} pts',
      placeholder: 'Your answer…',
      empty: 'Type an answer first.',
      unknown: '“{text}” isn’t on our list. Try another.',
      several: 'One answer at a time.',
      chefsOwn: 'That’s the chef’s answer. Find your own.',
      timeUp: 'Time’s up.',
      passed: 'You passed.',
      chefSaid: 'The chef said',
      chefGoal: 'Name something rarer to beat the chef.',
      beat: 'You beat the chef: {answer} was {tier}.',
      tie: 'Tied with the chef ({answer}, {tier}). The chef keeps the title.',
      lost: 'The chef wins this one with {answer} ({tier}).',
      examplesRarer: 'Rarer answers',
      examplesTop: 'Other Tartare answers',
      examplesAny: 'Answers that would have worked',
      next: 'Next course',
      seeTotal: 'See your total',
      total: 'Your total',
      rankNext: 'Next rank: {rank} at {p} points',
      rankTop: 'The top of the brigade.',
      beatYes: 'Beat the chef: you won.',
      beatNo: 'Beat the chef: the chef won.',
      share: 'Copy my results',
      copied: 'Copied. Paste it anywhere.',
      copyFallback: 'Copy the text below to share it.',
      played: 'Played',
      streak: 'Streak',
      best: 'Best',
      average: 'Average',
      beaten: 'Chef beaten',
      nextGame: 'New prompts in {time}',
      ready: 'New prompts are ready.',
      other: { menu: 'Play today’s menu', chef: 'Now try the Chef’s Table' },
      otherDone: { menu: 'See today’s menu', chef: 'See your Chef’s Table' },
      home: 'Back to the rules',
      shareHead: 'RARE #{n} · {menu}',
      shareBeat: 'Beat the chef 🔪',
      shareLost: 'The chef won',
    },
    fr: {
      title: 'Rare · Le jeu culinaire quotidien de Cuisigo',
      tier: {
        burnt: 'Carbonisé',
        welldone: 'Bien cuit',
        medium: 'À point',
        rare: 'Saignant',
        blue: 'Bleu',
        tartare: 'Tartare',
      },
      tierNote: {
        burnt: 'Pas de réponse, pas de points.',
        welldone: 'La réponse que presque tout le monde donne.',
        medium: 'Bien des gens y pensent.',
        rare: 'Peu de gens y pensent.',
        blue: 'Seuls les vrais connaisseurs la trouvent.',
        tartare: 'Presque personne n’y pense.',
      },
      rank: {
        dishwasher: 'Plongeur',
        prep: 'Aide-cuisinier',
        line: 'Cuisinier',
        partie: 'Chef de partie',
        sous: 'Sous-chef',
        head: 'Chef de cuisine',
      },
      menuName: { menu: 'Menu du jour', chef: 'Table du chef' },
      daily: 'Jeu du jour nº {n}',
      start: { menu: 'Commencer le menu du jour', chef: 'Prendre place à la Table du chef' },
      resume: 'Continuer : service {n} sur 7',
      seeResults: { menu: 'Voir tes résultats du jour', chef: 'Voir ta Table du chef' },
      course: 'Service {n} sur 7',
      beatTheChef: 'Bats le chef',
      pointsLabel: 'points',
      points: '{p} pts',
      placeholder: 'Ta réponse…',
      empty: 'Écris d’abord une réponse.',
      unknown: '« {text} » n’est pas sur notre liste. Essaie autre chose.',
      several: 'Une réponse à la fois.',
      chefsOwn: 'C’est la réponse du chef. Trouve la tienne.',
      timeUp: 'Temps écoulé.',
      passed: 'Tu as passé.',
      chefSaid: 'Le chef a dit',
      chefGoal: 'Trouve plus rare pour battre le chef.',
      beat: 'Tu as battu le chef : {answer} était {tier}.',
      tie: 'Égalité avec le chef ({answer}, {tier}). Le chef garde son titre.',
      lost: 'Le chef gagne cette fois-ci avec {answer} ({tier}).',
      examplesRarer: 'Des réponses plus rares',
      examplesTop: 'Autres réponses tartare',
      examplesAny: 'Des réponses qui marchaient',
      next: 'Service suivant',
      seeTotal: 'Voir ton total',
      total: 'Ton total',
      rankNext: 'Prochain rang : {rank} à {p} points',
      rankTop: 'Le sommet de la brigade.',
      beatYes: 'Bats le chef : tu as gagné.',
      beatNo: 'Bats le chef : le chef a gagné.',
      share: 'Copier mes résultats',
      copied: 'Copié. Colle-le où tu veux.',
      copyFallback: 'Copie le texte ci-dessous pour le partager.',
      played: 'Parties',
      streak: 'Série',
      best: 'Record',
      average: 'Moyenne',
      beaten: 'Chef battu',
      nextGame: 'Nouvelles questions dans {time}',
      ready: 'Les nouvelles questions sont prêtes.',
      other: { menu: 'Jouer le menu du jour', chef: 'Essaie maintenant la Table du chef' },
      otherDone: { menu: 'Voir ton menu du jour', chef: 'Voir ta Table du chef' },
      home: 'Retour aux règles',
      shareHead: 'RARE nº {n} · {menu}',
      shareBeat: 'Chef battu 🔪',
      shareLost: 'Le chef a gagné',
    },
  };

  const lang = () => (root.lang === 'fr' ? 'fr' : 'en');

  function t(key, vars) {
    let value = key.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), TEXT[lang()]);
    if (typeof value !== 'string') return value;
    for (const [name, v] of Object.entries(vars || {})) value = value.split(`{${name}}`).join(String(v));
    return value;
  }

  const tierKey = (tier) => E.TIERS[tier].key;
  const tierName = (tier) => t(`tier.${tierKey(tier)}`);
  const scoreOf = (picks) => picks.reduce((sum, p) => sum + E.TIERS[p.tier].points, 0);

  function rankFor(score) {
    let i = 0;
    while (i + 1 < RANKS.length && score >= RANKS[i + 1].from) i++;
    return { rank: RANKS[i], next: RANKS[i + 1] || null };
  }

  // Days, Montréal time ---------------------------------------------------------

  const zoned = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  function now() {
    const parts = {};
    for (const p of zoned.formatToParts(new Date())) parts[p.type] = p.value;
    const hour = Number(parts.hour) % 24;
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      secondsLeft: 86400 - (hour * 3600 + Number(parts.minute) * 60 + Number(parts.second)),
    };
  }

  const DAY_MS = 86400000;
  const gameNumber = (key) => Math.max(0, E.dayIndex(key)) + 1;
  const dayBefore = (key) => new Date(Date.parse(key) - DAY_MS).toISOString().slice(0, 10);

  // Saved progress and stats (this browser only) -------------------------------------

  function freshStats() {
    return { played: 0, streak: 0, best: 0, total: 0, beaten: 0, last: null };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && typeof saved === 'object' && saved.days && saved.stats) {
        for (const menu of MENUS) saved.stats[menu] = Object.assign(freshStats(), saved.stats[menu]);
        return saved;
      }
    } catch {}
    return { days: {}, stats: { menu: freshStats(), chef: freshStats() } };
  }

  const store = load();

  function save() {
    // Only the last couple of weeks are needed.
    const keys = Object.keys(store.days).sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - 14))) delete store.days[key];
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  }

  const savedGame = (key, menu) => (store.days[key] && store.days[key][menu]) || null;
  const isDone = (key, menu) => {
    const saved = savedGame(key, menu);
    return Boolean(saved && saved.picks.length >= ROUNDS);
  };

  // The game in progress ---------------------------------------------------------------

  let today = now().key;
  // { menu, key, prompts: [ids], chef: { id, tier } | null, picks: [{ id, tier, en, fr } | { id: null, tier: 0, why }], started }
  let game = null;
  let phase = 'intro'; // intro | round | result | end
  let feedback = null; // the message under the answer box
  let frame = 0;
  let clock = 0;

  // Today's game for one menu, resumed if it was started. The prompts are saved
  // when it starts, so editing the lists mid-day can't swap them under a player.
  function dailyGame(menu) {
    const saved = savedGame(today, menu);
    const known = saved && saved.prompts.every((id) => E.prompt(menu, id));
    if (saved && known) {
      return { menu, key: today, prompts: saved.prompts, chef: saved.chef, picks: saved.picks, started: saved.started };
    }
    const day = E.day(today);
    return {
      menu,
      key: today,
      prompts: day[menu].map((p) => p.id),
      chef: menu === 'chef' ? day.chefAnswer : null,
      picks: [],
      started: null,
    };
  }

  function persist() {
    if (!game) return;
    store.days[game.key] = store.days[game.key] || {};
    store.days[game.key][game.menu] = {
      prompts: game.prompts,
      chef: game.chef,
      picks: game.picks,
      started: game.started,
    };
    save();
  }

  const roundIndex = () => game.picks.length;
  const promptAt = (i) => E.prompt(game.menu, game.prompts[i]);
  const isChefCourse = (i) => Boolean(game.chef) && i === ROUNDS - 1;
  // The chef's answer for the last course. If the lists changed since the game
  // started, fall back to the saved id so the page still reads.
  const chefAnswer = () => {
    if (!game.chef) return null;
    return promptAt(ROUNDS - 1).byId[game.chef.id] || { id: game.chef.id, en: game.chef.id, fr: game.chef.id };
  };
  const beatChef = () => {
    const pick = game.picks[ROUNDS - 1];
    return Boolean(game.chef && pick && pick.tier > game.chef.tier);
  };

  // A finished game counts once toward its menu's stats.
  function recordStats() {
    const s = store.stats[game.menu];
    if (s.last === game.key) return;
    const score = scoreOf(game.picks);
    s.played += 1;
    s.total += score;
    s.best = Math.max(s.best, score);
    s.streak = s.last === dayBefore(game.key) ? s.streak + 1 : 1;
    if (beatChef()) s.beaten += 1;
    s.last = game.key;
    save();
  }

  // Language ---------------------------------------------------------------------------

  function applyLanguage(next, remember) {
    root.lang = next;
    document.querySelectorAll('[data-set-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.setLang === next));
    });
    document.title = t('title');
    $('guess').placeholder = t('placeholder');
    if (remember) {
      try {
        localStorage.setItem('cuisigo-lang', next);
      } catch {}
    }
    render();
  }

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.setLang, true));
  });

  // Rendering ---------------------------------------------------------------------------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function tierBadge(tier, withPoints) {
    const badge = el('span', `tier-badge tier-${tierKey(tier)}`, tierName(tier));
    if (withPoints) badge.append(el('span', 'tier-points', `+${E.TIERS[tier].points}`));
    return badge;
  }

  const promptText = (p) => (p ? `${p[lang()]}.` : '');
  const answerName = (a) => a[lang()];

  function pickName(pick, p) {
    const answer = pick.id && p && p.byId[pick.id];
    if (answer) return answerName(answer);
    return pick[lang()] || '';
  }

  function show(screen) {
    for (const name of ['intro', 'play', 'end']) $(`screen-${name}`).hidden = name !== screen;
  }

  function render() {
    if (phase === 'intro') renderIntro();
    else if (phase === 'end') renderEnd();
    else renderPlay();
  }

  function startLabel(menu) {
    if (isDone(today, menu)) return t(`seeResults.${menu}`);
    const saved = savedGame(today, menu);
    if (saved && (saved.picks.length || saved.started)) return t('resume', { n: saved.picks.length + 1 });
    return t(`start.${menu}`);
  }

  function renderIntro() {
    show('intro');
    $('intro-label').textContent = t('daily', { n: gameNumber(today) });
    $('start-menu-label').textContent = startLabel('menu');
    $('start-chef-label').textContent = startLabel('chef');

    const scale = $('doneness');
    scale.textContent = '';
    for (let tier = 1; tier < E.TIERS.length; tier++) {
      const li = el('li', `doneness-step tier-${tierKey(tier)}`);
      li.append(el('span', 'doneness-swatch'), el('span', 'doneness-name', tierName(tier)));
      li.append(el('span', 'doneness-points', t('points', { p: E.TIERS[tier].points })));
      li.append(el('span', 'doneness-note', t(`tierNote.${tierKey(tier)}`)));
      scale.append(li);
    }

    const ranks = $('ranks');
    ranks.textContent = '';
    for (const rank of RANKS) {
      const li = el('li', 'rank-step');
      li.append(el('span', 'rank-step-name', t(`rank.${rank.key}`)), el('span', 'rank-step-from', `${rank.from}+`));
      ranks.append(li);
    }
  }

  // The course on screen: the current one, or the one just played.
  const shownRound = () => (phase === 'result' ? roundIndex() - 1 : roundIndex());

  function renderPlay() {
    show('play');
    const n = shownRound();
    const p = promptAt(n);
    const chefRound = isChefCourse(n);

    $('hud-title').textContent = t(`menuName.${game.menu}`);
    $('hud-sub').textContent = t('daily', { n: gameNumber(game.key) });
    $('hud-score').textContent = scoreOf(game.picks);
    $('hud-points').textContent = t('pointsLabel');

    const courses = $('courses');
    courses.textContent = '';
    for (let i = 0; i < ROUNDS; i++) {
      const pick = game.picks[i];
      const li = el('li', pick ? `course tier-${tierKey(pick.tier)}` : 'course', String(i + 1));
      if (isChefCourse(i)) li.classList.add('is-chef');
      if (i === n) li.classList.add('is-current');
      courses.append(li);
    }

    $('ticket-label').textContent = chefRound ? `${t('course', { n: n + 1 })} · ${t('beatTheChef')}` : t('course', { n: n + 1 });
    $('prompt').textContent = promptText(p);
    $('ticket').classList.toggle('is-chef', chefRound);

    const chefBar = $('chef-bar');
    chefBar.hidden = !chefRound;
    if (chefRound) {
      $('chef-said').textContent = t('chefSaid');
      $('chef-answer').textContent = answerName(chefAnswer());
      const badge = $('chef-tier');
      badge.textContent = '';
      badge.append(tierBadge(game.chef.tier, true));
      $('chef-goal').textContent = t('chefGoal');
      $('chef-goal').hidden = phase !== 'round';
    }

    $('answer').hidden = phase !== 'round';
    $('result').hidden = phase !== 'result';
    $('ticket').classList.toggle('is-done', phase === 'result');
    if (phase === 'round') renderFeedback();
    else renderResult(n);
  }

  function renderFeedback() {
    const box = $('feedback');
    if (!feedback) {
      box.textContent = '';
      return;
    }
    if (feedback.type === 'unknown') box.textContent = t('unknown', { text: feedback.text });
    else box.textContent = t(feedback.type);
  }

  function renderResult(n) {
    const pick = game.picks[n];
    const p = promptAt(n);

    const badge = $('result-tier');
    badge.textContent = '';
    badge.append(tierBadge(pick.tier, true));
    const answered = Boolean(pick.id);
    $('result-answer').textContent = answered ? pickName(pick, p) : t(pick.why === 'time' ? 'timeUp' : 'passed');
    $('result-answer').classList.toggle('is-burnt', !answered);
    $('result-note').textContent = t(`tierNote.${tierKey(pick.tier)}`);

    const verdict = $('chef-verdict');
    verdict.hidden = !isChefCourse(n);
    if (isChefCourse(n)) {
      const vars = { answer: answerName(chefAnswer()), tier: tierName(game.chef.tier).toLowerCase() };
      const outcome = pick.tier > game.chef.tier ? 'beat' : pick.tier === game.chef.tier ? 'tie' : 'lost';
      verdict.textContent = t(outcome, vars);
      verdict.className = `chef-verdict is-${outcome}`;
    }

    const exclude = [pick.id, game.chef && isChefCourse(n) ? game.chef.id : null].filter(Boolean);
    const list = E.examples(p, pick.tier, exclude, `${game.key}:${p.id}`, 6);
    $('examples-label').textContent = list.length
      ? t(pick.tier === 0 ? 'examplesAny' : pick.tier >= 5 ? 'examplesTop' : 'examplesRarer')
      : '';
    const ul = $('examples');
    ul.textContent = '';
    for (const a of list) {
      const li = el('li', `alt tier-${tierKey(a.tier)}`);
      li.append(el('span', 'alt-dot'), el('span', 'alt-name', answerName(a)));
      li.append(el('span', 'alt-tier', `${tierName(a.tier)} · ${t('points', { p: E.TIERS[a.tier].points })}`));
      ul.append(li);
    }

    $('next-label').textContent = n + 1 < ROUNDS ? t('next') : t('seeTotal');
  }

  let shareState = null; // 'copied' | 'fallback'
  let newDay = false; // midnight passed while the results were open

  function renderEnd() {
    show('end');
    const score = scoreOf(game.picks);
    const { rank, next } = rankFor(score);

    $('end-label').textContent = `${t(`menuName.${game.menu}`)} · ${t('daily', { n: gameNumber(game.key) })}`;
    $('end-title').textContent = t('total');
    $('end-score').textContent = score;
    $('end-rank').textContent = t(`rank.${rank.key}`);
    $('end-rank-next').textContent = next ? t('rankNext', { rank: t(`rank.${next.key}`), p: next.from }) : t('rankTop');
    $('end-meter').style.setProperty('--score', score / MAX_SCORE);

    const beatLine = $('end-beat');
    beatLine.hidden = !game.chef;
    if (game.chef) {
      beatLine.textContent = t(beatChef() ? 'beatYes' : 'beatNo');
      beatLine.classList.toggle('is-won', beatChef());
    }

    const recap = $('recap');
    recap.textContent = '';
    game.picks.forEach((pick, i) => {
      const p = promptAt(i);
      const li = el('li', `recap-row tier-${tierKey(pick.tier)}`);
      const what = el('div', 'recap-what');
      what.append(el('span', 'recap-prompt', isChefCourse(i) ? `${t('beatTheChef')} · ${promptText(p)}` : promptText(p)));
      what.append(el('span', 'recap-answer', pick.id ? pickName(pick, p) : '—'));
      li.append(what, tierBadge(pick.tier, true));
      recap.append(li);
    });

    $('share-label').textContent = t('share');
    $('share-msg').textContent = shareState ? t(shareState === 'copied' ? 'copied' : 'copyFallback') : '';

    const s = store.stats[game.menu];
    const values = [
      ['played', s.played],
      ['streak', s.streak],
      ['best', s.best],
      game.menu === 'chef' ? ['beaten', s.beaten] : ['average', s.played ? Math.round(s.total / s.played) : 0],
    ];
    const stats = $('stats');
    stats.textContent = '';
    for (const [key, value] of values) {
      const div = el('div', 'stat');
      div.append(el('dt', '', t(key)), el('dd', '', value));
      stats.append(div);
    }

    const other = game.menu === 'menu' ? 'chef' : 'menu';
    $('other-menu-label').textContent = isDone(today, other) ? t(`otherDone.${other}`) : t(`other.${other}`);
    $('home').textContent = t('home');
    updateCountdown();
  }

  function updateCountdown() {
    const box = $('countdown');
    const current = now();
    if (current.key !== today) {
      today = current.key; // a new day's prompts are out
      newDay = true;
    }
    if (newDay) {
      box.textContent = t('ready');
      return;
    }
    const s = current.secondsLeft;
    const pad = (v) => String(v).padStart(2, '0');
    const time = `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    box.textContent = t('nextGame', { time });
  }

  // Playing -----------------------------------------------------------------------------

  function start(menu) {
    today = now().key;
    newDay = false;
    game = dailyGame(menu);
    if (game.picks.length >= ROUNDS) finish();
    else beginRound();
  }

  function beginRound() {
    if (roundIndex() >= ROUNDS) return finish();
    // The clock keeps running through a reload: the start time is saved.
    if (!game.started) {
      game.started = Date.now();
      persist();
    }
    phase = 'round';
    feedback = null;
    const input = $('guess');
    input.value = '';
    render();

    const ticket = $('ticket');
    ticket.classList.remove('is-in');
    void ticket.offsetWidth; // restart the entrance animation
    ticket.classList.add('is-in');

    $('screen-play').scrollIntoView({ block: 'start', behavior: 'auto' });
    input.focus({ preventScroll: true });
    tick();
  }

  let shownSeconds = null;

  function tick() {
    cancelAnimationFrame(frame);
    shownSeconds = null;
    const step = () => {
      if (phase !== 'round') return;
      const left = game.started + ROUND_MS - Date.now();
      if (left <= 0) {
        endRound({ id: null, tier: 0, why: 'time' });
        return;
      }
      $('timer-bar').style.transform = `scaleX(${left / ROUND_MS})`;
      const seconds = Math.ceil(left / 1000);
      if (seconds !== shownSeconds) {
        shownSeconds = seconds;
        $('timer-num').textContent = seconds;
        $('ticket').classList.toggle('is-low', seconds <= 5);
      }
      frame = requestAnimationFrame(step);
    };
    step();
  }

  // The tab may have been in the background while the clock ran out.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && phase === 'round') tick();
  });

  function say(message) {
    feedback = message;
    renderFeedback();
    const field = $('answer').querySelector('.field');
    field.classList.remove('is-wrong');
    void field.offsetWidth;
    field.classList.add('is-wrong');
    $('guess').select();
  }

  function submitAnswer(text) {
    if (phase !== 'round') return;
    const value = text.trim();
    if (!value) return say({ type: 'empty' });
    const n = roundIndex();
    const found = E.match(promptAt(n), value);
    if (!found) return say({ type: 'unknown', text: value.slice(0, 40) });
    if (found.several) return say({ type: 'several' });
    const answer = found.answer;
    if (isChefCourse(n) && answer.id === game.chef.id) return say({ type: 'chefsOwn' });
    // Names are saved too, so old results still read well if the lists change.
    endRound({ id: answer.id, tier: answer.tier, en: answer.en, fr: answer.fr });
  }

  function endRound(pick) {
    cancelAnimationFrame(frame);
    game.picks.push(pick);
    game.started = null;
    persist();
    phase = 'result';
    feedback = null;
    render();

    $('announce').textContent = `${tierName(pick.tier)}, +${E.TIERS[pick.tier].points}. ${$('result-answer').textContent}`;
    $('result').classList.remove('is-in');
    void $('result').offsetWidth;
    $('result').classList.add('is-in');
    $('next').focus({ preventScroll: true });
    $('result').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function finish() {
    cancelAnimationFrame(frame);
    recordStats();
    phase = 'end';
    shareState = null;
    $('share-text').hidden = true;
    render();
    clearInterval(clock);
    clock = setInterval(updateCountdown, 1000);
    window.scrollTo(0, 0);
    $('end-title').focus({ preventScroll: true });
  }

  function goHome() {
    cancelAnimationFrame(frame);
    clearInterval(clock);
    today = now().key;
    phase = 'intro';
    render();
    window.scrollTo(0, 0);
  }

  // Sharing -------------------------------------------------------------------------------

  function shareText() {
    const score = scoreOf(game.picks);
    const head = t('shareHead', { n: gameNumber(game.key), menu: t(`menuName.${game.menu}`) });
    const squares = game.picks.map((p) => SQUARES[p.tier]).join('');
    const rank = t(`rank.${rankFor(score).rank.key}`);
    const lines = [`${head} · ${score}/${MAX_SCORE}`, squares, rank];
    if (game.chef) lines.push(t(beatChef() ? 'shareBeat' : 'shareLost'));
    lines.push(`${window.location.origin}/rare/`);
    return lines.join('\n');
  }

  async function share() {
    const text = shareText();
    const box = $('share-text');
    try {
      await navigator.clipboard.writeText(text);
      shareState = 'copied';
      box.hidden = true;
    } catch {
      shareState = 'fallback';
      box.value = text;
      box.hidden = false;
      box.select();
    }
    $('share-msg').textContent = t(shareState === 'copied' ? 'copied' : 'copyFallback');
  }

  // Wiring --------------------------------------------------------------------------------

  $('start-menu').addEventListener('click', () => start('menu'));
  $('start-chef').addEventListener('click', () => start('chef'));
  $('other-menu').addEventListener('click', () => start(game.menu === 'menu' ? 'chef' : 'menu'));
  $('home').addEventListener('click', goHome);
  $('share').addEventListener('click', share);

  $('answer').addEventListener('submit', (event) => {
    event.preventDefault();
    submitAnswer($('guess').value);
  });

  $('guess').addEventListener('input', () => {
    if (!feedback) return;
    feedback = null;
    renderFeedback();
  });

  $('pass').addEventListener('click', () => {
    if (phase === 'round') endRound({ id: null, tier: 0, why: 'pass' });
  });

  $('next').addEventListener('click', () => {
    if (roundIndex() >= ROUNDS) finish();
    else beginRound();
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  applyLanguage(lang(), false);
})();
