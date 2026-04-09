'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DECIMAL } = Sequelize;

    // 为支付账户表增加余额和冻结余额字段
    await queryInterface.addColumn('payment_accounts', 'balance', {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: '可用余额'
    });

    await queryInterface.addColumn('payment_accounts', 'frozen_balance', {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: '冻结余额(待分账/待结算)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('payment_accounts', 'balance');
    await queryInterface.removeColumn('payment_accounts', 'frozen_balance');
  }
};
