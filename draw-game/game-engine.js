"use strict";
/* ============== 核心游戏逻辑 ============== */
window.GameEngine = (function () {
  const D = window.GameData;
  const JOBS = D.JOBS;
  const DISTRICTS = D.DISTRICTS;
  const SALARY = D.SALARY;
  const EVENTS_POS = D.EVENTS_POS;
  const EVENTS_NEG = D.EVENTS_NEG;
  const CHOICE_EVENTS = D.CHOICE_EVENTS;
  const BLACK_COMPANIES = D.BLACK_COMPANIES;
  const BLACK_RATE = D.BLACK_RATE;
  const GOAL = D.GOAL;
  const BANKRUPT = D.BANKRUPT;
  const TOTAL_MONTHS = D.TOTAL_MONTHS;
  const STORAGE_KEY = D.STORAGE_KEY;
  const defaultState = D.defaultState;

  let state = null;

  /* ---------- 存档读写 ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const d = defaultState();
        state = Object.assign({}, d, p);
        state.stats = Object.assign({}, d.stats, p.stats || {});
        state.settings = Object.assign({}, d.settings, p.settings || {});
        state.collection = Object.assign({}, d.collection, p.collection || {});
        if (!Array.isArray(state.log)) state.log = [];
        if (!Array.isArray(state.eventQueue)) state.eventQueue = [];
        // 迁移旧版 pendingChoice → eventQueue
        if (p.pendingChoice && !state.eventQueue.length) {
          state.eventQueue.push({ kind: 'choice', event: p.pendingChoice.event });
        }
        if (typeof state.drawChances !== 'number') state.drawChances = randInt(10, 200);
      } else {
        state = defaultState();
        saveState();
      }
    } catch (e) {
      state = defaultState();
      saveState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function resetState() {
    state = defaultState();
    saveState();
  }

  /* ---------- 工具函数 ---------- */
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }
  function fmt(n) { return Math.round(n).toLocaleString('zh-CN'); }
  function pct(n) { return (Math.round(n * 10) / 10) + '%'; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function findDistrict(name) {
    return DISTRICTS.find(d => d.name === name) || DISTRICTS[0];
  }

  function pickDistrict() {
    const total = DISTRICTS.reduce((s, d) => s + d.jobs, 0);
    let r = Math.random() * total;
    for (const d of DISTRICTS) {
      r -= d.jobs;
      if (r <= 0) return d;
    }
    return DISTRICTS[0];
  }

  function pickWeighted(arr, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  // 出现率（杭州加成后归一化）
  function appearanceRates() {
    let n = 20, r = 40, sr = 30, ssr = 10, sssr = 0.1;
    if (state.settings.hzBoost) { sr += 5; ssr += 5; }
    const t = n + r + sr + ssr + sssr;
    return { N: n / t, R: r / t, SR: sr / t, SSR: ssr / t, SSSR: sssr / t };
  }

  // 实际录取率 = 等级基础录取率(含加成) × (地区录取率 / 100)
  function hireRate(level, districtHire) {
    if (level === 'N') return 0;
    let base = { R: 80, SR: 30, SSR: 10, SSSR: 100 }[level];
    if (state.settings.hzBoost) {
      if (level === 'R') base += 5;
      else if (level === 'SR') base += 8;
      else if (level === 'SSR') base += 10;
    }
    base = Math.min(base, 100);
    return base * (districtHire / 100);
  }

  function pickLevel() {
    const rates = appearanceRates();
    const r = Math.random();
    let c = 0;
    for (const lv of ['N', 'R', 'SR', 'SSR', 'SSSR']) {
      c += rates[lv];
      if (r < c) return lv;
    }
    return 'SSSR';
  }

  function generateCard() {
    const level = pickLevel();
    if (level === 'N') {
      return { level: 'N', name: '错过', district: null, salaryMin: 0, salaryMax: 0, isN: true };
    }
    const district = pickDistrict();
    const s = SALARY[level];
    // 黑心公司判定（SSSR「作者」不黑心）
    let blacklist = false;
    let name;
    if (level !== 'SSSR' && Math.random() < BLACK_RATE) {
      blacklist = true;
      name = BLACK_COMPANIES[Math.floor(Math.random() * BLACK_COMPANIES.length)];
    } else {
      const list = JOBS[level];
      name = list[Math.floor(Math.random() * list.length)];
    }
    return {
      level: level,
      name: name,
      district: district.name,
      salaryMin: s[0],
      salaryMax: s[1],
      districtHire: district.hire,
      districtQuit: district.quit,
      rentMin: district.rentMin,
      rentMax: district.rentMax,
      living: district.living,
      blacklist: blacklist
    };
  }

  function addLog(text, type) {
    state.log.unshift({ month: state.currentMonth, text: text, type: type || 'sys' });
    if (state.log.length > 30) state.log.length = 30;
  }

  /* ---------- 抉择效果应用 ---------- */
  // 应用玩家选择的抉择效果，返回结果描述文本
  function applyChoiceEffect(eff) {
    let result = '';
    if (eff.type === 'money') {
      const amt = randInt(eff.min, eff.max);
      state.netWorth += amt;
      result = (amt >= 0 ? '+' : '') + fmt(amt) + ' 元';
    } else if (eff.type === 'draws') {
      state.drawChances += eff.value;
      result = '+' + eff.value + ' 次抽卡机会';
    } else if (eff.type === 'penalty') {
      state.nextIncomePenalty += eff.value;
      result = '下月收入 -' + Math.round(eff.value * 100) + '%';
    } else if (eff.type === 'heal') {
      state.nextIncomePenalty = 0;
      result = '清除过劳惩罚';
    }
    return result;
  }

  /* ---------- 抉择入队（抽卡结果处理完后调用） ---------- */
  function triggerChoiceIntoQueue() {
    if (Math.random() < 0.15) {
      const ev = CHOICE_EVENTS[Math.floor(Math.random() * CHOICE_EVENTS.length)];
      state.eventQueue.push({ kind: 'choice', event: ev });
      addLog('触发抉择：' + ev.name, 'sys');
    }
  }

  /* ---------- 录取判定 ---------- */
  // 返回 { ok, dup, rate }
  function attemptHire(card) {
    const rate = card.isN ? 0 : hireRate(card.level, card.districtHire);
    const roll = Math.random() * 100;
    const ok = roll < rate;
    let dup = false;
    if (ok) {
      const col = state.collection[card.level];
      if (col.includes(card.name)) {
        dup = true;
      } else {
        col.push(card.name);
      }
      // 替换当前工作
      state.currentJob = {
        name: card.name,
        level: card.level,
        district: card.district,
        salaryMin: card.salaryMin,
        salaryMax: card.salaryMax,
        blacklist: !!card.blacklist
      };
      state.stats.successCount++;
      // bestJob
      const order = { R: 1, SR: 2, SSR: 3, SSSR: 4 };
      const cur = state.stats.bestJob;
      if (!cur || order[card.level] > order[cur.level]) {
        state.stats.bestJob = { name: card.name, level: card.level };
      }
    } else {
      state.stats.missCount++;
    }
    return { ok: ok, dup: dup, rate: rate };
  }

  /* ---------- 每月结算核心（不调用 UI） ----------
     流程：收入 → 房租 → 生活费 → 意外事件 → 净资产变化 → 离职判定 → 月份+1
     返回 { gameOver: boolean }，由调用方决定后续渲染与弹窗。
  */
  function settleMonthCore() {
    if (state.gameOver) return { gameOver: true };

    let income = 0;
    let district;
    let rent = 0, living = 0;

    if (state.currentJob) {
      district = findDistrict(state.currentJob.district);
      const raw = randFloat(state.currentJob.salaryMin, state.currentJob.salaryMax);
      income = raw * (1 - state.nextIncomePenalty);
      rent = randFloat(district.rentMin, district.rentMax);
      living = district.living;
      state.stats.monthsWorked++;
    } else {
      // 无工作：随机分配区域
      district = pickDistrict();
      rent = randFloat(district.rentMin, district.rentMax);
      living = district.living;
    }

    // 应用本月过劳惩罚后重置（下月重新累计）
    const appliedPenalty = state.nextIncomePenalty;
    state.nextIncomePenalty = 0;

    const expense = rent + living;
    let eventMoney = 0;
    let eventObj = null;
    let lostJobViaEvent = false;

    // 事件判定（负面占比：正常 30%，黑心公司 60%）
    let posRate = 0.7;
    if (state.currentJob && state.currentJob.blacklist) posRate = 0.4;
    if (Math.random() < 0.3) {
      state.stats.eventTriggered++;
      if (Math.random() < posRate) {
        // 正面
        eventObj = pickWeighted(EVENTS_POS, [25, 25, 20, 20, 18, 10, 15, 12, 10]);
        if (eventObj.type === 'money') {
          eventMoney = randInt(eventObj.min, eventObj.max);
        } else if (eventObj.type === 'draws') {
          state.drawChances += eventObj.value;
        }
      } else {
        // 负面
        eventObj = pickWeighted(EVENTS_NEG, [18, 15, 10, 12, 14, 8, 12, 10, 15, 10, 12]);
        if (eventObj.type === 'income_half') income *= 0.5;
        else if (eventObj.type === 'income_zero') income = 0;
        else if (eventObj.type === 'money') eventMoney = eventObj.min;
        else if (eventObj.type === 'lose_job') lostJobViaEvent = true;
        else if (eventObj.type === 'penalty') state.nextIncomePenalty += 0.1;
      }
    }

    const netIncome = income - expense + eventMoney;
    state.netWorth += netIncome;
    state.totalIncome += income;

    // 日志
    let logType = 'sys';
    let logText = '第 ' + state.currentMonth + ' 月结算：收入 ' + fmt(income) + ' - 支出 ' + fmt(expense);
    if (appliedPenalty > 0) logText += '（过劳 -' + Math.round(appliedPenalty * 100) + '%）';
    logText += ' = 净 ' + (netIncome >= 0 ? '+' : '') + fmt(netIncome);
    addLog(logText, logType);

    if (eventObj) {
      const isPos = EVENTS_POS.indexOf(eventObj) >= 0;
      // 计算实际结果文本
      let resultText = eventObj.desc;
      if (eventObj.type === 'money') {
        resultText = (eventMoney >= 0 ? '+' : '') + fmt(eventMoney) + ' 元';
      } else if (eventObj.type === 'draws') {
        resultText = '+' + eventObj.value + ' 次抽卡机会';
      } else if (eventObj.type === 'income_half') {
        resultText = '本月收入减半';
      } else if (eventObj.type === 'income_zero') {
        resultText = '本月收入归零';
      } else if (eventObj.type === 'lose_job') {
        resultText = '立即失去当前工作';
      } else if (eventObj.type === 'penalty') {
        resultText = '下月收入 -10%';
      }
      // 入事件队列（供弹窗展示）
      state.eventQueue.push({ kind: 'random', name: eventObj.name, desc: eventObj.desc, result: resultText, type: isPos ? 'pos' : 'neg' });
      addLog((isPos ? '【正面】' : '【负面】') + eventObj.name + '：' + resultText, isPos ? 'pos' : 'neg');
    }

    // 无故辞退
    if (lostJobViaEvent && state.currentJob) {
      addLog('被无故辞退：失去工作「' + state.currentJob.name + '」', 'neg');
      state.currentJob = null;
    }

    // 离职判定（仅在仍有工作时）
    if (state.currentJob) {
      const quitRate = district.quit / 100;
      if (Math.random() < quitRate) {
        addLog('离职：失去工作「' + state.currentJob.name + '」（' + district.name + '离职率 ' + district.quit + '%）', 'neg');
        state.currentJob = null;
      }
    }

    // 月份推进 + 每月抽卡
    state.currentMonth++;
    state.drawChances += 1;

    // 胜负判定
    if (state.netWorth < BANKRUPT) {
      state.gameOver = true;
      state.gameResult = 'bankrupt';
      addLog('净资产跌破破产线，游戏结束', 'neg');
    } else if (state.currentMonth > TOTAL_MONTHS) {
      state.gameOver = true;
      state.gameResult = state.netWorth >= GOAL ? 'win' : 'fail';
      addLog(state.gameResult === 'win' ? '十年期满，达成百万目标，胜利！' : '十年期满，未能达成百万目标', state.gameResult === 'win' ? 'pos' : 'neg');
    } else if (state.netWorth >= GOAL) {
      // 提前达成
      state.gameOver = true;
      state.gameResult = 'win';
      addLog('净资产突破 100 万，提前达成目标，胜利！', 'pos');
    }

    saveState();
    return { gameOver: state.gameOver };
  }

  return {
    get state() { return state; },
    loadState: loadState,
    saveState: saveState,
    resetState: resetState,
    randInt: randInt,
    randFloat: randFloat,
    fmt: fmt,
    pct: pct,
    clamp: clamp,
    findDistrict: findDistrict,
    pickDistrict: pickDistrict,
    pickWeighted: pickWeighted,
    appearanceRates: appearanceRates,
    hireRate: hireRate,
    pickLevel: pickLevel,
    generateCard: generateCard,
    addLog: addLog,
    attemptHire: attemptHire,
    applyChoiceEffect: applyChoiceEffect,
    triggerChoiceIntoQueue: triggerChoiceIntoQueue,
    settleMonthCore: settleMonthCore
  };
})();
