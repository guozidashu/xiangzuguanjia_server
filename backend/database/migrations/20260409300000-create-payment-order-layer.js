'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, TINYINT, DATE } = Sequelize;

    // 1. 创建 payment_orders 表 (线上支付单主表)
    await queryInterface.createTable('payment_orders', {
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
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query("ALTER TABLE payment_orders COMMENT = '线上支付订单主表 (WeChat Pay Order)'");

    // 2. 创建 payment_order_items 表 (订单明细表 - 支持合并支付关键)
    await queryInterface.createTable('payment_order_items', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      payment_order_id: { type: INTEGER, allowNull: false, comment: '关联主订单ID' },
      bill_id: { type: INTEGER, comment: '关联账单ID(如果是付账单)' },
      related_type: { type: TINYINT, comment: '关联业务类型 (1账单, 2押金等)' },
      amount: { type: DECIMAL(10, 2), allowNull: false, comment: '分摊金额' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query("ALTER TABLE payment_order_items COMMENT = '线上支付订单明细表 (支持合并支付核心)'");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_order_items');
    await queryInterface.dropTable('payment_orders');
  }
};
