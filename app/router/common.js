'use strict';

/**
 * 公共与系统级路由 (Common & System)
 * @param {Egg.Application} app - egg 实例
 */
module.exports = app => {
  const { router, controller } = app;

  // --- 1. 微信公共回调 (Wechat Callbacks) ---
  router.post('/api/app/wechat/notify', controller.common.wechat.paymentNotify);

  // --- 2. 云丁物联回调 (Yunding Callbacks) ---
  router.post('/api/common/yunding/callback', controller.common.yunding.callback);

  // --- 3. 系统调试 (Debug) ---
  router.get('/debug/pay', controller.common.debug.payTest);
};
