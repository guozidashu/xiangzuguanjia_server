'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DATE, DECIMAL, TINYINT, TEXT } = Sequelize;

    // 1. 创建 org_expenses 表 (统一支出表)
    await queryInterface.createTable('org_expenses', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
      project_id: { type: INTEGER, comment: '项目ID' },
      room_id: { type: INTEGER, comment: '房屋ID' },
      expense_type: { type: TINYINT, allowNull: false, comment: '1房东租金, 2运营成本, 3佣金/提成, 4维修/保洁, 5其他' },
      fee_item_id: { type: INTEGER, comment: '关联科目ID (支出科目)' },
      amount: { type: DECIMAL(10, 2), allowNull: false, comment: '支出金额' },
      payment_account_id: { type: INTEGER, comment: '支出账户ID' },
      pay_time: { type: DATE, comment: '实际支付时间' },
      status: { type: TINYINT, defaultValue: 1, comment: '0待付, 1已付, 2作废' },
      related_table: { type: STRING(50), comment: '关联业务表 (landlord_bills/external_expenses)' },
      related_id: { type: INTEGER, comment: '关联业务ID' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query("ALTER TABLE org_expenses COMMENT = '组织统一支出明细表 (成本中心)'");

    // 2. 移除一些已经没用的旧表字段或进行标记（可选）
    // 这里暂时不做破坏性删除，先通过业务代码进行迁移和重写
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('org_expenses');
  }
};
