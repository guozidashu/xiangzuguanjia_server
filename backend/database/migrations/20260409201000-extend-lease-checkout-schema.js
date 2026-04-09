'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER } = Sequelize;

    // 为 lease_checkouts 增加 project_id，支持项目级数据隔离
    await queryInterface.addColumn('lease_checkouts', 'project_id', {
      type: INTEGER,
      allowNull: true,
      comment: '所属项目ID',
    });

    // 为 lease_checkouts 增加 tenant_id，支持租客维度结算追溯
    await queryInterface.addColumn('lease_checkouts', 'tenant_id', {
      type: INTEGER,
      allowNull: true,
      comment: '租客ID',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('lease_checkouts', 'project_id');
    await queryInterface.removeColumn('lease_checkouts', 'tenant_id');
  }
};
