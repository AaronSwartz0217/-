// 地区页逻辑：行政区 + 风险标签双维度筛选
const districtChips = document.getElementById('districtChips');
const tagChips = document.getElementById('tagChips');
const results = document.getElementById('results');
const resultTitle = document.getElementById('resultTitle');
const resultCount = document.getElementById('resultCount');

// 当前筛选状态（null 表示不限）
let activeDistrict = null;
let activeTag = null;

// 所有出现过的行政区（杭州各区在前，按 HZ_DISTRICTS 顺序，其余附后）
function allDistricts() {
  const inData = [...new Set(BLACKLIST.map(c => c.district))];
  const ordered = HZ_DISTRICTS.map(d => d.key).filter(k => inData.includes(k));
  const others = inData.filter(d => !ordered.includes(d));
  return ordered.concat(others);
}

function buildDistrictChips() {
  const frag = document.createDocumentFragment();
  // “全部”选项
  frag.appendChild(makeChip('全部', BLACKLIST.length, () => { activeDistrict = null; render(); }, () => activeDistrict === null));
  allDistricts().forEach(d => {
    frag.appendChild(makeChip(d, countByDistrict(d),
      () => { activeDistrict = (activeDistrict === d ? null : d); render(); },
      () => activeDistrict === d, 'district', d));
  });
  districtChips.innerHTML = '';
  districtChips.appendChild(frag);
}

function buildTagChips() {
  const frag = document.createDocumentFragment();
  allTags().forEach(t => {
    const cnt = BLACKLIST.filter(c => (c.tags || []).includes(t)).length;
    frag.appendChild(makeChip(t, cnt,
      () => { activeTag = (activeTag === t ? null : t); render(); },
      () => activeTag === t));
  });
  tagChips.innerHTML = '';
  tagChips.appendChild(frag);
}

function makeChip(label, cnt, onClick, isActive, dataKey, dataVal) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.innerHTML = `${esc(label)}<span class="cnt">${cnt}</span>`;
  if (dataKey === 'district') b.setAttribute('data-district', dataVal);
  b.onclick = onClick;
  b._isActive = isActive;
  return b;
}

function refreshChipStates() {
  document.querySelectorAll('.chip').forEach(c => {
    if (c._isActive) c.classList.toggle('active', c._isActive());
  });
}

function currentList() {
  return BLACKLIST.filter(c =>
    (activeDistrict === null || c.district === activeDistrict) &&
    (activeTag === null || (c.tags || []).includes(activeTag))
  );
}

function render() {
  refreshChipStates();
  const list = currentList();

  const parts = [];
  if (activeDistrict) parts.push(activeDistrict);
  if (activeTag) parts.push(`#${activeTag}`);
  resultTitle.textContent = parts.length ? parts.join(' · ') : '全部企业';
  resultCount.textContent = `共 ${list.length} 家`;

  if (!list.length) {
    results.innerHTML = '<div class="empty">当前筛选条件下暂无收录企业。</div>';
    return;
  }
  results.innerHTML = '';
  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'company-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${c.name} 详情`);
    const tagsHtml = (c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    card.innerHTML = `
      <div class="cc-name">${esc(c.name)}</div>
      <div class="cc-full">${esc(c.fullName)} · ${esc(c.district)}</div>
      <div class="cc-reason">${esc(c.reason)}</div>
      <div class="cc-tags">${tagsHtml}</div>
    `;
    // 点击卡片 → 与搜索页一致的完整避雷弹窗
    card.onclick = () => showDanger(c);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDanger(c); }
    });
    results.appendChild(card);
  });
}

buildDistrictChips();
buildTagChips();
render();
initCommon();
