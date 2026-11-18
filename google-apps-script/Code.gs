/** @OnlyCurrentDoc */
// ^ Limits this script to the one spreadsheet it's attached to.

/*
 * Cuisigo sign-ups
 * ================
 * Saves launch registrations from cuisigo.ca in this Google Sheet, and only
 * keeps addresses that are confirmed to be real.
 *
 *   1. Someone submits the form on cuisigo.ca.
 *   2. The newsletter box must be checked, and the address is checked: valid
 *      format, a domain that can receive email, and not a throwaway inbox.
 *      It goes in the "Pending" tab and gets an email with a confirmation link.
 *   3. When they click the link, the address moves to the "Sign-ups" tab.
 *      Unconfirmed addresses are deleted after a week.
 *
 * Privacy: this file is public on GitHub, but it holds no emails, passwords
 * or keys. The list only lives in this sheet. The web app can add sign-ups,
 * and nothing it sends back ever includes the list.
 *
 * Setup and updates: see "Set up the sign-up sheet" in the website's README.
 */

const CONFIG = {
  siteUrl: 'https://cuisigo.ca/', // confirmation links open this page
  senderName: 'Cuisigo', // "From" name on confirmation emails
  replyTo: '', // optional, e.g. 'hello@cuisigo.ca': where replies to confirmation emails go
  linkValidDays: 7, // confirmation links stop working after this many days
  resendAfterMinutes: 10, // never email the same address more often than this
};

// The two tabs, and their column numbers. Don't rename the tabs or reorder
// the columns; adding your own columns to the right is fine.
const SIGNUPS = {
  name: 'Sign-ups',
  headers: ['Email', 'Newsletter', 'Language', 'Confirmed at', 'Newsletter consent at', 'Newsletter consent text'],
};
const S = { email: 1, newsletter: 2, language: 3, confirmedAt: 4, consentAt: 5, consent: 6 };

const PENDING = {
  name: 'Pending',
  headers: ['Email', 'Newsletter', 'Language', 'Newsletter consent text', 'Requested at', 'Link sent at', 'Token'],
};
const P = { email: 1, newsletter: 2, language: 3, consent: 4, requestedAt: 5, sentAt: 6, token: 7 };

const EMAIL_RE = /^[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const SIX_HOURS_S = 6 * 60 * 60; // the longest Apps Script can cache anything

// Throwaway inbox services. Subdomains count too.
const THROWAWAY_DOMAINS = [
  '10minutemail.com', 'discard.email', 'dispostable.com', 'emailondeck.com', 'fakeinbox.com',
  'getnada.com', 'grr.la', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com',
  'jetable.org', 'mail.tm', 'maildrop.cc', 'mailinator.com', 'mailnesia.com', 'mintemail.com',
  'moakt.com', 'mohmal.com', 'mytemp.email', 'sharklasers.com', 'temp-mail.org', 'tempmail.com',
  'tempmail.net', 'tempr.email', 'throwawaymail.com', 'tmpmail.org', 'trash-mail.com',
  'trashmail.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
];

const EMAIL_TEXT = {
  en: {
    subject: 'Confirm your email for Cuisigo',
    intro: 'Please confirm your email address to join the Cuisigo launch list.',
    introNewsletter: 'Please confirm your email address to join the Cuisigo launch list and newsletter.',
    button: 'Confirm my email',
    copy: 'Or copy this link into your browser:',
    footer: (days) => `This link works for ${days} days. If you didn’t sign up, ignore this email and you won’t be added.`,
    signoff: 'The Cuisigo team',
  },
  fr: {
    subject: 'Confirme ton adresse courriel pour Cuisigo',
    intro: 'Confirme ton adresse courriel pour t’inscrire à la liste de lancement de Cuisigo.',
    introNewsletter: 'Confirme ton adresse courriel pour t’inscrire à la liste de lancement et à l’infolettre de Cuisigo.',
    button: 'Confirmer mon courriel',
    copy: 'Ou copie ce lien dans ton navigateur :',
    footer: (days) => `Ce lien est valide pendant ${days} jours. Si tu n’as rien demandé, ignore ce courriel : ton adresse ne sera pas ajoutée.`,
    signoff: 'L’équipe Cuisigo',
  },
};

// Shown only to visitors with JavaScript turned off (the form then opens this
// web app directly). Both languages, since the page can't know which one they read.
const PAGE_TEXT = {
  ok: [['Check your inbox.', 'We sent you a confirmation link. Click it to finish registering.'],
    ['Vérifie tes courriels.', 'On t’a envoyé un lien de confirmation. Clique dessus pour terminer ton inscription.']],
  invalid: [['Check your email address.', 'That address can’t receive our emails. Please go back and try again.'],
    ['Vérifie ton adresse courriel.', 'Cette adresse ne peut pas recevoir nos courriels. Reviens en arrière et réessaie.']],
  newsletter: [['Check the newsletter box.', 'Registering means getting the Cuisigo newsletter. Please go back and check the box.'],
    ['Coche la case de l’infolettre.', 'Pour t’inscrire, il faut accepter de recevoir l’infolettre de Cuisigo. Reviens en arrière et coche la case.']],
  busy: [['Lots of sign-ups right now.', 'Please try again a little later.'],
    ['Beaucoup d’inscriptions en ce moment.', 'Réessaie un peu plus tard.']],
  error: [['Something went wrong.', 'Please go back and try again.'],
    ['Oups, une erreur est survenue.', 'Reviens en arrière et réessaie.']],
};
const FIELD_ERRORS = ['invalid_email', 'email_domain', 'disposable'];

// ---------------------------------------------------------------------------
// Web app
// ---------------------------------------------------------------------------

// The form on cuisigo.ca posts here, both to register and to confirm.
function doPost(e) {
  const raw = (e && e.postData && e.postData.contents) || '';
  // The site's script sends JSON. A plain HTML form (no JavaScript) sends form fields.
  const asJson = raw.trim().charAt(0) === '{';
  let body = null;
  if (asJson) {
    try {
      body = JSON.parse(raw);
    } catch (err) {
      body = null;
    }
  } else {
    body = (e && e.parameter) || null;
  }
  if (!body || typeof body !== 'object') return reply_(asJson, { ok: false, error: 'bad_request' });

  let result;
  try {
    result = body.action === 'confirm' ? confirm_(body.token) : register_(body);
  } catch (err) {
    console.error(err);
    result = { ok: false, error: 'server_error' };
  }
  return reply_(asJson, result);
}

// Opening the web app's address in a browser shows this. It never shows sign-ups.
function doGet() {
  return ContentService.createTextOutput('The Cuisigo sign-up service is running.');
}

// Run this once from the Apps Script editor: pick "setup" in the toolbar, then
// click Run. It creates the two tabs and has Google ask for the permissions the
// script needs.
function setup() {
  sheet_(SIGNUPS);
  sheet_(PENDING);
  console.log(lookUpMailDomain_('gmail.com') ? 'Email domain check works.' : 'Email domain check gave an unexpected answer.');
  console.log('Confirmation emails you can still send today: ' + MailApp.getRemainingDailyQuota());
  console.log('All set. Next: Deploy > New deployment > Web app.');
}

// ---------------------------------------------------------------------------
// Registering and confirming
// ---------------------------------------------------------------------------

function register_(body) {
  // Honeypot: people never see the "website" field, but bots fill it in. Pretend it worked.
  if (clean_(body.website)) return { ok: true };

  const email = String(body.email == null ? '' : body.email).trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid_email' };

  // Registering means getting the newsletter: the box on the form is required.
  const newsletter = [true, 'true', 'yes', 'on'].indexOf(body.newsletter) !== -1;
  if (!newsletter) return { ok: false, error: 'newsletter_required' };

  const domain = email.slice(email.indexOf('@') + 1);
  if (isThrowaway_(domain)) return { ok: false, error: 'disposable' };
  if (!domainAcceptsMail_(domain)) return { ok: false, error: 'email_domain' };

  const language = body.language === 'fr' ? 'fr' : 'en';
  const consent = newsletter ? clean_(body.consent_text) : '';

  return withLock_(() => {
    const signups = sheet_(SIGNUPS);
    const pending = sheet_(PENDING);
    removeExpired_(pending);

    // Already confirmed, with nothing new to confirm: don't email them again.
    // The reply is the same either way, so the form never reveals who is on the list.
    const known = findRow_(signups, S.email, email);
    if (known && (!newsletter || signups.getRange(known, S.newsletter).getValue() === 'yes')) return { ok: true };

    const now = new Date();
    let row = findRow_(pending, P.email, email);
    let token = '';
    if (row) {
      const values = pending.getRange(row, 1, 1, PENDING.headers.length).getValues()[0];
      token = String(values[P.token - 1]);
      if (!TOKEN_RE.test(token)) {
        token = Utilities.getUuid();
        pending.getRange(row, P.token).setValue(token);
      }
      // The latest request wins: newsletter, language, consent text, time.
      pending.getRange(row, P.newsletter, 1, 4).setValues([[newsletter ? 'yes' : 'no', language, asText_(consent), now]]);
      const sentAt = values[P.sentAt - 1];
      if (sentAt instanceof Date && now - sentAt < CONFIG.resendAfterMinutes * 60 * 1000) return { ok: true };
    }

    // Gmail limits how many emails a script sends per day. Checking before saving
    // anything also means a flood of fake sign-ups can't fill up the sheet.
    if (MailApp.getRemainingDailyQuota() < 1) return { ok: false, error: 'busy' };

    if (!row) {
      token = Utilities.getUuid();
      pending.appendRow([email, newsletter ? 'yes' : 'no', language, asText_(consent), now, '', token]);
      row = pending.getLastRow();
    }
    sendConfirmation_(email, language, newsletter, token);
    pending.getRange(row, P.sentAt).setValue(new Date());
    return { ok: true };
  });
}

function confirm_(rawToken) {
  const token = String(rawToken == null ? '' : rawToken).trim().toLowerCase();
  if (!TOKEN_RE.test(token)) return { ok: false, error: 'invalid_token' };
  const cache = CacheService.getScriptCache();

  return withLock_(() => {
    const pending = sheet_(PENDING);
    const row = findRow_(pending, P.token, token);
    if (!row) {
      // Already used? If it worked in the last few hours (a double click, say), say so again.
      const earlier = cache.get('done:' + token);
      return earlier ? JSON.parse(earlier) : { ok: false, error: 'invalid_token' };
    }

    const values = pending.getRange(row, 1, 1, PENDING.headers.length).getValues()[0];
    deleteRow_(pending, row);
    const sentAt = values[P.sentAt - 1];
    if (!(sentAt instanceof Date) || Date.now() - sentAt.getTime() > CONFIG.linkValidDays * DAY_MS) {
      return { ok: false, error: 'invalid_token' };
    }

    const email = String(values[P.email - 1]);
    const wantsNewsletter = values[P.newsletter - 1] === 'yes';
    const language = values[P.language - 1] === 'fr' ? 'fr' : 'en';
    const consent = String(values[P.consent - 1]);
    const now = new Date();

    const signups = sheet_(SIGNUPS);
    const known = findRow_(signups, S.email, email);
    const alreadyNewsletter = known > 0 && signups.getRange(known, S.newsletter).getValue() === 'yes';
    if (!known) {
      signups.appendRow([
        email,
        wantsNewsletter ? 'yes' : 'no',
        language,
        now,
        wantsNewsletter ? now : '',
        wantsNewsletter ? asText_(consent) : '',
      ]);
    } else if (wantsNewsletter && !alreadyNewsletter) {
      // Someone already on the list has now also confirmed the newsletter.
      signups.getRange(known, S.newsletter, 1, 2).setValues([['yes', language]]);
      signups.getRange(known, S.consentAt, 1, 2).setValues([[now, asText_(consent)]]);
    }

    const result = { ok: true, newsletter: wantsNewsletter || alreadyNewsletter };
    cache.put('done:' + token, JSON.stringify(result), SIX_HOURS_S);
    return result;
  });
}

function sendConfirmation_(to, language, newsletter, token) {
  const t = EMAIL_TEXT[language];
  const link = CONFIG.siteUrl + '?confirm=' + token + '&lang=' + language;
  const intro = newsletter ? t.introNewsletter : t.intro;
  const footer = t.footer(CONFIG.linkValidDays);
  const href = link.replace(/&/g, '&amp;');

  const message = {
    to,
    subject: t.subject,
    name: CONFIG.senderName,
    body: `${intro}\n\n${t.button}: ${link}\n\n${footer}\n\n${t.signoff}`,
    htmlBody:
      `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111111;max-width:480px">` +
      `<p>${intro}</p>` +
      `<p style="margin:28px 0"><a href="${href}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px">${t.button}</a></p>` +
      `<p style="color:#5c5c58;font-size:14px">${t.copy}<br><a href="${href}" style="color:#5c5c58;word-break:break-all">${href}</a></p>` +
      `<p style="color:#5c5c58;font-size:14px">${footer}</p>` +
      `<p>${t.signoff}</p>` +
      `</div>`,
  };
  if (CONFIG.replyTo) message.replyTo = CONFIG.replyTo;
  MailApp.sendEmail(message);
}

function reply_(asJson, result) {
  if (asJson) {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  let kind = 'error';
  if (result.ok) kind = 'ok';
  else if (FIELD_ERRORS.indexOf(result.error) !== -1) kind = 'invalid';
  else if (result.error === 'newsletter_required') kind = 'newsletter';
  else if (result.error === 'busy') kind = 'busy';
  const [en, fr] = PAGE_TEXT[kind];
  const html =
    `<div style="font:17px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111111;max-width:34rem;margin:12vh auto;padding:0 20px">` +
    `<h1 style="font-size:1.9rem;line-height:1.15;margin:0 0 .4em">${en[0]}</h1><p>${en[1]}</p>` +
    `<h2 lang="fr" style="font-size:1.4rem;line-height:1.2;margin:2em 0 .4em">${fr[0]}</h2><p lang="fr">${fr[1]}</p>` +
    `<p style="margin-top:2.5em"><a href="${CONFIG.siteUrl}" target="_top" style="color:#111111">Back to Cuisigo · Retour à Cuisigo</a></p>` +
    `</div>`;
  return HtmlService.createHtmlOutput(html).setTitle('Cuisigo').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------------------
// Is this a real email domain?
// ---------------------------------------------------------------------------

function isThrowaway_(domain) {
  return THROWAWAY_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

// Asks Google Public DNS whether the domain has mail servers. Only the part
// after the @ is looked up. If the lookup itself fails, the address is let
// through: the confirmation email is the final check anyway.
function domainAcceptsMail_(domain) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('mx:' + domain);
  if (cached) return cached === 'yes';
  let accepts;
  try {
    accepts = lookUpMailDomain_(domain);
  } catch (err) {
    console.warn('DNS lookup failed for ' + domain + ': ' + err);
    return true;
  }
  cache.put('mx:' + domain, accepts ? 'yes' : 'no', SIX_HOURS_S);
  return accepts;
}

function lookUpMailDomain_(domain) {
  const mx = dns_(domain, 'MX');
  if (mx.Status === 3) return false; // the domain doesn't exist
  if (mx.Status !== 0) throw new Error('DNS status ' + mx.Status);
  const servers = (mx.Answer || []).filter((r) => r.type === 15);
  if (servers.length) {
    // "0 ." is a "null MX": the domain says it accepts no email at all.
    return servers.some((r) => {
      const host = String(r.data).trim().split(/\s+/)[1] || '';
      return host !== '' && host !== '.';
    });
  }
  // No mail servers listed: mail then goes to the domain's own address, if it has one.
  const hasAddress = (type, code) => {
    const res = dns_(domain, type);
    return res.Status === 0 && (res.Answer || []).some((r) => r.type === code);
  };
  return hasAddress('A', 1) || hasAddress('AAAA', 28);
}

function dns_(name, type) {
  const url = 'https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
  return JSON.parse(res.getContentText());
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function sheet_(def) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(def.name);
  if (sheet) return sheet;
  // A brand-new spreadsheet has one empty tab: reuse it rather than leave it lying around.
  const tabs = book.getSheets();
  const blank = tabs.length === 1 && tabs[0].getLastRow() === 0 ? tabs[0] : null;
  sheet = blank ? blank.setName(def.name) : book.insertSheet(def.name);
  sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

// Row number where `value` fills a cell of `column`, or 0.
function findRow_(sheet, column, value) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const cell = sheet.getRange(2, column, last - 1, 1).createTextFinder(value).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

// Sheets won't delete the only row under a frozen header, so that one is cleared instead.
function deleteRow_(sheet, row) {
  if (sheet.getMaxRows() > sheet.getFrozenRows() + 1) sheet.deleteRow(row);
  else sheet.getRange(row, 1, 1, sheet.getMaxColumns()).clearContent();
}

// Deletes pending sign-ups whose link has expired.
function removeExpired_(pending) {
  const last = pending.getLastRow();
  if (last < 2) return;
  const rows = pending.getRange(2, 1, last - 1, PENDING.headers.length).getValues();
  const cutoff = Date.now() - CONFIG.linkValidDays * DAY_MS;
  for (let i = rows.length - 1; i >= 0; i--) {
    const stamp = rows[i][P.sentAt - 1] || rows[i][P.requestedAt - 1];
    if (stamp instanceof Date && stamp.getTime() < cutoff) deleteRow_(pending, i + 2);
  }
}

// One request at a time, so two sign-ups can't write the same row.
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'busy' };
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function clean_(value) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 300);
}

// Text starting with = + - or @ would become a formula in Sheets. A leading
// apostrophe keeps it plain text (the apostrophe doesn't show in the cell).
function asText_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}
