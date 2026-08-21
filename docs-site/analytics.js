'use strict';

(() => {
  const measurementId = 'G-3KQ9KECXR9';

  document.addEventListener('click', (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('button, a')
      : null;
    if (!target) return;

    if (target.matches('[data-copy]') && target.dataset.copy.startsWith('npm install')) {
      track('install_copy');
    } else if (target.id === 'merge-button') {
      track('playground_run');
    } else if (target.matches('a[href*="npmjs.com/package/"]')) {
      track('npm_open');
    } else if (target.matches('a[href*="github.com/alexandroit/"]')) {
      track('github_open');
    }
  });

  if (globalThis.location.hostname !== 'alexandro.net') return;

  globalThis.dataLayer = globalThis.dataLayer || [];
  globalThis.gtag = globalThis.gtag || function gtag() {
    globalThis.dataLayer.push(arguments);
  };
  globalThis.gtag('js', new Date());
  globalThis.gtag('config', measurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    anonymize_ip: true
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);

  function track(action) {
    if (typeof globalThis.gtag !== 'function') return;
    globalThis.gtag('event', action, {
      event_category: 'package_docs',
      package_name: '@stackline/deepmerge'
    });
  }
})();
