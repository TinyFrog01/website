// Ads beside the game: one AdSense display unit in each side column.
// The columns only show on wide screens (rare.css), and ads are only requested
// while they show: AdSense can't fill a slot that is hidden.
(function () {
  'use strict';

  const CLIENT = 'ca-pub-8693995366671646';
  // The display ad unit's ID (digits only), from AdSense → Ads → By ad unit →
  // Display ads, sized 160 × 600. Both columns use it. While it is empty, the
  // columns stay empty.
  const SLOT = '';
  const wide = window.matchMedia('(min-width: 1360px)');

  function fill() {
    if (!wide.matches || !/^\d+$/.test(SLOT)) return;
    document.querySelectorAll('[data-ad-rail]').forEach((rail) => {
      if (rail.querySelector('ins')) return;
      const ad = document.createElement('ins');
      ad.className = 'adsbygoogle';
      ad.style.cssText = 'display:inline-block;width:160px;height:600px';
      ad.dataset.adClient = CLIENT;
      ad.dataset.adSlot = SLOT;
      rail.append(ad);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  fill();
  // A window made wider later gets its ads then.
  wide.addEventListener('change', fill);
})();
