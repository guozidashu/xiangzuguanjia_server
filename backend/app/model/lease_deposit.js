'use strict';

module.exports = app => {
  const { INTEGER, DATE, DECIMAL, TINYINT, TEXT } = app.Sequelize;

  const LeaseDeposit = app.model.define('lease_deposits', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '租约ID' },
    tenant_id: { type: INTEGER, allowNull: false, comment: '租客ID' },
    deposit_type: { type: TINYINT, allowNull: false, comment: '1房押, 2电押, 3水押, 4其它' },
    amount_expected: { type: DECIMAL(10, 2), allowNull: false, comment: '应收' },
    amount_paid: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '实收' },
    amount_deducted: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '扣除' },
    amount_refunded: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '退还' },
    status: { type: TINYINT, defaultValue: 0, comment: '0待交, 1在押, 2部分抵扣, 3已结清退完' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'lease_deposits',
  });

  LeaseDeposit.associate = function() {
    app.model.LeaseDeposit.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
  };

  return LeaseDeposit;
};
