/* =========================================================================
   下の固定バーを、最初の画面では出さない（全ページで読み込む）
   ⚠️ line.js が作る .mbar より後に読み込むこと（line.js の直後に置いてある）
   ========================================================================= */
(function () {
  'use strict';
  if (window.__eightBarWait) return;
  window.__eightBarWait = true;
  /* 2026-10-05 おでん「a」＝下の固定バー（.mbar／募集要項の .cta）は、最初の画面では出さず、少し下ろしてから出す。
     Web検品（198画面）で、最初の画面のボタン・質問の行・地図のリンクにバーが重なっていた（最大73px）。
     ページの一番下はバーの高さぶん余白があるので、下ろしてから出せば何も隠れない。
     ⚠️ 下ろせる量が200pxより少ない短いページは「一番下まで下ろしたら出す」。下ろせないページは最初から出す。 */
  var bars = document.querySelectorAll('.mbar,.cta');
  if (bars.length) {
    var st = document.createElement('style');
    st.textContent = '.cta{transition:transform .25s ease}' +
      '.mbar.is-wait,.cta.is-wait{transform:translateY(110%)}' +
      '@media (prefers-reduced-motion:reduce){.cta{transition:none}}';
    document.head.appendChild(st);
    var wTick = false;
    var wait = function () {
      wTick = false;
      var room = document.documentElement.scrollHeight - window.innerHeight;
      var need = Math.min(200, Math.max(0, room - 2));
      var hide = (window.scrollY || window.pageYOffset) < need;
      [].forEach.call(bars, function (b) { b.classList.toggle('is-wait', hide); });
    };
    var wAsk = function () { if (!wTick) { wTick = true; requestAnimationFrame(wait); } };
    window.addEventListener('scroll', wAsk, { passive: true });
    window.addEventListener('resize', wAsk);
    window.addEventListener('load', wAsk);
    wait();
  }

})();
