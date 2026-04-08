'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { JSON } = Sequelize;

    // 为 orgs 表增加 sys_config (用于存储微信、云丁等第三方配置)
    await queryInterface.addColumn('orgs', 'sys_config', {
      type: JSON,
      allowNull: true,
      comment: '系统配置信息(JSON)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orgs', 'sys_config');
  }
};
