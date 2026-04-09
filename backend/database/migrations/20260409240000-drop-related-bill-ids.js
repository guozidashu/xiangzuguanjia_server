'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 物理物理删除 payment_records 表中的冗余字段
    await queryInterface.removeColumn('payment_records', 'related_bill_ids');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('payment_records', 'related_bill_ids', {
      type: Sequelize.STRING(255),
      comment: '核销账单ID'
    });
  }
};
