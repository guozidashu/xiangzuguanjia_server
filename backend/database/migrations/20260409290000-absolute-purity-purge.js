'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 物理移除 bills 表中的 bill_type 字段 (已被 fee_item_id 替代)
    await queryInterface.removeColumn('bills', 'bill_type');
    // 2. 物理逻辑删除 org_external_expenses 表 (已被 org_expenses 统一)
    await queryInterface.dropTable('org_external_expenses');
    // 3. (可选但推荐) 清理一下 leases 表中可能残留的注释或其它微调
    // 但上一波迁移已经处理过 leases 表，这里保持聚焦。
  },

  async down(queryInterface, Sequelize) {
    // 还原逻辑略
    await queryInterface.addColumn('bills', 'bill_type', {
      type: Sequelize.TINYINT,
      comment: '原账单类型'
    });

    // 重新创建表略 (通常开发阶段硬重置不考虑回滚)
  }
};
