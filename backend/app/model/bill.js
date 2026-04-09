'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT } = app.Sequelize;

  const Bill = app.model.define('bills', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
    tenant_id: { type: INTEGER, allowNull: false, comment: '关联租客ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '关联房间ID' },
    bill_type: { type: TINYINT, allowNull: false, comment: '1租金, 2押金, 3电费, 4水费, 5物业, 6杂费' },
    parent_bill_id: { type: INTEGER, comment: '父账单ID' },
    batch_no: { type: STRING(50), comment: '批次号' },
    bill_period: { type: STRING(50), comment: '账单期(2024-04)' },
    amount_due: { type: DECIMAL(10, 2), allowNull: false, comment: '应收' },
    amount_paid: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '已收' },
    status: { type: TINYINT, defaultValue: 0, comment: '0未付, 1部分, 2已清, 3作废' },
    review_status: { type: TINYINT, defaultValue: 1, comment: '0待审, 1已审' },
    due_date: { type: DATE, comment: '最晚应缴日' },
    lease_version_id: { type: INTEGER, comment: '关联租约版本ID' },
    paid_time: { type: DATE, comment: '结清时间' },
    remark: { type: STRING(255), comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'bills',
  });

  Bill.associate = function() {
    app.model.Bill.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
    app.model.Bill.belongsTo(app.model.LeaseVersion, { foreignKey: 'lease_version_id', as: 'lease_version' });
    app.model.Bill.hasMany(app.model.BillAdjustment, { foreignKey: 'bill_id', as: 'adjustments' });
    app.model.Bill.belongsTo(app.model.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    app.model.Bill.belongsTo(app.model.Room, { foreignKey: 'room_id', as: 'room' });
  };

  return Bill;
};
