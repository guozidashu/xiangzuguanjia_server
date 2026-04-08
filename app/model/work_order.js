'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON, TINYINT, TEXT } = app.Sequelize;

  const WorkOrder = app.model.define('work_orders', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
    lease_id: { type: INTEGER, comment: '租约期' },
    tenant_user_id: { type: INTEGER, comment: '发起人' },
    title: { type: STRING(100), allowNull: false, comment: '简述' },
    description: { type: TEXT, allowNull: false, comment: '详情' },
    images: { type: JSON, comment: '照片' },
    urgency_level: { type: TINYINT, defaultValue: 1, comment: '1普通, 2重要, 3紧急' },
    status: { type: TINYINT, defaultValue: 0, comment: '0待接, 1处理中, 2完工, 3取消' },
    assigned_worker_id: { type: INTEGER, comment: '委派师傅' },
    expect_time: { type: DATE, comment: '期望日期' },
    completed_at: { type: DATE, comment: '完结日期' },
    expense_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '维修费用' },
    expense_payer: { type: TINYINT, comment: '承担方' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'work_orders',
  });

  return WorkOrder;
};
