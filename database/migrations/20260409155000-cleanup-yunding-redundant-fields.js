'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 从 projects 表中移除冗余的 yunding_id
    await queryInterface.removeColumn('projects', 'yunding_id');

    // 2. 从 rooms 表中移除冗余的 yunding_id 和 yunding_home_id
    await queryInterface.removeColumn('rooms', 'yunding_id');
    await queryInterface.removeColumn('rooms', 'yunding_home_id');
  },

  async down(queryInterface, Sequelize) {
    const { STRING } = Sequelize;
    
    // 回滚操作：重新加回这些字段 (注意：数据会丢失，仅用于结构回滚)
    await queryInterface.addColumn('projects', 'yunding_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁房源ID(home_id)',
    });

    await queryInterface.addColumn('rooms', 'yunding_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁房间ID(room_id)',
    });

    await queryInterface.addColumn('rooms', 'yunding_home_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁所属房源ID(home_id)',
    });
  }
};
