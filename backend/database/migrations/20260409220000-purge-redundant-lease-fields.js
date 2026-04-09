'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('leases');
    const columnsToRemove = [
      'change_type',
      'rental_type',
      'rent_price',
      'payment_cycle',
      'start_date',
      'end_date',
      'electric_price',
      'water_price',
      'billing_type',
      'initial_electric_reading',
      'initial_water_reading',
      'allowed_payment_ids',
      'previous_lease_id',
      'checkout_date'
    ];

    for (const column of columnsToRemove) {
      if (tableDefinition[column]) {
        await queryInterface.removeColumn('leases', column);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // 极致纯净方案不提供自动回滚
  }
};
