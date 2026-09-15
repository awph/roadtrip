// Runtime behaviour, kept deliberately small: offline flag, service worker
// registration, and horizontal swipe between days. Nothing else runs on load.
(function () {
  'use strict';

  var base = document.body.getAttribute('data-base') || '/';

  /* ---- Service worker ------------------------------------------------- */

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(base + 'sw.js', { scope: base })
        .catch(function (error) {
          console.warn('Service worker non enregistré :', error);
        });
    });
  }

  /* ---- Offline indicator ---------------------------------------------- */

  var flag = document.getElementById('indicateur-hors-ligne');

  function updateOnlineState() {
    if (!flag) return;
    flag.hidden = navigator.onLine;
  }

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  updateOnlineState();

  /* ---- Swipe between days --------------------------------------------- */

  var day = document.querySelector('.day');
  if (!day) return;

  var previousUrl = day.getAttribute('data-previous');
  var nextUrl = day.getAttribute('data-next');
  if (!previousUrl && !nextUrl) return;

  var startX = 0;
  var startY = 0;
  var startTime = 0;
  var tracking = false;

  var MIN_DISTANCE = 70;   // px, enough to not fire on a scroll wobble
  var MAX_OFF_AXIS = 60;   // px of vertical drift tolerated
  var MAX_DURATION = 700;  // ms

  day.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1) {
      tracking = false;
      return;
    }
    tracking = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  day.addEventListener('touchend', function (event) {
    if (!tracking) return;
    tracking = false;

    var touch = event.changedTouches[0];
    if (!touch) return;

    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;

    if (Date.now() - startTime > MAX_DURATION) return;
    if (Math.abs(dy) > MAX_OFF_AXIS) return;
    if (Math.abs(dx) < MIN_DISTANCE) return;

    // Swiping left moves forward, matching the direction of travel.
    if (dx < 0 && nextUrl) location.href = nextUrl;
    if (dx > 0 && previousUrl) location.href = previousUrl;
  }, { passive: true });

  // Keyboard equivalent, so the swipe is never the only way through.
  document.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var tag = (event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (event.key === 'ArrowRight' && nextUrl) location.href = nextUrl;
    if (event.key === 'ArrowLeft' && previousUrl) location.href = previousUrl;
  });
}());
