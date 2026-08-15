"use strict";
/* ============== 游戏常量数据 ============== */
window.GameData = (function () {

  const JOBS = {
    R: ['外卖骑手','快递员','便利店店员','保安','保洁','餐厅服务员','超市收银员','工厂普工','建筑工人','搬运工'],
    SR: ['程序员','设计师','运营专员','会计','销售经理','行政主管','人力资源专员','市场策划','客服主管','采购专员'],
    SSR: ['产品总监','技术架构师','财务总监','市场部负责人','高级工程师','运营总监','人力资源总监','销售总监']
  };

  const DISTRICTS = [
    { name:'余杭区', jobs:25, hire:75,  quit:12.5, rentMin:1800, rentMax:3000, living:2500 },
    { name:'西湖区', jobs:21, hire:79,  quit:10.5, rentMin:1800, rentMax:3000, living:3000 },
    { name:'滨江区', jobs:20, hire:80,  quit:10.0, rentMin:2500, rentMax:4000, living:3500 },
    { name:'上城区', jobs:19, hire:81,  quit:9.5,  rentMin:2000, rentMax:3300, living:3000 },
    { name:'萧山区', jobs:19, hire:81,  quit:9.5,  rentMin:2200, rentMax:3500, living:2500 },
    { name:'拱墅区', jobs:12, hire:88,  quit:6.0,  rentMin:1800, rentMax:2700, living:2800 },
    { name:'临平区', jobs:7,  hire:93,  quit:3.5,  rentMin:1000, rentMax:2000, living:2000 },
    { name:'钱塘区', jobs:4,  hire:96,  quit:2.0,  rentMin:1500, rentMax:2500, living:2200 }
  ];

  const SALARY = { R:[2000,6000], SR:[6000,10000], SSR:[10000,20000] };
  const LEVEL_NAME = { N:'错过', R:'基层', SR:'中级', SSR:'高级' };

  // 意外事件
  const EVENTS_POS = [
    { name:'年终奖到账', desc:'金钱 +3,000~8,000',     type:'money', min:3000, max:8000 },
    { name:'项目奖金',   desc:'金钱 +2,000~5,000',     type:'money', min:2000, max:5000 },
    { name:'贵人相助',   desc:'获得 3 次额外抽卡机会', type:'draws', value:3 },
    { name:'副业收入',   desc:'金钱 +1,000~3,000',     type:'money', min:1000, max:3000 }
  ];
  const EVENTS_NEG = [
    { name:'公司拖欠工资', desc:'本月收入减半',         type:'income_half' },
    { name:'招聘诈骗',     desc:'金钱 -2,000',          type:'money', min:-2000, max:-2000 },
    { name:'无故辞退',     desc:'立即失去当前工作',     type:'lose_job' },
    { name:'租房被骗',     desc:'金钱 -3,000',          type:'money', min:-3000, max:-3000 },
    { name:'加班过劳',     desc:'下月收入 -10%（可叠加）', type:'penalty' },
    { name:'HR刁难',        desc:'本月收入归零',         type:'income_zero' }
  ];

  const GOAL = 1000000;
  const BANKRUPT = -50000;
  const TOTAL_MONTHS = 120;
  const STORAGE_KEY = 'jobDrawGame_v3';
  const THEME_KEY = 'theme';

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function defaultState() {
    return {
      drawChances: randInt(10, 200),
      totalDraws: 0,
      currentMonth: 1,
      netWorth: 15000,
      totalIncome: 0,
      currentJob: null,
      collection: { R:[], SR:[], SSR:[] },
      stats: { successCount:0, missCount:0, eventTriggered:0, monthsWorked:0, bestJob:null },
      gameOver: false,
      gameResult: null,
      settings: { hzBoost: true },
      nextIncomePenalty: 0,
      pendingSingle: null,
      pendingTen: null,
      log: []
    };
  }

  return {
    JOBS: JOBS,
    DISTRICTS: DISTRICTS,
    SALARY: SALARY,
    LEVEL_NAME: LEVEL_NAME,
    EVENTS_POS: EVENTS_POS,
    EVENTS_NEG: EVENTS_NEG,
    GOAL: GOAL,
    BANKRUPT: BANKRUPT,
    TOTAL_MONTHS: TOTAL_MONTHS,
    STORAGE_KEY: STORAGE_KEY,
    THEME_KEY: THEME_KEY,
    defaultState: defaultState
  };
})();
