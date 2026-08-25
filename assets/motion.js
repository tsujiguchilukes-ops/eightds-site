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
   濃紺の幕が「下から上へ」通り抜けるカーテンワイプ。
   ヒーローの見出しのロールと同じ文法（向き＝上へ抜ける／イージング＝expo-out系）。
   出発：残照の板が先に走り、半歩遅れて濃紺の主幕が重なって画面を覆う。
   到着：主幕が先に上へ抜けて残照が一拍見え、続けて残照も抜けて次のページになる。
   expo-out は出だしが一番速いので、押した瞬間に幕が動き出す（反応の空白を作らない）。
   🚨 何があっても遷移は止めない。アニメが失敗しても必ず飛ぶ。 */
(function () {
  var veil = document.querySelector('.veil');
  if (!veil) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var door = veil.querySelector('.door');
  var rush = veil.querySelector('.rush');
  var root = document.documentElement;
  var navigating = false;   /* 遷移中かどうか。押した先の行き違いと bfcache の戻りで使う */
  var EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

  /* ---- 到着：幕が上へ抜けて、次のページが現れる ---- */
  var came = root.getAttribute('data-soar');
  if (came) {
    veil.classList.add('on');
    door.style.transform = 'none';
    rush.style.transform = 'none';
    document.body.style.opacity = '0';
    /* 🚨 data-soar を外すと html の暗い地も消え、body の白がキャンバスに伝わる。
       幕が抜けてから body が濃くなるまでの間が「白い瞬断」になっていた（実測228ms）。
       地の暗さだけは別の印で、body が出そろうまで残す */
    root.classList.add('soar-in');
    root.removeAttribute('data-soar');
    var lifted = false;
    var lift = function () {
      if (lifted) return; lifted = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          /* 🚨 到着は expo-out にしない。出だしが速すぎて、幕が覆った状態が
             1コマも見えないまま抜けてしまう（実測：130msで8割抜けた）。
             「一拍おいて、ゆっくり動き出して、すっと抜ける」曲線にする */
          var LIFT = 'cubic-bezier(.6,.05,.15,1)';
          door.style.transition = 'transform .6s ' + LIFT + ' .1s';
          door.style.transform = 'translateY(-103%)';
          rush.style.transition = 'transform .6s ' + LIFT + ' .19s';
          rush.style.transform = 'translateY(-103%)';
          /* 遅らせない。幕が抜けるのと同時に body を濃くしないと、その間が白くなる */
          document.body.style.transition = 'opacity .3s ease-out';
          document.body.style.opacity = '1';
          setTimeout(function () {
            veil.classList.remove('on');
            root.classList.remove('soar-in');
            door.style.transition = door.style.transform = '';
            rush.style.transition = rush.style.transform = '';
            document.body.style.transition = document.body.style.opacity = '';
          }, 900);
        });
      });
    };
    /* 🚨 @view-transition は使わない（style.css の注記を見よ。描画が止まった）。
       そのまま開ける。覆った状態は transition の delay（.1s）が一拍見せる */
    lift();
  }

  /* 🚨 戻るボタンで詰むのを塞ぐ。ブラウザは離脱時のDOMをそのまま凍らせて復元する（bfcache）ので、
     幕を出したまま離れると、戻った時に幕が張られたまま固まる。スクロールしても直らない。
     motion.js も head のインライン script も再実行されないので、ここで戻す。
     （2026-08-25 検品で発見。PC・スマホ・両方向の4通りで再現していた） */
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    navigating = false;
    veil.classList.remove('on');
    root.classList.remove('soar-in');
    root.removeAttribute('data-soar');
    door.style.transition = door.style.transform = '';
    rush.style.transition = rush.style.transform = '';
    document.body.style.transition = document.body.style.opacity = '';
  });

  if (reduce) return;

  /* ---- 出発：幕が下から駆け上がって画面を覆う ---- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!/\.html($|[?#])/.test(href)) return;
    if (a.pathname === location.pathname) return;

    /* 🚨 押した先の行き違いを塞ぐ。押すたびに作り直す目印だと、幕が出ている間に
       別のリンクを押された時、最初に押した先へ飛んでしまう（実測：120ms後に押すと3回とも）。
       目印は遷移そのものに1つだけ持たせる */
    if (navigating) { e.preventDefault(); return; }

    e.preventDefault();
    navigating = true;

    var gone = false;
    var go = function () {
      if (gone) return; gone = true;
      try { sessionStorage.setItem('soar', 'up'); } catch (err) {}
      location.href = a.href;
    };
    setTimeout(go, 430);

    try {
      veil.classList.add('on');
      door.style.transition = 'none';
      rush.style.transition = 'none';
      door.style.transform = 'translateY(103%)';
      rush.style.transform = 'translateY(103%)';
      requestAnimationFrame(function () {
        rush.style.transition = 'transform .42s ' + EASE_OUT;
        rush.style.transform = 'translateY(0)';
        door.style.transition = 'transform .42s ' + EASE_OUT + ' .07s';
        door.style.transform = 'translateY(0)';
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
