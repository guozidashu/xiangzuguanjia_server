'use strict';

module.exports = app => {
  const { INTEGER, DATE, DECIMAL, TINYINT, TEXT } = app.Sequelize;

  const LeaseCheckout = app.model.define('lease_checkouts', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    project_id: { type: INTEGER, allowNull: true, comment: '所属项目ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
    tenant_id: { type: INTEGER, allowNull: true, comment: '租客ID' },
    checkout_type: { type: TINYINT, allowNull: false, comment: '1正常, 2违约, 3提前, 4换房' },
    checkout_date: { type: DATE, allowNull: false, comment: '结算日期' },
    final_electric_reading: { type: DECIMAL(10, 2), comment: '电末数' },
    final_water_reading: { type: DECIMAL(10, 2), comment: '水末数' },
    deposit_refundable: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '应退押金' },
    penalty_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '违约扣款' },
    damage_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '物损扣款' },
    unpaid_bills_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '欠款抵扣' },
    final_refund_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '实退/收总计' },
    review_status: { type: TINYINT, defaultValue: 0, comment: '0待审, 1已核, 2驳回' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'lease_checkouts',
  });

  LeaseCheckout.associate = function() {
    app.model.LeaseCheckout.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
  };

  return LeaseCheckout;
};
