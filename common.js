// 公共逻辑：搜索匹配、弹窗渲染、主题切换（搜索页与地区页共用）

// 归一化：去除常见后缀、括号备注与空白，便于模糊匹配
function normalize(s) {
  return s.replace(/\s+/g, '')
          .replace(/（[^）]*）/g, '')
          .replace(/(有限公司|有限责任公司|股份公司|公司|集团)$/g, '')
          .toLowerCase();
}

function matchNames(c) {
  const names = [c.name, c.fullName].concat(c.alias || []);
  return names.map(normalize);
}

function searchCompanies(query) {
  const q = normalize(query);
  if (!q) return [];
  return BLACKLIST.filter(c =>
    matchNames(c).some(n => n && (n.includes(q) || q.includes(n)))
  );
}

function countByDistrict(district) {
  return BLACKLIST.filter(c => c.district === district).length;
}

// 收集所有出现过的风险标签（去重）
function allTags() {
  const set = new Set();
  BLACKLIST.forEach(c => (c.tags || []).forEach(t => set.add(t)));
  return [...set];
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
}

// —— 弹窗 —— 需要页面上存在 #overlay 与 #modal
function getModalEls() {
  return { overlay: document.getElementById('overlay'), modal: document.getElementById('modal') };
}

// 命中：标签与避雷原因结合展示（同一区块内，标签在原因下方作为要点）
function showDanger(company) {
  const { modal } = getModalEls();
  const tagsHtml = (company.tags && company.tags.length)
    ? `<div class="reason-tags">${company.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
    : '';
  const groupHtml = company.group
    ? `<div class="group-note"><span class="label">关联提醒</span>${esc(company.group)}</div>` : '';
  modal.className = 'modal danger';
  modal.innerHTML = `
    <span class="badge">命中黑名单 · 建议避雷</span>
    <h2>${esc(company.name)}</h2>
    <div class="subtitle">${esc(company.fullName)} · ${esc(company.district)}</div>
    <div class="reason">
      <span class="label">避雷原因</span>
      <p>${esc(company.reason)}</p>
      ${tagsHtml}
    </div>
    ${groupHtml}
    <button class="close-btn" id="closeBtn">我知道了</button>
  `;
  openModal();
}

function showSafe(query) {
  const { modal } = getModalEls();
  modal.className = 'modal safe';
  modal.innerHTML = `
    <span class="badge">未命中黑名单</span>
    <h2>暂未收录「${esc(query)}」</h2>
    <div class="desc">
      未在当前黑名单中查询到该公司。但这<b>不代表该公司一定安全</b>——本站数据有限，仅收录部分被举报企业。<br><br>
      建议结合天眼查、脉脉、社交平台等多方信息综合判断，谨慎求职。
    </div>
    <button class="close-btn" id="closeBtn">好的</button>
  `;
  openModal();
}

function openModal() {
  const { overlay } = getModalEls();
  overlay.classList.add('show');
  const c = document.getElementById('closeBtn');
  if (c) c.onclick = closeModal;
}
function closeModal() {
  const { overlay } = getModalEls();
  overlay.classList.remove('show');
}

// —— 夜间模式 ——
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  const sync = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.textContent = dark ? '日间模式' : '夜间模式';
  };
  sync();
  themeToggle.onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    sync();
  };
}

// 公共初始化：绑定遮罩点击关闭、Esc 关闭、主题按钮
function initCommon() {
  const { overlay } = getModalEls();
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  initTheme();
}
