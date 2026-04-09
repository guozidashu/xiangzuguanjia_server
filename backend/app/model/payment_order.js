'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT } = app.Sequelize;

  const PaymentOrder = app.model.define('payment_orders', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    tenant_user_id: { type: INTEGER, allowNull: false, comment: '支付人(租客)用户ID' },
    pay_order_no: { type: STRING(100), allowNull: false, unique: true, comment: '内部支付单号(out_trade_no)' },
    pay_type: { type: TINYINT, defaultValue: 1, comment: '1账单合并支付, 2押金支付, 3充值支付' },
    amount: { type: DECIMAL(10, 2), allowNull: false, comment: '订单总金额' },
    status: { type: TINYINT, defaultValue: 0, comment: '0待支付, 1已支付, 2已取消, 3已退款' },
    payment_account_id: { type: INTEGER, comment: '使用的支付通道ID' },
    prepay_id: { type: STRING(100), comment: '微信预支付会话标识' },
    transaction_id: { type: STRING(100), comment: '微信支付订单号' },
    pay_time: { type: DATE, comment: '实际支付时间' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payment_orders',
  });

  PaymentOrder.associate = function() {
    app.model.PaymentOrder.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.PaymentOrder.belongsTo(app.model.TenantUser, { foreignKey: 'tenant_user_id', as: 'payer' });
    app.model.PaymentOrder.hasMany(app.model.PaymentOrderItem, { foreignKey: 'payment_order_id', as: 'items' });
  };

  return PaymentOrder;
};
