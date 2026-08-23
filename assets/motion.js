/* =========================================================
   動き — ライブラリ無し。transform と opacity だけを動かす。
   1. スクロールで下から出す（一度だけ・一斉に）
   2. ヘッダーがヒーローに重なっている間だけ透ける
   3. スマホのメニュー開閉
   4. ページ先頭へ戻る
   prefers-reduced-motion:reduce のときは動きを止める。
   ========================================================= */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. スクロールで下から出す ---- */
  /* JSがここまで動いた時だけ隠す。動かなければ最初から見えている */
  var targets = document.querySelectorAll('[data-rise],[data-in]');
  if (targets.length) document.documentElement.classList.add('js-rise');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var d = parseInt(el.getAttribute('data-rise'), 10) || 0;
        el.style.transitionDelay = d + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
        // 終わったら will-change を外す
        el.addEventListener('transitionend', function () {
          el.style.willChange = 'auto';
        }, { once: true });
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---- 4. ヘッダー：ヒーローに重なっている間だけ透ける ---- */
  /* 最初から HTML に on-hero を付けておき、通り過ぎたら外す（読み込み直後のチラつきを作らない） */
  (function () {
    var head = document.querySelector('.head.on-hero');
    var heroes = [].slice.call(document.querySelectorAll('[data-hero]'));
    var hero = heroes.filter(function (h) { return h.offsetParent !== null || h.offsetHeight > 0; })[0] || heroes[0];
    if (!head || !hero) return;
    var t = false;
    var check = function () {
      // 2段ヘッダーの下端が、ヒーローの下端を越えたら地を戻す
      var limit = hero.getBoundingClientRect().bottom - head.offsetHeight;
      head.classList.toggle('on-hero', limit > 0);
      t = false;
    };
    var on = function () { if (t) return; t = true; requestAnimationFrame(check); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on, { passive: true });
    check();
  })();

  /* ---- 6. スマホのメニュー ---- */
  var mt = document.querySelector('.mtoggle');
  var r2 = document.querySelector('.head .r2');
  if (mt && r2) {
    var setOpen = function (open) {
      r2.classList.toggle('open', open);
      mt.setAttribute('aria-expanded', open ? 'true' : 'false');
      mt.textContent = open ? '閉じる' : 'メニュー';
    };
    mt.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!r2.classList.contains('open')); });
    document.addEventListener('click', function (e) {          // 外を触ったら閉じる
      if (r2.classList.contains('open') && !r2.contains(e.target) && e.target !== mt) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }
})();

/* ---- 7. 帰りの道：上へ戻るボタン（下まで行ったら出す） ---- */
(function () {
  var b = document.querySelector('.ptop');
  if (!b) return;
  var t = false;
  var check = function () {
    var hero = document.querySelector('.scrollhero');
    var past = hero ? window.pageYOffset > hero.offsetTop + hero.offsetHeight - window.innerHeight : window.pageYOffset > 600;
    b.classList.toggle('on', past && window.pageYOffset > 600);
    t = false;
  };
  window.addEventListener('scroll', function () {
    if (t) return; t = true; requestAnimationFrame(check);
  }, { passive: true });
  b.addEventListener('click', function (e) {
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  check();
})();

/* ---- 8. ページの切り替え ----
   出発：トラックの扉が、行き先ごとに決めた向きから走ってきて閉まる。
   到着：扉が反対側へ開くと、奥へ続く通路が一瞬見えて、そこから次の景色になる。
   🚨 何があっても遷移は止めない。アニメが失敗しても必ず飛ぶ。 */
(function () {
  var veil = document.querySelector('.veil');
  if (!veil) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var door = veil.querySelector('.door');
  var rush = veil.querySelector('.rush');
  var root = document.documentElement;

  var DIR = {
    'index.html': 'down', 'about.html': 'left', 'company.html': 'left',
    'office.html': 'up', 'service.html': 'right', 'business.html': 'right',
    'customers.html': 'right', 'recruit.html': 'up', 'contact.html': 'down',
    'news.html': 'down', 'privacy.html': 'down'
  };
  var OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
  /* 光の扉が、どちら側から迫ってくるか */
  var ORIGIN = { left: '32% 50%', right: '68% 50%', up: '50% 32%', down: '50% 68%' };
  /* 行き先＝行程の次の場面。幕の向こうにその絵が見えてから、そのページになる */
  var SCENE = {
    'index.html': 'img/L2_トラック列.webp',
    'about.html': 'img/L3_倉庫.webp',
    'service.html': 'img/V2_手元.webp',
    'business.html': 'img/L1_積込.webp',
    'recruit.html': 'img/V1_引き.webp',
    'contact.html': 'img/V4_積戻.webp',
    'privacy.html': 'assets/veil-rush.webp'
  };
  var EASE_IN = 'cubic-bezier(.32,.12,.2,1)';
  var EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

  /* ---- 到着：扉が開くと、奥の通路が見えてから景色になる ---- */
  var came = root.getAttribute('data-soar');
  if (came) {
    var here = location.pathname.split('/').pop() || 'index.html';
    if (SCENE[here]) rush.style.backgroundImage = 'url("../' + SCENE[here] + '")'.replace('../', '');
    root.removeAttribute('data-soar');
    veil.classList.add('on');
    door.style.transformOrigin = ORIGIN[came] || '50% 50%';
    door.style.opacity = '1';
    door.style.transform = 'scale(1.95)';
    rush.style.opacity = '.7';
    rush.style.transform = 'scale(1.5)';
    document.body.style.opacity = '0';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        door.style.transition = 'transform .62s ' + EASE_OUT + ', opacity .44s ease-out';
        door.style.opacity = '0';
        door.style.transform = 'scale(1)';
        rush.style.transition = 'opacity .42s ease-out .06s, transform .62s ' + EASE_OUT;
        rush.style.opacity = '0';
        rush.style.transform = 'scale(1)';
        document.body.style.transition = 'opacity .42s ease-out .1s';
        document.body.style.opacity = '1';
        setTimeout(function () {
          veil.classList.remove('on');
          door.style.transition = door.style.transform = '';
          rush.style.transition = rush.style.opacity = rush.style.transform = '';
          document.body.style.transition = document.body.style.opacity = '';
        }, 700);
      });
    });
  }

  if (reduce) return;

  /* ---- 出発：扉が走ってきて閉まる ---- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!/\.html($|[?#])/.test(href)) return;
    var file = href.split('#')[0].split('/').pop();
    if (a.pathname === location.pathname) return;

    var dir = DIR[file] || 'right';
    e.preventDefault();

    var gone = false;
    var go = function () {
      if (gone) return; gone = true;
      try { sessionStorage.setItem('soar', dir); } catch (err) {}
      location.href = a.href;
    };
    setTimeout(go, 400);

    try {
      if (SCENE[file]) rush.style.backgroundImage = 'url("' + SCENE[file] + '")';
      veil.classList.add('on');
      rush.style.opacity = '0';
      door.style.transition = 'none';
      door.style.transformOrigin = ORIGIN[dir] || '50% 50%';
      door.style.opacity = '0';
      door.style.transform = 'scale(1.0)';
      requestAnimationFrame(function () {
        door.style.transition = 'transform .38s ' + EASE_IN + ', opacity .26s ease-in';
        door.style.opacity = '1';
        door.style.transform = 'scale(1.95)';
        rush.style.transition = 'opacity .24s ease-in .08s, transform .38s ' + EASE_IN;
        rush.style.opacity = '.7';
        rush.style.transform = 'scale(1.5)';
      });
    } catch (err) { go(); }
  });
})();

/* ---- 9. ページ全体を一つの場所にする：環境の層・進み具合の線・ヘッダーの出入り ---- */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var env = document.querySelector('.env');
  var prog = document.querySelector('.prog');
  var head = document.querySelector('.head');
  if (!env && !prog && !head) return;

  /* セクションごとに地の色をわずかにずらす（同じ場所の、時間帯が動く感じ） */
  var TONES = ['#F7F4EF', '#F4F1EC', '#F6F2EA', '#F3F1EE', '#F7F3EC'];
  var secs = [].slice.call(document.querySelectorAll('section, .band, .gates, .pband'));
  if (env && secs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = secs.indexOf(e.target);
        env.style.backgroundColor = TONES[i % TONES.length];
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  var lastY = window.pageYOffset, t = false;
  function frame() {
    var y = window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0).toFixed(4) + ')';
    if (head) {
      if (y > 160) head.classList.toggle('tucked', y > lastY + 4);
      else head.classList.remove('tucked');
    }
    lastY = y; t = false;
  }
  window.addEventListener('scroll', function () { if (t) return; t = true; requestAnimationFrame(frame); }, { passive: true });
  frame();
  if (reduce && head) head.classList.remove('tucked');
})();

/* ---- 11. 一番上でさらに上へ引くと、トップの映像に戻る ----
   下層ページで「戻り方が分からない」を消す。引ききった時だけ動く。 */
(function () {
  var el = document.querySelector('.pullback');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return;   // スマホはOSの再読み込みと衝突する
  var bar = el.querySelector('.bar');
  var pull = 0, NEED = 420, going = false, t = null, steps = 0;

  function reset() { pull = 0; steps = 0; el.classList.remove('on'); bar.style.width = '0'; }
  function add(amount) {
    if (going) return;
    if (window.pageYOffset > 2) { reset(); return; }
    pull = Math.max(0, pull + Math.min(70, amount));
    steps++;
    el.classList.toggle('on', pull > 24);
    bar.style.width = Math.min(100, (pull / NEED) * 100).toFixed(1) + '%';
    clearTimeout(t); t = setTimeout(reset, 700);
    if (pull >= NEED && steps >= 5) {
      going = true;
      try { sessionStorage.setItem('soar', 'down'); } catch (e) {}
      location.href = 'index.html';
    }
  }
  window.addEventListener('wheel', function (e) { if (e.deltaY < 0) add(-e.deltaY); }, { passive: true });
})();
