/* =========================================================
   Oo 公式サイト 共通スクリプト (v21)
   全ページがこの1ファイルを読み込む
   ========================================================= */

/* =========================================================
   ⓪ ページを開いた時は必ず一番上から表示する（v19）
   ・ブラウザや表示環境が「前のページのスクロール位置」を引き継いでしまい、
     VIEW MORE で移った先のページが途中から表示される問題への対策
   ・ただし「news.html#news-20260930」のように行き先（#〜）が付いている時は、
     その記事の位置へ移動するので、上には戻さない
   ・ブラウザの「戻る」「進む」で来た時だけは、前に見ていた位置に戻す（v23）
   ========================================================= */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// このページに「戻る」「進む」で来たかどうか（ブラウザが教えてくれる）
const navEntry = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
const isBackForward = !!navEntry && navEntry.type === 'back_forward';
// 前に見ていた位置（下の saveScroll で、ブラウザの履歴に一緒に記録してある）
const savedY = history.state && typeof history.state.scrollY === 'number' ? history.state.scrollY : null;
// 「戻る」で来て、前の位置の記録もある時だけ true
const restoring = isBackForward && savedY !== null;

function scrollToTopIfNoTarget() {
  // 「戻る」で来た時は、前に見ていた位置へ一瞬で戻す（v23）
  if (restoring) { window.scrollTo({ top: savedY, left: 0, behavior: 'instant' }); return; }
  // behavior: 'instant' … スルスル動かさず、一瞬で一番上にする（v20）
  if (!location.hash) { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); return; }
  // 「index.html#about」のように行き先付きで来た時は、その場所に一瞬で表示する（v21）
  const target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
}
scrollToTopIfNoTarget();
// persisted … ブラウザが前のページを丸ごと保存していて、それをそのまま再表示した時（「戻る」の一種）。
// その時は見ていた位置もそのまま残っているので、動かさない（v23）
window.addEventListener('pageshow', e => { if (!e.persisted) scrollToTopIfNoTarget(); });
// 画像などが読み込み終わった後にも、位置を合わせ直す（読み込み中はページの長さが変わるため）
// ただし、それまでに見ている人が自分でスクロールし始めていたら、引き戻さないよう何もしない（v37）
// （userScrolled は下の「文字の読み込み」のところで用意している）
window.addEventListener('load', () => { if ((location.hash || restoring) && !userScrolled) scrollToTopIfNoTarget(); });

/* 今見ている位置を、ブラウザの履歴に記録しておく（v23）
   ・スクロールが止まった時（0.2秒動かなかった時）と、ページを離れる直前に記録する
   ・ここで記録した位置を、「戻る」で来た時に上の savedY として読み出す */
function saveScroll() {
  try { history.replaceState(Object.assign({}, history.state, { scrollY: window.scrollY }), ''); } catch (e) {}
}
let saveTimer;
window.addEventListener('scroll', () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveScroll, 200); }, { passive: true });
window.addEventListener('pagehide', saveScroll);

/* 文字（Google Fonts）の読み込みが終わった後に、もう一度記事の位置へ合わせ直す（v23）
   ・文字の読み込みが遅れると、移動した後に文字の高さが変わって、記事の上の線が
     2pxほどずれてヘッダーに隠れることがあるため
   ・ただし、それまでに見ている人が自分でスクロールし始めていたら、邪魔しないよう何もしない */
let userScrolled = false;
['wheel', 'touchstart', 'keydown'].forEach(type =>
  window.addEventListener(type, () => { userScrolled = true; }, { once: true, passive: true }));
if (document.fonts) {
  document.fonts.ready.then(() => { if ((location.hash || restoring) && !userScrolled) scrollToTopIfNoTarget(); });
}

/* =========================================================
   ① ハンバーガーメニューの開け閉め
   ========================================================= */
const drawer = document.getElementById('drawer');
const openBtn = document.getElementById('menuOpen');
// メニューの後ろに敷く半透明の幕（v26でメニューを小窓にしたため追加）
// 各ページのHTMLに書かなくて済むよう、ここで作ってページに足す。幕を押すとメニューが閉じる
const backdrop = document.createElement('div');
backdrop.className = 'menu-backdrop';
backdrop.hidden = true;
backdrop.addEventListener('click', () => setMenu(false));
document.body.appendChild(backdrop);
// メニューの後ろにある部分（ヘッダー・本文・フッター）。メニューを開いている間は操作できなくする（v37）
const behindMenu = document.querySelectorAll('body > header, body > main, body > footer');
function setMenu(open) {
  openBtn.setAttribute('aria-expanded', String(open));   // これで 3本線 ⇔ ✕ の変形も動く（css/style.css）
  openBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  // 開いている間は、後ろのページがスクロールしないようにする（css/style.css の html.menu-open。v37）
  document.documentElement.classList.toggle('menu-open', open);
  // inert … 「触れない・Tabキーで選べない」状態にする指定。開いている間、後ろのリンクに移動できないようにする（v37）
  behindMenu.forEach(el => { el.inert = open; });
  // メニューの中のリンクを選んだままで閉じた時は、選択をメニューボタンに戻す（どこを操作中か分からなくならないように）
  if (!open && drawer.contains(document.activeElement)) openBtn.focus({ preventScroll: true });
  if (open) {
    // 開く：閉じかけの印を外して表示する（右からすべり出る動きは css/style.css 側で付く）
    drawer.classList.remove('is-closing');
    backdrop.classList.remove('is-closing');
    drawer.hidden = false;
    backdrop.hidden = false;
    return;
  }
  if (drawer.hidden) return;   // もう閉じている時は何もしない
  // 閉じる：is-closing を付けて右へすべらせ、動きが終わってから隠す（v27）
  // 動きを減らす設定などで動きが無い時は、すぐに隠す
  const hide = () => {
    if (!drawer.classList.contains('is-closing')) return;   // 途中でまた開かれた時は隠さない
    drawer.hidden = true;
    backdrop.hidden = true;
    drawer.classList.remove('is-closing');
    backdrop.classList.remove('is-closing');
  };
  drawer.classList.add('is-closing');
  backdrop.classList.add('is-closing');
  if (getComputedStyle(drawer).animationName === 'none') hide();
  else drawer.addEventListener('animationend', hide, { once: true });
}
// メニューボタンは、閉じている時に押すと開き、開いている時（✕の形）に押すと閉じる（v32）
openBtn.addEventListener('click', () => setMenu(drawer.hidden || drawer.classList.contains('is-closing')));
// メニュー内のリンクを押したら自動で閉じる
drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* =========================================================
   ①-2 同じページ内への移動（メニューの SNS・ABOUT、ロゴの「トップへ」など）（v21）
   ・ページを読み込み直さずに、今見ている位置からなめらかに目的の場所へ動かす
     （読み込み直すと、一度ページの一番上に戻ってから動くように見えてしまうため）
   ・「#about」や、今いるページ宛ての「index.html#about」の両方に対応
   ========================================================= */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href*="#"]');
  if (!link) return;
  const url = new URL(link.getAttribute('href'), location.href);
  const samePage = url.pathname === location.pathname ||
    (link.getAttribute('href').startsWith('#'));
  if (!samePage) return;                       // 別のページへの移動はふつうに任せる
  const target = document.getElementById(url.hash.slice(1));
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 「トップへ」（#top）はページの一番上まで戻す。それ以外は見出しがヘッダーに隠れない位置まで
  if (url.hash === '#top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* =========================================================
   ② LIVE情報（Googleスプレッドシート、またはこのファイル内のデータから表示）
   ・スプレッドシートを「ウェブに公開（CSV形式）」にして、そのURLを下に貼る
   ・列の並び（1行目は見出し。v16で列を増やした）：
       A 開始日 / B 終了日（1日だけなら空欄）/ C イベント名 / D 会場 / E 出演 /
       F 時間 / G 料金 / H 予約 / I 詳細（改行したい所に <br> と書く）/
       J 画像（images フォルダに置いたファイル名。2枚以上はカンマ区切り。例：mirai2026-1.jpg,mirai2026-2.jpg）（v28）
     画像は LIVE ページの各公演にだけ表示する（ホームの一覧は文字だけ）
     日付は 2026/10/18 または 2026-10-18 の形で書く
   ・URLが空、または読み込めない時は、下の LIVES_IN_CODE を表示する
   ・終わった公演も含めて、日付の新しい順に表示（v17）。ホームは上から3件、LIVEページは全件
   ========================================================= */
const SHEET_CSV_URL = ''; // ← 例：'https://docs.google.com/spreadsheets/d/e/xxxx/pub?output=csv'

// スプレッドシートがつながるまでは、ここに書いた公演を表示する（列の並びはシートと同じ）
const LIVES_IN_CODE = [
  ['2026-10-23', '2026-10-25', '未来祭2026', '京大吉田寮', '', '', '入場無料・カンパ制（+2drink）', '', '',
   'mirai2026-1.jpg,mirai2026-2.jpg'],
  ['2026-09-20', '', 'WOoHOo vol.1', '京都SUBMARINE',
   '【バンド】Oo / 天国注射 / メシアと人人 / wanbed / 【DJ】アクセサリ',
   'OPEN/START 17:00', 'ADV ¥2,500 / DOOR ¥3,000（+1drink）', '',
   '"WOoHOo"という定期イベントを始めます⚡vol.1は京都のSUBMARINEにて<br>今回は東京からwanbed、関西からは天国注射、メシアと人人とDJユニットのアクセサリを迎えて開催。',
   'woohoo1.jpg'],
];

// 簡単なCSVの読み取り（ダブルクォートで囲まれたカンマにも対応）
function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

// 「2026-10-18」や「2026/10/18」を日付として読む
function toDate(s) {
  const m = String(s || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const dotDate = d => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// 各ライブの目印（例：live-20261023）。ホームの行からLIVEページの該当ライブへ直接飛ぶのに使う
const liveId = d => `live-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

// 1行分のデータを、使いやすい形にまとめる
function toLive(r) {
  const start = toDate(r[0]);
  if (!start) return null;
  const end = toDate(r[1]) || start;
  return { start, end, title: r[2] || '', venue: r[3] || '', lineup: r[4] || '',
           time: r[5] || '', price: r[6] || '', ticket: r[7] || '', detail: r[8] || '',
           // 画像のファイル名を1枚ずつに分ける（カンマ・読点・空白で区切る。v28）
           // \s は「空白」の意味（v37で \ の抜けを修正。抜けていると英字の s で区切ってしまっていた）
           images: String(r[9] || '').split(/[,、\s]+/).filter(Boolean) };
}

// 日付の表示（2日以上の時は「2026.10.23 Fri – 10.25 Sun」）
function dateLabel(l) {
  const a = `${dotDate(l.start)} ${WEEK[l.start.getDay()]}`;
  if (l.end.getTime() === l.start.getTime()) return a;
  return `${a} – ${pad(l.end.getMonth() + 1)}.${pad(l.end.getDate())} ${WEEK[l.end.getDay()]}`;
}

// 文章の中の <br> だけを改行として表示する（それ以外のタグは文字のまま表示して安全に）
function setTextWithBreaks(el, text) {
  String(text).split(/<br\s*\/?>/i).forEach((part, i) => {
    if (i) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(part));
  });
}

// 全公演を日付の新しい順に並べる（終わった公演もそのまま載せる）
function sortLives(rows) {
  return rows.map(toLive).filter(Boolean).sort((a, b) => b.start - a.start);
}

// ホーム用：日付＋イベント名（＋会場）を3件だけ
function renderHomeList(list, lives) {
  list.innerHTML = '';
  if (!lives.length) {
    list.innerHTML = '<li><div class="row"><span></span><div class="body">ライブ情報はまだありません</div></div></li>';
    return;
  }
  lives.slice(0, 3).forEach(l => {
    const li = document.createElement('li');
    const row = document.createElement('a');         // 1行まるごとLIVEページの該当ライブへのリンク
    row.className = 'row';
    row.href = `live.html#${liveId(l.start)}`;
    const time = document.createElement('time');
    time.dateTime = isoDate(l.start);
    time.textContent = dotDate(l.start);
    const w = document.createElement('span'); w.className = 'meta';
    const oneDay = l.end.getTime() === l.start.getTime();
    w.textContent = oneDay
      ? WEEK[l.start.getDay()]
      : `– ${pad(l.end.getMonth() + 1)}.${pad(l.end.getDate())}`;
    // 2日以上の公演の「– 10.25」は、開始日と同じ文字の大きさにする（v23）
    if (!oneDay) w.classList.add('date-end');
    time.appendChild(w);
    const body = document.createElement('div'); body.className = 'body';
    body.textContent = l.title || l.venue;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = l.title ? `@${l.venue}` : '';
    body.appendChild(meta);
    row.append(time, body);
    li.appendChild(row);
    list.appendChild(li);
  });
}

// LIVEページ用：1公演ずつ詳しく
function liveArticle(l) {
  const art = document.createElement('article');
  art.className = 'entry';
  art.id = liveId(l.start);
  const date = document.createElement('time');
  date.className = 'entry-date';
  date.dateTime = isoDate(l.start);
  date.textContent = dateLabel(l);
  const h = document.createElement('h2');
  h.textContent = l.title || l.venue;
  const dl = document.createElement('dl');
  dl.className = 'detail';
  [['会場', l.venue], ['出演', l.lineup], ['時間', l.time], ['料金', l.price], ['予約', l.ticket]].forEach(([k, v]) => {
    if (!v) return;
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  });
  art.append(date, h);
  // フライヤーなどの画像（v28）。押すと元の大きさの画像が新しいタブで開く
  // 置き場所はタイトルのすぐ下（v29。v28は詳細の下だった）
  if (l.images.length) {
    const box = document.createElement('div');
    box.className = 'live-images';
    l.images.forEach((name, i) => {
      const a = document.createElement('a');
      a.href = 'images/' + name;
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = 'images/' + name;
      img.alt = `${l.title || l.venue} の画像${l.images.length > 1 ? (i + 1) : ''}`;
      // 画像が読み込まれるとページの長さが変わるので、記事へ飛んで来た時は位置を合わせ直す
      // （上の公演の画像が後から表示されて、目当ての公演が下にずれるのを防ぐ）
      img.addEventListener('load', () => { if ((location.hash || restoring) && !userScrolled) scrollToTopIfNoTarget(); });
      a.appendChild(img);
      box.appendChild(a);
    });
    art.appendChild(box);
  }
  // 画像の下に、会場・出演などの表と詳細の文章
  art.appendChild(dl);
  if (l.detail) {
    const p = document.createElement('p');
    p.className = 'live-detail';
    setTextWithBreaks(p, l.detail);
    art.appendChild(p);
  }
  return art;
}

function renderLivePage(box, lives) {
  box.innerHTML = '';
  if (!lives.length) {
    box.innerHTML = '<article class="entry"><p>ライブ情報はまだありません。</p></article>';
  }
  lives.forEach(l => box.appendChild(liveArticle(l)));
}

function renderLives(rows) {
  const lives = sortLives(rows);
  const homeList = document.getElementById('liveList');   // ホームにある
  const pageBox = document.getElementById('livePage');    // LIVEページにある
  if (homeList) renderHomeList(homeList, lives);
  if (pageBox) renderLivePage(pageBox, lives);
  // 描き終わるとページの長さが変わるので、位置を合わせ直す
  // （「live.html#live-20261023」のように来た時はその公演へ、「戻る」で来た時は前に見ていた位置へ。v23）
  if (location.hash || restoring) scrollToTopIfNoTarget();
}

async function loadLives() {
  // LIVEを表示する場所がないページ（NEWS・DISC）では何もしない
  if (!document.getElementById('liveList') && !document.getElementById('livePage')) return;
  if (!SHEET_CSV_URL) { renderLives(LIVES_IN_CODE); return; }
  try {
    const res = await fetch(SHEET_CSV_URL);
    // 読み込みに失敗した時（ページが見つからない等）は、下の catch へ進んで予備のデータを表示する（v37）
    if (!res.ok) throw new Error('読み込み失敗：' + res.status);
    const text = await res.text();
    // CSVの代わりにエラー画面やログイン画面（HTML。「<」で始まる）が返ってきた時も、失敗として扱う（v37）
    if (text.trim().startsWith('<')) throw new Error('CSVではないデータが返ってきた');
    const rows = parseCSV(text).slice(1); // 1行目は見出しなので飛ばす
    renderLives(rows);
  } catch (e) {
    renderLives(LIVES_IN_CODE); // 読み込めなかった時はこのファイル内のデータを表示
  }
}
loadLives();
