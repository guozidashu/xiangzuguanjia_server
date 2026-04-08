'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { TINYINT, DECIMAL } = Sequelize;

    await queryInterface.addColumn('payment_accounts', 'is_profit_sharing', {
      type: TINYINT,
      defaultValue: 0,
      comment: '是否启用分账: 1是, 0否'
    });

    await queryInterface.addColumn('payment_accounts', 'sharing_ratio', {
      type: DECIMAL(5, 4),
      defaultValue: 0.0015,
      comment: '平台分润比例 (如 0.0015 表示千分之1.5)'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('payment_accounts', 'is_profit_sharing');
    await queryInterface.removeColumn('payment_accounts', 'sharing_ratio');
  }
};
