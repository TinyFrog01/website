// Runs before the page renders: picks the language (saved choice, then the
// browser's preference, then English) so the right copy shows on first paint.
(function () {
  var root = document.documentElement;
  var lang = null;
  root.classList.add('js');

  try {
    lang = localStorage.getItem('cuisigo-lang');
  } catch (e) {}

  if (lang !== 'en' && lang !== 'fr') {
    lang = 'en';
    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).toLowerCase();
      if (code.indexOf('fr') === 0) { lang = 'fr'; break; }
      if (code.indexOf('en') === 0) break;
    }
  }

  root.lang = lang;
  var title = root.getAttribute('data-' + lang + '-title');
  if (title) document.title = title;
})();
