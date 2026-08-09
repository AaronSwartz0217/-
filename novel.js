// 小说模式逻辑：书架卡片列表 → 章节阅读
const shelf = document.getElementById('shelf');
const reader = document.getElementById('reader');

// —— 书架视图 ——
function renderShelf() {
  reader.classList.remove('show');
  shelf.classList.add('show');
  shelf.innerHTML = '';

  if (!NOVELS.length) {
    shelf.innerHTML = '<div class="empty">作品正在整理中，敬请期待。</div>';
    return;
  }
  NOVELS.forEach(book => {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${book.title} 详情`);
    const tagsHtml = (book.tags || []).map(t => `<span class="book-tag">${esc(t)}</span>`).join('');
    card.innerHTML = `
      <div class="book-title">${esc(book.title)}</div>
      <div class="book-author">${esc(book.author || '佚名')} · 共 ${book.chapters.length} 章</div>
      <div class="book-intro">${esc(book.intro || '')}</div>
      <div class="book-tags">${tagsHtml}</div>
    `;
    const open = () => openBook(book);
    card.onclick = open;
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    shelf.appendChild(card);
  });

  // 末尾追加「我要分享」卡片：点击立即弹出联系我们
  const add = document.createElement('div');
  add.className = 'book-card add-card';
  add.setAttribute('role', 'button');
  add.setAttribute('tabindex', '0');
  add.setAttribute('aria-label', '我要分享');
  add.innerHTML = `
    <div class="add-plus">+</div>
    <div class="add-text">我要分享</div>
    <div class="add-sub">投稿你的求职经历</div>
  `;
  add.onclick = showContact;
  add.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showContact(); }
  });
  shelf.appendChild(add);
}

// —— 阅读视图 ——
function openBook(book, chapterIndex = 0) {
  shelf.classList.remove('show');
  reader.classList.add('show');
  const idx = Math.max(0, Math.min(chapterIndex, book.chapters.length - 1));
  const ch = book.chapters[idx];
  const paras = String(ch.content || '').split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join('');

  const chapterNav = book.chapters.map((c, i) =>
    `<button class="chapter-item${i === idx ? ' active' : ''}" data-i="${i}">${esc(c.title)}</button>`
  ).join('');

  reader.innerHTML = `
    <div class="reader-top">
      <button class="icon-btn reader-back" id="backShelf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        书架
      </button>
      <span class="reader-book">${esc(book.title)}</span>
    </div>
    <div class="chapter-list">${chapterNav}</div>
    <article class="chapter-body">
      <h2>${esc(ch.title)}</h2>
      ${paras}
    </article>
    <div class="reader-pager">
      <button class="icon-btn" id="prevCh"${idx === 0 ? ' disabled' : ''}>上一章</button>
      <button class="icon-btn" id="nextCh"${idx === book.chapters.length - 1 ? ' disabled' : ''}>下一章</button>
    </div>
  `;

  document.getElementById('backShelf').onclick = renderShelf;
  const prev = document.getElementById('prevCh');
  const next = document.getElementById('nextCh');
  if (prev) prev.onclick = () => openBook(book, idx - 1);
  if (next) next.onclick = () => openBook(book, idx + 1);
  reader.querySelectorAll('.chapter-item').forEach(btn => {
    btn.onclick = () => openBook(book, Number(btn.dataset.i));
  });
  window.scrollTo({ top: 0 });
}

renderShelf();
initCommon();
