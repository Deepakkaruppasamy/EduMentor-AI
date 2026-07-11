(function () {
  var splash = document.getElementById('pwa-splash');
  var isPWA = (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );

  // Expose for React to read
  window.__IS_PWA__ = isPWA;
  window.__SPLASH_SHOWN__ = true;

  // For browser (non-PWA), hide quickly after a short delay
  if (!isPWA) {
    setTimeout(function () {
      if (splash) {
        splash.classList.add('splash-exit');
        setTimeout(function () { splash.classList.add('splash-hidden'); }, 700);
      }
    }, 400);
  }

  // Expose dismiss function for React component
  window.__dismissSplash__ = function (delay) {
    delay = delay || 0;
    setTimeout(function () {
      if (splash && !splash.classList.contains('splash-exit')) {
        splash.classList.add('splash-exit');
        setTimeout(function () { splash.classList.add('splash-hidden'); }, 750);
      }
    }, delay);
  };
})();
