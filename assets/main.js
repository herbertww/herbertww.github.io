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
