// 搜索页逻辑
const input = document.getElementById('searchInput');
const btn = document.getElementById('searchBtn');
const suggest = document.getElementById('suggest');
const stat = document.getElementById('stat');

stat.textContent = `已收录 ${BLACKLIST.length} 家`;

function doSearch() {
  const query = input.value.trim();
  if (!query) { input.focus(); return; }
  const results = searchCompanies(query);
  suggest.innerHTML = '';

  if (results.length === 0) {
    showSafe(query);
  } else if (results.length === 1) {
    showDanger(results[0]);
  } else {
    results.forEach(c => {
      const div = document.createElement('div');
      div.className = 'suggest-item';
      div.textContent = `${c.name}（${c.district}）`;
      div.onclick = () => { suggest.innerHTML = ''; showDanger(c); };
      suggest.appendChild(div);
    });
  }
}

btn.onclick = doSearch;
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

initCommon();
