"use strict";
/* ============== 初始化入口 ============== */
(function () {
  const E = window.GameEngine;
  const U = window.GameUI;

  E.loadState();
  U.initTheme();
  U.bindEvents();
  U.bindSettingsEntry();
  U.render();

  // 若存在未结算的十连抽，恢复弹窗
  if (E.state.pendingTen && !E.state.pendingTen.resolved) {
    U.openTenModal();
  }
  // 若游戏已结束，提示
  if (E.state.gameOver) {
    setTimeout(U.openEndModal, 200);
  }
})();
