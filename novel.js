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

  // 隐秘的入口：伪装成小说的游戏卡片
  const game = document.createElement('div');
  game.className = 'book-card';
  game.setAttribute('role', 'button');
  game.setAttribute('tabindex', '0');
  game.setAttribute('aria-label', '隐秘的入口');
  game.innerHTML = `
    <div class="book-title">隐秘的入口</div>
    <div class="book-author">佚名 · 离线可玩</div>
    <div class="book-intro">一个不起眼的入口，通向未知的角落。</div>
    <div class="book-tags"><span class="book-tag">隐藏内容</span></div>
  `;
  game.onclick = openGame;
  game.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGame(); }
  });
  shelf.appendChild(game);

  // 杭州十年百万：求职卡牌策略游戏
  const draw = document.createElement('div');
  draw.className = 'book-card';
  draw.setAttribute('role', 'button');
  draw.setAttribute('tabindex', '0');
  draw.setAttribute('aria-label', '杭州十年百万');
  draw.innerHTML = `
    <div class="book-title">杭州十年百万</div>
    <div class="book-author">职场生存 · 抽卡经营</div>
    <div class="book-intro">10年在杭赚100万，你能做到吗？</div>
    <div class="book-tags"><span class="book-tag">策略游戏</span></div>
  `;
  draw.onclick = openDrawGame;
  draw.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawGame(); }
  });
  shelf.appendChild(draw);

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

// —— 隐秘的入口：恐龙快跑 ——
function openGame() {
  shelf.classList.remove('show');
  reader.classList.add('show');
  reader.innerHTML = `
    <div class="reader-top">
      <button class="icon-btn reader-back" id="backShelf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        书架
      </button>
      <span class="reader-book">隐秘的入口</span>
    </div>
    <div class="game-wrap">
      <canvas id="dinoCanvas"></canvas>
      <div class="game-score" id="gameScore">0</div>
      <div class="game-hint" id="gameHint">按空格或点击屏幕开始</div>
    </div>
  `;

  document.getElementById('backShelf').onclick = renderShelf;

  const canvas = document.getElementById('dinoCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('gameScore');
  const hintEl = document.getElementById('gameHint');
  const cs = getComputedStyle(document.documentElement);
  const cText = cs.getPropertyValue('--text').trim() || '#1a1a1a';
  const cBg = cs.getPropertyValue('--surface').trim() || '#fff';
  const cFaint = cs.getPropertyValue('--text-faint').trim() || '#9a9a9a';

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  resize();

  let dino, obstacles, score, speed, running, gameOver, groundY;
  const gravity = 0.55, jumpPower = -12;
  let rafId = null;

  function reset() {
    groundY = canvas.height - 36;
    dino = { x: 50, y: groundY - 34, vy: 0, w: 28, h: 34, jumping: false };
    obstacles = [];
    score = 0; speed = 5; gameOver = false; running = true;
    hintEl.style.opacity = '0';
    scoreEl.textContent = '0';
    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function jump() {
    if (gameOver || !running) { reset(); return; }
    if (!dino.jumping) { dino.vy = jumpPower; dino.jumping = true; }
  }

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 地面线
    ctx.strokeStyle = cFaint; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();

    // 恐龙物理
    dino.vy += gravity; dino.y += dino.vy;
    if (dino.y >= groundY - dino.h) { dino.y = groundY - dino.h; dino.vy = 0; dino.jumping = false; }

    // 绘制恐龙（像素方块风格）
    ctx.fillStyle = cText;
    ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
    ctx.fillStyle = cBg;
    ctx.fillRect(dino.x + 18, dino.y + 5, 5, 5); // 眼睛

    // 生成障碍物
    if (Math.random() < 0.018) {
      const h = 24 + Math.random() * 18;
      obstacles.push({ x: canvas.width, y: groundY - h, w: 16, h: h });
    }

    // 更新+碰撞
    ctx.fillStyle = cText;
    obstacles = obstacles.filter(o => {
      o.x -= speed;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      if (dino.x < o.x + o.w && dino.x + dino.w > o.x &&
          dino.y < o.y + o.h && dino.y + dino.h > o.y) {
        gameOver = true; running = false;
      }
      return o.x > -o.w;
    });

    if (running) {
      score++;
      scoreEl.textContent = Math.floor(score / 10);
      if (score % 500 === 0) speed += 0.5;
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = cText; ctx.font = '600 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('得分 ' + Math.floor(score / 10), canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = '13px sans-serif'; ctx.fillStyle = cFaint;
      ctx.fillText('按空格或点击重新开始', canvas.width / 2, canvas.height / 2 + 20);
      hintEl.textContent = '按空格或点击重新开始';
      hintEl.style.opacity = '1';
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  // 待机画面
  groundY = canvas.height - 36;
  ctx.fillStyle = cText; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('按空格或点击屏幕开始', canvas.width / 2, canvas.height / 2);

  // 键盘+触屏
  function onKey(e) {
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
    if (e.key === 'Escape') { cleanup(); renderShelf(); }
  }
  function cleanup() {
    document.removeEventListener('keydown', onKey);
    if (rafId) cancelAnimationFrame(rafId);
    running = false;
  }
  document.addEventListener('keydown', onKey);
  canvas.onclick = jump;
  // 返回书架时清理
  const origBack = document.getElementById('backShelf').onclick;
  document.getElementById('backShelf').onclick = function() { cleanup(); renderShelf(); };

  window.scrollTo({ top: 0 });
}

// —— 杭州十年百万：直接跳转独立游戏页（不再 iframe 嵌套） ——
function openDrawGame() {
  window.location.href = 'draw-game/index.html';
}

renderShelf();
initCommon();
