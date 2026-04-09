'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, DECIMAL, DATE } = Sequelize;

    // 1. 创建 payment_bill_maps 表 (支付关联表)
    await queryInterface.createTable('payment_bill_maps', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '关联ID' },
      org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
      payment_record_id: { type: INTEGER, allowNull: false, comment: '支付记录ID' },
      bill_id: { type: INTEGER, allowNull: false, comment: '账单ID' },
      amount_applied: { type: DECIMAL(10, 2), allowNull: false, comment: '核销金额' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), comment: '创建时间' },
    });
    await queryInterface.sequelize.query("ALTER TABLE payment_bill_maps COMMENT = '支付与账单多对多关联映射表'");

    // 2. 数据迁移：从 payment_records.related_bill_ids (逗号分隔字符串) 迁移到新表
    const [records] = await queryInterface.sequelize.query(
      "SELECT id, org_id, related_bill_ids, amount FROM payment_records WHERE related_bill_ids IS NOT NULL AND related_bill_ids != ''"
    );

    for (const record of records) {
      const billIds = record.related_bill_ids.split(',');
      for (const billId of billIds) {
        // 由于旧代码是全额核销，我们尝试获取账单金额，若无法获取则平分支付金额 (简单处理)
        const [bills] = await queryInterface.sequelize.query(
          `SELECT amount_due FROM bills WHERE id = ${billId}`
        );
        const amountApplied = bills.length > 0 ? bills[0].amount_due : (record.amount / billIds.length);

        await queryInterface.sequelize.query(`
          INSERT INTO payment_bill_maps (org_id, payment_record_id, bill_id, amount_applied)
          VALUES (${record.org_id}, ${record.id}, ${billId}, ${amountApplied})
        `);
      }
    }

    // 3. 租约状态简化 (虽然是业务重构，但可以在此迁移中顺便清理现有数据)
    // 4已续租, 5已调整 -> 1生效中
    await queryInterface.sequelize.query("UPDATE leases SET status = 1 WHERE status IN (4, 5)");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_bill_maps');
  }
};
