(() => {
  const root = document.documentElement;
  const form = document.getElementById('register');
  const done = document.getElementById('signup-done');
  const confirmed = document.getElementById('signup-confirmed');
  const email = document.getElementById('email');
  const msg = document.getElementById('form-msg');
  const submit = form.querySelector('button[type="submit"]');
  const newsletterBox = form.elements.newsletter;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Without this script, the browser checks the required fields itself (empty
  // email, unchecked newsletter box). With it, the form shows its own messages.
  form.noValidate = true;

  const MESSAGES = {
    en: {
      invalid_email: 'Please enter a valid email address.',
      newsletter_required: 'Please check the newsletter box to register.',
      email_domain: 'This email address can’t receive mail. Check it for typos.',
      disposable: 'Please use your regular email address, not a temporary one.',
      busy: 'Lots of sign-ups right now. Please try again a little later.',
      network: 'We couldn’t reach the server. Check your connection and try again.',
      error: 'Something went wrong. Please try again.',
      sending: 'Sending your confirmation link…',
      invalid_token: 'This confirmation link has expired or was already used. Enter your email to get a new one.',
      confirm_failed: 'We couldn’t confirm your email. Please open the link in the email again.',
    },
    fr: {
      invalid_email: 'Entre une adresse courriel valide.',
      newsletter_required: 'Coche la case de l’infolettre pour t’inscrire.',
      email_domain: 'Cette adresse ne peut pas recevoir de courriels. Vérifie qu’il n’y a pas de faute de frappe.',
      disposable: 'Utilise ton adresse courriel habituelle, pas une adresse temporaire.',
      busy: 'Il y a beaucoup d’inscriptions en ce moment. Réessaie un peu plus tard.',
      network: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.',
      error: 'Oups, une erreur est survenue. Réessaie.',
      sending: 'Envoi de ton lien de confirmation…',
      invalid_token: 'Ce lien de confirmation a expiré ou a déjà été utilisé. Entre ton courriel pour en recevoir un nouveau.',
      confirm_failed: 'Impossible de confirmer ton courriel. Ouvre de nouveau le lien dans le courriel.',
    },
  };
  // Problems with a field: that field gets marked as invalid and focused.
  const FIELD_FOR = {
    invalid_email: email,
    email_domain: email,
    disposable: email,
    newsletter_required: newsletterBox,
  };
  const fieldFor = (key) => (Object.prototype.hasOwnProperty.call(FIELD_FOR, key) ? FIELD_FOR[key] : null);
  // Progress rather than a problem: shown in grey, not red.
  const STATUS = ['sending'];

  // The same rule as the sign-up script (google-apps-script/Code.gs), so a
  // mistyped address is caught here, before anything is sent.
  const EMAIL_RE = /^[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
  // Big email providers the sign-up script always accepts. For these, "Check
  // your inbox" shows straight away while the sign-up finishes in the
  // background; other addresses wait for the script's checks.
  const KNOWN_PROVIDERS = new Set([
    'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.ca', 'hotmail.fr', 'outlook.com', 'outlook.fr',
    'live.com', 'live.ca', 'live.fr', 'msn.com', 'yahoo.com', 'yahoo.ca', 'yahoo.fr', 'icloud.com', 'me.com',
    'mac.com', 'videotron.ca', 'sympatico.ca', 'bell.net', 'cogeco.ca', 'globetrotter.net', 'telus.net',
    'shaw.ca', 'rogers.com', 'proton.me', 'protonmail.com', 'aol.com', 'gmx.com', 'orange.fr', 'free.fr',
    'laposte.net', 'sfr.fr',
  ]);

  let messageKey = null;
  let attempt = 0; // each sign-up or confirmation; a late answer about an earlier one is ignored
  const lang = () => (root.lang === 'fr' ? 'fr' : 'en');
  const hasMessage = (key) => Object.prototype.hasOwnProperty.call(MESSAGES.en, key);

  // Language ------------------------------------------------------------------

  function applyLanguage(next, remember) {
    root.lang = next;
    document.querySelectorAll('[data-set-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.setLang === next));
    });
    for (const attr of ['placeholder', 'alt']) {
      document.querySelectorAll(`[data-${next}-${attr}]`).forEach((el) => {
        el.setAttribute(attr, el.getAttribute(`data-${next}-${attr}`));
      });
    }
    const title = root.getAttribute(`data-${next}-title`);
    if (title) document.title = title;
    // The Play Rare links open the game in the language shown here.
    document.querySelectorAll('a[href^="/rare/"]').forEach((link) => {
      link.href = `/rare/?lang=${next}`;
    });
    if (messageKey) showMessage(messageKey);
    if (remember) {
      try {
        localStorage.setItem('cuisigo-lang', next);
      } catch {}
    }
  }

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.setLang, true));
  });

  // Registration ----------------------------------------------------------------

  function showMessage(key) {
    messageKey = key;
    msg.textContent = key ? MESSAGES[lang()][key] : '';
    msg.classList.toggle('is-status', STATUS.includes(key));
    for (const field of [email, newsletterBox]) {
      if (field === fieldFor(key)) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
  }

  function setBusy(busy) {
    form.classList.toggle('is-busy', busy);
    form.setAttribute('aria-busy', String(busy));
    submit.disabled = busy;
  }

  function showPanel(panel) {
    form.hidden = true;
    done.hidden = panel !== done;
    confirmed.hidden = panel !== confirmed;
    panel.focus();
  }

  function showForm() {
    form.hidden = false;
    done.hidden = true;
    confirmed.hidden = true;
  }

  function showDone(address) {
    done.querySelectorAll('[data-email]').forEach((el) => {
      el.textContent = address;
    });
    showPanel(done);
  }

  // Sign-ups go to a Google Apps Script web app (google-apps-script/Code.gs),
  // whose address is the form's action. The JSON goes out labelled as plain
  // text so the browser sends it straight away: other types make it ask the
  // server for permission first, which Apps Script can't answer. "keepalive"
  // lets the request finish even if the visitor closes the tab right away.
  async function send(payload) {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return (await res.json().catch(() => null)) || {};
  }

  // Google's script is slow to answer when it hasn't run for a while. Waking it
  // up while the visitor types their email means it's ready when they click
  // Register. Nothing is sent: it's an empty request.
  let warmedUp = false;
  function warmUp() {
    if (warmedUp) return;
    warmedUp = true;
    fetch(form.action, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  }
  email.addEventListener('focus', warmUp);
  email.addEventListener('input', warmUp);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.classList.contains('is-busy')) return;

    const address = email.value.trim();
    const lower = address.toLowerCase();
    if (lower.length > 254 || !EMAIL_RE.test(lower)) {
      showMessage('invalid_email');
      email.focus();
      return;
    }

    // Registering means getting the newsletter, so the box is required.
    if (!newsletterBox.checked) {
      showMessage('newsletter_required');
      newsletterBox.focus();
      return;
    }

    const consentLabel = form.querySelector(`.consent-text[lang="${lang()}"]`);
    const payload = {
      email: address,
      newsletter: true,
      language: lang(),
      // Stored with the sign-up as a record of exactly what the person agreed to.
      consent_text: consentLabel ? consentLabel.textContent.trim() : '',
      website: form.elements.website.value,
    };

    const thisAttempt = ++attempt;
    const instant = KNOWN_PROVIDERS.has(lower.slice(lower.indexOf('@') + 1));
    if (instant) {
      showMessage(null);
      showDone(address);
    } else {
      setBusy(true);
      showMessage('sending');
    }

    let error = null;
    try {
      const data = await send(payload);
      if (data.ok !== true) error = hasMessage(data.error) ? data.error : 'error';
    } catch {
      error = 'network';
    }
    if (!instant) setBusy(false);
    if (thisAttempt !== attempt) return; // they've moved on, e.g. "Use a different email"

    if (!error) {
      if (!instant) {
        showMessage(null);
        showDone(address);
      }
      return;
    }
    // Back to the form to say what went wrong.
    showForm();
    showMessage(error);
    (fieldFor(error) || email).focus();
  });

  email.addEventListener('input', () => {
    if (messageKey) showMessage(null);
  });

  newsletterBox.addEventListener('change', () => {
    if (newsletterBox.checked && messageKey === 'newsletter_required') showMessage(null);
  });

  document.querySelectorAll('[data-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      attempt++;
      form.reset();
      showMessage(null);
      showForm();
      email.focus();
    });
  });

  // The closing "Register" button brings you back to the form.
  document.querySelectorAll('[data-to-signup]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById('signup').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      const panel = [done, confirmed].find((el) => !el.hidden);
      (panel || email).focus({ preventScroll: true });
    });
  });

  // The link in a confirmation email opens https://cuisigo.ca/?confirm=…&lang=…
  // "You're on the list" shows straight away while the confirmation finishes
  // in the background; in the rare case it fails, the form says why.
  async function confirmFromLink() {
    const token = new URLSearchParams(window.location.search).get('confirm');
    if (token === null) return;
    // Take the token out of the address bar so it doesn't end up in bookmarks or shared links.
    history.replaceState(null, '', window.location.pathname + window.location.hash);

    const thisAttempt = ++attempt;
    const note = confirmed.querySelector('[data-newsletter-note]');
    note.hidden = false;
    showPanel(confirmed);

    let error = null;
    let data = {};
    try {
      data = await send({ action: 'confirm', token });
      if (data.ok !== true) error = data.error === 'invalid_token' ? 'invalid_token' : 'confirm_failed';
    } catch {
      error = 'confirm_failed';
    }
    if (thisAttempt !== attempt) return;

    if (!error) {
      note.hidden = data.newsletter === false;
      return;
    }
    showForm();
    showMessage(error);
    email.focus();
  }

  // Sections come into focus as they scroll into view -------------------------

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  applyLanguage(lang(), false);
  confirmFromLink();
})();
