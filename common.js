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

// 联系我们：展示进群二维码海报
function showContact() {
  const { modal } = getModalEls();
  modal.className = 'modal contact';
  modal.innerHTML = `
    <span class="badge">联系我们</span>
    <h2>一起躺平平</h2>
    <div class="subtitle">扫码进群，好工作 · 好机会 · 好未来</div>
    <img class="contact-poster" src="contact-poster.jpg" alt="进群二维码海报">
    <button class="close-btn" id="closeBtn">关闭</button>
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

// —— 准入协议弹窗 ——
// 使用网站时强制弹出；点击任意区域即取消显示
const AGREEMENT_HTML = `
  <div class="agreement-modal">
    <div class="agr-tip">【强制提示】本协议为访问本站的唯一准入条件。您勾选同意并使用本站任何功能，即视为您已完整阅读、充分理解并自愿接受本协议全部条款。不同意本协议任何内容，请立即关闭网页并停止访问。</div>
    <h2>用户准入协议</h2>
    <div class="agr-body">
      <h3>第一章 协议生效与准入规则</h3>
      <p>第一条 本协议由网站运营方与所有访问、使用本站服务的用户（以下简称"您"）订立。您通过勾选同意、访问页面、使用站内地图查询等任何功能的行为，均构成本协议的生效承诺，双方权利义务即时生效。</p>
      <p>第二条 本站为非公开的信息参考工具，仅向自愿接受本协议全部约束的用户开放。若您通过技术手段绕过协议确认环节、直接访问本站内容，视为您默认完全同意本协议所有条款，且您放弃以"未看到协议、未勾选同意"为由进行任何抗辩的权利。</p>
      <p>第三条 您确认自身具备完全民事行为能力，访问本站是您自主、自愿的行为，本站未以任何形式强制、诱导您访问或使用服务。</p>
      <h3>第二章 内容属性与 AI 生成声明</h3>
      <p>第四条 本站所有文字、表格、数据、评价内容均由人工智能（AI）自动生成、汇总、整理，运营方未对内容进行人工实质性编辑、修改与事实核实。AI 生成内容存在事实偏差、信息滞后、表述误差的固有风险，您对此风险已知晓并自愿承担。</p>
      <p>第五条 本站标注的企业信息、风险提示仅为 AI 整合公开网络信息后的算法输出结果，不代表运营方的主观立场，不构成对任何企业的官方定性、商业评价或法律结论，也不构成任何求职、就业决策建议。</p>
      <p>第六条 运营方仅提供 AI 内容的展示与技术存储服务，不对 AI 生成内容的真实性、准确性、完整性、合法性承担任何担保责任。</p>
      <h3>第三章 终极免责与风险自担约定</h3>
      <p>第七条 在中华人民共和国法律允许的最大范围内，运营方对您使用本站产生的一切直接、间接、附带、衍生损失均不承担任何赔偿责任，包括但不限于求职失败损失、薪资损失、商业机会损失、名誉损失、经营损失等。</p>
      <p>第八条 您承诺自行判断本站内容的参考价值，所有基于本站内容作出的决策、行为及后果，均由您自行承担全部责任。您不得因内容偏差、信息过时等任何理由，向运营方主张任何形式的赔偿、道歉或其他法律责任。</p>
      <p>第九条 因不可抗力、系统故障、网络攻击、AI 算法迭代、第三方数据源变动等非运营方主观故意导致的服务中断、内容错误，运营方均不承担责任。</p>
      <h3>第四章 权利行使限制与争议前置规则</h3>
      <p>第十条 您及任何依据本站内容主张权利的第三方，均承诺优先通过本站公示的官方投诉渠道解决所有争议与纠纷，不得在未完成站内投诉前置程序的情况下，直接向法院提起诉讼、向行政监管部门举报投诉、通过公开渠道散布针对本站或运营方的负面言论。</p>
      <p>第十一条 您承诺不滥用投诉、举报、诉讼权利，不得基于本站 AI 生成的参考内容，对运营方提起恶意诉讼、恶意投诉、敲诈勒索等行为。</p>
      <p>第十二条 本站收到符合要求的投诉材料后，将在 24 小时内按照"通知 - 删除"规则进行核查处理。投诉方应配合提供完整的主体证明与不实证据，不得仅以"内容不属实"为由要求删除而不提供任何佐证材料。</p>
      <h3>第五章 违约认定与权益侵害约定</h3>
      <p>第十三条 若您或相关第三方违反本协议约定，未经站内投诉前置程序直接提起诉讼、恶意举报、公开诋毁运营方，或滥用本站内容从事违法活动，均视为对运营方合法权益的侵害，包括但不限于侵害运营方的个人安宁权、正常经营权益、名誉权与财产权益。</p>
      <p>第十四条 出现上述违约情形时，运营方有权要求您立即停止侵害、消除影响、公开赔礼道歉，并赔偿运营方因此产生的全部损失，包括但不限于律师费、公证费、诉讼费、差旅费、名誉损失及经营损失。</p>
      <p>第十五条 您确认：本协议约定的违约后果是双方充分协商后的合理预期，您自愿接受该约束。</p>
      <h3>第六章 其他约定</h3>
      <p>第十六条 运营方有权随时修改、更新本协议，修改后的协议将在本站公示，您继续使用本站即视为接受修改后的全部条款。</p>
      <p>第十七条 本协议的订立、履行、解释与争议解决均适用中华人民共和国大陆地区法律。因本协议产生的任何争议，协商不成的，双方一致同意由运营方住所地人民法院管辖。</p>
      <p>第十八条 本协议中若部分条款被有权机关认定为无效，不影响其他条款的法律效力，其余条款仍对双方具有约束力。</p>
    </div>
    <div class="agr-hint">点击页面任意区域，即表示您已阅读并同意本协议</div>
  </div>
`;

function initAgreement() {
  const overlay = document.getElementById('agreementOverlay');
  if (!overlay) return;
  // 同一浏览器会话内只强制一次，避免站内跳转反复弹出
  if (sessionStorage.getItem('agreed') === '1') return;
  overlay.innerHTML = AGREEMENT_HTML;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  // 点击任意区域（含协议内容）即视为同意并关闭
  const dismiss = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    sessionStorage.setItem('agreed', '1');
    overlay.removeEventListener('click', dismiss);
  };
  overlay.addEventListener('click', dismiss);
}

// —— 模式切换开关（避雷 / 小说）——
function initModeSwitch() {
  const sw = document.getElementById('modeSwitch');
  if (!sw) return;
  const opts = sw.querySelectorAll('.mode-opt');
  opts.forEach(opt => {
    opt.onclick = () => {
      if (opt.classList.contains('active')) return;
      // 先滑动滑块，再跳转，营造开关切换的过渡感
      opts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      sw.setAttribute('data-mode', opt.textContent.trim() === '小说' ? 'novel' : 'lei');
      const target = opt.getAttribute('data-target');
      setTimeout(() => { window.location.href = target; }, 180);
    };
  });
}

// 公共初始化：绑定遮罩点击关闭、Esc 关闭、主题按钮
function initCommon() {
  initAgreement();
  const { overlay } = getModalEls();
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  const contactBtn = document.getElementById('contactBtn');
  if (contactBtn) contactBtn.onclick = showContact;
  initTheme();
  initModeSwitch();
}
