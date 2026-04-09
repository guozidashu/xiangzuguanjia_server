'use strict';

/**
 * B 端管理端路由 (POST Only)
 * @param {Egg.Application} app - egg 实例
 */
module.exports = app => {
  const { router, controller, middleware } = app;

  // 核心中间件
  const auth = middleware.jwtAuth();
  const tenant = middleware.tenantContext();
  const permission = middleware.permission;

  const admin = controller.admin;

  // --- 1. 鉴权与身份 (Auth) ---
  router.post('/api/v1/auth/login', admin.auth.login);
  router.post('/api/v1/auth/info', auth, tenant, admin.auth.info);

  // --- 2. 员工账号管理 (Staffs) ---
  router.post('/api/v1/staffs/list', auth, tenant, admin.staff.index);
  router.post('/api/v1/staffs/create', auth, tenant, admin.staff.create);
  router.post('/api/v1/staffs/update', auth, tenant, admin.staff.update);
  router.post('/api/v1/staffs/set_permissions', auth, tenant, admin.staff.setPermissions);

  // --- 3. 房源资产 (Rooms) ---
  router.post('/api/v1/rooms/list', auth, tenant, admin.room.index);
  router.post('/api/v1/rooms/create', auth, tenant, permission('ROOM_EDIT'), admin.room.create);
  router.post('/api/v1/rooms/detail', auth, tenant, admin.room.show);
  router.post('/api/v1/rooms/update', auth, tenant, permission('ROOM_EDIT'), admin.room.update);
  router.post('/api/v1/rooms/delete', auth, tenant, permission('ROOM_EDIT'), admin.room.destroy);

  // --- 4. 项目小区 (Projects) ---
  router.post('/api/v1/projects/list', auth, tenant, admin.project.index);
  router.post('/api/v1/projects/detail', auth, tenant, admin.project.show);

  // --- 5. 租约合同 (Leases) ---
  router.post('/api/v1/leases/list', auth, tenant, admin.lease.index);
  router.post('/api/v1/leases/detail', auth, tenant, admin.lease.show);
  router.post('/api/v1/leases/sign', auth, tenant, permission('LEASE_SIGN'), admin.lease.sign);
  router.post('/api/v1/leases/renew', auth, tenant, permission('LEASE_SIGN'), admin.lease.renew);
  router.post('/api/v1/leases/change_room', auth, tenant, permission('LEASE_SIGN'), admin.lease.changeRoom);
  router.post('/api/v1/leases/terminate', auth, tenant, permission('LEASE_SIGN'), admin.lease.terminate);
  router.post('/api/v1/leases/update', auth, tenant, permission('LEASE_SIGN'), admin.lease.update);

  // --- 6. 财务管理 (Financial) ---
  router.post('/api/v1/bills/list', auth, tenant, admin.financial.index);
  router.post('/api/v1/leases/ledger', auth, tenant, admin.financial.getLeaseLedger);
  router.post('/api/v1/financial/collect', auth, tenant, permission('FINANCE_EDIT'), admin.financial.collectPayment);
  router.post('/api/v1/financial/bills/create', auth, tenant, permission('FINANCE_EDIT'), admin.financial.createManualBill);
  router.post('/api/v1/financial/bills/modify', auth, tenant, permission('FINANCE_EDIT'), admin.financial.modifyBillAmount);
  router.post('/api/v1/financial/bills/split', auth, tenant, permission('FINANCE_EDIT'), admin.financial.splitBill);
  router.post('/api/v1/financial/bills/extend', auth, tenant, permission('FINANCE_EDIT'), admin.financial.extendBill);
  router.post('/api/v1/financial/accounts/stats', auth, tenant, admin.financial.accountStats);
  router.post('/api/v1/financial/transactions/list', auth, tenant, admin.financial.transactionList);
  router.post('/api/v1/financial/deposits/list', auth, tenant, admin.financial.depositList);
  router.post('/api/v1/financial/deposits/adjust', auth, tenant, admin.financial.adjustDeposit);

  // --- 7. 物联运营 & 看板 (Ops & Dashboard) ---
  router.post('/api/v1/admin/dashboard', auth, tenant, admin.ops.getDashboard);
  router.post('/api/v1/ops/projects/report', auth, tenant, admin.ops.getProjectReport);
  router.post('/api/v1/ops/readings', auth, tenant, permission('ROOM_EDIT'), admin.ops.recordReading);

  // --- 7.1 云丁物联配置 (Yunding Config) ---
  router.post('/api/v1/yunding/merchant-config', auth, tenant, controller.admin.yunding.saveMerchantConfig); // 保存商户自研模式密钥
  router.post('/api/v1/yunding/device-info', auth, tenant, controller.admin.yunding.getDeviceInfo); // 获取设备基础信息
  router.post('/api/v1/yunding/meter-info', auth, tenant, controller.admin.yunding.getMeterInfo); // 获取电表详细信息
  router.post('/api/v1/yunding/meter-overdraft', auth, tenant, controller.admin.yunding.updateMeterOverdraft); // 设置电表透支额度
  router.post('/api/v1/yunding/meter-reset', auth, tenant, controller.admin.yunding.resetMeterCharge); // 电表剩余电量清零
  router.post('/api/v1/yunding/meter-consumption', auth, tenant, controller.admin.yunding.getMeterConsumption); // 获取电表用电增量记录
  router.post('/api/v1/yunding/meter-recharge-records', auth, tenant, controller.admin.yunding.getRechargeRecords); // 获取电表充值历史记录
  router.post('/api/v1/yunding/all-homes', auth, tenant, controller.admin.yunding.getAllDevices); // 获取云丁全量房源和设备列表
  router.post('/api/v1/yunding/sync', auth, tenant, controller.admin.yunding.syncAssets); // 一键同步云丁资产到本地数据库

  // --- 8. 租客管理 (Tenants) [NEW] ---
  router.post('/api/v1/tenants/list', auth, tenant, admin.tenant.index);
  router.post('/api/v1/tenants/detail', auth, tenant, admin.tenant.show);
  router.post('/api/v1/tenants/update', auth, tenant, admin.tenant.update);
  router.post('/api/v1/tenants/delete', auth, tenant, admin.tenant.destroy);

  // --- 9. 售后支持 (Support) ---
  router.post('/api/v1/support/checkouts', auth, tenant, permission('FINANCE_EDIT'), admin.support.applyCheckout);
  router.post('/api/v1/support/work-orders', auth, tenant, admin.support.createWorkOrder);
};
