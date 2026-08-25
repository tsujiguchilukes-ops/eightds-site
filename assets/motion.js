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
  /* JSがここまで動いた時だけ、スマホのナビを畳む。動かなければ最初から開いたまま見える */
  if (mt) document.documentElement.classList.add('js-menu');
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
   ドット・ディザのコマワイプ。12pxの粒が市松の4分の1ずつ、4コマで画面を埋めて抜ける。
   1案目で実際に踏んだ罠を全部避ける：
   - 押した瞬間に反応（同期でclassを付ける。1コマ目の遅延0）
   - 遷移はsetTimeoutで必ず起こす（アニメが失敗しても飛ぶ）
   - 到着側の幕はJSが動いた時だけ張る（JSが落ちても固まらない）
   - 戻る（bfcache復元）は pageshow persisted で幕を外す
   - 短時間に別のリンクを押されたら、最新の行き先が勝つ
   - prefers-reduced-motion は動きなしで普通に遷移
   - @view-transition は使わない（実測で到着ページの描画が4秒止まった） */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ov = document.createElement('div');
  ov.className = 'pxwipe';
  ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<i class="q1"></i><i class="q2"></i><i class="q3"></i><i class="q4"></i><span class="dots"><b></b><b></b><b></b></span>';
  document.body.appendChild(ov);

  /* 到着側：直前にワイプで出発していた時だけ、入りの幕を張って抜く */
  var wiped = false;
  try { wiped = sessionStorage.getItem('pxwipe') === '1'; sessionStorage.removeItem('pxwipe'); } catch (e) {}
  if (!reduce && wiped) {
    ov.classList.add('enter');
    setTimeout(function () { ov.classList.remove('enter'); }, 600);
  }
  addEventListener('pageshow', function (e) {
    if (e.persisted) { ov.classList.remove('leave'); ov.classList.remove('enter'); }
  });

  var timer = null;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!/\.html($|[?#])/.test(href)) return;
    if (a.pathname === location.pathname) return;
    e.preventDefault();
    if (reduce) { location.href = a.href; return; }
    try {
      sessionStorage.setItem('pxwipe', '1');
      ov.classList.remove('enter');
      ov.classList.add('leave');           /* 同期＝押した瞬間に1コマ目 */
      if (timer) clearTimeout(timer);      /* 後から押したリンクが勝つ */
      var to = a.href;
      timer = setTimeout(function () { location.href = to; }, 400);
    } catch (err) {
      location.href = a.href;              /* 何が起きても遷移だけは起こす */
    }
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
  var TONES = ['#FAF5E7', '#F5EEDC', '#F8F1E1', '#F3EBDB', '#FAF4E3'];
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
      try { sessionStorage.setItem('pxwipe', '1'); } catch (e) {}
      location.href = 'index.html';
    }
  }
  window.addEventListener('wheel', function (e) { if (e.deltaY < 0) add(-e.deltaY); }, { passive: true });
})();
