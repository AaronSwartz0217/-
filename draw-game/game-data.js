"use strict";
/* ============== 游戏常量数据 ============== */
window.GameData = (function () {

  const JOBS = {
    R: ['外卖骑手','快递员','便利店店员','保安','保洁','餐厅服务员','超市收银员','工厂普工','建筑工人','搬运工'],
    SR: ['程序员','设计师','运营专员','会计','销售经理','行政主管','人力资源专员','市场策划','客服主管','采购专员'],
    SSR: ['产品总监','技术架构师','财务总监','市场部负责人','高级工程师','运营总监','人力资源总监','销售总监'],
    SSSR: ['作者']
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

  const SALARY = { R:[2000,6000], SR:[6000,10000], SSR:[10000,20000], SSSR:[100000,100000] };
  const LEVEL_NAME = { N:'错过', R:'基层', SR:'中级', SSR:'高级', SSSR:'作者' };

  // 意外事件
  const EVENTS_POS = [
    { name:'年终奖到账', desc:'金钱 +3,000~8,000',     type:'money', min:3000, max:8000 },
    { name:'项目奖金',   desc:'金钱 +2,000~5,000',     type:'money', min:2000, max:5000 },
    { name:'贵人相助',   desc:'获得 3 次额外抽卡机会', type:'draws', value:3 },
    { name:'副业收入',   desc:'金钱 +1,000~3,000',     type:'money', min:1000, max:3000 },
    { name:'兼职接单',   desc:'金钱 +500~1,500',       type:'money', min:500,  max:1500 },
    { name:'基金分红',   desc:'金钱 +2,000~6,000',     type:'money', min:2000, max:6000 },
    { name:'退税到账',   desc:'金钱 +1,000~2,500',     type:'money', min:1000, max:2500 },
    { name:'灵感迸发',   desc:'获得 2 次额外抽卡机会', type:'draws', value:2 },
    { name:'亲友周转',   desc:'金钱 +3,000~5,000',     type:'money', min:3000, max:5000 }
  ];
  const EVENTS_NEG = [
    { name:'公司拖欠工资', desc:'本月收入减半',           type:'income_half' },
    { name:'招聘诈骗',     desc:'金钱 -2,000',            type:'money', min:-2000, max:-2000 },
    { name:'无故辞退',     desc:'立即失去当前工作',       type:'lose_job' },
    { name:'租房被骗',     desc:'金钱 -3,000',            type:'money', min:-3000, max:-3000 },
    { name:'加班过劳',     desc:'下月收入 -10%（可叠加）', type:'penalty' },
    { name:'HR刁难',        desc:'本月收入归零',           type:'income_zero' },
    { name:'突发医疗费',   desc:'金钱 -1,500',            type:'money', min:-1500, max:-1500 },
    { name:'手机碎屏',     desc:'金钱 -2,500',            type:'money', min:-2500, max:-2500 },
    { name:'团建自费',     desc:'金钱 -800',              type:'money', min:-800,  max:-800 },
    { name:'押金纠纷',     desc:'金钱 -1,200',            type:'money', min:-1200, max:-1200 },
    { name:'迟到扣绩效',   desc:'下月收入 -10%（可叠加）', type:'penalty' }
  ];

  // 抉择事件（玩家选择直接影响当月）
  const CHOICE_EVENTS = [
    {
      name: '路遇扫码送礼',
      desc: '商场门口有人拉你扫码注册，声称免费送礼品一份。',
      options: [
        { text: '扫码领取', effect: { type:'money', min:-800, max:300 }, hint: '可能信息泄露被盗刷' },
        { text: '婉拒离开', effect: { type:'draws', value:1 }, hint: '路过时捡到一张求职卡' }
      ]
    },
    {
      name: '前同事拉你创业',
      desc: '前同事邀你一起离职创业，画了个不小的饼。',
      options: [
        { text: '一起干一票', effect: { type:'money', min:-3000, max:6000 }, hint: '高风险高回报' },
        { text: '稳妥拒绝', effect: { type:'heal' }, hint: '调整状态，清除过劳' }
      ]
    },
    {
      name: '项目紧急通宵',
      desc: '项目临期，主管要你今晚通宵赶工，承诺有补贴。',
      options: [
        { text: '硬扛通宵', effect: { type:'money', min:1000, max:3000 }, hint: '拿到补贴但透支身体' },
        { text: '准点下班', effect: { type:'penalty', value:0.1 }, hint: '下月绩效被打折' }
      ]
    },
    {
      name: '房东要求涨租',
      desc: '房东短信通知下月起涨租 500，否则不再续租。',
      options: [
        { text: '接受涨价', effect: { type:'money', min:-500, max:-500 }, hint: '破财消灾' },
        { text: '据理力争', effect: { type:'money', min:-1500, max:1000 }, hint: '谈判成功或被赶走' }
      ]
    },
    {
      name: '猎头高薪挖角',
      desc: '猎头发来消息，有个薪资翻倍的岗位，但要常驻外地。',
      options: [
        { text: '加微信聊聊', effect: { type:'draws', value:3 }, hint: '多个机会多条路' },
        { text: '不予理会', effect: { type:'heal' }, hint: '安心当前，清除过劳' }
      ]
    },
    {
      name: '地铁口老人求助',
      desc: '地铁口一位老人向你借 20 元路费回家。',
      options: [
        { text: '掏 20 元', effect: { type:'money', min:-20, max:-20 }, hint: '小小善举' },
        { text: '快步走开', effect: { type:'penalty', value:0.05 }, hint: '心里不是滋味，状态下滑' }
      ]
    },
    {
      name: '体检指标异常',
      desc: '年度体检报告显示几项指标偏高，医生建议复查。',
      options: [
        { text: '去医院复查', effect: { type:'money', min:-2000, max:-500 }, hint: '花钱买安心' },
        { text: '自己调理', effect: { type:'penalty', value:0.1 }, hint: '带病工作影响状态' }
      ]
    },
    {
      name: '中奖短信陷阱',
      desc: '收到短信称你中了十万大奖，需先交手续费才能领奖。',
      options: [
        { text: '信了打钱', effect: { type:'money', min:-3000, max:-3000 }, hint: '明显的骗局' },
        { text: '直接拉黑', effect: { type:'draws', value:2 }, hint: '清醒头脑，灵感涌现' }
      ]
    }
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
      collection: { R:[], SR:[], SSR:[], SSSR:[] },
      stats: { successCount:0, missCount:0, eventTriggered:0, monthsWorked:0, bestJob:null },
      gameOver: false,
      gameResult: null,
      settings: { hzBoost: true },
      nextIncomePenalty: 0,
      pendingSingle: null,
      pendingTen: null,
      pendingChoice: null,
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
    CHOICE_EVENTS: CHOICE_EVENTS,
    GOAL: GOAL,
    BANKRUPT: BANKRUPT,
    TOTAL_MONTHS: TOTAL_MONTHS,
    STORAGE_KEY: STORAGE_KEY,
    THEME_KEY: THEME_KEY,
    defaultState: defaultState
  };
})();
