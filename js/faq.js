/* ==========================================================================
   よくあるご質問（FAQ）ページ – 描画・アコーディオン
   ・データは data/faq.json を fetch で取得（サーバー配信前提。file:// 直開きは不可）。
   ・通し番号（Q1, Q2…）はセクション横断で自動採番（並び順＝番号順）。
   ・共通処理（esc）は js/utils.js（window.JT）を使用。
   ・ヘッダー／フッターの挙動は js/main.js が担当。
   ========================================================================== */
(function () {
  'use strict';

  const root = document.getElementById('faqRoot');
  if (!root) return;

  const esc = window.JT.esc;

  // Q&A 1件（no = 通し番号）
  // 【HTML許容フィールド】it.a は装飾用HTML（<br> <a> <table> 等）を意図的にそのまま描画する。
  // 現状は静的JSONのため安全。将来 CMS / API 由来にする場合は必ずサニタイズを挟むこと。
  function itemHTML(no, it) {
    return '' +
      '<li class="faq-item">' +
        '<button type="button" class="faq-item__q" aria-expanded="false">' +
          '<span class="faq-item__no">Q<span class="faq-item__num">' + no + '</span>.</span>' +
          '<span class="faq-item__label">' + esc(it.q) + '</span>' +
          '<span class="faq-item__toggle" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="faq-item__a">' +
          '<div class="faq-item__a-inner">' +
            '<span class="faq-item__amark" aria-hidden="true">A</span>' +
            '<div class="faq-item__atext">' + (it.a || '') + '</div>' +   /* ← HTML許容（上記コメント参照） */
          '</div>' +
        '</div>' +
      '</li>';
  }

  // お問い合わせセクション
  function contactHTML(sec) {
    const mail = esc(sec.email || '');
    return '' +
      '<div class="faq-contact">' +
        (sec.lead ? '<p class="faq-contact__lead">' + esc(sec.lead) + '</p>' : '') +
        (sec.email ? '<p class="faq-contact__mail">お問い合わせメール<br>（ ' +
          '<a href="mailto:' + mail + '">' + mail + '</a> ）</p>' : '') +
        (sec.manualText ? '<p class="faq-contact__manual">' + esc(sec.manualText) +
          '<a href="' + esc(window.JT.safeUrl(sec.manualUrl)) + '" target="_blank" rel="noopener">' + esc(sec.manualLinkLabel || 'こちら') + '</a>' +
          esc(sec.manualTail || '') + '</p>' : '') +
      '</div>';
  }

  // セクション見出し／クイックナビのラベル
  function headingOf(sec) {
    return sec.type === 'contact' ? (sec.title || '') : 'FAQ（' + (sec.title || '') + '）';
  }
  function navLabelOf(sec) {
    return sec.type === 'contact' ? 'お問い合わせについて' : 'FAQ（' + (sec.title || '') + '）';
  }

  // FAQ_DATA を受け取って本体を描画
  function render(FAQ_DATA) {
    const sections = (FAQ_DATA && FAQ_DATA.sections) || [];
    let html = '';

    // --- 上部クイックナビ（各セクションへジャンプ） ---
    html += '<nav class="faq-quicknav" aria-label="FAQ内リンク"><ul>';
    sections.forEach(function (sec) {
      html += '<li><a href="#faq-' + esc(sec.id || '') + '">' + esc(navLabelOf(sec)) + '</a></li>';
    });
    html += '</ul></nav>';

    // --- 各セクション ---
    let no = 0;   // 通し番号カウンター（Q&Aセクション横断）
    sections.forEach(function (sec) {
      html += '<section class="faq-sec" id="faq-' + esc(sec.id || '') + '">';
      // タイトル：SP版のみ指定位置で改行（spBreakAfter の直後に <br class="faq-sp-br"> を挿入）
      let headText = esc(headingOf(sec));
      if (sec.spBreakAfter) {
        const idx = headText.indexOf(sec.spBreakAfter);
        if (idx >= 0) {
          const cut = idx + sec.spBreakAfter.length;
          headText = headText.slice(0, cut) + '<br class="faq-sp-br">' + headText.slice(cut);
        }
      }
      html += '<h2 class="faq-sec__title"><span class="faq-sec__title-text">' + headText + '</span><span class="faq-sec__line" aria-hidden="true"></span></h2>';

      if (sec.type === 'contact') {
        html += contactHTML(sec);
      } else {
        html += '<ul class="faq-list">';
        (sec.items || []).forEach(function (it) {
          no += 1;
          html += itemHTML(no, it);
        });
        html += '</ul>';
      }
      html += '</section>';
    });

    root.innerHTML = html;
  }

  // --- アコーディオン開閉（イベント委譲。描画前に1回だけ登録） ---
  root.addEventListener('click', function (e) {
    const btn = e.target.closest('.faq-item__q');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    const open = item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // --- データ取得 → 描画（取得失敗時はエラー表示） ---
  fetch('data/faq.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(render)
    .catch(function (e) {
      console.error('FAQデータの取得に失敗:', e);
      root.innerHTML = '<p class="faq-error">よくある質問を取得できませんでした。</p>';
    });

})();
