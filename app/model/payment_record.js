'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT, TEXT } = app.Sequelize;

  const PaymentRecord = app.model.define('payment_records', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    trade_type: { type: TINYINT, allowNull: false, comment: '1进账, 2出账' },
    payment_account_id: { type: INTEGER, comment: '关联账户ID' },
    amount: { type: DECIMAL(10, 2), allowNull: false, comment: '交易额' },
    handling_fee: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '手续费' },
    net_amount: { type: DECIMAL(10, 2), allowNull: false, comment: '净额' },
    related_bill_ids: { type: STRING(255), comment: '核销账单ID' },
    trade_no: { type: STRING(100), comment: '交易号' },
    trade_time: { type: DATE, allowNull: false, comment: '真实时间' },
    operator_id: { type: INTEGER, comment: '操作人' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payment_records',
    updatedAt: false,
  });

  PaymentRecord.associate = function() {
    app.model.PaymentRecord.belongsTo(app.model.PaymentAccount, { foreignKey: 'payment_account_id', as: 'account' });
  };

  return PaymentRecord;
};
