'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, TINYINT, DATE } = app.Sequelize;

  const PaymentOrderItem = app.model.define('payment_order_items', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    payment_order_id: { type: INTEGER, allowNull: false, comment: '关联主订单ID' },
    bill_id: { type: INTEGER, comment: '关联账单ID' },
    related_type: { type: TINYINT, comment: '关联业务类型 (1账单, 2押金等)' },
    amount: { type: DECIMAL(10, 2), allowNull: false, comment: '分摊金额' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payment_order_items',
    updatedAt: false,
  });

  PaymentOrderItem.associate = function() {
    app.model.PaymentOrderItem.belongsTo(app.model.PaymentOrder, { foreignKey: 'payment_order_id', as: 'order' });
    app.model.PaymentOrderItem.belongsTo(app.model.Bill, { foreignKey: 'bill_id', as: 'bill' });
  };

  return PaymentOrderItem;
};
