// 地区页逻辑：地图行政区（单选）+ 风险标签双维度筛选
const hitMap = document.getElementById('hitMap');
const mapSelected = document.getElementById('mapSelected');
const extraDistrictChips = document.getElementById('extraDistrictChips');
const tagChips = document.getElementById('tagChips');
const results = document.getElementById('results');
const resultTitle = document.getElementById('resultTitle');
const resultCount = document.getElementById('resultCount');

// 当前筛选状态（null 表示不限）
let activeDistrict = null;
let activeTag = null;

// 地图上没有对应热区的行政区（外地 / 杭州全域等），用 chip 补充入口
function extraDistricts() {
  const mapNames = new Set(MAP_REGIONS.map(r => r.name));
  return [...new Set(VISIBLE_LIST.map(c => c.district))].filter(d => !mapNames.has(d));
}

// —— 各区统计柱状图 ——
function buildBarChart() {
  const chart = document.getElementById('barChart');
  if (!chart) return;
  const stats = HZ_DISTRICTS.map(d => ({ name: d.key, count: countByDistrict(d.key) }));
  extraDistricts().forEach(d => stats.push({ name: d, count: countByDistrict(d) }));
  stats.sort((a, b) => b.count - a.count);
  const max = Math.max(...stats.map(s => s.count), 1);

  chart.innerHTML = '';
  stats.forEach(s => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.setAttribute('data-district', s.name);
    row.innerHTML = `
      <span class="bar-label">${esc(s.name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(s.count / max * 100)}%"></div></div>
      <span class="bar-count">${s.count}</span>
    `;
    row.onclick = () => { activeDistrict = (activeDistrict === s.name ? null : s.name); render(); };
    chart.appendChild(row);
  });
}

function refreshBarChart() {
  document.querySelectorAll('.bar-row').forEach(r => {
    r.classList.toggle('active', r.getAttribute('data-district') === activeDistrict);
  });
}

// —— 地图热区 ——
function buildMap() {
  const frag = document.createDocumentFragment();
  MAP_REGIONS.forEach(r => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'region-hit');
    path.setAttribute('d', r.d);
    path.setAttribute('data-district', r.name);
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    const cnt = countByDistrict(r.name);
    path.setAttribute('aria-label', `${r.name}，收录 ${cnt} 家`);
    const select = () => { activeDistrict = (activeDistrict === r.name ? null : r.name); render(); };
    path.addEventListener('click', select);
    path.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
    frag.appendChild(path);
  });
  hitMap.innerHTML = '';
  hitMap.appendChild(frag);
}

// 同步地图热区选中态
function refreshMapStates() {
  hitMap.querySelectorAll('.region-hit').forEach(p => {
    p.classList.toggle('selected', p.getAttribute('data-district') === activeDistrict);
  });
}

// 地图下方显示当前已选行政区
function refreshMapSelected() {
  const onMap = MAP_REGIONS.some(r => r.name === activeDistrict);
  if (activeDistrict && onMap) {
    mapSelected.innerHTML = `已选 <span class="name">${esc(activeDistrict)}</span><span class="cnt">共 ${countByDistrict(activeDistrict)} 家</span>`;
  } else {
    mapSelected.textContent = '点击地图上的行政区进行筛选';
  }
}

// —— 补充地区 chip（外地 / 杭州全域）+ 全部 ——
function buildExtraChips() {
  const frag = document.createDocumentFragment();
  frag.appendChild(makeChip('全部', VISIBLE_LIST.length,
    () => { activeDistrict = null; render(); },
    () => activeDistrict === null));
  extraDistricts().forEach(d => {
    frag.appendChild(makeChip(d, countByDistrict(d),
      () => { activeDistrict = (activeDistrict === d ? null : d); render(); },
      () => activeDistrict === d));
  });
  extraDistrictChips.innerHTML = '';
  extraDistrictChips.appendChild(frag);
}

function buildTagChips() {
  const frag = document.createDocumentFragment();
  allTags().forEach(t => {
    const cnt = VISIBLE_LIST.filter(c => (c.tags || []).includes(t)).length;
    frag.appendChild(makeChip(t, cnt,
      () => { activeTag = (activeTag === t ? null : t); render(); },
      () => activeTag === t));
  });
  tagChips.innerHTML = '';
  tagChips.appendChild(frag);
}

function makeChip(label, cnt, onClick, isActive) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.innerHTML = `${esc(label)}<span class="cnt">${cnt}</span>`;
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
  return VISIBLE_LIST.filter(c =>
    (activeDistrict === null || c.district === activeDistrict) &&
    (activeTag === null || (c.tags || []).includes(activeTag))
  );
}

function render() {
  refreshMapStates();
  refreshMapSelected();
  refreshChipStates();
  refreshBarChart();
  const list = currentList();

  const parts = [];
  if (activeDistrict) parts.push(activeDistrict);
  if (activeTag) parts.push(`#${activeTag}`);
  resultTitle.textContent = parts.length ? parts.join(' · ') : '全部企业';
  resultCount.textContent = `共 ${list.length} 家`;

  if (!list.length) {
    const tip = activeDistrict
      ? `${activeDistrict}暂无收录企业。`
      : '当前筛选条件下暂无收录企业。';
    results.innerHTML = `<div class="empty">${esc(tip)}</div>`;
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

buildBarChart();
buildMap();
buildExtraChips();
buildTagChips();
render();
initCommon();
