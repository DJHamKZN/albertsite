/* =========================================================
   Альберт Шакуров — интерактив лендинга
   Без зависимостей. Всё деградирует корректно без JS.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Шапка: тень/граница после прокрутки
     --------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     2. Мобильное меню
     --------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');

  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Открыть меню');
    };

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) closeNav();
    });
  }

  /* ---------------------------------------------------------
     3. Подсветка активного пункта меню
     --------------------------------------------------------- */
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active',
            a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------
     4. Появление блоков при прокрутке
     --------------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // лёгкая каскадная задержка внутри одной группы
        var delay = Math.min(i * 55, 220);
        setTimeout(function () { el.classList.add('is-visible'); }, delay);
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(revealables, function (el) { revealer.observe(el); });
  }

  /* ---------------------------------------------------------
     5. Портрет: заглушка, если файла ещё нет
     --------------------------------------------------------- */
  var portraitImg = document.getElementById('portraitImg');
  var portraitFrame = document.getElementById('portraitFrame');

  if (portraitImg && portraitFrame) {
    var markMissing = function () { portraitFrame.classList.add('no-image'); };
    if (portraitImg.complete && portraitImg.naturalWidth === 0) markMissing();
    portraitImg.addEventListener('error', markMissing);
  }

  /* ---------------------------------------------------------
     6. FAQ-аккордеон
     --------------------------------------------------------- */
  var faqButtons = document.querySelectorAll('.faq-q');

  Array.prototype.forEach.call(faqButtons, function (btn, i) {
    var item = btn.closest('.faq-item');
    var panel = item ? item.querySelector('.faq-a') : null;
    if (!item || !panel) return;

    var panelId = 'faq-panel-' + (i + 1);
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    btn.setAttribute('aria-controls', panelId);

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');

      // аккордеон: одновременно открыт один вопрос
      Array.prototype.forEach.call(faqButtons, function (other) {
        var otherItem = other.closest('.faq-item');
        if (!otherItem || otherItem === item) return;
        otherItem.classList.remove('is-open');
        other.setAttribute('aria-expanded', 'false');
      });

      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });

  /* ---------------------------------------------------------
     7. Калькулятор экономики сделки
     --------------------------------------------------------- */
  var form = document.getElementById('calcForm');

  if (form) {
    var fields = ['buy', 'repair', 'other', 'sell'].map(function (id) {
      return document.getElementById(id);
    });

    var outProfit = document.getElementById('outProfit');
    var outInvestor = document.getElementById('outInvestor');
    var outTeam = document.getElementById('outTeam');
    var totalBox = document.getElementById('calcTotalBox');
    var splitBox = document.getElementById('calcSplit');
    var warning = document.getElementById('calcWarning');
    var resetBtn = document.getElementById('calcReset');

    var defaults = { buy: 2150000, repair: 50000, other: 0, sell: 2500000 };

    // "2 150 000" / "2150000,50" / "2 150 000 ₽" -> число
    var parseNum = function (raw) {
      if (!raw) return 0;
      var cleaned = String(raw)
        .replace(/ /g, ' ')
        .replace(/,/g, '.')
        .replace(/[^0-9.]/g, '');
      var parts = cleaned.split('.');
      if (parts.length > 2) cleaned = parts.shift() + '.' + parts.join('');
      var n = parseFloat(cleaned);
      if (!isFinite(n) || n < 0) return 0;
      return n;
    };

    var groups = function (n) {
      // 1234567 -> "1 234 567" (неразрывные пробелы)
      var neg = n < 0;
      var abs = Math.round(Math.abs(n));
      var s = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return (neg ? '−' : '') + s;
    };

    var money = function (n) { return groups(n) + ' ₽'; };

    var render = function () {
      var buy = parseNum(fields[0].value);
      var repair = parseNum(fields[1].value);
      var other = parseNum(fields[2].value);
      var sell = parseNum(fields[3].value);

      var profit = sell - buy - repair - other;

      outProfit.textContent = money(profit);

      totalBox.classList.toggle('is-negative', profit < 0);
      totalBox.classList.toggle('is-zero', profit === 0);

      if (profit > 0) {
        var half = profit / 2;
        outInvestor.textContent = money(half);
        outTeam.textContent = money(half);
        splitBox.classList.remove('is-muted');
        warning.hidden = true;
      } else {
        outInvestor.textContent = '—';
        outTeam.textContent = '—';
        splitBox.classList.add('is-muted');
        warning.hidden = false;
      }
    };

    // форматирование поля при потере фокуса — ввод не мешаем
    fields.forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', render);
      input.addEventListener('blur', function () {
        input.value = groups(parseNum(input.value));
        render();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        fields[0].value = groups(defaults.buy);
        fields[1].value = groups(defaults.repair);
        fields[2].value = groups(defaults.other);
        fields[3].value = groups(defaults.sell);
        render();
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); });

    render();
  }

})();
