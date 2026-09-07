/* =========================================================================
   公式LINEの導線（全ページ共通）

   ★★★ 直すのは、下の LINE_URL の1行だけです。★★★

   空（""）のあいだ  ：LINEのボタンは1つも出ません。いまの電話の導線のままです
   URLを入れた瞬間   ：全8ページのボタンが一斉にLINEへ切り替わります
                       （採用ページの主ボタン／各ページの締めのCTA／スマホ下部の固定バー）

   入れ方：LINE公式アカウントの管理画面 →「設定」→「アカウント設定」に出る
           https://lin.ee/xxxxxxx をそのまま貼る。前後の空白は自動で落とします。

   🚨 このファイルを読んでいないページにはLINEが出ません。
      新しいページを足したら </body> の直前に
      <script src="assets/line.js"></script> を入れてください。
   ========================================================================= */
(function () {
  'use strict';
  /* 二重読み込みガード（部分再描画や再実行で重複挿入しないため・2026-09-06 Codex指摘15） */
  if (window.__eightLineDone) return;
  window.__eightLineDone = true;

  var LINE_URL = "https://lin.ee/YRmILrV";

  /* ------------------------------------------------------------------ */

  var url = (LINE_URL || '').trim();
  if (!url) return;                       // 空なら何もしない＝いまの見た目のまま

  var LABEL = 'LINEで話を聞いてみる';
  var SHORT = 'LINEで相談';

  function make(cls, label) {
    var a = document.createElement('a');
    a.className = cls;
    a.href = url;
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('data-ga', 'line_click');
    return a;
  }

  /* 1) 採用ページ（案B・案C）の主ボタン
        電話を消さずに、LINEを主・電話を副にする。
        年齢層の高い応募者は電話が速いので、電話は残す。
        🚨 スマホ下部の固定バーだけは別扱い。ここでボタンを増やすと3本になって崩れる
           （.bbar は2列のグリッド。2026-09-06 実測で127pxまで潰れた） */
  document.querySelectorAll('a[data-cta]').forEach(function (a) {
    if (a.dataset.lineDone) return;
    a.dataset.lineDone = '1';

    /* 固定バーかどうかはDOMの位置で判定（GA属性に依存すると計測名の変更で崩れる・Codex指摘16） */
    if (a.closest('.bar,.bbar,.s2bar')) {
      /* 🚨 電話は消さない（2026-09-06 検品：採用2ページだけ固定バーから電話が消えていた）。
         文言を短くして残し、LINEの主ボタンを前に足す */
      a.textContent = '電話する';
      a.classList.add('is-subbar');
      var lb = make(a.className.replace('is-subbar','') + ' is-line', SHORT);
      lb.setAttribute('data-ga-place', 'fixed_bar');
      a.parentNode.insertBefore(lb, a);
      /* 🚨 2列グリッドに3ボタンだと2段に折れる（2026-09-06 Codex指摘3）。親に印を付けて3列へ */
      var bar = a.closest('.bar,.bbar,.s2bar'); if (bar) bar.classList.add('has-line');
      return;
    }

    /* 通常の主CTAは増やさず、1つのボタンをLINEへ差し替える。
       2つ並ぶと「どっちを押すのか」が分からなくなるため。電話は固定バーと電話番号欄に残す。 */
    a.href = url;
    a.textContent = LABEL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.classList.add('is-line');
    a.setAttribute('data-ga', 'line_click');
    var acts = a.closest('.bfv-acts'); if (acts) acts.classList.add('has-line');
  });

  /* 2) 電話番号を並べている箱（.ctel＝浦安本社と埼玉営業所の2枚組）の前に、LINEを1つ置く。
        🚨 箱の中の <a> を1つずつ狙うと、2拠点ぶんで2つ出る（2026-09-06 実測）。
           箱そのものを1単位として数える */
  /* 🚨 応募の節（.entry）だけに出す。CONTACT節（法人の配送依頼・見積り）にまで
     「LINEで応募」が出ていた（2026-09-06 検品・4ページ） */
  document.querySelectorAll('.entry .ctel').forEach(function (box) {
    if (box.dataset.lineDone) return;
    box.dataset.lineDone = '1';
    box.parentNode.insertBefore(make('btn is-line line-lead', LABEL), box);
  });

  /* 3) スマホ下部の固定バー
        「応募する」をLINEに差し替える。電話ボタンはそのまま残す */
  document.querySelectorAll('.bar, .bbar').forEach(function (bar) {
    /* 🚨 対象は「応募する」だけ。a.b2（＝3つ目の位置クラス）で選ぶと
       採用情報・お問い合わせまで差し替える（2026-09-06 検品・7ページで誤爆）。
       #youkou（募集要項）も対象にしない */
    var t = bar.querySelector('a[href="#entry"], a[href="#apply"]');
    if (!t || t.dataset.lineDone) return;
    t.dataset.lineDone = '1';
    t.href = url;
    t.textContent = SHORT;
    t.target = '_blank';
    t.rel = 'noopener';
    t.classList.add('is-line');
    t.setAttribute('data-ga', 'line_click');
    t.setAttribute('data-ga-place', 'fixed_bar');
  });

})();
