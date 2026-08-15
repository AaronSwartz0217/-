"use strict";
/* ============== UI 渲染与交互 ============== */
window.GameUI = (function () {
  const D = window.GameData;
  const E = window.GameEngine;
  const JOBS = D.JOBS;
  const LEVEL_NAME = D.LEVEL_NAME;
  const TOTAL_MONTHS = D.TOTAL_MONTHS;
  const GOAL = D.GOAL;
  const BANKRUPT = D.BANKRUPT;
  const THEME_KEY = D.THEME_KEY;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const state = E.state;
    // 状态栏
    $('stMonth').textContent = state.currentMonth + ' / ' + TOTAL_MONTHS;
    const netEl = $('stNet');
    netEl.textContent = E.fmt(state.netWorth);
    netEl.classList.toggle('warn', state.netWorth < 0);
    netEl.classList.toggle('good', state.netWorth >= GOAL);
    const prog = E.clamp(state.netWorth / GOAL * 100, 0, 100);
    $('stBar').style.width = Math.max(prog, 0.5) + '%';
    $('stDraw').textContent = state.drawChances;

    // 当前工作
    renderJob();

    // 按钮可用性
    const ended = state.gameOver;
    const pending = state.pendingSingle || (state.pendingTen && !state.pendingTen.resolved);
    const inChoice = !!state.pendingChoice;
    $('btnSingle').disabled = ended || state.drawChances < 1 || inChoice;
    $('btnTen').disabled = ended || state.drawChances < 10 || inChoice;
    $('btnNext').disabled = ended || !!pending || inChoice;

    // 抽卡结果弹窗（存在未处理单抽结果时弹出）
    if (state.pendingSingle) openSingleModal(); else closeSingleModal();

    // 图鉴计数
    const collected = state.collection.R.length + state.collection.SR.length + state.collection.SSR.length + state.collection.SSSR.length;
    const total = JOBS.R.length + JOBS.SR.length + JOBS.SSR.length + JOBS.SSSR.length;
    $('dexCount').textContent = collected + ' / ' + total;

    // 日志
    renderLog();
  }

  function renderJob() {
    const state = E.state;
    const body = $('jobBody');
    const tag = $('jobTag');
    if (!state.currentJob) {
      tag.textContent = '无业';
      body.innerHTML = '<div class="empty-hint">尚未入职，请抽卡获取工作机会</div>';
      return;
    }
    const j = state.currentJob;
    const d = E.findDistrict(j.district);
    tag.textContent = LEVEL_NAME[j.level];
    body.innerHTML =
      '<div class="job-head">' +
        '<span class="lvl lvl-' + j.level + '">' + j.level + '</span>' +
        '<span class="job-name">' + escapeHtml(j.name) + '</span>' +
        (j.blacklist ? '<span class="black-tag">黑心</span>' : '') +
        '<span class="job-meta">' + escapeHtml(j.district) + '</span>' +
      '</div>' +
      '<div class="job-rows">' +
        '<div><span class="k">月薪范围：</span><span class="v">' + E.fmt(j.salaryMin) + ' ~ ' + E.fmt(j.salaryMax) + ' 元</span></div>' +
        '<div><span class="k">所在区月租：</span><span class="v">' + E.fmt(d.rentMin) + ' ~ ' + E.fmt(d.rentMax) + ' 元</span></div>' +
        '<div><span class="k">生活费：</span><span class="v">' + E.fmt(d.living) + ' 元/月</span></div>' +
        '<div><span class="k">月离职率：</span><span class="v">' + d.quit + '%</span></div>' +
        '<div><span class="k">地区录取率：</span><span class="v">' + d.hire + '%</span></div>' +
        '<div><span class="k">预估月支出：</span><span class="v">' + E.fmt(d.rentMin + d.living) + ' ~ ' + E.fmt(d.rentMax + d.living) + ' 元</span></div>' +
        (j.blacklist ? '<div><span class="k">特殊：</span><span class="v black-text">黑心公司 · 负面概率 60%</span></div>' : '') +
      '</div>' +
      '<div class="job-actions">' +
        '<button class="btn danger" id="btnResign"><span>主动离职</span></button>' +
      '</div>';
    $('btnResign').onclick = resignJob;
  }

  /* ---------- 单抽弹窗 ---------- */
  function openSingleModal() { renderSingleModal(); $('singleModal').classList.add('show'); }
  function closeSingleModal() { $('singleModal').classList.remove('show'); }

  function renderSingleModal() {
    const state = E.state;
    const card = state.pendingSingle;
    const body = $('singleBody');
    const actions = $('singleActions');
    if (!card) { closeSingleModal(); return; }
    body.innerHTML = renderBigCard(card);
    if (card.isN) {
      actions.innerHTML = '<button class="btn" id="drDismiss"><span>知道了</span></button>';
      $('drDismiss').onclick = () => { state.pendingSingle = null; E.saveState(); closeSingleModal(); render(); afterAction(); };
    } else {
      actions.innerHTML = '<button class="btn primary" id="drAccept"><span>录取</span></button><button class="btn" id="drDecline"><span>放弃</span></button>';
      $('drAccept').onclick = acceptSingle;
      $('drDecline').onclick = declineSingle;
    }
  }

  function renderBigCard(card) {
    if (card.isN) {
      return (
        '<div class="big-card n-card">' +
          '<div class="lvl-strip" style="background:var(--level-N)"></div>' +
          '<div class="row-top">' +
            '<span class="lvl lvl-N">N</span>' +
            '<span class="hire-rate">错过 · 无工作机会</span>' +
          '</div>' +
          '<div class="job-name-big">错过</div>' +
          '<div class="job-district">此次未获得工作机会</div>' +
          '<div class="salary" style="color:var(--text-faint)">无收入<span class="unit"></span></div>' +
        '</div>'
      );
    }
    const rate = E.hireRate(card.level, card.districtHire);
    return (
      '<div class="big-card bc-' + card.level + '">' +
        '<div class="lvl-strip" style="background:var(--level-' + card.level + ')"></div>' +
        '<div class="row-top">' +
          '<span class="lvl lvl-' + card.level + '">' + card.level + ' · ' + LEVEL_NAME[card.level] + '</span>' +
          '<span class="hire-rate">录取率 ' + E.pct(rate) + '</span>' +
        '</div>' +
        '<div class="job-name-big">' + escapeHtml(card.name) + '</div>' +
        '<div class="job-district">' + escapeHtml(card.district) + ' · 月租 ' + E.fmt(card.rentMin) + '~' + E.fmt(card.rentMax) + ' · 生活费 ' + E.fmt(card.living) + '</div>' +
        '<div class="salary">' + E.fmt(card.salaryMin) + ' ~ ' + E.fmt(card.salaryMax) + ' <span class="unit">元/月</span></div>' +
      '</div>'
    );
  }

  function renderLog() {
    const state = E.state;
    const list = $('logList');
    if (!state.log.length) {
      list.innerHTML = '<div class="log-empty">暂无事件，开始你的杭州求职之旅吧</div>';
      return;
    }
    list.innerHTML = state.log.slice(0, 10).map(l =>
      '<div class="log-item ' + l.type + '">' +
        '<span class="m">第' + l.month + '月</span>' + escapeHtml(l.text) +
      '</div>'
    ).join('');
  }

  /* ---------- 事件队列（随机事件 + 抉择统一管理） ---------- */
  // 在抽卡结果处理完 / 跳过本月后调用：触发抉择入队 + 依次展示队列
  function afterAction() {
    const state = E.state;
    if (state.gameOver) { openEndModal(); return; }
    E.triggerChoiceIntoQueue();
    E.saveState();
    processEventQueue();
  }

  // 幂等：根据队列首项弹出对应弹窗（抽卡结果未处理时不弹事件）
  function processEventQueue() {
    const state = E.state;
    if (state.gameOver) { closeEventModal(); closeChoiceModal(); openEndModal(); return; }
    if (!state.eventQueue || !state.eventQueue.length) { closeEventModal(); closeChoiceModal(); return; }
    if (state.pendingSingle || (state.pendingTen && !state.pendingTen.resolved)) return;
    const ev = state.eventQueue[0];
    if (ev.kind === 'random') {
      if (!$('eventModal').classList.contains('show')) openEventModal();
    } else if (ev.kind === 'choice') {
      if (!$('choiceModal').classList.contains('show')) openChoiceModal();
    }
  }

  function resolveChoice(idx) {
    const state = E.state;
    const ev = state.eventQueue[0];
    if (!ev || ev.kind !== 'choice') return;
    const opt = ev.event.options[idx];
    if (!opt) return;
    const eff = opt.effect;
    const resultText = E.applyChoiceEffect(eff);
    const isNeg = (eff.type === 'money' && eff.min < 0) || eff.type === 'penalty';
    E.addLog('抉择【' + ev.event.name + '】' + opt.text + '：' + resultText, isNeg ? 'neg' : 'pos');
    toast(opt.text + '：' + resultText);
    state.eventQueue.shift();
    closeChoiceModal();
    E.saveState();
    if (state.netWorth >= GOAL || state.netWorth < BANKRUPT) {
      state.gameOver = true;
      state.gameResult = state.netWorth >= GOAL ? 'win' : 'bankrupt';
      E.addLog(state.gameResult === 'win' ? '净资产突破 100 万，胜利！' : '净资产跌破破产线，游戏结束', state.gameResult === 'win' ? 'pos' : 'neg');
      E.saveState();
      render();
      openEndModal();
      return;
    }
    render();
    processEventQueue();
  }

  /* ---------- 抉择弹窗 ---------- */
  function openChoiceModal() { renderChoiceModal(); $('choiceModal').classList.add('show'); }
  function closeChoiceModal() { $('choiceModal').classList.remove('show'); }

  function renderChoiceModal() {
    const state = E.state;
    const ev = state.eventQueue && state.eventQueue[0];
    if (!ev || ev.kind !== 'choice') { closeChoiceModal(); return; }
    const cev = ev.event;
    $('choiceTitle').textContent = '抉择 · ' + cev.name;
    $('choiceDesc').textContent = cev.desc;
    const opts = cev.options;
    $('choiceOptions').innerHTML = opts.map((o, i) =>
      '<button class="choice-opt" data-i="' + i + '">' +
        '<div class="co-text">' + escapeHtml(o.text) + '</div>' +
        '<div class="co-hint">' + escapeHtml(o.hint) + '</div>' +
      '</button>'
    ).join('');
    $('choiceOptions').querySelectorAll('.choice-opt').forEach(el => {
      el.onclick = () => resolveChoice(parseInt(el.dataset.i, 10));
    });
  }

  /* ---------- 随机事件弹窗 ---------- */
  function openEventModal() { renderEventModal(); $('eventModal').classList.add('show'); }
  function closeEventModal() { $('eventModal').classList.remove('show'); }

  function renderEventModal() {
    const state = E.state;
    const ev = state.eventQueue && state.eventQueue[0];
    if (!ev || ev.kind !== 'random') { closeEventModal(); return; }
    $('eventTitle').textContent = (ev.type === 'pos' ? '【好运】' : '【麻烦】') + ev.name;
    $('eventBody').innerHTML =
      '<div class="event-desc">' + escapeHtml(ev.desc) + '</div>' +
      '<div class="event-result ' + ev.type + '">' + escapeHtml(ev.result) + '</div>';
  }

  function dismissEvent() {
    const state = E.state;
    if (!state.eventQueue.length) { closeEventModal(); return; }
    state.eventQueue.shift();
    closeEventModal();
    E.saveState();
    render();
    processEventQueue();
  }

  /* ---------- 抽卡交互（含自动过月） ---------- */

  // 单抽：先生成卡牌前自动触发一次月结算
  function singleDraw() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    if (state.drawChances < 1) { toast('抽卡次数不足'); return; }
    singleDrawProceed();
  }

  function singleDrawProceed() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    // 自动月结算（十连抽只触发一次，单抽触发一次）
    const result = E.settleMonthCore();
    render();
    if (result.gameOver) { openEndModal(); return; }
    // 结算可能改变了抽卡次数，再次校验
    if (state.drawChances < 1) { toast('抽卡次数不足'); return; }
    state.drawChances -= 1;
    state.totalDraws += 1;
    state.pendingSingle = E.generateCard();
    E.saveState();
    render();
  }

  function acceptSingle() {
    const state = E.state;
    if (!state.pendingSingle) return;
    const card = state.pendingSingle;
    if (card.isN) {
      toast('错过：N 卡不可录取');
      E.addLog('抽到 N 卡：错过', 'sys');
      state.pendingSingle = null;
      E.saveState();
      render();
      afterAction();
      return;
    }
    const res = E.attemptHire(card);
    if (res.ok) {
      toast(res.dup ? '「' + card.name + '」已在图鉴中，已重新入职' : '录取成功！');
      E.addLog('录取成功：' + card.name + '（' + card.level + '）@ ' + card.district + '，录取率 ' + E.pct(res.rate), 'pos');
    } else {
      toast('错失良机');
      E.addLog('录取失败：' + card.name + '（' + card.level + '），录取率 ' + E.pct(res.rate) + ' - 错失良机', 'neg');
    }
    state.pendingSingle = null;
    E.saveState();
    render();
    afterAction();
  }

  function declineSingle() {
    const state = E.state;
    if (!state.pendingSingle) return;
    const card = state.pendingSingle;
    E.addLog('放弃：' + (card.isN ? 'N 卡错过' : card.name + '（' + card.level + '）'), 'sys');
    state.pendingSingle = null;
    E.saveState();
    render();
    afterAction();
  }

  // 十连抽：先生成卡牌前自动触发一次月结算（仅一次）
  function tenDraw() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    if (state.drawChances < 10) { toast('需要 10 次抽卡机会'); return; }
    tenDrawProceed();
  }

  function tenDrawProceed() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    // 自动月结算（只触发一次）
    const result = E.settleMonthCore();
    render();
    if (result.gameOver) { openEndModal(); return; }
    if (state.drawChances < 10) { toast('需要 10 次抽卡机会'); return; }
    state.drawChances -= 10;
    state.totalDraws += 10;
    const cards = [];
    for (let i = 0; i < 10; i++) cards.push(E.generateCard());
    state.pendingTen = { cards: cards, resolved: false, selectedIndex: -1, results: null };
    E.saveState();
    render();
    openTenModal();
  }

  function tenSelect(index) {
    const state = E.state;
    if (!state.pendingTen || state.pendingTen.resolved) return;
    state.pendingTen.selectedIndex = index;
    renderTenModal();
  }

  function tenConfirm() {
    const state = E.state;
    if (!state.pendingTen || state.pendingTen.resolved) return;
    const idx = state.pendingTen.selectedIndex;
    if (idx < 0) { toast('请先选择一张卡牌'); return; }
    const cards = state.pendingTen.cards;
    const results = cards.map(() => null);
    const card = cards[idx];
    let msg = '';
    if (card.isN) {
      results[idx] = { ok: false, n: true };
      msg = '选中 N 卡：错过';
      E.addLog('十连抽：选中 N 卡 - 错过', 'sys');
    } else {
      const res = E.attemptHire(card);
      results[idx] = { ok: res.ok, dup: res.dup };
      if (res.ok) {
        msg = res.dup ? '「' + card.name + '」已在图鉴，已重新入职' : '录取成功！';
        E.addLog('十连录取成功：' + card.name + '（' + card.level + '）@ ' + card.district, 'pos');
      } else {
        msg = '错失良机';
        E.addLog('十连录取失败：' + card.name + '（' + card.level + '）- 错失良机', 'neg');
      }
    }
    state.pendingTen.resolved = true;
    state.pendingTen.results = results;
    toast(msg);
    E.saveState();
    renderTenModal();
  }

  function tenDeclineAll() {
    const state = E.state;
    if (!state.pendingTen) return;
    if (!state.pendingTen.resolved) {
      E.addLog('十连抽：全部放弃', 'sys');
    }
    state.pendingTen = null;
    E.saveState();
    closeTenModal();
    render();
    afterAction();
  }

  /* ---------- 跳过本月（不抽卡直接过月） ---------- */
  function settleMonth() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    if (state.pendingSingle || (state.pendingTen && !state.pendingTen.resolved)) {
      toast('请先处理当前抽卡结果');
      return;
    }
    settleMonthProceed();
  }

  function settleMonthProceed() {
    const state = E.state;
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    E.settleMonthCore();
    render();
    if (state.gameOver) openEndModal();
    else afterAction();
  }

  /* ---------- 主动离职 ---------- */
  function resignJob() {
    const state = E.state;
    if (!state.currentJob) { toast('当前无工作'); return; }
    showConfirm(
      '主动离职',
      '确定要主动离职吗？离职后下个月房租将按无业随机分配区域。',
      function () {
        if (state.currentJob) {
          E.addLog('主动离职：失去工作「' + state.currentJob.name + '」', 'neg');
          state.currentJob = null;
          E.saveState();
          render();
          toast('已主动离职');
        }
      }
    );
  }

  /* ---------- 确认弹窗 ---------- */
  let confirmCallback = null;

  function showConfirm(title, body, onOk) {
    $('confirmTitle').textContent = title;
    $('confirmBody').textContent = body;
    confirmCallback = onOk;
    $('confirmModal').classList.add('show');
  }

  function closeConfirm() {
    $('confirmModal').classList.remove('show');
    confirmCallback = null;
  }

  /* ---------- 重置 ---------- */
  function resetGame() {
    if (!confirm('确定重新开始？当前进度将被清空。')) return;
    E.resetState();
    render();
    toast('已重新开始，祝你好运');
  }

  /* ---------- 兑换码 ---------- */
  function redeemCode() {
    const state = E.state;
    const input = $('redeemInput');
    const code = (input.value || '').trim();
    if (!code) { toast('请输入兑换码'); return; }
    if (state.gameOver) { toast('游戏已结束，请重新开始'); return; }
    if (code !== '李东盛') { toast('兑换码无效'); return; }

    // 构造「作者」SSSR 卡（随机地区，SSSR 录取率 100% 必入职）
    const district = E.pickDistrict();
    const s = D.SALARY.SSSR;
    const card = {
      level: 'SSSR',
      name: '作者',
      district: district.name,
      salaryMin: s[0],
      salaryMax: s[1],
      districtHire: district.hire,
      isN: false
    };
    const res = E.attemptHire(card);
    if (res.ok) {
      toast('兑换成功：已获得「作者」岗位');
      E.addLog('兑换码生效：直接获得「作者」（SSSR）@ ' + district.name, 'pos');
    } else {
      toast('兑换失败');
    }
    input.value = '';
    E.saveState();
    render();
  }

  /* ---------- 十连抽弹窗 ---------- */
  function openTenModal() { $('tenModal').classList.add('show'); renderTenModal(); }
  function closeTenModal() { $('tenModal').classList.remove('show'); }

  function renderTenModal() {
    const state = E.state;
    const pt = state.pendingTen;
    const body = $('tenBody');
    const hint = $('tenHint');
    if (!pt) { closeTenModal(); return; }
    const resolved = pt.resolved;
    body.innerHTML = '<div class="ten-grid">' + pt.cards.map((c, i) => {
      const sel = pt.selectedIndex === i;
      let resultHtml = '';
      if (resolved && pt.results && pt.results[i] !== null) {
        const r = pt.results[i];
        if (r.n) resultHtml = '<div class="mc-result no">错过</div>';
        else if (r.ok) resultHtml = '<div class="mc-result ok">录取' + (r.dup ? '(已有)' : '') + '</div>';
        else resultHtml = '<div class="mc-result no">错失</div>';
      }
      return '<div class="mini-card ' + (sel ? 'selected' : '') + ' ' + (resolved ? 'locked' : '') + '" data-i="' + i + '">' +
        '<span class="lvl lvl-' + c.level + ' mc-lvl">' + c.level + '</span>' +
        '<span class="mc-name">' + (c.isN ? '错过' : escapeHtml(c.name)) + '</span>' +
        (c.isN ? '' : '<span class="mc-dist">' + escapeHtml(c.district) + '</span>') +
        resultHtml +
      '</div>';
    }).join('') + '</div>';

    // 绑定点击
    body.querySelectorAll('.mini-card').forEach(el => {
      if (resolved) return;
      el.onclick = () => tenSelect(parseInt(el.dataset.i, 10));
    });

    $('tenConfirm').disabled = resolved || pt.selectedIndex < 0;
    $('tenConfirm').style.display = resolved ? 'none' : '';
    $('tenDecline').querySelector('span').textContent = resolved ? '关闭' : '全部放弃';
    if (resolved) {
      hint.textContent = '本轮十连抽已结算，点击下方按钮关闭';
    } else {
      hint.textContent = pt.selectedIndex >= 0 ? '已选中，点击「录取选中卡牌」确认' : '点击任意卡牌选中后录取';
    }
  }

  /* ---------- 图鉴弹窗 ---------- */
  function openDexModal() { renderDexModal(); $('dexModal').classList.add('show'); }

  function renderDexModal() {
    const state = E.state;
    const body = $('dexBody');
    const groups = [
      { level: 'R', label: 'R · 基层工作' },
      { level: 'SR', label: 'SR · 中级工作' },
      { level: 'SSR', label: 'SSR · 高级工作' },
      { level: 'SSSR', label: 'SSSR · 作者' }
    ];
    let collected = 0, total = 0;
    body.innerHTML = groups.map(g => {
      const all = JOBS[g.level];
      const got = state.collection[g.level];
      collected += got.length;
      total += all.length;
      const cells = all.map(name => {
        const has = got.includes(name);
        return '<div class="dex-cell ' + (has ? 'got' : 'lock') + '">' +
          '<div class="dn">' + (has ? escapeHtml(name) : '？？？') + '</div>' +
          '<div class="dd">' + (has ? '已获得' : '未获得') + '</div>' +
        '</div>';
      }).join('');
      return '<div class="dex-group">' +
        '<h4><span class="lvl lvl-' + g.level + '">' + g.level + '</span> ' + g.label + ' <span class="prog">' + got.length + ' / ' + all.length + '</span></h4>' +
        '<div class="dex-grid">' + cells + '</div>' +
      '</div>';
    }).join('');
    body.insertAdjacentHTML('beforeend', '<div class="overlay-hint">总进度：' + collected + ' / ' + total + '</div>');
  }

  /* ---------- 设置弹窗 ---------- */
  function openSetModal() {
    const state = E.state;
    $('hzSwitch').classList.toggle('on', state.settings.hzBoost);
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('themeSwitch').classList.toggle('on', dark);
    $('setModal').classList.add('show');
  }

  /* ---------- 结局弹窗 ---------- */
  function openEndModal() {
    const state = E.state;
    const r = state.gameResult;
    const map = {
      win: { cls: 'win', title: '胜利！扎根杭州' },
      fail: { cls: 'fail', title: '十年期满 · 未达目标' },
      bankrupt: { cls: 'bankrupt', title: '破产出局' }
    };
    const info = map[r] || map.fail;
    const best = state.stats.bestJob ? state.stats.bestJob.name + '（' + state.stats.bestJob.level + '）' : '无';
    $('endBody').innerHTML =
      '<div class="end-screen ' + info.cls + '">' +
        '<div class="end-title">' + info.title + '</div>' +
        '<div style="color:var(--text-soft);font-size:14px">' + (r === 'win' ? '你用十年时间在杭州攒下百万资产，恭喜！' : r === 'bankrupt' ? '净资产跌破 -50,000，你被迫离开杭州。' : '120 个月过去，你距离百万目标还有一段距离。') + '</div>' +
        '<div class="end-stats">' +
          '<div class="es"><div class="k">最终净资产</div><div class="v">' + E.fmt(state.netWorth) + ' 元</div></div>' +
          '<div class="es"><div class="k">累计总收入</div><div class="v">' + E.fmt(state.totalIncome) + ' 元</div></div>' +
          '<div class="es"><div class="k">经历月份</div><div class="v">' + Math.min(state.currentMonth - 1, TOTAL_MONTHS) + ' / ' + TOTAL_MONTHS + '</div></div>' +
          '<div class="es"><div class="k">累计抽卡</div><div class="v">' + state.totalDraws + ' 次</div></div>' +
          '<div class="es"><div class="k">录取成功</div><div class="v">' + state.stats.successCount + ' 次</div></div>' +
          '<div class="es"><div class="k">录取失败</div><div class="v">' + state.stats.missCount + ' 次</div></div>' +
          '<div class="es"><div class="k">触发事件</div><div class="v">' + state.stats.eventTriggered + ' 次</div></div>' +
          '<div class="es"><div class="k">最高职位</div><div class="v">' + escapeHtml(best) + '</div></div>' +
        '</div>' +
        '<div class="draw-actions">' +
          '<button class="btn primary" id="endRestart"><span>重新开始</span></button>' +
          '<button class="btn" id="endClose"><span>查看记录</span></button>' +
        '</div>' +
      '</div>';
    $('endModal').classList.add('show');
    $('endRestart').onclick = () => { $('endModal').classList.remove('show'); resetGame(); };
    $('endClose').onclick = () => { $('endModal').classList.remove('show'); };
  }

  /* ---------- 主题 ---------- */
  function applyTheme(dark) {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
    }
    const tt = $('themeToggle');
    if (tt) tt.textContent = dark ? '日间模式' : '夜间模式';
  }

  function toggleTheme() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    applyTheme(dark);
    // 同步设置弹窗开关
    if ($('setModal').classList.contains('show')) {
      $('themeSwitch').classList.toggle('on', dark);
    }
  }

  function initTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('themeToggle').textContent = dark ? '日间模式' : '夜间模式';
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    $('btnSingle').onclick = singleDraw;
    $('btnTen').onclick = tenDraw;
    $('btnNext').onclick = settleMonth;
    $('btnDex').onclick = openDexModal;
    $('btnReset').onclick = resetGame;
    $('themeToggle').onclick = toggleTheme;
    $('themeInline').onclick = toggleTheme;

    // 兑换码
    $('btnRedeem').onclick = redeemCode;
    $('redeemInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') redeemCode(); });

    // 事件弹窗（随机事件告知）
    $('eventOk').onclick = dismissEvent;

    $('tenClose').onclick = tenDeclineAll;
    $('tenConfirm').onclick = tenConfirm;
    $('tenDecline').onclick = tenDeclineAll;
    $('tenModal').onclick = (e) => { if (e.target === $('tenModal') && !(E.state.pendingTen && E.state.pendingTen.resolved)) { /* 不允许点遮罩关闭未结算 */ } };

    $('dexClose').onclick = () => $('dexModal').classList.remove('show');
    $('setClose').onclick = () => $('setModal').classList.remove('show');

    $('hzSwitch').onclick = () => {
      const state = E.state;
      state.settings.hzBoost = !state.settings.hzBoost;
      $('hzSwitch').classList.toggle('on', state.settings.hzBoost);
      E.saveState();
      toast(state.settings.hzBoost ? '杭州地区加成已开启' : '杭州地区加成已关闭');
    };
    $('themeSwitch').onclick = toggleTheme;

    // 确认弹窗
    $('confirmClose').onclick = closeConfirm;
    $('confirmCancel').onclick = closeConfirm;
    $('confirmOk').onclick = () => {
      const cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    };
    $('confirmModal').addEventListener('click', (e) => { if (e.target === $('confirmModal')) closeConfirm(); });

    // 弹窗遮罩点击关闭（图鉴/设置）
    $('dexModal').addEventListener('click', (e) => { if (e.target === $('dexModal')) $('dexModal').classList.remove('show'); });
    $('setModal').addEventListener('click', (e) => { if (e.target === $('setModal')) $('setModal').classList.remove('show'); });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        ['tenModal', 'dexModal', 'setModal', 'endModal', 'confirmModal'].forEach(id => $(id).classList.remove('show'));
      }
    });
  }

  // 设置入口：点击副标题打开设置
  function bindSettingsEntry() {
    const sub = document.querySelector('.topbar .sub');
    if (sub) {
      sub.style.cursor = 'pointer';
      sub.title = '点击打开设置';
      sub.onclick = openSetModal;
    }
  }

  return {
    render: render,
    toast: toast,
    openTenModal: openTenModal,
    openEndModal: openEndModal,
    openSetModal: openSetModal,
    processEventQueue: processEventQueue,
    initTheme: initTheme,
    bindEvents: bindEvents,
    bindSettingsEntry: bindSettingsEntry
  };
})();
