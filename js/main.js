/* ==========================================================================
   job tag TOP リニューアル – インタラクション
   ※ デザイン再現に必要なUI挙動のみ実装（機能追加はしない）
   ※ 共通処理（esc / safeUrl / MOVE_LABEL / moveHTML）は js/utils.js（window.JT）を使用。
   構成:
     A. メニュートグル（開閉の見た目）／ヘッダー検索の開閉・クリア
     B. 文字サイズ切替
     C. ランキング（data/ranking-full.json の上位5件を fetch 取得して描画）
     D. LINKS カルーセル（data/links.json・ドット送り）
     E. PAGE TOP（スクロールで表示 + 先頭へ戻る）
     F. 検索窓プレースホルダー（SPのみ「（例：〜）」を省く）
     G. SPメニューのアコーディオン
   ========================================================================== */
(function () {
  'use strict';

  const esc = window.JT.esc;
  const safeUrl = window.JT.safeUrl;

  /* ------------------------------------------------------------------------
     A. メニュートグル
     aria-expanded を切り替えるだけ（矢印の向きはCSSで制御）
     ------------------------------------------------------------------------ */
  const menuToggle = document.getElementById('menuToggle');
  const siteHeader = document.querySelector('.site-header');
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      // モバイル：グローバルナビ（メニュー）の開閉
      if (siteHeader) siteHeader.classList.toggle('is-menu-open', !expanded);
      // 背後ページのスクロールをロック（慣性スクロールでの背景透け・隙間を防止）
      document.body.classList.toggle('is-menu-locked', !expanded);
    });
  }

  // メニュー以外（ヘッダー外）をタップ／クリックしたらメニューを閉じる
  if (siteHeader) {
    document.addEventListener('click', function (e) {
      if (!siteHeader.classList.contains('is-menu-open')) return;
      if (e.target.closest('.site-header')) return;   // ヘッダー内（メニュー・トグル等）は閉じない
      siteHeader.classList.remove('is-menu-open');
      document.body.classList.remove('is-menu-locked');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    });
    // Escキーでも閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && siteHeader.classList.contains('is-menu-open')) {
        siteHeader.classList.remove('is-menu-open');
        document.body.classList.remove('is-menu-locked');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // モバイル：検索アイコンで検索窓を開閉（.header に is-search-open を付与）
  const searchToggle = document.getElementById('searchToggle');
  const headerEl = document.querySelector('.header');
  if (searchToggle && headerEl) {
    searchToggle.addEventListener('click', function () {
      const open = headerEl.classList.toggle('is-search-open');
      this.setAttribute('aria-expanded', String(open));
      if (open) {
        const input = headerEl.querySelector('.searchbox input');
        if (input) input.focus();
      }
    });

    // ❌：入力を一括削除（フォーカスは維持）
    const searchClear = headerEl.querySelector('.searchbox__clear');
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        const input = headerEl.querySelector('.searchbox input');
        if (input) { input.value = ''; input.focus(); }
      });
    }

    // ∧：検索を閉じる
    const searchClose = headerEl.querySelector('.header__search-close');
    if (searchClose) {
      searchClose.addEventListener('click', function () {
        headerEl.classList.remove('is-search-open');
        searchToggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  /* ------------------------------------------------------------------------
     B. 文字サイズ切替（標準 / 大 / 特大）
     見た目のアクティブ状態のみ切替
     ------------------------------------------------------------------------ */
  const fontBtns = document.querySelectorAll('.fontsize button');
  fontBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      fontBtns.forEach(function (b) { b.classList.remove('is-active'); });
      this.classList.add('is-active');
    });
  });

  /* ------------------------------------------------------------------------
     C. ランキング（TOPは上位5件を表示）
     ------------------------------------------------------------------------
     データは data/ranking-full.json を単一ソースとして fetch 取得。
       ・TOP            … 上位5件（1位=ヒーロー ＋ 2〜5位カード）
       ・ランキングページ … 全100件（js/ranking.js）
     本家接続時は data/ranking-full.json を差し替えるか、同形式JSONを返すAPIに向ける
     （＝本番は Razor の @foreach 等でサーバー生成データを流し込む位置）。
     ------------------------------------------------------------------------ */
  const RANKING_API = { url: 'data/ranking-full.json' };   // 本番はここをAPIエンドポイントに変更
  const TOP_RANK_COUNT = 5;   // TOPで見せる件数（上位N件）

  const rankTabs = document.querySelectorAll('.rank-tabs__btn');
  const rankPanel = document.getElementById('rankPanel');
  let rankingData = null;

  // トロフィー（1〜3位）
  function trophyHTML() {
    return '<span class="trophy" aria-hidden="true"><svg class="ico"><use href="#i-trophy"/></svg></span>';
  }

  // 1位（大きく表示。順位・トロフィーは金色 rank-c--1）
  function heroHTML(item) {
    const url = safeUrl(item.url);
    return (
      '<div class="rank-hero">' +
        '<a class="rank-hero__thumb" href="' + esc(url) + '" aria-label="' + esc(item.title) + '">' +
          '<img src="' + esc(item.image) + '" alt="">' +
        '</a>' +
        '<div class="rank-hero__meta">' +
          '<div class="rank-rank rank-c--1">' + trophyHTML() +
            '<span class="num">01</span>' +
            window.JT.moveHTML(item.move, 'rank-move') +
          '</div>' +
          '<h3 class="rank-hero__title"><a href="' + esc(url) + '">' + esc(item.title) + '</a></h3>' +
        '</div>' +
      '</div>'
    );
  }

  // 2位以降（カード）。1〜3位は順位・トロフィーを rank-c--N で金/銀/銅に
  function itemHTML(item) {
    const url = safeUrl(item.url);
    const num = ('0' + item.rank).slice(-2);
    const top3 = item.rank <= 3;
    const metaCls = 'rank-item__meta' + (top3 ? ' rank-c--' + item.rank : '');
    return (
      '<article class="rank-item">' +
        '<a class="rank-item__thumb" href="' + esc(url) + '" aria-label="' + esc(item.title) + '"><img src="' + esc(item.image) + '" alt=""></a>' +
        '<div class="' + metaCls + '">' +
          (top3 ? trophyHTML() : '') +
          '<span class="num">' + num + '</span>' +
          window.JT.moveHTML(item.move, 'rank-move') +
        '</div>' +
        '<p class="rank-item__title"><a href="' + esc(url) + '">' + esc(item.title) + '</a></p>' +
      '</article>'
    );
  }

  // 1期間分のブロックHTML（[data-period]で識別）。TOPは上位 TOP_RANK_COUNT 件のみ（rank昇順）。
  function periodBlockHTML(period, data) {
    const items = data.items.slice().sort(function (a, b) { return a.rank - b.rank; }).slice(0, TOP_RANK_COUNT);
    return (
      '<div class="rank-period" data-period="' + esc(period) + '">' +
        heroHTML(items[0]) +
        '<div class="rank-grid">' + items.slice(1).map(itemHTML).join('') + '</div>' +
      '</div>'
    );
  }

  // 全期間（週間/月間/年間）を一度に描画。表示切替は showPeriod で行う。
  function renderAllRankings() {
    if (!rankingData || !rankPanel) return;
    const periods = rankingData.periods || {};
    const keys = Object.keys(periods).filter(function (k) {
      return periods[k] && periods[k].items && periods[k].items.length;
    });
    if (!keys.length) {
      rankPanel.innerHTML = '<p class="rank-error">ランキングを取得できませんでした。</p>';
      return;
    }
    rankPanel.innerHTML = keys.map(function (k) { return periodBlockHTML(k, periods[k]); }).join('');
    showPeriod(activePeriod());
  }

  // 選択中の期間のみ表示、他は非表示（再描画なし・再取得なし）
  function showPeriod(period) {
    if (!rankPanel) return;
    rankPanel.querySelectorAll('.rank-period').forEach(function (block) {
      block.hidden = (block.dataset.period !== period);
    });
  }

  function activePeriod() {
    const active = document.querySelector('.rank-tabs__btn.is-active');
    return (active && active.dataset.tab) || 'weekly';
  }

  // タブ切替：描画済みブロックの表示を切り替えるだけ（再取得・再描画しない）
  rankTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      rankTabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      this.classList.add('is-active');
      this.setAttribute('aria-selected', 'true');
      showPeriod(this.dataset.tab);
    });
  });

  // 初期化：data/ranking-full.json（単一ソース）を fetch → 上位5件を描画。
  // ※サーバー配信前提（file:// 直開きは fetch が CORS で不可）。取得失敗時はエラー表示（A-3）。
  if (rankPanel) {
    fetch(RANKING_API.url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { rankingData = data; renderAllRankings(); })
      .catch(function (e) {
        console.error('ランキングデータの取得に失敗:', e);
        rankPanel.innerHTML = '<p class="rank-error">ランキングを取得できませんでした。</p>';
      });
  }

  /* ------------------------------------------------------------------------
     D. LINKS（関連サイト）カルーセル
     ------------------------------------------------------------------------
     バナーは data/links.json を単一ソースに fetch 取得して描画。
     追加/削除・並べ替えは data/links.json の items を編集するだけ。
     カード幅は固定300px。1ページの表示枚数はビューポート幅から自動計算。
     ------------------------------------------------------------------------ */
  const LINK_CARD_W = 300, LINK_GAP = 16;   // CSSの .link-card 幅・.links__track gap と一致

  const track = document.getElementById('linksTrack');
  const dotsWrap = document.getElementById('linksDots');
  const linksViewport = track ? track.closest('.links__viewport') : null;

  function linkCardHTML(it) {
    return '<li class="link-card"><a href="' + esc(safeUrl(it.url)) + '">' +
      '<span class="link-card__thumb"><img src="' + esc(it.image) + '" alt="' + esc(it.label) + '"></span></a></li>';
  }

  function initLinksCarousel() {
    if (!track || !dotsWrap || !linksViewport) return;
    const cards = Array.prototype.slice.call(track.children);
    let page = 0;

    // ドットはバナー1枚につき1つ
    function buildDots() {
      dotsWrap.innerHTML = '';
      for (let i = 0; i < cards.length; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', (i + 1) + '番目のバナーへ');
        if (i === page) dot.classList.add('is-active');
        (function (idx) { dot.addEventListener('click', function () { goTo(idx); }); })(i);
        dotsWrap.appendChild(dot);
      }
    }

    // 指定バナーを左端に寄せる（末尾は余白が出ないようクランプ）
    function goTo(i) {
      page = Math.max(0, Math.min(i, cards.length - 1));
      // 1枚分の送り幅は実測（カード幅＋間隔）。SP/PCでカード幅が変わっても正しくページ送りできる
      const step = (cards.length > 1)
        ? (cards[1].offsetLeft - cards[0].offsetLeft)
        : (LINK_CARD_W + LINK_GAP);
      const maxX = Math.max(0, track.scrollWidth - linksViewport.clientWidth);
      const x = Math.min(page * step, maxX);
      track.style.transform = 'translateX(' + (-x) + 'px)';
      Array.prototype.forEach.call(dotsWrap.children, function (d, idx) {
        d.classList.toggle('is-active', idx === page);
      });
    }

    function layout() { page = 0; buildDots(); goTo(0); }
    layout();

    let rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
  }

  // 初期化：data/links.json を fetch → カード描画 → カルーセル初期化。失敗時は空のまま（A-3）。
  if (track) {
    fetch('data/links.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        track.innerHTML = (data.items || []).map(linkCardHTML).join('');
        initLinksCarousel();
      })
      .catch(function (e) { console.error('関連サイトデータの取得に失敗:', e); });
  }

  /* ------------------------------------------------------------------------
     E. PAGE TOP
     一定量スクロールしたら表示、クリックで先頭へスムーズスクロール
     ------------------------------------------------------------------------ */
  const pageTop = document.getElementById('pageTop');
  if (pageTop) {
    window.addEventListener('scroll', function () {
      pageTop.classList.toggle('is-visible', window.scrollY > 400);
    }, { passive: true });
    pageTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------------
     F. 検索窓プレースホルダー（SPのみ「（例：〜）」を省く）
        ヘッダー・「職業を調べてみよう！」など全ての検索窓に適用
     ------------------------------------------------------------------------ */
  const searchInputs = document.querySelectorAll('.searchbox input');
  if (searchInputs.length) {
    const mq = window.matchMedia('(max-width: 640px)');
    const entries = Array.prototype.map.call(searchInputs, function (el) {
      const full = el.getAttribute('placeholder') || '';
      return { el: el, full: full, short: full.replace(/（例[:：][^）]*）/, '') };  // 「（例：エンジニア）」を除去
    });
    const applyPh = function () {
      entries.forEach(function (e) { e.el.placeholder = mq.matches ? e.short : e.full; });
    };
    applyPh();
    if (mq.addEventListener) { mq.addEventListener('change', applyPh); }
    else if (mq.addListener) { mq.addListener(applyPh); }
  }

  /* ------------------------------------------------------------------------
     G. SPメニューのアコーディオン（ドロップダウン親項目をタップで開閉）
        ※CSSのハンバーガー化と同じ 1150px 以下で動作（PCはホバー表示なので影響なし）
     ------------------------------------------------------------------------ */
  const subParents = document.querySelectorAll('.gnav__item.has-sub > a');
  const mqSP = window.matchMedia('(max-width: 1150px)');
  subParents.forEach(function (a) {
    const li = a.parentElement;
    const toggle = function (e) {
      if (!mqSP.matches) return;              // SPのみ
      e.preventDefault();
      const open = li.classList.toggle('is-open');
      a.setAttribute('aria-expanded', open ? 'true' : 'false');   // SP開閉を状態に反映
    };
    a.addEventListener('click', toggle);
    a.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { toggle(e); }
    });
    // PC：ホバーメニューをキーボードで開いた（focus-within）状態を aria-expanded に反映
    li.addEventListener('focusin', function () { if (!mqSP.matches) a.setAttribute('aria-expanded', 'true'); });
    li.addEventListener('focusout', function (e) {
      if (!mqSP.matches && !li.contains(e.relatedTarget)) a.setAttribute('aria-expanded', 'false');
    });
  });

})();
