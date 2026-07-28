/* ==========================================================================
   job tag – 共通ユーティリティ（B-2 共通化）
   ・esc()      … データ由来テキストのHTMLエスケープ
   ・safeUrl()  … href に入れる url のスキーム検証（相対 or https のみ許可）
   ・MOVE_LABEL / moveHTML() … 順位変動アイコン（TOP=rank-move / 一覧=rk-move で共用）
   main.js / ranking.js / faq.js より前に読み込むこと（window.JT に公開）。
   ========================================================================== */
(function (global) {
  'use strict';

  // & < > " をエスケープ（属性値・テキスト共通）
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // href 用 URL のスキーム検証：相対パス／フラグメント／https のみ許可。
  // javascript: や http: など想定外スキームは '#' に無害化（B-2 のスキーム検証）。
  function safeUrl(u) {
    const s = String(u == null ? '' : u).trim();
    if (s === '') return '#';
    if (s.charAt(0) === '#' || s.charAt(0) === '/') return s;   // フラグメント／ルート相対
    if (/^https:\/\//i.test(s)) return s;                       // https 絶対URL
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '#';             // その他スキームは不許可
    return s;                                                    // 相対パス
  }

  const MOVE_LABEL = { up: '順位上昇', down: '順位下降', stay: '変わらず' };

  // 順位変動アイコン。prefix でクラス名を切替（'rank-move'=TOP / 'rk-move'=一覧）。
  // 上昇/下降=二重矢印（色・向きはCSS）、変動なし=ダッシュ。
  function moveHTML(move, prefix) {
    const cls = prefix || 'rank-move';
    if (move === 'up' || move === 'down') {
      return '<span class="' + cls + ' -' + move + '" aria-label="' + MOVE_LABEL[move] + '">' +
             '<svg class="ico" aria-hidden="true"><use href="#i-arrow-move"/></svg></span>';
    }
    return '<span class="' + cls + ' -stay" aria-label="' + MOVE_LABEL.stay + '">–</span>';
  }

  global.JT = { esc: esc, safeUrl: safeUrl, MOVE_LABEL: MOVE_LABEL, moveHTML: moveHTML };

})(window);
