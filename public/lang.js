// Runs before the page renders: picks the language (the link's ?lang=, then the
// saved choice, then the browser's preference, then English) so the right copy
// shows on first paint.
(function () {
  var root = document.documentElement;
  var lang = null;
  root.classList.add('js');

  // Confirmation emails link back with the language the person signed up in.
  var fromLink = /[?&]lang=(en|fr)(?:&|$)/.exec(window.location.search);
  if (fromLink) {
    lang = fromLink[1];
  } else {
    try {
      lang = localStorage.getItem('cuisigo-lang');
    } catch (e) {}
  }

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
