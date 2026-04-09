'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, TINYINT } = Sequelize;
    
    // 为 tenant_users 表增加密码和扩展字段
    await queryInterface.addColumn('tenant_users', 'password_hash', {
      type: STRING(255),
      after: 'phone',
      comment: '登录密码哈希',
    });

    await queryInterface.addColumn('tenant_users', 'register_source', {
      type: TINYINT,
      defaultValue: 1, // 默认小程序
      after: 'avatar',
      comment: '注册来源: 1小程序, 2APP, 3公众号',
    });

    await queryInterface.addColumn('tenant_users', 'gender', {
      type: TINYINT,
      defaultValue: 0,
      after: 'register_source',
      comment: '性别: 0未知, 1男, 2女',
    });

    await queryInterface.addColumn('tenant_users', 'identity_verified', {
      type: TINYINT,
      defaultValue: 0,
      after: 'gender',
      comment: '实名认证状态: 0未认证, 1已认证',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tenant_users', 'password_hash');
    await queryInterface.removeColumn('tenant_users', 'register_source');
    await queryInterface.removeColumn('tenant_users', 'gender');
    await queryInterface.removeColumn('tenant_users', 'identity_verified');
  }
};
