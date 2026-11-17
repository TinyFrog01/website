(() => {
  const root = document.documentElement;
  const form = document.getElementById('register');
  const done = document.getElementById('signup-done');
  const email = document.getElementById('email');
  const msg = document.getElementById('form-msg');
  const submit = form.querySelector('button[type="submit"]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MESSAGES = {
    en: {
      invalid_email: 'Please enter a valid email address.',
      rate_limited: 'Too many attempts. Please try again in a few minutes.',
      network: 'We couldn’t reach the server. Check your connection and try again.',
      error: 'Something went wrong. Please try again.',
    },
    fr: {
      invalid_email: 'Entre une adresse courriel valide.',
      rate_limited: 'Trop de tentatives. Réessaie dans quelques minutes.',
      network: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.',
      error: 'Oups, une erreur est survenue. Réessaie.',
    },
  };

  let messageKey = null;
  const lang = () => (root.lang === 'fr' ? 'fr' : 'en');

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
    if (key === 'invalid_email') email.setAttribute('aria-invalid', 'true');
    else email.removeAttribute('aria-invalid');
  }

  function setBusy(busy) {
    form.classList.toggle('is-busy', busy);
    form.setAttribute('aria-busy', String(busy));
    submit.disabled = busy;
  }

  function showDone(address, newsletter) {
    done.querySelectorAll('[data-email]').forEach((el) => {
      el.textContent = address;
    });
    done.querySelector('[data-newsletter-note]').hidden = !newsletter;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.classList.contains('is-busy')) return;

    const address = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
      showMessage('invalid_email');
      email.focus();
      return;
    }

    const newsletter = form.elements.newsletter.checked;
    const consentLabel = form.querySelector(`.consent-text[lang="${lang()}"]`);
    const payload = {
      email: address,
      newsletter,
      language: lang(),
      // Stored with the sign-up as a record of exactly what the person agreed to.
      consent_text: newsletter && consentLabel ? consentLabel.textContent.trim() : '',
      website: form.elements.website.value,
    };

    setBusy(true);
    showMessage(null);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) || {};
      if (res.ok) {
        showDone(address, newsletter);
      } else if (data.error in MESSAGES.en) {
        showMessage(data.error);
      } else {
        showMessage(res.status === 429 ? 'rate_limited' : 'error');
      }
    } catch {
      showMessage('network');
    } finally {
      setBusy(false);
    }
  });

  email.addEventListener('input', () => {
    if (messageKey) showMessage(null);
  });

  done.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    showMessage(null);
    done.hidden = true;
    form.hidden = false;
    email.focus();
  });

  // The closing "Register" button brings you back to the form.
  document.querySelectorAll('[data-to-signup]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById('signup').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      (form.hidden ? done : email).focus({ preventScroll: true });
    });
  });

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
})();
