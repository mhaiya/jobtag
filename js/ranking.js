/* ==========================================================================
   job tag 職業アクセスランキング ページ – インタラクション
   ・タブ切替（週間 / 月間 / 年間）
   ・ページネーション（1ページ 12件・上位100件）
   ・カード描画（順位 / トロフィー・チェック / 変動矢印 / 写真 / 職業名）
   ・共通処理（esc / safeUrl / MOVE_LABEL / moveHTML）は js/utils.js（window.JT）を使用。
   実データ接続時は data/ranking-full.json を差し替えるか、RANKING_API.url を同形式JSONを
   返すAPIエンドポイントに変更（本番は Razor の @foreach 等でサーバー生成データを流し込む位置）。
   ========================================================================== */
(function () {
  'use strict';

  const esc = window.JT.esc;
  const safeUrl = window.JT.safeUrl;

  // データソース（本番はここをAPIエンドポイントに変更するだけで接続先が変わる）
  const RANKING_API = { url: 'data/ranking-full.json' };

  // null 許容の image に対するフォールバック画像（データ取得失敗時のダミーデータではない）
  const IMG_FALLBACK = 'img/ranking/placeholder_photo.svg';

  /* ------------------------------------------------------------------------
     状態
     ------------------------------------------------------------------------ */
  const state = {
    data: null,        // periods 全体
    perPage: 12,
    period: 'weekly',  // weekly / monthly / yearly
    page: 1
  };

  const listEl  = document.getElementById('rkList');
  const pagerEl = document.getElementById('rkPager');
  const tabEls  = document.querySelectorAll('.rk-tabs__btn');

  /* ------------------------------------------------------------------------
     ユーティリティ
     ------------------------------------------------------------------------ */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // 1〜3位はトロフィー（金・銀・銅）、4位以降はチェック丸
  function iconHTML(rank) {
    if (rank <= 3) {
      return '<span class="rk-card__icon rk-c--' + rank + '">' +
             '<svg class="ico" aria-hidden="true"><use href="#i-trophy"/></svg></span>';
    }
    return '<span class="rk-card__icon rk-c--check">' +
           '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg></span>';
  }

  // 順位カラークラス（1〜3位＝金銀銅 / 4位以降＝青）
  function colorClass(rank) { return rank <= 3 ? 'rk-c--' + rank : 'rk-c--check'; }

  function cardHTML(item) {
    return '<li class="rk-card">' +
      '<a class="rk-card__link" href="' + esc(safeUrl(item.url)) + '">' +
        '<span class="rk-card__photo"><img src="' + esc(item.image || IMG_FALLBACK) +
          '" alt="' + esc(item.title) + '" loading="lazy"></span>' +
        '<span class="rk-card__meta">' +
          iconHTML(item.rank) +
          '<span class="rk-card__rank ' + colorClass(item.rank) + '">' + pad2(item.rank) + '</span>' +
          window.JT.moveHTML(item.move, 'rk-move') +
          '<span class="rk-card__title">' + esc(item.title) + '</span>' +
        '</span>' +
      '</a>' +
    '</li>';
  }

  /* ------------------------------------------------------------------------
     描画
     ------------------------------------------------------------------------ */
  function currentItems() {
    const p = state.data && state.data.periods && state.data.periods[state.period];
    return (p && p.items) ? p.items : [];
  }
  function totalPages() {
    return Math.max(1, Math.ceil(currentItems().length / state.perPage));
  }

  function renderList() {
    if (!listEl) return;
    const items = currentItems();
    const start = (state.page - 1) * state.perPage;
    const slice = items.slice(start, start + state.perPage);
    listEl.innerHTML = slice.map(cardHTML).join('');
  }

  // ページ番号の窓（先頭・末尾・現在周辺 + 省略）
  function pageWindow(cur, total) {
    const out = [];
    const add = function (v) { out.push(v); };
    if (total <= 7) {
      for (let i = 1; i <= total; i++) add(i);
      return out;
    }
    add(1);
    if (cur > 3) add('…');
    const s = Math.max(2, cur - 1), e = Math.min(total - 1, cur + 1);
    for (let j = s; j <= e; j++) add(j);
    if (cur < total - 2) add('…');
    add(total);
    return out;
  }

  function renderPager() {
    if (!pagerEl) return;
    const total = totalPages();
    const cur = state.page;
    let html = '';
    // 前へ
    if (cur > 1) {
      html += '<button type="button" class="rk-pager__nav" data-page="' + (cur - 1) +
        '" aria-label="前のページ"><svg class="ico" aria-hidden="true"><use href="#i-chev-left"/></svg></button>';
    }
    // 番号
    pageWindow(cur, total).forEach(function (v) {
      if (v === '…') { html += '<span class="rk-pager__ellipsis" aria-hidden="true">…</span>'; return; }
      html += '<button type="button" class="rk-pager__num' + (v === cur ? ' is-active' : '') +
        '" data-page="' + v + '"' + (v === cur ? ' aria-current="page"' : '') + '>' + v + '</button>';
    });
    // 次へ
    if (cur < total) {
      html += '<button type="button" class="rk-pager__nav" data-page="' + (cur + 1) +
        '" aria-label="次のページ"><svg class="ico" aria-hidden="true"><use href="#i-chev-right"/></svg></button>';
    }
    pagerEl.innerHTML = html;
  }

  function render() {
    renderList();
    renderPager();
  }

  function goToPage(p, scroll) {
    const total = totalPages();
    state.page = Math.min(Math.max(1, p), total);
    render();
    if (scroll) {
      const top = document.querySelector('.rk-section');
      if (top) window.scrollTo({ top: top.offsetTop - 80, behavior: 'smooth' });
    }
  }

  function setPeriod(period) {
    state.period = period;
    state.page = 1;
    render();
  }

  /* ------------------------------------------------------------------------
     イベント
     ------------------------------------------------------------------------ */
  tabEls.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabEls.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      setPeriod(tab.getAttribute('data-tab'));
    });
  });

  if (pagerEl) {
    pagerEl.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-page]');
      if (!btn) return;
      goToPage(parseInt(btn.getAttribute('data-page'), 10), true);
    });
  }

  /* ------------------------------------------------------------------------
     データ取得 → 初期描画
     ------------------------------------------------------------------------ */
  // 各期間の items を rank 昇順に正規化（TOPと表示順を統一。API側で昇順保証されていれば無害）
  function normalize(data) {
    if (data && data.perPage) state.perPage = data.perPage;
    const periods = (data && data.periods) || {};
    Object.keys(periods).forEach(function (k) {
      const p = periods[k];
      if (p && Array.isArray(p.items)) {
        p.items = p.items.slice().sort(function (a, b) { return a.rank - b.rank; });
      }
    });
    return data;
  }

  function init(data) {
    state.data = normalize(data);
    // アクティブタブに合わせる
    const active = document.querySelector('.rk-tabs__btn.is-active');
    if (active) state.period = active.getAttribute('data-tab') || 'weekly';
    render();
  }

  // data/ranking-full.json を fetch で取得（サーバー配信前提。file:// 直開きは不可）。
  function loadData() {
    return fetch(RANKING_API.url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // 取得失敗時はダミーデータで代替せず、明示的にエラー表示（A-3）。
  if (listEl) {
    loadData()
      .then(init)
      .catch(function (e) {
        console.error('ランキングデータの取得に失敗:', e);
        listEl.innerHTML = '<li class="rk-error">ランキングを取得できませんでした。</li>';
        if (pagerEl) pagerEl.innerHTML = '';
      });
  }

  /* ヘッダー操作（文字サイズ / 検索 / メニュー / PAGE TOP / プレースホルダー）は
     トップページと共通の js/main.js が担当します（このページでも読み込み済み）。 */

})();
