(function(){
  /* 2026-09-09 おでん指示「ヒーローから始まらないと。会社の顔だから」。
     ①履歴の復元を止める ②読み込み時に先頭へ ③アプリ内ブラウザの復帰（bfcache）でも先頭へ
     ④画像や動画で高さが変わった後にも1回だけ先頭へ。#付きで開いたときは触らない */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) return;
  var top = function(){ window.scrollTo(0,0); };
  top();
  document.addEventListener('DOMContentLoaded', top);
  window.addEventListener('load', function(){ top(); setTimeout(top, 60); setTimeout(top, 300); });
  window.addEventListener('pageshow', function(e){ if (e.persisted) top(); });
})();
/* =====================================================
   採用ページ 案2（saiyo2.html だけが読む）
   ===================================================== */
(function () {
  'use strict';


  /* LINEの導線は assets/line.js に一本化した（URLを入れる場所は1か所だけ） */


  var show = function (el) {
    if (el.classList.contains('is-in')) return;
    var d = parseInt(el.getAttribute('data-rise'), 10) || 0;
    el.style.transitionDelay = d + 'ms';
    el.classList.add('is-in');
    el.addEventListener('transitionend', function () { el.style.willChange = 'auto'; }, { once: true });
  };

  /* -----------------------------------------------------
     2) 🚨 背の高い要素が永久に隠れたままになるのを塞ぐ

     共通の motion.js は { rootMargin:'0px 0px -12% 0px', threshold:0.12 } で見ている。
     募集要項の表 `.tbl` は 1440幅で高さ879px・390x568で1730px あり、
     アンカーで着地した位置では画面に入る量が 79px＝9.0% しかなく 0.12 に届かない。
     rootMargin の -12% が画面下端をさらに削るので、着地直後の交差率は 0 になる。
     ＝「募集要項を見る」を押すと表が真っ白のまま出てこない（3回中3回・実測）。

     motion.js は全ページ共通なので触らず、このページだけ
     threshold:0（1pxでも触れたら出す）の観測を重ねて塞ぐ。
     class は付け直しても害が無いので、二重に動いて構わない。
     ----------------------------------------------------- */
  var targets = [].slice.call(document.querySelectorAll('[data-rise],[data-in]'));

  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target);
        io2.unobserve(e.target);
      });
    }, { root: null, rootMargin: '0px 0px 0px 0px', threshold: 0 });
    targets.forEach(function (el) { io2.observe(el); });
  } else {
    targets.forEach(show);
  }

  /* -----------------------------------------------------
     2.5) ヒーローの動画
     🚨 動きを減らす設定の人には止める（WCAG 2.2.2／Guidelines「5秒を超える自動再生
        には停止操作を置く」「装飾のループは reduced-motion で止める」）。
        止めると poster（mp4の1コマ目）が残るので、絵は消えない。
     🚨 5秒を超えるループなので、止める操作も1つ置く。
     ----------------------------------------------------- */
  var hero = document.querySelector('.s2frame video');
  if (hero) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var stop = function () { hero.removeAttribute('autoplay'); hero.pause(); };
    if (reduce.matches) stop();
    if (reduce.addEventListener) reduce.addEventListener('change', function (e) { if (e.matches) stop(); });

    /* 2026-09-09 おでん指示で一時停止ボタンを廃止。ただし自動再生の映像には止める手段が要る
       （アクセシビリティの必須項目）ので、映像そのものを押すと止まる形にした */
    var label = function () {
      hero.setAttribute('aria-label', hero.paused
        ? '2tトラックの運転席と助手席に座る2人の社員。映像は停止中。押すと再生します'
        : '2tトラックの運転席と助手席に座る2人の社員。押すと一時停止します');
    };
    hero.style.cursor = 'pointer';
    hero.setAttribute('role', 'button');
    hero.setAttribute('tabindex', '0');
    hero.addEventListener('click', function () { if (hero.paused) { hero.play(); } else { hero.pause(); } });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (hero.paused) { hero.play(); } else { hero.pause(); } }
    });
    hero.addEventListener('play', label);
    hero.addEventListener('pause', label);
    label();
  }

  /* -----------------------------------------------------
     3) アンカーで飛んだ先を必ず出す
        （#youkou のように、着地点が画面より背の高い塊のときの保険）
     ----------------------------------------------------- */
  var revealAt = function (hash) {
    if (!hash || hash === '#') return;
    var t;
    try { t = document.querySelector(hash); } catch (err) { return; }
    if (!t) return;
    show(t);
    t.querySelectorAll('[data-rise],[data-in]').forEach(show);
    var p = t.parentElement;
    while (p && p !== document.body) {
      if (p.hasAttribute && p.hasAttribute('data-rise')) show(p);
      p = p.parentElement;
    }
  };
  window.addEventListener('hashchange', function () { revealAt(location.hash); });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (a) setTimeout(function () { revealAt(a.getAttribute('href')); }, 0);
  });
  if (location.hash) revealAt(location.hash);

  /* -----------------------------------------------------
     4) 1.2秒の保険：最初の画面に入っている data-rise が
        何かの理由で隠れたままでも、1.2秒で必ず見える状態にする。
        ヒーロー自体はJSに頼らない（CSSアニメのみ）。
     ----------------------------------------------------- */
  var showInView = function () {
    var vh = window.innerHeight || 800;
    document.querySelectorAll('[data-rise]:not(.is-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) show(el);
    });
  };
  setTimeout(function () { showInView(); revealAt(location.hash); }, 1200);

  /* -----------------------------------------------------
     5) 一気に飛んだときの保険
        End キー・スクロール位置の復元・速い送りで飛び越えると、
        IntersectionObserver は「通り過ぎた要素」を見ないので隠れたまま残る。
        止まったところで一度だけ見回す。
     ----------------------------------------------------- */
  var t = null;
  window.addEventListener('scroll', function () {
    if (t) return;
    t = setTimeout(function () { t = null; showInView(); }, 120);
  }, { passive: true });
})();

/* -----------------------------------------------------
   6) 章送りタブの現在地（2026-09-09）
      このページはスマホで31画面ぶんある。帯のタブ7つが全部同じ見た目だと、
      いまどの章を読んでいるのかを確かめる手がかりが1つも無い。
      隠れ線（帯の下端）を越えた最後の節を「いま」とみなして印を付ける。
      🚨 印は見た目だけでなく aria-current で持たせる（読み上げにも同じことが伝わる）。
   ----------------------------------------------------- */
(function () {
  var nav = document.querySelector('.s2jump');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if (links.length < 2) return;
  var targets = links.map(function (a) {
    try { return document.querySelector(a.getAttribute('href')); } catch (e) { return null; }
  });
  var now = -2;

  var mark = function (i) {
    if (i === now) return;
    now = i;
    links.forEach(function (a, n) {
      if (n === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    /* 横スクロールの帯では、印を付けた札が画面の外にいることがある。その時だけ寄せる。
       🚨 キーボードで帯の中を移動している間は寄せない。
          「フォーカスした札へ寄せる」と「現在地の札へ寄せる」が引っ張り合って、
          Tabで選んだ札が帯の外に押し戻される */
    if (i >= 0 && !kbd) into(links[i]);
  };

  /* 札を帯の中に入れる。🚨 動きを減らす設定の人には滑らせない
     （縦に送っている間、帯が勝手に横へ動くのは「減らす」に反する） */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var into = function (a) {
    if (!a || nav.scrollWidth <= nav.clientWidth) return;
    var l = a.offsetLeft, r = l + a.offsetWidth;
    if (l < nav.scrollLeft) nav.scrollTo({ left: Math.max(0, l - 12), behavior: reduce ? 'auto' : 'smooth' });
    else if (r > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: r - nav.clientWidth + 12, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  /* 🚨 キーボードで帯を送ると、フォーカスした札が容器の外に残っていた
     （scroll-snap が入っているので既定の scroll-into-view が効かない） */
  var kbd = false;
  nav.addEventListener('focusin', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    kbd = true;
    into(a);
  });
  nav.addEventListener('focusout', function () { kbd = false; });

  var pick = function () {
    /* 🚨 判定線を「帯の下端」に置くと、着地位置（scroll-padding-top + scroll-margin-top）より
       20px 上になり、押した札の**1つ前**が光る（35通り中30通りでずれていた）。
       着地線と同じ高さで判定する。 */
    var sp = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    var cur = -1;
    for (var n = 0; n < targets.length; n++) {
      var el = targets[n];
      if (!el) continue;
      var land = sp + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + 4;
      var line = Math.max(nav.getBoundingClientRect().bottom + 8, land);
      if (el.getBoundingClientRect().top <= line) cur = n;
    }
    mark(cur);
  };

  var q = false;
  window.addEventListener('scroll', function () {
    if (q) return;
    q = true;
    requestAnimationFrame(function () { q = false; pick(); });
  }, { passive: true });
  window.addEventListener('resize', pick, { passive: true });
  pick();
})();

/* -----------------------------------------------------
   7) ヘッダーが引っ込んだことを <html> にも写す（2026-09-09）
      章送りの帯は、ヘッダーが画面外へ逃げた間だけ上端に貼り付ける必要がある。
      CSSでは `body:has(.head.tucked)` で書いてあるが、:has が無い環境
      （Safari 15.3以前・Firefox 119以前・Chrome 104以前）では丸ごと効かず、
      ヘッダーが消えた64px（PC76px）の穴から本文が覗く。
      クラスを1つ写しておけば、:has の無い環境でも同じCSSが当たる。
   ----------------------------------------------------- */
(function () {
  var head = document.querySelector('.head');
  if (!head || !window.MutationObserver) return;
  var sync = function () {
    document.documentElement.classList.toggle('head-tucked', head.classList.contains('tucked'));
  };
  new MutationObserver(sync).observe(head, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
