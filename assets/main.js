// Theme toggle + scroll reveal. No dependencies.
(function () {
  var root = document.documentElement;

  function readStored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }
  function store(v) {
    try { localStorage.setItem('theme', v); } catch (e) { /* private mode, shields, etc. */ }
  }

  var saved = readStored();
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  var btn = document.getElementById('theme');
  if (btn) {
    btn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      if (!current) {
        current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store(next);
    });
  }

  // ── videos: hold on the poster frame if motion is unwelcome ──
  (function videos() {
    var vids = document.querySelectorAll('video');
    if (!vids.length || !window.matchMedia) return;
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function apply() {
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (mq.matches) { v.pause(); v.removeAttribute('autoplay'); }
        else if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      }
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  })();

  // ── gallery: snap scrolling, arrows, drag, keyboard ──
  (function gallery() {
    var track = document.getElementById('g-track');
    if (!track) return;

    var slides = track.children;
    var prev = document.querySelector('.g-prev');
    var next = document.querySelector('.g-next');
    var count = document.getElementById('g-count');

    function step() {
      if (!slides.length) return track.clientWidth;
      var a = slides[0].getBoundingClientRect();
      var b = slides.length > 1 ? slides[1].getBoundingClientRect() : null;
      return b ? b.left - a.left : a.width;
    }

    function current() {
      var s = step();
      if (!s) return 0;
      var i = Math.round(track.scrollLeft / s);
      return Math.max(0, Math.min(slides.length - 1, i));
    }

    var shown = 0;

    function sync(i) {
      if (typeof i === 'number') shown = i;
      if (count) count.textContent = (shown + 1) + ' / ' + slides.length;
      var atStart = track.scrollLeft < 4;
      var atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
      if (prev) prev.disabled = atStart;
      if (next) next.disabled = atEnd;
    }

    function go(dir) {
      var s = step();
      var target = Math.max(0, Math.min(slides.length - 1, shown + dir));
      track.scrollTo({ left: target * s, behavior: 'smooth' });
      // update the label now rather than waiting on a frame
      shown = target;
      if (count) count.textContent = (shown + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = target === 0;
      if (next) next.disabled = target === slides.length - 1;
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
    });

    // Which slide is showing: observed, not inferred from scroll events —
    // this also covers native touch swipes and momentum scrolling.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var best = null;
        entries.forEach(function (e) {
          if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
        });
        if (best) sync([].indexOf.call(slides, best.target));
      }, { root: track, threshold: [0.55, 0.9] });
      for (var k = 0; k < slides.length; k++) io.observe(slides[k]);
    }

    var raf = 0;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; sync(current()); });
    }, { passive: true });

    // pointer drag (desktop); touch already scrolls natively
    var down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0;
      startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('dragging');
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      track.scrollLeft = startLeft - dx;
    });
    function release() {
      if (!down) return;
      down = false;
      track.classList.remove('dragging');
      // settle on the nearest slide once snapping is back on
      var i = current();
      track.scrollTo({ left: i * step(), behavior: 'smooth' });
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('pointerleave', release);
    // a drag shouldn't fire a click on whatever ended up under the cursor
    track.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    sync(0);
    window.addEventListener('resize', function () { sync(current()); });
  })();

  var items = document.querySelectorAll('.reveal');

  function showAll() {
    for (var i = 0; i < items.length; i++) items[i].classList.add('in');
  }

  // Backstop: whatever happens to the observer, nothing stays invisible.
  setTimeout(showAll, 2500);

  if (!('IntersectionObserver' in window)) { showAll(); return; }

  try {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  } catch (e) {
    showAll();
  }
})();
