'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, DATE } = app.Sequelize;

  const PaymentBillMap = app.model.define('payment_bill_maps', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
    payment_record_id: { type: INTEGER, allowNull: false, comment: '支付记录ID' },
    bill_id: { type: INTEGER, allowNull: false, comment: '账单ID' },
    amount_applied: { type: DECIMAL(10, 2), allowNull: false, comment: '核销金额' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payment_bill_maps',
    updatedAt: false,
  });

  PaymentBillMap.associate = function() {
    app.model.PaymentBillMap.belongsTo(app.model.PaymentRecord, { foreignKey: 'payment_record_id', as: 'payment' });
    app.model.PaymentBillMap.belongsTo(app.model.Bill, { foreignKey: 'bill_id', as: 'bill' });
  };

  return PaymentBillMap;
};
