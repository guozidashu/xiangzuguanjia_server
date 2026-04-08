'use strict';

/**
 * C 端租客端路由 (POST Only)
 * @param {Egg.Application} app - egg 实例
 */
module.exports = app => {
  const { router, controller, middleware } = app;

  const client = controller.app;
  const auth = middleware.jwtAuth(); // 租客端 JWT 鉴权

  // --- 1. 租客授权与身份 (Auth) ---
  router.post('/api/app/auth/register', client.auth.register);
  router.post('/api/app/auth/login', client.auth.login);
  router.post('/api/app/auth/wx_mp_login', client.auth.wxMpLogin);
  router.post('/api/app/auth/wx_oa_login', client.auth.wxOaLogin);

  // --- 2. 租客租约管理 (Leases) ---
  router.post('/api/app/leases/list', auth, client.lease.index);
  router.post('/api/app/leases/detail', auth, client.lease.show);

  // --- 3. 租客财务账单 (Financial) ---
  router.post('/api/app/bills/list', auth, client.financial.index);
  router.post('/api/app/bills/detail', auth, client.financial.show);
  router.post('/api/app/bills/payment_methods', auth, client.financial.listMethods);
  router.post('/api/app/bills/pay', auth, client.financial.pay);

  // --- 4. 租客服务支持 (Support) ---
  router.post('/api/app/support/work-orders/create', auth, client.support.createWorkOrder);
  router.post('/api/app/support/work-orders/list', auth, client.support.index);

  // --- 5. 租客房源查看 (Rooms - 公开) ---
  router.post('/api/app/rooms/list', client.room.index);
};
